import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

// Herramientas de modelado por código: todo el juego usa colores por vértice
// y caras planas, sin texturas.

export const mat = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.78, metalness: 0.02, side: THREE.DoubleSide });
export const matSmooth = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0, side: THREE.DoubleSide });
export const matMetal = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.3, metalness: 0.4, side: THREE.DoubleSide, envMapIntensity: 2.2, emissive: '#7a4a00', emissiveIntensity: 0.35 });
export const matGlow = new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 0.15, metalness: 0.1, emissive: 0xffffff, emissiveIntensity: 0.55 });
matGlow.onBeforeCompile = (s) => {
  s.fragmentShader = s.fragmentShader.replace('#include <emissivemap_fragment>', 'totalEmissiveRadiance *= vColor.rgb;');
};

const tmp = new THREE.Color();

export function paint(geo, color) {
  let g = geo.index ? geo.toNonIndexed() : geo;
  g.deleteAttribute('uv');
  const n = g.attributes.position.count;
  const arr = new Float32Array(n * 3);
  tmp.set(color);
  for (let i = 0; i < n; i++) tmp.toArray(arr, i * 3);
  g.setAttribute('color', new THREE.BufferAttribute(arr, 3));
  return g;
}

// Colorea según la posición: útil para degradados (faldas, montañas, cabello).
export function paintBy(geo, fn) {
  const g = paint(geo, '#fff');
  const p = g.attributes.position, c = g.attributes.color;
  const v = new THREE.Vector3();
  for (let i = 0; i < p.count; i += 3) {
    v.set(0, 0, 0);
    for (let k = 0; k < 3; k++) v.add(new THREE.Vector3().fromBufferAttribute(p, i + k));
    tmp.set(fn(v.divideScalar(3)));
    for (let k = 0; k < 3; k++) c.setXYZ(i + k, tmp.r, tmp.g, tmp.b);
  }
  return g;
}

export function at(geo, { p, r, s } = {}) {
  if (s != null) Array.isArray(s) ? geo.scale(...s) : geo.scale(s, s, s);
  if (r) geo.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(...r)));
  if (p) geo.translate(...p);
  return geo;
}

export function merge(list) {
  const clean = list.map((g) => {
    const n = g.index ? g.toNonIndexed() : g;
    n.deleteAttribute('uv');
    if (!n.attributes.normal) n.computeVertexNormals();
    return n;
  });
  return mergeGeometries(clean);
}

