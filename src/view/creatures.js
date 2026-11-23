import * as THREE from 'three';
import { matMetal, matGlow, paint, paintBy, at, loft, tube, ball, ico, octa, box, cone, cyl, ringGeo, star, mesh } from './geo.js';

/* ---------- Águila gigante: alas con plumas, garras y cola en abanico ---------- */
export function makeEagle() {
  const g = new THREE.Group();
  const brown = (v) => (v.y > 0.12 ? '#8a5a34' : '#6b4226');
  g.add(mesh([
    paintBy(loft([{ y: -0.75, r: 0.08, z: 0 }, { y: -0.45, rx: 0.3, rz: 0.24 }, { y: 0, rx: 0.4, rz: 0.32 }, { y: 0.4, rx: 0.3, rz: 0.26 }, { y: 0.66, rx: 0.17, rz: 0.17 }], 9).rotateX(Math.PI / 2), brown),
    paint(at(ico(0.25, 1), { s: [0.9, 0.92, 1.1], p: [0, 0.14, 0.78] }), '#fff6e4'),
    paint(at(loft([{ y: -0.2, r: 0.24 }, { y: 0.06, r: 0.21 }], 8), { r: [1.3, 0, 0], p: [0, 0.06, 0.58] }), '#fff6e4'),
    ...[-2, -1, 0, 1, 2].map((i) => paint(at(box(0.17, 0.04, 0.75), { r: [0, i * 0.22, 0], p: [i * 0.15, -0.02, -0.98] }), i % 2 ? '#fff6e4' : '#efdcc0')),
  ]));
  g.add(mesh([paint(at(cone(0.11, 0.34, 5), { r: [Math.PI / 2 + 0.25, 0, 0], p: [0, 0.08, 1.13] }), '#ffbe2e'), paint(tube([[0, 0.11, 1.18], [0, 0.06, 1.3], [0, -0.05, 1.32]], [0.06, 0.05, 0.005], 5, 5), '#f59a1c'),
    ...[1, -1].flatMap((s) => [paint(tube([[s * 0.18, -0.2, -0.1], [s * 0.2, -0.45, 0], [s * 0.2, -0.6, 0.1]], [0.1, 0.07, 0.05], 5, 5), '#6b4226'), ...[-0.12, 0, 0.12].map((q) => paint(tube([[s * 0.2, -0.6, 0.1], [s * 0.2 + q, -0.66, 0.26], [s * 0.2 + q, -0.8, 0.28]], [0.05, 0.045, 0.005], 4, 4), '#ffbe2e'))])], matMetal));
  g.add(mesh([1, -1].map((s) => paint(at(ball(0.045, 7, 5), { p: [s * 0.17, 0.2, 0.93] }), '#2b1608')), matMetal));
  g.add(mesh([1, -1].map((s) => paint(at(box(0.13, 0.035, 0.16), { r: [0.15, 0, s * -0.5], p: [s * 0.17, 0.27, 0.93] }), '#e8d8ba'))));
  const wings = [1, -1].map((s) => {
    const w = new THREE.Group(), tip = new THREE.Group();
    w.position.set(s * 0.28, 0.1, 0.1);
    tip.position.set(s * 1.1, 0, 0);
    w.add(mesh([paintBy(loft([{ y: 0, rx: 0.1, rz: 0.34 }, { y: 1.15, rx: 0.06, rz: 0.26 }], 8).rotateZ(-s * Math.PI / 2), brown),
      ...[0, 1, 2, 3, 4].map((i) => paint(at(box(0.22, 0.03, 0.6), { p: [s * (0.1 + i * 0.22), -0.02, -0.5] }), i % 2 ? '#5a361d' : '#734727'))]));
    tip.add(mesh([0, 1, 2, 3, 4].map((i) => paintBy(at(box(0.2, 0.03, 0.95 - i * 0.08), { p: [0, 0, -0.35] }).rotateY(-s * (0.15 + i * 0.3)).translate(s * (0.02 + i * 0.1), 0.01 * i, 0.12), (v) => (Math.abs(v.x) > 0.5 ? '#3f2512' : '#5a361d'))).concat(paint(at(box(0.5, 0.09, 0.42), { p: [s * 0.16, 0, 0.1] }), '#8a5a34'))));
    w.add(tip);
    g.add(w);
    return { w, tip, s };
  });
  g.userData.flap = (t, k = 1) => {
    for (const { w, tip, s } of wings) { w.rotation.z = s * (0.15 + Math.sin(t) * 0.6 * k); tip.rotation.z = s * (Math.sin(t - 0.8) * 0.55 * k - 0.05); }
  };
  g.userData.flap(0);
  return g;
}

