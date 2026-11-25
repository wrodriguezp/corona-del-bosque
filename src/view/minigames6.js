import * as THREE from 'three';
import { matGlow, paint, paintBy, at, ball, box, cone, cyl, ico, octa, ringGeo, mesh } from './geo.js';
import { TRACK, MUD, BOOST, TEAM_RACE, trackAt, CLAW, SNOW, CAT, TURTLE, HOCKEY } from '../core/minigames/feria.js';
import { makeCritter } from './critters.js';
import { V, COLORS } from './arena.js';
import { sfx } from '../audio.js';

// Escenas de la feria del bosque: escobas, garra, nieve, catapulta, tortuga y hockey.
const up = (p, y) => new THREE.Vector3(p.x, p.y + y, p.z);
const pose = (h, name) => { if (h.pose !== name && !['hurt', 'cheer', 'throw', 'clap', 'sad'].includes(h.pose)) h.set(name); };
const ease = (a, b, k) => a + (b - a) * k;
const centered = (m) => { m.position.copy(V(0, 0, 0)); return m; };

// Línea de texto extra bajo el título (vueltas del carruaje, receta, altura…).
export function extra(v) {
  const e = document.createElement('div');
  e.className = 'extra';
  v.hudEl.append(e);
  return (html) => { if (e.dataset.h !== html) { e.dataset.h = html; e.innerHTML = html; } };
}

/* ---------- La pista de escobas (también la usa el carruaje) ---------- */
function stadium(r, Kind = THREE.Shape) {
  const { L } = TRACK, sh = new Kind();
  sh.moveTo(-L, -r); sh.lineTo(L, -r);
  sh.absarc(L, 0, r, -Math.PI / 2, Math.PI / 2, false);
  sh.lineTo(-L, r);
  sh.absarc(-L, 0, r, Math.PI / 2, Math.PI * 1.5, false);
  return sh;
}
const slab = (shape, depth, y) => at(new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: false, curveSegments: 28 }), { r: [-Math.PI / 2, 0, 0], p: [0, y, 0] });

function makeBroom() {
  return mesh([
    paint(at(cyl(0.035, 0.035, 1.25, 5), { r: [Math.PI / 2, 0, 0], p: [0, 0, 0.05] }), '#a8743f'),
    paint(at(cone(0.2, 0.5, 7), { r: [-Math.PI / 2, 0, 0], p: [0, 0, -0.72] }), '#e0bf55'),
    paint(at(cyl(0.07, 0.07, 0.06, 6), { r: [Math.PI / 2, 0, 0], p: [0, 0, -0.45] }), '#b14bff'),
  ]);
}
function makeCart() {
  const g = new THREE.Group();
  g.add(mesh([
    paintBy(at(box(0.9, 0.6, 1.25), { p: [0, 0.6, 0] }), (p) => (p.y > 0.85 ? '#ffd84a' : '#4a2f7a')),
    paint(at(box(0.95, 0.08, 1.3), { p: [0, 0.32, 0] }), '#ffd84a'),
    paint(at(cone(0.5, 0.5, 4), { r: [0, Math.PI / 4, 0], p: [0, 1.15, 0] }), '#3a2460'),
    ...[-1, 1].flatMap((kx) => [-1, 1].map((kz) => paint(at(cyl(0.26, 0.26, 0.08, 10), { r: [0, 0, Math.PI / 2], p: [kx * 0.5, 0.26, kz * 0.42] }), '#2a1d3f'))),
    ...[-1, 0, 1].map((k) => paint(at(cone(0.06, 0.16, 4), { p: [k * 0.14, 1.48, 0] }), '#ffd84a')),
  ]));
  g.add(mesh([1, -1].map((k) => paint(at(ball(0.07, 6, 4), { p: [k * 0.2, 0.72, 0.64] }), '#d36bff')), matGlow, false));
  return g;
}

