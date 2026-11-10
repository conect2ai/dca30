// O prédio do DCA (LECA) e seus arredores.
// Bloco dos professores e foyer: medidas da planta de arquitetura (prancha ARQ 01/03, escala 1/50).
// Galeria (corredor, LABGRAD, hall de entrada): reconstruída a partir dos vídeos, pois não consta nas pranchas.
// Eixos do jogo: +x aponta para o oeste real e +z para o norte real (o mundo está girado 180 graus em relação à planta).
import * as THREE from '../vendor/three.min.js';
import { rng } from './textures.js';
import { makeCar } from './actors.js';

export const B = { x0: 0, x1: 44, zN: -8.5, zS: 8.5, cN: -1.3, cS: 1.3, H: 3.0 };   // galeria
export const LIMITS = { x0: -50, x1: 60, z0: -38, z1: 38 };
export const UP = 3.25;                                   // desnível entre pavimentos (+0,30 para +3,55 na planta)

// Coordenadas da planta do bloco: u cresce do eixo 01 ao 08 (0 a 23,20 m), v do eixo A ao H (0 a 17,00 m).
export const gx = (u) => -2.95 - u;
export const gz = (v) => v - 8.65;
const ST = { x0: gx(1.9), x1: gx(4.9), n: 10 };           // base e topo dos lances (10 degraus de 30 cm)

// Altura do piso em (x, z) para quem está na altura y.
export function floorY(x, z, y) {
  if (x > gx(6.325) && x < gx(1.73) && z > gz(7.675) && z < gz(11.125)) {
    if (x < ST.x1) return UP / 2;                                             // patamar
    const step = (t) => (Math.min(ST.n - 1, Math.floor(t * ST.n)) + 1) * (UP / 2 / ST.n);
    const t = (ST.x0 - x) / (ST.x0 - ST.x1);
    if (z > gz(9.475)) return t <= 0 ? 0 : step(t);                           // primeiro lance, sai do foyer
    return t <= 0 ? UP : UP / 2 + step(1 - t);                                // segundo lance, chega ao 2º pavimento
  }
  return y > 1.9 ? UP : 0;
}

let OX = 0;   // deslocamento em x aplicado a tudo o que for criado (usado para reposicionar trechos inteiros)

export function merge(list) {
  let nv = 0, ni = 0;
  for (const g of list) { nv += g.attributes.position.count; ni += g.index ? g.index.count : g.attributes.position.count; }
  const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2);
  const idx = nv > 65535 ? new Uint32Array(ni) : new Uint16Array(ni);
  let vo = 0, io = 0;
  for (const g of list) {
    const n = g.attributes.position.count;
    pos.set(g.attributes.position.array, vo * 3);
    nor.set(g.attributes.normal.array, vo * 3);
    if (g.attributes.uv) uv.set(g.attributes.uv.array, vo * 2);
    if (g.index) { const ia = g.index.array; for (let i = 0; i < ia.length; i++) idx[io + i] = ia[i] + vo; io += ia.length; }
    else { for (let i = 0; i < n; i++) idx[io + i] = vo + i; io += n; }
    vo += n; g.dispose();
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.BufferAttribute(nor, 3));
  out.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  out.setIndex(new THREE.BufferAttribute(idx, 1));
  return out;
}

// Junta toda a geometria estática por material, para o jogo rodar leve até em celular.
class Batch {
  constructor() { this.map = new Map(); }
  add(mat, g) { if (OX) g.translate(OX, 0, 0); let a = this.map.get(mat); if (!a) { a = []; this.map.set(mat, a); } a.push(g); }
  bb(mat, x0, y0, z0, x1, y1, z1) {
    const g = new THREE.BoxGeometry(Math.abs(x1 - x0), Math.abs(y1 - y0), Math.abs(z1 - z0));
    g.translate((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2);
    this.add(mat, g);
  }
  quad(mat, x0, z0, x1, z1, y, tile, up = true) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([x0, y, z0, x0, y, z1, x1, y, z1, x1, y, z0]), 3));
    const n = up ? 1 : -1;
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([0, n, 0, 0, n, 0, 0, n, 0, 0, n, 0]), 3));
    const u = tile ? [x0 / tile, z0 / tile, x0 / tile, z1 / tile, x1 / tile, z1 / tile, x1 / tile, z0 / tile] : [0, 1, 0, 0, 1, 0, 1, 1];
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(u), 2));
    g.setIndex(up ? [0, 1, 2, 0, 2, 3] : [0, 2, 1, 0, 3, 2]);
    this.add(mat, g);
  }
  build(parent) {
    for (const [mat, list] of this.map) {
      const m = new THREE.Mesh(merge(list), mat);
      m.matrixAutoUpdate = false;
      if (mat.transparent) m.renderOrder = mat.userData.order ?? 2;
      parent.add(m);
    }
    this.map.clear();
  }
}

