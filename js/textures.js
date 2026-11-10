// Texturas procedurais desenhadas em canvas. Nada de arquivos externos, tudo nasce aqui.
import * as THREE from '../vendor/three.min.js';

export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function tex(w, h, draw, o = {}) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  if (o.repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = o.aniso ?? 4;
  return t;
}

function speckle(g, w, h, r, n, colors, min = 1, max = 3) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[(r() * colors.length) | 0];
    const s = min + r() * (max - min);
    g.fillRect(r() * w, r() * h, s, s);
  }
}

function wrapText(g, text, x, y, maxW, lh) {
  const words = text.split(' ');
  let line = '';
  for (const w of words) {
    const t = line ? line + ' ' + w : w;
    if (g.measureText(t).width > maxW && line) { g.fillText(line, x, y); y += lh; line = w; }
    else line = t;
  }
  if (line) { g.fillText(line, x, y); y += lh; }
  return y;
}

const FONT = '"Helvetica Neue", Arial, sans-serif';

export function makeTextures() {
  const T = {};

  // Granilite do corredor: placas grandes, bege, salpicadas.
  T.terrazzo = tex(512, 512, (g, w, h) => {
    const r = rng(7);
    g.fillStyle = '#cbc4b5'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, r, 9000, ['#8d867a', '#efeadf', '#a79e8f', '#74706a', '#b9a78f', '#dcd5c6'], 1, 3.2);
    g.strokeStyle = 'rgba(70,66,60,.55)'; g.lineWidth = 2;
    g.strokeRect(0, 0, w, h);
  }, { repeat: true, aniso: 8 });

  // Piso cerâmico branco do hall dos fundos.
  T.tile = tex(256, 256, (g, w, h) => {
    g.fillStyle = '#b4b6b2'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#f0f0ec';
    for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) g.fillRect(i * 128 + 2, j * 128 + 2, 124, 124);
  }, { repeat: true, aniso: 8 });

  // Paralelepípedo do estacionamento.
  T.cobble = tex(512, 512, (g, w, h) => {
    const r = rng(21);
    g.fillStyle = '#55524c'; g.fillRect(0, 0, w, h);
    const rows = 14, rh = h / rows;
    for (let j = 0; j < rows; j++) {
      let x = -r() * 30;
      while (x < w) {
        const sw = 26 + r() * 22;
        const v = 128 + ((r() * 46) | 0);
        g.fillStyle = `rgb(${v},${v - 2},${v - 8})`;
        const rr = 5;
        const y = j * rh + 2, hh = rh - 4;
        g.beginPath(); g.roundRect(x + 2, y, sw - 4, hh, rr); g.fill();
        if (x + sw > w) { g.beginPath(); g.roundRect(x + 2 - w, y, sw - 4, hh, rr); g.fill(); }
        x += sw;
      }
    }
    speckle(g, w, h, r, 2500, ['rgba(0,0,0,.12)', 'rgba(255,255,255,.10)'], 1, 3);
  }, { repeat: true, aniso: 8 });

  // Terra avermelhada do jardim.
  T.earth = tex(512, 512, (g, w, h) => {
    const r = rng(33);
    g.fillStyle = '#bd7243'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 60; i++) {
      const x = r() * w, y = r() * h, s = 40 + r() * 90;
      const gr = g.createRadialGradient(x, y, 0, x, y, s);
      const c = r() < 0.5 ? '170,96,52' : '205,134,84';
      gr.addColorStop(0, `rgba(${c},.35)`); gr.addColorStop(1, `rgba(${c},0)`);
      g.fillStyle = gr; g.fillRect(x - s, y - s, s * 2, s * 2);
    }
    speckle(g, w, h, r, 5000, ['#a8603a', '#d08a58', '#96563a', '#c98a60'], 1, 2.5);
  }, { repeat: true });

  // Concreto das calçadas e da varanda.
  T.concrete = tex(512, 512, (g, w, h) => {
    const r = rng(45);
    g.fillStyle = '#b5b3aa'; g.fillRect(0, 0, w, h);
    speckle(g, w, h, r, 7000, ['#a3a199', '#c4c2b9', '#98968e', '#cbc9c1'], 1, 3);
    g.strokeStyle = 'rgba(60,58,52,.5)'; g.lineWidth = 3;
    g.strokeRect(0, 0, w / 2, h / 2); g.strokeRect(w / 2, 0, w / 2, h / 2);
    g.strokeRect(0, h / 2, w / 2, h / 2); g.strokeRect(w / 2, h / 2, w / 2, h / 2);
  }, { repeat: true, aniso: 8 });

  // Telha ondulada de fibrocimento.
  T.roof = tex(64, 64, (g, w, h) => {
    for (let x = 0; x < w; x++) {
      const v = 126 + Math.round(Math.sin((x / w) * Math.PI * 8) * 22);
      g.fillStyle = `rgb(${v + 8},${v + 2},${v - 6})`;
      g.fillRect(x, 0, 1, h);
    }
  }, { repeat: true });

  // Céu com nuvens, mapeado em uma esfera.
  T.sky = tex(2048, 1024, (g, w, h) => {
    const r = rng(99);
    const gr = g.createLinearGradient(0, 0, 0, h / 2);
    gr.addColorStop(0, '#2f6fc4'); gr.addColorStop(0.6, '#79aee0'); gr.addColorStop(1, '#d6e6f1');
    g.fillStyle = gr; g.fillRect(0, 0, w, h / 2);
    g.fillStyle = '#d6e6f1'; g.fillRect(0, h / 2, w, h / 2);
    for (let c = 0; c < 46; c++) {
      const cx = r() * w, cy = 170 + r() * 290, sc = 0.5 + (cy - 150) / 420;
      const n = 8 + ((r() * 10) | 0);
      for (let i = 0; i < n; i++) {
        const x = cx + (r() - 0.5) * 240 * sc, y = cy + (r() - 0.5) * 40 * sc, s = (26 + r() * 54) * sc;
        for (const dx of [-w, 0, w]) {
          const cg = g.createRadialGradient(x + dx, y, 0, x + dx, y, s);
          cg.addColorStop(0, 'rgba(255,255,255,.85)'); cg.addColorStop(0.6, 'rgba(250,250,252,.35)'); cg.addColorStop(1, 'rgba(255,255,255,0)');
          g.fillStyle = cg; g.fillRect(x + dx - s, y - s, s * 2, s * 2);
        }
      }
    }
  });

  T.glow = tex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.4, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });

  T.shadow = tex(128, 128, (g, w, h) => {
    const gr = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    gr.addColorStop(0, 'rgba(0,0,0,.55)'); gr.addColorStop(0.6, 'rgba(0,0,0,.28)'); gr.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
  });

  // Quadros da galeria do corredor: composições de turma, fotos de prédio e pôsteres.
  T.posters = [];
  const bgs = ['#16324f', '#0f4a4a', '#1d2b3a', '#f3f1ea', '#22543d', '#3a2f55', '#143d59', '#e9e4d6', '#27363f', '#0d3b66'];
  for (let i = 0; i < 10; i++) {
    T.posters.push(tex(256, 192, (g, w, h) => {
      const r = rng(200 + i * 13);
      const light = bgs[i] === '#f3f1ea' || bgs[i] === '#e9e4d6';
      g.fillStyle = bgs[i]; g.fillRect(0, 0, w, h);
      g.fillStyle = light ? '#1d2b3a' : 'rgba(255,255,255,.9)';
      g.fillRect(14, 12, 90 + r() * 110, 9);
      g.globalAlpha = 0.55; g.fillRect(14, 26, 60 + r() * 80, 4); g.globalAlpha = 1;
      const kind = i % 3;
      if (kind === 0) { // composição de turma
        const cols = 8, rows = 4, cw = (w - 28) / cols, ch = (h - 62) / rows;
        const skins = ['#d9a273', '#b9794a', '#8f5a36', '#e8b88a', '#7a4a2b'];
        for (let a = 0; a < cols; a++) for (let b = 0; b < rows; b++) {
          const x = 14 + a * cw, y = 44 + b * ch;
          g.fillStyle = light ? '#d8d2c2' : 'rgba(255,255,255,.14)'; g.fillRect(x + 2, y + 2, cw - 4, ch - 4);
          g.fillStyle = skins[(r() * skins.length) | 0];
          g.beginPath(); g.arc(x + cw / 2, y + ch * 0.42, cw * 0.2, 0, 7); g.fill();
          g.fillStyle = ['#1f3f73', '#222', '#7a1f1f', '#2f4a7a'][(r() * 4) | 0];
          g.fillRect(x + cw * 0.22, y + ch * 0.62, cw * 0.56, ch * 0.3);
        }
      } else if (kind === 1) { // foto de prédio
        g.fillStyle = '#8fc0e8'; g.fillRect(14, 44, w - 28, h - 62);
        g.fillStyle = '#c97f4c'; g.fillRect(14, h - 58, w - 28, 40);
        g.fillStyle = '#f4f1e6'; g.fillRect(40, 84, w - 80, 56);
        g.fillStyle = '#8d8478'; g.beginPath(); g.moveTo(30, 86); g.lineTo(w / 2, 62); g.lineTo(w - 30, 86); g.fill();
        g.fillStyle = '#2c3a4a'; for (let k = 0; k < 6; k++) g.fillRect(52 + k * 26, 98, 16, 18);
        g.fillStyle = '#2f7a3a'; g.beginPath(); g.arc(34, 120, 20, 0, 7); g.fill(); g.beginPath(); g.arc(w - 30, 112, 24, 0, 7); g.fill();
      } else { // pôster técnico
        g.strokeStyle = light ? '#1d2b3a' : 'rgba(255,255,255,.85)'; g.lineWidth = 2;
        g.beginPath();
        for (let x = 0; x <= 110; x += 2) { const y = 110 - 46 * (1 - Math.exp(-x / 22)) * (1 + 0.35 * Math.cos(x / 6) * Math.exp(-x / 40)); x ? g.lineTo(18 + x, y) : g.moveTo(18 + x, y); }
        g.stroke();
        g.strokeRect(16, 48, 116, 72);
        g.fillStyle = light ? '#1d2b3a' : 'rgba(255,255,255,.7)';
        for (let k = 0; k < 9; k++) g.fillRect(146, 50 + k * 13, 40 + r() * 56, 4);
        g.fillStyle = '#f4b63a'; g.fillRect(16, 134, 80, 40); g.fillStyle = '#3f86c9'; g.fillRect(104, 134, 138, 40);
      }
    }));
  }

  // Plaquinha de porta, igual à das salas: bloco azul UFRN DCA e nome da sala.
  T.plate = (sala, nome) => tex(384, 128, (g, w, h) => {
    g.fillStyle = '#f7f6f1'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#4a90d2'; g.fillRect(0, 0, 122, h);
    g.fillStyle = '#fff'; g.font = `800 34px ${FONT}`; g.textBaseline = 'top';
    g.fillText('UFRN', 12, 8); g.fillText('DCA', 12, 44);
    g.font = `700 22px ${FONT}`; g.fillText(sala, 12, 92);
    g.fillStyle = '#2a2f33'; g.font = `600 25px ${FONT}`;
    wrapText(g, nome, 136, 30, w - 148, 30);
  });

  // Aviso da porta dos fundos, com o texto que aparece no vídeo.
  T.exitPaper = tex(320, 420, (g, w, h) => {
    g.fillStyle = '#fafaf7'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#4a90d2'; g.fillRect(16, 14, 86, 44);
    g.fillStyle = '#fff'; g.font = `800 26px ${FONT}`; g.textBaseline = 'top'; g.fillText('UFRN', 22, 22);
    g.fillStyle = '#1c2226'; g.font = `700 15px ${FONT}`; g.textAlign = 'center';
    wrapText(g, 'DEPARTAMENTO DE ENGENHARIA DE COMPUTAÇÃO E AUTOMAÇÃO', w / 2, 76, w - 40, 19);
    g.fillRect(16, 122, w - 32, 2);
    g.font = `800 46px ${FONT}`; g.fillText('Saída', w / 2, 138);
    g.fillRect(16, 200, w - 32, 2);
    g.font = `600 17px ${FONT}`;
    let y = wrapText(g, 'Acesso ao Laboratório de Automação em Petróleo · LAUT', w / 2, 220, w - 44, 22);
    wrapText(g, 'Acesso ao Laboratório de Avaliação de Medição em Petróleo · LAMP', w / 2, y + 22, w - 44, 22);
  });

  T.labSchedule = tex(256, 180, (g, w, h) => {
    g.fillStyle = '#fbfbf8'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#222'; g.font = `700 16px ${FONT}`; g.textAlign = 'center'; g.fillText('LABGRAD', w / 2, 22);
    g.strokeStyle = '#333'; g.lineWidth = 1;
    for (let i = 0; i <= 6; i++) { g.beginPath(); g.moveTo(14 + i * 38, 34); g.lineTo(14 + i * 38, 166); g.stroke(); }
    for (let j = 0; j <= 6; j++) { g.beginPath(); g.moveTo(14, 34 + j * 22); g.lineTo(242, 34 + j * 22); g.stroke(); }
    const r = rng(5); g.fillStyle = '#555';
    for (let i = 1; i < 6; i++) for (let j = 1; j < 6; j++) if (r() < 0.6) { g.fillRect(18 + i * 38, 40 + j * 22, 28, 3); g.fillRect(18 + i * 38, 47 + j * 22, 20, 3); }
  });

  // Letreiro da fachada.
  T.facade = tex(1024, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#1e2a3a'; g.font = `800 36px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillText('LABORATÓRIO DE ENGENHARIA DE COMPUTAÇÃO', w / 2, 38);
    g.fillText('E AUTOMAÇÃO', w / 2, 94);
  }, { aniso: 8 });

  T.banner = tex(512, 256, (g, w, h) => {
    g.fillStyle = '#17389a'; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.07)';
    for (let i = 0; i < 40; i++) for (let j = 0; j < 20; j++) if ((i + j) % 2) g.fillRect(i * 13, j * 13, 6, 6);
    g.fillStyle = '#ffd21f'; g.font = `italic 900 96px ${FONT}`; g.textBaseline = 'top'; g.fillText('enade', 28, 22);
    g.fillStyle = '#fff'; g.font = `600 22px ${FONT}`; g.fillText('Engenharia de Computação', 32, 138);
    g.fillStyle = '#ffd21f'; g.fillRect(32, 176, 200, 48);
    g.fillStyle = '#17389a'; g.font = `800 24px ${FONT}`; g.fillText('Participe!', 54, 188);
  });

  T.bulletin = (evento) => tex(512, 320, (g, w, h) => {
    const r = rng(77);
    g.fillStyle = '#1d2126'; g.fillRect(0, 0, w, h);
    const cols = ['#fbfbf6', '#fff3b0', '#d7ecff', '#fbfbf6', '#ffd9d2'];
    for (let i = 0; i < 9; i++) {
      const x = 16 + (i % 3) * 166 + r() * 14, y = 14 + ((i / 3) | 0) * 100 + r() * 10;
      if (i === 4) continue;
      g.fillStyle = cols[(r() * cols.length) | 0]; g.fillRect(x, y, 120 + r() * 24, 80);
      g.fillStyle = 'rgba(0,0,0,.55)';
      for (let k = 0; k < 5; k++) g.fillRect(x + 10, y + 12 + k * 13, 50 + r() * 60, 4);
    }
    g.fillStyle = '#fbfbf6'; g.fillRect(170, 104, 176, 112);
    g.fillStyle = '#d3261f'; g.fillRect(170, 104, 176, 30);
    g.fillStyle = '#fff'; g.font = `800 20px ${FONT}`; g.textAlign = 'center'; g.fillText('III SAS', 258, 126);
    g.fillStyle = '#1c2226'; g.font = `600 13px ${FONT}`;
    wrapText(g, evento.replaceAll(' · ', '  '), 258, 156, 160, 17);
  });

  T.whiteboard = tex(512, 256, (g, w, h) => {
    const r = rng(11);
    g.fillStyle = '#f7f8f6'; g.fillRect(0, 0, w, h);
    g.lineWidth = 2;
    for (let k = 0; k < 7; k++) {
      g.strokeStyle = ['#1f3f9c', '#b02a2a', '#1b6b3a'][k % 3]; g.globalAlpha = 0.7;
      g.beginPath(); let x = 30 + r() * 60, y = 34 + k * 30; g.moveTo(x, y);
      for (let s = 0; s < 22; s++) { x += 6 + r() * 12; g.lineTo(x, y + (r() - 0.5) * 12); }
      g.stroke();
    }
    g.globalAlpha = 1; g.strokeStyle = '#1f3f9c'; g.strokeRect(330, 60, 150, 90);
    g.beginPath(); g.moveTo(330, 150); for (let x = 0; x <= 150; x += 3) g.lineTo(330 + x, 150 - 80 * (1 - Math.exp(-x / 30))); g.stroke();
  });

  T.slide = (titulo) => tex(512, 384, (g, w, h) => {
    g.fillStyle = '#f4f7fb'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#17389a'; g.fillRect(0, 0, w, 74);
    g.fillStyle = '#fff'; g.font = `800 34px ${FONT}`; g.textBaseline = 'middle'; g.fillText(titulo, 26, 38);
    g.fillStyle = '#1c2226'; g.font = `600 22px ${FONT}`;
    g.fillText('Aula prática de hoje', 26, 118);
    g.fillStyle = '#56606b';
    for (let k = 0; k < 5; k++) { g.beginPath(); g.arc(36, 168 + k * 38, 5, 0, 7); g.fill(); g.fillRect(54, 163 + k * 38, 220 + ((k * 73) % 140), 9); }
    g.fillStyle = '#f4b63a'; g.fillRect(400, 300, 86, 58);
  });

  T.screenOn = tex(256, 160, (g, w, h) => {
    g.fillStyle = '#0b1220'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#58e08a'; g.font = '700 15px ui-monospace, Menlo, Consolas, monospace';
    ['dca@labgrad:~$ ./trinta_anos', '> carregando memórias...', '> 30 chips, 30 anos', '> pressione E_'].forEach((s, i) => g.fillText(s, 12, 30 + i * 26));
  });

  // Símbolo de acessibilidade pintado no chão.
  T.access = tex(256, 256, (g, w, h) => {
    g.fillStyle = '#2e5fb3'; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineWidth = 16; g.lineCap = 'round'; g.lineJoin = 'round';
    g.beginPath(); g.arc(112, 52, 17, 0, 7); g.fill();
    g.beginPath(); g.moveTo(112, 82); g.lineTo(118, 140); g.lineTo(170, 140); g.lineTo(194, 196); g.stroke();
    g.beginPath(); g.moveTo(116, 108); g.lineTo(160, 108); g.stroke();
    g.beginPath(); g.arc(112, 160, 50, Math.PI * 0.05, Math.PI * 1.35); g.stroke();
  });

  T.exitSign = tex(256, 112, (g, w, h) => {
    g.fillStyle = '#0f8a4b'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#eaffd6';
    g.beginPath(); g.moveTo(24, 56); g.lineTo(70, 22); g.lineTo(70, 44); g.lineTo(120, 44); g.lineTo(120, 68); g.lineTo(70, 68); g.lineTo(70, 90); g.fill();
    g.fillRect(150, 18, 74, 78); g.fillStyle = '#0f8a4b'; g.fillRect(160, 28, 54, 68);
    g.fillStyle = '#eaffd6'; g.beginPath(); g.arc(186, 42, 8, 0, 7); g.fill(); g.fillRect(180, 52, 12, 26);
  });

  T.fireSign = tex(64, 64, (g, w, h) => {
    g.fillStyle = '#d3261f'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#fff'; g.fillRect(26, 12, 12, 36); g.fillRect(20, 20, 24, 6); g.fillRect(22, 50, 20, 5);
  });

  T.hose = tex(128, 160, (g, w, h) => {
    g.fillStyle = '#c81e1e'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#e9eef2'; g.beginPath(); g.arc(64, 70, 30, 0, 7); g.fill();
    g.fillStyle = '#8a1212'; g.beginPath(); g.arc(64, 70, 18, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.font = `800 15px ${FONT}`; g.textAlign = 'center'; g.fillText('INCÊNDIO', 64, 138);
  });

  // Ícone flutuante dos pontos de foto.
  T.camIcon = tex(128, 128, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.fillStyle = '#3f86c9'; g.beginPath(); g.arc(64, 64, 58, 0, 7); g.fill();
    g.strokeStyle = '#fff'; g.lineWidth = 6; g.stroke();
    g.fillStyle = '#fff'; g.beginPath(); g.roundRect(30, 46, 68, 46, 8); g.fill(); g.fillRect(50, 36, 28, 14);
    g.fillStyle = '#3f86c9'; g.beginPath(); g.arc(64, 69, 15, 0, 7); g.fill();
    g.fillStyle = '#fff'; g.beginPath(); g.arc(64, 69, 7, 0, 7); g.fill();
  });

  T.plateCar = tex(128, 40, (g, w, h) => {
    g.fillStyle = '#f7f7f2'; g.fillRect(0, 0, w, h);
    g.fillStyle = '#1d3f9c'; g.fillRect(0, 0, w, 9);
    g.fillStyle = '#111'; g.font = `800 26px ${FONT}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('DCA 30', w / 2, 25);
  });

  return T;
}