export function raceView(team) {
  return {
    cam: { y: -0.3, w: 13.4, pitch: 0.95, h: 9.4, z: 0.3, zTall: 0.6 },
    foe: team ? { p: [0, -0.15, 0], s: 0.75 } : undefined,
    init(v) {
      const { R, w } = TRACK, track = stadium(R + w);
      track.holes.push(stadium(R - w, THREE.Path));
      const ground = mesh([
        paintBy(slab(track, 0.5, -0.5), (p) => (p.y > -0.05 ? (Math.floor(p.x * 1.4 + p.z * 1.4) % 2 ? '#c9a77a' : '#d3b386') : '#8a6a4a')),
        paintBy(at(slab(stadium(R + w), 1.7, -2.2), { s: [0.97, 1, 0.95] }), (p) => (p.y > -1.2 ? '#9a7a5a' : '#6d5568')),
        paint(slab(stadium(R - w), 0.1, -0.32), '#4a9ad9'),
        paint(at(cyl(0.65, 0.8, 0.3, 10), { p: [0, -0.2, 0] }), '#79b455'),
        ...(team ? [] : [paint(at(cyl(0.07, 0.1, 0.5, 6), { p: [0, 0.2, 0] }), '#7b4a2d'), ...[[0.5, 0.55], [0.85, 0.42]].map(([y, r]) => paint(at(cone(r, 0.6, 7), { p: [0, y, 0] }), '#2f8f5b'))]),
        // Línea de salida a cuadros.
        ...Array.from({ length: 8 }, (_, j) => paint(at(box(0.2, 0.03, (w * 2) / 8), { p: [-TRACK.L + ((j % 2) - 0.5) * 0.2, 0.015, R - w + (j + 0.5) * ((w * 2) / 8)] }), j % 2 ? '#2b1b3a' : '#ffffff')),
        ...Array.from({ length: 8 }, (_, j) => paint(at(box(0.2, 0.03, (w * 2) / 8), { p: [-TRACK.L + ((j % 2) - 0.5) * -0.2, 0.015, R - w + (j + 0.5) * ((w * 2) / 8)] }), j % 2 ? '#ffffff' : '#2b1b3a')),
        ...MUD.map((m) => paintBy(at(cyl(TRACK.pad, TRACK.pad * 0.9, 0.04, 10), { s: [1.15, 1, 0.9], p: [m.x, 0.02, m.y] }), (p) => (Math.sin(p.x * 9) > 0.6 ? '#5e3f22' : '#6f4b2a'))),
        // Banderines afuera de las curvas.
        ...[-1, 1].flatMap((k) => [0.6, 1.5, 2.4].map((a) => { const x = k * (TRACK.L + (R + w + 0.25) * Math.sin(a)), z = (R + w + 0.25) * Math.cos(a); return paint(at(cyl(0.03, 0.03, 0.7, 4), { p: [x, 0.35, z] }), '#ffffff'); })),
      ]);
      ground.position.copy(V(0, 0, 0));
      v.group.add(ground);
      v.flags = mesh([-1, 1].flatMap((k) => [0.6, 1.5, 2.4].map((a, j) => { const x = k * (TRACK.L + (R + w + 0.25) * Math.sin(a)), z = (R + w + 0.25) * Math.cos(a); return paint(at(cone(0.14, 0.34, 3), { r: [0, 0, -Math.PI / 2], p: [x + 0.16, 0.62, z] }), ['#ff5c9e', '#ffd84a', '#4b8df7'][j]); })));
      v.flags.position.copy(V(0, 0, 0)); v.group.add(v.flags);
      v.boost = BOOST.map((b) => { const m = mesh([paintBy(at(cyl(TRACK.pad, TRACK.pad, 0.05, 12), { p: [0, 0.03, 0] }), (p) => (Math.hypot(p.x, p.z) < 0.25 ? '#fff3b0' : '#ffc93c')), paint(at(ball(0.18, 8, 4), { s: [1, 0.5, 1], p: [0, 0.12, 0] }), '#ff9a3c')], matGlow, false); m.position.copy(V(b.x, 0, b.y)); v.group.add(m); return m; });
      v.brooms = [0, 1].map(() => { const m = makeBroom(); v.group.add(m); return m; });
      v.head = [0, 0]; v.fell = [null, null];
      if (team) { v.cart = makeCart(); v.group.add(v.cart); v.cartLap = 0; v.line = extra(v); }
    },
    update(v, dt, time) {
      const s = v.s;
      v.boost.forEach((m, j) => (m.scale.y = 1 + Math.sin(time * 6 + j) * 0.3));
      v.flags.rotation.y = 0;
      s.p.forEach((p, i) => {
        const h = v.heroes[i], b = v.brooms[i];
        if (s.done && !p.out) return;
        h.root.scale.setScalar(0.62);
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > 0.4) { const want = Math.atan2(p.vx, p.vy); let d = want - v.head[i]; d = Math.atan2(Math.sin(d), Math.cos(d)); v.head[i] += d * Math.min(1, dt * 10); }
        let y = 0.36 + Math.sin(time * 5 + i * 2) * 0.05;
        if (p.out > 0) { const k = 1 - p.out / TRACK.out; y = v.fell[i] === 'lake' ? ease(0.2, -0.9, Math.min(1, k * 2)) : 0.36 - k * k * 6; }
        h.root.position.copy(V(p.x, y + 0.05, p.y)); h.turnTo = v.head[i];
        h.root.visible = !(p.out > 0 && v.fell[i] === 'lake' && y < -0.6);
        b.position.copy(V(p.x, y + 0.16, p.y)); b.rotation.set(0, v.head[i], Math.sin(time * 4 + i) * 0.08); b.visible = h.root.visible;
        // Se inclina al doblar.
        h.root.rotation.z = 0;
        pose(h, p.turbo > 0 ? 'fly' : 'idle');
      });
      if (team) {
        const c = s.cart, at = trackAt(c.u);
        v.cart.position.copy(V(at.x, 0, at.y)); v.cart.rotation.y = Math.atan2(at.tx, at.ty);
        v.cart.position.y += Math.abs(Math.sin(time * 9)) * 0.04;
        const laps = Math.max(0, Math.floor(c.prog / TRACK.len));
        if (laps > v.cartLap) { v.cartLap = laps; sfx('curse'); v.foe?.set('cheer', 1); v.float(up(v.cart.position, 1.6), `Carruaje: ${laps}/${TEAM_RACE.cartLaps}`, 'down'); }
        v.line(`Ustedes: <b>${s.laps}/${TEAM_RACE.goal}</b> vueltas · Carruaje: <b>${Math.min(laps, TEAM_RACE.cartLaps)}/${TEAM_RACE.cartLaps}</b>`);
      }
    },
    on(v, e) {
      const st = v.stage;
      if (e.t === 'bump') { sfx('boing'); const p = V(e.x, 0.6, e.y); st.sparks.burst(p.x, p.y, p.z, 14, { color: '#ffffff', speed: 2.4, life: 0.4, size: 0.2 }); }
      if (e.t === 'boost') { sfx('whoosh'); const p = V(e.x, 0.4, e.y); st.sparks.burst(p.x, p.y, p.z, 22, { color: ['#ffd84a', COLORS[e.p]], speed: 3, life: 0.5, size: 0.22 }); }
      if (e.t === 'fall') {
        v.fell[e.p] = e.lake ? 'lake' : 'edge';
        const p = V(e.x, 0, e.y);
        if (e.lake) { sfx('splash'); st.sparks.burst(p.x, p.y, p.z, 22, { color: '#d9f2ff', speed: 2.2, up: 2, life: 0.5, size: 0.18 }); v.float(up(p, 1), '¡Al lago!', 'down'); }
        else { sfx('whoosh'); v.float(up(p, 1), '¡Fuera!', 'down'); }
        v.heroes[e.p].set('hurt', 0.9);
      }
      if (e.t === 'knock') { sfx('trap'); st.shake(0.25); const p = V(e.x, 0.6, e.y); st.smoke.burst(p.x, p.y, p.z, 14, { color: '#6b4a9a', speed: 2, life: 0.5, size: 0.4, alpha: 0.8 }); v.fell[e.p] = 'edge'; v.heroes[e.p].set('hurt', 0.9); v.foe?.set('cheer', 1); v.float(up(p, 1), '¡El carruaje!', 'down'); }
      if (e.t === 'back') { sfx('hop', 5); const p = v.heroes[e.p].root.position; st.sparks.burst(p.x, p.y + 0.4, p.z, 12, { color: COLORS[e.p], speed: 1.6, life: 0.4, size: 0.18 }); }
      if (e.t === 'lap') {
        sfx('star'); const p = v.heroes[e.p].root.position;
        st.sparks.burst(p.x, p.y + 0.6, p.z, 26, { color: ['#ffd84a', COLORS[e.p]], speed: 3, life: 0.6, size: 0.24 });
        v.float(up(p, 1.2), team ? `${e.n}/${TEAM_RACE.goal}` : e.n >= TRACK.laps ? '¡Meta!' : `Vuelta ${e.n + 1}`, `up p${e.p}`);
        if (!team && e.n === TRACK.laps - 1) v.say('¡Última vuelta!', v.names[e.p], 1);
      }
      if (e.t === 'saved') v.say('¡Le ganaron al carruaje!', '', 1.3);
      if (e.t === 'lost') v.say(v.s.left > 0 ? '¡El carruaje llegó primero!' : '¡Se acabó el tiempo!', '', 1.3);
    },
  };
}