/* ---------- Gran gusano: anillos, boca redonda y dientes ---------- */
export function makeWorm(n = 13) {
  const g = new THREE.Group(), segs = [];
  for (let i = 0; i < n; i++) {
    const r = 0.62 - i * 0.012;
    const s = mesh([paintBy(loft([{ y: -0.2, r: r * 0.84 }, { y: -0.05, r }, { y: 0.1, r: r * 0.98 }, { y: 0.2, r: r * 0.82 }], 11), (v) => (v.z > 0.28 ? '#f2b98a' : i % 2 ? '#c2587a' : '#d66a86'))]);
    g.add(s); segs.push(s);
  }
  const head = segs[0];
  head.add(mesh([
    paint(at(ringGeo(0.48, 0.15, 14, 6), { r: [Math.PI / 2, 0, 0], p: [0, 0.2, 0] }), '#b3466c'),
    paint(at(cyl(0.42, 0.3, 0.05, 12), { p: [0, 0.16, 0] }), '#3a0d22'),
    ...Array.from({ length: 10 }, (_, i) => { const a = (i / 10) * 6.283; return paint(at(cone(0.075, 0.26, 4), { r: [0, 0, 0], p: [0, 0.13, 0] }).rotateX(-0.5).rotateY(0).translate(0, 0.16, 0.42).rotateY(a), '#fff3d6'); }),
    ...[1, -1].map((s) => paint(at(ball(0.13, 8, 6), { p: [s * 0.26, 0.06, 0.6] }), '#fffbe8')),
    ...[1, -1].map((s) => paint(at(ball(0.065, 7, 5), { p: [s * 0.26, 0.07, 0.71] }), '#2b1608')),
  ]));
  // y = altura de la boca; el cuerpo cuelga hacia abajo y se oculta bajo tierra.
  g.userData.pose = (y, t) => segs.forEach((s, i) => {
    const d = Math.max(0, y - i * 0.33);
    s.position.set(Math.sin(t * 5 - i * 0.6) * 0.1 * Math.min(1, d), y - i * 0.33, Math.cos(t * 4 - i * 0.5) * 0.08 * Math.min(1, d));
    s.rotation.set(Math.sin(t * 5 - i * 0.6) * 0.08, 0, Math.cos(t * 5 - i * 0.6) * 0.12);
    s.visible = y - i * 0.33 > -1.6;
  });
  g.userData.pose(-2, 0);
  return g;
}

/* ---------- Dragón dormido sobre su tesoro ---------- */
export function makeDragon() {
  const g = new THREE.Group();
  const scale = (v) => (v.y > 0.32 ? '#4fbf8d' : v.y > 0.15 ? '#39a37a' : '#e9d58a');
  const spine = [[0.42, 0.14, 0.3], [0.5, 0.2, -0.12], [0.1, 0.27, -0.42], [-0.36, 0.24, -0.2], [-0.42, 0.16, 0.22], [-0.1, 0.11, 0.46], [0.22, 0.08, 0.5]];
  const body = new THREE.Group();
  body.add(mesh([
    paintBy(tube(spine, [0.17, 0.27, 0.3, 0.24, 0.15, 0.08, 0.02], 9, 26), scale),
    ...Array.from({ length: 9 }, (_, i) => { const c = new THREE.CatmullRomCurve3(spine.map((p) => new THREE.Vector3(...p))).getPoint(0.08 + i * 0.085); return paint(at(cone(0.06, 0.16, 4), { p: [c.x, c.y + [0.2, 0.26, 0.3, 0.3, 0.28, 0.25, 0.2, 0.17, 0.13][i], c.z] }), '#ffb13d'); }),
    paint(at(cone(0.1, 0.18, 3), { r: [Math.PI / 2, 0, 0.9], p: [0.3, 0.08, 0.52] }), '#ffb13d'),
    ...[1, -1].map((s) => paintBy(at(loft([{ y: 0, rx: 0.34, rz: 0.03 }, { y: 0.35, rx: 0.2, rz: 0.03 }, { y: 0.6, rx: 0.03, rz: 0.02 }], 5), { r: [-0.5, 0.3, s * 0.95], p: [0.06 + s * 0.14, 0.4, -0.32] }), (v) => (v.y > 0.6 ? '#ffcf7a' : '#2c8f6c'))),
  ]));
  const head = new THREE.Group();
  head.position.set(0.42, 0.16, 0.34);
  head.add(mesh([
    paintBy(at(loft([{ y: -0.12, rx: 0.15, rz: 0.13 }, { y: 0.05, rx: 0.19, rz: 0.15 }, { y: 0.22, rx: 0.13, rz: 0.1 }, { y: 0.38, rx: 0.11, rz: 0.09 }, { y: 0.42, rx: 0.06, rz: 0.05 }], 8), { r: [Math.PI / 2, 0, 0] }), (v) => (v.y > -0.02 ? '#4fbf8d' : '#e9d58a')),
    ...[1, -1].map((s) => paint(tube([[s * 0.1, 0.1, -0.02], [s * 0.16, 0.24, -0.14], [s * 0.14, 0.3, -0.26]], [0.045, 0.035, 0.005], 5, 5), '#fff1c9')),
    ...[1, -1].map((s) => paint(at(octa(0.035), { p: [s * 0.06, 0.08, 0.38] }), '#2c6f55')),
  ]));
  const lids = mesh([1, -1].map((s) => paint(at(ball(0.055, 7, 5), { s: [0.6, 0.35, 1], p: [s * 0.14, 0.1, 0.1] }), '#2c8f6c')));
  const eyes = mesh([1, -1].map((s) => paint(at(ball(0.055, 7, 5), { p: [s * 0.14, 0.1, 0.1] }), '#ffe14a')), matGlow);
  eyes.visible = false;
  head.add(lids, eyes);
  body.add(head);
  g.add(body);
  g.userData.breathe = (t) => { const a = g.userData.awake || 0; body.scale.y = 1 + Math.sin(t * 1.7) * 0.035 * (1 - a); head.position.y = 0.16 + a * 0.4; head.rotation.x = a * 0.2 + Math.sin(t * 18) * 0.06 * a; eyes.visible = a > 0.4; lids.visible = !eyes.visible; };
  return g;
}

