// DCA 30 Anos · laço principal, controles, câmera, HUD, radar e som.
import * as THREE from '../vendor/three.min.js';
import { CONFIG, PERSONAGENS, BICHOS, FALAS, PORTAS_TRANCADAS, GALERIA, FOTOS, CHIPS, VOZES, REACOES } from './config.js';
import { makeTextures } from './textures.js';
import { buildWorld, merge } from './world.js';
import { makeCharacter, makeAnimal, makeCar } from './actors.js';

const makeActor = (spec, shadow) => (spec.especie ? makeAnimal(spec, shadow) : makeCharacter(spec, shadow));

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const angDiff = (a, b) => { let d = (a - b) % (Math.PI * 2); if (d > Math.PI) d -= Math.PI * 2; if (d < -Math.PI) d += Math.PI * 2; return d; };
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const touch = matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
const FLOOR = 0.03;

let renderer;
const canvas = $('game');
try {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
} catch (e) {
  const d = document.createElement('div'); d.id = 'erro';
  d.textContent = 'Este navegador não conseguiu iniciar o WebGL. Tente abrir o jogo no Chrome, Edge, Firefox ou Safari atualizados.';
  document.body.append(d); throw e;
}
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, touch ? 1.5 : 2));

const scene = new THREE.Scene();
scene.fog = new THREE.Fog('#d6e6f1', 70, 360);
const camera = new THREE.PerspectiveCamera(62, 1, 0.1, 1200);
scene.add(new THREE.HemisphereLight('#ffffff', '#e3dccd', 2.55));
const sun = new THREE.DirectionalLight('#fff1d6', 1.05); sun.position.set(-45, 80, -55); scene.add(sun);

const T = makeTextures();
const world = buildWorld(scene, T, CONFIG);
const colliders = world.colliders;

// ───────────── Estado ─────────────
const S = {
  mode: 'menu', started: false, overlay: null, sel: 0, muted: false,
  x: 32.2, z: -23, y: 0, heading: 0, speed: 0, boost: 0, voiceK: 0, voiceT: 0, camH: 1.5,
  yaw: Math.PI, pitch: 0.2, dist: 3.5, camDist: 3.5, lastLook: -9,
  inCar: false, chips: 0, fotos: new Set(), t0: 0, time: 0, done: false,
  zone: '', doorK: 0, galK: 0,
};
let player = null;

// ───────────── Chips, fotos, carro, figurantes ─────────────
const chipGeo = { body: new THREE.BoxGeometry(0.3, 0.3, 0.07), gold: merge([new THREE.BoxGeometry(0.42, 0.2, 0.03), new THREE.BoxGeometry(0.2, 0.42, 0.03), new THREE.BoxGeometry(0.1, 0.1, 0.08)]) };
const chipMat = { body: new THREE.MeshLambertMaterial({ color: '#23262b' }), gold: new THREE.MeshBasicMaterial({ color: '#f4b63a' }) };
const glowMat = new THREE.SpriteMaterial({ map: T.glow, color: '#ffc94a', transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending });
const chips = CHIPS.map(([x, z, y = 0], i) => {
  const g = new THREE.Group();
  g.add(new THREE.Mesh(chipGeo.body, chipMat.body), new THREE.Mesh(chipGeo.gold, chipMat.gold));
  const glow = new THREE.Sprite(glowMat); glow.scale.set(1.3, 1.3, 1); g.add(glow);
  g.position.set(x, y + 1.05, z); scene.add(g);
  return { x, z, y, g, got: false, t: 0, ph: i * 0.7 };
});
const fotos = FOTOS.map((f, i) => {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: T.camIcon, transparent: true, depthWrite: false }));
  s.scale.set(0.6, 0.6, 1); s.position.set(f.x, (f.y || 0) + 1.95, f.z); scene.add(s);
  return { ...f, y: f.y || 0, s, ph: i };
});
const car = { x: -34, z: 4, h: 0, v: 0, steer: 0, model: makeCar('#d3261f', { plate: T.plateCar, shadow: T.shadow }) };
scene.add(car.model.group);

const npcSpecs = [
  { key: 'corredor1', nome: 'Monitor', spec: { ...PERSONAGENS[1], camisa: '#6b8e3a', mochila: null }, route: [[3, 0.6], [40, 0.6], [40, -0.6], [3, -0.6]] },
  { key: 'corredor2', nome: 'Doutoranda', spec: { ...PERSONAGENS[0], camisa: '#8a3f7a', cabelo: '#3a2416', mochila: '#2a2d33' }, route: [[40, 0.5], [29.5, 0], [29.5, -4], [32.2, -7], [32.2, -11], [32.2, -7], [29.5, -4], [29.5, 0]] },
  { key: 'jardim', nome: 'Egressa', spec: { ...PERSONAGENS[2], camisa: '#c4532f', oculos: false, estilo: 'longo' }, route: [[32.2, -17], [32.2, -24], [44, -24], [32.2, -24]] },
  { key: 'estacionamento', nome: 'Porteiro', spec: { ...PERSONAGENS[3], camisa: '#2c3e57', cabelo: '#222', estilo: 'curto', oculos: false }, route: [[-8, 12.6], [10, 12.6], [10, 20], [-8, 20]] },
  { key: 'lab', nome: 'Professor', spec: PERSONAGENS[3], at: [11.0, 5.3, Math.PI / 2] },
  { key: 'hall', nome: 'Secretária', spec: { ...PERSONAGENS[4], jaleco: false, camisa: '#b23a48', estilo: 'coque' }, at: [34.2, -5.2, -2.2] },
  { key: 'bode', nome: 'Bode', bicho: 'bode', spec: BICHOS.bode, speed: 1.0, route: [[24, -28], [17, -18.5], [25, -15.5], [39, -21.5], [48, -27], [36, -29]] },
  { key: 'gato', nome: 'Gato', bicho: 'gato', spec: BICHOS.gato, at: [35.7, -8.95, Math.PI], y: 0.45 },
];
const npcs = npcSpecs.map((n) => {
  const char = makeActor(n.spec, n.y ? null : T.shadow);
  const [x, z, h] = n.at || [n.route[0][0], n.route[0][1], 0];
  char.group.position.set(x, FLOOR + (n.y || 0), z); char.group.rotation.y = h || 0; scene.add(char.group);
  return { ...n, char, x, z, h: h || 0, i: 1, k: 0, warn: 0 };
});

