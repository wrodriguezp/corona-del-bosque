import * as THREE from 'three';
import { mat, matMetal, matGlow, paint, paintBy, at, loft, tube, merge, ball, ico, octa, box, cone, cyl, ringGeo, star, mesh } from './geo.js';
import { caveMesh, shopMesh, nestMesh, holeMesh, arenaMesh, fireMesh, bookMesh, starMesh, altarMesh } from './creatures.js';
import { ease } from './stage.js';
import { makeRng } from '../core/rng.js';
import { makeCritter } from './critters.js';
import { makeFoe } from './foes.js';

const SHADE_COL = new THREE.Color('#2e2342');

const GROUND = [
  ['#7cc752', '#70bc48', '#89d260'],
  ['#4fb98a', '#45ab83', '#5fc795'],
  ['#f0b24e', '#e6a343', '#f5bf62'],
  ['#e3ecff', '#d3dffa', '#f2f6ff'],
];
const TYPE_COLOR = { gem: '#ffe07a', trap: '#b8556b', chest: '#ffb35c', shrine: '#8ef0e2', portal: '#b98aff', eagle: '#9fd8ff', worm: '#a8765c', duel: '#ff9a7a', adventure: '#ffd0e4', shop: '#ffc27a', cave: '#8f86b5', altar: '#8ef0e2' };
const MODEL = { gem: (c) => gemMesh(c.n), chest: chestMesh, trap: (c) => trapMesh(c.trap), portal: portalMesh, shrine: shrineMesh, shop: shopMesh, cave: caveMesh, altar: altarMesh, eagle: nestMesh, worm: holeMesh, duel: arenaMesh, calm: fireMesh, adventure: bookMesh };
const HEX = 0.93;

const prism = (top, bottom, h) => loft([
  { y: -h, r: bottom }, { y: -0.1, r: top }, { y: -0.035, r: top }, { y: 0, r: top - 0.06 },
], 6, { capBottom: false });

/* ---------- Adornos del paisaje ---------- */
const PROPS = {
  pine: () => [paint(cyl(0.07, 0.1, 0.4, 6).translate(0, 0.2, 0), '#7b4a2d'), ...[[0.5, 0.62, 0.42], [0.85, 0.55, 0.34], [1.18, 0.5, 0.24]].map(([y, h, r], i) => paintBy(at(cone(r, h, 7), { r: [0, i, 0], p: [0, y, 0] }), (v) => (v.x < 0 ? '#2f8f5b' : '#3aa568')))],
  oak: () => [paint(tube([[0, 0, 0], [0.04, 0.3, 0], [0, 0.6, 0.02]], [0.12, 0.08, 0.06], 6, 5), '#80502f'), ...[[0, 0.85, 0, 0.36], [0.24, 0.72, 0.08, 0.25], [-0.22, 0.75, -0.06, 0.27], [0.02, 1.1, -0.05, 0.25]].map(([x, y, z, r]) => paintBy(at(ico(r, 1), { p: [x, y, z] }), (v) => (v.y > 0.9 ? '#8fdc58' : '#5cb84a')))],
  magic: () => [paint(tube([[0, 0, 0], [-0.06, 0.35, 0], [0.05, 0.7, 0]], [0.12, 0.08, 0.05], 6, 6), '#6b4a7d'), ...[[0, 0.95, 0, 0.36], [0.26, 0.8, 0.05, 0.24], [-0.25, 0.85, 0, 0.26], [0.03, 1.22, 0, 0.22]].map(([x, y, z, r]) => paintBy(at(ico(r, 1), { p: [x, y, z] }), (v) => (v.y > 1 ? '#3fd4b4' : '#1f9c8e')))],
  autumn: () => [paint(tube([[0, 0, 0], [0.04, 0.3, 0], [0, 0.6, 0.02]], [0.11, 0.08, 0.05], 6, 5), '#6e4026'), ...[[0, 0.85, 0, 0.36], [0.24, 0.72, 0.08, 0.25], [-0.22, 0.78, -0.06, 0.27], [0.02, 1.12, -0.05, 0.24]].map(([x, y, z, r]) => paintBy(at(ico(r, 1), { p: [x, y, z] }), (v) => (v.y > 0.95 ? '#ff9a3d' : '#e2582e')))],
  snowpine: () => [paint(cyl(0.07, 0.1, 0.4, 6).translate(0, 0.2, 0), '#6a4a3f'), ...[[0.5, 0.62, 0.42], [0.85, 0.55, 0.34], [1.18, 0.5, 0.24]].map(([y, h, r], i) => paintBy(at(cone(r, h, 7), { r: [0, i, 0], p: [0, y, 0] }), (v) => (v.y > y + 0.02 ? '#ffffff' : '#6fa5c9')))],
  rock: () => [paintBy(at(ico(0.28, 0), { s: [1.1, 0.8, 1], p: [0, 0.14, 0] }), (v) => (v.y > 0.2 ? '#b9b2c4' : '#8c8399')), paint(at(ico(0.15, 0), { p: [0.27, 0.07, 0.12] }), '#a49bb0')],
  mushroom: () => [[0, 0, 1], [0.2, 0.1, 0.6], [-0.15, 0.14, 0.5]].flatMap(([x, z, s]) => [
    paint(at(loft([{ y: 0, r: 0.05 }, { y: 0.24, r: 0.035 }], 7), { s, p: [x, 0, z] }), '#fff1dc'),
    paintBy(at(loft([{ y: 0.2, r: 0.05 }, { y: 0.21, r: 0.17 }, { y: 0.29, r: 0.13 }, { y: 0.34, r: 0.04 }], 9), { s, p: [x, 0, z] }), (v) => (v.y > 0.31 * s ? '#ff7ad1' : '#b14be0')),
  ]),
  flowers: () => [['#ff7fb2', -0.1, 0.05], ['#ffd84a', 0.1, -0.06], ['#ffffff', 0.03, 0.14], ['#9d8cff', -0.04, -0.14]].flatMap(([c, x, z]) => [paint(at(cyl(0.012, 0.015, 0.16, 4), { p: [x, 0.08, z] }), '#3f9a4b'), paint(at(octa(0.05), { s: [1, 0.6, 1], p: [x, 0.18, z] }), c)]),
  grass: () => [-1, 0, 1, 2].map((i) => paint(at(cone(0.035, 0.22, 3), { r: [i * 0.15, i, i * 0.16], p: [i * 0.06 - 0.03, 0.09, (i % 2) * 0.06] }), '#5fb548')),
  crystal: () => [[0, 0, 0.55, 0], [0.14, 0.05, 0.36, -0.35], [-0.14, 0.04, 0.4, 0.32], [0.02, -0.14, 0.3, 0.1]].map(([x, z, h, r], i) => paint(at(loft([{ y: 0, r: 0.06 }, { y: h * 0.7, r: 0.085 }, { y: h, r: 0.005 }], 6), { r: [z * 2, 0, r], p: [x, 0, z] }), ['#8ff0ff', '#c9a4ff', '#7cc8ff', '#f2b6ff'][i])),
  mountain: () => [paintBy(at(loft([{ y: 0, r: 0.82, wave: [5, 0.06] }, { y: 0.5, r: 0.56, wave: [4, 0.12] }, { y: 1.0, r: 0.3, wave: [3, 0.12], x: 0.05 }, { y: 1.45, r: 0.03, x: 0.02 }], 8), {}), (v) => (v.y > 0.95 ? '#ffffff' : v.x < 0 ? '#8a7f9d' : '#a397b5')), paintBy(at(loft([{ y: 0, r: 0.4, x: 0.42, z: 0.3 }, { y: 0.45, r: 0.2, x: 0.4, z: 0.3 }, { y: 0.8, r: 0.02, x: 0.4, z: 0.28 }], 6), {}), (v) => (v.y > 0.6 ? '#f4f2ff' : '#948aa6'))],
  lily: () => [paint(at(cyl(0.17, 0.17, 0.025, 8), { p: [0, 0.02, 0] }), '#46a860'), paint(at(octa(0.07), { p: [0.03, 0.07, 0] }), '#ff9ccd')],
  pumpkin: () => [paintBy(loft([{ y: 0, r: 0.08 }, { y: 0.08, r: 0.2, wave: [7, 0.08] }, { y: 0.2, r: 0.2, wave: [7, 0.08] }, { y: 0.27, r: 0.07 }], 14), () => '#ff8a2b'), paint(tube([[0, 0.25, 0], [0.02, 0.33, 0], [0.07, 0.37, 0]], [0.03, 0.02, 0.015], 5, 4), '#4d8c3a')],
};
const TREE = ['oak', 'magic', 'autumn', 'snowpine'];
const DECOR = [['flowers', 'grass', 'grass', 'flowers', 'rock'], ['mushroom', 'grass', 'mushroom', 'flowers'], ['pumpkin', 'rock', 'grass', 'flowers'], ['crystal', 'rock', 'crystal']];

