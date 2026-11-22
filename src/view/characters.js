import * as THREE from 'three';
import { mat, matSmooth, matMetal, matGlow, paint, paintBy, at, loft, tube, ball, octa, cone, ringGeo, cyl, star, mesh } from './geo.js';

// Personajes articulados. Altura aproximada: 3 unidades (se escalan al colocarlos).
const SKIN_P = '#ffd9c2', SKIN_M = '#f3c3a0', GOLD = '#ffc93c';

const group = (parent, x = 0, y = 0, z = 0) => {
  const g = new THREE.Group();
  g.position.set(x, y, z);
  parent.add(g);
  return g;
};

function headShape(skin, jaw) {
  return paint(loft([
    { y: 0.0, rx: 0.1 * jaw, rz: 0.1, z: 0.13 },
    { y: 0.05, rx: 0.2 * jaw, rz: 0.19, z: 0.1 },
    { y: 0.15, rx: 0.31 * jaw, rz: 0.3, z: 0.04 },
    { y: 0.28, rx: 0.385, rz: 0.37, z: 0.01 },
    { y: 0.44, rx: 0.41, rz: 0.395, z: -0.01 },
    { y: 0.6, rx: 0.395, rz: 0.385, z: -0.03 },
    { y: 0.74, rx: 0.31, rz: 0.31, z: -0.04 },
    { y: 0.83, rx: 0.17, rz: 0.17, z: -0.04 },
    { y: 0.855, rx: 0.03, rz: 0.03, z: -0.04 },
  ], 18), skin);
}

function makeEye(head, side, { iris, lash, scale = 1, y = 0.36, long = false }) {
  const e = group(head, side * 0.165, y, 0.335);
  e.rotation.y = side * 0.36;
  const sph = (r, sx, sy, sz, p, c) => paint(at(ball(r, 14, 10), { s: [sx, sy, sz], p }), c);
  const parts = [
    sph(0.1, 0.92, 1.2, 0.34, [0, 0, 0], '#ffffff'),
    sph(0.078, 0.92, 1.18, 0.3, [-side * 0.008, -0.008, 0.02], iris),
    sph(0.048, 0.9, 1.2, 0.3, [-side * 0.008, -0.008, 0.033], '#1d1330'),
  ];
  const m = mesh(parts, matSmooth, false);
  m.scale.setScalar(scale);
  e.add(m);
  const shine = mesh([sph(0.024, 1, 1, 0.5, [0.026, 0.045, 0.047], '#ffffff'), sph(0.013, 1, 1, 0.5, [-0.026, -0.045, 0.045], '#ffffff')], matGlow, false);
  shine.scale.setScalar(scale);
  e.add(shine);
  const l = mesh([
    paint(tube([[-0.1, 0.06, 0.02], [-0.05, 0.12, 0.035], [0.04, 0.125, 0.035], [0.1, 0.06, 0.02]], [0.008, 0.022, 0.022, 0.012], 5, 8), lash),
    ...(long ? [paint(tube([[side * 0.085, 0.085, 0.02], [side * 0.125, 0.115, 0.02], [side * 0.145, 0.15, 0.0]], [0.018, 0.012, 0.003], 5, 5), lash)] : []),
  ], matSmooth, false);
  l.scale.setScalar(scale);
  l.position.y = -0.012;
  e.add(l);
  return e;
}

// Esqueleto común: hombros, codos, caderas y rodillas.
function rig() {
  const root = new THREE.Group();
  const body = group(root);
  const hips = group(body, 0, 1.0, 0);
  const torso = group(hips, 0, 0.12, 0);
  const head = group(torso, 0, 0.88, 0);
  const arm = (s) => {
    const up = group(torso, s * 0.33, 0.6, 0);
    const fore = group(up, 0, -0.4, 0);
    const hand = group(fore, 0, -0.36, 0);
    return { up, fore, hand };
  };
  const leg = (s) => {
    const up = group(hips, s * 0.15, -0.05, 0);
    const shin = group(up, 0, -0.45, 0);
    const foot = group(shin, 0, -0.42, 0);
    return { up, shin, foot };
  };
  return { root, body, hips, torso, head, armL: arm(1), armR: arm(-1), legL: leg(1), legR: leg(-1), eyes: [], sway: [] };
}

function handGeo(skin, side) {
  return [
    paint(at(loft([{ y: -0.2, rx: 0.04, rz: 0.03 }, { y: -0.13, rx: 0.075, rz: 0.05 }, { y: -0.03, rx: 0.07, rz: 0.05 }, { y: 0.02, rx: 0.055, rz: 0.05 }], 8)), skin),
    paint(tube([[side * -0.04, -0.03, 0.03], [side * -0.085, -0.08, 0.05], [side * -0.08, -0.14, 0.055]], [0.03, 0.026, 0.014], 5, 4), skin),
    ...[-0.04, 0, 0.04].map((x, i) => paint(tube([[x, -0.13, 0.01], [x * 1.15, -0.2, 0.02], [x * 1.1, -0.245 + Math.abs(i - 1) * 0.015, 0.05]], [0.027, 0.025, 0.014], 5, 4), skin)),
  ];
}

