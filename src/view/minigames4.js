import * as THREE from 'three';
import { matGlow, paint, paintBy, at, ball, box, cone, cyl, mesh } from './geo.js';
import { LAMP, ROW } from '../core/minigames/equipo.js';
import { V, COLORS } from './arena.js';
import { sfx } from '../audio.js';

// Escenas de los minijuegos en equipo: los dos contra la Sombra.
const up = (p, y) => new THREE.Vector3(p.x, p.y + y, p.z);
const pose = (h, name) => { if (h.pose !== name) h.set(name); };
const SIDE = [-1, 1];
const DARK = '#2a2140';

// Mancha de sombra con dos ojos que brillan.
function makeBlob(r = 0.42) {
  const g = new THREE.Group();
  g.body = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), new THREE.MeshStandardMaterial({ color: DARK, emissive: '#4a2f7a', emissiveIntensity: 0.25, flatShading: true, roughness: 0.9 }));
  g.body.scale.set(1, 0.75, 1);
  g.eyes = mesh([1, -1].map((k) => paint(at(ball(r * 0.16, 6, 4), { s: [1, 0.6, 0.5], p: [k * r * 0.33, r * 0.2, r * 0.78] }), '#ffe14a')), matGlow, false);
  g.add(g.body, g.eyes);
  return g;
}