/* ---------- La máquina de garras (también la usa la garra en equipo) ---------- */
export function makePrize(kind) {
  if (kind === 'gem') return mesh([paint(octa(0.24), ['#37e07f', '#3fb8ff', '#ff4f9a'][Math.floor(Math.random() * 3)])], matGlow);
  if (kind === 'egg') return mesh([paintBy(at(ball(0.24, 10, 8), { s: [1, 1.3, 1], p: [0, 0.06, 0] }), (p) => (Math.sin(p.x * 18) * Math.sin(p.y * 16) > 0.55 ? '#7fc8ff' : '#fff3dc'))]);
  const b = makeCritter('conejo'); b.scale.setScalar(1.3); b.rotation.y = Math.PI; b.position.y = -0.2;
  const g = new THREE.Group(); g.add(b); g.sleepy = true; return g;
}
export function makeClaw(color) {
  const g = new THREE.Group();
  g.cable = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1, 4).translate(0, 0.5, 0), new THREE.MeshStandardMaterial({ color: '#d8d0e8' }));
  g.head = mesh([paint(at(cyl(0.2, 0.16, 0.22, 8), { p: [0, 0, 0] }), color), paint(at(ball(0.08, 6, 4), { p: [0, 0.14, 0] }), '#ffffff')], matGlow, false);
  g.prongs = [0, 1, 2].map((j) => { const p = new THREE.Group(); p.add(mesh([paint(at(box(0.05, 0.36, 0.05), { p: [0, -0.18, 0.14] }), '#e8e2f5'), paint(at(box(0.05, 0.05, 0.12), { p: [0, -0.36, 0.1] }), '#e8e2f5')])); p.rotation.y = (j / 3) * Math.PI * 2; p.position.y = -0.08; g.add(p); return p; });
  g.add(g.cable, g.head);
  g.set = (open) => g.prongs.forEach((p) => (p.children[0].rotation.x = open ? -0.45 : 0.1));
  return g;
}
export function makeMachine(d = 0.8, team = false) {
  const W = CLAW.w + 1.4;
  return mesh([
    paintBy(at(box(W * 2 + 0.4, 0.62, d * 2 + 0.6), { p: [0, 0.31, 0] }), (p) => (p.y > 0.55 ? '#ffd84a' : '#c2456f')),
    paint(at(box(CLAW.w * 2 + 0.6, 0.08, d * 2 + 0.3), { p: [0, 0.64, 0] }), '#6b3fa0'),
    ...[-1, 1].map((k) => paint(at(box(0.22, 3.6, 0.22), { p: [k * (W + 0.1), 2.3, -d - 0.2] }), '#ffd84a')),
    ...[-1, 1].map((k) => paint(at(box(0.22, 3.6, 0.22), { p: [k * (W + 0.1), 2.3, d + 0.2] }), '#ffd84a')),
    // Techo abierto: solo las vigas, para que se vea la garra desde arriba.
    ...[-1, 1].map((k) => paint(at(box(W * 2 + 0.6, 0.3, 0.3), { p: [0, 4.1, k * (d + 0.2)] }), '#c2456f')),
    ...[-1, 1].map((k) => paint(at(box(0.3, 0.3, d * 2 + 0.7), { p: [k * (W + 0.1), 4.1, 0] }), '#c2456f')),
    paint(at(box(W * 2, 0.06, 0.08), { p: [0, 3.55, 0] }), '#d8d0e8'),
    // Buzones: cada quien el suyo, o uno solo en equipo.
    ...(team ? [[-1, '#ffd84a']] : [[-1, COLORS[0]], [1, COLORS[1]]]).map(([k, c]) => paintBy(at(box(1.0, 0.9, team ? 1.0 : d * 2 + 0.3), { p: [k * (CLAW.chute + (team ? -0.2 : 0)), 1.0, team ? 2.1 : 0] }), (p) => (p.y > 1.4 ? '#2b1b3a' : c))),
    ...Array.from({ length: 14 }, (_, j) => paint(at(ball(0.07, 6, 4), { p: [-W + (j / 13) * W * 2, 4.28, d + 0.36] }), j % 2 ? '#fff3b0' : '#ff9ac8')),
  ]);
}
const CLAW_TOP = 3.3, CLAW_LOW = 0.98;
function clawY(st, t) { return st === 'down' ? ease(CLAW_TOP, CLAW_LOW, Math.min(1, t / CLAW.down)) : st === 'up' ? ease(CLAW_LOW, CLAW_TOP, Math.min(1, t / CLAW.up)) : CLAW_TOP; }
export function syncPrizes(v, list, place, time) {
  const live = new Set();
  for (const q of list) {
    live.add(q.id);
    let m = v.prizes.get(q.id);
    if (!m) { m = makePrize(q.kind); v.group.add(m); v.prizes.set(q.id, m); m.drop = 1.2; }
    m.drop = Math.max(0, m.drop - 1 / 60 * 3);
    place(m, q);
    m.position.y += m.drop * 2;
    if (q.kind === 'gem') m.rotation.y = time * 1.5 + q.id;
  }
  for (const [id, m] of v.prizes) if (!live.has(id)) { v.group.remove(m); v.prizes.delete(id); }
}

