import * as THREE from 'three';
import { matGlow, paint, paintBy, at, ball, box, cone, cyl, star, tube, mesh } from './geo.js';
import { ROAD, VINE, FLOOR, laneItems, enreda, piso } from '../core/minigames/caminos.js';
import { V, COLORS } from './arena.js';
import { sfx } from '../audio.js';

// Escenas de cruza el camino, la enredadera y el piso que se cae.
const up = (p, y) => new THREE.Vector3(p.x, p.y + y, p.z);
const pose = (h, name) => { if (h.pose !== name) h.set(name); };
const ROW = 0.92; // separación entre filas
const rowZ = (r) => 3.7 - r * ROW;

// Carreta de calabaza, escoba voladora u hoja flotante, a lo largo del eje x.
function makeItem(kind, len) {
  if (kind === 'cart') {
    return mesh([
      paintBy(at(ball(0.55, 10, 8), { s: [len / 1.1, 0.8, 0.7], p: [0, 0.55, 0] }), (p) => (Math.abs(Math.sin(p.x * 9)) > 0.85 ? '#d9661c' : '#f08a2c')),
      paint(at(cyl(0.05, 0.06, 0.22, 5), { p: [0, 1.05, 0] }), '#4f8a2e'),
      ...[-1, 1].flatMap((kx) => [-1, 1].map((kz) => paint(at(cyl(0.22, 0.22, 0.08, 10), { r: [Math.PI / 2, 0, 0], p: [kx * len * 0.3, 0.2, kz * 0.36] }), '#6b3f22'))),
      paint(at(box(0.3, 0.24, 0.05), { p: [0, 0.58, 0.39] }), '#ffd84a'),
    ]);
  }
  if (kind === 'broom') {
    return mesh([
      paint(at(cyl(0.04, 0.04, len, 5), { r: [0, 0, Math.PI / 2], p: [0, 0.55, 0] }), '#a8743f'),
      paintBy(at(cone(0.22, 0.5, 7), { r: [0, 0, Math.PI / 2], p: [-len / 2 - 0.15, 0.55, 0] }), () => '#e0bf55'),
      paint(at(ball(0.09, 6, 4), { p: [len / 2, 0.55, 0] }), '#b14bff'),
    ]);
  }
  return mesh([
    paintBy(at(cyl(0.5, 0.5, 0.08, 12), { s: [len / 1.05, 1, 1.05] }), (p) => (Math.abs(p.z) < 0.04 ? '#3d8f3a' : '#57b84d')),
    paint(at(ball(0.1, 6, 4), { p: [len * 0.22, 0.08, 0.18] }), '#ff9ac8'),
  ]);
}

