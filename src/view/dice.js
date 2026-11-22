import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { paint, at, cyl, mesh, ringGeo, star, matMetal } from './geo.js';
import { ease } from './stage.js';

const NORMAL = { 1: [0, 1, 0], 6: [0, -1, 0], 2: [1, 0, 0], 5: [-1, 0, 0], 3: [0, 0, 1], 4: [0, 0, -1] };
const PIPS = { 1: [[0, 0]], 2: [[-1, -1], [1, 1]], 3: [[-1, -1], [0, 0], [1, 1]], 4: [[-1, -1], [1, -1], [-1, 1], [1, 1]], 5: [[-1, -1], [1, -1], [0, 0], [-1, 1], [1, 1]], 6: [[-1, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [1, 1]] };

function makeDie(color) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(new RoundedBoxGeometry(1, 1, 1, 3, 0.16), new THREE.MeshStandardMaterial({ color, roughness: 0.28, metalness: 0.05 }));
  body.castShadow = true;
  g.add(body);
  const geos = [];
  for (let f = 1; f <= 6; f++) {
    const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(...NORMAL[f]));
    for (const [x, z] of PIPS[f]) {
      const p = paint(cyl(f === 1 ? 0.15 : 0.1, f === 1 ? 0.15 : 0.1, 0.02, 14), '#fff8e6');
      p.translate(x * 0.25, 0.5, z * 0.25);
      p.applyQuaternion(q);
      geos.push(p);
    }
  }
  g.add(mesh(geos, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, emissive: '#fff3d0', emissiveIntensity: 0.12 }), false));
  return g;
}

// Los dados ruedan sobre un disco rúnico que flota frente a la cámara.
export class DiceTable {
  constructor(stage, colors) {
    this.stage = stage;
    this.root = new THREE.Group();
    this.root.visible = false;
    stage.scene.add(this.root);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(1.75, 1.6, 0.1, 12), new THREE.MeshStandardMaterial({ color: '#4b2f7a', roughness: 0.5, flatShading: true }));
    disc.position.y = -0.05;
    disc.receiveShadow = true;
    this.rune = new THREE.Group();
    this.rune.add(mesh([paint(at(ringGeo(1.55, 0.035, 36), { r: [Math.PI / 2, 0, 0] }), '#ffc93c'), paint(at(ringGeo(1.15, 0.018, 30), { r: [Math.PI / 2, 0, 0] }), '#ffc93c'), ...Array.from({ length: 6 }, (_, i) => paint(at(star(0.12, 0.02), { r: [-Math.PI / 2, 0, 0], p: [Math.sin(i * 1.047) * 1.35, 0.01, Math.cos(i * 1.047) * 1.35] }), '#ffe066'))], matMetal, false));
    this.root.add(disc, this.rune);
    this.sets = colors.map((c) => [0, 1, 2].map(() => { const d = makeDie(c); d.visible = false; this.root.add(d); return d; }));
    this.upd = (dt) => { this.rune.rotation.y += dt * 0.5; if (this.root.visible) this.place(); };
    stage.updaters.push(this.upd);
  }

  dispose() {
    this.stage.updaters.splice(this.stage.updaters.indexOf(this.upd), 1);
    this.stage.scene.remove(this.root);
  }

  place() {
    const c = this.stage.camera, f = new THREE.Vector3();
    c.getWorldDirection(f);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(c.quaternion);
    this.root.position.copy(c.position).addScaledVector(f, this.stage.portrait ? 5.6 : 5).addScaledVector(up, -0.05);
    this.root.rotation.y = this.stage.cam.yaw;
  }

  async roll(p, values, onHit) {
    const st = this.stage;
    for (const s of this.sets) s.forEach((d) => (d.visible = false));
    this.root.visible = true;
    this.place();
    st.tween(0.25, (k) => this.root.scale.setScalar(0.02 + k * 0.4), ease.back);
    await Promise.all(values.map((v, i) => {
      const d = this.sets[p][i];
      d.visible = true;
      d.scale.setScalar(0.85);
      const x1 = values.length === 1 ? 0 : (i - (values.length - 1) / 2) * 0.98, z1 = values.length === 1 ? 0 : (i % 2) * 0.35 - 0.15;
      const rest = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), (Math.random() - 0.5) * 0.9)
        .multiply(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(...NORMAL[v]), new THREE.Vector3(0, 1, 0)));
      const axis = new THREE.Vector3(Math.random() - 0.3, Math.random() * 0.6, -1).normalize();
      const q = new THREE.Quaternion();
      let hits = 0;
      const x0 = (p ? 1 : -1) * 2.6;
      return st.tween(1.15 + i * 0.12, (_, t) => {
        // Tres rebotes cada vez más bajos.
        const seg = [0, 0.38, 0.66, 0.85, 1], n = Math.max(0, seg.findIndex((s) => t <= s) - 1);
        const u = (t - seg[n]) / (seg[n + 1] - seg[n]);
        const amp = [1.3, 0.75, 0.32, 0.08][n];
        const y = n === 0 ? 1.3 * (1 - u * u) : amp * 4 * u * (1 - u);
        if (n > hits) { hits = n; onHit?.(n); st.sparks.burst(this.root.position.x, this.root.position.y + 0.02, this.root.position.z, 6, { color: '#ffe9a8', speed: 1, life: 0.4, size: 0.06 }); }
        const e = 1 - (1 - t) ** 2;
        d.position.set(x0 + (x1 - x0) * e, 0.43 + y, 0.7 + (z1 - 0.7) * e);
        d.quaternion.copy(rest).premultiply(q.setFromAxisAngle(axis, (1 - t) ** 1.6 * 17));
      }, ease.lin);
    }));
    await st.wait(0.45);
  }

  async hide() {
    if (!this.root.visible) return;
    await this.stage.tween(0.25, (k) => this.root.scale.setScalar(0.42 * (1 - k) + 0.001));
    this.root.visible = false;
  }
}