const garraView = {
  cam: { y: 1.9, w: 13.6, pitch: 0.2, h: 6.8 },
  island: { k: 0.5, top: ['#c98f5a', '#d69e68'] },
  init(v) {
    v.machine = makeMachine(); v.machine.position.copy(V(0, 0, 0)); v.group.add(v.machine);
    v.claws = [0, 1].map((i) => { const c = makeClaw(COLORS[i]); v.group.add(c); return c; });
    v.prizes = new Map();
    v.heroes.forEach((h, i) => { h.root.position.copy(V(i ? 6.1 : -6.1, 0, 1.1)); h.turnTo = i ? -0.5 : 0.5; });
  },
  update(v, dt, time) {
    const s = v.s;
    syncPrizes(v, s.prizes, (m, q) => {
      const c = q.taken != null && s.c[q.taken].hold === q ? s.c[q.taken] : null, claw = c && v.claws[q.taken];
      if (claw) m.position.copy(claw.position).add(new THREE.Vector3(0, -0.55, 0));
      else m.position.copy(V(q.x, 0.86, q.z * 0.6));
    }, time);
    s.c.forEach((c, i) => {
      const g = v.claws[i], y = clawY(c.st, c.t), z = i ? -0.28 : 0.28;
      g.position.copy(V(c.x, y, z));
      g.cable.scale.y = Math.max(0.01, 3.55 - y + 0.05);
      g.set(c.st === 'move' || (c.st === 'down' && c.t < CLAW.down * 0.9));
      const h = v.heroes[i];
      h.root.scale.setScalar(0.9);
      if (!s.done) pose(h, 'idle');
    });
  },
  on(v, e) {
    const st = v.stage, c = v.claws[e.p], at = c ? c.position.clone() : V(e.x, 1, 0);
    if (e.t === 'drop') sfx('whoosh');
    if (e.t === 'miss') { sfx('feint'); v.float(up(at, 0.3), '¡Nada!', 'down'); }
    if (e.t === 'grab') sfx('click');
    if (e.t === 'slip') { sfx('foul'); v.heroes[e.p].set('hurt', 0.6); v.float(up(at, 0.4), '¡Se soltó!', 'down'); }
    if (e.t === 'tug') { sfx('boing'); st.sparks.burst(at.x, at.y - 0.5, at.z, 16, { color: ['#ffffff', COLORS[e.w]], speed: 2.4, life: 0.4, size: 0.2 }); v.float(up(at, 0.6), '¡Tirón!', `up p${e.w}`); }
    if (e.t === 'win') {
      sfx(e.n > 1 ? 'gem' : 'coin');
      const p = V((e.p ? 1 : -1) * CLAW.chute, 1.6, 0);
      st.sparks.burst(p.x, p.y, p.z, 18 + e.n * 6, { color: ['#ffd84a', COLORS[e.p]], speed: 2.6, life: 0.6, size: 0.24 });
      v.float(up(p, 0.5), `+${e.n}`, `up p${e.p}`); v.heroes[e.p].set('cheer', 0.8);
    }
  },
};

