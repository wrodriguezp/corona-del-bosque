import * as THREE from 'three';
import { mat, matGlow, paint, paintBy, at, loft, box, cone, cyl, octa, ico, star, mesh } from './geo.js';
import { PULL, JUMP, SUMO } from '../core/minigames/nuevos.js';
import { V, COLORS } from './arena.js';
import { sfx } from '../audio.js';

export const RUNE = ['#ffc93c', '#3fa9ff', '#37d67a', '#ff5fa8'];
const ROUND = (n) => `Ronda ${n}`;
const flat = (geo, color, opacity = 1) => new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
const up = (p, y) => new THREE.Vector3(p.x, p.y + y, p.z);
const pose = (h, name) => { if (h.pose !== name) h.set(name); };
// Mueve a un personaje de las arenas libres y lo orienta hacia donde va.
const roam = (h, p, y = 0) => {
  h.root.position.copy(V(p.x, y, p.y));
  const sp = Math.hypot(p.vx, p.vy);
  if (!['hurt', 'cheer', 'sad'].includes(h.pose)) pose(h, sp > 0.6 ? 'walk' : 'idle');
  if (sp > 0.4) h.turnTo = Math.atan2(p.vx, p.vy);
};

export const NEW_VIEWS = {
  tira: {
    island: { k: 0.5, top: ['#8fd45c', '#83c952'] },
    cam: { y: 1.75, w: 8.6, pitch: 0.16, h: 6.2 },
    init(v) {
      v.heroes.forEach((h, i) => { h.turnTo = i ? -Math.PI / 2 + 0.25 : Math.PI / 2 - 0.25; });
      v.pos = 0; v.kick = [0, 0]; v.pulse = 0;
      v.mud = mesh(paint(at(cyl(1, 1.05, 0.06, 18), { s: [1, 1, 0.75] }), '#7a5238'));
      v.mud.position.copy(V(0, 0.02, 0));
      v.group.add(v.mud);
      v.rope = mesh(paintBy(at(cyl(0.055, 0.055, 4.4, 6), { r: [0, 0, Math.PI / 2] }), (p) => (Math.floor(p.x * 6) % 2 ? '#e0bf85' : '#c89f5f')));
      v.flag = mesh([paint(at(cone(0.2, 0.42, 4), { r: [Math.PI, 0, 0], p: [0, -0.28, 0] }), '#ff4d4d'), paint(box(0.16, 0.2, 0.16), '#ffd84a')]);
      v.star = mesh(paint(star(0.42, 0.12), '#ffd84a'), matGlow, false);
      v.star.position.copy(V(0, 2.8, 0.2));
      v.rim = flat(new THREE.RingGeometry(0.5, 0.56, 36), '#ffffff', 0.9);
      v.rim.position.copy(V(0, 2.8, 0.15));
      v.rings = Array.from({ length: 4 }, () => { const m = flat(new THREE.RingGeometry(0.92, 1, 40), '#ffffff'); m.position.copy(V(0, 2.8, 0.25)); v.group.add(m); return m; });
      v.group.add(v.rope, v.flag, v.star, v.rim);
    },
    update(v, dt, time) {
      const s = v.s;
      v.pos += (s.pos - v.pos) * Math.min(1, dt * 7);
      const x = v.pos * 1.35;
      v.heroes.forEach((h, i) => {
        v.kick[i] = Math.max(0, v.kick[i] - dt * 4);
        h.root.position.copy(V((i ? 2.2 : -2.2) + x + (i ? 1 : -1) * v.kick[i] * 0.16, 0, 0));
      });
      v.rope.position.copy(V(x, 0.82, 0.12)); v.rope.rotation.x = Math.sin(time * 20) * 0.03 * (v.kick[0] + v.kick[1]);
      v.flag.position.copy(V(x, 0.82, 0.12));
      v.pulse = Math.max(0, v.pulse - dt * 4);
      v.star.scale.setScalar(1 + v.pulse * 0.5); v.star.rotation.z = Math.sin(time * 2) * 0.08;
      // Los aros se cierran sobre la estrella justo en el golpe.
      const soon = s.beats.filter((t) => t > s.t - 0.02 && t < s.t + PULL.lead);
      v.rings.forEach((m, k) => {
        const t = soon[k];
        m.visible = t != null && !s.done;
        if (!m.visible) return;
        const q = Math.max(0, (t - s.t) / PULL.lead);
        m.scale.setScalar(0.53 + q * 1.5); m.material.opacity = Math.min(1, (1 - q) * 1.6);
        m.material.color.set(t - s.t < PULL.good ? '#ffd84a' : '#ffffff');
      });
    },
    on(v, e) {
      if (e.t === 'beat') { sfx('tick'); v.pulse = 1; }
      if (e.t === 'pull') {
        const h = v.heroes[e.p], p = h.root.position;
        v.kick[e.p] = 1; h.set('throw', 0.3);
        sfx(e.n > 1 ? 'coin' : 'hop');
        v.stage.smoke.burst(p.x, p.y + 0.1, p.z + 0.2, 6, { color: '#c9a77a', speed: 1.2, flat: 0.2, up: 0.6, life: 0.4, size: 0.22 });
        v.float(up(p, 1.9), e.n > 1 ? '¡Perfecto! +2' : '+1', 'up');
      }
      if (e.t === 'slip') { const h = v.heroes[e.p]; h.set('hurt', 0.4); sfx('foul'); v.float(up(h.root.position, 1.9), '−1', 'down'); }
    },
  },

  runas: {
    island: { k: 0.55, top: ['#6f9fd0', '#7fb0dd'] }, low: true,
    cam: { y: 1.95, w: 8.2, pitch: 0.12, h: 6.3 },
    init(v) {
      v.heroes.forEach((h, i) => { h.root.position.copy(V(i ? 2.65 : -2.65, 0, 0.4)); h.turnTo = i ? -0.6 : 0.6; });
      v.glow = [0, 0, 0, 0]; v.tint = [null, null, null, null];
      const spot = [[0, 3.55], [1.15, 2.4], [0, 1.25], [-1.15, 2.4]];
      v.stones = spot.map(([x, y], d) => {
        const m = new THREE.Group();
        m.body = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.72, 0.34, 6).rotateX(Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#544a72', emissive: RUNE[d], emissiveIntensity: 0.06, flatShading: true, roughness: 0.6 }));
        m.body.castShadow = true;
        const tri = new THREE.Shape([new THREE.Vector2(0, 0.36), new THREE.Vector2(0.34, -0.22), new THREE.Vector2(0, -0.08), new THREE.Vector2(-0.34, -0.22)]);
        m.sign = flat(new THREE.ShapeGeometry(tri), RUNE[d]);
        m.sign.rotation.z = -d * Math.PI / 2; m.sign.position.z = 0.2;
        m.add(m.body, m.sign);
        m.position.copy(V(x, y, -0.2)); m.y0 = m.position.y;
        v.group.add(m);
        return m;
      });
      v.dots = [0, 1].map((i) => Array.from({ length: 6 }, () => { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.14), new THREE.MeshBasicMaterial({ color: '#fff' })); m.i = i; v.group.add(m); return m; }));
    },
    update(v, dt, time) {
      v.stones.forEach((m, d) => {
        v.glow[d] = Math.max(0, v.glow[d] - dt * 2.4);
        const g = v.glow[d];
        m.position.y = m.y0 + Math.sin(time * 1.6 + d * 1.5) * 0.05;
        m.scale.setScalar(1 + g * 0.22);
        m.body.material.emissive.set(v.tint[d] || RUNE[d]); m.body.material.emissiveIntensity = 0.06 + g * 1.5;
        m.sign.material.color.set(RUNE[d]).lerp(new THREE.Color('#fff'), g); m.sign.material.opacity = 0.75 + g * 0.25;
      });
      const n = v.s.seq.length;
      v.dots.forEach((row, i) => row.forEach((m, k) => {
        const p = v.s.p[i];
        m.visible = k < n;
        m.position.copy(V((i ? 2.65 : -2.65) + (k - (n - 1) / 2) * 0.33, 2.15, 0.4));
        m.rotation.y = time * 2 + k;
        m.material.color.set(p.out ? '#5a4668' : k < p.n ? (p.ok ? '#ffd84a' : COLORS[i]) : '#e9e2ff');
        m.scale.setScalar(k < p.n ? 1.25 : 0.8);
      }));
    },
    light(v, d, tint = null, k = 1) { v.glow[d] = k; v.tint[d] = tint; },
    on(v, e) {
      const st = v.stage, view = NEW_VIEWS.runas;
      if (e.t === 'round') { v.heroes.forEach((h) => h.set('idle')); v.say(`Secuencia ${e.n}`, `${e.len} runas`, 0.95); }
      if (e.t === 'glow') { view.light(v, e.d); sfx(['star', 'gem', 'coin', 'card'][e.d]); const p = v.stones[e.d].position; st.sparks.burst(p.x, p.y, p.z + 0.3, 14, { color: RUNE[e.d], speed: 2, life: 0.5, size: 0.2 }); }
      if (e.t === 'go') { sfx('go'); v.say('¡Repitan!', '', 0.6); }
      if (e.t === 'hit') { view.light(v, e.d, COLORS[e.p], 0.55); sfx('hop', e.n); }
      if (e.t === 'miss') { view.light(v, e.d, '#ff2d2d', 0.7); sfx('foul'); v.heroes[e.p].set('sad', 3); v.float(up(v.heroes[e.p].root.position, 1.6), '¡Falló!', 'down'); }
      if (e.t === 'clear') { const p = v.heroes[e.p].root.position; sfx('star'); v.heroes[e.p].set('cheer', 2); v.float(up(p, 1.6), `+${e.n}`, 'up'); st.sparks.burst(p.x, p.y + 1.4, p.z, 30, { color: ['#ffd84a', COLORS[e.p]], speed: 3, life: 0.8, size: 0.26 }); }
      if (e.t === 'end' && !v.s.p.some((p) => p.ok)) v.say('Nadie la completó', '', 1.2);
    },
  },

  salto: {
    island: { r: 4.9, top: ['#8a7fb0', '#9b90c0'], plaza: true }, floor: true,
    cam: { y: 0.8, w: 8.4, pitch: 0.46, h: 6 },
    init(v) {
      v.flip = 0;
      v.heroes.forEach((h, i) => { h.turnTo = i ? -0.5 : 0.5; });
      v.post = mesh([paintBy(at(loft([{ y: 0, r: 0.55 }, { y: 0.18, r: 0.42 }, { y: 0.24, r: 0.5 }, { y: 0.32, r: 0.4 }], 8), {}), () => '#6d6295')]);
      v.post.position.copy(V(0, 0, 0));
      v.gem = mesh(paint(octa(0.34), '#7df9ff'), matGlow, false);
      v.gem.position.copy(V(0, 0.85, 0));
      v.rod = new THREE.Group();
      v.rod.position.copy(V(0, 0.28, 0));
      v.ray = [0.06, 0.14].map((r, k) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 7.6, 8).rotateZ(Math.PI / 2), new THREE.MeshBasicMaterial({ color: k ? '#37d6ff' : '#ffffff', transparent: true, opacity: k ? 0.45 : 1, depthWrite: !k })); v.rod.add(m); return m; });
      v.tips = [-1, 1].map((k) => { const m = mesh(paint(octa(0.2), '#7df9ff'), matGlow, false); m.position.x = k * 3.8; v.rod.add(m); return m; });
      v.group.add(v.post, v.gem, v.rod);
    },
    update(v, dt, time) {
      const s = v.s;
      v.flip = Math.max(0, v.flip - dt * 1.6);
      v.rod.rotation.y = -s.ang;
      v.gem.rotation.y += dt * (1 + s.speed); v.gem.position.y = V(0, 0.85 + Math.sin(time * 3) * 0.06, 0).y;
      v.ray[1].material.color.set(v.flip > 0 ? '#ff8a3c' : '#37d6ff'); v.ray[1].scale.set(1, 1 + v.flip + Math.sin(time * 30) * 0.12, 1 + v.flip + Math.sin(time * 30) * 0.12);
      s.p.forEach((p, i) => {
        const h = v.heroes[i];
        h.root.position.copy(V(i ? JUMP.r : -JUMP.r, p.y, 0));
        if (!s.done) pose(h, p.hurt > 0.35 ? 'hurt' : p.air > 0 ? 'fly' : 'idle');
        h.root.visible = s.done || !(p.hurt > 0 && Math.floor(time * 14) % 2);
      });
      if (Math.random() < dt * 30) { const k = Math.random() < 0.5 ? -1 : 1, q = 1 + Math.random() * 2.8, p = V(Math.cos(s.ang) * q * k, 0.28, Math.sin(s.ang) * q * k); v.stage.sparks.emit({ ...p, color: '#9df3ff', size: 0.16, life: 0.4 }); }
    },
    on(v, e) {
      const st = v.stage;
      if (e.t === 'jump') sfx('flip');
      if (e.t === 'flip') { v.flip = 1; sfx('feint'); v.say('¡Cambia de sentido!', '', 0.6); }
      if (e.t === 'hit') { const p = v.heroes[e.p].root.position; sfx('zap'); st.shake(0.35); st.sparks.burst(p.x, p.y + 0.6, p.z, 40, { color: ['#7df9ff', '#ffffff'], speed: 3.4, life: 0.7, size: 0.28 }); v.float(up(p, 1.7), v.s.score[e.p] === 1 ? 'Le queda 1 vida' : v.s.score[e.p] > 1 ? `Le quedan ${v.s.score[e.p]}` : 'Sin vidas', 'down'); }
    },
  },

  choque: {
    cam: { y: 0.1, w: 9.8, pitch: 0.84, h: 9.4 },
    init(v) {
      v.r = SUMO.r; v.fall = [0, 0];
      v.disc = mesh(paintBy(loft([{ y: -1.5, r: 0.2, wave: [5, 0.2] }, { y: -0.7, r: 0.72, wave: [7, 0.12] }, { y: -0.16, r: 1, wave: [9, 0.02] }, { y: 0, r: 1 }, { y: 0.004, r: 0.9 }, { y: 0.008, r: 0.55, wave: [6, 0.1] }, { y: 0.01, r: 0.25 }], 30), (p) => (p.y > -0.05 ? (Math.hypot(p.x, p.z) > 0.88 ? '#ffffff' : Math.abs(Math.floor(p.x * 4) + Math.floor(p.z * 5)) % 2 ? '#c9efff' : '#b6e4fb') : p.y > -0.5 ? '#8ccdf0' : '#5d9ad0')));
      v.disc.position.copy(V(0, 0, 0));
      v.group.add(v.disc);
      v.ice = Array.from({ length: 9 }, (_, i) => { const a = i * 2.4, q = 5.4 + (i % 3) * 0.9, m = mesh(paintBy(ico(0.3 + (i % 3) * 0.16), (p) => (p.y > 0 ? '#eaf8ff' : '#8ccdf0'))); m.position.copy(V(Math.sin(a) * q, -0.9, Math.cos(a) * q)); m.y0 = m.position.y; v.group.add(m); return m; });
    },
    update(v, dt, time) {
      const s = v.s, r = s.done ? SUMO.r : s.r;
      v.r += (r - v.r) * Math.min(1, dt * (r > v.r ? 8 : 14));
      v.disc.scale.set(v.r, 1.1, v.r);
      v.ice.forEach((m, i) => { m.position.y = m.y0 + Math.sin(time + i) * 0.12; m.rotation.y += dt * 0.2; });
      s.p.forEach((p, i) => {
        const h = v.heroes[i], out = s.phase === 'end' && p.out && !s.done;
        v.fall[i] = out ? v.fall[i] + dt : 0;
        if (s.done) h.root.position.copy(V(i ? 1.2 : -1.2, 0, 0)); else roam(h, p, -6 * v.fall[i] ** 2);
        if (out) pose(h, 'hurt');
        h.root.visible = v.fall[i] < 0.95;
        if (s.phase === 'ready') h.turnTo = i ? -Math.PI / 2 : Math.PI / 2;
      });
    },
    on(v, e) {
      const st = v.stage;
      if (e.t === 'round') { v.heroes.forEach((h) => h.set('idle')); v.say(ROUND(e.n), '', 0.9); }
      if (e.t === 'go') { sfx('go'); v.say('¡Empujen!', '', 0.6); }
      if (e.t === 'bump' && e.n > 0.8) { const p = V(e.x, 0.7, e.y); sfx(e.n > 5 ? 'trap' : 'hop'); st.shake(Math.min(0.4, e.n * 0.05)); st.sparks.burst(p.x, p.y, p.z, 8 + e.n * 3, { color: ['#ffffff', '#bdeaff'], speed: 1.4 + e.n * 0.35, life: 0.5, size: 0.24 }); }
      if (e.t === 'fall') { sfx('eagle'); const q = v.s.p[e.p], p = V(q.x, 0, q.y); st.smoke.burst(p.x, p.y, p.z, 16, { color: '#eaf8ff', speed: 2, life: 0.7, size: 0.3 }); v.heroes[e.w].set('cheer', 1.5); v.say(`¡Cayó ${v.names[e.p]}!`, `Punto para ${v.names[e.w]}`, 1.4); }
      if (e.t === 'both') v.say('¡Cayeron a la vez!', 'Se repite la ronda', 1.4);
    },
  },

  huevo: {
    island: { r: 5.4, top: ['#c98f5a', '#d69e68'], plaza: true },
    cam: { y: 0.1, w: 10.8, pitch: 0.84, h: 10.2 },
    init(v) {
      v.egg = new THREE.Group();
      v.shell = new THREE.Mesh(new THREE.SphereGeometry(0.42, 9, 8), new THREE.MeshStandardMaterial({ color: '#ff9d3c', emissive: '#ff3c00', emissiveIntensity: 0.2, flatShading: true }));
      v.shell.scale.set(1, 1.28, 1); v.shell.castShadow = true;
      v.spots = mesh(Array.from({ length: 7 }, (_, i) => paint(at(octa(0.1), { p: [Math.sin(i * 2.4) * 0.36, (i - 3) * 0.13, Math.cos(i * 2.4) * 0.36] }), '#8e1f3c')));
      v.egg.add(v.shell, v.spots);
      v.group.add(v.egg);
      v.eggAt = null; v.beat = 0;
      v.alert = flat(new THREE.RingGeometry(0.66, 0.84, 28).rotateX(-Math.PI / 2), '#ff5d2e', 0.9);
      v.group.add(v.alert);
    },
    update(v, dt, time) {
      const s = v.s, run = s.phase === 'run';
      s.p.forEach((p, i) => {
        roam(v.heroes[i], p);
        if (s.phase === 'ready') { v.heroes[i].turnTo = i ? -Math.PI / 2 : Math.PI / 2; }
      });
      const h = v.heroes[s.holder].root.position, to = new THREE.Vector3(h.x, h.y + 2.15, h.z);
      v.eggAt ||= to.clone();
      v.eggAt.lerp(to, Math.min(1, dt * 14));
      v.egg.position.copy(v.eggAt);
      v.egg.visible = v.alert.visible = s.phase !== 'end' && !s.done;
      v.alert.position.copy(V(s.p[s.holder].x, 0.04, s.p[s.holder].y));
      // Late más rápido con el tiempo, pero no delata cuándo revienta.
      const rate = 1.6 + Math.min(6, (run ? s.clock : 0) * 0.5);
      v.beat += dt * rate;
      if (run && v.running && v.beat >= 1) sfx('tick');
      v.beat %= 1;
      const k = run ? Math.max(0, 1 - v.beat * 2) : 0;
      v.shell.material.emissiveIntensity = 0.2 + k * 1.3;
      v.egg.scale.setScalar(1 + k * 0.16);
      v.egg.rotation.set(0, time * 1.5, Math.sin(time * 18) * 0.05 * (run ? 1 : 0));
      v.alert.scale.setScalar(1 + k * 0.2);
    },
    on(v, e) {
      const st = v.stage;
      if (e.t === 'round') { v.heroes.forEach((h) => h.set('idle')); v.eggAt = null; v.say(ROUND(e.n), `${v.names[e.p]} empieza con el huevo`, 1.7); }
      if (e.t === 'go') { sfx('go'); v.say('¡Pásalo!', '', 0.6); }
      if (e.t === 'pass') { const p = v.heroes[e.p].root.position; sfx('shield'); st.sparks.burst(p.x, p.y + 1.4, p.z, 18, { color: ['#ff9d3c', '#ffd84a'], speed: 2.4, life: 0.5, size: 0.24 }); v.float(up(p, 2.4), '¡Lo tiene!', 'down'); }
      if (e.t === 'boom') {
        const p = V(e.x, 0.8, e.y);
        sfx('fire'); st.shake(0.6);
        st.sparks.burst(p.x, p.y, p.z, 80, { color: ['#ff5d2e', '#ffd84a', '#ffffff'], speed: 5, up: 2, life: 0.9, size: 0.36 });
        st.smoke.burst(p.x, p.y, p.z, 20, { color: '#5a3f4d', speed: 2, life: 1, size: 0.5, alpha: 0.7 });
        v.heroes[e.p].set('hurt', 1.5); v.heroes[e.w].set('cheer', 1.5);
        v.say('¡Pum!', `Punto para ${v.names[e.w]}`, 1.5);
      }
    },
  },

  burbuja: {
    island: { k: 0.5, top: ['#b58ad6', '#c39ae0'] },
    cam: { y: 2.1, w: 8.6, pitch: 0.12, h: 6.6 },
    init(v) {
      v.heroes.forEach((h, i) => { h.root.position.copy(V(i ? 2.2 : -2.2, 0, 0.2)); h.turnTo = i ? -0.35 : 0.35; });
      v.step = [0, 0];
      v.bubs = [0, 1].map((i) => {
        const g = new THREE.Group();
        g.skin = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), new THREE.MeshStandardMaterial({ color: COLORS[i], transparent: true, opacity: 0.42, roughness: 0.05, emissive: COLORS[i], emissiveIntensity: 0.25, depthWrite: false }));
        g.shine = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.85, depthWrite: false }));
        g.shine.position.set(-0.42, 0.5, 0.66);
        g.add(g.skin, g.shine);
        v.group.add(g);
        return g;
      });
    },
    update(v, dt, time) {
      v.s.p.forEach((p, i) => {
        const g = v.bubs[i], r = 0.16 + p.size * 1.35, shake = p.state === 'grow' ? Math.max(0, (p.size - v.s.tell) / (v.s.limit - v.s.tell)) : 0;
        g.visible = p.state !== 'pop' && (p.size > 0 || p.state === 'grow') && !v.s.done;
        g.scale.setScalar(r * (1 + Math.sin(time * 5 + i) * 0.015 + shake * Math.sin(time * 55) * 0.05));
        g.position.copy(V((i ? 2.2 : -2.2) + shake * Math.sin(time * 61) * 0.06, 1.75 + r + (p.state === 'kept' ? Math.sin(time * 2) * 0.08 : 0), 0.2));
        g.skin.material.emissiveIntensity = 0.25 + shake * 0.5;
        const k = Math.floor(p.size * 10);
        if (k > v.step[i] && p.state === 'grow') sfx('hop', k);
        v.step[i] = k;
        if (p.state === 'grow') pose(v.heroes[i], 'cast');
      });
    },
    on(v, e) {
      const st = v.stage;
      if (e.t === 'round') { v.heroes.forEach((h) => h.set('idle')); v.say(ROUND(e.n), 'Mantén para inflar, suelta a tiempo', 1); }
      if (e.t === 'keep') { v.heroes[e.p].set('cheer', 1.2); sfx('coin'); v.float(v.bubs[e.p].position.clone(), `+${e.n}`, 'up'); }
      if (e.t === 'pop') { const p = v.bubs[e.p].position; sfx('trap'); st.shake(0.3); st.sparks.burst(p.x, p.y, p.z, 60, { color: [COLORS[e.p], '#ffffff'], speed: 4.5, life: 0.8, size: 0.28 }); v.heroes[e.p].set('hurt', 1.4); v.float(p.clone(), '¡Reventó!', 'down'); }
    },
  },
};