/* ---------- Contenido de casillas ---------- */
const GEM_COL = ['#37e07f', '#37e07f', '#37e07f', '#3fb8ff', '#ff4f9a', '#c062ff'];
function gemMesh(n) {
  const g = new THREE.Group();
  const col = GEM_COL[Math.min(n, 5)];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * 6.283, r = n === 1 ? 0 : 0.2;
    const m = mesh(paint(loft([{ y: -0.17, r: 0.01 }, { y: 0.03, r: 0.13 }, { y: 0.1, r: 0.08 }], 6), col), matGlow);
    m.position.set(Math.sin(a) * r, 0.36 + (i % 2) * 0.1, Math.cos(a) * r);
    g.add(m);
  }
  g.userData.spin = 1.1;
  return g;
}
function chestMesh() {
  const g = new THREE.Group();
  g.add(mesh([paint(at(box(0.56, 0.28, 0.38), { p: [0, 0.14, 0] }), '#a2612c'), paint(at(loft([{ y: -0.28, r: 0.19 }, { y: 0.28, r: 0.19 }], 10), { r: [0, 0, Math.PI / 2], s: [1, 0.75, 1], p: [0, 0.28, 0] }), '#b87236')]));
  g.add(mesh([-0.2, 0.2].map((x) => paint(at(loft([{ y: -0.035, r: 0.205 }, { y: 0.035, r: 0.205 }], 10), { r: [0, 0, Math.PI / 2], s: [1, 0.75, 1], p: [x, 0.28, 0] }), '#ffc93c')).concat(paint(at(box(0.6, 0.05, 0.41), { p: [0, 0.27, 0] }), '#ffc93c'), paint(at(box(0.1, 0.13, 0.06), { p: [0, 0.26, 0.2] }), '#ffe9a0')), matMetal));
  return g;
}
function trapMesh(kind) {
  const g = new THREE.Group();
  if (kind === 'pozo') {
    g.add(mesh([paint(at(cyl(0.42, 0.3, 0.02, 9), { p: [0, 0.015, 0] }), '#1b1026'), ...Array.from({ length: 9 }, (_, i) => { const a = (i / 9) * 6.283; return paint(at(ico(0.1 + (i % 3) * 0.025), { p: [Math.sin(a) * 0.46, 0.04, Math.cos(a) * 0.46] }), i % 2 ? '#6d5b62' : '#8a7780'); })]));
  } else if (kind === 'zarzas') {
    g.add(mesh([0, 1, 2, 3, 4].flatMap((i) => {
      const a = (i / 5) * 6.283, p = (q, r, y) => [Math.sin(a + q) * r, y, Math.cos(a + q) * r];
      return [paint(tube([p(0, 0.55, 0), p(0.3, 0.45, 0.28), p(0.8, 0.4, 0.2), p(1.2, 0.5, 0)], [0.05, 0.04, 0.035, 0.02], 5, 9), '#5b2a55'), ...[0.25, 0.55, 0.85].map((q) => paint(at(cone(0.03, 0.14, 4), { r: [q, a, 0.6], p: p(q, 0.46, 0.3 - Math.abs(q - 0.45) * 0.25) }), '#e0447c'))];
    })));
  } else if (kind === 'urraca') {
    const b = new THREE.Group();
    b.add(mesh([
      paint(tube([[0, 0, 0], [0.03, 0.3, 0], [-0.1, 0.55, 0], [0.12, 0.72, 0]], [0.06, 0.045, 0.035, 0.015], 5, 8), '#6e4026'),
      paint(at(loft([{ y: -0.22, r: 0.02 }, { y: -0.05, rx: 0.12, rz: 0.11 }, { y: 0.1, rx: 0.1, rz: 0.1 }, { y: 0.2, r: 0.04 }], 8), { r: [0.9, 0, 0], p: [0, 0.86, 0] }), '#f4f1ff'),
      paintBy(at(loft([{ y: -0.2, r: 0.02 }, { y: 0, rx: 0.14, rz: 0.06 }, { y: 0.12, r: 0.03 }], 7), { r: [0.9, 0, 0], p: [0, 0.93, -0.04] }), () => '#2a2440'),
      paint(at(ico(0.11, 1), { p: [0, 1.02, 0.13] }), '#2a2440'),
      paint(at(cone(0.04, 0.14, 4), { r: [Math.PI / 2, 0, 0], p: [0, 1.0, 0.28] }), '#ffbe2e'),
      paint(at(box(0.09, 0.02, 0.42), { r: [-0.4, 0, 0], p: [0, 0.86, -0.32] }), '#3d4f9e'),
    ]));
    b.add(mesh([paint(at(octa(0.07), { p: [0, 0.94, 0.33] }), '#ffd84a'), ...[1, -1].map((s) => paint(at(ball(0.022, 6, 4), { p: [s * 0.08, 1.06, 0.19] }), '#fff6c9'))], matGlow));
    b.position.set(0, 0, -0.45);
    g.add(b);
  } else {
    // Duende asomado con orejas, capucha y ojos brillantes.
    const b = new THREE.Group();
    b.add(mesh([
      paint(loft([{ y: 0, r: 0.2 }, { y: 0.18, r: 0.16 }, { y: 0.3, r: 0.1 }], 8), '#6a3f2a'),
      paint(at(loft([{ y: 0, rx: 0.06, rz: 0.06, z: 0.04 }, { y: 0.06, rx: 0.15, rz: 0.13 }, { y: 0.16, rx: 0.18, rz: 0.15 }, { y: 0.28, rx: 0.1, rz: 0.1 }], 9), { p: [0, 0.26, 0.02] }), '#6fb548'),
      ...[1, -1].map((s) => paint(tube([[s * 0.14, 0.42, 0], [s * 0.27, 0.48, -0.02], [s * 0.4, 0.56, -0.05]], [0.06, 0.045, 0.005], 5, 5, 0.5), '#6fb548')),
      paint(tube([[0, 0.4, 0.14], [0, 0.39, 0.22], [0, 0.35, 0.26]], [0.035, 0.03, 0.008], 5, 5), '#5da03b'),
      paint(tube([[0, 0.45, -0.02], [0, 0.62, -0.06], [0.06, 0.74, -0.16]], [0.19, 0.12, 0.01], 8, 6), '#a03a2e'),
    ]));
    b.add(mesh([1, -1].map((s) => paint(at(ball(0.035, 7, 5), { p: [s * 0.075, 0.45, 0.14] }), '#ffe94a')), matGlow));
    b.position.set(0.1, 0, -0.42);
    g.add(b);
  }
  return g;
}
function portalMesh() {
  const g = new THREE.Group();
  const ring = new THREE.Group();
  ring.add(mesh(paint(ringGeo(0.6, 0.075, 12, 5), '#6f5a86')));
  ring.add(mesh(Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * 6.283; return paint(at(octa(0.07), { p: [Math.cos(a) * 0.6, Math.sin(a) * 0.6, 0.07] }), '#d9a8ff'); }), matGlow));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.06;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(0.58, 24), new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, uniforms: { t: { value: 0 } },
    vertexShader: 'varying vec2 u; void main(){ u=uv*2.-1.; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: 'varying vec2 u; uniform float t; void main(){ float r=length(u),a=atan(u.y,u.x); float s=sin(a*3.+r*9.-t*4.)*.5+.5; vec3 c=mix(vec3(.28,.08,.62),vec3(.75,.5,1.),s); c+=vec3(.6,.7,1.)*smoothstep(.35,0.,r); gl_FragColor=vec4(c,.92); }',
  }));
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.07;
  g.add(ring, disc);
  g.userData.portal = disc.material.uniforms.t;
  return g;
}
function shrineMesh() {
  const g = new THREE.Group();
  const b = new THREE.Group();
  b.add(mesh([
    paint(loft([{ y: 0, r: 0.34 }, { y: 0.07, r: 0.34 }, { y: 0.08, r: 0.28 }, { y: 0.14, r: 0.28 }], 8), '#d9cfe6'),
    paint(at(cyl(0.1, 0.13, 0.34, 8), { p: [0, 0.3, 0] }), '#eee7f7'),
    paint(loft([{ y: 0.42, r: 0.1 }, { y: 0.5, r: 0.25 }, { y: 0.56, r: 0.27 }], 10, { capTop: false }), '#d9cfe6'),
  ]));
  b.add(mesh([paint(at(cyl(0.23, 0.23, 0.02, 10), { p: [0, 0.53, 0] }), '#5fe9e0'), paint(at(octa(0.12), { s: [0.8, 1.4, 0.8], p: [0, 0.85, 0] }), '#a6fff2')], matGlow));
  b.position.set(0, 0, -0.42);
  g.add(b);
  return g;
}