// Superficie por secciones elípticas apiladas: cuerpos, faldas, cabezas, torres.
// ring: { y, rx, rz, x, z, wave:[n, amplitud, fase], sq }
export function loft(rings, seg = 12, { capTop = true, capBottom = true, arc = null } = {}) {
  const pos = [], idx = [];
  const n = arc ? seg + 1 : seg;
  for (const k of rings) {
    const rx = k.rx ?? k.r, rz = k.rz ?? rx;
    const a0 = arc ? (k.arc ?? arc)[0] : 0, a1 = arc ? (k.arc ?? arc)[1] : Math.PI * 2;
    for (let i = 0; i < n; i++) {
      const a = a0 + ((a1 - a0) * i) / seg;
      let m = 1, dy = 0;
      if (k.wave) m += Math.cos(a * k.wave[0] + (k.wave[2] || 0)) * k.wave[1];
      if (k.wavy) dy = Math.cos(a * k.wavy[0]) * k.wavy[1];
      let sx = Math.sin(a), sz = Math.cos(a);
      if (k.sq) { const e = 1 - k.sq; sx = Math.sign(sx) * Math.abs(sx) ** e; sz = Math.sign(sz) * Math.abs(sz) ** e; }
      pos.push((k.x || 0) + sx * rx * m, k.y + dy, (k.z || 0) + sz * rz * m);
    }
  }
  const up = rings[rings.length - 1].y >= rings[0].y;
  const quad = (a, b, c, d) => (up ? idx.push(a, b, c, a, c, d) : idx.push(a, c, b, a, d, c));
  for (let j = 0; j < rings.length - 1; j++)
    for (let i = 0; i < seg; i++) {
      const i2 = arc ? i + 1 : (i + 1) % n;
      quad(j * n + i, j * n + i2, (j + 1) * n + i2, (j + 1) * n + i);
    }
  if (!arc) {
    const cap = (j, flip) => {
      const k = rings[j], c = pos.length / 3;
      pos.push(k.x || 0, k.y, k.z || 0);
      for (let i = 0; i < seg; i++) {
        const a = j * n + i, b = j * n + ((i + 1) % n);
        flip ? idx.push(c, b, a) : idx.push(c, a, b);
      }
    };
    if (capBottom) cap(0, up);
    if (capTop) cap(rings.length - 1, !up);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g.toNonIndexed();
}

// Tubo que cambia de grosor a lo largo de una curva: brazos, mechones, ramas.
export function tube(points, radii, seg = 6, steps = 10, flat = 1) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const fr = curve.computeFrenetFrames(steps, false);
  const pos = [], idx = [];
  for (let j = 0; j <= steps; j++) {
    const t = j / steps, c = curve.getPoint(t);
    const f = t * (radii.length - 1), i0 = Math.min(Math.floor(f), radii.length - 2);
    const r = radii[i0] + (radii[i0 + 1] - radii[i0]) * (f - i0);
    for (let i = 0; i < seg; i++) {
      const a = (i / seg) * Math.PI * 2;
      const n = fr.normals[j], b = fr.binormals[j];
      const u = Math.cos(a) * r, v = Math.sin(a) * r * flat;
      pos.push(c.x + n.x * u + b.x * v, c.y + n.y * u + b.y * v, c.z + n.z * u + b.z * v);
    }
  }
  for (let j = 0; j < steps; j++)
    for (let i = 0; i < seg; i++) {
      const i2 = (i + 1) % seg;
      idx.push(j * seg + i, j * seg + i2, (j + 1) * seg + i2, j * seg + i, (j + 1) * seg + i2, (j + 1) * seg + i);
    }
  for (const [j, flip] of [[0, true], [steps, false]]) {
    const c = pos.length / 3, p = curve.getPoint(j / steps);
    pos.push(p.x, p.y, p.z);
    for (let i = 0; i < seg; i++) {
      const a = j * seg + i, b = j * seg + ((i + 1) % seg);
      flip ? idx.push(c, b, a) : idx.push(c, a, b);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g.toNonIndexed();
}

export const ball = (r, w = 8, h = 6) => new THREE.SphereGeometry(r, w, h);
export const ico = (r, d = 0) => new THREE.IcosahedronGeometry(r, d);
export const octa = (r) => new THREE.OctahedronGeometry(r, 0);
export const box = (x, y, z) => new THREE.BoxGeometry(x, y, z);
export const cone = (r, h, s = 6) => new THREE.ConeGeometry(r, h, s);
export const cyl = (a, b, h, s = 8) => new THREE.CylinderGeometry(a, b, h, s);
export const ringGeo = (r, t, s = 16, ts = 5) => new THREE.TorusGeometry(r, t, ts, s);

export function star(r, depth = 0.04) {
  const sh = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2 + Math.PI / 2, q = i % 2 ? r * 0.45 : r;
    i ? sh.lineTo(Math.cos(a) * q, Math.sin(a) * q) : sh.moveTo(Math.cos(a) * q, Math.sin(a) * q);
  }
  return new THREE.ExtrudeGeometry(sh, { depth, bevelEnabled: false }).translate(0, 0, -depth / 2);
}

export function mesh(geos, material = mat, shadow = true) {
  const m = new THREE.Mesh(Array.isArray(geos) ? merge(geos) : geos, material);
  m.castShadow = shadow;
  m.receiveShadow = shadow;
  return m;
}