const rock = (x, y, z, s, c) => paintBy(at(ico(s, 0), { r: [x * 3, z * 5, y], s: [1, 0.9, 1], p: [x, y, z] }), (v) => (v.y > y + s * 0.25 ? c[1] : c[0]));

export function caveMesh() {
  const g = new THREE.Group(), b = new THREE.Group(), R = ['#6d6080', '#8d80a3'];
  b.add(mesh([
    rock(-0.62, 0.22, -0.3, 0.34, R), rock(-0.55, 0.62, -0.42, 0.34, R), rock(-0.22, 0.95, -0.5, 0.36, R), rock(0.25, 1.0, -0.5, 0.36, R), rock(0.58, 0.62, -0.42, 0.34, R), rock(0.64, 0.22, -0.3, 0.34, R), rock(0, 0.6, -0.85, 0.5, R), rock(0.02, 1.25, -0.62, 0.28, R),
    paint(at(cyl(0.44, 0.5, 0.05, 10), { r: [Math.PI / 2, 0, 0], p: [0, 0.48, -0.42] }), '#1b1026'),
    ...[-0.2, 0, 0.2].map((x, i) => paint(at(cone(0.06, 0.2, 4), { r: [Math.PI, 0, 0], p: [x, 0.86 - (i % 2) * 0.02, -0.34] }), '#b9aecb')),
  ]));
  const gold = mesh([paintBy(loft([{ y: 0, r: 0.4, wave: [5, 0.08] }, { y: 0.1, r: 0.24, wave: [4, 0.1] }, { y: 0.17, r: 0.05 }], 10), () => '#ffc93c'), ...[0, 1, 2, 3, 4].map((i) => paint(at(cyl(0.06, 0.06, 0.02, 7), { r: [1, i, 0.4], p: [Math.sin(i * 2.4) * 0.36, 0.08, Math.cos(i * 2.4) * 0.3] }), '#ffe27a'))], matMetal);
  gold.position.set(-0.42, 0, 0.2);
  b.add(gold);
  const d = makeDragon();
  d.position.set(0.05, 0.02, -0.02);
  d.scale.setScalar(0.72);
  b.add(d);
  b.position.z = -0.3;
  b.scale.setScalar(1.05);
  g.add(b);
  g.userData.dragon = d;
  return g;
}