function cruceView(team) {
  return {
    cam: { y: -0.1, w: 13.6, pitch: 0.95, h: 10.4, z: 0.1, zTall: 0.8 },
    foe: team ? { p: [5.9, 0, rowZ(8) - 0.6], ry: -0.4, s: 0.9 } : undefined,
    init(v) {
      const strip = (r, c1, c2) => paintBy(at(box(14, 0.3, ROW), { p: [0, -0.15, rowZ(r)] }), (p) => (Math.floor(p.x * 1.1) % 2 ? c1 : c2));
      const ground = [strip(0, '#79b455', '#83c25e'), strip(4, '#79b455', '#83c25e'), strip(8, '#79b455', '#83c25e'), ...[1, 2, 3].map((r) => strip(r, '#c9a77a', '#bf9c6f')), ...[5, 6, 7].map((r) => paint(at(box(14, 0.2, ROW), { p: [0, -0.28, rowZ(r)] }), r % 2 ? '#3f8fd0' : '#4a9ad9'))];
      const deco = [
        ...[-6.4, 6.4].flatMap((x) => [0, 4, 8].map((r) => paint(at(cone(0.42, 1.1, 6), { p: [x, 0.55, rowZ(r)] }), '#2f8f5b'))),
        ...Array.from({ length: 9 }, (_, i) => paint(at(ball(0.08, 5, 4), { p: [-5 + i * 1.25, 0.05, rowZ(4) + ((i % 3) - 1) * 0.25] }), ['#ffd84a', '#ff9ac8', '#ffffff'][i % 3])),
        paint(at(box(0.5, 0.06, 0.5), { p: [0, 0.02, rowZ(8)] }), '#ffd84a'),
      ];
      v.ground = mesh([...ground, ...deco]);
      v.ground.position.copy(V(0, 0, 0));
      v.group.add(v.ground);
      v.items = v.s.lanes.map((L) => L.offs.map(() => { const m = makeItem(L.kind, L.len); v.group.add(m); return m; }));
      v.heroes.forEach((h) => { h.turnTo = Math.PI; });
    },
    update(v, dt, time) {
      const s = v.s;
      s.lanes.forEach((L, i) => {
        const xs = laneItems(s, i);
        v.items[i].forEach((m, j) => {
          m.position.copy(V(xs[j], L.kind === 'leaf' ? -0.16 + Math.sin(time * 2 + j) * 0.02 : L.kind === 'broom' ? Math.sin(time * 5 + j) * 0.1 : 0, rowZ(L.row)));
          m.visible = Math.abs(xs[j]) < ROAD.edge - 0.2;
          m.rotation.y = L.v > 0 ? 0 : Math.PI;
          if (L.kind === 'cart') m.rotation.z = Math.sin(time * 9 + j) * 0.03;
        });
      });
      s.p.forEach((p, i) => {
        const h = v.heroes[i];
        if (s.done) return;
        h.root.scale.setScalar(0.72);
        const lane = s.lanes.find((L) => L.row === p.row), k = p.hop / ROAD.hop;
        const y = (lane?.kind === 'leaf' ? -0.12 : 0) + (p.hop > 0 ? Math.sin(k * Math.PI) * 0.45 : 0);
        h.root.position.copy(V(p.x, y, rowZ(p.row)));
        h.root.visible = p.out <= 0 || Math.sin(time * 30) > 0;
        h.turnTo = Math.PI;
        if (!['hurt', 'cheer'].includes(h.pose)) pose(h, p.hop > 0 ? 'walk' : 'idle');
      });
    },
    on(v, e) {
      const st = v.stage;
      if (e.t === 'hop') sfx('hop', e.row % 8);
      if (e.t === 'bump') { sfx('foul'); st.shake(0.2); const p = V(e.x, 0.6, rowZ(e.row)); st.smoke.burst(p.x, p.y, p.z, 14, { color: '#d9c7a0', speed: 1.8, life: 0.5, size: 0.35, alpha: 0.8 }); v.heroes[e.p].set('hurt', 0.7); v.float(up(p, 1), '¡Pum!', 'down'); }
      if (e.t === 'splash') { sfx('splash'); const p = V(e.x, 0, rowZ(e.row)); st.sparks.burst(p.x, p.y, p.z, 20, { color: '#d9f2ff', speed: 2.2, up: 2, life: 0.5, size: 0.18 }); v.heroes[e.p].set('hurt', 0.7); v.float(up(p, 1), '¡Al agua!', 'down'); }
      if (e.t === 'cross') {
        sfx('star'); const p = V(0, 0.8, rowZ(8));
        st.sparks.burst(p.x, p.y, p.z, 26, { color: ['#ffd84a', COLORS[e.p]], speed: 3, life: 0.7, size: 0.24 });
        v.float(p, team ? `${v.s.crossed}/${ROAD.goal}` : '+1', `up p${e.p}`);
      }
      if (team && (e.t === 'bump' || e.t === 'splash')) { v.foe?.set('cheer', 1); v.say(v.s.lives === 1 ? 'Queda 1 vida' : `Quedan ${v.s.lives} vidas`, '', 0.8); }
      if (e.t === 'saved') v.say('¡Cruzaron todos!', '', 1.3);
      if (e.t === 'lost') v.say(v.s.lives > 0 ? '¡Se acabó el tiempo!' : '¡Se acabaron las vidas!', '', 1.3);
    },
  };
}