// ───────────── Colisão ─────────────
function resolveCircle(p, r, lv = 0) {
  let moved = false;
  for (let it = 0; it < 2; it++) for (const c of colliders) {
    if (c.lv !== lv && c.lv !== 2) continue;
    const cx = clamp(p.x, c.x0, c.x1), cz = clamp(p.z, c.z0, c.z1);
    const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    moved = true;
    if (d2 > 1e-9) { const d = Math.sqrt(d2); p.x = cx + (dx / d) * r; p.z = cz + (dz / d) * r; }
    else {
      const l = p.x - c.x0, rr = c.x1 - p.x, t = p.z - c.z0, b = c.z1 - p.z, m = Math.min(l, rr, t, b);
      if (m === l) p.x = c.x0 - r; else if (m === rr) p.x = c.x1 + r; else if (m === t) p.z = c.z0 - r; else p.z = c.z1 + r;
    }
  }
  return moved;
}
function rayWalls(ox, oz, dx, dz, lv = 0) {
  let best = 1; const m = 0.12;
  for (const c of colliders) {
    if (!c.wall || (c.lv !== lv && c.lv !== 2)) continue;
    let t0 = 0, t1 = 1, ok = true;
    for (const [o, d, lo, hi] of [[ox, dx, c.x0 - m, c.x1 + m], [oz, dz, c.z0 - m, c.z1 + m]]) {
      if (Math.abs(d) < 1e-9) { if (o < lo || o > hi) { ok = false; break; } }
      else { let a = (lo - o) / d, b = (hi - o) / d; if (a > b) [a, b] = [b, a]; t0 = Math.max(t0, a); t1 = Math.min(t1, b); if (t0 > t1) { ok = false; break; } }
    }
    if (ok && t0 < best) best = t0;
  }
  return best;
}

