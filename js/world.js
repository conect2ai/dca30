// O prédio do DCA e seus arredores, modelados a partir dos vídeos.
// Eixos: x cresce para o leste (fundos em x = 0, entrada perto de x = 54), z cresce para o sul.
import * as THREE from '../vendor/three.min.js';
import { rng } from './textures.js';
import { makeCar } from './actors.js';

export const B = { x0: 0, x1: 64, zN: -8.5, zS: 8.5, cN: -1.3, cS: 1.3, H: 3.0 };
export const LIMITS = { x0: -48, x1: 80, z0: -38, z1: 30 };

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
  add(mat, g) { let a = this.map.get(mat); if (!a) { a = []; this.map.set(mat, a); } a.push(g); }
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
  const colliders = [], segs = [], inter = [], mapRects = [];
  const r = rng(1996);
  const L = (color, o) => new THREE.MeshLambertMaterial({ color, ...o });
  const ground = (map, n) => new THREE.MeshLambertMaterial({ map, polygonOffset: n > 0, polygonOffsetFactor: -n, polygonOffsetUnits: -n * 2 });
  T.roof.repeat.set(48, 1);
  const M = {
    wall: L('#fbf9f1'), wallOut: L('#f6f0dc'), base: L('#9aa0a2'), ceil: new THREE.MeshBasicMaterial({ color: '#dedcd3' }),
    frame: L('#7c868b'), door: L('#8f999e'), metal: L('#aab0b4'), dark: L('#24272b'),
    red: L('#c81e1e'), white: L('#f4f4f0'), table: L('#ecebe6'), blue: L('#2446c4'), wood: L('#5b2b20'),
    glassDark: L('#1f2d3c'), bars: L('#d9622b'), lamp: new THREE.MeshBasicMaterial({ color: '#ffffff' }),
    screen: new THREE.MeshBasicMaterial({ color: '#0c0d10' }),
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

  const col = (x0, z0, x1, z1, o = {}) => colliders.push({ x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), wall: !!o.wall });

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
    m.position.set(x, y, z);
    if (o.flat) { m.rotation.x = -Math.PI / 2; m.rotation.z = ry; } else m.rotation.y = ry;
    (o.parent || root).add(m);
    return m;
  }

  // Parede ao longo de um eixo ('x' ou 'z') na coordenada c, de a até b, com vãos de porta e janela.
  function wall(axis, c, a, b, o = {}) {
    const t = o.t ?? 0.15, h = o.h ?? B.H, mat = o.mat ?? M.wall;
    const ops = (o.openings || []).slice().sort((p, q) => p.a - q.a);
    const bb = (m, u0, y0, v0, u1, y1, v1) => axis === 'x' ? bt.bb(m, u0, y0, c + v0, u1, y1, c + v1) : bt.bb(m, c + v0, y0, u0, c + v1, y1, u1);
    const cc = (u0, u1) => axis === 'x' ? col(u0, c - t / 2, u1, c + t / 2, { wall: true }) : col(c - t / 2, u0, c + t / 2, u1, { wall: true });
    const sg = (u0, u1) => segs.push(axis === 'x' ? [u0, c, u1, c] : [c, u0, c, u1]);
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
      if (op.kind) {
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

  // ───────────── Chão ─────────────
  bt.quad(M.gEarth, -260, -260, 260, 260, 0, 6);
  bt.quad(M.gCobble, -62, -52, -2.5, 46, 0.005, 3);
  bt.quad(M.gCobble, -2.5, 11, 96, 46, 0.005, 3);
  bt.quad(M.gConc, -2.5, -10.5, 0, 11, 0.015, 2.4);
  bt.quad(M.gConc, 0, 8.5, 66.5, 11, 0.015, 2.4);
  bt.quad(M.gConc, 64, -10.5, 66.5, 8.5, 0.015, 2.4);
  bt.quad(M.gConc, 0, -10.5, 48, -8.5, 0.015, 2.4);
  bt.quad(M.gConc, 60, -10.5, 64, -8.5, 0.015, 2.4);
  bt.quad(M.gConc, 48, -12.5, 60, -8.5, 0.015, 2.4);          // varanda
  bt.quad(M.gConc, 53, -35, 55.4, -12.5, 0.015, 2.4);         // caminho do jardim
  bt.quad(M.gConc, 33, -25.2, 75, -22.8, 0.015, 2.4);
  bt.quad(M.gConc, -9, -1.3, -2.5, 1.3, 0.015, 2.4);          // rampa dos fundos
  bt.quad(M.gFloor, B.x0, B.zN, B.x1, B.zS, 0.03, 1.25);
  bt.quad(M.gTile, 0.075, B.cN + 0.075, 6, 4.925, 0.034, 0.9);
  bt.quad(M.ceil, B.x0, B.zN, B.x1, B.zS, 2.995, 0, false);
  mapRects.push({ x0: -62, z0: -52, x1: -2.5, z1: 46, c: '#5d5b56' }, { x0: -2.5, z0: 11, x1: 96, z1: 46, c: '#5d5b56' },
    { x0: 53, z0: -35, x1: 55.4, z1: -12.5, c: '#a9a79e' }, { x0: 33, z0: -25.2, x1: 75, z1: -22.8, c: '#a9a79e' },
    { x0: 48, z0: -12.5, x1: 60, z1: -8.5, c: '#a9a79e' }, { x0: 0, z0: -8.5, x1: 64, z1: 8.5, c: '#d9d3c2' });

  // ───────────── Paredes externas ─────────────
  wall('z', 0, B.zN, B.zS, { mat: M.wallOut, openings: [
    { a: -0.55, b: 0.55, y1: 2.1 }, { a: 0.85, b: 1.25, y0: 0.9, y1: 2.1, kind: 'dark' },
    win(-5, { out: -1 }), win(6.9, { a: 6.1, b: 7.7, out: -1 }),
  ] });
  wall('z', 64, B.zN, B.zS, { mat: M.wallOut, openings: [win(-5, { out: 1 }), win(5, { out: 1 })] });
  wall('x', B.zN, 0, 64, { mat: M.wallOut, openings: [
    ...[4, 10, 16, 22, 28, 34, 40, 45.4].map((c) => win(c, { out: -1 })),
    { a: 53, b: 55.4, y1: 2.3 }, { a: 50.95, b: 52.65, y0: 0, y1: 2.3, kind: 'tint' },
  ] });
  wall('x', B.zS, 0, 64, { mat: M.wallOut, openings: [
    ...[3, 9, 15, 35, 41, 47, 53, 59].map((c) => win(c, { out: 1 })),
    ...[22.2, 24.8, 27.4, 30].map((c) => ({ a: c - 1, b: c + 1, y0: 1.0, y1: 2.25, kind: 'clear', out: 1 })),
  ] });

  // ───────────── Paredes internas ─────────────
  wall('x', B.cN, 0, 64, { openings: [{ a: 50, b: 53, y1: 2.5 }] });
  wall('x', B.cS, 6, 64, { openings: [{ a: 20.6, b: 21.6, y1: 2.1 }] });
  wall('x', 5, 0, 6);
  wall('z', 6, B.cS, 5);
  wall('z', 20, B.cS, B.zS);
  wall('z', 32, B.cS, B.zS);
  wall('z', 48, B.zN, B.cN);
  wall('z', 60, B.zN, B.cN);
  // Varanda recuada da entrada
  wall('z', 48, -12.5, B.zN - 0.075, { mat: M.wallOut, base: false });
  wall('z', 60, -12.5, B.zN - 0.075, { mat: M.wallOut, base: false });

  // ───────────── Telhado ─────────────
  bt.bb(M.wallOut, -0.9, 3.0, -9.3, 64.9, 3.14, 9.3);
  for (const s of [1, -1]) {
    const g = new THREE.BoxGeometry(66.4, 0.08, 9.75);
    g.rotateX(s * 0.158); g.translate(32, 3.9, s * 4.7);
    bt.add(M.roof, g);
  }
  for (const x of [0, 64]) {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([x, 3.1, -9.3, x, 3.1, 9.3, x, 4.62, 0, x, 3.1, 9.3, x, 3.1, -9.3, x, 4.62, 0]), 3));
    const n = x === 0 ? -1 : 1;
    g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array([n, 0, 0, n, 0, 0, n, 0, 0, n, 0, 0, n, 0, 0, n, 0, 0]), 3));
    g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(12), 2));
    g.setIndex(x === 0 ? [0, 1, 2] : [3, 4, 5]);
    bt.add(M.wallOut, g);
  }
  bt.bb(M.wallOut, 47.9, 3.0, -13.0, 60.1, 3.16, -8.5);       // laje da varanda
  bt.bb(M.roof, -1.7, 2.55, -1.3, 0, 2.62, 1.3);              // marquise dos fundos
  bt.bb(M.frame, -1.65, 0, -1.25, -1.57, 2.55, -1.17); bt.bb(M.frame, -1.65, 0, 1.17, -1.57, 2.55, 1.25);
  col(-1.66, -1.26, -1.56, -1.16); col(-1.66, 1.16, -1.56, 1.26);

  // ───────────── Corredor ─────────────
  const pool = (x0, z0, x1, z1) => bt.quad(M.pool, x0, z0, x1, z1, 0.05, 0);
  const lampX = (x, z, len = 1.3) => { bt.bb(M.white, x - len / 2, 2.9, z - 0.14, x + len / 2, 2.985, z + 0.14); bt.bb(M.lamp, x - len / 2 + 0.05, 2.87, z - 0.09, x + len / 2 - 0.05, 2.9, z + 0.09); };
  for (let x = 3; x < 64; x += 5) { lampX(x, 0); pool(x - 1.9, -1.2, x + 1.9, 1.2); }
  { const g = new THREE.CylinderGeometry(0.045, 0.045, 41, 8); g.rotateZ(Math.PI / 2); g.translate(27, 2.78, 0.92); bt.add(M.red, g); }
  { const g = new THREE.CylinderGeometry(0.045, 0.045, 1.2, 8); g.translate(40, 2.2, 0.92); bt.add(M.red, g); }
  bt.bb(M.metal, 0.3, 2.82, -1.12, 63.7, 2.86, -0.86);
  for (let x = 2; x < 64; x += 4) bt.bb(M.metal, x - 0.02, 2.86, -1.0, x + 0.02, 2.99, -0.96);
  for (const x of [18, 44]) at(x, 2.93, 0.3).geo(M.dark, new THREE.SphereGeometry(0.09, 10, 6));

  // Portas fechadas, com a plaquinha UFRN DCA.
  function door(x, zWall, side, sala) {
    const z = zWall + side * 0.1;
    bt.bb(M.door, x - 0.45, 0, z - 0.03, x + 0.45, 2.1, z + 0.03);
    bt.bb(M.frame, x - 0.52, 0, z - 0.04, x - 0.45, 2.17, z + 0.04); bt.bb(M.frame, x + 0.45, 0, z - 0.04, x + 0.52, 2.17, z + 0.04);
    bt.bb(M.frame, x - 0.52, 2.1, z - 0.04, x + 0.52, 2.17, z + 0.04);
    bt.bb(M.glassDark, x - 0.19, 1.3, z + side * 0.03 - 0.006, x + 0.19, 1.68, z + side * 0.03 + 0.006);
    bt.bb(M.metal, x + side * 0.3, 1.0, z + side * 0.03, x + side * 0.4, 1.04, z + side * 0.09);
    decal(T.plate(sala, 'DCA · UFRN'), 0.48, 0.16, x, 1.88, z + side * 0.036, side > 0 ? 0 : Math.PI);
    inter.push({ x, z: zWall + side * 0.7, r: 1.0, label: 'Bater na porta', kind: 'porta' });
  }
  const northDoors = [[9, 'Sala 10'], [17, 'Sala 12'], [25, 'Sala 14'], [33, 'Sala 16'], [41, 'Sala 18'], [62, 'Sala 20']];
  const southDoors = [[10, 'Sala 11'], [15, 'Sala 13'], [37, 'Sala 17'], [45, 'Sala 19'], [53, 'Sala 21'], [60, 'Sala 23']];
  for (const [x, s] of northDoors) door(x, B.cN, 1, s);
  for (const [x, s] of southDoors) door(x, B.cS, -1, s);
  // Porta dupla do fim do corredor
  bt.bb(M.door, 63.86, 0, -0.95, 63.92, 2.1, -0.02); bt.bb(M.door, 63.86, 0, 0.02, 63.92, 2.1, 0.95);
  bt.bb(M.frame, 63.84, 0, -1.03, 63.93, 2.18, -0.95); bt.bb(M.frame, 63.84, 0, 0.95, 63.93, 2.18, 1.03); bt.bb(M.frame, 63.84, 2.1, -1.03, 63.93, 2.18, 1.03);
  inter.push({ x: 63.2, z: 0, r: 1.0, label: 'Bater na porta', kind: 'porta' });

  // Galeria de quadros nas duas paredes.
  const blocked = { n: [...northDoors.map((d) => d[0]), 50, 51.5, 53, 28, 46, 0.5], s: [...southDoors.map((d) => d[0]), 21.1, 22.2, 40, 12.3, 34.4, 3, 5] };
  const frame = L('#2a2c30');
  let galleryN = 0;
  for (const [key, zWall, side] of [['n', B.cN, 1], ['s', B.cS, -1]]) {
    for (let x = 7.2; x < 63; x += 1.55) {
      if (blocked[key].some((d) => Math.abs(d - x) < 1.25) || r() < 0.12) continue;
      const [w, h] = [[0.95, 0.68], [0.62, 0.8], [1.1, 0.74], [0.56, 0.56], [0.8, 0.6]][(r() * 5) | 0];
      const y = 1.62 + (r() - 0.5) * 0.16, z = zWall + side * 0.078;
      bt.bb(frame, x - w / 2 - 0.03, y - h / 2 - 0.03, z - 0.015, x + w / 2 + 0.03, y + h / 2 + 0.03, z + 0.015);
      decal(T.posters[(r() * T.posters.length) | 0], w, h, x, y, z + side * 0.017, side > 0 ? 0 : Math.PI);
      if (galleryN++ % 5 === 2) inter.push({ x, z: zWall + side * 0.75, r: 0.95, label: 'Ver o quadro', kind: 'quadro' });
    }
  }

  // Extintores, abrigo de mangueira e sinalização.
  function extinguisher(x, z, signRy, sx, sz) {
    const p = at(x, 0, z);
    p.cyl(M.red, 0.075, 0.075, 0.48, 0, 1.12, 0, 10); p.cyl(M.dark, 0.03, 0.045, 0.1, 0, 1.4, 0, 8);
    decal(T.fireSign, 0.2, 0.2, sx, 1.85, sz, signRy);
  }
  extinguisher(12.3, 1.13, Math.PI, 12.3, 1.215); extinguisher(34.4, 1.13, Math.PI, 34.4, 1.215);
  extinguisher(28, -1.13, 0, 28, -1.215); extinguisher(46, -1.13, 0, 46, -1.215);
  extinguisher(0.2, -0.85, Math.PI / 2, 0.085, -0.85); extinguisher(0.2, -1.07, Math.PI / 2, 0.085, -1.07);
  inter.push({ x: 12.3, z: 0.6, r: 0.8, label: 'Examinar o extintor', kind: 'extintor' });
  bt.bb(M.red, 39.7, 0.9, 1.07, 40.3, 1.75, 1.225);
  decal(T.hose, 0.6, 0.85, 40, 1.325, 1.066, Math.PI);
  for (const x of [46.6]) { bt.bb(M.dark, x - 0.012, 2.62, -0.26, x + 0.012, 2.88, 0.26); bt.bb(M.metal, x - 0.01, 2.88, -0.01, x + 0.01, 2.99, 0.01);
    decal(T.exitSign, 0.5, 0.22, x - 0.016, 2.75, 0, -Math.PI / 2, { basic: true }); decal(T.exitSign, 0.5, 0.22, x + 0.016, 2.75, 0, Math.PI / 2, { basic: true }); }
  decal(T.exitSign, 0.5, 0.22, 0.082, 2.8, 0, Math.PI / 2, { basic: true });

  // ───────────── Saída dos fundos ─────────────
  bt.bb(M.wood, 1.3, 0.7, 2.7, 3.5, 0.76, 4.3);
  for (const [x, z] of [[1.4, 2.8], [3.4, 2.8], [1.4, 4.2], [3.4, 4.2]]) bt.bb(M.dark, x - 0.03, 0, z - 0.03, x + 0.03, 0.7, z + 0.03);
  col(1.3, 2.7, 3.5, 4.3);
  bt.bb(M.white, 0.08, 0, 1.5, 0.55, 0.82, 2.4); col(0.08, 1.5, 0.55, 2.4);
  bt.bb(M.rug, 0.2, 0.034, -0.5, 1.3, 0.05, 0.5);
  lampX(3, 3.2); pool(1.2, 1.6, 4.8, 4.8);
  // A porta dos fundos abre sozinha quando alguém chega perto.
  const exitDoor = new THREE.Group(); exitDoor.position.set(0, 0, -0.55); root.add(exitDoor);
  { const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.05, 2.08, 1.1), M.door); leaf.position.set(0, 1.04, 0.55); exitDoor.add(leaf);
    decal(T.exitPaper, 0.5, 0.66, 0.03, 1.5, 0.55, Math.PI / 2, { parent: exitDoor });
    decal(T.exitPaper, 0.5, 0.66, -0.03, 1.5, 0.55, -Math.PI / 2, { parent: exitDoor }); }
  for (let i = 0; i < 3; i++) bt.bb(M.glassDark, -0.085, 2.22, -0.5 + i * 0.35, 0.085, 2.62, -0.2 + i * 0.35);
  decal(T.access, 1.1, 1.1, -3.4, 0.03, 0, 0, { flat: true });

  // ───────────── LABGRAD, Sala 15 ─────────────
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
  inter.push({ x: 30.2, z: 5.15, r: 1.0, label: 'Usar o computador', kind: 'terminal' });
  inter.push({ x: 20.9, z: 6.2, r: 1.1, label: 'Ler o quadro branco', kind: 'quadrobranco' });
  for (const x of [23, 27, 30.5]) for (const z of [3.4, 6.4]) { bt.bb(M.white, x - 0.1, 2.9, z - 0.65, x + 0.1, 2.985, z + 0.65); bt.bb(M.lamp, x - 0.06, 2.87, z - 0.6, x + 0.06, 2.9, z + 0.6); }
  pool(21.5, 2, 31.5, 8);
  bt.bb(M.white, 25.6, 2.4, 8.12, 26.6, 2.72, 8.42); bt.bb(M.white, 20.08, 2.4, 2.6, 20.36, 2.72, 3.5);
  at(21.9, 0, 1.75).cyl(M.white, 0.17, 0.14, 0.42, 0, 0.21, 0, 10);

  // ───────────── Hall de entrada ─────────────
  for (const [x, hinge] of [[50.03, 1], [52.97, -1]]) {
    bt.bb(M.frame, x - 0.025, 0.04, -2.85, x + 0.025, 2.4, -2.8); bt.bb(M.frame, x - 0.025, 0.04, -1.42, x + 0.025, 2.4, -1.38);
    bt.bb(M.frame, x - 0.025, 2.35, -2.85, x + 0.025, 2.4, -1.38); bt.bb(M.frame, x - 0.025, 0.04, -2.85, x + 0.025, 0.09, -1.38);
    for (let z = -2.7; z < -1.42; z += 0.12) bt.bb(M.frame, x - 0.012, 0.09, z - 0.012, x + 0.012, 2.35, z + 0.012);
    col(x - 0.04, -2.85, x + 0.04, -1.38);
  }
  function roundTable(x, z) {
    const p = at(x, 0, z);
    p.cyl(M.white, 0.62, 0.62, 0.04, 0, 0.74, 0, 20); p.cyl(M.metal, 0.05, 0.05, 0.72, 0, 0.36, 0, 8); p.cyl(M.metal, 0.3, 0.32, 0.03, 0, 0.015, 0, 12);
    col(x - 0.45, z - 0.45, x + 0.45, z + 0.45);
    const n = 3, a0 = r() * 6;
    for (let i = 0; i < n; i++) {
      const a = a0 + (i * Math.PI * 2) / n, cx = x + Math.sin(a) * 1.0, cz = z + Math.cos(a) * 1.0;
      const c = at(cx, 0, cz, a + Math.PI);
      c.box(M.white, 0.44, 0.04, 0.44, 0, 0.44, 0); c.box(M.white, 0.44, 0.44, 0.04, 0, 0.68, -0.2);
      for (const [lx, lz] of [[-0.19, -0.19], [0.19, -0.19], [-0.19, 0.19], [0.19, 0.19]]) c.box(M.white, 0.04, 0.44, 0.04, lx, 0.22, lz);
    }
  }
  roundTable(50.4, -5.6); roundTable(57.6, -3.6); roundTable(58, -6.9);
  decal(T.bulletin(CFG.evento), 2.2, 1.375, 48.085, 1.6, -4.2, Math.PI / 2);
  bt.bb(M.wood, 48.08, 0.88, -5.34, 48.1, 2.32, -3.06);
  inter.push({ x: 48.9, z: -4.2, r: 1.2, label: 'Ler o mural', kind: 'mural' });
  for (const z of [-7.9, -7.4]) at(59.5, 0, z).cyl(M.dark, 0.2, 0.17, 0.5, 0, 0.25, 0, 10);
  col(59.25, -8.15, 59.75, -7.15);
  for (const x of [51, 57]) { const z = -5; bt.bb(M.white, x - 0.65, 2.9, z - 0.14, x + 0.65, 2.985, z + 0.14); bt.bb(M.lamp, x - 0.6, 2.87, z - 0.09, x + 0.6, 2.9, z + 0.09); }
  pool(49, -8, 59, -2);
  // Portas de vidro abertas para a varanda
  for (const x of [53.02, 55.38]) {
    bt.bb(M.glass, x - 0.015, 0.1, -9.7, x + 0.015, 2.2, -8.6);
    bt.bb(M.metal, x - 0.025, 0, -9.72, x + 0.025, 0.1, -8.58); bt.bb(M.metal, x - 0.025, 2.2, -9.72, x + 0.025, 2.28, -8.58);
    bt.bb(M.metal, x - 0.025, 0, -9.74, x + 0.025, 2.28, -9.68); bt.bb(M.metal, x - 0.025, 0, -8.62, x + 0.025, 2.28, -8.58);
    col(x - 0.04, -9.74, x + 0.04, -8.58);
  }
  for (let x = 48.75; x < 50.7; x += 0.24) bt.bb(M.wallOut, x, 0.25, -8.72, x + 0.1, 2.35, -8.6);

  // ───────────── Varanda e fachada ─────────────
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
  inter.push({ x: 58.7, z: -10.6, r: 1.3, label: 'Ler o banner', kind: 'banner' });

  // ───────────── Vegetação e arredores ─────────────
  const shade = (x, z, s) => bt.quad(M.shade, x - s, z - s, x + s, z + s, 0.04, 0);
  function tree(x, z, s = 1) {
    const p = at(x, 0, z, r() * 6);
    p.cyl(M.trunk, 0.13 * s, 0.2 * s, 2.6 * s, 0, 1.3 * s, 0, 7);
    for (let i = 0; i < 5; i++) {
      const g = new THREE.IcosahedronGeometry((1.25 + r() * 0.7) * s, 1);
      g.scale(1, 0.72, 1); g.translate((r() - 0.5) * 2.1 * s, (3.0 + r() * 1.2) * s, (r() - 0.5) * 2.1 * s);
      p.geo(M.leaf[i % 3], g);
    }
    col(x - 0.2 * s, z - 0.2 * s, x + 0.2 * s, z + 0.2 * s);
    shade(x, z, 3.2 * s);
  }
  function palm(x, z) {
    const p = at(x, 0, z);
    p.cyl(M.trunk, 0.12, 0.17, 3.4, 0, 1.7, 0, 7);
    for (let i = 0; i < 11; i++) {
      const g = new THREE.BoxGeometry(0.5, 0.02, 1.7); g.translate(0, 0, 0.85);
      g.rotateX(-0.75 + r() * 0.9); g.rotateY((i * Math.PI * 2) / 11 + r() * 0.2); g.translate(0, 3.4, 0);
      p.geo(M.leaf[2], g);
    }
    col(x - 0.17, z - 0.17, x + 0.17, z + 0.17); shade(x, z, 1.8);
  }
  function clump(x, z, mat, n = 6, h = 0.7) {
    const p = at(x, 0, z);
    for (let i = 0; i < n; i++) { const g = new THREE.ConeGeometry(0.06, h * (0.7 + r() * 0.6), 4); g.translate(0, h * 0.4, 0); g.rotateZ((r() - 0.5) * 0.5); g.rotateX((r() - 0.5) * 0.5); g.translate((r() - 0.5) * 0.45, 0, (r() - 0.5) * 0.45); p.geo(mat, g); }
  }
  for (const [x, z, s] of [[46, -18, 1.1], [62.5, -20, 1.2], [44, -31, 1], [66, -31, 1.1], [38, -14.5, 0.9], [72, -15, 1], [29, -21, 1.2], [76, -29, 1],
    [19, -16, 1.1], [9, -22, 1.3], [2, -15, 0.9], [72, -4, 1], [74, 6, 1.2], [-30, -16, 1.5], [-37, 14, 1.3], [-12, -24, 1.1], [-11, 21, 1.2], [8, 22, 1.2], [26, 23, 1.1], [52, 22, 1.3], [70, 20, 1]]) tree(x, z, s);
  palm(61.3, -14.4); palm(45.5, -13.6); palm(-6, -7);
  for (let z = -33; z < -13; z += 1.3) { clump(52.5, z, M.plant, 5, 0.45); if (r() < 0.5) clump(56, z + 0.5, r() < 0.5 ? M.purple : M.plant, 5, 0.4); }
  for (let x = -8.5; x < -2.6; x += 0.8) { clump(x, 1.9, M.plant, 7, 0.85); clump(x + 0.3, 2.5, M.purple, 5, 0.35); }
  for (const [x, z] of [[47, -27.5], [60, -27.5], [40, -20], [66, -18.5], [58, -32]]) { bt.bb(M.concrete, x - 0.7, 0, z - 0.7, x + 0.7, 0.12, z + 0.7); clump(x, z, M.purple, 8, 0.5); clump(x + 0.2, z - 0.2, M.plant, 6, 0.6); col(x - 0.7, z - 0.7, x + 0.7, z + 0.7); }

  // Carros estacionados
  const cars = [];
  for (const [x, z, ry, c] of [[-20, -14, 0, '#5b6168'], [-23.3, -14, 0, '#8a8d91'], [-34, -8, Math.PI / 2, '#c2c5c9'], [-34, 9, Math.PI / 2, '#3d4a5c'], [18, 16, Math.PI / 2, '#7a2c2c'], [41, 16, Math.PI / 2, '#dfe1e4'], [47.5, 16, Math.PI / 2, '#474c52']]) {
    const car = makeCar(c, { shadow: T.shadow }); car.group.position.set(x, 0.02, z); car.group.rotation.y = ry; root.add(car.group); cars.push({ x, z });
    ry ? col(x - 2.15, z - 0.95, x + 2.15, z + 0.95) : col(x - 0.95, z - 2.15, x + 0.95, z + 2.15);
  }
  // Poste do estacionamento
  { const p = at(-25, 0, -2); p.cyl(M.metal, 0.07, 0.11, 9, 0, 4.5, 0, 8); p.box(M.metal, 1.6, 0.06, 0.06, 0, 9, 0); p.box(M.white, 0.5, 0.1, 0.24, -0.8, 8.95, 0); p.box(M.white, 0.5, 0.1, 0.24, 0.8, 8.95, 0); col(-25.12, -2.12, -24.88, -1.88); }

  // Cerca viva nos limites do mapa
  const Lm = LIMITS;
  for (const [x0, z0, x1, z1] of [[Lm.x0 - 1, Lm.z0 - 1, Lm.x1 + 1, Lm.z0], [Lm.x0 - 1, Lm.z1, Lm.x1 + 1, Lm.z1 + 1], [Lm.x0 - 1, Lm.z0, Lm.x0, Lm.z1], [Lm.x1, Lm.z0, Lm.x1 + 1, Lm.z1]]) {
    bt.bb(M.hedge, x0, 0, z0, x1, 1.25, z1); col(x0, z0, x1, z1); segs.push(x1 - x0 > z1 - z0 ? [x0, (z0 + z1) / 2, x1, (z0 + z1) / 2] : [(x0 + x1) / 2, z0, (x0 + x1) / 2, z1]);
  }
  // Prédios vizinhos e as serras ao fundo
  bt.bb(M.wallOut, -80, 0, -30, -60, 4.6, 12); bt.bb(M.roofBlue, -81, 4.6, -31, -59, 6.4, 13);
  bt.bb(M.wall, 28, 0, -58, 80, 3.6, -47); bt.bb(M.roof, 27, 3.6, -59, 81, 3.9, -46);
  bt.bb(M.wall, 90, 0, -22, 104, 3.6, 14); bt.bb(M.roof, 89, 3.6, -23, 105, 3.9, 15);
  bt.bb(M.wall, 0, 0, 40, 60, 3.4, 50); bt.bb(M.roof, -1, 3.4, 39, 61, 3.7, 51);
  for (const [x, z, R, H] of [[-200, -70, 80, 30], [-250, 50, 110, 40], [-160, -190, 90, 34], [-40, -260, 100, 28], [130, -250, 110, 34], [260, -90, 100, 36], [250, 130, 110, 30], [40, 270, 120, 32], [-170, 220, 110, 36]]) {
    const g = new THREE.SphereGeometry(1, 9, 5, 0, Math.PI * 2, 0, Math.PI / 2); g.scale(R, H, R); g.translate(x, -1, z); bt.add(M.hill, g);
  }

  bt.build(root);

  // Céu
  const sky = new THREE.Mesh(new THREE.SphereGeometry(520, 32, 16), new THREE.MeshBasicMaterial({ map: T.sky, side: THREE.BackSide, fog: false, depthWrite: false }));
  sky.renderOrder = -1; scene.add(sky);

  function zone(x, z) {
    if (x > B.x0 && x < B.x1 && z > B.zN && z < B.zS) {
      if (x > 20 && x < 32 && z > B.cS) return 'LABGRAD · Sala 15';
      if (x > 48 && x < 60 && z < B.cN) return 'Hall de Entrada';
      if (x < 6 && z > B.cN && z < 5) return 'Saída dos Fundos';
      return 'Corredor Principal';
    }
    if (x > 48 && x < 60 && z <= B.zN && z > -12.5) return 'Varanda';
    if (z < B.zN && x > 14) return 'Jardim';
    if (x <= 14 && (x < 0 || z < B.zN)) return 'Estacionamento';
    return 'Pátio Sul';
  }
  const indoor = (x, z) => (x > B.x0 - 0.2 && x < B.x1 + 0.2 && z > B.zN - 0.2 && z < B.zS + 0.2) || (x > 47.8 && x < 60.2 && z <= B.zN && z > -13);

  let doorOpen = 0;
  return {
    colliders, segs, inter, mapRects, zone, indoor, sky,
    update(dt, x, z) {
      const near = Math.hypot(x, z) < 2.6 ? 1 : 0;
      doorOpen += (near - doorOpen) * Math.min(1, dt * 5);
      exitDoor.rotation.y = -doorOpen * 1.75;
    },
  };
}
