// Personagens (jogador e figurantes) e carros, todos montados com caixas.
import * as THREE from '../vendor/three.min.js';

const matCache = new Map();
function mat(color, extra) {
  const key = color + (extra ? JSON.stringify(extra) : '');
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshLambertMaterial({ color, ...extra }));
  return matCache.get(key);
}
function box(parent, m, w, h, d, x, y, z) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

// O personagem olha para +Z. Pés em y = 0.
export function makeCharacter(spec, shadowTex) {
  const g = new THREE.Group();
  const body = new THREE.Group();
  g.add(body);
  const robo = spec.estilo === 'robo';
  const skin = mat(spec.pele), shirt = mat(spec.camisa), pants = mat(spec.calca), shoe = mat(spec.sapato), hair = mat(spec.cabelo);
  const dark = mat('#1b1b1e');

  const leg = (sx) => {
    const p = new THREE.Group(); p.position.set(sx * 0.105, 0.8, 0); body.add(p);
    box(p, pants, 0.17, 0.7, 0.19, 0, -0.35, 0);
    box(p, shoe, 0.18, 0.1, 0.27, 0, -0.75, 0.035);
    return p;
  };
  const arm = (sx) => {
    const p = new THREE.Group(); p.position.set(sx * 0.275, 1.32, 0); body.add(p);
    box(p, spec.jaleco ? mat('#f4f4f0') : shirt, 0.12, robo ? 0.5 : 0.3, 0.14, 0, robo ? -0.25 : -0.15, 0);
    if (!robo) box(p, spec.jaleco ? mat('#f4f4f0') : skin, 0.105, 0.24, 0.12, 0, -0.42, 0);
    box(p, skin, 0.11, 0.1, 0.12, 0, -0.59, 0);
    return p;
  };
  const legL = leg(-1), legR = leg(1), armL = arm(-1), armR = arm(1);

  box(body, spec.jaleco ? mat('#f4f4f0') : shirt, 0.44, 0.56, 0.25, 0, 1.08, 0);
  if (spec.jaleco) { box(body, shirt, 0.16, 0.5, 0.02, 0, 1.1, 0.125); box(body, mat('#f4f4f0'), 0.46, 0.22, 0.26, 0, 0.74, 0); }
  box(body, skin, 0.12, 0.06, 0.12, 0, 1.385, 0);

  const head = new THREE.Group(); head.position.set(0, 1.53, 0); body.add(head);
  box(head, skin, 0.25, 0.26, 0.25, 0, 0, 0);
  if (robo) {
    box(head, new THREE.MeshBasicMaterial({ color: '#35e0ff' }), 0.2, 0.06, 0.02, 0, 0.03, 0.126);
    box(head, hair, 0.02, 0.16, 0.02, 0, 0.2, 0);
    box(head, new THREE.MeshBasicMaterial({ color: '#f4b63a' }), 0.05, 0.05, 0.05, 0, 0.3, 0);
    box(body, new THREE.MeshBasicMaterial({ color: '#f4b63a' }), 0.14, 0.1, 0.02, 0, 1.16, 0.126);
    box(body, dark, 0.3, 0.04, 0.02, 0, 0.98, 0.126);
  } else {
    box(head, dark, 0.04, 0.04, 0.02, -0.06, 0.02, 0.126);
    box(head, dark, 0.04, 0.04, 0.02, 0.06, 0.02, 0.126);
    box(head, mat('#8a3b32'), 0.08, 0.015, 0.02, 0, -0.07, 0.126);
    box(head, hair, 0.27, 0.08, 0.27, 0, 0.14, 0);
    box(head, hair, 0.27, 0.16, 0.06, 0, 0.06, -0.11);
    if (spec.estilo === 'longo') { box(head, hair, 0.27, 0.34, 0.07, 0, -0.1, -0.115); box(head, hair, 0.04, 0.26, 0.2, -0.13, -0.04, -0.03); box(head, hair, 0.04, 0.26, 0.2, 0.13, -0.04, -0.03); }
    if (spec.estilo === 'coque') box(head, hair, 0.12, 0.12, 0.12, 0, 0.18, -0.12);
    if (spec.estilo === 'grisalho') { box(head, hair, 0.04, 0.12, 0.2, -0.13, 0.03, -0.02); box(head, hair, 0.04, 0.12, 0.2, 0.13, 0.03, -0.02); box(head, hair, 0.14, 0.035, 0.02, 0, -0.035, 0.127); }
    if (spec.oculos) { box(head, dark, 0.26, 0.018, 0.02, 0, 0.03, 0.13); box(head, dark, 0.09, 0.06, 0.015, -0.065, 0.02, 0.132); box(head, dark, 0.09, 0.06, 0.015, 0.065, 0.02, 0.132); }
  }
  if (spec.mochila) { box(body, mat(spec.mochila), 0.34, 0.42, 0.14, 0, 1.1, -0.19); box(body, mat('#22252a'), 0.24, 0.12, 0.03, 0, 1.0, -0.27); }

  let shadow = null;
  if (shadowTex) {
    shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.95), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.012; g.add(shadow);
  }

  let phase = 0, amp = 0;
  return {
    group: g, body, spec,
    // speed em m/s. Anima o balanço de pernas e braços.
    animate(dt, speed) {
      const target = Math.min(1, speed / 3.2);
      amp += (target - amp) * Math.min(1, dt * 10);
      phase += dt * (4.5 + speed * 1.9);
      const s = Math.sin(phase) * amp, run = speed > 4.5 ? 1.25 : 1;
      legL.rotation.x = s * 0.75 * run; legR.rotation.x = -s * 0.75 * run;
      armL.rotation.x = -s * 0.65 * run; armR.rotation.x = s * 0.65 * run;
      body.position.y = Math.abs(Math.cos(phase)) * 0.045 * amp;
      body.rotation.x = amp * (speed > 4.5 ? 0.12 : 0.04);
      const idle = (1 - amp) * Math.sin(phase * 0.35) * 0.02;
      head.rotation.y = idle * 3; armL.rotation.z = 0.03 + idle; armR.rotation.z = -0.03 - idle;
      return Math.sin(phase);
    },
  };
}