// ───────────── Som (sintetizado, sem arquivos) ─────────────
const Snd = {
  ctx: null, master: null, eng: null, engGain: null,
  init() {
    if (this.ctx) { this.ctx.resume?.(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    try {
      this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = S.muted ? 0 : 0.5; this.master.connect(this.ctx.destination);
      this.eng = this.ctx.createOscillator(); this.eng.type = 'sawtooth'; this.eng.frequency.value = 50;
      const f = this.ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420;
      this.engGain = this.ctx.createGain(); this.engGain.gain.value = 0;
      this.eng.connect(f); f.connect(this.engGain); this.engGain.connect(this.master); this.eng.start();
    } catch (e) { this.ctx = null; }
  },
  tone(freq, when = 0, dur = 0.12, type = 'square', vol = 0.12) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime + when, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.02);
  },
  step() {
    if (!this.ctx) return;
    const n = this.ctx.sampleRate * 0.04, buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(), g = this.ctx.createGain(), f = this.ctx.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.value = 900; g.gain.value = 0.07; s.buffer = buf; s.connect(f); f.connect(g); g.connect(this.master); s.start();
  },
  chip(n) { const base = 520 + (n % 6) * 40; this.tone(base, 0, 0.09); this.tone(base * 1.5, 0.08, 0.16); },
  talk() { this.tone(330, 0, 0.05, 'triangle', 0.1); this.tone(392, 0.06, 0.07, 'triangle', 0.1); },
  click() { this.tone(240, 0, 0.05, 'square', 0.07); },
  fanfare() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, i * 0.13, i === 6 ? 0.7 : 0.16, 'square', 0.13)); },
  // Vozes sintetizadas. O bode ri em "bé-hé-hé" e o gato alterna um miado normal com um bem fanho.
  voiceChain(type, formants, dur, vol = 0.9) {
    const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain();
    o.type = type; g.gain.setValueAtTime(0.0001, t);
    const fs = formants.map(([f, q, gain]) => { const b = c.createBiquadFilter(); b.type = 'bandpass'; b.frequency.value = f; b.Q.value = q; const bg = c.createGain(); bg.gain.value = gain * vol; o.connect(b); b.connect(bg); bg.connect(g); return b; });
    const trem = c.createGain(); g.connect(trem); trem.connect(this.master); o.start(t); o.stop(t + dur + 0.1);
    return { o, g, fs, t, c, trem };
  },
  // Berro curto de bode, perto do real: tom áspero com tremor rápido e leve queda no fim.
  bleat() {
    if (this.file('bode') || !this.ctx) return;
    const dur = 0.85, { o, g, t, c, trem } = this.voiceChain('sawtooth', [[720, 3, 1], [1650, 4.5, 0.55], [2600, 6, 0.2]], dur, 1.0);
    const f0 = 340 + Math.random() * 50;
    o.frequency.setValueAtTime(f0 * 0.96, t); o.frequency.linearRampToValueAtTime(f0 * 1.04, t + 0.12); o.frequency.linearRampToValueAtTime(f0 * 0.9, t + dur);
    const lfo = c.createOscillator(), lg = c.createGain(), ag = c.createGain();
    lfo.frequency.setValueAtTime(24, t); lfo.frequency.linearRampToValueAtTime(19, t + dur); lg.gain.value = 9; ag.gain.value = 0.32;
    lfo.connect(lg); lg.connect(o.frequency); lfo.connect(ag); ag.connect(trem.gain); lfo.start(t); lfo.stop(t + dur + 0.1);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.06); g.gain.setValueAtTime(0.5, t + dur - 0.3); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  },
  // Miado simples: sobe rápido no "mi", abre no "a" e cai no "u".
  meow() {
    if (this.file('gato') || !this.ctx) return;
    const dur = 0.62, { o, g, fs, t } = this.voiceChain('triangle', [[800, 3, 1], [1900, 5, 0.5]], dur, 1.0);
    const k = 0.94 + Math.random() * 0.12;
    o.frequency.setValueAtTime(560 * k, t); o.frequency.exponentialRampToValueAtTime(790 * k, t + 0.12); o.frequency.exponentialRampToValueAtTime(700 * k, t + 0.34); o.frequency.exponentialRampToValueAtTime(470 * k, t + dur);
    fs[0].frequency.setValueAtTime(500, t); fs[0].frequency.exponentialRampToValueAtTime(1050, t + 0.22); fs[0].frequency.exponentialRampToValueAtTime(620, t + dur);
    fs[1].frequency.setValueAtTime(2500, t); fs[1].frequency.exponentialRampToValueAtTime(1800, t + 0.25); fs[1].frequency.exponentialRampToValueAtTime(1100, t + dur);
    g.gain.exponentialRampToValueAtTime(0.5, t + 0.05); g.gain.setValueAtTime(0.45, t + dur - 0.25); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
  },
  // Toca um arquivo de áudio configurado em CONFIG.sons. Devolve false se não houver arquivo.
  file(key) {
    const url = CONFIG.sons?.[key]; if (!url || S.muted) return !!url;
    (this.cache ||= {})[key] ||= new Audio(url);
    const a = this.cache[key]; a.currentTime = 0; a.volume = 0.9; a.play().catch(() => {});
    return true;
  },
  whistle() { if (!this.ctx) return; const t = this.ctx.currentTime; for (const [d, a, b] of [[0, 1300, 1900], [0.2, 1500, 1100]]) { const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(a, t + d); o.frequency.exponentialRampToValueAtTime(b, t + d + 0.16); g.gain.setValueAtTime(0.0001, t + d); g.gain.exponentialRampToValueAtTime(0.16, t + d + 0.03); g.gain.exponentialRampToValueAtTime(0.001, t + d + 0.18); o.connect(g); g.connect(this.master); o.start(t + d); o.stop(t + d + 0.2); } },
  robot() { [660, 880, 550, 990].forEach((f, i) => this.tone(f, i * 0.09, 0.07, 'square', 0.1)); },
  engine(on, v) { if (!this.ctx) return; const t = this.ctx.currentTime; this.engGain.gain.setTargetAtTime(on ? 0.09 : 0, t, 0.08); this.eng.frequency.setTargetAtTime(48 + Math.abs(v) * 9, t, 0.08); },
  mute(m) { if (this.master) this.master.gain.value = m ? 0 : 0.5; },
};