/* ---------- Castillo y salida ---------- */
function castleMesh() {
  const g = new THREE.Group();
  const stone = (v) => (v.y > 1.1 ? '#f7e9f4' : '#dccbe0'), geo = [], metal = [], glow = [];
  const tower = (x, z, r, h, roof = '#e0568f') => {
    geo.push(paintBy(at(loft([{ y: 0, r: r * 1.15 }, { y: 0.2, r }, { y: h - 0.12, r: r * 0.96 }, { y: h, r: r * 1.22 }, { y: h + 0.14, r: r * 1.22 }], 9), { p: [x, 0, z] }), stone));
    geo.push(paintBy(at(loft([{ y: 0, r: r * 1.35 }, { y: h * 0.18, r: r * 0.9 }, { y: h * 0.5, r: 0.015 }], 9), { p: [x, h + 0.14, z] }), (v) => (v.x < x ? roof : new THREE.Color(roof).multiplyScalar(0.8))));
    const fy = h + 0.14 + h * 0.5;
    metal.push(paint(at(cyl(0.015, 0.015, 0.4, 5), { p: [x, fy + 0.15, z] }), '#ffc93c'));
    geo.push(paint(at(new THREE.ConeGeometry(0.1, 0.3, 3), { r: [0, 0, -Math.PI / 2], s: [1, 1, 0.2], p: [x + 0.16, fy + 0.26, z] }), '#57c7ff'));
    for (let a = 0; a < 3; a++) glow.push(paint(at(box(0.07, 0.17, 0.05), { r: [0, a * 2.1 - 1.2, 0], p: [x + Math.sin(a * 2.1 - 1.2) * r * 0.97, h * 0.72, z + Math.cos(a * 2.1 - 1.2) * r * 0.97] }), '#ffd36b'));
  };
  const wall = (x, z, w, d) => {
    geo.push(paintBy(at(box(w, 1.05, d), { p: [x, 0.52, z] }), stone));
    const L = Math.max(w, d), n = Math.round(L / 0.26);
    for (let i = 0; i < n; i++) { const q = -L / 2 + (i + 0.5) * (L / n); geo.push(paint(at(box(0.14, 0.15, 0.14), { p: [x + (w > d ? q : 0), 1.12, z + (w > d ? 0 : q)] }), '#f7e9f4')); }
  };
  wall(0.95, -1.15, 1.9, 0.22); wall(0.95, 1.15, 1.9, 0.22); wall(0, 0.82, 0.22, 0.7); wall(0, -0.82, 0.22, 0.7); wall(1.9, 0, 0.22, 2.3);
  tower(0, -1.15, 0.3, 1.7); tower(0, 1.15, 0.3, 1.7); tower(1.9, -1.15, 0.32, 2.2, '#7a6ce0'); tower(1.9, 1.15, 0.32, 2.2, '#7a6ce0');
  tower(1.15, 0, 0.55, 3.1, '#e0568f'); tower(1.3, -0.62, 0.22, 2.6, '#7a6ce0'); tower(1.2, 0.62, 0.22, 2.3, '#7a6ce0');
  geo.push(paint(at(box(0.3, 0.35, 1.0), { p: [0, 1.15, 0] }), '#f0dfec'));
  const door = mesh([paint(at(box(0.06, 0.86, 0.9), { p: [0.02, 0.43, 0] }), '#4a2d5c')]);
  g.add(mesh(geo), mesh(metal, matMetal), mesh(glow, matGlow, false), door);
  const crown = mesh([paint(loft([{ y: 0, r: 0.3 }, { y: 0.1, r: 0.32 }], 14, { capTop: false, capBottom: false }), '#ffc93c'), ...Array.from({ length: 7 }, (_, i) => { const a = (i / 7) * 6.283; return paint(at(cone(0.1, 0.26, 4), { r: [0, a, 0], p: [Math.sin(a) * 0.31, 0.2, Math.cos(a) * 0.31] }), '#ffc93c'); })], matMetal);
  crown.position.set(0, 2.4, 0);
  crown.scale.setScalar(1.3);
  g.add(crown);
  g.userData.crown = crown;
  g.scale.setScalar(1.2);
  return g;
}
function campMesh() {
  const g = new THREE.Group();
  const tent = (x, z, c1, c2, r) => [paintBy(at(loft([{ y: 0, r: 0.55 }, { y: 0.5, r: 0.42 }, { y: 0.55, r: 0.5 }, { y: 1.15, r: 0.02 }], 10), { r: [0, r, 0], p: [x, 0, z] }), (v) => (Math.floor(((Math.atan2(v.x - x, v.z - z) + 3.1416) / 6.2832) * 10) % 2 ? c1 : c2)), paint(at(cyl(0.02, 0.02, 0.35, 5), { p: [x, 1.25, z] }), '#8a5a35'), paint(at(new THREE.ConeGeometry(0.08, 0.24, 3), { r: [0, 0, -Math.PI / 2], s: [1, 1, 0.2], p: [x + 0.13, 1.36, z] }), c1)];
  g.add(mesh([...tent(-1.15, -1.85, '#ff7fb5', '#fff3f6', 0), ...tent(-1.15, 1.85, '#4b86f0', '#f1f6ff', 0)]));
  g.position.x = -1.5;
  return g;
}

export class BoardView {
  constructor(stage, board) {
    this.stage = stage;
    this.board = board;
    this.group = new THREE.Group();
    stage.scene.add(this.group);
    this.contents = new Map();
    this.critters = new Map();
    this.guards = new Map();
    this.shade = 0;
    this.rng = makeRng(board.seed + 99);
    this.buildTiles();
    this.buildProps();
    this.buildMist();
    this.buildMystery();
    this.buildHighlights();
    this.stars = new Map();
    for (const t of board.tiles) if (t.star) this.addStar(t.id);
    for (const t of board.tiles) if (t.revealed) this.spawn(t, true);

    const t = board.tiles[board.castleId], s = board.tiles[board.startId];
    this.castle = castleMesh();
    this.castle.position.set(t.x + 0.95, t.h - 0.02, t.z);
    this.camp = campMesh();
    this.camp.position.set(s.x - 0.35, s.h - 0.15, s.z);
    const island = mesh(paintBy(loft([{ y: -1.6, r: 2.6 }, { y: -0.12, r: 3.0, wave: [7, 0.05] }, { y: 0, r: 2.8, wave: [7, 0.05] }], 18), (v) => (v.y > -0.1 ? '#dfe8ff' : '#8d82a8')));
    island.position.set(t.x + 2.4, t.h, t.z);
    const beach = mesh(paintBy(loft([{ y: -1.2, r: 1.8 }, { y: -0.1, r: 2.1, wave: [6, 0.05] }, { y: 0, r: 1.95, wave: [6, 0.05] }], 16), (v) => (v.y > -0.1 ? '#8fd45c' : '#a9825a')));
    beach.position.set(s.x - 1.6, s.h - 0.16, s.z);
    this.group.add(this.castle, this.camp, island, beach);

    const xs = board.tiles.map((q) => q.x), zs = board.tiles.map((q) => q.z);
    stage.bounds = { x0: Math.min(...xs), x1: Math.max(...xs), z0: Math.min(...zs), z1: Math.max(...zs) };
    const zero = new THREE.Matrix4().makeScale(0, 0, 0);
    for (let i = 0; i < this.board.tiles.length; i++) this.gloom.setMatrixAt(i, zero);
    this.upd = (dt, time) => this.update(dt, time);
    stage.updaters.push(this.upd);
  }