// O carro aponta para +Z. Largura em X, comprimento em Z.
export function makeCar(color, o = {}) {
  const g = new THREE.Group();
  const paint = mat(color), glass = mat('#16202b'), dark = mat('#17181b'), rim = mat('#b9bec4');
  box(g, paint, 1.8, 0.5, 4.2, 0, 0.62, 0);
  box(g, dark, 1.84, 0.14, 4.24, 0, 0.36, 0);
  box(g, glass, 1.62, 0.46, 2.3, 0, 1.08, -0.25);
  box(g, paint, 1.66, 0.07, 2.1, 0, 1.33, -0.3);
  box(g, paint, 0.08, 0.46, 0.08, -0.78, 1.08, 0.86); box(g, paint, 0.08, 0.46, 0.08, 0.78, 1.08, 0.86);
  box(g, paint, 0.08, 0.46, 0.08, -0.78, 1.08, -1.36); box(g, paint, 0.08, 0.46, 0.08, 0.78, 1.08, -1.36);
  const lamp = new THREE.MeshBasicMaterial({ color: '#fff6d8' }), tail = new THREE.MeshBasicMaterial({ color: '#e0261f' });
  box(g, lamp, 0.36, 0.14, 0.04, -0.62, 0.7, 2.11); box(g, lamp, 0.36, 0.14, 0.04, 0.62, 0.7, 2.11);
  box(g, tail, 0.36, 0.12, 0.04, -0.62, 0.72, -2.11); box(g, tail, 0.36, 0.12, 0.04, 0.62, 0.72, -2.11);
  box(g, dark, 1.0, 0.16, 0.04, 0, 0.56, 2.11);
  if (o.plate) {
    for (const z of [2.125, -2.125]) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.16), new THREE.MeshBasicMaterial({ map: o.plate }));
      p.position.set(0, 0.5, z); if (z < 0) p.rotation.y = Math.PI; g.add(p);
    }
  }
  const wheels = [], steerers = [];
  const wg = new THREE.CylinderGeometry(0.34, 0.34, 0.24, 14); wg.rotateZ(Math.PI / 2);
  const hg = new THREE.CylinderGeometry(0.18, 0.18, 0.26, 8); hg.rotateZ(Math.PI / 2);
  for (const [x, z] of [[-0.86, 1.35], [0.86, 1.35], [-0.86, -1.35], [0.86, -1.35]]) {
    const pivot = new THREE.Group(); pivot.position.set(x, 0.34, z); g.add(pivot);
    const spin = new THREE.Group(); pivot.add(spin);
    spin.add(new THREE.Mesh(wg, dark)); spin.add(new THREE.Mesh(hg, rim));
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.27, 0.05, 0.3), dark); spin.add(spoke);
    wheels.push(spin); if (z > 0) steerers.push(pivot);
  }
  if (o.shadow) {
    const s = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 5.8), new THREE.MeshBasicMaterial({ map: o.shadow, transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -6, polygonOffsetUnits: -6 }));
    s.rotation.x = -Math.PI / 2; s.position.y = 0.03; g.add(s);
  }
  return { group: g, wheels, steerers };
}
