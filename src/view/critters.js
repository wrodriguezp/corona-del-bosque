import * as THREE from 'three';
import { matGlow, paint, paintBy, at, tube, ball, ico, box, cone, cyl, mesh } from './geo.js';
import { makeFairy } from './creatures.js';

// Criaturas que vagan por el tablero. Miran hacia +z y miden cerca de media casilla.

function makeBunny() {
  const g = new THREE.Group(), b = new THREE.Group();
  b.add(mesh([
    paint(at(ico(0.2, 1), { s: [0.9, 0.85, 1.15], p: [0, 0.2, 0] }), '#f7f3ff'),
    paint(at(ico(0.14, 1), { p: [0, 0.38, 0.16] }), '#ffffff'),
    paint(at(ico(0.08, 0), { p: [0, 0.22, -0.22] }), '#ffffff'),
    ...[1, -1].map((s) => paint(at(ico(0.07, 0), { s: [0.9, 0.6, 1.3], p: [s * 0.1, 0.05, 0.1] }), '#ece6f5')),
    ...[1, -1].flatMap((s) => [
      paint(at(cone(0.05, 0.32, 5), { s: [1, 1, 0.45], r: [-0.25, 0, s * 0.18], p: [s * 0.06, 0.62, 0.12] }), '#ffffff'),
      paint(at(cone(0.028, 0.24, 4), { s: [1, 1, 0.3], r: [-0.25, 0, s * 0.18], p: [s * 0.062, 0.6, 0.135] }), '#ffb3cf'),
    ]),
    paint(at(ball(0.025, 6, 4), { p: [0, 0.37, 0.3] }), '#ff8fb5'),
  ]));
  b.add(mesh([1, -1].map((s) => paint(at(ball(0.026, 6, 4), { p: [s * 0.07, 0.42, 0.27] }), '#2b1b3a'))));
  g.add(b);
  g.userData.body = b;
  g.userData.idle = (t) => { b.position.y = Math.max(0, Math.sin(t * 3.2)) * 0.08; b.rotation.y = Math.sin(t * 0.7) * 0.4; };
  return g;
}

function makeWolf() {
  const g = new THREE.Group(), b = new THREE.Group(), grey = (v) => (v.y > 0.34 ? '#8c8aa6' : '#6c6a86');
  b.add(mesh([
    paintBy(at(ico(0.2, 1), { s: [0.85, 0.8, 1.6], p: [0, 0.33, 0] }), grey),
    paintBy(at(ico(0.15, 1), { s: [0.95, 0.9, 1.05], p: [0, 0.47, 0.3] }), grey),
    paint(at(cone(0.08, 0.2, 5), { r: [Math.PI / 2, 0, 0], p: [0, 0.43, 0.46] }), '#a9a7c0'),
    paint(at(ball(0.03, 6, 4), { p: [0, 0.45, 0.56] }), '#1f1a2a'),
    ...[1, -1].map((s) => paint(at(cone(0.055, 0.14, 4), { p: [s * 0.08, 0.63, 0.27] }), '#5a5874')),
    ...[[1, 0.18], [-1, 0.18], [1, -0.18], [-1, -0.18]].map(([s, z]) => paint(at(cyl(0.04, 0.035, 0.26, 5), { p: [s * 0.09, 0.13, z] }), '#5a5874')),
    paint(tube([[0, 0.36, -0.28], [0, 0.42, -0.42], [0, 0.36, -0.55]], [0.06, 0.07, 0.02], 5, 6), '#7c7a96'),
  ]));
  b.add(mesh([1, -1].map((s) => paint(at(ball(0.025, 6, 4), { p: [s * 0.06, 0.52, 0.42] }), '#ffd84a')), matGlow));
  g.add(b);
  g.userData.body = b;
  g.userData.idle = (t) => { b.rotation.y = Math.sin(t * 0.9) * 0.35; b.position.y = Math.abs(Math.sin(t * 1.6)) * 0.015; };
  return g;
}

function makeTroll() {
  const g = new THREE.Group(), b = new THREE.Group(), skin = (v) => (v.y > 0.55 ? '#7fae6a' : '#6a9658');
  b.add(mesh([
    paintBy(at(ico(0.26, 1), { s: [1.05, 1, 0.85], p: [0, 0.42, 0] }), skin),
    paint(at(cyl(0.27, 0.22, 0.14, 7), { p: [0, 0.24, 0] }), '#8a5a34'),
    paintBy(at(ico(0.18, 1), { p: [0, 0.78, 0.04] }), skin),
    paint(at(ico(0.07, 0), { s: [1, 0.8, 1.4], p: [0, 0.75, 0.22] }), '#8fbf79'),
    ...[1, -1].map((s) => paint(at(cone(0.05, 0.12, 4), { r: [0, 0, s * -1.2], p: [s * 0.19, 0.82, 0] }), '#6a9658')),
    ...[1, -1].map((s) => paint(at(cyl(0.07, 0.06, 0.22, 6), { p: [s * 0.12, 0.1, 0] }), '#6a9658')),
    paint(at(cyl(0.07, 0.06, 0.34, 6), { r: [0, 0, 0.5], p: [-0.3, 0.42, 0.04] }), '#7fae6a'),
    paint(at(cyl(0.07, 0.06, 0.3, 6), { r: [0.9, 0, -0.3], p: [0.29, 0.44, 0.12] }), '#7fae6a'),
    paint(at(cyl(0.05, 0.1, 0.62, 6), { r: [0.25, 0, -0.35], p: [0.36, 0.62, 0.28] }), '#7b4a2d'),
    paint(at(box(0.08, 0.03, 0.06), { p: [0, 0.69, 0.19] }), '#f3ead2'),
  ]));
  b.add(mesh([1, -1].map((s) => paint(at(ball(0.028, 6, 4), { p: [s * 0.07, 0.84, 0.17] }), '#2b1b10'))));
  g.add(b);
  g.userData.body = b;
  g.userData.idle = (t) => { b.rotation.z = Math.sin(t * 1.4) * 0.06; b.rotation.y = Math.sin(t * 0.5) * 0.3; };
  return g;
}

function makeSprite() {
  const g = new THREE.Group(), f = makeFairy();
  f.scale.setScalar(0.85);
  f.position.y = 0.75;
  g.add(f);
  g.userData.body = f;
  g.userData.idle = (t) => { f.position.y = 0.75 + Math.sin(t * 2.2) * 0.1; f.rotation.y = Math.sin(t * 0.8) * 0.6; f.userData.fly(t); };
  return g;
}

export const MAKE = { conejo: makeBunny, lobo: makeWolf, troll: makeTroll, hada: makeSprite };
export const makeCritter = (kind) => MAKE[kind]();