/* ---------- Guerra de bolas de nieve ---------- */
function makeSnowman() {
  return mesh([
    paint(at(ball(0.42, 10, 8), { p: [0, 0.38, 0] }), '#ffffff'),
    paint(at(ball(0.3, 10, 8), { p: [0, 0.92, 0] }), '#f4f8ff'),
    paint(at(ball(0.21, 10, 8), { p: [0, 1.34, 0] }), '#ffffff'),
    paint(at(cone(0.05, 0.24, 5), { r: [Math.PI / 2, 0, 0], p: [0, 1.34, 0.3] }), '#ff8a2c'),
    ...[-1, 1].map((k) => paint(at(ball(0.035, 5, 4), { p: [k * 0.08, 1.42, 0.18] }), '#2b1b3a')),
    paint(at(cyl(0.16, 0.2, 0.2, 8), { p: [0, 1.58, 0] }), '#c2456f'),
  ]);
}
const nieveView = {
  island: { r: 6.2, k: 0.78, top: ['#eef4ff', '#e2ecfb'] },
  cam: { y: 0, z: 0.2, zTall: 0.8, w: 10.8, pitch: 0.75, h: 9.8 },
  init(v) {
    v.group.add(centered(mesh([0, 1].map((i) => paintBy(at(box(SNOW.w * 2 + 1.4, 0.35, 0.5), { p: [0, 0.17, (i ? -1 : 1) * (SNOW.y + 0.55)] }), (p) => (p.y > 0.28 ? '#ffffff' : '#dbe6f7'))))));
    v.men = v.s.men.map((m) => { const g = makeSnowman(); g.position.copy(V(m.x, 0, m.y)); g.rotation.y = m.side ? 0 : Math.PI; v.group.add(g); return g; });
    v.balls = new Map();
    v.flakes = 0;
  },
  update(v, dt, time) {
    const s = v.s;
    s.men.forEach((m, j) => { const g = v.men[j], want = m.hp > 0 ? 0.55 + (m.hp / SNOW.hp) * 0.45 : 0.05; g.scale.y += (want - g.scale.y) * Math.min(1, dt * 8); g.scale.x = g.scale.z = m.hp > 0 ? 1 : 0.6; });
    const live = new Set();
    for (const b of s.balls) {
      live.add(b.id);
      let m = v.balls.get(b.id);
      if (!m) { m = mesh([paint(ball(0.16, 8, 6), '#ffffff')]); v.group.add(m); v.balls.set(b.id, m); }
      const k = Math.min(1, Math.abs(b.y - s.p[b.from].y) / (SNOW.y * 2));
      m.position.copy(V(b.x, 0.9 + Math.sin(k * Math.PI) * 0.6, b.y));
    }
    for (const [id, m] of v.balls) if (!live.has(id)) { v.group.remove(m); v.balls.delete(id); }
    s.p.forEach((p, i) => {
      const h = v.heroes[i];
      if (s.done) return;
      h.root.scale.setScalar(0.85);
      h.root.position.copy(V(p.x, 0, p.y));
      h.turnTo = i ? 0 : Math.PI;
      if (p.stun > 0) { if (h.pose !== 'hurt') h.set('hurt', p.stun); }
      else pose(h, Math.abs(p.vx) > 0.6 ? 'walk' : 'idle');
    });
    if ((v.flakes += dt) > 0.12) { v.flakes = 0; const p = V((Math.random() - 0.5) * 11, 5, (Math.random() - 0.5) * 8); v.stage.sparks.emit?.({ x: p.x, y: p.y, z: p.z, vy: -1.2, life: 3, size: 0.08, color: '#ffffff' }); }
  },
  on(v, e) {
    const st = v.stage;
    if (e.t === 'throw') { v.heroes[e.p].set('throw', 0.3); }
    if (e.t === 'thud' || e.t === 'break') { sfx(e.t === 'break' ? 'trap' : 'hop', 1); const p = V(e.x, 0.9, e.y); st.sparks.burst(p.x, p.y, p.z, e.t === 'break' ? 30 : 12, { color: '#ffffff', speed: 2.2, life: 0.5, size: 0.2 }); if (e.t === 'break') v.float(up(p, 0.8), '¡Se rompió!', 'down'); }
    if (e.t === 'grow') { sfx('frost'); const p = V(e.x, 0.6, e.y); st.sparks.burst(p.x, p.y, p.z, 14, { color: '#dff3ff', speed: 1.4, life: 0.6, size: 0.18 }); }
    if (e.t === 'hit') { sfx('splash'); st.shake(0.2); const p = V(e.x, 1.1, e.y); st.sparks.burst(p.x, p.y, p.z, 24, { color: ['#ffffff', COLORS[e.by]], speed: 2.6, life: 0.5, size: 0.22 }); v.float(up(p, 0.9), '+1', `up p${e.by}`); }
  },
};