export function makePrincess() {
  const R = rig();
  const P = { main: '#ff6fae', deep: '#e0417f', light: '#ffc4dd', cream: '#fff3ee', hair: '#7a3b1e', hair2: '#9a4f27' };

  // Piernas y zapatos (asoman al caminar).
  for (const [L, s] of [[R.legL, 1], [R.legR, -1]]) {
    L.up.add(mesh(paint(tube([[0, 0.05, 0], [0, -0.22, 0.01], [0, -0.46, 0]], [0.13, 0.11, 0.085], 8, 5), P.cream)));
    L.shin.add(mesh(paint(tube([[0, 0, 0], [0, -0.16, -0.015], [0, -0.42, 0]], [0.088, 0.092, 0.055], 8, 5), P.cream)));
    L.foot.add(mesh([
      paint(loft([{ y: -0.13, rx: 0.08, rz: 0.17, z: 0.08 }, { y: -0.07, rx: 0.085, rz: 0.17, z: 0.07 }, { y: -0.01, rx: 0.07, rz: 0.09, z: 0.01 }, { y: 0.03, rx: 0.06, rz: 0.07 }], 10), P.deep),
      paint(at(octa(0.035), { p: [0, -0.04, 0.17] }), GOLD),
    ]));
  }

  // Vestido: enagua, falda plisada, sobrefalda abierta, dobladillo dorado.
  const skirt = group(R.hips, 0, 0.1, 0);
  const pl = (a) => [9, a, 0.2];
  skirt.add(mesh(paint(loft([
    { y: -1.0, r: 0.66, wave: [14, 0.05] }, { y: -0.93, r: 0.69, wave: [14, 0.06] }, { y: -0.8, r: 0.6, wave: [14, 0.03] },
  ], 56, { capTop: false, capBottom: false }), P.cream)));
  skirt.add(mesh(paintBy(loft([
    { y: -0.9, r: 0.7, wave: pl(0.06) }, { y: -0.84, r: 0.715, wave: pl(0.065) }, { y: -0.62, r: 0.63, wave: pl(0.06) },
    { y: -0.36, r: 0.5, wave: pl(0.045) }, { y: -0.14, r: 0.37, wave: pl(0.025) }, { y: 0, rx: 0.25, rz: 0.21 }, { y: 0.06, rx: 0.225, rz: 0.185 },
  ], 54, { capTop: false, capBottom: false }), (v) => v.y < -0.82 ? P.light : new THREE.Color(P.deep).lerp(new THREE.Color('#ff9cc8'), (v.y + 0.9) / 0.95))));
  const over = [0.42, Math.PI * 2 - 0.42];
  skirt.add(mesh(paintBy(loft([
    { y: -0.66, r: 0.74, wave: pl(0.07), arc: [0.72, Math.PI * 2 - 0.72] }, { y: -0.6, r: 0.735, wave: pl(0.07), arc: [0.66, Math.PI * 2 - 0.66] },
    { y: -0.36, r: 0.56, wave: pl(0.05), arc: [0.5, Math.PI * 2 - 0.5] }, { y: -0.14, r: 0.41, wave: pl(0.03), arc: [0.4, Math.PI * 2 - 0.4] },
    { y: 0.02, rx: 0.265, rz: 0.225, arc: over },
  ], 50, { arc: over }), (v) => (v.y < -0.6 ? GOLD : P.main))));
  // Lazo trasero.
  skirt.add(mesh([1, -1].flatMap((s) => [
    paint(at(loft([{ y: 0, rx: 0.03, rz: 0.03 }, { y: 0.12, rx: 0.06, rz: 0.12 }, { y: 0.24, rx: 0.07, rz: 0.14 }, { y: 0.28, rx: 0.02, rz: 0.06 }], 8), { r: [0, 0, s * -1.25], p: [0, 0.02, -0.25] }), P.deep),
    paint(tube([[0, 0, -0.26], [s * 0.1, -0.25, -0.42], [s * 0.2, -0.62, -0.68]], [0.03, 0.06, 0.07], 6, 7, 0.25), P.deep),
  ]).concat(paint(at(ball(0.06), { p: [0, 0.03, -0.27] }), GOLD))));
  R.sway.push({ o: skirt, k: 0.35 });
  R.skirt = skirt;

  // Corpiño con escote, cinturón y gema.
  R.torso.add(mesh([
    paintBy(loft([
      { y: -0.04, rx: 0.225, rz: 0.18 }, { y: 0.08, rx: 0.215, rz: 0.175 }, { y: 0.24, rx: 0.255, rz: 0.2, z: 0.012 },
      { y: 0.38, rx: 0.28, rz: 0.225, z: 0.03 }, { y: 0.48, rx: 0.275, rz: 0.2, z: 0.02 }, { y: 0.55, rx: 0.27, rz: 0.165 },
    ], 16), (v) => (Math.abs(v.x) < 0.08 && v.z > 0.1 ? P.light : P.main)),
    paint(loft([{ y: 0.53, rx: 0.285, rz: 0.18 }, { y: 0.6, rx: 0.25, rz: 0.15 }, { y: 0.66, rx: 0.17, rz: 0.12 }, { y: 0.72, rx: 0.1, rz: 0.095 }, { y: 0.92, rx: 0.095, rz: 0.095, z: 0.01 }], 14), SKIN_P),
    paint(loft([{ y: 0.5, rx: 0.29, rz: 0.2, wave: [10, 0.05] }, { y: 0.57, rx: 0.305, rz: 0.2, wave: [10, 0.06] }], 30, { capTop: false, capBottom: false }), P.cream),
  ]));
  R.torso.add(mesh([
    paint(at(ringGeo(0.2, 0.022, 20), { r: [Math.PI / 2, 0, 0], s: [1.14, 1, 0.92], p: [0, 0.0, 0] }), GOLD),
    paint(at(ringGeo(0.115, 0.012, 16), { r: [Math.PI / 2 - 0.3, 0, 0], p: [0, 0.68, 0.015] }), GOLD),
  ], matMetal));
  R.torso.add(mesh([paint(at(octa(0.055), { s: [1, 1, 0.6], p: [0, 0.0, 0.2] }), '#ff2f7d'), paint(at(octa(0.04), { s: [1, 1.2, 0.6], p: [0, 0.625, 0.135] }), '#ff2f7d')], matGlow));

  // Brazos: mangas abullonadas y guantes.
  for (const [A, s] of [[R.armL, 1], [R.armR, -1]]) {
    A.up.add(mesh([
      paint(loft([{ y: -0.2, r: 0.085 }, { y: -0.16, r: 0.13, wave: [8, 0.06] }, { y: -0.05, r: 0.165, wave: [8, 0.07] }, { y: 0.05, r: 0.14, wave: [8, 0.05] }, { y: 0.1, r: 0.06 }], 24), P.light),
      paint(at(ringGeo(0.088, 0.018, 14), { r: [Math.PI / 2, 0, 0], p: [0, -0.2, 0] }), P.deep),
      paint(tube([[0, -0.18, 0], [0, -0.3, 0], [0, -0.42, 0]], [0.072, 0.066, 0.06], 8, 4), SKIN_P),
    ]));
    A.fore.add(mesh([
      paint(tube([[0, 0.02, 0], [0, -0.16, 0], [0, -0.36, 0]], [0.064, 0.064, 0.046], 8, 5), P.cream),
      paint(at(ringGeo(0.066, 0.014, 12), { r: [Math.PI / 2, 0, 0], p: [0, 0.0, 0] }), GOLD),
    ]));
    A.hand.add(mesh(handGeo(P.cream, s)));
  }

  // Varita.
  const wand = group(R.armR.hand, 0.0, -0.14, 0.05);
  wand.rotation.x = 1.25;
  wand.add(mesh(paint(cyl(0.016, 0.026, 0.62, 6).translate(0, 0.2, 0), '#fff0c9'), matMetal));
  const tip = group(wand, 0, 0.58, 0);
  tip.add(mesh(paint(star(0.13, 0.06), '#ffe066'), matGlow));
  R.tip = tip;

  // Cabeza y rostro.
  const H = R.head;
  H.add(mesh(headShape(SKIN_P, 0.95), matSmooth));
  R.eyes = [makeEye(H, 1, { iris: '#2e9d6b', lash: '#3c1a12', scale: 0.9, long: true }), makeEye(H, -1, { iris: '#2e9d6b', lash: '#3c1a12', scale: 0.9, long: true })];
  H.add(mesh([
    ...[1, -1].map((s) => paint(tube([[s * 0.08, 0.525, 0.385], [s * 0.16, 0.555, 0.365], [s * 0.25, 0.525, 0.31]], [0.012, 0.018, 0.008], 5, 6), P.hair)),
    ...[1, -1].map((s) => paint(at(ball(0.07, 10, 6), { s: [1, 0.62, 0.25], r: [0, s * 0.6, 0], p: [s * 0.235, 0.215, 0.275] }), '#ff9fae')),
    paint(at(cone(0.034, 0.07, 5), { r: [-0.35, 0, 0], p: [0, 0.255, 0.4] }), '#f7c3a8'),
    paint(tube([[-0.075, 0.155, 0.335], [-0.03, 0.125, 0.365], [0.03, 0.125, 0.365], [0.075, 0.155, 0.335]], [0.007, 0.02, 0.02, 0.007], 6, 8), '#d9366b'),
    ...[1, -1].map((s) => paint(at(ball(0.07, 8, 6), { s: [0.45, 1, 0.75], p: [s * 0.405, 0.3, -0.02] }), SKIN_P)),
  ], matSmooth, false));
  H.add(mesh([1, -1].map((s) => paint(at(octa(0.04), { s: [1, 1.5, 1], p: [s * 0.43, 0.19, 0.0] }), '#ff5c9e')), matGlow));

  // Cabello: casco, flequillo y mechones largos ondulados.
  const cap = new THREE.SphereGeometry(0.46, 18, 10, 0, Math.PI * 2, 0, Math.PI * 0.53);
  cap.applyMatrix4(new THREE.Matrix4().makeRotationX(-0.62));
  H.add(mesh([
    paintBy(at(cap, { s: [1, 1.0, 0.98], p: [0, 0.45, -0.045] }), (v) => (v.y > 0.72 ? P.hair2 : P.hair)),
    ...[1, -1].flatMap((s) => [
      paint(tube([[s * 0.02, 0.87, 0.16], [s * 0.15, 0.78, 0.35], [s * 0.32, 0.6, 0.33], [s * 0.41, 0.38, 0.2]], [0.03, 0.09, 0.08, 0.02], 7, 9, 0.6), P.hair2),
      paint(tube([[s * 0.04, 0.88, 0.1], [s * 0.26, 0.76, 0.26], [s * 0.42, 0.52, 0.14], [s * 0.44, 0.2, 0.08]], [0.04, 0.1, 0.1, 0.03], 7, 9, 0.6), P.hair),
      paint(tube([[s * 0.38, 0.5, 0.08], [s * 0.46, 0.2, 0.1], [s * 0.4, -0.06, 0.13], [s * 0.36, -0.28, 0.2], [s * 0.3, -0.44, 0.2]], [0.07, 0.1, 0.085, 0.07, 0.012], 7, 12, 0.75), P.hair2),
    ]),
  ]));
  const back = group(H, 0, 0.45, -0.3);
  back.add(mesh([-3, -2, -1, 0, 1, 2, 3].map((i) => {
    const x = i * 0.115, w = i % 2 ? 0.05 : -0.05, end = -1.15 + Math.abs(i) * 0.1;
    return paint(tube([[x * 0.9, 0.22, 0.08 - Math.abs(i) * 0.03], [x * 1.1, -0.1, -0.1 + Math.abs(i) * 0.045], [x * 1.15 + w, -0.5, -0.1 + Math.abs(i) * 0.04], [x * 1.1 - w, -0.85, -0.17], [x * 0.95, end, -0.1]], [0.1, 0.13, 0.12, 0.1, 0.012], 7, 14, 0.8), i % 2 ? P.hair2 : P.hair);
  })));
  R.sway.push({ o: back, k: 0.8 });

  // Corona.
  const crown = group(H, 0, 0.84, -0.03);
  crown.rotation.x = -0.12;
  crown.scale.set(1.12, 0.95, 1.12);
  const cg = [paint(loft([{ y: 0, r: 0.27 }, { y: 0.07, r: 0.285 }], 20, { capTop: false, capBottom: false }), GOLD), paint(at(ringGeo(0.275, 0.02, 20), { r: [Math.PI / 2, 0, 0] }), GOLD)];
  const jw = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2, big = i === 0 ? 1.45 : i % 2 ? 0.75 : 1.1;
    cg.push(paint(at(cone(0.075, 0.19 * big, 4), { r: [0.12, a, 0], p: [Math.sin(a) * 0.285, 0.06 + 0.09 * big, Math.cos(a) * 0.285] }), GOLD));
    cg.push(paint(at(ball(0.026, 6, 5), { p: [Math.sin(a) * 0.3, 0.07 + 0.19 * big, Math.cos(a) * 0.3] }), '#fff0c0'));
    jw.push(paint(at(octa(0.036), { p: [Math.sin(a) * 0.295, 0.035, Math.cos(a) * 0.295] }), i % 2 ? '#ff3d8b' : '#57d6ff'));
  }
  crown.add(mesh(cg, matMetal), mesh(jw, matGlow));

  R.head.position.y = 0.83;
  R.kind = 'princess';
  return finish(R, 0.5);
}

