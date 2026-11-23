import * as THREE from 'three';
import { paint, paintBy, at, loft, ico, octa, cone, cyl, ringGeo, star, mesh } from './geo.js';

export const C = new THREE.Vector3(24, 1.1, 0); // centro de la isla de minijuegos
export const COLORS = ['#ff5c9e', '#4b8df7'];
export const V = (x, y, z) => new THREE.Vector3(C.x + x, C.y + y, C.z + z);

// Isla donde se juega: r radio, k cuánto se aplasta hacia el fondo, plaza de piedra o césped.
export function island({ r = 7, k = 1, top = ['#8fd45c', '#83c952'], plaza = false, tower = false }) {
  const g = new THREE.Group();
  g.add(mesh(paintBy(at(loft([{ y: -2.6, r: r * 0.5, wave: [5, 0.1] }, { y: -1.1, r: r * 0.85, wave: [6, 0.07] }, { y: -0.16, r: r * 1.02, wave: [9, 0.02] }, { y: 0, r, wave: [9, 0.015] }, { y: 0.004, r: r * 0.78 }, { y: 0.008, r: r * 0.55, wave: [5, 0.06] }, { y: 0.012, r: r * 0.3 }], 26), { s: [1, 1, k] }), (v) => (v.y > -0.1 ? top[Math.abs(Math.floor(v.x * 2.3) + Math.floor(v.z * 3.1)) % 2] : v.y > -0.5 ? '#b58a66' : '#7b5a57'))));
  if (plaza) g.add(mesh([paint(at(ringGeo(r - 0.25, 0.08, 40, 4), { r: [Math.PI / 2, 0, 0], p: [0, 0.04, 0] }), '#ffc93c'), ...Array.from({ length: 6 }, (_, i) => paint(at(star(0.28, 0.03), { r: [-Math.PI / 2, 0, 0], p: [Math.sin(i * 1.047) * 2.6, 0.03, Math.cos(i * 1.047) * 2.6] }), '#b9aee0')), paint(at(ringGeo(2.6, 0.03, 36, 4), { r: [Math.PI / 2, 0, 0], p: [0, 0.025, 0] }), '#b9aee0')]));
  if (tower) g.add(mesh(paintBy(at(loft([{ y: -0.1, r: 0.9 }, { y: 0.5, r: 0.75 }, { y: 0.62, r: 0.85 }, { y: 0.7, r: 0.8 }], 8), { p: [0, 0, -5.7] }), (v) => (v.y > 0.55 ? '#efe6ff' : '#a397c9'))));
  const deco = [];
  for (let i = 0; i < 18; i++) {
    const a = i * 2.399, q = r * (0.86 + (i % 3) * 0.04), x = Math.sin(a) * q, z = Math.cos(a) * q * k;
    if (plaza || z > 0.6) { deco.push(paintBy(at(ico(0.16 + (i % 3) * 0.05), { p: [x, 0.06, z] }), (v) => (v.y > 0.1 ? '#c9c0d6' : '#8c8399'))); continue; }
    if (i % 2) deco.push(paint(at(cyl(0.07, 0.1, 0.5, 6), { p: [x, 0.25, z] }), '#7b4a2d'), ...[[0.45, 0.6], [0.8, 0.48], [1.1, 0.34]].map(([y, w]) => paint(at(cone(w * 0.75, 0.6, 7), { p: [x, y + 0.2, z] }), i % 4 === 1 ? '#3aa568' : '#2f8f5b')));
    else deco.push(paint(at(octa(0.09), { p: [x, 0.16, z] }), ['#ff7fb2', '#ffd84a', '#9d8cff'][i % 3]), paint(at(cyl(0.012, 0.015, 0.16, 4), { p: [x, 0.08, z] }), '#3f9a4b'));
  }
  g.add(mesh(deco));
  g.position.copy(C);
  return g;
}