// ───────────── HUD ─────────────
const el = { hud: $('hud'), menu: $('menu'), chipN: $('chip-n'), chips: $('chips'), fotoN: $('foto-n'), btnV: $('btn-voz'), zone: $('zone'), prompt: $('prompt'), sub: $('sub'), toast: $('toast'), foto: $('foto'), term: $('term'), fim: $('fim'), btnE: $('btn-e') };
let subTimer = 0, toastTimer = 0, zoneTimer = 0;
function say(who, text, dur = 4.2) { el.sub.hidden = false; el.sub.firstElementChild.textContent = who || ''; el.sub.lastElementChild.textContent = text; subTimer = S.time + dur + text.length * 0.03; }
function toast(text, dur = 4) { el.toast.hidden = false; el.toast.textContent = text; toastTimer = S.time + dur; }
function setZone(z) { S.zone = z; el.zone.textContent = z; el.zone.classList.add('on'); zoneTimer = S.time + 3.4; }
function fmtTime(t) { const m = Math.floor(t / 60), s = Math.floor(t % 60); return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`; }

function openOverlay(name) { S.overlay = name; el[name].hidden = false; keys.clear(); joy.x = joy.y = 0; }
function closeOverlay() { if (!S.overlay) return; el[S.overlay].hidden = true; S.overlay = null; clearInterval(termTimer); canvas.focus(); }
let termTimer = 0;
function openTerminal() {
  let near = null, nd = 1e9;
  for (const c of chips) if (!c.got) { const d = Math.hypot(c.x - S.x, c.z - S.z); if (d < nd) { nd = d; near = c; } }
  const lines = [
    'dca@labgrad:~$ ./trinta_anos --status', '',
    'Engenharia de Computação · UFRN',
    `chips coletados ....... ${String(S.chips).padStart(2, '0')}/${CONFIG.totalChips}`,
    `fotos visitadas ....... ${S.fotos.size}/${fotos.length}`,
    `tempo de tour ......... ${fmtTime(S.time - S.t0)}`, '',
    near ? `> dica do sistema. O chip mais próximo está em ${world.zone(near.x, near.z, near.y)}, a ${Math.round(nd)} m daqui.` : '> todos os chips foram encontrados. Bom trabalho!',
    '', 'dca@labgrad:~$ _',
  ].join('\n');
  const pre = el.term.firstElementChild; pre.textContent = ''; openOverlay('term');
  if (reduceMotion) { pre.textContent = lines; return; }
  const t0 = performance.now(); clearInterval(termTimer);
  termTimer = setInterval(() => { const i = Math.floor((performance.now() - t0) * 0.22); pre.textContent = lines.slice(0, i); if (i >= lines.length) clearInterval(termTimer); }, 30);
}
function openFoto(f) {
  const img = el.foto.querySelector('img'); img.src = f.arquivo; img.alt = f.legenda;
  el.foto.querySelector('b').textContent = f.legenda; openOverlay('foto');
  if (!S.fotos.has(f.id)) { S.fotos.add(f.id); el.fotoN.textContent = S.fotos.size; Snd.tone(880, 0, 0.05, 'triangle'); Snd.tone(1175, 0.06, 0.12, 'triangle');
    if (S.fotos.size === fotos.length) toast('Álbum completo. Você visitou todos os pontos de foto.'); }
}

// ───────────── Interações ─────────────
const actions = {
  porta: () => { Snd.click(); say('', PORTAS_TRANCADAS[S.doorK++ % PORTAS_TRANCADAS.length]); },
  quadro: () => say('Galeria', GALERIA[S.galK++ % GALERIA.length]),
  extintor: () => say('', 'Use somente em caso de incêndio. Prazo de entrega não conta.'),
  terminal: () => { Snd.click(); openTerminal(); },
  quadrobranco: () => say('', 'Alguém deixou um recado no canto do quadro. "Não apague!" Está lá desde sempre.'),
  mural: () => say('Mural', `${CONFIG.evento}. Programação especial pelos 30 anos de Engenharia de Computação.`, 6),
  banner: () => say('', 'O ENADE vem aí. Estudar também é missão.'),
  cafe: () => { Snd.tone(180, 0, 0.25, 'sawtooth', 0.05); Snd.tone(700, 0.3, 0.08, 'triangle', 0.1); S.boost = S.time + 40; say('', 'Café passado na hora. Você vai andar mais rápido pelos próximos 40 segundos.', 4); },
  recado: () => say('', 'Um bilhete na mesa diz "Volto em 5 minutos. Fui pegar um café na copa."'),
  pauta: () => say('', 'Pauta da reunião. Item único, comemorar os 30 anos de Engenharia de Computação.'),
  elevador: () => { Snd.click(); say('', 'O elevador está em manutenção. A escada fica logo ao lado.'); },
};
function findTarget() {
  if (S.inCar) return Math.abs(car.v) < 3.5 ? { label: 'Sair do carro', act: exitCar } : null;
  let best = null, bs = 1;
  const test = (x, z, r, o) => { const s = Math.hypot(S.x - x, S.z - z) / r; if (s < bs) { bs = s; best = o; } };
  for (const it of world.inter) if (Math.abs((it.y || 0) - S.y) < 1) test(it.x, it.z, it.r, { label: it.label, act: actions[it.kind] });
  for (const f of fotos) if (Math.abs(f.y - S.y) < 1) test(f.x, f.z, 1.4, { label: 'Ver a foto real', act: () => openFoto(f) });
  if (S.y < 1) {
    for (const n of npcs) {
      if (n.bicho) test(n.x, n.z, 1.7, { label: n.bicho === 'gato' ? 'Fazer carinho no gato' : 'Chamar o bode', act: () => animalVoice(n) });
      else test(n.x, n.z, 1.8, { label: `Conversar com ${n.nome}`, act: () => { Snd.talk(); const f = FALAS[n.key]; say(n.nome, f[n.k++ % f.length]); } });
    }
    test(car.x, car.z, 2.7, { label: 'Entrar no carro', act: enterCar });
  }
  return best;
}
function animalVoice(n) {
  if (n.bicho === 'bode') Snd.bleat(); else Snd.meow();
  n.char.talk?.(0.8); say(n.nome, VOZES[n.bicho][0], 1.3);
}
// A voz do personagem do jogador, na barra de espaço.
function voice() {
  if (S.mode !== 'play' || S.overlay || S.time < S.voiceT) return;
  const spec = player.spec, kind = spec.especie || (spec.estilo === 'robo' ? 'robo' : 'humano');
  S.voiceT = S.time + 0.9;
  if (kind === 'bode') Snd.bleat(); else if (kind === 'gato') Snd.meow(); else if (kind === 'robo') Snd.robot(); else Snd.whistle();
  player.talk?.(0.8);
  say(spec.nome, VOZES[kind][0], 1.3);
  if (S.inCar || S.y > 1) return;
  let who = null, wd = 6;
  for (const n of npcs) { if (n.bicho) continue; const d = Math.hypot(n.x - S.x, n.z - S.z); if (d < wd && S.time > n.warn) { wd = d; who = n; } }
  if (who) { who.warn = S.time + 7; const rs = REACOES[kind], line = rs[who.k++ % rs.length]; setTimeout(() => { if (S.mode === 'play') say(who.nome, line, 3); }, 1300); }
}
let target = null;
function interact() {
  if (S.mode !== 'play') return;
  if (S.overlay) { closeOverlay(); return; }
  if (target) target.act();
}
function enterCar() { S.inCar = true; player.group.visible = false; S.dist = 7; Snd.click(); toast(touch ? 'Alavanca para dirigir. Botão E para descer.' : 'W acelera, S freia e dá ré, A e D viram. E para descer.'); }
function exitCar() {
  for (const side of [1, -1]) {
    const p = { x: car.x + Math.cos(car.h) * 1.7 * side, z: car.z - Math.sin(car.h) * 1.7 * side }, q = { ...p };
    resolveCircle(q, 0.34);
    if (Math.hypot(q.x - p.x, q.z - p.z) < 0.3 || side === -1) { S.x = q.x; S.z = q.z; break; }
  }
  S.inCar = false; car.v = 0; player.group.visible = true; S.dist = player.spec.cam?.d ?? 3.5; S.heading = car.h; Snd.click();
}

// ───────────── Entrada ─────────────
const keys = new Set();
const joy = { x: 0, y: 0, id: null };
const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'ShiftLeft', 'ShiftRight'];
addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLButtonElement && (e.code === 'Enter' || e.code === 'Space')) return;
  if (MOVE_KEYS.includes(e.code)) e.preventDefault();
  if (e.repeat) return;
  if (e.code === 'Escape') { if (S.overlay) closeOverlay(); else if (S.started && !S.done) toggleMenu(S.mode === 'play'); return; }
  if (S.mode !== 'play') { if (e.code === 'Enter') start(); return; }
  if (e.code === 'KeyE' || e.code === 'Enter') { interact(); return; }
  if (e.code === 'Space') { if (S.overlay) closeOverlay(); else voice(); return; }
  if (e.code === 'KeyM') { setMuted(!S.muted); return; }
  keys.add(e.code);
});
addEventListener('keyup', (e) => keys.delete(e.code));
addEventListener('blur', () => keys.clear());

let look = null;
canvas.addEventListener('pointerdown', (e) => { if (S.mode !== 'play') return; look = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture?.(e.pointerId); canvas.focus(); });
canvas.addEventListener('pointermove', (e) => {
  if (!look || look.id !== e.pointerId) return;
  const k = e.pointerType === 'touch' ? 0.0062 : 0.0042;
  S.yaw -= (e.clientX - look.x) * k; S.pitch = clamp(S.pitch + (e.clientY - look.y) * k * 0.7, -0.05, 1.0);
  look.x = e.clientX; look.y = e.clientY; S.lastLook = S.time;
});
const endLook = (e) => { if (look && look.id === e.pointerId) look = null; };
canvas.addEventListener('pointerup', endLook); canvas.addEventListener('pointercancel', endLook);
canvas.addEventListener('wheel', (e) => { e.preventDefault(); S.dist = clamp(S.dist + Math.sign(e.deltaY) * 0.4, S.inCar ? 4.5 : 2, S.inCar ? 11 : 6.5); }, { passive: false });
canvas.addEventListener('contextmenu', (e) => e.preventDefault());

const joyEl = $('joy'), knob = joyEl.firstElementChild;
const joySet = (e) => { const r = joyEl.getBoundingClientRect(), R = r.width / 2; let dx = (e.clientX - r.left - R) / (R * 0.7), dy = (e.clientY - r.top - R) / (R * 0.7); const m = Math.hypot(dx, dy); if (m > 1) { dx /= m; dy /= m; } joy.x = dx; joy.y = -dy; knob.style.transform = `translate(${dx * R * 0.55}px, ${dy * R * 0.55}px)`; };
joyEl.addEventListener('pointerdown', (e) => { joy.id = e.pointerId; joyEl.setPointerCapture?.(e.pointerId); joySet(e); e.preventDefault(); });
joyEl.addEventListener('pointermove', (e) => { if (joy.id === e.pointerId) joySet(e); });
const joyEnd = (e) => { if (joy.id === e.pointerId) { joy.id = null; joy.x = joy.y = 0; knob.style.transform = ''; } };
joyEl.addEventListener('pointerup', joyEnd); joyEl.addEventListener('pointercancel', joyEnd);
el.btnE.addEventListener('click', interact);
el.btnV.addEventListener('click', voice);
el.foto.addEventListener('click', closeOverlay); el.term.addEventListener('click', closeOverlay);

function setMuted(m) { S.muted = m; Snd.mute(m); const b = $('btn-som'); b.textContent = m ? 'Som desligado' : 'Som ligado'; b.setAttribute('aria-pressed', String(!m)); }
$('btn-som').addEventListener('click', () => setMuted(!S.muted));
$('btn-menu').addEventListener('click', () => toggleMenu(true));
$('btn-fim').addEventListener('click', () => { el.fim.hidden = true; S.overlay = null; canvas.focus(); });

// ───────────── Menu e seleção de personagem ─────────────
function buildMenu() {
  $('foto-t').textContent = fotos.length;
  $('titulo').textContent = CONFIG.titulo; $('subtitulo').textContent = CONFIG.subtitulo; $('evento').textContent = CONFIG.evento;
  if (touch) { document.body.classList.add('touch'); $('keys-desk').hidden = true; $('keys-touch').hidden = false; $('touch').hidden = false; }
  const w = 180, h = 200;
  let thumbs = [];
  try {
    const r2 = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    r2.setPixelRatio(2); r2.setSize(w, h);
    const sc = new THREE.Scene(); sc.add(new THREE.HemisphereLight('#ffffff', '#8a8f96', 2.6)); const d = new THREE.DirectionalLight('#fff', 1.6); d.position.set(2, 4, 5); sc.add(d);
    const cam = new THREE.PerspectiveCamera(28, w / h, 0.1, 20); cam.position.set(1.3, 1.45, 4.1); cam.lookAt(0, 0.9, 0);
    thumbs = PERSONAGENS.map((spec) => { const c = makeActor(spec); c.group.rotation.y = spec.especie ? 0.95 : 0.45; if (spec.thumb) c.group.scale.setScalar(spec.thumb); c.animate(0.2, 2.4); sc.add(c.group); r2.render(sc, cam); const url = r2.domElement.toDataURL(); sc.remove(c.group); return url; });
    r2.dispose(); r2.forceContextLoss?.();
  } catch (e) { /* sem miniaturas, o menu continua funcionando */ }
  const box = $('chars');
  PERSONAGENS.forEach((p, i) => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'char'; b.id = `char-${p.id}`; b.setAttribute('aria-pressed', String(i === S.sel));
    if (thumbs[i]) { const img = document.createElement('img'); img.src = thumbs[i]; img.alt = ''; b.append(img); }
    const n = document.createElement('b'); n.textContent = p.nome; const r = document.createElement('span'); r.textContent = p.papel; b.append(n, r);
    b.addEventListener('click', () => { S.sel = i; box.querySelectorAll('.char').forEach((c, k) => c.setAttribute('aria-pressed', String(k === i))); Snd.init(); Snd.click(); });
    b.addEventListener('dblclick', start);
    box.append(b);
  });
  $('btn-go').addEventListener('click', start);
}
function spawnPlayer() {
  if (player && player.spec === PERSONAGENS[S.sel]) return;
  if (player) scene.remove(player.group);
  player = makeActor(PERSONAGENS[S.sel], T.shadow); scene.add(player.group); player.group.visible = !S.inCar;
  S.camH = player.spec.cam?.h ?? 1.5; if (!S.inCar) S.dist = player.spec.cam?.d ?? 3.5;
}
function start() {
  Snd.init(); spawnPlayer();
  el.menu.hidden = true; el.hud.hidden = false; S.mode = 'play';
  if (!S.started) { S.started = true; S.t0 = S.time; setZone(world.zone(S.x, S.z, S.y)); toast('Missão 01. Encontre os 30 chips dourados. A entrada do DCA está logo à frente.', 6); }
  canvas.focus();
}
function toggleMenu(open) {
  if (open) { S.mode = 'menu'; keys.clear(); el.menu.hidden = false; el.hud.hidden = true; $('btn-go').textContent = 'Continuar'; Snd.engine(false, 0); $('btn-go').focus(); }
  else start();
}

// ───────────── Atualização ─────────────
function control(dt) {
  let ix = (keys.has('KeyD') ? 1 : 0) - (keys.has('KeyA') ? 1 : 0) + joy.x;
  let iy = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) + joy.y;
  const turn = (keys.has('ArrowLeft') ? 1 : 0) - (keys.has('ArrowRight') ? 1 : 0);
  if (turn) { S.yaw += turn * 2.1 * dt; S.lastLook = S.time - 0.5; }
  const fx = -Math.sin(S.yaw), fz = -Math.cos(S.yaw), rx = Math.cos(S.yaw), rz = -Math.sin(S.yaw);

  if (S.inCar) {
    ix = clamp(ix, -1, 1); iy = clamp(iy, -1, 1);
    if (iy > 0) car.v += (car.v < 0 ? 16 : 8.5) * iy * dt; else if (iy < 0) car.v += (car.v > 0 ? 18 : 6) * iy * dt;
    else car.v -= Math.sign(car.v) * Math.min(Math.abs(car.v), 5.5 * dt);
    car.v -= car.v * 0.35 * dt; car.v = clamp(car.v, -6, 17);
    car.steer += (-ix * 0.5 - car.steer) * Math.min(1, dt * 7);
    car.h += (car.v / 2.7) * Math.tan(car.steer) * dt;
    car.x += Math.sin(car.h) * car.v * dt; car.z += Math.cos(car.h) * car.v * dt;
    let hit = 0;
    for (const off of [1.35, 0, -1.35]) {
      const p = { x: car.x + Math.sin(car.h) * off, z: car.z + Math.cos(car.h) * off }, q = { ...p };
      if (resolveCircle(q, 0.95, 0)) { car.x += q.x - p.x; car.z += q.z - p.z; hit = Math.max(hit, Math.hypot(q.x - p.x, q.z - p.z)); }
    }
    if (hit > 0.001) { car.v *= hit > 0.04 ? 0.55 : 1 - Math.min(1, 3 * dt); if (hit > 0.08 && Math.abs(car.v) > 2) Snd.tone(90, 0, 0.12, 'sawtooth', 0.12); }
    S.x = car.x; S.z = car.z; S.speed = Math.abs(car.v);
    if (S.time - S.lastLook > 1.2 && Math.abs(car.v) > 0.5) S.yaw += angDiff(car.h + Math.PI + (car.v < -2.5 ? Math.PI : 0), S.yaw) * Math.min(1, dt * 2.6);
    Snd.engine(true, car.v);
    return;
  }

  const m = Math.hypot(ix, iy);
  if (m > 1) { ix /= m; iy /= m; }
  const run = keys.has('ShiftLeft') || keys.has('ShiftRight') || Math.hypot(joy.x, joy.y) > 0.92;
  const mx = fx * iy + rx * ix, mz = fz * iy + rz * ix, mm = Math.hypot(mx, mz);
  const sp = mm > 0.05 ? (run ? 6.4 : 3.5) * Math.min(1, mm) * (S.time < S.boost ? 1.4 : 1) : 0;
  S.speed += (sp - S.speed) * Math.min(1, dt * 12);
  if (mm > 0.05) {
    const p = { x: S.x + (mx / mm) * S.speed * dt, z: S.z + (mz / mm) * S.speed * dt };
    resolveCircle(p, 0.32, S.y > 1.9 ? 1 : 0); S.x = p.x; S.z = p.z;
    S.heading += angDiff(Math.atan2(mx, mz), S.heading) * Math.min(1, dt * 12);
    if (iy > -0.3 && S.time - S.lastLook > 0.9 && !look) S.yaw += angDiff(Math.atan2(-mx, -mz), S.yaw) * Math.min(1, dt * 1.5);
  }
}

const camT = new THREE.Vector3();
let lastStep = 0;
function update(dt) {
  S.time += dt;
  const playing = S.mode === 'play';
  if (playing && !S.overlay) control(dt); else if (S.inCar) { car.v *= 1 - Math.min(1, dt * 3); Snd.engine(playing, car.v); }

  // Jogador e carro
  if (!S.inCar) S.y += (world.floorY(S.x, S.z, S.y) - S.y) * Math.min(1, dt * 16);
  if (player) {
    player.group.position.set(S.x, FLOOR + S.y, S.z); player.group.rotation.y = S.heading;
    const s = player.animate(dt, S.inCar ? 0 : S.speed);
    if (!S.inCar && S.speed > 1 && playing && Math.sign(s) !== lastStep) { lastStep = Math.sign(s); Snd.step(); }
  }
  car.model.group.position.set(car.x, 0.02, car.z); car.model.group.rotation.y = car.h;
  for (const w of car.model.wheels) w.rotation.x += (car.v / 0.34) * dt;
  for (const p of car.model.steerers) p.rotation.y = car.steer;
  world.update(dt, S.x, S.z);

  // Figurantes
  for (const n of npcs) {
    const dp = Math.hypot(S.x - n.x, S.z - n.z);
    let sp = 0;
    if (n.route && (dp > 1.9 || S.inCar)) {
      const [tx, tz] = n.route[n.i], dx = tx - n.x, dz = tz - n.z, d = Math.hypot(dx, dz);
      if (d < 0.15) n.i = (n.i + 1) % n.route.length;
      else { sp = n.speed || 1.35; n.x += (dx / d) * sp * dt; n.z += (dz / d) * sp * dt; n.h += angDiff(Math.atan2(dx, dz), n.h) * Math.min(1, dt * 6); }
    } else if (dp < 2.4 && !S.inCar) n.h += angDiff(Math.atan2(S.x - n.x, S.z - n.z), n.h) * Math.min(1, dt * 5);
    else if (n.at) n.h += angDiff(n.at[2], n.h) * Math.min(1, dt * 2);
    if (S.inCar && dp < 3.2 && Math.abs(car.v) > 3 && S.time > n.warn) { n.warn = S.time + 5; if (n.bicho) animalVoice(n); else say(n.nome, 'Ei! Olha o carro! Aqui é zona de pedestre.', 2.5); }
    n.char.group.position.set(n.x, FLOOR + (n.y || 0), n.z); n.char.group.rotation.y = n.h; n.char.animate(dt, sp);
  }

  // Chips e pontos de foto
  for (const c of chips) {
    if (c.got) { if (c.g.visible) { c.t += dt; c.g.position.y += dt * 3; c.g.scale.setScalar(Math.max(0.01, 1 - c.t * 3)); if (c.t > 0.33) c.g.visible = false; } continue; }
    c.g.rotation.y = S.time * 2 + c.ph; c.g.position.y = c.y + 1.05 + Math.sin(S.time * 2.4 + c.ph) * 0.09;
    if (playing && Math.abs(S.y - c.y) < 1.2 && Math.hypot(S.x - c.x, S.z - c.z) < (S.inCar ? 1.7 : 0.85)) collect(c);
  }
  for (const f of fotos) f.s.position.y = f.y + 1.95 + Math.sin(S.time * 1.8 + f.ph) * 0.07;

  // Câmera
  if (!S.started) {
    const a = S.time * 0.07;
    camera.position.set(32 + Math.sin(a) * 22, 6.5 + Math.sin(a * 1.7) * 1.2, -31 + Math.cos(a * 1.3) * 3.5);
    camera.lookAt(30, 2.2, -6);
  } else {
    const ty = S.y + (S.inCar ? 1.5 : S.camH), dist = S.dist, lv = S.y > 1.9 ? 1 : 0;
    const cp = Math.cos(S.pitch), fx = -Math.sin(S.yaw), fz = -Math.cos(S.yaw);
    const t = rayWalls(S.x, S.z, -fx * dist * cp, -fz * dist * cp, lv);
    const want = Math.max(0.5, dist * t - (t < 1 ? 0.22 : 0));
    S.camDist = want < S.camDist ? want : S.camDist + (want - S.camDist) * Math.min(1, dt * 4);
    let cy = ty + S.camDist * Math.sin(S.pitch) + 0.25;
    const cx = S.x - fx * S.camDist * cp, cz = S.z - fz * S.camDist * cp;
    if (world.indoor(cx, cz)) cy = Math.min(cy, S.y + 2.5);
    camera.position.set(cx, Math.max(S.y + 0.35, cy), cz);
    camT.set(S.x + fx * 0.6, ty + 0.1, S.z + fz * 0.6); camera.lookAt(camT);
    if (player && !S.inCar) player.group.visible = S.camDist > 0.85;
  }
  world.sky.position.copy(camera.position);
  for (const f of fotos) f.s.material.opacity = clamp((camera.position.distanceTo(f.s.position) - 1.3) / 1.4, 0, 1) * (S.fotos.has(f.id) ? 0.45 : 1);

  // HUD
  if (playing) {
    const z = world.zone(S.x, S.z, S.y); if (z !== S.zone) setZone(z);
    target = S.overlay ? null : findTarget();
    el.prompt.hidden = !target; if (target) el.prompt.lastElementChild.textContent = target.label;
    el.btnE.disabled = !target && !S.overlay;
    if (S.time > subTimer) el.sub.hidden = true;
    if (S.time > toastTimer) el.toast.hidden = true;
    if (S.time > zoneTimer) el.zone.classList.remove('on');
    drawRadar();
  }
}
function collect(c) {
  c.got = true; S.chips++; Snd.chip(S.chips);
  el.chipN.textContent = String(S.chips).padStart(2, '0');
  el.chips.classList.remove('pulse'); void el.chips.offsetWidth; el.chips.classList.add('pulse');
  if (S.chips === CONFIG.totalChips) setTimeout(finish, 700);
  else if (S.chips === 1) toast('Primeiro chip! Faltam 29. O radar mostra os que estão por perto.');
  else if (S.chips === 15) toast('Metade do caminho. Quinze chips, quinze anos.');
  else if (S.chips === 29) toast('Falta só um. O computador do LABGRAD sabe onde ele está.');
}
function finish() {
  S.done = true; S.overlay = 'fim'; el.fim.hidden = false; keys.clear(); Snd.fanfare();
  $('fim-stats').textContent = `tempo ${fmtTime(S.time - S.t0)} · fotos ${S.fotos.size}/${fotos.length}`;
  $('btn-fim').focus(); S.done = false;
  if (!reduceMotion) confetti();
}
function confetti() {
  const c = $('confete'), g = c.getContext('2d'); c.width = c.clientWidth; c.height = c.clientHeight;
  const cols = ['#f4b63a', '#d3261f', '#4a90d2', '#f1ecdc', '#17995a'];
  const ps = Array.from({ length: 170 }, () => ({ x: Math.random() * c.width, y: -Math.random() * c.height, vx: (Math.random() - 0.5) * 90, vy: 130 + Math.random() * 190, s: 5 + Math.random() * 7, a: Math.random() * 6, c: cols[(Math.random() * cols.length) | 0] }));
  let last = performance.now(), t = 0;
  const tick = (now) => {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; t += dt;
    g.clearRect(0, 0, c.width, c.height);
    for (const p of ps) { p.x += p.vx * dt; p.y += p.vy * dt; p.a += dt * 5; g.save(); g.translate(p.x, p.y); g.rotate(p.a); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore(); }
    if (t < 7 && !el.fim.hidden) requestAnimationFrame(tick); else g.clearRect(0, 0, c.width, c.height);
  };
  requestAnimationFrame(tick);
}

// ───────────── Radar ─────────────
const radar = $('radar'), rg = radar.getContext('2d');
function drawRadar() {
  const W = 300, R = 150, s = 4.4, g = rg;
  g.clearRect(0, 0, W, W);
  g.save(); g.beginPath(); g.arc(R, R, R - 2, 0, 7); g.clip();
  g.fillStyle = '#b77a52'; g.fillRect(0, 0, W, W);
  g.translate(R, R); g.rotate(S.yaw); g.scale(s, s); g.translate(-S.x, -S.z);
  for (const q of world.mapRects) { g.fillStyle = q.c; g.fillRect(q.x0, q.z0, q.x1 - q.x0, q.z1 - q.z0); }
  const up = S.y > 1.9;
  if (up) { g.fillStyle = 'rgba(23,32,38,.55)'; g.fillRect(S.x - 60, S.z - 60, 120, 120); g.fillStyle = '#ecebe6'; for (const q of world.upRects) g.fillRect(q.x0, q.z0, q.x1 - q.x0, q.z1 - q.z0); }
  g.strokeStyle = '#1c2226'; g.lineWidth = 0.45; g.beginPath();
  for (const [a, b, c, d] of up ? world.segs1 : world.segs) { g.moveTo(a, b); g.lineTo(c, d); }
  g.stroke();
  const range = R / s + 2;
  g.fillStyle = '#4a90d2'; for (const f of fotos) if (!S.fotos.has(f.id) && (f.y > 1.9) === up && Math.hypot(f.x - S.x, f.z - S.z) < range) g.fillRect(f.x - 0.8, f.z - 0.8, 1.6, 1.6);
  g.fillStyle = '#fbfaf5'; if (!up) for (const n of npcs) { g.beginPath(); g.arc(n.x, n.z, 0.7, 0, 7); g.fill(); }
  for (const c of chips) if (!c.got && (c.y > 1.9) === up && Math.hypot(c.x - S.x, c.z - S.z) < range) { g.fillStyle = '#1c2226'; g.beginPath(); g.arc(c.x, c.z, 1.25, 0, 7); g.fill(); g.fillStyle = '#f4b63a'; g.beginPath(); g.arc(c.x, c.z, 0.9, 0, 7); g.fill(); }
  if (!up) { g.save(); g.translate(car.x, car.z); g.rotate(-car.h); g.fillStyle = '#d3261f'; g.fillRect(-1.1, -2.2, 2.2, 4.4); g.restore(); }
  if (!S.inCar) { g.translate(S.x, S.z); g.rotate(-S.heading); g.fillStyle = '#fff'; g.strokeStyle = '#1c2226'; g.lineWidth = 0.5; g.beginPath(); g.moveTo(0, 2.6); g.lineTo(1.7, -1.8); g.lineTo(0, -0.8); g.lineTo(-1.7, -1.8); g.closePath(); g.fill(); g.stroke(); }
  g.restore();
  const nx = R - Math.sin(S.yaw) * (R - 20), ny = R + Math.cos(S.yaw) * (R - 20);
  g.fillStyle = '#1c2226'; g.beginPath(); g.arc(nx, ny, 15, 0, 7); g.fill();
  g.fillStyle = '#fbfaf5'; g.font = '700 20px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('N', nx, ny + 1);
}

// ───────────── Laço ─────────────
function resize() {
  const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 74 : 62; camera.updateProjectionMatrix();
}
addEventListener('resize', resize); new ResizeObserver(resize).observe(canvas); resize();
buildMenu();
S.heading = 0;
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  update(dt); renderer.render(scene, camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

// Gancho de depuração, útil para testes automatizados e para brincar no console.
window.DCA = { S, car, chips, world, collect, start, renderer, Snd, camera, step(n = 60, dt = 1 / 60) { for (let i = 0; i < n; i++) update(dt); } };