export const TEAM_VIEWS = {
  faroles: {
    island: { r: 5.4, top: ['#4b4f7a', '#545985'], plaza: true },
    cam: { z: -0.4, zTall: 1.4, y: 0, w: 11.6, pitch: 0.9, h: 12.6 },
    foe: { p: [0, 0, -5.2], s: 1.1 },
    init(v) {
      v.lamp = new THREE.Group();
      v.lamp.add(mesh([paint(at(cyl(0.5, 0.65, 0.35, 8), { p: [0, 0.17, 0] }), '#8c8399'), paint(at(cyl(0.38, 0.5, 0.12, 8), { p: [0, 0.4, 0] }), '#6d6295')]));
      v.flame = mesh([paintBy(at(cone(0.32, 0.9, 7), { p: [0, 0.9, 0] }), (p) => (p.y > 1.05 ? '#fff3b0' : '#ffb13d'))], matGlow, false);
      v.glow = new THREE.PointLight('#ffb84a', 18, 7, 1.6);
      v.glow.position.y = 1.2;
      v.lamp.add(v.flame, v.glow);
      v.lamp.position.copy(V(0, 0, 0));
      v.group.add(v.lamp);
      v.blobs = new Map();
      v.heat = 1;
    },
    update(v, dt, time) {
      const s = v.s, alive = new Set();
      for (const b of s.blobs) {
        alive.add(b.id);
        let m = v.blobs.get(b.id);
        if (!m) { m = makeBlob(); v.group.add(m); v.blobs.set(b.id, m); }
        m.position.copy(V(b.x, 0.28 + Math.abs(Math.sin(time * 6 + b.id)) * 0.08, b.y));
        m.rotation.y = Math.atan2(-b.x, -b.y);
        m.body.scale.set(1 + Math.sin(time * 8 + b.id) * 0.06, 0.75, 1);
      }
      for (const [id, m] of v.blobs) if (!alive.has(id)) { v.group.remove(m); v.blobs.delete(id); }
      v.heat += (s.lives / LAMP.lives - v.heat) * Math.min(1, dt * 4);
      const k = 0.45 + v.heat * 0.55;
      v.flame.scale.set(k + Math.sin(time * 13) * 0.05, k + Math.sin(time * 9) * 0.08, k);
      v.glow.intensity = 6 + v.heat * 14 + Math.sin(time * 17) * 1.5;
      s.p.forEach((p, i) => {
        const h = v.heroes[i];
        h.root.position.copy(V(p.x, 0, p.y));
        const sp = Math.hypot(p.vx, p.vy);
        if (!['hurt', 'cheer', 'sad', 'throw'].includes(h.pose)) pose(h, sp > 0.6 ? 'walk' : 'idle');
        if (sp > 0.4) h.turnTo = Math.atan2(p.vx, p.vy);
      });
    },
    on(v, e) {
      const st = v.stage;
      if (e.t === 'poof') { const p = V(e.x, 0.4, e.y); sfx('hop', e.p * 3); v.heroes[e.p].set('throw', 0.25); st.sparks.burst(p.x, p.y, p.z, 14, { color: ['#ffe14a', COLORS[e.p]], speed: 2.4, life: 0.4, size: 0.22 }); st.smoke.burst(p.x, p.y, p.z, 8, { color: '#4a3a6a', speed: 1.2, life: 0.5, size: 0.35, alpha: 0.7 }); }
      if (e.t === 'burn') {
        const p = V(0, 1, 0);
        sfx('curse'); st.shake(0.3);
        st.smoke.burst(p.x, p.y, p.z, 20, { color: DARK, speed: 1.6, life: 0.8, size: 0.45, alpha: 0.8 });
        v.say(e.lives > 0 ? '¡La llama se debilita!' : '¡Se apagó la llama!', e.lives > 0 ? (e.lives === 1 ? 'Le queda 1 vida' : `Le quedan ${e.lives} vidas`) : '', 1.3);
      }
    },
  },

  remar: {
    cam: { y: 0.4, w: 15, pitch: 0.42, h: 7.2 },
    foe: { p: [-7, 0, -1.2], ry: Math.PI / 2, s: 0.9 },
    init(v) {
      v.water = mesh(paintBy(at(box(16, 0.2, 3.4), {}), (p) => (p.y > 0 ? '#3f8fd0' : '#2c6aa0')), undefined, false);
      v.water.position.copy(V(0, -0.15, 0));
      v.banks = mesh([...SIDE.map((k) => paint(at(box(16, 0.6, 1.4), { p: [0, 0, k * 2.4] }), '#79b455')), paint(at(box(2.2, 0.62, 3.4), { p: [7.4, 0, 0] }), '#c9a77a'),
        ...Array.from({ length: 12 }, (_, i) => paint(at(cone(0.45, 1.1, 6), { p: [-7 + i * 1.3, 0.85, -2.6 - (i % 2) * 0.4] }), i % 2 ? '#3aa568' : '#2f8f5b'))]);
      v.banks.position.copy(V(0, -0.2, 0));
      v.dock = mesh([paint(at(cyl(0.04, 0.04, 1.6, 5), { p: [6.9, 1, 0] }), '#7b4a2d'), paint(at(box(0.8, 0.5, 0.04), { p: [7.3, 1.55, 0] }), '#ffd84a')]);
      v.dock.position.copy(V(0, -0.2, 0));
      v.boat = new THREE.Group();
      v.boat.add(mesh([paintBy(at(cyl(0.55, 0.38, 2.4, 8, 1), { r: [0, 0, Math.PI / 2], s: [1, 0.5, 1] }), (p) => (p.y > 0.12 ? '#c98f5a' : '#8a5a33'))]));
      v.oars = SIDE.map((k, i) => { const o = mesh([paint(at(cyl(0.03, 0.03, 1.5, 5), { p: [0, -0.6, 0] }), '#e0bf85'), paint(at(box(0.22, 0.4, 0.04), { p: [0, -1.3, 0] }), '#e0bf85')]); o.position.set(SIDE[i] * 0.55, 0.3, i ? -0.5 : 0.5); v.boat.add(o); return o; });
      v.group.add(v.water, v.banks, v.dock, v.boat);
      v.wall = new THREE.Group();
      for (let i = 0; i < 9; i++) { const b = makeBlob(0.55 + (i % 3) * 0.2); b.position.set(-(i % 3) * 0.5, (i % 3) * 0.45, -1.3 + (i % 5) * 0.65); b.rotation.y = Math.PI / 2; v.wall.add(b); }
      v.group.add(v.wall);
      v.pull = [0, 0]; v.wob = 0;
      v.heroes.forEach((h) => { h.turnTo = Math.PI / 2; });
    },
    bx: (x) => -6 + (x / ROW.goal) * 12.6,
    update(v, dt, time) {
      const s = v.s, view = TEAM_VIEWS.remar, x = view.bx(s.x);
      v.wob = Math.max(v.wob, s.wob);
      v.wob = Math.max(0, v.wob - dt);
      v.boat.position.copy(V(x, 0.1 + Math.sin(time * 3) * 0.03, 0));
      v.boat.rotation.x = Math.sin(time * 25) * 0.12 * v.wob;
      v.boat.rotation.z = Math.sin(time * 2) * 0.03 - Math.min(0.08, s.v * 0.015);
      v.heroes.forEach((h, i) => {
        h.root.position.copy(V(x + (i ? -0.45 : 0.45), 0.12, 0));
        h.ground = h.root.position.y; h.turnTo = Math.PI / 2;
        if (!s.done) h.root.scale.setScalar(0.85);
        if (!s.done && !['throw', 'hurt'].includes(h.pose)) pose(h, 'idle');
        v.pull[i] = Math.max(0, v.pull[i] - dt * 3);
        v.oars[i].rotation.z = -0.4 + Math.sin(v.pull[i] * Math.PI) * 0.9;
      });
      v.wall.position.copy(V(Math.max(-8.5, view.bx(s.shade)) - 0.6, 0.3, 0));
      if (v.foe) v.foe.root.position.copy(V(Math.max(-6.6, view.bx(s.shade) - 0.4), 0.1, -2.3)); // camina por la orilla de atrás, junto a su sombra
      v.wall.children.forEach((b, i) => { b.position.y = (i % 3) * 0.45 + Math.sin(time * 4 + i) * 0.12; });
      if (Math.random() < dt * 25) { const p = v.wall.position; v.stage.smoke.emit({ x: p.x + Math.random() * 0.6, y: p.y + Math.random() * 1.2, z: p.z + (Math.random() - 0.5) * 3, vx: 0.8, vy: 0.2, vz: 0, life: 0.8, size: 0.5, color: DARK }); }
    },
    on(v, e) {
      const st = v.stage;
      if (e.t === 'stroke') { v.pull[e.p] = 1; v.heroes[e.p].set('throw', 0.25); sfx('splash'); const p = v.oars[e.p].getWorldPosition(new THREE.Vector3()); st.sparks.burst(p.x, V(0, 0, 0).y, p.z + (e.p ? -0.8 : 0.8), 6, { color: '#d9f2ff', speed: 1.4, up: 1, life: 0.35, size: 0.14 }); }
      if (e.t === 'wobble') { sfx('foul'); v.heroes[e.p].set('hurt', 0.5); v.float(up(v.heroes[e.p].root.position, 1.6), '¡Por turnos!', 'down'); }
      if (e.t === 'saved') { sfx('chest'); v.say('¡Llegaron a la orilla!', '', 1.3); }
      if (e.t === 'lost') { sfx('curse'); v.say('¡La Sombra los alcanzó!', '', 1.3); }
    },
  },

  escudo: {
    island: { k: 0.55, top: ['#5d6a96', '#6774a2'] },
    cam: { y: 1.3, w: 9.4, pitch: 0.36, h: 6.6 },
    foe: { p: [0, 0, -4.6], s: 1.8 },
    init(v) {
      v.heroes.forEach((h, i) => { h.root.position.copy(V(SIDE[i] * 1.1, 0, 1.3)); h.turnTo = Math.PI; });
      v.shield = new THREE.Mesh(new THREE.CylinderGeometry(3.4, 3.4, 2.6, 28, 1, true, -0.75, 1.5).rotateY(Math.PI), new THREE.MeshBasicMaterial({ color: '#ffe9a0', transparent: true, opacity: 0.4, side: THREE.DoubleSide, depthWrite: false }));
      v.group.add(v.shield);
      v.mass = new THREE.Group();
      for (let i = 0; i < 11; i++) { const b = makeBlob(0.5 + (i % 3) * 0.22); b.position.set(-2.6 + i * 0.52, (i % 2) * 0.6 + 0.3, -0.5 - (i % 3) * 0.45); v.mass.add(b); }
      v.group.add(v.mass);
      v.bars = [0, 1].map((i) => { const g = new THREE.Group(), bg = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.14), new THREE.MeshBasicMaterial({ color: '#1d1830', transparent: true, opacity: 0.7, depthWrite: false })), fill = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.1), new THREE.MeshBasicMaterial({ color: COLORS[i], depthWrite: false })); fill.position.z = 0.01; g.add(bg, fill); g.fill = fill; v.group.add(g); return g; });
      v.red = 0;
    },
    update(v, dt, time) {
      const s = v.s, z = -3.4 + s.b * 3.6, n = s.push.filter(Boolean).length;
      v.shield.position.copy(V(0, 1.3, z + 3.4));
      v.shield.material.opacity = 0.18 + n * 0.2 + Math.sin(time * 20) * 0.03 * n;
      v.shield.material.color.set(n === 2 ? '#fff3c4' : n ? '#ffe9a0' : '#a99bd0');
      v.mass.position.copy(V(0, 0, z - 0.2));
      if (v.foe) v.foe.root.position.copy(V(0, 0, z - 2.3));
      const want = s.mode === 'surge' ? 1 : s.mode === 'warn' ? 0.6 : 0;
      v.red += (want - v.red) * Math.min(1, dt * 6);
      v.mass.children.forEach((b, i) => { b.position.y = (i % 2) * 0.6 + 0.3 + Math.sin(time * (3 + v.red * 6) + i) * (0.08 + v.red * 0.1); b.body.material.emissive.set(v.red > 0.3 ? '#a3203a' : '#4a2f7a'); b.body.material.emissiveIntensity = 0.25 + v.red * 0.6; b.scale.setScalar(1 + v.red * 0.2); });
      v.heroes.forEach((h, i) => {
        const b = v.bars[i];
        b.position.copy(up(h.root.position, 2.25));
        b.quaternion.copy(v.stage.camera.quaternion);
        b.fill.scale.x = Math.max(0.001, s.en[i]); b.fill.position.x = -0.43 * (1 - s.en[i]);
        b.fill.material.color.set(s.tired[i] ? '#6b6680' : COLORS[i]);
        if (!s.done) pose(h, s.tired[i] ? 'dizzy' : s.push[i] ? 'cast' : 'idle');
      });
    },
    on(v, e) {
      const st = v.stage;
      if (e.t === 'warn') { sfx('omen'); v.say('¡La Sombra se encrespa!', 'Prepárense para empujar los dos', 1.1); }
      if (e.t === 'surge') { sfx('roar'); st.shake(0.25); v.say('¡Empujen los dos!', '', 0.9); }
      if (e.t === 'tired') { sfx('feint'); v.float(up(v.heroes[e.p].root.position, 2.5), '¡Agotado!', 'down'); }
      if (e.t === 'ready') sfx('hop', 4);
      if (e.t === 'lost') { sfx('curse'); st.shake(0.5); v.say('¡Se rompió el escudo!', '', 1.3); }
      if (e.t === 'saved') { sfx('shield'); const p = v.shield.position; st.sparks.burst(p.x, p.y, p.z - 1, 60, { color: ['#ffe9a0', '#ffffff'], speed: 4, life: 0.8, size: 0.3 }); v.say('¡Aguantaron!', 'La Sombra retrocede', 1.3); }
    },
  },
};