export function shopMesh() {
  const g = new THREE.Group(), b = new THREE.Group();
  const stripe = (v) => (Math.floor((v.x + 2) * 5) % 2 ? '#fff3df' : '#ff8a3d');
  b.add(mesh([
    paint(at(box(1.1, 0.34, 0.34), { p: [0, 0.3, 0] }), '#9c6136'), paint(at(box(1.2, 0.06, 0.44), { p: [0, 0.5, 0] }), '#c98a4e'),
    ...[-0.52, 0.52].map((x) => paint(at(cyl(0.035, 0.035, 1.15, 6), { p: [x, 0.62, -0.02] }), '#7b4a2d')),
    ...[-0.36, 0.36].map((x) => paint(at(cyl(0.2, 0.2, 0.06, 10), { r: [Math.PI / 2, 0, 0], p: [x, 0.2, 0.2] }), '#6e4026')),
    ...Array.from({ length: 10 }, (_, i) => paintBy(at(box(0.13, 0.05, 0.72), { r: [0.42, 0, 0], p: [-0.585 + i * 0.13, 1.25, 0.06] }), stripe)),
    ...Array.from({ length: 10 }, (_, i) => paintBy(at(cone(0.075, 0.14, 3), { r: [Math.PI, 0, 0], p: [-0.585 + i * 0.13, 1.05, 0.39] }), stripe)),
    paint(at(box(0.28, 0.24, 0.26), { r: [0, 0.4, 0], p: [0.72, 0.12, 0.3] }), '#b87236'),
    paint(at(cyl(0.02, 0.02, 0.7, 5), { p: [0, 1.65, -0.2] }), '#7b4a2d'),
    paint(at(new THREE.ConeGeometry(0.16, 0.42, 3), { r: [0, 0, -Math.PI / 2], s: [1, 1, 0.2], p: [0.22, 1.86, -0.2] }), '#7a4fe0'),
  ]));
  // Mercader: un gato con sombrero y bufanda.
  const cat = new THREE.Group();
  cat.add(mesh([
    paint(at(loft([{ y: 0, r: 0.16 }, { y: 0.3, r: 0.12 }], 8), { p: [0, 0.45, 0] }), '#7a4fe0'),
    paintBy(at(ico(0.19, 1), { s: [1.1, 0.9, 0.95], p: [0, 0.88, 0] }), (v) => (v.z > 0.1 && v.y < 0.88 ? '#fff3df' : '#f0a24e')),
    ...[1, -1].map((s) => paint(at(cone(0.08, 0.17, 4), { r: [0, 0, s * -0.25], p: [s * 0.13, 1.06, 0] }), '#f0a24e')),
    paint(at(ringGeo(0.14, 0.045, 10, 5), { r: [Math.PI / 2, 0, 0], p: [0, 0.74, 0] }), '#ff5c7a'),
    paint(at(cyl(0.12, 0.14, 0.14, 8), { p: [0, 1.1, -0.02] }), '#33214f'), paint(at(cyl(0.21, 0.21, 0.03, 10), { p: [0, 1.04, -0.02] }), '#33214f'),
    ...[1, -1].map((s) => paint(at(ball(0.03, 6, 5), { s: [0.7, 1.2, 0.6], p: [s * 0.075, 0.91, 0.17] }), '#23301a')),
    paint(at(octa(0.025), { p: [0, 0.86, 0.19] }), '#ff5c7a'),
  ]));
  const spot = new THREE.Group();
  spot.position.set(-0.78, -0.4, 0.3);
  spot.add(cat);
  b.add(spot);
  b.add(mesh([['#ff4f9a', -0.4], ['#37e07f', -0.22], ['#3fb8ff', 0.4], ['#ffd84a', 0.24]].flatMap(([c, x]) => [paint(at(loft([{ y: 0, r: 0.07 }, { y: 0.1, r: 0.06 }, { y: 0.14, r: 0.022 }, { y: 0.2, r: 0.026 }], 7), { p: [x, 0.53, 0.1] }), c)]).concat(paint(at(octa(0.09), { p: [-0.56, 1.0, 0.42] }), '#ffd36b')), matGlow));
  b.position.set(0, 0, -0.42);
  g.add(b);
  g.userData.cat = cat;
  return g;
}

export function nestMesh() {
  const g = new THREE.Group(), b = new THREE.Group();
  b.add(mesh(Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * 6.283; return paint(at(cyl(0.035, 0.035, 0.55, 4), { r: [0.2 * (i % 3), 0, Math.PI / 2 - 0.25], p: [0, 0.08 + (i % 3) * 0.06, 0.34] }).rotateY(a), ['#8a5a34', '#a3713f', '#6b4226'][i % 3]); }).concat([0, 1, 2].map((i) => paint(at(ico(0.13, 1), { s: [0.85, 1.15, 0.85], p: [Math.sin(i * 2.1) * 0.14, 0.2, Math.cos(i * 2.1) * 0.14] }), '#fff1d0')))));
  const e = makeEagle();
  e.scale.setScalar(0.42);
  e.position.set(0, 0.62, -0.28);
  b.add(e);
  b.position.z = -0.25;
  g.add(b);
  g.userData.eagle = e;
  return g;
}