export function makeMage() {
  const R = rig();
  const B = { main: '#2f6fe4', deep: '#1b3f9c', night: '#132a66', light: '#7fb4ff', trim: GOLD, hair: '#e9eef8', hair2: '#cfd8ea', boot: '#6b4226' };

  // Pantalón y botas con vuelta.
  for (const L of [R.legL, R.legR]) {
    L.up.add(mesh(paint(tube([[0, 0.05, 0], [0, -0.22, 0.01], [0, -0.46, 0]], [0.15, 0.13, 0.11], 8, 5), B.night)));
    L.shin.add(mesh([
      paint(tube([[0, 0.02, 0], [0, -0.16, -0.01], [0, -0.42, 0]], [0.1, 0.115, 0.09], 8, 5), B.boot),
      paint(loft([{ y: -0.1, r: 0.125 }, { y: -0.01, r: 0.145 }], 10), '#8a5a35'),
    ]));
    L.foot.add(mesh([
      paint(loft([{ y: -0.13, rx: 0.105, rz: 0.2, z: 0.08 }, { y: -0.05, rx: 0.11, rz: 0.2, z: 0.08 }, { y: 0.0, rx: 0.095, rz: 0.12, z: 0.03 }, { y: 0.05, rx: 0.085, rz: 0.09 }], 10), B.boot),
      paint(tube([[0, -0.06, 0.24], [0, -0.03, 0.31], [0, 0.05, 0.31]], [0.06, 0.04, 0.012], 6, 5), B.boot),
    ]));
  }

  // Túnica abierta al frente sobre un chaleco oscuro.
  const robe = group(R.hips, 0, 0.1, 0);
  const op = (a) => [a, Math.PI * 2 - a];
  robe.add(mesh(paint(loft([{ y: -0.5, rx: 0.36, rz: 0.3, wave: [7, 0.05] }, { y: -0.2, rx: 0.31, rz: 0.26, wave: [7, 0.03] }, { y: 0.08, rx: 0.25, rz: 0.21 }], 28, { capTop: false, capBottom: false }), B.night)));
  robe.add(mesh(paintBy(loft([
    { y: -0.97, r: 0.6, wave: [8, 0.05], arc: op(0.62) }, { y: -0.88, r: 0.59, wave: [8, 0.05], arc: op(0.6) }, { y: -0.6, r: 0.5, wave: [8, 0.045], arc: op(0.52) },
    { y: -0.3, r: 0.39, wave: [8, 0.03], arc: op(0.4) }, { y: 0.0, rx: 0.29, rz: 0.25, arc: op(0.26) }, { y: 0.1, rx: 0.275, rz: 0.235, arc: op(0.22) },
  ], 48, { arc: op(0.4) }), (v) => {
    const a = Math.abs(Math.atan2(v.x, v.z));
    if (v.y < -0.89) return B.trim;
    return a < 0.6 && v.y < 0 && a < 0.36 - v.y * 0.36 ? B.trim : new THREE.Color(B.deep).lerp(new THREE.Color(B.main), (v.y + 1) / 1.1);
  })));
  R.sway.push({ o: robe, k: 0.3 });
  R.skirt = robe;

  // Torso, chaleco y solapas.
  R.torso.add(mesh([
    paintBy(loft([
      { y: -0.05, rx: 0.27, rz: 0.225 }, { y: 0.15, rx: 0.275, rz: 0.22 }, { y: 0.38, rx: 0.32, rz: 0.235 }, { y: 0.54, rx: 0.335, rz: 0.2 }, { y: 0.64, rx: 0.28, rz: 0.17 }, { y: 0.72, rx: 0.13, rz: 0.13 },
    ], 18), (v) => (Math.abs(v.x) < 0.1 && v.z > 0.05 ? B.night : B.main)),
    paint(loft([{ y: 0.68, rx: 0.115, rz: 0.11 }, { y: 0.94, rx: 0.11, rz: 0.11, z: 0.02 }], 10), SKIN_M),
    // Esclavina sobre los hombros con borde dorado.
    paintBy(loft([
      { y: 0.36, rx: 0.5, rz: 0.36, wave: [9, 0.04], arc: op(0.55) }, { y: 0.41, rx: 0.495, rz: 0.35, wave: [9, 0.04], arc: op(0.52) }, { y: 0.56, rx: 0.44, rz: 0.29, arc: op(0.48) }, { y: 0.67, rx: 0.3, rz: 0.22, arc: op(0.42) }, { y: 0.8, rx: 0.18, rz: 0.17, arc: op(0.4) }, { y: 0.86, rx: 0.22, rz: 0.2, arc: op(0.55) },
    ], 36, { arc: op(0.5) }), (v) => (v.y < 0.4 || v.y > 0.82 ? B.trim : B.deep)),
  ]));
  R.torso.add(mesh([
    paint(at(ringGeo(0.255, 0.035, 20), { r: [Math.PI / 2, 0, 0], s: [1.08, 1.3, 0.9], p: [0, 0.0, 0] }), '#7a4a26'),
  ]));
  R.torso.add(mesh([
    paint(at(ringGeo(0.075, 0.02, 4), { r: [0, 0, Math.PI / 4], p: [0, 0.0, 0.265] }), GOLD),
    paint(at(star(0.075, 0.03), { p: [0, 0.57, 0.235] }), GOLD),
  ], matMetal));
  // Bolsita y pergamino al cinto.
  R.hips.add(mesh([
    paint(at(loft([{ y: -0.12, r: 0.06 }, { y: -0.06, r: 0.1 }, { y: 0.03, r: 0.07 }, { y: 0.06, r: 0.045 }, { y: 0.1, r: 0.07 }], 8), { p: [0.27, 0.02, 0.17] }), '#a46a36'),
    paint(at(cyl(0.045, 0.045, 0.3, 8), { r: [0, 0, 0.5], p: [-0.3, 0.02, 0.14] }), '#fbe8bf'),
    paint(at(cyl(0.05, 0.05, 0.04, 8), { r: [0, 0, 0.5], p: [-0.3, 0.02, 0.14] }), '#d24a4a'),
  ]));

  // Capa.
  const cape = group(R.torso, 0, 0.6, -0.2);
  cape.add(mesh(paintBy(loft([
    { y: -1.35, rx: 0.5, rz: 0.22, wave: [10, 0.1], z: -0.2, arc: [1.6, 4.68] }, { y: -1.25, rx: 0.49, rz: 0.2, wave: [10, 0.1], z: -0.18, arc: [1.6, 4.68] }, { y: -0.6, rx: 0.4, rz: 0.12, wave: [10, 0.08], z: -0.06, arc: [1.6, 4.68] }, { y: 0.05, rx: 0.3, rz: 0.06, z: 0.02, arc: [1.6, 4.68] },
  ], 26, { arc: [1.6, 4.68] }), (v) => (v.y < -1.25 ? B.trim : B.night))));
  R.sway.push({ o: cape, k: 1 });

  // Brazos con mangas acampanadas.
  for (const [A, s] of [[R.armL, 1], [R.armR, -1]]) {
    A.up.add(mesh(paint(tube([[0, 0.06, 0], [0, -0.15, 0], [0, -0.42, 0]], [0.1, 0.125, 0.105], 9, 5), B.main)));
    A.fore.add(mesh([
      paintBy(loft([{ y: -0.33, r: 0.2, z: -0.04 }, { y: -0.28, r: 0.195, z: -0.035 }, { y: -0.12, r: 0.135, z: -0.01 }, { y: 0.04, r: 0.105 }], 12, { capBottom: false }), (v) => (v.y < -0.28 ? B.trim : B.main)),
      paint(tube([[0, -0.1, 0], [0, -0.24, 0], [0, -0.36, 0]], [0.07, 0.065, 0.052], 8, 4), B.night),
    ]));
    A.hand.add(mesh(handGeo(SKIN_M, s)));
  }

  // Bastón retorcido con cristal.
  const staff = group(R.armR.hand, 0, -0.13, 0.06);
  staff.add(mesh([
    paint(tube([[0, -0.85, 0], [0.03, -0.45, 0.02], [-0.02, 0, -0.01], [0.03, 0.5, 0.02], [0, 0.95, 0]], [0.028, 0.038, 0.034, 0.042, 0.05], 7, 16), '#7d4f2b'),
    ...[0, 1, 2].map((i) => { const a = (i / 3) * 6.283; return paint(tube([[0, 0.92, 0], [Math.sin(a) * 0.16, 1.04, Math.cos(a) * 0.16], [Math.sin(a) * 0.15, 1.2, Math.cos(a) * 0.15], [Math.sin(a) * 0.05, 1.32, Math.cos(a) * 0.05]], [0.045, 0.035, 0.028, 0.008], 6, 8), '#7d4f2b'); }),
    paint(at(ringGeo(0.05, 0.018, 10), { r: [Math.PI / 2, 0, 0], p: [0, 0.9, 0] }), GOLD),
  ]));
  const tip = group(staff, 0, 1.15, 0);
  tip.add(mesh(paint(at(octa(0.12), { s: [0.85, 1.35, 0.85] }), '#5fe3ff'), matGlow));
  R.tip = tip;
  R.staff = staff;

  // Cabeza.
  const H = R.head;
  H.add(mesh(headShape(SKIN_M, 1.08), matSmooth));
  R.eyes = [makeEye(H, 1, { iris: '#2f7de0', lash: '#8b93a8', scale: 0.9 }), makeEye(H, -1, { iris: '#2f7de0', lash: '#8b93a8', scale: 0.9 })];
  H.add(mesh([
    paint(loft([{ y: 0.21, rx: 0.06, rz: 0.05, z: 0.41 }, { y: 0.25, rx: 0.075, rz: 0.075, z: 0.42 }, { y: 0.31, rx: 0.045, rz: 0.06, z: 0.4 }, { y: 0.4, rx: 0.028, rz: 0.04, z: 0.37 }], 9), '#e9ab86'),
    ...[1, -1].map((s) => paint(at(ball(0.075, 8, 6), { s: [0.45, 1.05, 0.75], p: [s * 0.41, 0.31, -0.02] }), SKIN_M)),
    ...[1, -1].map((s) => paint(at(ball(0.07, 10, 6), { s: [1, 0.6, 0.25], r: [0, s * 0.6, 0], p: [s * 0.245, 0.225, 0.275] }), '#f2a184')),
  ], matSmooth, false));
  // Cejas pobladas, bigote y barba por mechones.
  H.add(mesh([
    ...[1, -1].map((s) => paint(tube([[s * 0.06, 0.505, 0.4], [s * 0.16, 0.545, 0.385], [s * 0.29, 0.5, 0.3]], [0.028, 0.044, 0.01], 6, 6), B.hair)),
    ...[1, -1].map((s) => paint(tube([[s * 0.01, 0.19, 0.4], [s * 0.1, 0.17, 0.41], [s * 0.21, 0.1, 0.34], [s * 0.28, 0.12, 0.28]], [0.045, 0.06, 0.04, 0.008], 7, 8), B.hair)),
  ]));
  const beard = group(H, 0, 0.12, 0.16);
  beard.add(mesh([
    paint(loft([{ y: -0.62, rx: 0.015, rz: 0.015, z: 0.16 }, { y: -0.48, rx: 0.09, rz: 0.07, z: 0.15 }, { y: -0.28, rx: 0.17, rz: 0.11, z: 0.13 }, { y: -0.1, rx: 0.25, rz: 0.15, z: 0.1 }, { y: 0.02, rx: 0.27, rz: 0.16, z: 0.06 }], 12, { capTop: false }), B.hair),
    ...[-2, -1, 1, 2].map((i) => paint(tube([[i * 0.1, 0.05, 0.12 - Math.abs(i) * 0.03], [i * 0.12, -0.15, 0.17 - Math.abs(i) * 0.03], [i * 0.085, -0.36, 0.2 - Math.abs(i) * 0.02], [i * 0.04, -0.52 + Math.abs(i) * 0.05, 0.2]], [0.07, 0.085, 0.065, 0.01], 7, 10), Math.abs(i) === 1 ? B.hair2 : B.hair)),
    paint(tube([[0, 0.02, 0.2], [0, -0.2, 0.24], [0.01, -0.42, 0.22], [0.03, -0.66, 0.21]], [0.05, 0.085, 0.07, 0.01], 7, 10), B.hair),
    ...[1, -1].map((s) => paint(tube([[s * 0.37, 0.36, -0.14], [s * 0.36, 0.16, -0.06], [s * 0.26, -0.02, 0.04]], [0.04, 0.075, 0.08], 6, 6, 0.6), B.hair)),
  ]));
  // Boca bajo el bigote.
  H.add(mesh(paint(at(ball(0.05, 8, 6), { s: [1.1, 0.5, 0.4], p: [0, 0.1, 0.385] }), '#8c2f3a'), matSmooth, false));
  R.sway.push({ o: beard, k: 0.25 });
  // Cabello trasero.
  H.add(mesh([-2, -1, 0, 1, 2].map((i) => paint(tube([[i * 0.15, 0.52, -0.28 + Math.abs(i) * 0.07], [i * 0.17, 0.2, -0.38 + Math.abs(i) * 0.1], [i * 0.15, -0.1, -0.33 + Math.abs(i) * 0.05], [i * 0.13, -0.24, -0.38]], [0.1, 0.12, 0.09, 0.012], 7, 9, 0.8), i % 2 ? B.hair2 : B.hair))));

  // Sombrero de punta doblada.
  const hat = group(H, 0, 0.575, -0.04);
  hat.rotation.x = -0.15;
  hat.add(mesh([
    paintBy(loft([
      { y: 0.0, r: 0.4 }, { y: -0.02, r: 0.52, wavy: [3, 0.025] }, { y: 0.0, r: 0.68, wavy: [3, 0.06] }, { y: 0.035, r: 0.68, wavy: [3, 0.06] }, { y: 0.05, r: 0.5, wavy: [3, 0.02] }, { y: 0.06, r: 0.42 },
    ], 26), (v) => (Math.hypot(v.x, v.z) > 0.66 ? B.trim : B.main)),
    paintBy(tube([[0, 0.02, 0], [0, 0.3, -0.01], [0.02, 0.62, -0.06], [0.12, 0.88, -0.14], [0.32, 0.98, -0.2], [0.46, 0.9, -0.2]], [0.42, 0.35, 0.24, 0.15, 0.09, 0.02], 14, 18), (v) => (v.y > 0.8 ? B.light : v.y > 0.45 ? '#3f80f2' : B.main)),
  ]));
  hat.add(mesh([
    paint(loft([{ y: 0.05, r: 0.425 }, { y: 0.15, r: 0.4 }], 20, { capTop: false, capBottom: false }), GOLD),
    paint(at(star(0.1, 0.03), { r: [-0.2, 0.75, 0.2], p: [0.24, 0.36, 0.22] }), GOLD),
    paint(at(star(0.075, 0.03), { r: [-0.2, -0.6, 0], p: [-0.17, 0.5, 0.2] }), GOLD),
    paint(at(star(0.06, 0.03), { r: [0, 0.1, 0.3], p: [0.03, 0.66, 0.14] }), GOLD),
    paint(at(star(0.09, 0.03), { r: [0.2, 3.6, 0], p: [-0.12, 0.38, -0.34] }), GOLD),
  ], matMetal));
  hat.add(mesh(paint(at(octa(0.075), { s: [1, 1, 0.6], p: [0, 0.1, 0.42] }), '#5fe3ff'), matGlow));
  hat.add(mesh(paint(at(ball(0.05, 7, 5), { p: [0.47, 0.88, -0.2] }), GOLD), matMetal));

  R.kind = 'mage';
  return finish(R, 0.5);
}