/* ---------- La catapulta mágica ---------- */
function makeCatapult(color) {
  const g = new THREE.Group();
  g.add(mesh([
    paint(at(box(0.9, 0.3, 1.3), { p: [0, 0.35, 0] }), '#8a5a33'),
    ...[-1, 1].flatMap((kx) => [-1, 1].map((kz) => paint(at(cyl(0.22, 0.22, 0.1, 10), { r: [0, 0, Math.PI / 2], p: [kx * 0.5, 0.22, kz * 0.45] }), '#5e3a20'))),
    ...[-1, 1].map((k) => paint(at(box(0.1, 0.7, 0.1), { p: [k * 0.3, 0.8, -0.1] }), '#6f4422')),
    paint(at(box(0.7, 0.12, 0.12), { p: [0, 1.1, -0.1] }), color),
  ]));
  g.arm = new THREE.Group(); g.arm.position.set(0, 0.62, 0.2);
  g.arm.add(mesh([paint(at(box(0.12, 0.12, 1.4), { p: [0, 0, -0.5] }), '#a8743f'), paint(at(cyl(0.2, 0.14, 0.16, 8), { p: [0, 0.08, -1.2] }), '#6f4422')]));
  g.add(g.arm);
  return g;
}
function makeTarget() {
  return mesh([
    paint(at(ringGeo(CAT.near, 0.06, 32, 4), { r: [Math.PI / 2, 0, 0] }), '#ffffff'),
    paint(at(cyl(CAT.near - 0.05, CAT.near - 0.05, 0.02, 28), { p: [0, -0.02, 0] }), '#d2452f'),
    paint(at(cyl(CAT.bull, CAT.bull, 0.04, 20), { p: [0, 0.0, 0] }), '#ffffff'),
    paint(at(cyl(CAT.bull * 0.45, CAT.bull * 0.45, 0.06, 14), { p: [0, 0.01, 0] }), '#ffd84a'),
  ]);
}
const catView = {
  island: { r: 7.4, k: 1, top: ['#8fd45c', '#83c952'] },
  cam: { y: 0, z: -0.8, zTall: -0.6, w: 9.8, pitch: 0.62, h: 12.4 },
  init(v) {
    v.group.add(centered(mesh(CAT.lanes.map((x) => paintBy(at(box(1.6, 0.04, CAT.range + 1.6), { p: [x, 0.02, CAT.base - CAT.range / 2 - 0.4] }), (p) => (Math.floor(p.z * 1.2) % 2 ? '#c9a77a' : '#bf9c6f'))))));
    v.cats = CAT.lanes.map((x, i) => { const c = makeCatapult(COLORS[i]); c.position.copy(V(x, 0, CAT.base + 0.5)); v.group.add(c); return c; });
    v.targets = CAT.lanes.map(() => { const m = makeTarget(); v.group.add(m); return m; });
    v.stones = CAT.lanes.map(() => { const m = mesh([paintBy(ico(0.24, 0), (p) => (p.y > 0 ? '#9a8fa8' : '#6d6080'))]); v.group.add(m); return m; });
    v.bars = CAT.lanes.map((x, i) => {
      const g = new THREE.Group(), bg = new THREE.Mesh(new THREE.PlaneGeometry(0.26, 1.7), new THREE.MeshBasicMaterial({ color: '#1d1830', transparent: true, opacity: 0.75, depthWrite: false })), fill = new THREE.Mesh(new THREE.PlaneGeometry(0.2, 1.64).translate(0, 0.82, 0), new THREE.MeshBasicMaterial({ color: COLORS[i], transparent: true, depthWrite: false }));
      fill.position.set(0, -0.82, 0.01); bg.renderOrder = 5; fill.renderOrder = 6; g.add(bg, fill); g.fill = fill; v.group.add(g); return g;
    });
    v.marks = [];
    v.heroes.forEach((h, i) => { h.root.position.copy(V(CAT.lanes[i] + (i ? 1.1 : -1.1), 0, CAT.base + 0.6)); h.turnTo = Math.PI; });
  },
  update(v, dt, time) {
    const s = v.s;
    s.p.forEach((p, i) => {
      const x = CAT.lanes[i], c = v.cats[i], n = Math.min(p.n, CAT.shots - 1), from = V(x, 1.3, CAT.base - 0.6);
      v.targets[i].position.copy(V(x, 0.05, CAT.base - s.targets[n] * CAT.range));
      v.targets[i].visible = p.st !== 'done';
      const pw = p.st === 'charge' ? p.pw : 0;
      c.arm.rotation.x += ((p.st === 'fly' && p.t < 0.25 ? -1.1 : p.st === 'charge' ? 0.15 + pw * 0.7 : 0) - c.arm.rotation.x) * Math.min(1, dt * (p.st === 'fly' ? 20 : 8));
      const b = v.bars[i]; b.position.copy(V(x + (i ? -0.75 : 0.75), 1.4, CAT.base + 0.6)); b.quaternion.copy(v.stage.camera.quaternion);
      b.fill.scale.y = Math.max(0.001, pw); b.visible = p.st === 'charge' || p.st === 'ready';
      const st = v.stones[i];
      if (p.st === 'fly') { const k = Math.min(1, p.t / CAT.fly), to = V(x, 0.2, CAT.base - p.land); st.position.lerpVectors(from, to, k); st.position.y += Math.sin(k * Math.PI) * (2 + p.land * 0.25); st.rotation.x += dt * 8; st.visible = true; }
      else { st.visible = p.st === 'ready' || p.st === 'charge'; st.position.copy(c.position).add(new THREE.Vector3(0, 0.75 + Math.sin(c.arm.rotation.x) * 0.9, -0.95 + c.arm.rotation.x * 0.3)); }
      const h = v.heroes[i]; h.root.scale.setScalar(0.85);
      if (!s.done) pose(h, p.st === 'charge' ? 'cast' : 'idle');
    });
    v.marks = v.marks.filter((m) => { m.t -= dt; m.material.opacity = Math.min(0.8, m.t); if (m.t > 0) return true; v.group.remove(m); return false; });
  },
  on(v, e) {
    const st = v.stage, x = CAT.lanes[e.p];
    if (e.t === 'charge') sfx('tick');
    if (e.t === 'launch') { sfx('whoosh'); v.heroes[e.p].set('throw', 0.4); }
    if (e.t === 'land') {
      const p = V(x, 0.2, CAT.base - e.d);
      sfx(e.pts === 3 ? 'fanfare' : e.pts ? 'coin' : 'foul');
      st.smoke.burst(p.x, p.y, p.z, 12, { color: '#bf9c6f', speed: 1.6, flat: 0.2, up: 0.8, life: 0.6, size: 0.35 });
      if (e.pts) st.sparks.burst(p.x, p.y + 0.3, p.z, e.pts * 12, { color: ['#ffd84a', COLORS[e.p]], speed: 2.8, life: 0.6, size: 0.24 });
      v.float(up(p, 1), e.pts === 3 ? '¡Al centro! +3' : e.pts ? '+1' : e.long ? 'Muy lejos' : 'Muy cerca', e.pts ? `up p${e.p}` : 'down');
      if (e.pts === 3) v.heroes[e.p].set('cheer', 0.8);
      const m = new THREE.Mesh(new THREE.CircleGeometry(0.16, 10).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: COLORS[e.p], transparent: true, opacity: 0.8, depthWrite: false }));
      m.position.copy(V(x, 0.07, CAT.base - e.d)); m.t = 4; v.group.add(m); v.marks.push(m);
    }
  },
};

