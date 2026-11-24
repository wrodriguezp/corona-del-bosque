import * as THREE from 'three';
import { matGlow, paint, paintBy, at, ball, box, cone, cyl, mesh } from './geo.js';
import { LAMP, ROW, BRIDGE, FLAME, TEAM_RUNES } from '../core/minigames/equipo.js';
import { NEW_VIEWS, RUNE } from './minigames2.js';
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

// Barrita de energía sobre un personaje.
function bar(v, i) {
  const g = new THREE.Group(), bg = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.14), new THREE.MeshBasicMaterial({ color: '#1d1830', transparent: true, opacity: 0.7, depthWrite: false })), fill = new THREE.Mesh(new THREE.PlaneGeometry(0.86, 0.1), new THREE.MeshBasicMaterial({ color: COLORS[i], depthWrite: false }));
  fill.position.z = 0.01; g.add(bg, fill); g.fill = fill; v.group.add(g);
  return g;
}
function setBar(v, b, h, en, tired, i) {
  b.position.copy(up(h.root.position, 2.25));
  b.quaternion.copy(v.stage.camera.quaternion);
  b.fill.scale.x = Math.max(0.001, en); b.fill.position.x = -0.43 * (1 - en);
  b.fill.material.color.set(tired ? '#6b6680' : COLORS[i]);
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
  /* El puente colgante: uno cruza, el otro sostiene las cuerdas. */
  puente: {
    cam: { y: 0.3, w: 13.4, pitch: 0.42, h: 7.4 },
    foe: { p: [4.6, 0.1, -2.4], ry: -0.5, s: 0.95 },
    planks: 16,
    init(v) {
      const n = TEAM_VIEWS.puente.planks;
      v.cliffs = mesh([-1, 1].flatMap((k) => [
        paintBy(at(box(3.4, 3.2, 4.4), { p: [k * 5.9, -1.6, 0] }), (p) => (p.y > 1.4 ? '#79b455' : p.y > 0 ? '#9c7a5a' : '#7b5a57')),
        paint(at(cyl(0.07, 0.08, 1.3, 5), { p: [k * 4.35, 0.65, 0.75] }), '#7b4a2d'), paint(at(cyl(0.07, 0.08, 1.3, 5), { p: [k * 4.35, 0.65, -0.75] }), '#7b4a2d'),
        ...[0, 1, 2].map((j) => paint(at(cone(0.45, 1.2, 6), { p: [k * (5.4 + j * 0.6), 0.6, -1.6 - (j % 2) * 0.5] }), j % 2 ? '#3aa568' : '#2f8f5b')),
      ]));
      v.chasm = mesh([paint(at(box(8.6, 0.2, 4.4), { p: [0, -3.1, 0] }), '#1d1830')], undefined, false);
      v.cliffs.position.copy(V(0, 0, 0)); v.chasm.position.copy(V(0, 0, 0));
      v.bridge = new THREE.Group();
      v.planks = Array.from({ length: n }, (_, j) => { const m = mesh([paint(at(box(0.42, 0.08, 1.3), {}), j % 2 ? '#c98f5a' : '#b47c4b')]); v.bridge.add(m); return m; });
      v.ropes = [-1, 1].map((k) => { const m = new THREE.Mesh(new THREE.BufferGeometry().setFromPoints(Array.from({ length: n + 2 }, () => new THREE.Vector3())), new THREE.LineBasicMaterial({ color: '#e0bf85' })); m.k = k; v.bridge.add(new THREE.Line(m.geometry, m.material)); return m; });
      v.group.add(v.cliffs, v.chasm, v.bridge);
      v.bars = [0, 1].map((i) => bar(v, i));
      v.wind = 0;
    },
    // Altura del puente en x (de −4 a 4): cuelga en el medio y se mece.
    sag: (x, time, sway) => -0.35 * (1 - (x / 4.2) ** 2) + Math.sin(time * 7 + x * 0.6) * sway * 0.22 * (1 - (x / 4.4) ** 2),
    update(v, dt, time) {
      const s = v.s, view = TEAM_VIEWS.puente, n = view.planks;
      v.planks.forEach((m, j) => {
        const x = -4 + (j + 0.5) * (8 / n), y = view.sag(x, time, s.sway);
        m.position.copy(V(x, y, 0));
        m.rotation.x = Math.sin(time * 7 + x * 0.6) * s.sway * 0.35 * (1 - (x / 4.4) ** 2);
      });
      v.ropes.forEach((r) => {
        const a = r.geometry.attributes.position;
        for (let j = 0; j < n + 2; j++) { const x = -4.35 + j * (8.7 / (n + 1)), y = view.sag(x, time, s.sway) + 0.75; const p = V(x, y, r.k * 0.75 + Math.sin(time * 7 + x) * s.sway * 0.15); a.setXYZ(j, p.x, p.y, p.z); }
        a.needsUpdate = true;
      });
      const w = s.walker, h = 1 - w, side = s.crossed ? 1 : -1;
      v.heroes.forEach((hero, i) => {
        if (s.done) return;
        hero.root.scale.setScalar(0.9);
        if (i === w) {
          const x = -4 + s.x * 8;
          hero.root.position.copy(V(x, view.sag(x, time, s.sway) + 0.05, 0));
          hero.turnTo = Math.PI / 2;
          if (!['hurt', 'cheer'].includes(hero.pose)) pose(hero, s.walking ? 'walk' : s.sway > 0.4 ? 'dizzy' : 'idle');
        } else {
          hero.root.position.copy(V(side * 4.9, 0, 0));
          hero.turnTo = side > 0 ? -Math.PI / 2 : Math.PI / 2;
          if (hero.pose !== 'cheer') pose(hero, s.tired[i] ? 'dizzy' : s.steady ? 'cast' : 'idle');
        }
        setBar(v, v.bars[i], hero, s.en[i], s.tired[i], i);
        v.bars[i].visible = i === h;
      });
      // Viento: ráfagas de aire que cruzan el barranco.
      const want = s.mode === 'gust' ? 1 : s.mode === 'warn' ? 0.35 : 0;
      v.wind += (want - v.wind) * Math.min(1, dt * 5);
      if (Math.random() < dt * 40 * v.wind) { const p = V(-6 + Math.random() * 3, 0.2 + Math.random() * 2, (Math.random() - 0.5) * 3); v.stage.smoke.emit({ x: p.x, y: p.y, z: p.z, vx: 7, vy: 0, vz: 0, life: 0.9, size: 0.35, color: s.mode === 'gust' ? '#6b4a9a' : '#d9d2f0' }); }
    },
    on(v, e) {
      const st = v.stage;
      if (e.t === 'warn') { sfx('omen'); v.say('¡Viene una ráfaga!', 'Quien sostiene: mantén pulsado', 1); v.foe?.set('cheer', 1.2); }
      if (e.t === 'gust') { sfx('whoosh'); st.shake(0.15); }
      if (e.t === 'slip') { sfx('foul'); st.shake(0.3); v.heroes[e.p].set('hurt', 0.6); v.float(up(v.heroes[e.p].root.position, 1.6), '¡Resbaló!', 'down'); }
      if (e.t === 'tired') { sfx('feint'); v.float(up(v.heroes[e.p].root.position, 2.5), '¡Agotado!', 'down'); }
      if (e.t === 'ready') sfx('hop', 4);
      if (e.t === 'cross') { sfx('star'); const p = v.heroes[e.p].root.position; v.heroes[e.p].set('cheer', 1.2); st.sparks.burst(p.x, p.y + 1.2, p.z, 30, { color: ['#ffd84a', COLORS[e.p]], speed: 3, life: 0.7, size: 0.24 }); if (v.s.crossed < 2) v.say('¡Cruzó!', 'Ahora al revés: cambien de papel', 1.4); }
      if (e.t === 'saved') v.say('¡Cruzaron los dos!', '', 1.3);
      if (e.t === 'lost') { sfx('curse'); v.say('¡Se acabó el tiempo!', '', 1.3); }
    },
  },

  /* Pasar la llama: la antorcha vuela de uno a otro por una cueva. */
  llama: {
    island: { k: 0.55, top: ['#3d3552', '#463d5e'] }, floor: true,
    cam: { y: 1.1, w: 8.2, pitch: 0.3, h: 6 },
    foe: { p: [0, 0, -2.6], s: 1.15 },
    init(v) {
      v.heroes.forEach((h, i) => { h.root.position.copy(V(SIDE[i] * 2.3, 0, 0.6)); h.turnTo = i ? -Math.PI / 2 : Math.PI / 2; });
      v.rocks = mesh(Array.from({ length: 9 }, (_, i) => paint(at(cone(0.5 + (i % 3) * 0.2, 1.4 + (i % 4) * 0.5, 5), { p: [-3.6 + i * 0.9, 0.6, -1.6 - (i % 2) * 0.6] }), i % 2 ? '#2c2640' : '#352e4c')));
      v.rocks.position.copy(V(0, 0, 0));
      v.torch = new THREE.Group();
      v.torch.add(mesh([paint(at(cyl(0.05, 0.04, 0.6, 5), { p: [0, -0.2, 0] }), '#7b4a2d'), paint(at(cyl(0.09, 0.07, 0.12, 6), { p: [0, 0.1, 0] }), '#555')]));
      v.fire = mesh([paintBy(at(cone(0.16, 0.42, 6), { p: [0, 0.36, 0] }), (p) => (p.y > 0.45 ? '#fff3b0' : '#ffb13d'))], matGlow, false);
      v.light = new THREE.PointLight('#ffb84a', 10, 6, 1.6);
      v.light.position.y = 0.4;
      v.torch.add(v.fire, v.light);
      v.ring = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.42, 28), new THREE.MeshBasicMaterial({ color: '#fff3b0', transparent: true, opacity: 0.8, depthWrite: false, side: THREE.DoubleSide }));
      v.group.add(v.rocks, v.torch, v.ring);
    },
    hand: (v, i) => { const p = v.heroes[i].root.position; return new THREE.Vector3(p.x - SIDE[i] * 0.35, p.y + 1.05, p.z + 0.15); },
    update(v, dt, time) {
      const s = v.s, view = TEAM_VIEWS.llama, h = s.holder, r = 1 - h;
      const a = view.hand(v, h), b = view.hand(v, r);
      v.ring.visible = s.phase === 'fly';
      if (s.phase === 'fly') {
        const k = s.clock / s.flight;
        v.torch.position.lerpVectors(a, b, k);
        v.torch.position.y += 4 * k * (1 - k) * 1.5 - (k > 1 ? (k - 1) * 3 : 0);
        v.torch.rotation.z = -SIDE[h] * k * Math.PI * 2;
        // El aro se cierra justo cuando la antorcha llega: ahí hay que pulsar.
        const left = Math.max(0, s.flight - s.clock);
        v.ring.position.copy(b);
        v.ring.quaternion.copy(v.stage.camera.quaternion);
        v.ring.scale.setScalar(1 + left * 2.4);
        v.ring.material.color.set(COLORS[r]);
        v.ring.material.opacity = 0.35 + 0.6 * (1 - Math.min(1, left));
      } else if (s.phase === 'relight') {
        v.torch.position.copy(V(SIDE[h] * 1.4, 0.15, 0.9));
        v.torch.rotation.z = Math.PI / 2;
      } else {
        v.torch.position.copy(a);
        v.torch.rotation.z = Math.sin(time * 3) * 0.1;
      }
      const lit = s.phase !== 'relight';
      v.fire.visible = lit;
      v.light.intensity = lit ? 9 + Math.sin(time * 17) * 1.5 : 0;
      v.fire.scale.set(1 + Math.sin(time * 13) * 0.08, 1 + Math.sin(time * 9) * 0.12, 1);
      v.heroes.forEach((hero, i) => {
        hero.root.position.copy(V(SIDE[i] * 2.3, 0, 0.6));
        hero.turnTo = i ? -Math.PI / 2 : Math.PI / 2;
        if (!s.done && !['throw', 'hurt', 'cheer', 'clap'].includes(hero.pose)) pose(hero, i === h && s.phase === 'hold' ? 'cast' : 'idle');
      });
    },
    on(v, e) {
      const st = v.stage;
      if (e.t === 'throw') { sfx('whoosh'); v.heroes[e.p].set('throw', 0.35); }
      if (e.t === 'catch') { sfx('note', e.n % 8); v.heroes[e.p].set('clap', 0.4); const p = v.torch.position; st.sparks.burst(p.x, p.y + 0.3, p.z, e.good ? 22 : 10, { color: ['#ffd84a', COLORS[e.p]], speed: 2.4, life: 0.45, size: 0.2 }); v.float(up(v.heroes[e.p].root.position, 2.1), e.good ? `¡Justo! ${e.n}/${FLAME.goal}` : `${e.n}/${FLAME.goal}`, `up p${e.p}`); }
      if (e.t === 'drop') { sfx('curse'); st.shake(0.25); v.heroes[e.p].set('hurt', 0.6); const p = V(SIDE[1 - e.p] * 1.4, 0.3, 0.9); st.smoke.burst(p.x, p.y, p.z, 16, { color: DARK, speed: 1.4, life: 0.7, size: 0.4, alpha: 0.8 }); v.say(e.early ? '¡Muy pronto!' : '¡Se cayó!', e.lives > 0 ? (e.lives === 1 ? 'Queda 1 vida' : `Quedan ${e.lives} vidas`) : '', 1.1); v.foe?.set('cheer', 1); }
      if (e.t === 'lit') sfx('fire');
      if (e.t === 'saved') v.say('¡La llama llegó entera!', '', 1.3);
      if (e.t === 'lost') v.say(v.s.lives > 0 ? '¡Se acabó el tiempo!' : '¡Se apagó la antorcha!', '', 1.3);
    },
  },

  /* Runas en equipo: cada runa se enciende del color de quien debe marcarla. */
  runeq: {
    island: { k: 0.55, top: ['#5d6a96', '#6774a2'] }, low: true,
    cam: { y: 1.95, w: 10.6, pitch: 0.12, h: 6.6 },
    foe: { p: [-4.4, 0, -1.6], ry: 0.5, s: 1.05 },
    init(v) {
      NEW_VIEWS.runas.init(v);
      v.dots.flat().forEach((m) => v.group.remove(m));
      v.dots = Array.from({ length: Math.max(...TEAM_RUNES.lens) }, () => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.16), new THREE.MeshBasicMaterial({ color: '#fff' })); v.group.add(m); return m; });
      v.lives = Array.from({ length: TEAM_RUNES.lives }, (_, i) => { const m = mesh([paintBy(at(cone(0.13, 0.36, 6), { p: [0, 0.18, 0] }), (p) => (p.y > 0.24 ? '#fff3b0' : '#ffb13d'))], matGlow, false); m.position.copy(V(-0.4 + i * 0.4, 0.05, 0.9)); v.group.add(m); return m; });
    },
    update(v, dt, time) {
      const s = v.s, n = s.seq.length;
      v.stones.forEach((m, d) => {
        v.glow[d] = Math.max(0, v.glow[d] - dt * 2.4);
        const g = v.glow[d];
        m.position.y = m.y0 + Math.sin(time * 1.6 + d * 1.5) * 0.05;
        m.scale.setScalar(1 + g * 0.22);
        m.body.material.emissive.set(v.tint[d] || RUNE[d]); m.body.material.emissiveIntensity = 0.06 + g * 1.5;
        m.sign.material.color.set(RUNE[d]).lerp(new THREE.Color(v.tint[d] || '#fff'), g); m.sign.material.opacity = 0.75 + g * 0.25;
      });
      // Una fila de gemas: de quién es cada paso (las ya marcadas brillan en dorado).
      v.dots.forEach((m, k) => {
        m.visible = k < n && (s.phase !== 'show' || k <= s.at);
        if (!m.visible) return;
        m.position.copy(V((k - (n - 1) / 2) * 0.42, 4.35, -0.2));
        m.rotation.y = time * 2 + k;
        const now = s.phase === 'play' && k === s.n;
        m.material.color.set(k < s.n && s.phase !== 'show' ? '#ffd84a' : COLORS[s.seq[k].p]);
        m.scale.setScalar(now ? 1.3 + Math.sin(time * 10) * 0.15 : k < s.n ? 1.1 : 0.85);
      });
      v.lives.forEach((m, i) => { m.visible = i < s.lives; m.scale.setScalar(1 + Math.sin(time * 12 + i) * 0.08); });
      if (!s.done) v.heroes.forEach((h, i) => { if (!['throw', 'sad', 'cheer'].includes(h.pose)) pose(h, s.phase === 'play' && s.seq[s.n]?.p === i ? 'cast' : 'idle'); });
    },
    on(v, e) {
      const st = v.stage, light = NEW_VIEWS.runas.light;
      if (e.t === 'round') { v.heroes.forEach((h) => h.set('idle')); v.say(`Secuencia ${e.n}`, `${e.len} runas · miren los colores`, 0.95); }
      if (e.t === 'glow') { light(v, e.d, COLORS[e.p]); sfx(['star', 'gem', 'coin', 'card'][e.d]); const p = v.stones[e.d].position; st.sparks.burst(p.x, p.y, p.z + 0.3, 14, { color: [RUNE[e.d], COLORS[e.p]], speed: 2, life: 0.5, size: 0.2 }); }
      if (e.t === 'go') { sfx('go'); v.say('¡Repitan juntos!', 'Cada quien sus runas, en orden', 0.8); }
      if (e.t === 'hit') { light(v, e.d, COLORS[e.p], 0.6); sfx('hop', e.n); v.heroes[e.p].set('throw', 0.25); }
      if (e.t === 'miss') {
        if (e.d != null) light(v, e.d, '#ff2d2d', 0.7);
        sfx('foul'); st.shake(0.2); v.heroes[e.p].set('sad', 1.2); v.foe?.set('cheer', 1);
        const why = e.d == null ? 'Se acabó el tiempo' : e.p !== e.want.p ? 'No era su turno' : 'Runa equivocada';
        v.say(`¡Ups! ${why}`, e.lives > 0 ? `${e.lives === 1 ? 'Queda 1 vida' : `Quedan ${e.lives} vidas`} · se repite` : '', 1.1);
      }
      if (e.t === 'clear') { sfx('star'); v.heroes.forEach((h, i) => { h.set('cheer', 1); const p = h.root.position; st.sparks.burst(p.x, p.y + 1.4, p.z, 20, { color: ['#ffd84a', COLORS[i]], speed: 3, life: 0.7, size: 0.24 }); }); }
      if (e.t === 'saved') v.say('¡Las cuatro secuencias!', '', 1.3);
      if (e.t === 'lost') v.say('¡Se acabaron las vidas!', '', 1.3);
    },
  },
};