function finish(R, scale) {
  R.body.scale.setScalar(scale);
  R.state = 'idle';
  R.time = Math.random() * 10;
  R.walkPhase = 0;
  R.blink = 2;
  R.mood = 0;
  R.vel = 0;
  return new Character(R);
}

const damp = (a, b, k, dt) => a + (b - a) * (1 - Math.exp(-k * dt));

export class Character {
  constructor(R) {
    this.R = R;
    this.root = R.root;
    this.pose = 'idle';
    this.poseT = 0;
    this.turnTo = 0;
    this.lean = 0;
    this.J = {
      aL: [0, 0, 0.16], aR: [0, 0, -0.16], fL: 0, fR: 0, lL: 0, lR: 0, sL: 0, sR: 0, torso: [0, 0, 0], head: [0, 0, 0], y: 0,
    };
  }

  set(pose, dur = Infinity) { this.pose = pose; this.poseT = 0; this.poseDur = dur; }

  update(dt) {
    const R = this.R, J = this.J, mage = R.kind === 'mage';
    R.time += dt;
    this.poseT += dt;
    if (this.poseT > this.poseDur) this.set('idle');
    const t = R.time, b = Math.sin(t * 1.9);
    let T = {
      aL: [0.05 + b * 0.03, 0, 0.17 + b * 0.02], aR: mage ? [-0.3, 0, -0.5] : [-0.22 + b * 0.03, 0, -0.2],
      fL: -0.22, fR: mage ? -0.6 : -0.55, lL: 0, lR: 0, sL: 0, sR: 0,
      torso: [b * 0.015, Math.sin(t * 0.7) * 0.05, Math.sin(t * 0.95) * 0.02], head: [-b * 0.02, Math.sin(t * 0.55) * 0.22, Math.sin(t * 0.8) * 0.04], y: 0,
    };
    let k = 9;
    if (this.pose === 'walk') {
      R.walkPhase += dt * 13;
      const w = Math.sin(R.walkPhase);
      T.lL = w * 0.75; T.lR = -w * 0.75;
      T.sL = Math.max(0, -Math.cos(R.walkPhase)) * 0.9; T.sR = Math.max(0, Math.cos(R.walkPhase)) * 0.9;
      T.aL = [-w * 0.6, 0, 0.2]; T.fL = -0.5;
      T.aR = mage ? [-0.55 + w * 0.15, 0, -0.2] : [w * 0.5, 0, -0.22];
      T.torso = [0.12, w * 0.12, 0]; T.head = [-0.06, -w * 0.1, 0];
      T.y = Math.abs(Math.cos(R.walkPhase)) * 0.06;
      k = 18;
    } else if (this.pose === 'cheer') {
      const c = Math.abs(Math.sin(this.poseT * 7));
      T.aL = [-2.7, 0, 0.35 + c * 0.2]; T.aR = [mage ? -2.3 : -2.8, 0, -0.35 - c * 0.2]; T.fL = -0.25; T.fR = -0.2;
      T.y = c * 0.45; T.head = [-0.22, 0, Math.sin(this.poseT * 7) * 0.1]; T.lL = c * 0.25; T.lR = -c * 0.25; T.sL = c * 0.4; T.sR = c * 0.4;
      k = 14;
    } else if (this.pose === 'cast') {
      T.aR = [-1.75, 0, -0.15]; T.fR = -0.1; T.aL = [-0.5, 0, 0.9]; T.fL = -0.9; T.torso = [-0.1, 0.3, 0]; T.head = [-0.1, -0.1, 0]; k = 12;
    } else if (this.pose === 'hurt') {
      const q = Math.sin(this.poseT * 24) * Math.max(0, 1 - this.poseT);
      T.torso = [-0.25, q * 0.4, q * 0.12]; T.head = [0.35, q * 0.3, 0]; T.aL = [-0.9, 0, 0.8]; T.aR = [-0.9, 0, -0.7]; T.fL = -1.4; T.fR = -1.2; T.lL = -0.2; T.lR = 0.15; k = 14;
    } else if (this.pose === 'sad') {
      T.torso = [0.22, 0, 0]; T.head = [0.42, Math.sin(this.poseT * 3) * 0.25, 0]; T.aL = [0.15, 0, 0.06]; T.fL = -0.1;
    } else if (this.pose === 'throw') {
      const q = Math.min(1, this.poseT * 4);
      T.aR = [-2.2 + q * 1.5, 0, -0.3]; T.fR = -0.6 + q * 0.5; T.torso = [q * 0.2, -0.35 + q * 0.6, 0]; k = 16;
    } else if (this.pose === 'fly') {
      T.aL = [-0.4, 0, 1.4]; T.aR = [-0.4, 0, -1.4]; T.lL = 0.3; T.lR = -0.3; T.sL = 0.6; T.sR = 0.7; T.head = [-0.3, 0, 0]; k = 14;
    }
    for (const key of Object.keys(T)) {
      if (Array.isArray(T[key])) T[key].forEach((v, i) => (J[key][i] = damp(J[key][i], v, k, dt)));
      else J[key] = damp(J[key], T[key], k, dt);
    }
    R.armL.up.rotation.set(...J.aL); R.armR.up.rotation.set(...J.aR);
    R.armL.fore.rotation.x = J.fL; R.armR.fore.rotation.x = J.fR;
    R.legL.up.rotation.x = -J.lL; R.legR.up.rotation.x = -J.lR;
    R.legL.shin.rotation.x = J.sL; R.legR.shin.rotation.x = J.sR;
    R.torso.rotation.set(...J.torso); R.head.rotation.set(...J.head);
    R.body.position.y = J.y * 0.5;
    if (R.staff) R.staff.rotation.z = -J.aR[2];
    if (R.staff) R.staff.rotation.x = -(J.aR[0] + J.fR) * (this.pose === 'cast' || this.pose === 'cheer' ? 0.55 : 1) + 0.05;
    R.body.scale.y = 0.5 * (1 + b * 0.006);

    // Movimiento secundario de pelo, capa y falda.
    R.sway.forEach((s, i) => {
      s.o.rotation.x = Math.sin(t * 1.7 + i) * 0.03 * s.k + (this.pose === 'walk' ? -0.22 * s.k + Math.sin(R.walkPhase * 2 + i) * 0.06 * s.k : 0) * -1 * (s.o === R.skirt ? 0.4 : 1);
      s.o.rotation.z = Math.sin(t * 1.3 + i * 2) * 0.04 * s.k;
    });
    R.tip.rotation.y += dt * 2;
    R.tip.scale.setScalar(1 + Math.sin(t * 4) * 0.08);

    // Parpadeo.
    R.blink -= dt;
    const closed = R.blink < 0 ? (R.blink < -0.12 ? ((R.blink = 1.5 + Math.random() * 3), 1) : 0.12) : 1;
    for (const e of R.eyes) e.scale.y = this.pose === 'cheer' ? 0.35 : closed;

    // Giro suave hacia la dirección deseada.
    let d = this.turnTo - this.root.rotation.y;
    d = Math.atan2(Math.sin(d), Math.cos(d));
    this.root.rotation.y += d * (1 - Math.exp(-11 * dt));
  }
}