/* ---------- El rey de la tortuga ---------- */
const tortugaView = {
  cam: { y: 0, z: 0.4, zTall: 0.9, w: 9, pitch: 0.8, h: 8.6 },
  init(v) {
    const R = TURTLE.r;
    v.group.add(centered(mesh([paintBy(at(cyl(7.5, 7, 0.4, 32), { p: [0, -0.6, 0] }), (p) => (Math.sin(p.x * 2 + p.z * 1.5) > 0.6 ? '#5aa8e0' : '#4a9ad9')), ...Array.from({ length: 7 }, (_, j) => paint(at(cyl(0.4, 0.4, 0.04, 8), { p: [Math.sin(j * 2.4) * 5.4, -0.38, Math.cos(j * 2.4) * 3.6] }), '#57b84d'))])));
    v.turtle = new THREE.Group(); v.turtle.position.copy(V(0, 0, 0)); v.group.add(v.turtle);
    v.shell = mesh([
      paintBy(at(cyl(R + 0.05, R + 0.25, 0.55, 24), { p: [0, 0.22, 0] }), (p) => { if (p.y < 0.4) return '#4f7a3a'; const a = Math.floor(p.x / 0.9 + 0.5 * (Math.floor(p.z / 0.8) % 2)), b = Math.floor(p.z / 0.8); return (a + b) % 2 ? '#7fae5a' : '#6f9e4c'; }),
      paint(at(ringGeo(R + 0.08, 0.1, 30, 4), { r: [Math.PI / 2, 0, 0], p: [0, 0.5, 0] }), '#c9a77a'),
    ]);
    v.turtle.add(v.shell);
    v.head = mesh([paint(at(ball(0.55, 10, 8), { s: [1, 0.85, 1.1], p: [0, 0, 0] }), '#8bbb63'), ...[-1, 1].map((k) => paint(at(ball(0.09, 6, 4), { p: [k * 0.25, 0.18, 0.45] }), '#2b1b3a'))]);
    v.head.position.copy(V(0, -0.05, R + 0.55)); v.group.add(v.head);
    v.fins = [[-1, 1], [1, 1], [-1, -1], [1, -1]].map(([kx, kz]) => { const m = mesh([paint(at(ball(0.5, 8, 6), { s: [1.4, 0.25, 0.7] }), '#8bbb63')]); m.home = V(kx * (R - 0.2), -0.2, kz * (R - 0.6)); v.group.add(m); return m; });
    v.hop = [0, 0];
  },
  update(v, dt, time) {
    const s = v.s, k = 0.45;
    v.turtle.rotation.set(Math.atan(s.ty * k), 0, Math.atan(-s.tx * k));
    v.turtle.position.copy(V(0, Math.sin(time * 1.6) * 0.04, 0));
    v.head.position.y = V(0, 0, 0).y - 0.05 + Math.sin(time * 1.6) * 0.06;
    v.fins.forEach((m, j) => { m.position.copy(m.home); m.rotation.y = Math.sin(time * 3 + j * 1.5) * 0.4; });
    v.turtle.updateMatrixWorld();
    s.p.forEach((p, i) => {
      const h = v.heroes[i];
      if (s.done && !p.out) return;
      h.root.scale.setScalar(0.8);
      const local = new THREE.Vector3(p.x, 0.5, p.y), world = v.turtle.localToWorld(local);
      if (p.out) { v.hop[i] += dt; world.y -= v.hop[i] * v.hop[i] * 5; h.root.visible = world.y > V(0, -1.2, 0).y; }
      else { v.hop[i] = 0; h.root.visible = true; }
      h.root.position.copy(world);
      const sp = Math.hypot(p.vx, p.vy);
      if (sp > 0.5) h.turnTo = Math.atan2(p.vx, p.vy);
      if (!s.done) pose(h, sp > 0.8 ? 'walk' : 'idle');
    });
  },
  on(v, e) {
    const st = v.stage;
    if (e.t === 'round') { v.say(`Ronda ${e.n}`, 'No te caigas del caparazón', 1.2); v.hop = [0, 0]; }
    if (e.t === 'go') { sfx('go'); v.say('¡Ya!', '', 0.6); }
    if (e.t === 'bump') { sfx('boing'); const p = V(e.x, 0.9, e.y); st.sparks.burst(p.x, p.y, p.z, 12, { color: '#ffffff', speed: 2, life: 0.4, size: 0.2 }); }
    if (e.t === 'fall') { sfx('splash'); st.shake(0.25); const p = v.heroes[e.p].root.position; st.sparks.burst(p.x, p.y, p.z, 26, { color: '#d9f2ff', speed: 2.6, up: 2.4, life: 0.6, size: 0.2 }); v.heroes[e.p].set('hurt', 1.4); v.heroes[e.w].set('cheer', 1.4); v.say(`¡${v.names[e.w]} gana la ronda!`, '', 1.5); }
    if (e.t === 'both') v.say('¡Empate!', 'Otra ronda', 1.3);
  },
};