/* La enredadera: cada quien sube por la suya; la planta baja para que se vea quien trepa. */
const STEP = 0.62, SIDE = [-1, 1], BAR = 1.05, LIFT = 1.55; // LIFT: la próxima hoja queda a la altura de la barra, sobre la cabeza
const enredaView = {
  cam: { y: 2.1, w: 8.6, pitch: 0.08, h: 6.8 },
  init(v) {
    v.vines = [0, 1].map((i) => {
      const g = new THREE.Group(), n = VINE.goal + 3, pts = Array.from({ length: n * 2 }, (_, j) => [Math.sin(j * 1.3 + i) * 0.18, j * STEP * 0.5 - 1, Math.cos(j * 0.9) * 0.1]);
      g.add(mesh([paint(tube(pts, pts.map(() => 0.12), 6, 3), '#3d8f3a')]));
      // Una hoja por agarre, en el lugar de su agarre (de −1 a 1 sobre la barra).
      g.leaves = v.s.grips.map((x, j) => { const m = mesh([paintBy(at(cone(0.24, 0.5, 5), { r: [0, 0, Math.PI / 2 * (x > 0 ? -1 : 1)], s: [1, 1, 0.3] }), () => '#57b84d')]); m.position.set(x * BAR, (j + 1) * STEP + LIFT, 0.1); g.add(m); return m; });
      g.add(mesh([paint(at(cyl(1.5, 1.2, 0.5, 10), { p: [0, -0.25, 0.3], s: [1, 1, 0.6] }), '#79b455')]));
      g.add(mesh([paint(at(star(0.4, 0.08), { p: [0, (VINE.goal + 1) * STEP + LIFT + 0.5, 0] }), '#ffd84a')], matGlow, false));
      g.y = 0;
      v.group.add(g);
      return g;
    });
    v.hands = [0, 1].map((i) => { const m = mesh([paint(ball(0.15, 8, 6), COLORS[i])], matGlow, false); v.group.add(m); return m; });
    v.bars = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(BAR * 2 + 0.3, 0.06), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.35, depthWrite: false })); v.group.add(m); return m; });
    v.zones = [0, 1].map(() => { const m = new THREE.Mesh(new THREE.PlaneGeometry(VINE.zone * BAR * 2, 0.22), new THREE.MeshBasicMaterial({ color: '#ffe14a', transparent: true, opacity: 0.6, depthWrite: false })); v.group.add(m); return m; });
  },
  update(v, dt, time) {
    const s = v.s;
    s.p.forEach((p, i) => {
      const g = v.vines[i], x = SIDE[i] * 2.2;
      // La enredadera baja a medida que sube quien trepa: así siempre se ve.
      const want = -Math.min(p.h, VINE.goal) * STEP;
      g.y += (want - g.y) * Math.min(1, dt * 6);
      g.position.copy(V(x, g.y, -0.3));
      g.leaves.forEach((m, j) => { m.visible = j >= p.h; m.scale.setScalar(j === p.h ? 1.35 + Math.sin(time * 8) * 0.1 : 1); });
      const h = v.heroes[i], gy = g.y + p.h * STEP;
      h.root.position.copy(V(x + s.grips[Math.max(0, p.h - 1)] * BAR * 0.4, gy + 0.1, 0.25));
      h.root.scale.setScalar(0.8);
      h.turnTo = 0;
      if (!s.done && !['hurt', 'cheer', 'clap'].includes(h.pose)) pose(h, p.h ? 'cast' : 'idle');
      const row = g.y + (p.h + 1) * STEP + LIFT;
      v.bars[i].position.copy(V(x, row, 0.35)); v.bars[i].quaternion.copy(v.stage.camera.quaternion);
      v.zones[i].position.copy(V(x + s.grips[Math.min(p.h, VINE.goal)] * BAR, row, 0.36)); v.zones[i].quaternion.copy(v.stage.camera.quaternion);
      v.zones[i].visible = v.bars[i].visible = v.hands[i].visible = p.h < VINE.goal && !s.done;
      v.hands[i].position.copy(V(x + enreda.hand(p) * BAR, row, 0.4));
      v.hands[i].scale.setScalar(p.stun > 0 ? 0.6 : 1);
    });
  },
  on(v, e) {
    const st = v.stage;
    if (e.t === 'grab') { sfx('note', e.h % 8); v.heroes[e.p].set('clap', 0.3); const p = v.hands[e.p].position; st.sparks.burst(p.x, p.y, p.z, e.good ? 18 : 8, { color: ['#ffd84a', COLORS[e.p]], speed: 2, life: 0.4, size: 0.18 }); if (e.good) v.float(up(p, 0.4), '¡Justo!', `up p${e.p}`); }
    if (e.t === 'slip') { sfx('foul'); v.heroes[e.p].set('hurt', 0.45); v.float(up(v.heroes[e.p].root.position, 1.5), '¡Resbaló!', 'down'); }
    if (e.t === 'top') { sfx('fanfare'); const p = v.heroes[e.p].root.position; st.sparks.burst(p.x, p.y + 1.5, p.z, 40, { color: ['#ffd84a', COLORS[e.p], '#ffffff'], speed: 3.5, life: 0.9, size: 0.28 }); }
  },
};