  dispose() {
    this.stage.updaters.splice(this.stage.updaters.indexOf(this.upd), 1);
    this.stage.scene.remove(this.group);
    this.group.traverse((o) => { o.geometry?.dispose(); });
  }

  pos(id, y = 0) {
    const t = this.board.tiles[id];
    return new THREE.Vector3(t.x, t.h + y, t.z);
  }

  baseColor(t) {
    if (t.ice) return t.rand < 0.5 ? '#cfeeff' : '#e4f6ff';
    if (t.kind === 'lake') return '#4cc3dd';
    if (t.kind === 'shore') return ['#f3dca0', '#cbb98a', '#e9b36a', '#c9d6f0'][t.biome];
    if (t.kind === 'mountain') return ['#8fb070', '#5a9a85', '#c99a52', '#cfd9ee'][t.biome];
    const g = GROUND[t.biome];
    return g[Math.floor(t.rand * g.length)];
  }

  topColor(t) {
    const c = new THREE.Color(this.baseColor(t));
    const k = t.revealed && t.content && TYPE_COLOR[t.content.type];
    if (t.burnt) c.lerp(new THREE.Color('#4a3a44'), 0.6);
    if (k) c.lerp(new THREE.Color(k), 0.62);
    return this.shaded(t) ? c.lerp(SHADE_COL, 0.7) : c;
  }

  buildTiles() {
    const tiles = this.board.tiles;
    const g = paintBy(prism(HEX, HEX - 0.02, 2.2), (v) => (v.y > -0.02 ? '#ffffff' : v.y > -0.09 ? '#f2e6d4' : v.y > -0.8 ? '#a37d63' : '#7b5a57'));
    this.tiles = new THREE.InstancedMesh(g, mat.clone(), tiles.length);
    this.tiles.castShadow = this.tiles.receiveShadow = true;
    this.lift = new Float32Array(tiles.length);
    tiles.forEach((t) => { this.placeTile(t, 0); this.tiles.setColorAt(t.id, this.topColor(t)); });
    this.tiles.frustumCulled = false;
    this.group.add(this.tiles);
  }