/* ---------- Hockey de hongos ---------- */
const hockeyView = {
  island: { r: 7, k: 0.72 },
  cam: { y: -0.2, z: 0.2, zTall: 0.6, w: 11.8, pitch: 0.95, h: 8 },
  init(v) {
    const H = HOCKEY, T = 0.25;
    v.group.add(centered(mesh([
      paintBy(at(box(H.w * 2, 0.24, H.h * 2), { p: [0, 0.0, 0] }), (p) => (p.y > 0.08 ? (Math.abs(p.x) < 0.04 ? '#ffffff' : Math.hypot(p.x, p.z) < 1.05 && Math.hypot(p.x, p.z) > 0.95 ? '#ffffff' : '#5fb98a') : '#3f7a5a')),
      ...[-1, 1].map((k) => paint(at(box(H.w * 2 + T * 2, 0.4, T), { p: [0, 0.2, k * (H.h + T / 2)] }), '#8a5a33')),
      ...[-1, 1].flatMap((k) => [-1, 1].map((kz) => paint(at(box(T, 0.4, H.h - H.goal), { p: [k * (H.w + T / 2), 0.2, kz * (H.goal + (H.h - H.goal) / 2)] }), '#8a5a33'))),
      ...[-1, 1].flatMap((k) => [paint(at(box(0.5, 0.05, H.goal * 2), { p: [k * (H.w + 0.25), 0.03, 0] }), k < 0 ? COLORS[0] : COLORS[1]), ...[-1, 1].map((kz) => paint(at(cyl(0.08, 0.08, 0.9, 6), { p: [k * (H.w + 0.05), 0.45, kz * H.goal] }), k < 0 ? COLORS[0] : COLORS[1]))]),
      ...H.shrooms.flatMap(([x, z]) => [paint(at(cyl(0.12, 0.15, 0.3, 6), { p: [x, 0.25, z] }), '#fff3dc'), paintBy(at(ball(H.shroom + 0.05, 10, 6), { s: [1, 0.6, 1], p: [x, 0.42, z] }), (p) => (Math.sin(p.x * 22) * Math.sin(p.z * 22) > 0.5 ? '#ffffff' : '#e0414f'))]),
    ])));
    v.puck = mesh([paintBy(at(ball(H.puck, 10, 6), { s: [1, 0.55, 1] }), (p) => (p.y > 0.05 ? '#fff6c9' : '#ffd84a'))], matGlow, false);
    v.group.add(v.puck);
    v.light = new THREE.PointLight('#ffe08a', 8, 3.5, 1.8); v.group.add(v.light);
    v.mallets = [0, 1].map((i) => { const m = mesh([paintBy(at(cyl(H.mallet, H.mallet, 0.12, 14), { p: [0, 0.18, 0] }), (p) => (Math.hypot(p.x, p.z) > H.mallet * 0.7 ? COLORS[i] : '#ffffff'))]); v.group.add(m); return m; });
  },
  update(v, dt, time) {
    const s = v.s, q = s.puck;
    v.puck.position.copy(V(q.x, 0.2, q.y)); v.puck.rotation.y += Math.hypot(q.vx, q.vy) * dt;
    v.puck.visible = !(s.wait > 0 && s.wait < HOCKEY.pause - 0.2 && Math.sin(time * 20) > 0);
    v.light.position.copy(up(v.puck.position, 0.6));
    s.p.forEach((p, i) => {
      const h = v.heroes[i];
      v.mallets[i].position.copy(V(p.x, 0, p.y));
      if (s.done) return;
      h.root.scale.setScalar(0.55);
      h.root.position.copy(V(p.x, 0.24, p.y));
      h.turnTo = Math.atan2(q.x - p.x, q.y - p.y);
      pose(h, Math.hypot(p.vx, p.vy) > 1 ? 'walk' : 'idle');
    });
  },
  on(v, e) {
    const st = v.stage;
    if (e.t === 'hit') { sfx('hop', 2); const p = V(e.x, 0.3, e.y); st.sparks.burst(p.x, p.y, p.z, 8 + Math.min(14, e.n * 1.4), { color: ['#fff6c9', COLORS[e.p]], speed: 2, life: 0.3, size: 0.16 }); }
    if (e.t === 'wall') sfx('click');
    if (e.t === 'shroom') { sfx('boing'); const p = V(e.sx, 0.5, e.sy); st.sparks.burst(p.x, p.y, p.z, 10, { color: '#ffffff', speed: 2, life: 0.35, size: 0.16 }); }
    if (e.t === 'goal') {
      sfx('fanfare'); st.shake(0.3);
      const p = V(e.x, 0.5, e.y);
      st.sparks.burst(p.x, p.y, p.z, 50, { color: ['#ffd84a', COLORS[e.p], '#ffffff'], speed: 4, life: 0.8, size: 0.28 });
      v.heroes[e.p].set('cheer', 1); v.heroes[1 - e.p].set('sad', 1);
      v.say(`¡Gol de ${v.names[e.p]}!`, `${v.s.score[0]} a ${v.s.score[1]}`, 1.1);
    }
  },
};

export const FAIR_VIEWS = { escobas: raceView(false), garra: garraView, nieve: nieveView, catapulta: catView, tortuga: tortugaView, hockey: hockeyView };