/* El piso que se cae: una plaza de baldosas que tiemblan, caen y vuelven. */
const pisoView = {
  cam: { z: -0.2, zTall: 1.2, y: -0.2, w: 9.4, pitch: 0.95, h: 10.2 },
  foe: { p: [0, -0.2, -4.9], s: 1.2 },
  init(v) {
    v.tiles = v.s.tiles.map((t, i) => {
      const m = mesh([paintBy(at(box(FLOOR.size - 0.08, 0.36, FLOOR.size - 0.08), { p: [0, -0.18, 0] }), (p) => (p.y > -0.02 ? ((i + Math.floor(i / FLOOR.n)) % 2 ? '#b9aee0' : '#c9c0ea') : '#7b6a9a'))]);
      m.home = piso.at(i); m.y = 0; m.material = m.material.clone();
      v.group.add(m);
      return m;
    });
    v.stars = new Map();
    v.lives = Array.from({ length: FLOOR.lives }, (_, i) => { const m = mesh([paintBy(at(cone(0.13, 0.36, 6), { p: [0, 0.18, 0] }), (p) => (p.y > 0.24 ? '#fff3b0' : '#ffb13d'))], matGlow, false); m.position.copy(V(-0.6 + i * 0.4, 0.05, 3.9)); v.group.add(m); return m; });
    v.drop = [0, 0];
  },
  update(v, dt, time) {
    const s = v.s;
    v.tiles.forEach((m, i) => {
      const t = s.tiles[i], want = t.st === 'gone' ? -6 : 0;
      m.y += (want - m.y) * Math.min(1, dt * (t.st === 'gone' ? 2.5 : 5));
      const shake = t.st === 'warn' ? Math.sin(time * 50 + i) * 0.06 : 0;
      m.position.copy(V(m.home.x + shake, m.y, m.home.y));
      m.rotation.z = t.st === 'gone' ? (m.y / 6) * 0.6 : 0;
      m.visible = m.y > -5.5;
      m.material.emissive?.set(t.st === 'warn' ? '#a3203a' : '#000000');
      if (m.material.emissive) m.material.emissiveIntensity = t.st === 'warn' ? 0.35 + Math.sin(time * 20) * 0.2 : 0;
    });
    const alive = new Set();
    for (const q of s.stars) {
      alive.add(q.id);
      let m = v.stars.get(q.id);
      if (!m) { m = mesh([paint(star(0.36, 0.1), '#ffd84a')], matGlow, false); v.group.add(m); v.stars.set(q.id, m); sfx('tick'); }
      m.position.copy(V(q.x, 0.55 + Math.sin(time * 4) * 0.1, q.y));
      m.rotation.y = time * 2.5;
    }
    for (const [id, m] of v.stars) if (!alive.has(id)) { v.group.remove(m); v.stars.delete(id); }
    v.lives.forEach((m, i) => { m.visible = i < s.lives; });
    s.p.forEach((p, i) => {
      const h = v.heroes[i];
      if (s.done) return;
      h.root.scale.setScalar(0.85);
      if (p.out > 0) { v.drop[i] += dt; h.root.position.copy(V(p.x, -v.drop[i] * v.drop[i] * 6, p.y)); return; }
      v.drop[i] = 0;
      h.root.position.copy(V(p.x, 0, p.y));
      const sp = Math.hypot(p.vx, p.vy);
      if (!['hurt', 'cheer', 'throw'].includes(h.pose)) pose(h, sp > 0.6 ? 'walk' : 'idle');
      if (sp > 0.4) h.turnTo = Math.atan2(p.vx, p.vy);
    });
  },
  on(v, e) {
    const st = v.stage;
    if (e.t === 'wave') sfx('rumble');
    if (e.t === 'drop') { const p = V(piso.at(e.i).x, 0, piso.at(e.i).y); st.smoke.burst(p.x, p.y, p.z, 6, { color: '#8a7fb0', speed: 1, life: 0.5, size: 0.4, alpha: 0.6 }); }
    if (e.t === 'star') { sfx('gem'); const p = V(e.x, 0.6, e.y); v.heroes[e.p].set('throw', 0.25); st.sparks.burst(p.x, p.y, p.z, 18, { color: ['#ffd84a', COLORS[e.p]], speed: 2.4, life: 0.45, size: 0.2 }); v.float(up(p, 0.5), `${e.n}/${FLOOR.goal}`, `up p${e.p}`); }
    if (e.t === 'fall') { sfx('curse'); st.shake(0.25); v.foe?.set('cheer', 1); v.say('¡Se cayó!', e.lives > 0 ? (e.lives === 1 ? 'Queda 1 vida' : `Quedan ${e.lives} vidas`) : '', 0.9); }
    if (e.t === 'back') { sfx('hop', 5); const p = v.heroes[e.p].root.position; st.sparks.burst(p.x, p.y + 0.5, p.z, 12, { color: COLORS[e.p], speed: 1.6, life: 0.4, size: 0.18 }); }
    if (e.t === 'saved') v.say('¡Todas las estrellas!', '', 1.3);
    if (e.t === 'lost') v.say(v.s.lives > 0 ? '¡Se acabó el tiempo!' : '¡Se acabaron las vidas!', '', 1.3);
  },
};

export const ROAD_VIEWS = { cruce: cruceView(false), cruceq: cruceView(true), enreda: enredaView, piso: pisoView };