export function buildWorld(scene, T, CFG) {
  const root = new THREE.Group(); scene.add(root);
  const bt = new Batch();
  const colliders = [], segs = [], segs1 = [], inter = [], mapRects = [], upRects = [];
  const r = rng(1996);
  const L = (color, o) => new THREE.MeshLambertMaterial({ color, ...o });
  const ground = (map, n) => new THREE.MeshLambertMaterial({ map, polygonOffset: n > 0, polygonOffsetFactor: -n, polygonOffsetUnits: -n * 2 });
  T.roof.repeat.set(48, 1);
  const M = {
    wall: L('#fbf9f1'), wallOut: L('#f6f0dc'), base: L('#9aa0a2'), ceil: new THREE.MeshBasicMaterial({ color: '#dedcd3' }),
    frame: L('#7c868b'), door: L('#8f999e'), metal: L('#aab0b4'), dark: L('#24272b'),
    red: L('#c81e1e'), white: L('#f4f4f0'), table: L('#ecebe6'), blue: L('#2446c4'), wood: L('#5b2b20'),
    glassDark: L('#1f2d3c'), bars: L('#d9622b'), granite: L('#74777b'), beige: L('#d6d2bf'), water: L('#7fb0e0'),
    navy: L('#1c2748'), orange: L('#d9713a'), oak: L('#c9a472'), tan: L('#b98d5e'), bed: L('#4a6b3a'),
    tape: L('#c8463c', { polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -12 }),
    lamp: new THREE.MeshBasicMaterial({ color: '#ffffff' }), screen: new THREE.MeshBasicMaterial({ color: '#0c0d10' }),
    glass: new THREE.MeshLambertMaterial({ color: '#bfd6e6', transparent: true, opacity: 0.2, depthWrite: false }),
    tint: new THREE.MeshLambertMaterial({ color: '#4b2a52', transparent: true, opacity: 0.72, depthWrite: false }),
    concrete: L('#c9c5b4'), roof: new THREE.MeshLambertMaterial({ map: T.roof }), roofBlue: L('#27348b'),
    trunk: L('#6b4a32'), leaf: [L('#3c7a35', { flatShading: true }), L('#2f6a2e', { flatShading: true }), L('#5a9440', { flatShading: true })],
    plant: L('#4f8f3a', { flatShading: true }), purple: L('#7a3f6b', { flatShading: true }), hedge: L('#356a31'), hill: L('#5d7a58', { flatShading: true }),
    gEarth: ground(T.earth, 0), gCobble: ground(T.cobble, 1), gConc: ground(T.concrete, 2), gFloor: ground(T.terrazzo, 3), gTile: ground(T.tile, 4),
    rug: L('#1b1b1c', { polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -10 }),
    pool: new THREE.MeshBasicMaterial({ map: T.glow, transparent: true, opacity: 0.2, blending: THREE.AdditiveBlending, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -12 }),
    shade: new THREE.MeshBasicMaterial({ map: T.shadow, transparent: true, opacity: 0.8, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -5, polygonOffsetUnits: -10 }),
  };
  M.pool.userData.order = 1; M.shade.userData.order = 1; M.glass.userData.order = 3; M.tint.userData.order = 3;

  const col = (x0, z0, x1, z1, o = {}) => colliders.push({ x0: Math.min(x0, x1) + OX, x1: Math.max(x0, x1) + OX, z0: Math.min(z0, z1), z1: Math.max(z0, z1), wall: !!o.wall, lv: o.lv ?? 0 });
  const hot = (o) => inter.push({ ...o, x: o.x + OX });

  // Posiciona peças em um referencial local (x, y, z, giro em Y).
  function at(x, y, z, ry = 0) {
    const m = new THREE.Matrix4().makeRotationY(ry).setPosition(x, y, z);
    return {
      box(mat, w, h, d, lx, ly, lz) { const g = new THREE.BoxGeometry(w, h, d); g.translate(lx, ly, lz); g.applyMatrix4(m); bt.add(mat, g); },
      cyl(mat, rt, rb, h, lx, ly, lz, seg = 10) { const g = new THREE.CylinderGeometry(rt, rb, h, seg); g.translate(lx, ly, lz); g.applyMatrix4(m); bt.add(mat, g); },
      geo(mat, g) { g.applyMatrix4(m); bt.add(mat, g); },
    };
  }

  function decal(map, w, h, x, y, z, ry = 0, o = {}) {
    const Mat = o.basic ? THREE.MeshBasicMaterial : THREE.MeshLambertMaterial;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new Mat({ map, transparent: !!o.alpha, side: o.double ? THREE.DoubleSide : THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -8 }));
    m.position.set(x + (o.parent ? 0 : OX), y, z);
    if (o.flat) { m.rotation.x = -Math.PI / 2; m.rotation.z = ry; } else m.rotation.y = ry;
    (o.parent || root).add(m);
    return m;
  }

  // Parede ao longo de um eixo ('x' ou 'z') na coordenada c, de a até b, com vãos de porta, janela, peitoril e cobogó.
  function wall(axis, c, a, b, o = {}) {
    const t = o.t ?? 0.15, h = o.h ?? B.H, mat = o.mat ?? M.wall, yb = (o.lvl || 0) * UP, lv = o.lvl || 0;
    const ops = (o.openings || []).slice().sort((p, q) => p.a - q.a);
    const bb = (m, u0, y0, v0, u1, y1, v1) => axis === 'x' ? bt.bb(m, u0, y0 + yb, c + v0, u1, y1 + yb, c + v1) : bt.bb(m, c + v0, y0 + yb, u0, c + v1, y1 + yb, u1);
    const cc = (u0, u1) => axis === 'x' ? col(u0, c - t / 2, u1, c + t / 2, { wall: true, lv }) : col(c - t / 2, u0, c + t / 2, u1, { wall: true, lv });
    const sg = (u0, u1) => (lv ? segs1 : segs).push(axis === 'x' ? [u0 + OX, c, u1 + OX, c] : [c + OX, u0, c + OX, u1]);
    const solid = (u0, u1) => {
      if (u1 - u0 < 0.01) return;
      bb(mat, u0, 0, -t / 2, u1, h, t / 2);
      if (o.base !== false) bb(M.base, u0, 0, -t / 2 - 0.012, u1, 0.1, t / 2 + 0.012);
      cc(u0, u1); sg(u0, u1);
    };
    let u = a;
    for (const op of ops) {
      solid(u, op.a);
      const y0 = op.y0 || 0, y1 = op.y1 ?? 2.1;
      if (y0 > 0) { bb(mat, op.a, 0, -t / 2, op.b, y0, t / 2); cc(op.a, op.b); sg(op.a, op.b); }
      if (y1 < h) bb(mat, op.a, y1, -t / 2, op.b, h, t / 2);
      if (op.cap) bb(M.granite, op.a, y0, -t / 2 - 0.04, op.b, y0 + 0.04, t / 2 + 0.04);
      if (op.kind === 'cobogo') {
        for (let y = y0; y < y1 - 0.01; y += 0.2) bb(mat, op.a, y + 0.1, -t / 2, op.b, y + 0.2, t / 2);
        for (let w = op.a + 0.4; w < op.b - 0.05; w += 0.4) bb(mat, w - 0.04, y0, -t / 2, w + 0.04, y1, t / 2);
        if (y0 === 0) { cc(op.a, op.b); sg(op.a, op.b); }
      } else if (op.kind) {
        bb(op.kind === 'clear' ? M.glass : op.kind === 'tint' ? M.tint : M.glassDark, op.a, y0, -0.02, op.b, y1, 0.02);
        bb(M.frame, op.a, y0 - 0.04, -t / 2 - 0.03, op.b, y0, t / 2 + 0.03);
        bb(M.frame, op.a, y1, -t / 2 - 0.03, op.b, y1 + 0.04, t / 2 + 0.03);
        const mid = (op.a + op.b) / 2;
        bb(M.frame, mid - 0.025, y0, -0.04, mid + 0.025, y1, 0.04);
        if (y0 === 0) { cc(op.a, op.b); sg(op.a, op.b); }
        if (op.kind === 'clear' && op.out) {
          const v = op.out * (t / 2 + 0.04);
          for (let y = y0 + 0.2; y < y1 - 0.05; y += 0.2) bb(M.bars, op.a, y - 0.012, v - 0.012, op.b, y + 0.012, v + 0.012);
          for (let w = op.a + 0.25; w < op.b - 0.05; w += 0.25) bb(M.bars, w - 0.012, y0, v - 0.012, w + 0.012, y1, v + 0.012);
        }
        if (op.ac && op.out) bb(M.white, op.b - 0.8, y1 + 0.14, op.out * (t / 2), op.b - 0.05, y1 + 0.46, op.out * (t / 2 + 0.3));
      } else if (op.frame !== false) {
        bb(M.frame, op.a - 0.06, 0, -t / 2 - 0.02, op.a, y1 + 0.06, t / 2 + 0.02);
        bb(M.frame, op.b, 0, -t / 2 - 0.02, op.b + 0.06, y1 + 0.06, t / 2 + 0.02);
        bb(M.frame, op.a - 0.06, y1, -t / 2 - 0.02, op.b + 0.06, y1 + 0.06, t / 2 + 0.02);
      }
      u = op.b;
    }
    solid(u, b);
  }
  const win = (center, o = {}) => ({ a: center - 1, b: center + 1, y0: 1.0, y1: 2.2, kind: 'dark', ac: true, ...o });

  // Atalhos em coordenadas da planta do bloco (u, v).
  const wU = (v, u0, u1, o = {}) => wall('x', gz(v), gx(u1), gx(u0), { ...o, openings: (o.openings || []).map((p) => ({ ...p, a: gx(p.b), b: gx(p.a) })) });
  const wV = (u, v0, v1, o = {}) => wall('z', gx(u), gz(v0), gz(v1), { ...o, openings: (o.openings || []).map((p) => ({ ...p, a: gz(p.a), b: gz(p.b), out: p.out ? -p.out : undefined })) });
  const bbB = (mat, u0, y0, v0, u1, y1, v1) => bt.bb(mat, gx(u1), y0, gz(v0), gx(u0), y1, gz(v1));
  const colB = (u0, v0, u1, v1, o) => col(gx(u1), gz(v0), gx(u0), gz(v1), o);
  const quadB = (mat, u0, v0, u1, v1, y, tile, up) => bt.quad(mat, gx(u1), gz(v0), gx(u0), gz(v1), y, tile, up);

  // Peças reaproveitadas em vários cômodos
  const pool = (x0, z0, x1, z1, y = 0) => bt.quad(M.pool, x0, z0, x1, z1, y + 0.05, 0);
  const lampX = (x, z, y = 0, len = 1.3) => { bt.bb(M.white, x - len / 2, y + 2.9, z - 0.14, x + len / 2, y + 2.985, z + 0.14); bt.bb(M.lamp, x - len / 2 + 0.05, y + 2.87, z - 0.09, x + len / 2 - 0.05, y + 2.9, z + 0.09); };
  const lampZ = (x, z, y = 0) => { bt.bb(M.white, x - 0.14, y + 2.9, z - 0.65, x + 0.14, y + 2.985, z + 0.65); bt.bb(M.lamp, x - 0.09, y + 2.87, z - 0.6, x + 0.09, y + 2.9, z + 0.6); };
  const tape = (x0, z0, x1, z1, y = 0) => { const h = y + 0.04; for (const [a, b, c, d] of [[x0, z0, x1, z0 + 0.05], [x0, z1 - 0.05, x1, z1], [x0, z0, x0 + 0.05, z1], [x1 - 0.05, z0, x1, z1]]) bt.bb(M.tape, a, h, b, c, h + 0.004, d); };
  const plasticChair = (x, z, ry, y = 0) => { const c = at(x, y, z, ry); c.box(M.white, 0.44, 0.04, 0.44, 0, 0.44, 0); c.box(M.white, 0.44, 0.44, 0.04, 0, 0.68, -0.2); for (const [lx, lz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) c.box(M.white, 0.04, 0.44, 0.04, lx, 0.22, lz); };
  const officeChair = (x, z, ry, y = 0) => { const c = at(x, y, z, ry); c.box(M.dark, 0.48, 0.08, 0.48, 0, 0.48, 0); c.box(M.dark, 0.46, 0.55, 0.07, 0, 0.82, -0.23); c.cyl(M.metal, 0.03, 0.03, 0.44, 0, 0.23, 0, 6); c.cyl(M.metal, 0.27, 0.27, 0.03, 0, 0.03, 0, 5); };
  const stool = (x, z, y = 0) => { const c = at(x, y, z, r() * 6); c.box(M.blue, 0.4, 0.06, 0.4, 0, 0.7, 0); c.box(M.blue, 0.38, 0.3, 0.05, 0, 0.95, -0.18); c.cyl(M.dark, 0.03, 0.03, 0.68, 0, 0.35, 0, 6); c.cyl(M.dark, 0.26, 0.26, 0.03, 0, 0.03, 0, 5); };
  const panel = (x, z, ry, y = 0) => { at(x, y, z, ry).box(M.beige, 0.5, 0.72, 0.13, 0, 1.55, 0.065); decal(T.elec, 0.24, 0.24, x + Math.sin(ry) * 0.135, y + 1.6, z + Math.cos(ry) * 0.135, ry); };
  // Extintor preso à parede, com a placa acima. ry é a direção para onde a parede olha.
  const extinguisher = (x, z, ry, y = 0) => {
    const p = at(x + Math.sin(ry) * 0.1, y, z + Math.cos(ry) * 0.1);
    p.cyl(M.red, 0.075, 0.075, 0.48, 0, 1.12, 0, 10); p.cyl(M.dark, 0.03, 0.045, 0.1, 0, 1.4, 0, 8);
    decal(T.fireSign, 0.2, 0.2, x + Math.sin(ry) * 0.012, y + 1.85, z + Math.cos(ry) * 0.012, ry);
  };
  const hose = (x, z, ry, y = 0) => { at(x, y, z, ry).box(M.red, 0.6, 0.85, 0.16, 0, 1.325, 0.08); decal(T.hose, 0.6, 0.85, x + Math.sin(ry) * 0.165, y + 1.325, z + Math.cos(ry) * 0.165, ry); };
  // Porta fechada com bandeira de vidro e plaquinha, voltada para +Z local, encostada na face da parede.
  function doorAt(x, z, ry, sala, nome, y = 0) {
    const p = at(x, y, z, ry), sn = Math.sin(ry), cs = Math.cos(ry);
    p.box(M.door, 0.9, 2.1, 0.06, 0, 1.05, 0.03);
    p.box(M.frame, 0.07, 2.72, 0.09, -0.485, 1.36, 0.03); p.box(M.frame, 0.07, 2.72, 0.09, 0.485, 1.36, 0.03);
    p.box(M.frame, 1.04, 0.07, 0.09, 0, 2.135, 0.03); p.box(M.frame, 1.04, 0.07, 0.09, 0, 2.7, 0.03);
    p.box(M.glassDark, 0.9, 0.5, 0.03, 0, 2.42, 0.02);
    p.box(M.metal, 0.1, 0.04, 0.07, 0.34, 1.0, 0.09);
    decal(T.plate(sala, nome), 0.52, 0.17, x + sn * 0.066, y + 1.78, z + cs * 0.066, ry);
    hot({ x: x + sn * 0.7, z: z + cs * 0.7, y, r: 1.0, label: 'Bater na porta', kind: 'porta' });
  }

  // ═════════════ Chão ═════════════
  bt.quad(M.gEarth, -260, -260, 260, 260, 0, 6);
  bt.quad(M.gCobble, -62, -52, -30, 10.6, 0.005, 3);                 // estacionamento lateral
  bt.quad(M.gCobble, -62, 10.6, 96, 46, 0.005, 3);                   // estacionamento do lado do LAUT
  bt.quad(M.gConc, -28.2, 8.35, 46.5, 10.6, 0.015, 2.4);
  bt.quad(M.gConc, -28.2, -10.6, 0, -8.65, 0.015, 2.4);
  bt.quad(M.gConc, -28.2, -8.65, -26.15, 8.35, 0.015, 2.4);
  bt.quad(M.gConc, 0, -10.5, 26, -8.5, 0.015, 2.4);
  bt.quad(M.gConc, 38, -10.5, 46.5, -8.5, 0.015, 2.4);
  bt.quad(M.gConc, 44, -8.5, 46.5, 8.35, 0.015, 2.4);
  bt.quad(M.gConc, -2.95, 2.55, 0, 8.35, 0.015, 2.4);                // passagem da saída
  bt.quad(M.gConc, -2.95, -8.65, 0, -2.85, 0.015, 2.4);
  bt.quad(M.gFloor, B.x0, B.zN, B.x1, B.zS, 0.03, 1.25);             // granilite da galeria
  bt.quad(M.gTile, -2.95, -2.85, 0, 2.55, 0.034, 0.9);               // foyer
  quadB(M.gTile, 0, 0, 23.2, 17, 0.034, 0.9);                        // bloco, piso cerâmico
  bt.quad(M.ceil, B.x0, B.zN, B.x1, B.zS, 2.995, 0, false);
  bt.quad(M.ceil, -2.95, -2.85, 0, 2.55, 2.995, 0, false);
  mapRects.push({ x0: -62, z0: -52, x1: -30, z1: 10.6, c: '#5d5b56' }, { x0: -62, z0: 10.6, x1: 96, z1: 46, c: '#5d5b56' },
    { x0: -2.95, z0: 2.55, x1: 0, z1: 10.6, c: '#a9a79e' }, { x0: -2.95, z0: -10.6, x1: 0, z1: -2.85, c: '#a9a79e' },
    { x0: 0, z0: -8.5, x1: 44, z1: 8.5, c: '#d9d3c2' }, { x0: gx(23.2), z0: gz(0), x1: gx(0), z1: gz(17), c: '#e6e3d8' }, { x0: -2.95, z0: -2.85, x1: 0, z1: 2.55, c: '#e6e3d8' },
    { x0: gx(20), z0: gz(5.95), x1: gx(6.4), z1: gz(7.45), c: '#6f8f55' }, { x0: gx(23.2), z0: gz(5.8), x1: gx(21.8), z1: gz(11.2), c: '#b77a52' });

  // ═════════════ Galeria: paredes ═════════════
  wall('z', 0, B.zN, B.zS, { mat: M.wallOut, openings: [{ a: -0.65, b: 0.65, y1: 2.2 }, win(-5.6, { a: -6.4, b: -4.8, ac: false }), win(5.6, { a: 4.8, b: 6.4, ac: false })] });
  wall('z', 44, B.zN, B.zS, { mat: M.wallOut, openings: [win(-5, { out: 1 }), win(5, { out: 1 })] });
  wall('x', B.zN, 0, 44, { mat: M.wallOut, openings: [
    ...[4, 10, 16, 22, 41].map((c) => win(c, { out: -1 })),
    { a: 31, b: 33.4, y1: 2.3 }, { a: 28.95, b: 30.65, y0: 0, y1: 2.3, kind: 'tint' },
  ] });
  wall('x', B.zS, 0, 44, { mat: M.wallOut, openings: [
    ...[3.5, 25, 31, 36.5, 41.5].map((c) => win(c, { out: 1 })),
    ...[11.6, 14.2, 16.8, 19.4].map((c) => ({ a: c - 1, b: c + 1, y0: 1.0, y1: 2.25, kind: 'clear', out: 1 })),
  ] });
  wall('x', B.cN, 0, 44, { openings: [{ a: 28, b: 31, y1: 2.5 }] });
  wall('x', B.cS, 0, 44, { openings: [{ a: 10, b: 11, y1: 2.1 }] });
  wall('z', 9.4, B.cS, B.zS); wall('z', 21.4, B.cS, B.zS);
  wall('z', 26, B.zN, B.cN); wall('z', 38, B.zN, B.cN);
  wall('z', 26, -12.5, B.zN - 0.075, { mat: M.wallOut, base: false });
  wall('z', 38, -12.5, B.zN - 0.075, { mat: M.wallOut, base: false });
  // Telhado de duas águas da galeria
  bt.bb(M.wallOut, -0.1, 3.0, -9.3, 44.9, 3.14, 9.3);
  for (const s of [1, -1]) { const g = new THREE.BoxGeometry(46.4, 0.08, 9.75); g.rotateX(s * 0.158); g.translate(22.1, 3.9, s * 4.7); bt.add(M.roof, g); }
  for (const x of [-0.1, 44]) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([x, 3.1, -9.3, x, 3.1, 9.3, x, 4.62, 0, x, 3.1, 9.3, x, 3.1, -9.3, x, 4.62, 0]), 3));
    const n = x < 1 ? -1 : 1;
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([n, 0, 0, n, 0, 0, n, 0, 0, n, 0, 0, n, 0, 0, n, 0, 0]), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(12), 2));
    g.setIndex(x < 1 ? [0, 1, 2] : [3, 4, 5]);
    bt.add(M.wallOut, g);
  }
  bt.bb(M.wallOut, 25.9, 3.0, -13.0, 38.1, 3.16, -8.5);       // laje da varanda

  // ═════════════ Galeria: corredor ═════════════
  for (let x = 2.5; x < 44; x += 5) { lampX(x, 0); pool(x - 1.9, -1.2, x + 1.9, 1.2); }
  { const g = new THREE.CylinderGeometry(0.045, 0.045, 40, 8); g.rotateZ(Math.PI / 2); g.translate(21, 2.78, 0.92); bt.add(M.red, g); }
  bt.bb(M.metal, 0.3, 2.82, -1.12, 43.7, 2.86, -0.86);
  for (let x = 2; x < 44; x += 4) bt.bb(M.metal, x - 0.02, 2.86, -1.0, x + 0.02, 2.99, -0.96);
  for (const x of [8, 24]) at(x, 2.93, 0.3).geo(M.dark, new THREE.SphereGeometry(0.09, 10, 6));
  function door(x, zWall, side, sala) {
    const z = zWall + side * 0.1;
    bt.bb(M.door, x - 0.45, 0, z - 0.03, x + 0.45, 2.1, z + 0.03);
    bt.bb(M.frame, x - 0.52, 0, z - 0.04, x - 0.45, 2.17, z + 0.04); bt.bb(M.frame, x + 0.45, 0, z - 0.04, x + 0.52, 2.17, z + 0.04);
    bt.bb(M.frame, x - 0.52, 2.1, z - 0.04, x + 0.52, 2.17, z + 0.04);
    bt.bb(M.glassDark, x - 0.19, 1.3, z + side * 0.03 - 0.006, x + 0.19, 1.68, z + side * 0.03 + 0.006);
    bt.bb(M.metal, x + side * 0.3, 1.0, z + side * 0.03, x + side * 0.4, 1.04, z + side * 0.09);
    decal(T.plate(sala, 'DCA · UFRN'), 0.48, 0.16, x, 1.88, z + side * 0.036, side > 0 ? 0 : Math.PI);
    hot({ x, z: zWall + side * 0.7, r: 1.0, label: 'Bater na porta', kind: 'porta' });
  }
  const northDoors = [[5, 'Sala 12'], [13, 'Sala 14'], [21, 'Sala 16'], [41, 'Sala 18']];
  const southDoors = [[4.5, 'Sala 13'], [24.5, 'Sala 17'], [30, 'Sala 19'], [35.5, 'Sala 21'], [41, 'Sala 23']];
  for (const [x, s] of northDoors) door(x, B.cN, 1, s);
  for (const [x, s] of southDoors) door(x, B.cS, -1, s);
  bt.bb(M.door, 43.86, 0, -0.95, 43.92, 2.1, -0.02); bt.bb(M.door, 43.86, 0, 0.02, 43.92, 2.1, 0.95);
  bt.bb(M.frame, 43.84, 0, -1.03, 43.93, 2.18, -0.95); bt.bb(M.frame, 43.84, 0, 0.95, 43.93, 2.18, 1.03); bt.bb(M.frame, 43.84, 2.1, -1.03, 43.93, 2.18, 1.03);
  hot({ x: 43.2, z: 0, r: 1.0, label: 'Bater na porta', kind: 'porta' });
  // Porta dupla entre a galeria e o foyer, sempre aberta
  for (const s of [1, -1]) { bt.bb(M.door, 0.08, 0, s * 0.67, 0.72, 2.1, s * 0.72); col(0.08, s * 0.66, 0.72, s * 0.74); }
  for (let i = 0; i < 3; i++) bt.bb(M.glassDark, -0.085, 2.3, -0.6 + i * 0.42, 0.085, 2.7, -0.24 + i * 0.42);
  // Galeria de quadros
  const blocked = { n: [...northDoors.map((d) => d[0]), 28, 29.5, 31, 17, 34.5], s: [...southDoors.map((d) => d[0]), 10.5, 11.65, 27.2, 7.4, 22.6] };
  const frame = L('#2a2c30');
  let galleryN = 0;
  for (const [key, zWall, side] of [['n', B.cN, 1], ['s', B.cS, -1]]) {
    for (let x = 1.9; x < 43.2; x += 1.55) {
      if (blocked[key].some((d) => Math.abs(d - x) < 1.25) || r() < 0.1) continue;
      const [w, h] = [[0.95, 0.68], [0.62, 0.8], [1.1, 0.74], [0.56, 0.56], [0.8, 0.6]][(r() * 5) | 0];
      const y = 1.62 + (r() - 0.5) * 0.16, z = zWall + side * 0.078;
      bt.bb(frame, x - w / 2 - 0.03, y - h / 2 - 0.03, z - 0.015, x + w / 2 + 0.03, y + h / 2 + 0.03, z + 0.015);
      decal(T.posters[(r() * T.posters.length) | 0], w, h, x, y, z + side * 0.017, side > 0 ? 0 : Math.PI);
      if (galleryN++ % 5 === 2) hot({ x, z: zWall + side * 0.75, r: 0.95, label: 'Ver o quadro', kind: 'quadro' });
    }
  }
  extinguisher(7.4, B.cS - 0.075, Math.PI); extinguisher(22.6, B.cS - 0.075, Math.PI); extinguisher(17, B.cN + 0.075, 0); extinguisher(34.5, B.cN + 0.075, 0);
  hot({ x: 7.4, z: 0.6, r: 0.8, label: 'Examinar o extintor', kind: 'extintor' });
  hose(27.2, B.cS - 0.075, Math.PI);
  { const x = 25.2; bt.bb(M.dark, x - 0.012, 2.62, -0.26, x + 0.012, 2.88, 0.26); bt.bb(M.metal, x - 0.01, 2.88, -0.01, x + 0.01, 2.99, 0.01);
    decal(T.exitSign, 0.5, 0.22, x - 0.016, 2.75, 0, -Math.PI / 2, { basic: true }); decal(T.exitSign, 0.5, 0.22, x + 0.016, 2.75, 0, Math.PI / 2, { basic: true }); }

  // ═════════════ LABGRAD, Sala 15 (mesmo modelo de antes, 10,6 m mais perto do foyer) ═════════════
  OX = -10.6;
  decal(T.plate('Sala 15', 'Laboratório de Graduação'), 0.66, 0.22, 22.25, 1.72, B.cS - 0.08, Math.PI);
  { const p = at(20.6, 0, 1.4, -0.16); p.box(M.door, 0.05, 2.1, 1.0, 0, 1.05, 0.5); p.box(M.frame, 0.07, 0.5, 0.56, 0, 1.52, 0.5);
    decal(T.labSchedule, 0.42, 0.3, 20.6 - 0.16 * 0.5 + 0.045, 1.52, 1.9, Math.PI / 2 - 0.16); col(20.42, 1.4, 20.68, 2.4); }
  bt.bb(M.wood, 20.08, 0.98, 4.98, 20.11, 2.26, 7.42); decal(T.whiteboard, 2.36, 1.2, 20.115, 1.62, 6.2, Math.PI / 2);
  decal(T.slide(CFG.titulo), 1.9, 1.42, 20.1, 1.75, 3.7, Math.PI / 2, { basic: true });
  bt.bb(M.white, 23.3, 2.5, 3.5, 23.7, 2.66, 3.9); bt.bb(M.metal, 23.48, 2.66, 3.68, 23.52, 2.99, 3.72);
  for (const X of [23.4, 25.4, 27.4, 29.4]) {
    bt.bb(M.table, X - 0.35, 0.72, 2.9, X + 0.35, 0.76, 7.4);
    for (const z of [2.95, 5.15, 7.35]) { bt.bb(M.metal, X - 0.32, 0, z - 0.02, X - 0.28, 0.72, z + 0.02); bt.bb(M.metal, X + 0.28, 0, z - 0.02, X + 0.32, 0.72, z + 0.02); }
    col(X - 0.35, 2.9, X + 0.35, 7.4);
    for (let i = 0; i < 5; i++) {
      const z = 3.35 + i * 0.9, on = X === 29.4 && i === 2;
      bt.bb(M.dark, X - 0.12, 0.76, z - 0.1, X + 0.02, 0.78, z + 0.1); bt.bb(M.dark, X - 0.07, 0.78, z - 0.02, X - 0.03, 0.92, z + 0.02);
      bt.bb(M.dark, X - 0.08, 0.9, z - 0.27, X - 0.04, 1.24, z + 0.27);
      if (on) decal(T.screenOn, 0.5, 0.3, X - 0.036, 1.07, z, Math.PI / 2, { basic: true });
      else bt.bb(M.screen, X - 0.042, 0.92, z - 0.25, X - 0.038, 1.22, z + 0.25);
      bt.bb(M.dark, X + 0.1, 0.76, z - 0.2, X + 0.24, 0.775, z + 0.2);
      bt.bb(M.dark, X - 0.3, 0.76, z + 0.3, X - 0.02, 0.86, z + 0.39);
      const c = at(X + 0.78, 0, z + (r() - 0.5) * 0.2, -Math.PI / 2 + (r() - 0.5) * 0.7);
      c.box(M.blue, 0.44, 0.06, 0.44, 0, 0.47, 0); c.box(M.blue, 0.42, 0.4, 0.05, 0, 0.78, -0.2);
      c.cyl(M.dark, 0.03, 0.03, 0.44, 0, 0.23, 0, 6); c.cyl(M.dark, 0.26, 0.26, 0.03, 0, 0.03, 0, 5);
    }
  }
  hot({ x: 30.2, z: 5.15, r: 1.0, label: 'Usar o computador', kind: 'terminal' });
  hot({ x: 20.9, z: 6.2, r: 1.1, label: 'Ler o quadro branco', kind: 'quadrobranco' });
  for (const x of [23, 27, 30.5]) for (const z of [3.4, 6.4]) lampZ(x, z);
  pool(21.5, 2, 31.5, 8);
  bt.bb(M.white, 25.6, 2.4, 8.12, 26.6, 2.72, 8.42); bt.bb(M.white, 20.08, 2.4, 2.6, 20.36, 2.72, 3.5);
  at(21.9, 0, 1.75).cyl(M.white, 0.17, 0.14, 0.42, 0, 0.21, 0, 10);

  // ═════════════ Hall de entrada, varanda e jardim da frente (22 m mais perto do foyer) ═════════════
  OX = -22;
  for (const x of [50.03, 52.97]) {
    bt.bb(M.frame, x - 0.025, 0.04, -2.85, x + 0.025, 2.4, -2.8); bt.bb(M.frame, x - 0.025, 0.04, -1.42, x + 0.025, 2.4, -1.38);
    bt.bb(M.frame, x - 0.025, 2.35, -2.85, x + 0.025, 2.4, -1.38); bt.bb(M.frame, x - 0.025, 0.04, -2.85, x + 0.025, 0.09, -1.38);
    for (let z = -2.7; z < -1.42; z += 0.12) bt.bb(M.frame, x - 0.012, 0.09, z - 0.012, x + 0.012, 2.35, z + 0.012);
    col(x - 0.04, -2.85, x + 0.04, -1.38);
  }
  function roundTable(x, z) {
    const p = at(x, 0, z);
    p.cyl(M.white, 0.62, 0.62, 0.04, 0, 0.74, 0, 20); p.cyl(M.metal, 0.05, 0.05, 0.72, 0, 0.36, 0, 8); p.cyl(M.metal, 0.3, 0.32, 0.03, 0, 0.015, 0, 12);
    col(x - 0.45, z - 0.45, x + 0.45, z + 0.45);
    const a0 = r() * 6;
    for (let i = 0; i < 3; i++) { const a = a0 + (i * Math.PI * 2) / 3; plasticChair(x + Math.sin(a) * 1.0, z + Math.cos(a) * 1.0, a + Math.PI); }
  }
  roundTable(50.4, -5.6); roundTable(57.6, -3.6); roundTable(58, -6.9);
  decal(T.bulletin(CFG.evento), 2.2, 1.375, 48.085, 1.6, -4.2, Math.PI / 2);
  bt.bb(M.wood, 48.08, 0.88, -5.34, 48.1, 2.32, -3.06);
  hot({ x: 48.9, z: -4.2, r: 1.2, label: 'Ler o mural', kind: 'mural' });
  for (const z of [-7.9, -7.4]) at(59.5, 0, z).cyl(M.dark, 0.2, 0.17, 0.5, 0, 0.25, 0, 10);
  col(59.25, -8.15, 59.75, -7.15);
  lampX(51, -5); lampX(57, -5); pool(49, -8, 59, -2);
  for (const x of [53.02, 55.38]) {
    bt.bb(M.glass, x - 0.015, 0.1, -9.7, x + 0.015, 2.2, -8.6);
    bt.bb(M.metal, x - 0.025, 0, -9.72, x + 0.025, 0.1, -8.58); bt.bb(M.metal, x - 0.025, 2.2, -9.72, x + 0.025, 2.28, -8.58);
    bt.bb(M.metal, x - 0.025, 0, -9.74, x + 0.025, 2.28, -9.68); bt.bb(M.metal, x - 0.025, 0, -8.62, x + 0.025, 2.28, -8.58);
    col(x - 0.04, -9.74, x + 0.04, -8.58);
  }
  for (let x = 48.75; x < 50.7; x += 0.24) bt.bb(M.wallOut, x, 0.25, -8.72, x + 0.1, 2.35, -8.6);
  decal(T.facade, 4.7, 0.59, 54.2, 2.64, -8.585, Math.PI, { alpha: true });
  for (const x0 of [55.75, 57.85]) {
    bt.bb(M.white, x0, 1.95, -8.62, x0 + 1.9, 2.45, -8.575);
    for (let y = 2.02; y < 2.44; y += 0.07) bt.bb(M.base, x0 + 0.04, y, -8.63, x0 + 1.86, y + 0.02, -8.62);
  }
  bt.bb(M.concrete, 59.3, 0, -11.9, 59.92, 0.45, -8.58); bt.bb(M.concrete, 59.75, 0.45, -11.9, 59.92, 0.95, -8.58);
  bt.bb(M.concrete, 56.4, 0, -9.2, 59.3, 0.45, -8.58); bt.bb(M.concrete, 56.4, 0.45, -8.75, 59.3, 0.95, -8.58);
  col(59.3, -11.9, 59.92, -8.58); col(56.4, -9.2, 59.3, -8.58);
  decal(T.banner, 2.3, 1.15, 59.915, 1.78, -10.6, -Math.PI / 2);
  decal(T.access, 1.3, 1.3, 54.2, 0.03, -10.1, 0, { flat: true });
  for (const x of [51, 57.5]) { bt.bb(M.white, x - 0.6, 2.93, -10.9, x + 0.6, 3.0, -10.7); bt.bb(M.lamp, x - 0.55, 2.9, -10.86, x + 0.55, 2.93, -10.74); }
  hot({ x: 58.7, z: -10.6, r: 1.3, label: 'Ler o banner', kind: 'banner' });
  bt.quad(M.gConc, 48, -12.5, 60, -8.5, 0.015, 2.4);
  bt.quad(M.gConc, 53, -35, 55.4, -12.5, 0.015, 2.4);
  bt.quad(M.gConc, 33, -25.2, 75, -22.8, 0.015, 2.4);
  OX = 0;
  mapRects.push({ x0: 31, z0: -35, x1: 33.4, z1: -12.5, c: '#a9a79e' }, { x0: 11, z0: -25.2, x1: 53, z1: -22.8, c: '#a9a79e' }, { x0: 26, z0: -12.5, x1: 38, z1: -8.5, c: '#a9a79e' });

  // ═════════════ Foyer (térreo, cobertura própria) ═════════════
  wall('x', 2.55, -2.95, 0, { mat: M.wallOut, openings: [{ a: -1.82, b: -0.23, y1: 2.1 }] });        // porta da Saída, voltada para o LAUT
  wall('x', -2.85, -2.95, 0, { mat: M.wallOut });
  bt.bb(M.wallOut, -3.1, 3.0, -3.0, 0, 3.18, 2.7);
  { const g = new THREE.BoxGeometry(3.5, 0.08, 6.4); g.rotateZ(-0.22); g.translate(-1.5, 3.55, -0.15); bt.add(M.roof, g); }
  // porta dupla fechada do lado do jardim, atrás do quadro branco
  bt.bb(M.door, -1.8, 0, -2.79, -0.25, 2.1, -2.74); bt.bb(M.frame, -1.87, 0, -2.8, -1.8, 2.17, -2.73); bt.bb(M.frame, -0.25, 0, -2.8, -0.18, 2.17, -2.73); bt.bb(M.frame, -1.87, 2.1, -2.8, -0.18, 2.17, -2.73);
  bt.bb(M.wood, -2.35, 0.7, -2.2, -0.35, 0.76, -1.3); for (const [x, z] of [[-2.25, -2.1], [-0.45, -2.1], [-2.25, -1.4], [-0.45, -1.4]]) bt.bb(M.dark, x - 0.03, 0, z - 0.03, x + 0.03, 0.7, z + 0.03);
  col(-2.35, -2.2, -0.35, -1.3);
  bt.bb(M.white, -2.1, 0.95, -2.7, -0.5, 2.25, -2.67); decal(T.whiteboard, 1.5, 1.2, -1.3, 1.6, -2.66, 0); bt.bb(M.metal, -2.14, 0, -2.7, -2.1, 2.3, -2.66); bt.bb(M.metal, -0.5, 0, -2.7, -0.46, 2.3, -2.66);
  stool(-2.6, -0.9); stool(-0.5, -0.8);
  bt.bb(M.white, -0.55, 0, 1.45, -0.08, 0.82, 2.4); col(-0.55, 1.45, -0.08, 2.4);
  bt.bb(M.rug, -1.6, 0.034, 1.5, -0.45, 0.05, 2.45);
  extinguisher(-0.075, 0.95, -Math.PI / 2); extinguisher(-0.075, 1.17, -Math.PI / 2);
  decal(T.exitSign, 0.5, 0.22, -0.082, 2.82, 0, -Math.PI / 2, { basic: true });
  decal(T.exitSign, 0.5, 0.22, -1.02, 2.5, 2.47, Math.PI, { basic: true });
  lampX(-1.5, 0); pool(-3.4, -1.9, 0.4, 1.9); lampZ(-3.9, -0.1);
  for (let i = 0; i < 3; i++) bt.bb(M.glassDark, -1.75 + i * 0.52, 2.22, 2.465, -1.3 + i * 0.52, 2.62, 2.635);
  bt.bb(M.roof, -2.6, 2.55, 2.55, 0, 2.62, 3.9);                                                       // marquise da saída
  const exitL = new THREE.Group(), exitR = new THREE.Group(); exitL.position.set(-1.82, 0, 2.55); exitR.position.set(-0.23, 0, 2.55); root.add(exitL, exitR);
  { const a = new THREE.Mesh(new THREE.BoxGeometry(0.79, 2.08, 0.05), M.door); a.position.set(0.4, 1.04, 0); exitL.add(a);
    const b = new THREE.Mesh(new THREE.BoxGeometry(0.79, 2.08, 0.05), M.door); b.position.set(-0.4, 1.04, 0); exitR.add(b);
    decal(T.exitPaper, 0.5, 0.66, -0.4, 1.5, -0.03, Math.PI, { parent: exitR }); decal(T.exitPaper, 0.5, 0.66, -0.4, 1.5, 0.03, 0, { parent: exitR }); }
  decal(T.access, 1.1, 1.1, -1.4, 0.03, 9.5, 0, { flat: true });

  // ═════════════ Bloco dos professores: paredes dos dois pavimentos ═════════════
  const facade = (lvl, out) => [1.6, 4.8, 8.0, 15.2, 18.4, 21.6].map((c) => ({ a: c - 0.75, b: c + 0.75, y0: 0.9, y1: 2.3, kind: 'dark', ac: lvl === 0 && c > 10, out }));
  const high = [10.4, 12.6].map((c) => ({ a: c - 0.5, b: c + 0.5, y0: 1.7, y1: 2.3, kind: 'dark' }));
  for (const lvl of [0, 1]) {
    const o = { lvl, mat: M.wallOut };
    wU(17, 0, 23.2, { ...o, openings: [...facade(lvl, 1), ...high] });                                               // fachada do lado do LAUT
    wU(0, 0, 23.2, { ...o, openings: [...facade(lvl, -1), ...high] });                                               // fachada do lado do jardim
    wV(23.2, 0, 5.8, { ...o, openings: [{ a: 4.3, b: 5.6, y0: 0.9, y1: 2.5, kind: 'cobogo' }] });
    wV(23.2, 11.2, 17, { ...o, openings: [{ a: 11.5, b: 12.8, y0: 0.9, y1: 2.3, kind: 'clear' }] });
    wV(21.725, 5.8, 11.2, { ...o, openings: [{ a: 6.1, b: 7.5, y0: 0.9, y1: 2.5, kind: 'cobogo' }, { a: 8.0, b: 9.3, y0: 0.9, y1: 2.3, kind: 'clear' }, { a: 9.7, b: 11.0, y0: 0.9, y1: 2.3, kind: 'clear' }] });
    // circulações
    wU(4.0, 0, 23.2, { lvl, openings: lvl ? [] : [{ a: 0.2, b: 1.1, y1: 2.1 }, { a: 6.55, b: 7.45, y1: 2.1 }] });
    wU(5.8, 0, 23.2, { lvl, openings: [{ a: 0.15, b: 1.7, y1: 2.7, frame: false }, { a: 6.5, b: 19.9, y0: 1.05, y1: 3.0, frame: false, cap: true }, { a: 20.15, b: 21.65, y1: 2.7, frame: false }] });
    wU(7.6, 1.73, 20.15, { lvl, openings: [8.4, 12.0, 15.2, 18.4].map((c) => ({ a: c - 0.75, b: c + 0.75, y0: 0.9, y1: 2.3, kind: 'dark', ac: true, out: -1 })) });
    wU(11.2, 0, 23.2, { lvl, openings: [{ a: 0.15, b: 1.7, y1: 2.7, frame: false }, { a: 20.15, b: 21.65, y1: 2.7, frame: false }] });
    wU(13.0, 0, 23.2, { lvl, openings: lvl ? [] : [{ a: 0.2, b: 1.1, y1: 2.1 }] });
    wV(20.075, 5.8, 11.2, { lvl });
    wV(6.4, 5.8, 11.2, { lvl });
    // divisórias entre as salas
    for (const u of [6.4, 9.6, 13.6, 16.8, 20.0]) wV(u, 0, 4.0, { lvl });
    for (const u of [3.2, 6.4, 9.6, 13.6, 16.8, 20.0]) wV(u, 13.0, 17, { lvl });
    for (const u of [10.4, 13.6, 16.8]) wV(u, 7.6, 11.2, { lvl });
    for (const u of [9.6, 13.2, 16.4]) bbB(M.wall, u - 0.12, lvl * UP, 5.68, u + 0.12, lvl * UP + 3.0, 5.92);          // pilares do peitoril
  }
  // lado do foyer: no térreo o bloco se abre para ele, no 2º pavimento há parede com janelas sobre a cobertura
  wV(0, 0, 5.8, { mat: M.wallOut, openings: [{ a: 4.35, b: 5.5, y0: 1.0, y1: 2.2, kind: 'clear' }] });
  wV(0, 11.2, 17, { mat: M.wallOut, openings: [{ a: 11.5, b: 12.7, y0: 1.0, y1: 2.2, kind: 'clear' }] });
  wV(0, 0, 17, { lvl: 1, mat: M.wallOut, openings: [{ a: 4.35, b: 5.5, y0: 1.0, y1: 2.2, kind: 'clear' }, { a: 7.7, b: 9.4, y0: 1.0, y1: 2.2, kind: 'clear' }, { a: 11.5, b: 12.7, y0: 1.0, y1: 2.2, kind: 'clear' }] });
  // frente da escada e do elevador
  wV(1.73, 5.8, 11.2, { openings: [{ a: 9.55, b: 11.05, y1: 2.7, frame: false }] });
  wV(1.73, 5.8, 11.2, { lvl: 1, openings: [{ a: 7.75, b: 9.4, y1: 2.7, frame: false }, { a: 9.55, b: 11.05, y0: 1.05, y1: 3.0, frame: false, cap: true }] });
  for (const y of [0, UP]) { bbB(M.metal, 1.6, y, 6.25, 1.66, y + 2.1, 7.15); bbB(M.frame, 1.58, y, 6.18, 1.67, y + 2.17, 6.25); bbB(M.frame, 1.58, y, 7.15, 1.67, y + 2.17, 7.22); bbB(M.frame, 1.58, y + 2.1, 6.18, 1.67, y + 2.17, 7.22); bbB(M.dark, 1.6, y + 1.0, 7.3, 1.64, y + 1.2, 7.42); }
  hot({ x: gx(1.1), z: gz(6.7), r: 0.9, label: 'Chamar o elevador', kind: 'elevador' }); hot({ x: gx(1.1), z: gz(6.7), y: UP, r: 0.9, label: 'Chamar o elevador', kind: 'elevador' });

  // lajes, forros, piso do 2º pavimento e cobertura. O poço de ventilação e o vão da escada ficam abertos.
  const regions = [[0, 0, 23.2, 5.8], [0, 5.8, 1.73, 11.2], [1.73, 5.8, 6.4, 7.6], [6.4, 7.6, 20.075, 11.2], [20.075, 5.8, 21.8, 11.2], [0, 11.2, 23.2, 17]];
  for (const [u0, v0, u1, v1] of regions) {
    bbB(M.wallOut, u0, 3.0, v0, u1, UP, v1); quadB(M.gTile, u0, v0, u1, v1, UP + 0.005, 0.9);
    quadB(M.ceil, u0, v0, u1, v1, 2.995, 0, false); quadB(M.ceil, u0, v0, u1, v1, UP + 2.995, 0, false);
    bbB(M.wallOut, u0, UP + 3.0, v0, u1, UP + 3.15, v1);
    upRects.push({ x0: gx(u1), z0: gz(v0), x1: gx(u0), z1: gz(v1) });
  }
  quadB(M.ceil, 1.73, 7.6, 6.4, 11.2, UP + 2.995, 0, false); bbB(M.wallOut, 1.73, UP + 3.0, 7.6, 6.4, UP + 3.15, 11.2);
  upRects.push({ x0: gx(6.4), z0: gz(7.6), x1: gx(1.73), z1: gz(11.2) });
  for (const [v0, v1, a] of [[-0.9, 5.8, -0.11], [7.6, 17.9, 0.11]]) { const g = new THREE.BoxGeometry(25, 0.1, v1 - v0 + 0.1); g.rotateX(a); g.translate(gx(11.6), UP + 3.2 + (v1 - v0) * 0.058, gz((v0 + v1) / 2)); bt.add(M.roof, g); }
  bbB(M.roof, 19.9, UP + 3.15, 5.8, 23.6, UP + 3.25, 7.6);

  // escada em dois lances de 10 degraus, patamar e parede central
  { const h = UP / 2 / ST.n, d = 0.3;
    for (let i = 0; i < ST.n; i++) {
      bt.bb(M.granite, ST.x0 - (i + 1) * d, 0, gz(9.55), ST.x0 - i * d, (i + 1) * h, gz(11.125));
      bt.bb(M.granite, ST.x1 + i * d, UP / 2 + (i + 1) * h - 0.4, gz(7.675), ST.x1 + (i + 1) * d, UP / 2 + (i + 1) * h, gz(9.4));
    }
    bt.bb(M.granite, gx(6.325), UP / 2 - 0.25, gz(7.675), ST.x1, UP / 2, gz(11.125));
    bt.bb(M.wall, ST.x1, 0, gz(9.4), gx(1.73), UP + 1.05, gz(9.55)); bt.bb(M.granite, ST.x1 - 0.03, UP + 1.05, gz(9.37), gx(1.7), UP + 1.09, gz(9.58));
    col(ST.x1, gz(9.4), gx(1.73), gz(9.55), { wall: true, lv: 2 }); segs.push([ST.x1, gz(9.475), gx(1.73), gz(9.475)]); segs1.push([ST.x1, gz(9.475), gx(1.73), gz(9.475)]);
    bt.bb(M.granite, ST.x0, UP - 0.2, gz(7.675), gx(1.73), UP, gz(9.4));
    const a = Math.atan2(UP / 2, 3.0), mx = (ST.x0 + ST.x1) / 2;
    for (const [z, y, sg] of [[gz(11.06), UP / 4 + 0.95, -1], [gz(9.62), UP / 4 + 0.95, -1], [gz(9.33), UP * 0.75 + 0.95, 1], [gz(7.74), UP * 0.75 + 0.95, 1]]) { const g = new THREE.BoxGeometry(3.45, 0.045, 0.045); g.rotateZ(sg * a); g.translate(mx, y, z); bt.add(M.metal, g); }
    bt.bb(M.white, gx(6.32), UP / 2 + 1.25, gz(8.3), gx(6.3), UP / 2 + 2.55, gz(10.5)); bt.bb(M.navy, gx(6.31), UP / 2 + 1.31, gz(8.36), gx(6.285), UP / 2 + 2.49, gz(10.44));   // quadro azul do patamar
    lampX(gx(4.0), gz(9.4), UP); }

  // poço de ventilação e iluminação: canteiro e plantas
  bbB(M.bed, 6.5, 0, 5.95, 19.95, 0.1, 7.5);
  for (let u = 7.4; u < 19.6; u += 1.7) { const p = at(gx(u), 0.1, gz(6.7 + (r() - 0.5) * 0.5)); for (let i = 0; i < 6; i++) { const g = new THREE.ConeGeometry(0.07, 0.8 + r() * 0.5, 4); g.translate(0, 0.45, 0); g.rotateZ((r() - 0.5) * 0.8); g.rotateX((r() - 0.5) * 0.8); p.geo(M.plant, g); } }

  // ═════════════ Bloco: portas e plaquinhas conforme a planta ═════════════
  const P = (n) => `Prof. ${String(n).padStart(2, '0')}`;
  const rowS = (lvl, list) => list.forEach(([u, s, n]) => doorAt(gx(u), gz(4.0) + 0.075, 0, s, n, lvl * UP));          // portas na parede do eixo B
  const rowN = (lvl, list) => list.forEach(([u, s, n]) => doorAt(gx(u), gz(13.0) - 0.075, Math.PI, s, n, lvl * UP));   // portas na parede do eixo G
  const rowM = (lvl, list) => list.forEach(([u, s, n]) => doorAt(gx(u), gz(11.2) + 0.075, 0, s, n, lvl * UP));         // portas na parede do eixo F
  const SP = 'Sala de Professor';
  rowS(0, [[11.3, 'BWC', 'Acessível'], [13.1, 'WC', 'Feminino'], [14.2, P(11), SP], [17.4, P(12), SP], [20.6, P(13), SP]]);
  rowN(0, [[3.85, P(2), SP], [7.05, P(3), SP], [11.3, 'WC', 'Acessível'], [13.0, 'WC', 'Masculino'], [14.25, P(4), SP], [17.45, P(5), SP], [20.65, P(6), SP]]);
  rowM(0, [[7.05, P(7), SP], [11.05, P(8), SP], [14.2, P(9), SP], [17.4, P(10), SP]]);
  rowS(1, [[0.65, P(24), SP], [3.85, P(25), SP], [7.05, P(26), SP], [11.3, 'BWC', 'Acessível'], [13.1, 'WC', 'Feminino'], [14.2, P(27), SP], [17.4, P(28), SP], [20.6, P(29), SP]]);
  rowN(1, [[0.65, P(14), SP], [3.85, P(15), SP], [7.05, P(16), SP], [11.3, 'WC', 'Acessível'], [13.0, 'WC', 'Masculino'], [14.25, P(17), SP], [17.45, P(18), SP], [20.65, P(19), SP]]);
  rowM(1, [[7.05, P(20), SP], [11.05, P(21), SP], [14.2, P(22), SP], [17.4, P(23), SP]]);
  decal(T.plate('Térreo', 'Sala de Reuniões'), 0.56, 0.18, gx(1.6), 1.75, gz(4.0) + 0.08, 0);
  decal(T.plate('Térreo', 'COPA'), 0.5, 0.17, gx(7.95), 1.75, gz(4.0) + 0.08, 0);
  decal(T.plate(P(1), SP), 0.52, 0.17, gx(1.6), 1.75, gz(13.0) - 0.08, Math.PI);

  // circulações: luminárias, extintores, hidrantes, quadros elétricos e marcações vermelhas no piso
  for (const lvl of [0, 1]) {
    const y = lvl * UP;
    for (let u = 2.4; u < 23; u += 4.1) { lampX(gx(u), gz(4.95), y); lampX(gx(u), gz(12.1), y); if (!lvl) { pool(gx(u) - 1.9, gz(4.15), gx(u) + 1.9, gz(5.75)); pool(gx(u) - 1.9, gz(11.3), gx(u) + 1.9, gz(12.9)); } }
    lampZ(gx(20.9), gz(8.5), y); lampZ(gx(0.9), gz(8.5), y);
    extinguisher(gx(9.0), gz(4.0) + 0.075, 0, y); tape(gx(9.5), gz(4.1), gx(8.5), gz(5.0), y);
    hose(gx(4.6), gz(11.2) + 0.075, 0, y); tape(gx(5.1), gz(11.3), gx(4.1), gz(12.2), y);
    extinguisher(gx(16.0), gz(13.0) - 0.075, Math.PI, y); tape(gx(16.5), gz(12.0), gx(15.5), gz(12.9), y);
    panel(gx(5.2), gz(4.0) + 0.075, 0, y); panel(gx(5.8), gz(4.0) + 0.075, 0, y);
  }
  // impressora do corredor do 2º pavimento e a mesa branca perto do cobogó
  { const pr = at(gx(4.2), UP, gz(4.4)); pr.box(M.beige, 0.6, 0.04, 0.5, 0, 0.7, 0); for (const [lx, lz] of [[-0.25, -0.2], [0.25, -0.2], [-0.25, 0.2], [0.25, 0.2]]) pr.box(M.wood, 0.04, 0.7, 0.04, lx, 0.35, lz);
    pr.box(M.metal, 0.44, 0.3, 0.42, 0, 0.87, 0); pr.box(M.dark, 0.46, 0.14, 0.44, 0, 1.09, 0); colB(3.9, 4.15, 4.5, 4.66, { lv: 1 }); }
  bbB(M.white, 21.9, UP + 0.72, 4.18, 23.05, UP + 0.76, 4.75); for (const u of [21.95, 23.0]) bbB(M.metal, u - 0.02, UP, 4.2, u + 0.02, UP + 0.72, 4.24); colB(21.9, 4.18, 23.05, 4.75, { lv: 1 });
  stool(gx(0.6), gz(6.4), UP); stool(gx(0.6), gz(10.4), UP);

  // ═════════════ Salas abertas do térreo ═════════════
  // Sala de Reuniões (6,25 x 3,85 m)
  { bbB(M.oak, 1.7, 0.72, 1.45, 5.1, 0.76, 2.55); for (const [u, v] of [[1.9, 1.6], [4.9, 1.6], [1.9, 2.4], [4.9, 2.4]]) bbB(M.dark, u - 0.04, 0, v - 0.04, u + 0.04, 0.72, v + 0.04); colB(1.7, 1.45, 5.1, 2.55);
    for (const u of [2.3, 3.4, 4.5]) { officeChair(gx(u), gz(0.95), 0); officeChair(gx(u), gz(3.05), Math.PI); }
    officeChair(gx(1.15), gz(2.0), -Math.PI / 2); officeChair(gx(5.65), gz(2.0), Math.PI / 2);
    bbB(M.dark, 6.26, 1.05, 1.3, 6.32, 1.85, 2.7); bbB(M.screen, 6.25, 1.09, 1.36, 6.262, 1.81, 2.64);
    bbB(M.door, 0.155, 0, 3.0, 0.2, 2.1, 3.92);
    lampX(gx(3.4), gz(2.0)); pool(gx(5.6), gz(0.4), gx(1.0), gz(3.7));
    hot({ x: gx(3.4), z: gz(3.15), r: 1.2, label: 'Ler a pauta da reunião', kind: 'pauta' }); }
  // Copa (3,05 x 3,85 m)
  { bbB(M.white, 6.5, 0, 0.15, 8.7, 0.86, 0.72); bbB(M.granite, 6.5, 0.86, 0.15, 8.72, 0.91, 0.78); colB(6.5, 0.15, 8.72, 0.78);
    bbB(M.white, 8.8, 0, 0.18, 9.5, 1.78, 0.88); bbB(M.metal, 8.84, 0.95, 0.88, 8.87, 1.55, 0.905); bbB(M.base, 8.8, 1.22, 0.88, 9.5, 1.235, 0.89); colB(8.8, 0.18, 9.5, 0.88);
    bbB(M.white, 6.65, 0.91, 0.22, 7.2, 1.2, 0.62); bbB(M.screen, 6.7, 0.95, 0.62, 7.04, 1.16, 0.63);          // micro-ondas
    bbB(M.dark, 7.45, 0.91, 0.22, 7.8, 1.32, 0.62); bbB(M.metal, 7.55, 0.91, 0.62, 7.7, 0.96, 0.72);            // cafeteira
    bbB(M.metal, 8.0, 0.905, 0.25, 8.6, 0.92, 0.65);                                                           // pia
    const w = at(gx(9.25), 0, gz(3.6)); w.box(M.white, 0.34, 1.0, 0.34, 0, 0.5, 0); w.cyl(M.water, 0.14, 0.14, 0.4, 0, 1.2, 0, 10); colB(9.08, 3.43, 9.42, 3.77);
    const tb = at(gx(8.55), 0, gz(2.35)); tb.cyl(M.oak, 0.55, 0.55, 0.04, 0, 0.74, 0, 20); tb.cyl(M.white, 0.05, 0.05, 0.72, 0, 0.36, 0, 8); tb.cyl(M.white, 0.28, 0.3, 0.03, 0, 0.015, 0, 12); colB(8.15, 1.95, 8.95, 2.75);
    for (let i = 0; i < 3; i++) { const an = 0.4 + i * 2.1; plasticChair(gx(8.55) + Math.sin(an) * 0.85, gz(2.35) + Math.cos(an) * 0.85, an + Math.PI); }
    bbB(M.door, 6.48, 0, 3.0, 6.53, 2.1, 3.92);
    lampX(gx(8.0), gz(2.0)); pool(gx(9.3), gz(0.8), gx(6.6), gz(3.8));
    hot({ x: gx(7.6), z: gz(1.2), r: 1.0, label: 'Tomar um café', kind: 'cafe' }); }
  // Sala de Professor 01 (aberta para visita)
  { bbB(M.orange, 0.08, 0.1, 13.1, 0.1, 3.0, 16.9);
    bbB(M.oak, 1.2, 0.72, 15.3, 2.8, 0.76, 16.0); bbB(M.dark, 1.2, 0, 15.3, 1.26, 0.72, 16.0); bbB(M.dark, 2.74, 0, 15.3, 2.8, 0.72, 16.0); bbB(M.dark, 1.26, 0.25, 15.32, 2.74, 0.72, 15.36); colB(1.2, 15.3, 2.8, 16.0);
    bbB(M.dark, 1.85, 0.76, 15.5, 2.15, 0.78, 15.7); bbB(M.dark, 1.98, 0.78, 15.58, 2.02, 0.92, 15.62); bbB(M.dark, 1.65, 0.9, 15.56, 2.35, 1.3, 15.6); bbB(M.screen, 1.67, 0.92, 15.6, 2.33, 1.28, 15.605);
    officeChair(gx(2.0), gz(16.45), Math.PI);
    for (const [u, v, ry] of [[0.75, 14.3, -0.9], [0.8, 15.4, -1.3]]) { const c = at(gx(u), 0, gz(v), ry); c.box(M.tan, 0.56, 0.12, 0.52, 0, 0.42, 0); c.box(M.tan, 0.56, 0.36, 0.1, 0, 0.68, -0.24); c.box(M.dark, 0.05, 0.62, 0.52, -0.3, 0.31, 0); c.box(M.dark, 0.05, 0.62, 0.52, 0.3, 0.31, 0); }
    bbB(M.dark, 2.78, 0, 13.2, 3.1, 1.95, 14.7); colB(2.78, 13.2, 3.1, 14.7);
    const bk = ['#b23a48', '#2f5d9c', '#d9a23a', '#3c7a55', '#e7e2d2', '#6b4a8a'].map((c) => L(c));
    for (let row = 0; row < 4; row++) { bbB(M.beige, 2.76, 0.12 + row * 0.47, 13.24, 2.78, 0.15 + row * 0.47, 14.66); for (let k = 0; k < 12; k++) if (r() < 0.82) bbB(bk[(r() * bk.length) | 0], 2.75, 0.15 + row * 0.47, 13.3 + k * 0.112, 2.78, 0.42 + row * 0.47 - r() * 0.08, 13.38 + k * 0.112); }
    bbB(M.door, 0.155, 0, 13.08, 0.2, 2.1, 14.0);
    lampX(gx(1.6), gz(15)); pool(gx(3.0), gz(13.3), gx(0.3), gz(16.7));
    hot({ x: gx(2.0), z: gz(14.75), r: 1.0, label: 'Ler o recado na mesa', kind: 'recado' }); }

  // ═════════════ Vegetação e arredores ═════════════
  const shade = (x, z, s) => bt.quad(M.shade, x - s, z - s, x + s, z + s, 0.04, 0);
  function tree(x, z, s = 1) {
    const p = at(x, 0, z, r() * 6);
    p.cyl(M.trunk, 0.13 * s, 0.2 * s, 2.6 * s, 0, 1.3 * s, 0, 7);
    for (let i = 0; i < 5; i++) { const g = new THREE.IcosahedronGeometry((1.25 + r() * 0.7) * s, 1); g.scale(1, 0.72, 1); g.translate((r() - 0.5) * 2.1 * s, (3.0 + r() * 1.2) * s, (r() - 0.5) * 2.1 * s); p.geo(M.leaf[i % 3], g); }
    col(x - 0.2 * s, z - 0.2 * s, x + 0.2 * s, z + 0.2 * s); shade(x, z, 3.2 * s);
  }
  function palm(x, z) {
    const p = at(x, 0, z);
    p.cyl(M.trunk, 0.12, 0.17, 3.4, 0, 1.7, 0, 7);
    for (let i = 0; i < 11; i++) { const g = new THREE.BoxGeometry(0.5, 0.02, 1.7); g.translate(0, 0, 0.85); g.rotateX(-0.75 + r() * 0.9); g.rotateY((i * Math.PI * 2) / 11 + r() * 0.2); g.translate(0, 3.4, 0); p.geo(M.leaf[2], g); }
    col(x - 0.17, z - 0.17, x + 0.17, z + 0.17); shade(x, z, 1.8);
  }
  function clump(x, z, mat, n = 6, h = 0.7) {
    const p = at(x, 0, z);
    for (let i = 0; i < n; i++) { const g = new THREE.ConeGeometry(0.06, h * (0.7 + r() * 0.6), 4); g.translate(0, h * 0.4, 0); g.rotateZ((r() - 0.5) * 0.5); g.rotateX((r() - 0.5) * 0.5); g.translate((r() - 0.5) * 0.45, 0, (r() - 0.5) * 0.45); p.geo(mat, g); }
  }
  for (const [x, z, s] of [[24, -18, 1.1], [40.5, -20, 1.2], [22, -31, 1], [44, -31, 1.1], [16, -14.5, 0.9], [50, -15, 1], [7, -21, 1.2], [54, -29, 1],
    [-8, -17, 1.1], [-19, -23, 1.3], [-24, -14, 0.9], [52, -4, 1], [54, 7, 1.2], [-14, 25, 1.3], [8, 27, 1.2], [24, 25, 1.1], [40, 27, 1.3], [52, 22, 1],
    [-41, -20, 1.5], [-44, 12, 1.3], [-37, 26, 1.1]]) tree(x, z, s);
  palm(39.3, -14.4); palm(23.5, -13.6); palm(-1.5, -13);
  for (let z = -33; z < -13; z += 1.3) { clump(30.5, z, M.plant, 5, 0.45); if (r() < 0.5) clump(34, z + 0.5, r() < 0.5 ? M.purple : M.plant, 5, 0.4); }
  for (let z = 3.2; z < 8.2; z += 0.75) { clump(-2.6, z, M.plant, 7, 0.85); if (r() < 0.6) clump(-2.3, z + 0.3, M.purple, 5, 0.35); }   // canteiro ao lado da saída
  for (let x = -25.5; x < -3.5; x += 2.2) clump(x, -9.3, r() < 0.5 ? M.plant : M.purple, 6, 0.5);
  for (let z = -7.5; z < 8; z += 1.8) clump(-27.2, z, M.plant, 6, 0.6);
  for (const [x, z] of [[25, -27.5], [38, -27.5], [18, -20], [44, -18.5], [36, -32]]) { bt.bb(M.concrete, x - 0.7, 0, z - 0.7, x + 0.7, 0.12, z + 0.7); clump(x, z, M.purple, 8, 0.5); clump(x + 0.2, z - 0.2, M.plant, 6, 0.6); col(x - 0.7, z - 0.7, x + 0.7, z + 0.7); }

  // Carros estacionados
  for (const [x, z, ry, c] of [[14, 16.5, Math.PI / 2, '#7a2c2c'], [19.6, 16.5, Math.PI / 2, '#dfe1e4'], [31, 16.5, Math.PI / 2, '#474c52'], [-10, 16.5, Math.PI / 2, '#5b6168'], [-15.6, 16.5, Math.PI / 2, '#8a8d91'], [-39, -10, 0, '#c2c5c9'], [-42.4, -10, 0, '#3d4a5c']]) {
    const car = makeCar(c, { shadow: T.shadow }); car.group.position.set(x, 0.02, z); car.group.rotation.y = ry; root.add(car.group);
    ry ? col(x - 2.15, z - 0.95, x + 2.15, z + 0.95) : col(x - 0.95, z - 2.15, x + 0.95, z + 2.15);
  }
  { const p = at(4, 0, 22); p.cyl(M.metal, 0.07, 0.11, 9, 0, 4.5, 0, 8); p.box(M.metal, 1.6, 0.06, 0.06, 0, 9, 0); p.box(M.white, 0.5, 0.1, 0.24, -0.8, 8.95, 0); p.box(M.white, 0.5, 0.1, 0.24, 0.8, 8.95, 0); col(3.88, 21.88, 4.12, 22.12); }

  // Cerca viva nos limites do mapa
  const Lm = LIMITS;
  for (const [x0, z0, x1, z1] of [[Lm.x0 - 1, Lm.z0 - 1, Lm.x1 + 1, Lm.z0], [Lm.x0 - 1, Lm.z1, Lm.x1 + 1, Lm.z1 + 1], [Lm.x0 - 1, Lm.z0, Lm.x0, Lm.z1], [Lm.x1, Lm.z0, Lm.x1 + 1, Lm.z1]]) {
    bt.bb(M.hedge, x0, 0, z0, x1, 1.25, z1); col(x0, z0, x1, z1); segs.push(x1 - x0 > z1 - z0 ? [x0, (z0 + z1) / 2, x1, (z0 + z1) / 2] : [(x0 + x1) / 2, z0, (x0 + x1) / 2, z1]);
  }
  // Prédios vizinhos e as serras ao fundo
  bt.bb(M.wallOut, -24, 0, 48, 18, 4.6, 62); bt.bb(M.roofBlue, -25, 4.6, 47, 19, 6.4, 63);
  bt.bb(M.wall, 6, 0, -58, 58, 3.6, -47); bt.bb(M.roof, 5, 3.6, -59, 59, 3.9, -46);
  bt.bb(M.wall, 70, 0, -22, 84, 3.6, 14); bt.bb(M.roof, 69, 3.6, -23, 85, 3.9, 15);
  bt.bb(M.wall, -78, 0, -20, -62, 7, 16); bt.bb(M.roof, -79, 7, -21, -61, 7.3, 17);
  for (const [x, z, R, H] of [[-200, -70, 80, 30], [-250, 50, 110, 40], [-160, -190, 90, 34], [-40, -260, 100, 28], [130, -250, 110, 34], [260, -90, 100, 36], [250, 130, 110, 30], [40, 270, 120, 32], [-170, 220, 110, 36]]) {
    const g = new THREE.SphereGeometry(1, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(R, H, R); g.translate(x, -1, z); bt.add(M.hill, g);
  }

  bt.build(root);

  const sky = new THREE.Mesh(new THREE.SphereGeometry(520, 32, 16), new THREE.MeshBasicMaterial({ map: T.sky, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -1; scene.add(sky);

  function zone(x, z, y = 0) {
    const u = -2.95 - x, v = z + 8.65;
    if (u > 0 && u < 23.2 && v > 0 && v < 17) {
      if (u > 1.73 && u < 6.4 && v > 7.6 && v < 11.2) return 'Escada';
      if (y > 1.9) return '2º Pavimento';
      if (u < 1.73 && v > 5.8 && v < 11.2) return 'Foyer';
      if (v < 4) return u < 6.4 ? 'Sala de Reuniões' : u < 9.6 ? 'Copa' : 'Bloco dos Professores';
      if (v > 13 && u < 3.2) return 'Sala de Professor 01';
      return 'Bloco dos Professores';
    }
    if (x > -2.95 && x <= 0 && z > -2.85 && z < 2.55) return 'Foyer';
    if (x > -2.95 && x < 0 && z >= 2.55 && z < 10.6) return 'Saída para o LAUT';
    if (x > B.x0 && x < B.x1 && z > B.zN && z < B.zS) {
      if (x > 9.4 && x < 21.4 && z > B.cS) return 'LABGRAD · Sala 15';
      if (x > 26 && x < 38 && z < B.cN) return 'Hall de Entrada';
      return 'Galeria';
    }
    if (x > 26 && x < 38 && z <= B.zN && z > -12.5) return 'Varanda';
    if (x < -30 || z > 8.3) return 'Estacionamento';
    return 'Jardim';
  }
  const indoor = (x, z) => (x > -0.2 && x < 44.2 && z > -8.7 && z < 8.7) || (x > 25.8 && x < 38.2 && z <= B.zN && z > -13) || (x > gx(23.4) && x < 0.2 && z > gz(-0.2) && z < gz(17.2) && !(x > -2.95 && (z < -2.95 || z > 2.65)));

  let doorOpen = 0;
  return {
    colliders, segs, segs1, inter, mapRects, upRects, zone, indoor, sky, floorY,
    update(dt, x, z) {
      const near = Math.hypot(x + 1.02, z - 2.55) < 2.5 ? 1 : 0;
      doorOpen += (near - doorOpen) * Math.min(1, dt * 5);
      exitL.rotation.y = -doorOpen * 1.6; exitR.rotation.y = doorOpen * 1.6;
    },
  };
}