export function holeMesh() {
  const g = new THREE.Group();
  g.add(mesh([paint(at(cyl(0.44, 0.3, 0.02, 11), { p: [0, 0.015, 0] }), '#22121c'), ...Array.from({ length: 13 }, (_, i) => { const a = (i / 13) * 6.283; return paint(at(ico(0.1 + (i % 4) * 0.03, 0), { r: [i, i, 0], p: [Math.sin(a) * 0.5, 0.05, Math.cos(a) * 0.5] }), ['#7b5238', '#936344', '#684230'][i % 3]); })]));
  const w = makeWorm(5);
  w.scale.setScalar(0.4);
  w.position.set(0, 0, -0.1);
  g.add(w);
  g.userData.worm = w;
  return g;
}

export function arenaMesh() {
  const g = new THREE.Group();
  g.add(mesh([
    ...Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * 6.283 + 0.4, h = 0.22 + (i % 3) * 0.12; return paintBy(at(box(0.18, h, 0.14), { p: [0, h / 2, 0.64] }).rotateY(a), (v) => (v.y > h * 0.8 ? '#e9dff0' : '#b3a6c4')); }),
    paint(at(ringGeo(0.46, 0.02, 24, 4), { r: [Math.PI / 2, 0, 0], p: [0, 0.015, 0] }), '#ff6b57'),
  ]));
  const s = new THREE.Group();
  s.add(mesh([1, -1].flatMap((k) => [
    paint(at(loft([{ y: 0, rx: 0.012, rz: 0.01 }, { y: 0.12, rx: 0.05, rz: 0.015 }, { y: 0.62, rx: 0.05, rz: 0.015 }], 4), { r: [0, 0, k * 0.55], p: [k * 0.16, 0.02, 0] }), '#e8f0ff'),
    paint(at(box(0.24, 0.05, 0.06), { r: [0, 0, k * 0.55], p: [k * -0.165, 0.56, 0] }), '#ffc93c'),
    paint(at(cyl(0.03, 0.03, 0.16, 6), { r: [0, 0, k * 0.55], p: [k * -0.215, 0.645, 0] }), k > 0 ? '#ff5c9e' : '#4b8df7'),
  ]), matMetal));
  s.position.set(0, 0, -0.5);
  g.add(s);
  return g;
}

export function fireMesh() {
  const g = new THREE.Group(), b = new THREE.Group();
  b.add(mesh([0, 1, 2, 3].map((i) => paint(at(cyl(0.045, 0.055, 0.5, 5), { r: [0, 0, 1.1], p: [0.14, 0.12, 0] }).rotateY(i * 1.57), '#7b4a2d')).concat(Array.from({ length: 7 }, (_, i) => paint(at(ico(0.08), { p: [Math.sin(i * 0.9) * 0.34, 0.04, Math.cos(i * 0.9) * 0.34] }), '#8c8399')))));
  b.add(mesh([paint(at(loft([{ y: 0, r: 0.12 }, { y: 0.14, r: 0.15 }, { y: 0.42, r: 0.01 }], 6), { p: [0, 0.1, 0] }), '#ff8a2b'), paint(at(loft([{ y: 0, r: 0.07 }, { y: 0.1, r: 0.09 }, { y: 0.26, r: 0.01 }], 6), { p: [0.02, 0.12, 0.06] }), '#ffe05a')], matGlow));
  b.position.z = -0.42;
  g.add(b);
  return g;
}

export function bookMesh() {
  const g = new THREE.Group(), b = new THREE.Group();
  b.add(mesh([1, -1].flatMap((s) => [paint(at(box(0.3, 0.04, 0.42), { r: [0, 0, s * 0.35], p: [s * 0.15, 0.04, 0] }), '#b3204f'), paint(at(box(0.27, 0.06, 0.38), { r: [0, 0, s * 0.35], p: [s * 0.14, 0.075, 0] }), '#fff4dc')])));
  b.add(mesh(paint(at(star(0.16, 0.05), { p: [0, 0.42, 0] }), '#ffe27a'), matGlow));
  b.position.y = 0.3;
  g.add(b);
  g.userData.spin = 1;
  return g;
}