  placeTile(t, flip, lift = 0) {
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), flip);
    m.compose(new THREE.Vector3(t.x, t.h + lift, t.z), q, new THREE.Vector3(1, 1, 1));
    this.tiles.setMatrixAt(t.id, m);
    this.tiles.instanceMatrix.needsUpdate = true;
  }

  buildProps() {
    const put = {};
    let owner = 0;
    const add = (name, x, y, z, s, r) => (put[name] ||= []).push([x, y, z, s, r, owner]);
    const R = this.rng;
    for (const t of this.board.tiles) {
      owner = t.id;
      if (t.id === this.board.castleId || t.id === this.board.startId || t.landmark || t.ice) continue;
      if (t.c < 2 && t.kind !== 'path') { if (R.chance(0.6)) add('flowers', t.x, t.h, t.z, 1, t.rand * 6); continue; }
      const scatter = (name, n, rad, s0, s1) => {
        const off = R.next() * 6.283;
        for (let i = 0; i < n; i++) {
          const a = off + (i / n) * 6.283 + R.next() * 0.5, d = rad * (0.75 + R.next() * 0.3);
          add(name, t.x + Math.sin(a) * d, t.h, t.z + Math.cos(a) * d, s0 + R.next() * (s1 - s0), R.next() * 6.283);
        }
      };
      if (t.kind === 'grove') {
        scatter(TREE[t.biome], 3, 0.48, 0.8, 1.1);
        scatter(t.biome === 1 ? 'mushroom' : t.biome === 3 ? 'snowpine' : 'pine', 2, 0.42, 0.65, 0.85);
      } else if (t.kind === 'mountain') {
        add('mountain', t.x, t.h - 0.04, t.z, t.outer ? 0.75 + R.next() * 0.3 : 0.95 + R.next() * 0.25, R.next() * 6.283);
      } else if (t.kind === 'lake') {
        if (R.chance(0.6)) scatter('lily', 2, 0.4, 0.8, 1.1);
        if (t.biome === 3) scatter('crystal', 1, 0.5, 0.6, 0.9);
      } else if (t.kind === 'shore') {
        if (R.chance(0.35)) scatter('rock', 1, 0.4, 0.6, 1.1);
        else if (R.chance(0.3)) scatter(TREE[t.biome], 1, 0.3, 0.7, 1.0);
      } else {
        scatter(R.pick(DECOR[t.biome]), R.int(1, 2), 0.66, 0.6, 0.9);
        if (R.chance(0.3)) scatter('grass', 2, 0.7, 0.7, 1);
        if (R.chance(0.16)) scatter(TREE[t.biome], 1, 0.68, 0.45, 0.6);
      }
    }
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0);
    this.props = new Map();
    for (const [name, list] of Object.entries(put)) {
      const im = new THREE.InstancedMesh(merge(PROPS[name]()), name === 'crystal' ? matGlow : mat, list.length);
      list.forEach(([x, y, z, s, r, id], i) => {
        im.setMatrixAt(i, m.compose(new THREE.Vector3(x, y, z), q.setFromAxisAngle(up, r), new THREE.Vector3(s, s, s)));
        if (!this.props.has(id)) this.props.set(id, []);
        this.props.get(id).push({ im, i, x, y, z, s, r });
      });
      im.castShadow = name !== 'grass' && name !== 'flowers';
      im.receiveShadow = true;
      im.frustumCulled = false;
      this.group.add(im);
    }
  }

  // Niebla: nubecitas sobre lo que nadie ha explorado.
  buildMist() {
    const geo = merge([[0, 0, 0, 0.62], [0.5, -0.08, 0.2, 0.42], [-0.45, -0.06, 0.25, 0.45], [0.1, -0.08, -0.5, 0.44]].map(([x, y, z, s]) => paintBy(at(ico(s, 1), { s: [1, 0.68, 1], p: [x, y, z] }), (v) => (v.y > 0.12 ? '#fdf6ff' : v.y > -0.1 ? '#e6d6f5' : '#c9b3e4'))));
    const list = this.board.tiles.filter((t) => t.kind === 'path' && !t.seen && !t.landmark && t.id !== this.board.castleId);
    this.mist = new THREE.InstancedMesh(geo, mat, Math.max(1, list.length));
    this.mist.frustumCulled = false;
    this.mistData = new Map();
    list.forEach((t, i) => this.mistData.set(t.id, { i, s: 0.95 + t.rand * 0.3, r: t.rand * 6, goal: 1, k: 1 }));
    this.group.add(this.mist);
    // Niebla oscura de la Sombra: una nube baja por casilla, que crece al cubrirla.
    const dark = merge([[0, 0, 0, 0.7], [0.5, -0.1, 0.25, 0.5], [-0.5, -0.08, 0.2, 0.52], [0.1, -0.1, -0.5, 0.5]].map(([x, y, z, s]) => paintBy(at(ico(s, 1), { s: [1, 0.45, 1], p: [x, y, z] }), (v) => (v.y > 0.05 ? '#4b3a66' : '#2a1f3c'))));
    this.gloom = new THREE.InstancedMesh(dark, mat, this.board.tiles.length);
    this.gloom.frustumCulled = false;
    this.gloomK = new Float32Array(this.board.tiles.length);
    this.gloomGoal = new Float32Array(this.board.tiles.length);
    this.group.add(this.gloom);
  }

  // Signo de pregunta grabado: todas las casillas sin explorar lucen igual.
  buildMystery() {
    const geo = merge([
      paint(tube([[-0.15, 0, -0.17], [-0.12, 0, -0.3], [0.02, 0, -0.36], [0.15, 0, -0.27], [0.12, 0, -0.12], [0.01, 0, -0.02], [0, 0, 0.1]], [0.05, 0.055, 0.055, 0.05], 5, 14, 0.55), '#fff6df'),
      paint(at(octa(0.07), { s: [1, 0.6, 1], p: [0, 0, 0.25] }), '#fff6df'),
    ]);
    const list = this.board.tiles.filter((t) => this.hidden(t));
    this.mystery = new THREE.InstancedMesh(geo, mat, list.length + 80);
    this.mystery.count = list.length; // sobra espacio para caminos nuevos
    this.mystery.frustumCulled = false;
    this.mystery.castShadow = true;
    this.mystIds = new Map(list.map((t, i) => [t.id, i]));
    this.group.add(this.mystery);
  }
  addMystery(id) {
    if (this.mystIds.has(id) || this.mystery.count >= this.mystery.instanceMatrix.count) return;
    this.mystIds.set(id, this.mystery.count++);
  }
  hidden(t) { return t.kind === 'path' && t.content && t.content.type !== 'visited' && !t.revealed; }

  buildHighlights() {
    const g = loft([{ y: 0, r: 0.8 }, { y: 0.05, r: 0.86 }, { y: 0.05, r: 0.74 }, { y: 0, r: 0.72 }], 6, { capTop: false, capBottom: false });
    this.hiMat = new THREE.MeshBasicMaterial({ color: '#fff2a8', transparent: true, opacity: 0.95, side: THREE.DoubleSide, depthWrite: false, depthTest: false });
    this.hi = new THREE.InstancedMesh(g, this.hiMat, 60);
    this.hi.count = 0;
    this.hi.frustumCulled = false;
    const f = new THREE.CircleGeometry(0.76, 6, Math.PI / 6).rotateX(-Math.PI / 2);
    this.fillMat = new THREE.MeshBasicMaterial({ color: '#fff2a8', transparent: true, opacity: 0.35, depthWrite: false, depthTest: false });
    this.fill = new THREE.InstancedMesh(f, this.fillMat, 60);
    this.fill.count = 0;
    this.fill.frustumCulled = false;
    this.dots = new THREE.InstancedMesh(paint(octa(0.11), '#ffffff'), new THREE.MeshBasicMaterial({ color: '#fff6c9', transparent: true, depthTest: false }), 40);
    this.dots.count = 0;
    this.dots.frustumCulled = false;
    // Flecha flotante: marca el destino aunque haya montañas o nubes delante.
    const arrow = merge([paint(at(cone(0.24, 0.36, 4), { r: [Math.PI, 0, 0], p: [0, 0.18, 0] }), '#ffffff'), paint(at(cone(0.15, 0.22, 4), { r: [Math.PI, 0, 0], p: [0, 0.5, 0] }), '#ffffff')]);
    this.arrowMat = new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, depthTest: false, depthWrite: false });
    this.arrow = new THREE.InstancedMesh(arrow, this.arrowMat, 60);
    this.arrow.count = 0;
    this.arrow.frustumCulled = false;
    this.arrow.renderOrder = 4;
    this.group.add(this.arrow);
    this.fill.renderOrder = 2; this.hi.renderOrder = 3; this.dots.renderOrder = 4;
    this.group.add(this.hi, this.fill, this.dots);
    this.zoneMat = new THREE.MeshBasicMaterial({ color: '#ff5a2b', transparent: true, opacity: 0.4, depthWrite: false, depthTest: false });
    this.zoneMesh = new THREE.InstancedMesh(f, this.zoneMat, 60);
    this.zoneMesh.count = 0;
    this.zoneMesh.frustumCulled = false;
    this.zoneMesh.renderOrder = 1;
    this.group.add(this.zoneMesh);
    this.optIds = [];
  }

  /* ---------- La Sombra ---------- */
  // Pasos desde la salida; lo que no es camino toma el valor de su vecino de camino más atrasado.
  progOf(t) {
    const L = this.board.length;
    if (t.dist != null) return L - t.dist;
    const near = this.board.around(t).filter((n) => n.dist != null).map((n) => L - n.dist);
    return near.length ? Math.min(...near) : null;
  }
  shaded(t) { const p = this.shade > 0 ? this.progOf(t) : null; return p != null && p < this.shade; }

  async setShade(front, anim) {
    const was = new Set(this.board.tiles.filter((t) => this.shaded(t)).map((t) => t.id));
    this.shade = front;
    // En el modo juntos la Sombra puede retroceder: esas casillas vuelven a la luz.
    const back = this.board.tiles.filter((t) => was.has(t.id) && !this.shaded(t));
    if (back.length) {
      this.recolor(back.map((t) => t.id));
      back.forEach((t) => { this.gloomGoal[t.id] = 0; if (anim) this.stage.sparks.burst(t.x, t.h + 0.3, t.z, 4, { color: ['#fff3a0', '#ffffff'], speed: 1, up: 1.2, life: 0.8, size: 0.22 }); });
    }
    const now = this.board.tiles.filter((t) => this.shaded(t) && !was.has(t.id));
    if (!now.length) return;
    if (!anim) { this.recolor(now.map((t) => t.id)); now.forEach((t) => { this.gloomGoal[t.id] = 1; this.gloomK[t.id] = 1; }); return; }
    const p0 = Math.min(...now.map((t) => this.progOf(t)));
    await Promise.all(now.map((t) => this.stage.wait((this.progOf(t) - p0) * 0.25 + t.rand * 0.15).then(() => {
      this.recolor([t.id]);
      this.gloomGoal[t.id] = 1;
      this.stage.smoke.burst(t.x, t.h + 0.2, t.z, 3, { color: ['#2e2342', '#4b3a66'], speed: 0.5, up: 0.9, life: 1.4, size: 0.6, grow: 0.5, alpha: 0.75 });
    })));
  }

  /* ---------- Guardianes del Rey ---------- */
  // Esperan en el camino, mirando hacia la salida, con un aura morada.
  addGuard(q) {
    const f = makeFoe(q.kind), p = this.pos(q.tile), s = this.board.tiles[this.board.startId];
    f.root.position.copy(p);
    f.root.rotation.y = Math.atan2(s.x - p.x, s.z - p.z);
    if (q.kind === 'rey') f.root.scale.setScalar(1.1);
    f.post = q.tile;
    f.aura = new THREE.Mesh(new THREE.RingGeometry(0.45, 0.62, 28).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#b14bff', transparent: true, opacity: 0.7, depthWrite: false }));
    f.aura.position.copy(p).setY(p.y + 0.04);
    this.group.add(f.root, f.aura);
    this.guards.set(q.i, f);
  }

  // El guardián salta hasta donde se detuvo quien llegó (si tomó otro camino).
  async guardTo(i, id, by) {
    const f = this.guards.get(i);
    if (!f) return;
    const a = f.root.position.clone(), b = this.pos(id).add(new THREE.Vector3(0.55, 0, 0.35));
    f.root.rotation.y = Math.atan2(by.x - b.x, by.z - b.z);
    f.set('cheer', 1.4);
    if (a.distanceTo(b) > 0.05) await this.stage.tween(0.55, (k) => { f.root.position.lerpVectors(a, b, k); f.root.position.y += Math.sin(k * Math.PI) * 1.2; }, ease.lin);
    f.aura.position.copy(b).setY(b.y + 0.04);
  }

  // Modo juntos: si el guardián gana, vuelve a su puesto a seguir cerrando el paso.
  async guardHome(i) {
    const f = this.guards.get(i);
    if (!f) return;
    f.set('cheer', 1.4);
    const a = f.root.position.clone(), b = this.pos(f.post), s = this.board.tiles[this.board.startId];
    if (a.distanceTo(b) > 0.05) await this.stage.tween(0.55, (k) => { f.root.position.lerpVectors(a, b, k); f.root.position.y += Math.sin(k * Math.PI) * 1.2; }, ease.lin);
    f.root.rotation.y = Math.atan2(s.x - b.x, s.z - b.z);
    f.aura.position.copy(b).setY(b.y + 0.04);
  }

  // Al terminar el minijuego el guardián se va: derrotado entre chispas, o riéndose entre humo.
  async removeGuard(i, won) {
    const f = this.guards.get(i);
    if (!f) return;
    this.guards.delete(i);
    const p = f.root.position.clone(), s0 = f.root.scale.x;
    f.set(won ? 'hurt' : 'cheer');
    if (won) this.stage.sparks.burst(p.x, p.y + 0.8, p.z, 40, { color: ['#fff3a0', '#ffffff', '#b8f4ff'], speed: 2.4, up: 1.6, life: 0.9, size: 0.26 });
    this.stage.smoke.burst(p.x, p.y + 0.5, p.z, 16, { color: ['#3b2f52', '#6a2fa0'], speed: 1.2, up: 1.2, life: 1, size: 0.5, grow: 0.4, alpha: 0.8 });
    await this.stage.wait(0.6);
    await this.stage.tween(0.5, (k) => { f.root.scale.setScalar(Math.max(0.01, s0 * (1 - k))); f.aura.material.opacity = 0.7 * (1 - k); }, ease.lin);
    this.group.remove(f.root, f.aura);
  }

  /* ---------- Criaturas ---------- */
  critterPos(id) { return this.pos(id).add(new THREE.Vector3(0.18, 0, -0.12)); }

  addCritter(c, pop) {
    const m = makeCritter(c.kind);
    m.position.copy(this.critterPos(c.tile));
    m.rotation.y = this.rng.next() * 6.283;
    m.userData.phase = this.rng.next() * 6;
    this.group.add(m);
    this.critters.set(c.id, m);
    if (!pop) return Promise.resolve();
    const p = m.position;
    this.stage.sparks.burst(p.x, p.y + 0.4, p.z, 18, { color: ['#fff3a0', '#ffffff'], speed: 1.6, up: 1.4, g: 2, life: 0.8, size: 0.22 });
    return this.stage.tween(0.45, (k) => m.scale.setScalar(Math.max(0.01, k)), ease.back);
  }

  moveCritters(moves) {
    return Promise.all(moves.map(({ id, to }, i) => {
      const m = this.critters.get(id);
      if (!m) return null;
      const a = m.position.clone(), b = this.critterPos(to), top = Math.max(0, b.y - a.y) + 0.35;
      return this.stage.wait(i * 0.08).then(() => {
        m.rotation.y = Math.atan2(b.x - a.x, b.z - a.z);
        return this.stage.tween(0.4, (k) => { m.position.lerpVectors(a, b, k); m.position.y += Math.sin(k * Math.PI) * top; }, ease.lin);
      });
    }));
  }

  // happy: se va dando saltos de alegría; si no, se esfuma entre humo.
  async removeCritter(id, happy) {
    const m = this.critters.get(id);
    if (!m) return;
    this.critters.delete(id);
    const p = m.position.clone();
    if (happy) this.stage.sparks.burst(p.x, p.y + 0.5, p.z, 24, { color: ['#fff3a0', '#ffb3e0', '#b8f4ff'], speed: 2, up: 1.6, g: 2, life: 1, size: 0.24 });
    else this.stage.smoke.burst(p.x, p.y + 0.3, p.z, 10, { color: ['#4b3a66', '#6c6a86'], speed: 1, up: 1, life: 0.9, size: 0.45, grow: 0.4, alpha: 0.8 });
    await this.stage.tween(0.45, (k) => { m.position.y = p.y + (happy ? k * 1.4 : 0); m.rotation.y += 0.25; m.scale.setScalar(Math.max(0.01, 1 - k * k)); }, ease.lin);
    this.group.remove(m);
  }

  // Casillas que el dragón va a quemar.
  setZone(ids) {
    const list = (ids || []).slice(0, 60);
    this.zoneMesh.count = list.length;
    list.forEach((id, i) => this.zoneMesh.setMatrixAt(i, new THREE.Matrix4().setPosition(this.pos(id, 0.025))));
    this.zoneMesh.instanceMatrix.needsUpdate = true;
  }

  recolor(ids) {
    for (const id of ids) this.tiles.setColorAt(id, this.topColor(this.board.tiles[id]));
    this.tiles.instanceColor.needsUpdate = true;
  }

  putProp(o, x, y, z, s, r = o.r, tilt = 0) {
    const e = new THREE.Euler(tilt, r, tilt * 0.6);
    o.im.setMatrixAt(o.i, new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(e), new THREE.Vector3(s, s, s)));
    o.im.instanceMatrix.needsUpdate = true;
  }

  hideProps(id, dur = 0.6) {
    const list = this.props.get(id) || [];
    this.props.delete(id);
    if (list.length) this.stage.tween(dur, (k) => list.forEach((o) => this.putProp(o, o.x, o.y, o.z, o.s * Math.max(0.0001, 1 - k))));
  }

  // Los árboles saltan con sus raíces de una casilla a otra.
  async walkForest(moves) {
    const T = this.board.tiles, trips = moves.map((mv) => ({ ...mv, list: this.props.get(mv.from) || [] }));
    for (const { from, to } of trips) {
      this.hideProps(to);
      const c = this.contents.get(to);
      if (c) { this.contents.delete(to); this.group.remove(c); }
      const d = this.mistData.get(to);
      if (d) d.goal = 0;
      this.props.delete(from);
    }
    let puff = 0;
    await this.stage.tween(2.6, (k, t) => {
      const dust = t > puff;
      if (dust) puff += 0.045;
      for (const { from, to, list } of trips) {
        const a = T[from], b = T[to], y = THREE.MathUtils.lerp(a.h, b.h, k);
        list.forEach((o, j) => {
          const hop = Math.abs(Math.sin(t * Math.PI * 7 + j)) * 0.55 * Math.sin(t * Math.PI);
          const x = o.x + (b.x - a.x) * k, z = o.z + (b.z - a.z) * k;
          this.putProp(o, x, o.y - a.h + y + hop, z, o.s, o.r + k * 1.2, Math.sin(t * Math.PI * 14 + j) * 0.22 * Math.sin(t * Math.PI));
          if (dust && j % 2 === 0) this.stage.smoke.emit({ x, y: y + 0.1, z, vy: 0.5, vx: Math.random() - 0.5, vz: Math.random() - 0.5, color: '#8a6a4c', size: 0.3, life: 0.7, alpha: 0.7, grow: 0.4 });
        });
      }
    }, ease.inOut);
    for (const { from, to, list } of trips) {
      const a = T[from], b = T[to];
      list.forEach((o) => Object.assign(o, { x: o.x + b.x - a.x, y: o.y + b.h - a.h, z: o.z + b.z - a.z, r: o.r + 1.2 }));
      this.props.set(to, list);
      this.addMystery(from);
      this.stage.sparks.burst(a.x, a.h + 0.4, a.z, 22, { color: ['#8affc0', '#fff0a0'], speed: 2, up: 1.5, g: 2, life: 1, size: 0.26 });
    }
    this.recolor(moves.flatMap((mv) => [mv.from, mv.to]));
  }

  async freeze(ids) {
    const t0 = Math.min(...ids.map((id) => this.board.tiles[id].x));
    for (const id of ids) {
      const t = this.board.tiles[id];
      this.stage.wait(Math.min(1.6, (t.x - t0) * 0.04)).then(() => {
        this.hideProps(id);
        this.recolor([id]);
        this.addMystery(id);
        this.stage.sparks.burst(t.x, t.h + 0.2, t.z, 10, { color: ['#cfefff', '#ffffff', '#9fd8ff'], speed: 1.6, up: 1.4, g: 1.5, life: 1.1, size: 0.24 });
        this.stage.tween(0.5, (k) => this.placeTile(t, 0, Math.sin(k * Math.PI) * 0.16));
      });
    }
    await this.stage.wait(2.2);
  }

  addStar(id, fall) {
    const t = this.board.tiles[id], m = starMesh();
    const y = t.h + 0.75;
    m.position.set(t.x, y, t.z);
    m.userData.y = y;
    this.group.add(m);
    this.stars.set(id, m);
    if (!fall) return Promise.resolve();
    m.visible = false;
    return this.stage.wait(fall * 0.16).then(() => {
      m.visible = true;
      return this.stage.tween(0.7, (k) => {
        const u = 1 - k;
        m.userData.y = y + u * 11;
        m.position.set(t.x - u * 5, y + u * 11, t.z - u * 3);
        for (let i = 0; i < 2; i++) this.stage.sparks.emit({ x: m.position.x, y: m.position.y, z: m.position.z, color: i ? '#fff6cf' : '#ffd84a', size: 0.4, life: 0.7 });
      }, ease.lin);
    }).then(() => {
      this.stage.sparks.burst(t.x, y, t.z, 22, { color: ['#ffe27a', '#ffffff', '#9fd8ff'], speed: 2.4, g: 2, life: 0.9, size: 0.28 });
    });
  }

  takeStar(id) {
    const m = this.stars.get(id);
    if (!m) return;
    this.stars.delete(id);
    const t = this.board.tiles[id];
    this.stage.sparks.burst(t.x, t.h + 0.8, t.z, 30, { color: ['#ffe27a', '#fff6cf'], speed: 2.4, up: 1.4, g: 2, life: 1, size: 0.28 });
    this.group.remove(m);
  }

  // `back`: casillas que quedan más lejos del castillo; se marcan más chicas y apagadas.
  showOptions(ids, color, back = []) {
    this.back = new Set(back);
    const white = new THREE.Color('#ffffff'), dim = new THREE.Color('#7d7790');
    ids.forEach((id, i) => { const c = this.back.has(id) ? dim : white; this.fill.setColorAt(i, c); this.arrow.setColorAt(i, c); this.hi.setColorAt(i, c); });
    for (const o of [this.fill, this.arrow, this.hi]) if (o.instanceColor) o.instanceColor.needsUpdate = true;
    for (const id of this.optIds) { const d = this.mistData.get(id); if (d && d.goal) d.goal = 1; }
    for (const id of ids) { const d = this.mistData.get(id); if (d && d.goal) d.goal = 0.22; }
    this.optIds = ids;
    this.hover = null;
    this.hi.count = this.fill.count = this.arrow.count = ids.length;
    this.hiMat.color.set('#ffffff');
    this.arrowMat.color.set(color);
    this.fillMat.color.set(color);
    this.showPath([]);
  }

  showPath(ids) {
    this.pathIds = ids;
    this.dots.count = ids.length;
  }

  pickTile(ndc) {
    const ray = new THREE.Raycaster();
    ray.setFromCamera(ndc, this.stage.camera);
    // Se elige la opción cuyo centro queda más cerca del rayo: perdona la altura y el dedo.
    let best = null, bd = 0.95;
    for (const id of this.optIds) {
      const p = this.pos(id, 0.05), q = new THREE.Vector3();
      if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -p.y), q)) continue;
      const d = Math.hypot(q.x - p.x, q.z - p.z);
      if (d < bd) { bd = d; best = id; }
    }
    return best;
  }

  seen(ids) {
    for (const id of ids) {
      const d = this.mistData.get(id);
      if (d) d.goal = 0;
      const t = this.board.tiles[id];
      if (d && d.k > 0.5) for (let i = 0; i < 3; i++) this.stage.smoke.emit({ x: t.x + (Math.random() - 0.5), y: t.h + 0.5, z: t.z + (Math.random() - 0.5), vx: (Math.random() - 0.5) * 0.8, vy: 0.6, vz: (Math.random() - 0.5) * 0.8, color: '#f2e6ff', size: 0.5, life: 1, grow: 0.4, alpha: 0.5 });
    }
  }

  // Voltea la casilla y muestra su contenido.
  async reveal(id) {
    const t = this.board.tiles[id];
    const c = t.content;
    let swapped = false;
    const color = this.topColor(t);
    if (c && c.type !== 'visited') this.stage.sparks.burst(t.x, t.h + 0.2, t.z, 16, { color: TYPE_COLOR[c.type] || '#fff', speed: 2.2, up: 1.6, life: 0.8, size: 0.22, g: 3 });
    const p = this.stage.tween(0.5, (k) => {
      if (k > 0.45 && !swapped) { swapped = true; this.tiles.setColorAt(id, color); this.tiles.instanceColor.needsUpdate = true; this.spawn(t); }
      this.placeTile(t, (1 - k) * Math.PI * 0.12 * Math.sin(k * 14), Math.sin(k * Math.PI) * 0.35);
    }, ease.inOut);
    return p;
  }

  spawn(t, now) {
    const c = t.content;
    if (!c || this.contents.has(t.id) || !MODEL[c.type]) return;
    const g = MODEL[c.type](c);
    g.position.set(t.x, t.h, t.z);
    this.group.add(g);
    this.contents.set(t.id, g);
    if (!now) this.stage.tween(0.5, (k) => g.scale.setScalar(Math.max(0.01, k)), ease.back);
  }

  async clear(id) {
    const g = this.contents.get(id), t = this.board.tiles[id];
    this.tiles.setColorAt(id, this.topColor(t));
    this.tiles.instanceColor.needsUpdate = true;
    if (!g) return;
    this.contents.delete(id);
    await this.stage.tween(0.35, (k) => { g.position.y = t.h + k * 1.4; g.rotation.y = k * 7; g.scale.setScalar(Math.max(0.01, 1 - k * k)); }, ease.lin);
    this.group.remove(g);
  }

  // Alguien se llevó la reliquia del altar: sube, brilla y desaparece.
  async takeRelic(id) {
    const g = this.contents.get(id), t = this.board.tiles[id], o = g?.userData.relic;
    if (!o) return;
    g.userData.taking = true;
    this.stage.sparks.burst(t.x, t.h + 1.3, t.z, 30, { color: [g.userData.color, '#ffffff'], speed: 2.6, up: 2, life: 0.9, size: 0.28 });
    await this.stage.tween(0.6, (k) => { o.position.y = 1.25 + k * 1.6; o.scale.setScalar(Math.max(0.01, 1 - k)); }, ease.lin);
    o.visible = false;
  }

  update(dt, time) {
    const m = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), one = new THREE.Vector3(1, 1, 1);
    for (const [id, d] of this.mistData) {
      if (d.done) continue;
      const t = this.board.tiles[id];
      d.k += (d.goal - d.k) * (1 - Math.exp(-4 * dt));
      if (d.goal === 0 && d.k < 0.02) { d.k = 0; d.done = true; }
      const s = d.s * d.k;
      this.mist.setMatrixAt(d.i, m.compose(new THREE.Vector3(t.x + Math.sin(time * 0.4 + d.r) * 0.1, t.h + 0.42 + Math.sin(time * 0.8 + d.r) * 0.07 + (1 - d.k) * 0.8, t.z), q.setFromAxisAngle(up, d.r + time * 0.05), new THREE.Vector3(s, s, s)));
    }
    this.mist.instanceMatrix.needsUpdate = true;
    if (this.shade > 0) {
      for (const t of this.board.tiles) {
        const k = (this.gloomK[t.id] += (this.gloomGoal[t.id] - this.gloomK[t.id]) * (1 - Math.exp(-2.5 * dt)));
        const s = (0.9 + t.rand * 0.3) * k + 0.0001;
        this.gloom.setMatrixAt(t.id, m.compose(new THREE.Vector3(t.x + Math.sin(time * 0.5 + t.rand * 9) * 0.08, t.h + 0.12 + (t.kind === 'path' ? 0 : 0.25) + Math.sin(time * 0.9 + t.rand * 6) * 0.05, t.z), q.setFromAxisAngle(up, t.rand * 6 + time * 0.08), new THREE.Vector3(s, s, s)));
      }
      this.gloom.instanceMatrix.needsUpdate = true;
    }

    this.zoneMat.opacity = 0.46 + Math.sin(time * 4) * 0.16;
    for (const [, s] of this.stars) { s.userData.star.rotation.y = time * 2; s.position.y = s.userData.y + Math.sin(time * 2.4 + s.position.x) * 0.07; }
    const pulse = 1 + Math.sin(time * 5) * 0.04;
    this.optIds.forEach((id, i) => {
      const h = id === this.hover, b = this.back?.has(id), s = h ? 1.1 : b ? 0.78 : pulse;
      this.hi.setMatrixAt(i, m.compose(this.pos(id, h ? 0.16 : 0.05), q.identity(), new THREE.Vector3(s, h ? 2.4 : 1, s)));
      const a = h ? 1.45 : b ? 0.6 : 1;
      this.arrow.setMatrixAt(i, m.compose(this.pos(id, 0.62 + (b ? 0 : Math.abs(Math.sin(time * 3 + i * 0.5)) * 0.22)), q.setFromAxisAngle(up, time * 1.5), new THREE.Vector3(a, a, a)));
      this.fill.setMatrixAt(i, m.compose(this.pos(id, 0.03), q.identity(), new THREE.Vector3(s, 1, s)));
    });
    this.hi.instanceMatrix.needsUpdate = this.arrow.instanceMatrix.needsUpdate = this.fill.instanceMatrix.needsUpdate = true;
    this.fillMat.opacity = 0.45 + Math.sin(time * 5) * 0.14;
    (this.pathIds || []).forEach((id, i) => this.dots.setMatrixAt(i, m.compose(this.pos(id, 0.35 + Math.sin(time * 5 - i) * 0.07), q.setFromAxisAngle(up, time * 2), one)));
    this.dots.instanceMatrix.needsUpdate = true;

    for (const [, g] of this.contents) {
      const u = g.userData;
      if (u.spin) g.rotation.y += dt * u.spin;
      if (u.relic && !u.taking) { u.relic.rotation.y += dt * 1.6; u.relic.position.y = 1.25 + Math.sin(time * 2) * 0.08; }
      if (u.portal) u.portal.value = time;
      if (u.dragon) u.dragon.userData.breathe(time);
      if (u.cat) { u.cat.position.y = Math.abs(Math.sin(time * 2)) * 0.03; u.cat.rotation.y = Math.sin(time * 0.8) * 0.3; }
      if (u.eagle) { u.eagle.userData.flap(time * 1.5, 0.25); u.eagle.position.y = 0.62 + Math.sin(time * 1.5) * 0.02; }
      if (u.worm) u.worm.userData.pose(0.35 + Math.sin(time * 1.3) * 0.6, time * 0.5);
    }
    for (const [id, i] of this.mystIds) {
      const t = this.board.tiles[id], d = this.mistData.get(id);
      const s = this.hidden(t) && t.seen && !(this.optIds.includes(id)) ? 1 - Math.min(1, d ? d.k * 1.5 : 0) : 0;
      this.mystery.setMatrixAt(i, m.compose(new THREE.Vector3(t.x, t.h + 0.03, t.z), q.setFromAxisAngle(up, this.stage.cam.yaw), new THREE.Vector3(s, s, s)));
    }
    this.mystery.instanceMatrix.needsUpdate = true;
    for (const [, m] of this.critters) m.userData.idle(time + m.userData.phase);
    for (const [, f] of this.guards) { f.update(dt, time); f.aura.material.opacity = 0.45 + Math.sin(time * 3) * 0.25; }
    const cr = this.castle.userData.crown;
    cr.rotation.y += dt * 0.9;
    cr.position.y = 2.4 + Math.sin(time * 1.6) * 0.1;

    this.ambT = (this.ambT || 0) - dt;
    if (this.ambT < 0) {
      this.ambT = 0.16;
      for (const [id, g] of this.contents) {
        const t = this.board.tiles[id];
        if (g.userData.relic?.visible && Math.random() < 0.35) this.stage.sparks.emit({ x: t.x + (Math.random() - 0.5) * 0.5, y: t.h + 1.1, z: t.z + (Math.random() - 0.5) * 0.5, vy: 0.6, color: g.userData.color, size: 0.16, life: 1 });
        if (g.userData.dragon && Math.random() < 0.14) this.stage.smoke.emit({ x: t.x + 0.4, y: t.h + 0.5, z: t.z, vx: 0.15, vy: 0.5, color: '#e9e4f5', size: 0.14, life: 1.6, grow: 0.12, alpha: 0.7 });
        if (g.userData.cat && Math.random() < 0.3) this.stage.sparks.emit({ x: t.x + (Math.random() - 0.5), y: t.h + 0.6 + Math.random(), z: t.z - 0.3, vy: 0.4, color: '#ffd36b', size: 0.2, life: 1.2 });
        if (t.content?.type === 'calm' && Math.random() < 0.5) this.stage.sparks.emit({ x: t.x + (Math.random() - 0.5) * 0.2, y: t.h + 0.4, z: t.z - 0.42, vy: 0.9, color: '#ff9a3d', size: 0.14, life: 0.9 });
      }
      // Jirones de sombra en el borde de la Sombra.
      if (this.shade > 0 && Math.random() < 0.6) {
        const edge = this.board.tiles.filter((t) => t.kind === 'path' && this.progOf(t) === this.shade - 1);
        const t = edge[Math.floor(Math.random() * edge.length)];
        if (t) this.stage.smoke.emit({ x: t.x + (Math.random() - 0.5), y: t.h + 0.2, z: t.z + (Math.random() - 0.5), vx: 0.2, vy: 0.5, color: Math.random() < 0.5 ? '#2e2342' : '#4b3a66', size: 0.5, life: 1.6, grow: 0.5, alpha: 0.7 });
      }
      for (const [id, g] of this.contents) if (g.userData.portal) { const t = this.board.tiles[id], b = Math.random() * 6.283; this.stage.sparks.emit({ x: t.x + Math.sin(b) * 0.5, y: t.h + 0.1, z: t.z + Math.cos(b) * 0.5, cx: t.x, cz: t.z, vy: 0.9, swirl: 4, color: '#c79bff', size: 0.22, life: 1.1 }); }
      // Luciérnagas, hojas y nieve según el bioma, cerca de la cámara.
      const c = this.stage.cam.pos, p = (c.x / Math.sqrt(3)) / this.board.len;
      const x = c.x + (Math.random() - 0.5) * 20, z = c.z + (Math.random() - 0.5) * 14;
      if (this.stage.lamp > 0.5) for (let i = 0; i < 2; i++) this.stage.sparks.emit({ x: c.x + (Math.random() - 0.5) * 18, y: 0.5 + Math.random() * 2, z: c.z + (Math.random() - 0.5) * 12, vx: (Math.random() - 0.5) * 0.6, vy: 0.12, vz: (Math.random() - 0.5) * 0.6, color: Math.random() < 0.7 ? '#e8ff8a' : '#9fe6ff', size: 0.2, life: 3.5, drag: 0 });
      if (p < 0.28) this.stage.sparks.emit({ x, y: 0.8 + Math.random() * 2, z, vx: 0.3, vy: 0.15, vz: (Math.random() - 0.5) * 0.5, color: '#fff0a0', size: 0.14, life: 3.5, drag: 0 });
      else if (p < 0.52) this.stage.sparks.emit({ x, y: 1 + Math.random() * 2, z, vy: 0.25, vx: (Math.random() - 0.5) * 0.5, color: Math.random() < 0.5 ? '#7dffd0' : '#e69bff', size: 0.2, life: 3.5, drag: 0 });
      else if (p < 0.76) this.stage.smoke.emit({ x, y: 4.5, z, vx: 0.9, vy: -0.8, vz: 0.2, color: Math.random() < 0.5 ? '#ff8a3d' : '#ffd05a', size: 0.14, life: 4, drag: 0 });
      else { for (let i = 0; i < 2; i++) this.stage.smoke.emit({ x: c.x + (Math.random() - 0.5) * 20, y: 5, z: c.z + (Math.random() - 0.5) * 14, vx: 0.3, vy: -0.9, color: '#ffffff', size: 0.11, life: 5, drag: 0 }); }
    }
  }
}
