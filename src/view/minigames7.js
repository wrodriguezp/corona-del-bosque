import * as THREE from 'three';
import { matGlow, paint, paintBy, at, ball, box, cone, cyl, ico, octa, ringGeo, mesh } from './geo.js';
import { WALL, GRAB, MINE, POT, INGREDIENTS, SKY } from '../core/minigames/equipo2.js';
import { raceView, extra, makeMachine, makeClaw, syncPrizes } from './minigames6.js';
import { makeGuardTroll } from './critters.js';
import { V, COLORS } from './arena.js';
import { sfx } from '../audio.js';

// Escenas de los minijuegos en equipo de la V4.2.
const up = (p, y) => new THREE.Vector3(p.x, p.y + y, p.z);
const pose = (h, name) => { if (h.pose !== name && !['hurt', 'cheer', 'throw', 'clap', 'sad', 'cast'].includes(h.pose)) h.set(name); };
const ease = (a, b, k) => a + (b - a) * k;
const centered = (m) => { m.position.copy(V(0, 0, 0)); return m; };
const ARROW = ['↑', '→', '↓', '←'];
const lifeText = (n) => (n === 1 ? 'Queda 1 vida' : `Quedan ${n} vidas`);
const hearts = (n, max) => `<b class="hearts">${'♥'.repeat(Math.max(0, n))}<i>${'♥'.repeat(Math.max(0, max - n))}</i></b>`;

// Dibuja una lista de cosas del estado (por id), creando y borrando sus mallas.
function sync(v, key, list, make, place) {
  const map = (v[key] ||= new Map()), live = new Set();
  for (const q of list) {
    live.add(q.id);
    let m = map.get(q.id);
    if (!m) { m = make(q); v.group.add(m); map.set(q.id, m); }
    place(m, q);
  }
  for (const [id, m] of map) if (!live.has(id)) { v.group.remove(m); map.delete(id); }
}
const bolt = (i) => mesh([paint(ico(0.17, 1), COLORS[i]), paint(at(ball(0.09, 6, 4), { p: [0, 0, 0] }), '#ffffff')], matGlow, false);

/* ---------- Defiende la muralla ---------- */
const murallaView = {
  island: { r: 7.2, k: 1.05 },
  cam: { y: 0.2, z: -0.9, zTall: -0.6, w: 11.2, pitch: 0.9, h: 10.6 },
  foe: { p: [-5.2, 0, -4.2], ry: 0.5, s: 0.85 },
  init(v) {
    const Z = WALL.y + 0.25;
    v.group.add(centered(mesh([
      ...[...WALL.paths, 0].map((x) => paintBy(at(box(1.3, 0.03, 8.6), { p: [x, 0.015, -1] }), (p) => (Math.sin(p.z * 3 + x) > 0.5 ? '#bf9c6f' : '#c9a77a'))),
      paintBy(at(box(WALL.w * 2 + 1.6, 1.0, 0.8), { p: [0, 0.5, Z] }), (p) => ((Math.floor(p.x * 1.6) + Math.floor(p.y * 3)) % 2 ? '#b9aee0' : '#a397c9')),
      ...Array.from({ length: 11 }, (_, j) => paint(at(box(0.5, 0.35, 0.8), { p: [-WALL.w - 0.5 + j * ((WALL.w * 2 + 1) / 10), 1.17, Z - 0.05] }), '#a397c9')),
    ])));
    v.line = extra(v);
  },
  update(v, dt, time) {
    const s = v.s;
    sync(v, 'ogres', s.ogres, (o) => {
      const g = new THREE.Group(), t = makeGuardTroll();
      t.scale.setScalar(o.kind === 'big' ? 2.5 : 1.55); g.add(t); g.troll = t;
      if (o.kind === 'big') {
        g.shield = new THREE.Mesh(new THREE.CircleGeometry(0.75, 6), new THREE.MeshStandardMaterial({ color: '#7a5ac8', emissive: '#7a5ac8', emissiveIntensity: 0.6, transparent: true, opacity: 0.75, side: THREE.DoubleSide, flatShading: true }));
        g.shield.position.set(0, 1.1, 0.75); g.add(g.shield);
      }
      return g;
    }, (g, o) => {
      g.position.copy(V(o.x, Math.abs(Math.sin(time * 5 + o.ph)) * 0.08, o.y));
      g.troll.userData.idle?.(time + o.ph);
      g.hitT = Math.max(0, (g.hitT || 0) - dt);
      g.troll.scale.x = g.troll.scale.z = (o.kind === 'big' ? 2.5 : 1.55) * (1 + g.hitT * 0.6);
      if (g.shield) {
        // Si uno ya le acertó, el escudo toma su color: ¡ahora el otro!
        const one = [0, 1].find((i) => s.t - o.mark[i] < WALL.pair);
        g.shield.material.color.set(one != null ? COLORS[one] : '#7a5ac8');
        g.shield.material.emissive.set(one != null ? COLORS[one] : '#7a5ac8');
        g.shield.rotation.z = time * 0.8;
      }
    });
    sync(v, 'bolts', s.bolts, (b) => bolt(b.from), (m, b) => m.position.copy(V(b.x, 1.4, b.y)));
    s.p.forEach((p, i) => {
      const h = v.heroes[i];
      if (s.done) return;
      h.root.scale.setScalar(0.8);
      h.root.position.copy(V(p.x, 1.0, WALL.y + 0.15));
      h.turnTo = Math.PI;
      pose(h, Math.abs(p.vx) > 0.6 ? 'walk' : 'idle');
    });
    v.line(`Muralla: ${hearts(s.lives, WALL.lives)}`);
  },
  on(v, e) {
    const st = v.stage;
    if (e.t === 'big') { sfx('roar'); v.say('¡Un ogro grande!', 'Disparen los dos a la vez', 1.2); }
    if (e.t === 'zap' || e.t === 'crack') { sfx('zap'); const p = V(e.x, 1.1, e.y); st.sparks.burst(p.x, p.y, p.z, 10, { color: ['#ffffff', COLORS[e.p]], speed: 2, life: 0.35, size: 0.18 }); }
    if (e.t === 'crack') v.float(V(e.x, 2.6, e.y), `¡Escudo roto! Quedan ${e.hp}`, `up p${e.p}`);
    if (e.t === 'clang') { sfx('shield'); const p = V(e.x, 1.1, e.y + 0.7); st.sparks.burst(p.x, p.y, p.z, 8, { color: '#cdb8ff', speed: 1.6, life: 0.3, size: 0.16 }); }
    if (e.t === 'down') { sfx(e.big ? 'fanfare' : 'star'); const p = V(e.x, 0.8, e.y); st.smoke.burst(p.x, p.y, p.z, e.big ? 26 : 14, { color: '#6b4a9a', speed: 2, life: 0.6, size: 0.4, alpha: 0.8 }); st.sparks.burst(p.x, p.y + 0.4, p.z, e.big ? 40 : 16, { color: ['#ffd84a', COLORS[e.p]], speed: 3, life: 0.6, size: 0.22 }); if (e.big) v.float(up(p, 1.6), '¡Ogro grande fuera!', 'up p0'); }
    if (e.t === 'smash') { sfx('trap'); st.shake(e.big ? 0.5 : 0.3); v.foe?.set('cheer', 1); const p = V(e.x, 0.8, WALL.y - 0.3); st.smoke.burst(p.x, p.y, p.z, 18, { color: '#a397c9', speed: 2.2, life: 0.6, size: 0.4, alpha: 0.8 }); v.say(e.big ? '¡El ogro grande golpeó la muralla!' : '¡Golpe a la muralla!', e.lives > 0 ? `Aguanta ${e.lives} golpe${e.lives === 1 ? '' : 's'} más` : '', 0.9); }
    if (e.t === 'saved') v.say('¡La muralla aguantó!', '', 1.3);
    if (e.t === 'lost') v.say('¡Cayó la muralla!', '', 1.3);
  },
};

/* ---------- La garra en equipo ---------- */
const TOP = 3.3, LOW = 0.98;
const garraqView = {
  cam: { y: 1.7, w: 12.4, pitch: 0.5, h: 7.4, z: 0.6, zTall: 0.9 },
  island: { k: 0.6, top: ['#c98f5a', '#d69e68'] },
  foe: { p: [5.4, 0, -1.8], ry: -0.6, s: 0.8 },
  init(v) {
    v.machine = makeMachine(GRAB.d, true); v.machine.position.copy(V(0, 0, 0)); v.group.add(v.machine);
    v.claw = makeClaw('#ffd84a'); v.claw.scale.setScalar(1.5); v.group.add(v.claw);
    v.prizes = new Map();
    // Sombra de la garra en el piso: ayuda a ver hacia dónde va a bajar.
    v.shadow = new THREE.Mesh(new THREE.CircleGeometry(GRAB.reach, 20).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#1d1830', transparent: true, opacity: 0.45, depthWrite: false }));
    v.group.add(v.shadow);
    // Guías en el piso: la línea de lado a lado (izquierda) y la de adelante y atrás (derecha).
    v.guide = [0, 1].map((i) => { const m = new THREE.Mesh(i ? new THREE.BoxGeometry(GRAB.w * 2 + 0.6, 0.02, 0.06) : new THREE.BoxGeometry(0.06, 0.02, GRAB.d * 2 + 0.6), new THREE.MeshBasicMaterial({ color: COLORS[i], transparent: true, opacity: 0.8 })); v.group.add(m); return m; });
    v.heroes.forEach((h, i) => { h.root.position.copy(V(i ? 5.6 : -5.6, 0, 1.8)); h.turnTo = i ? -0.6 : 0.6; });
    v.line = extra(v);
  },
  update(v, dt, time) {
    const s = v.s, t = s.t0;
    const y = s.phase === 'down' ? ease(TOP, LOW, Math.min(1, t / GRAB.down)) : s.phase === 'up' ? ease(LOW, TOP, Math.min(1, t / GRAB.up)) : TOP;
    v.claw.position.copy(V(s.x, y, s.z));
    v.claw.cable.scale.y = Math.max(0.01, 3.55 - y + 0.05) / 1.5;
    v.claw.set(s.phase === 'x' || s.phase === 'z' || (s.phase === 'down' && t < GRAB.down * 0.9));
    v.shadow.position.copy(V(s.x, 0.7, s.z)); v.shadow.visible = s.phase !== 'carry';
    v.guide[0].position.copy(V(s.x, 0.7, 0)); v.guide[0].visible = s.phase === 'x';
    v.guide[1].position.copy(V(0, 0.7, s.z)); v.guide[1].visible = s.phase === 'z';
    syncPrizes(v, s.prizes, (m, q) => {
      if (s.hold === q) m.position.copy(v.claw.position).add(new THREE.Vector3(0, -0.55, 0));
      else m.position.copy(V(q.x, 0.86, q.z));
    }, time);
    v.heroes.forEach((h, i) => { h.root.scale.setScalar(0.9); if (!s.done) pose(h, (s.phase === 'x' && !i) || (s.phase === 'z' && i) ? 'cast' : 'idle'); });
    v.line(`Premios: <b>${s.got}/${GRAB.goal}</b> · Ahora: <b class="p${s.phase === 'z' ? 1 : 0}">${s.phase === 'z' ? `${v.names[1]} (adelante y atrás)` : s.phase === 'x' ? `${v.names[0]} (de lado a lado)` : 'la garra'}</b>`);
  },
  on(v, e) {
    const st = v.stage, at = v.claw.position.clone();
    if (e.t === 'stop') { sfx('tick'); v.heroes[e.p].set('clap', 0.4); if (e.p === 1) sfx('whoosh'); }
    if (e.t === 'early') { sfx('feint'); v.float(up(v.heroes[e.p].root.position, 1.9), e.phase === 'x' ? `Primero ${v.names[0]}` : `Ahora ${v.names[1]}`, 'down'); }
    if (e.t === 'miss') { sfx('lose'); v.float(V(e.x, 1.6, e.z), '¡Nada!', 'down'); }
    if (e.t === 'grab') sfx('click');
    if (e.t === 'slip') { sfx('foul'); v.foe?.set('cheer', 0.8); v.float(up(at, 0.4), '¡Se soltó!', 'down'); }
    if (e.t === 'win') { sfx('gem'); const p = V(GRAB.chute[0], 1.6, GRAB.chute[1]); st.sparks.burst(p.x, p.y, p.z, 26, { color: ['#ffd84a', ...COLORS], speed: 2.6, life: 0.6, size: 0.24 }); v.float(up(p, 0.6), `${e.n}/${GRAB.goal}`, 'up p0'); v.heroes.forEach((h) => h.set('cheer', 0.7)); }
    if (e.t === 'saved') v.say('¡Sacaron todos los premios!', '', 1.3);
    if (e.t === 'lost') v.say('¡Se acabó el tiempo!', `Sacaron ${v.s.got} de ${GRAB.goal}`, 1.3);
  },
};

/* ---------- La mina ---------- */
const SEG = 2.4, SEGS = 9;
function makeGem() { return mesh([paint(at(octa(0.3), { s: [0.8, 1.2, 0.8] }), '#3fe0ff'), paint(at(octa(0.18), { p: [0.18, -0.2, 0.05] }), '#a46bff')], matGlow, false); }
function makeRock() { return mesh([paintBy(ico(0.5, 0), (p) => (p.y > 0.1 ? '#8c8399' : '#6d6080')), paintBy(at(ico(0.3, 0), { p: [0.3, -0.15, 0.1] }), () => '#7b7088')]); }
function makeMineCart() {
  return mesh([
    paintBy(at(box(1.1, 0.55, 1.3), { p: [0, 0.5, 0] }), (p) => (p.y > 0.7 ? '#8a5a33' : '#6f4422')),
    ...[-1, 1].flatMap((kx) => [-1, 1].map((kz) => paint(at(cyl(0.18, 0.18, 0.08, 10), { r: [0, 0, Math.PI / 2], p: [kx * 0.5, 0.2, kz * 0.42] }), '#4a4256'))),
    paint(at(box(1.15, 0.06, 1.35), { p: [0, 0.78, 0] }), '#c9a06a'),
  ]);
}
const minaView = {
  cam: { y: 0.9, z: -3.2, zTall: -2.8, w: 7.6, pitch: 0.42, h: 6.2 },
  foe: { p: [0, 0, -12.5], s: 0.9 },
  init(v) {
    v.group.add(centered(mesh([
      paintBy(at(box(7, 0.2, 30), { p: [0, -0.1, -8] }), (p) => (Math.floor(p.z * 0.8 + p.x * 0.6) % 2 ? '#5a4640' : '#4f3d38')),
      ...MINE.lanes.flatMap((x) => [-0.32, 0.32].map((d) => paint(at(box(0.07, 0.06, 30), { p: [x + d, 0.03, -8] }), '#b0a8bf'))),
      ...[-1, 1].map((k) => paintBy(at(box(0.4, 3.2, 30), { p: [k * 2.9, 1.6, -8] }), (p) => (Math.sin(p.y * 4 + p.z * 1.3) > 0.4 ? '#6d5568' : '#5e4a5a'))),
      ...[-1, 1].map((k) => paint(at(ringGeo(0.55, 0.05, 18, 4), { r: [0, Math.PI / 2, 0], p: [k * 2.55, 1.0, 0] }), '#ffd84a')),
    ])));
    v.ties = Array.from({ length: SEGS }, () => { const m = mesh([paint(at(box(4.6, 0.05, 0.22), { p: [0, 0.01, 0] }), '#6f4422'), ...[-1, 1].map((k) => paint(at(box(0.22, 2.2, 0.22), { p: [k * 2.62, 1.1, 0] }), '#7b4a2d')), paint(at(ball(0.12, 6, 4), { p: [2.45, 2.0, 0.1] }), '#ffcf6a')]); v.group.add(m); return m; });
    v.cart = makeMineCart(); v.group.add(v.cart); v.cx = MINE.lanes[1];
    v.lamp = new THREE.PointLight('#ffd08a', 14, 9, 1.6); v.group.add(v.lamp);
    v.line = extra(v);
  },
  update(v, dt, time) {
    const s = v.s;
    v.ties.forEach((m, j) => { const z = ((j * SEG - s.dist) % (SEG * SEGS) + SEG * SEGS) % (SEG * SEGS); m.position.copy(V(0, 0, 2.4 - z)); });
    v.cx += (MINE.lanes[s.lane] - v.cx) * Math.min(1, dt * 12);
    const shake = s.inv > 0 ? Math.sin(time * 40) * 0.05 : 0;
    v.cart.position.copy(V(v.cx + shake, Math.abs(Math.sin(time * 11)) * 0.03, 0));
    v.lamp.position.copy(V(v.cx, 1.8, -0.8));
    sync(v, 'items', s.items, (q) => (q.kind === 'gem' ? makeGem() : makeRock()), (m, q) => {
      if (q.kind === 'gem') { m.position.copy(V(q.side ? 2.45 : -2.45, 1.0, -q.z)); m.rotation.y = time * 2; }
      else m.position.copy(V(MINE.lanes[q.lane], 0.4, -q.z));
    });
    v.heroes.forEach((h, i) => {
      if (s.done) return;
      const drive = i === s.drive;
      h.root.scale.setScalar(0.55);
      h.root.position.copy(V(v.cx + (i ? 0.22 : -0.22), 0.72, drive ? -0.3 : 0.35));
      h.turnTo = Math.PI;
      pose(h, s.pause > 0 ? 'clap' : 'idle');
    });
    const dn = v.names[s.drive], pn = v.names[1 - s.drive];
    v.line(`Piedras: <b>${s.got}/${MINE.goal}</b> · ${hearts(s.lives, MINE.lives)}<br>Maneja <b class="p${s.drive}">${dn}</b> · Pica <b class="p${1 - s.drive}">${pn}</b>`);
  },
  on(v, e) {
    const st = v.stage;
    if (e.t === 'steer') sfx('flip');
    if (e.t === 'pick') { sfx('gem'); const p = V(e.side ? 2.45 : -2.45, 1.0, 0); st.sparks.burst(p.x, p.y, p.z, 20, { color: ['#3fe0ff', COLORS[e.p]], speed: 2.6, life: 0.5, size: 0.2 }); v.heroes[e.p].set('throw', 0.3); v.float(up(p, 0.6), `${e.n}/${MINE.goal}`, `up p${e.p}`); }
    if (e.t === 'whiff') { sfx('hop', 0); v.heroes[e.p].set('throw', 0.3); }
    if (e.t === 'crash') { sfx('trap'); st.shake(0.4); v.foe?.set('cheer', 1); const p = v.cart.position; st.smoke.burst(p.x, p.y + 0.5, p.z - 0.6, 18, { color: '#8c8399', speed: 2.2, life: 0.6, size: 0.4, alpha: 0.8 }); v.heroes.forEach((h) => h.set('hurt', 0.6)); v.say('¡Chocaron con una roca!', e.lives > 0 ? lifeText(e.lives) : '', 0.9); }
    if (e.t === 'swap') { sfx('turn'); v.say('¡Cambio de papel!', `Ahora maneja ${v.names[e.drive]} y pica ${v.names[1 - e.drive]}`, MINE.swap); }
    if (e.t === 'saved') v.say('¡Llenaron la vagoneta!', '', 1.3);
    if (e.t === 'lost') v.say(v.s.lives > 0 ? '¡Se acabó el tiempo!' : '¡Se rompió la vagoneta!', '', 1.3);
  },
};

/* ---------- La poción ---------- */
const ING_COLOR = ['#e0414f', '#7fc8ff', '#a46bff', '#ffd84a'];
function makeIngredient(d) {
  if (d === 0) return mesh([paint(at(cyl(0.06, 0.08, 0.18, 6), { p: [0, -0.06, 0] }), '#fff3dc'), paintBy(at(ball(0.16, 8, 6), { s: [1, 0.6, 1], p: [0, 0.05, 0] }), (p) => (Math.sin(p.x * 30) > 0.6 ? '#ffffff' : '#e0414f'))]);
  if (d === 1) return mesh([paint(at(ball(0.1, 6, 4), { s: [0.6, 2.4, 0.15] }), '#7fc8ff')], matGlow, false);
  if (d === 2) return mesh([paint(at(octa(0.16), { s: [0.8, 1.4, 0.8] }), '#a46bff')], matGlow, false);
  return mesh([...Array.from({ length: 5 }, (_, j) => paint(at(ball(0.07, 6, 4), { p: [Math.sin(j * 1.256) * 0.1, 0, Math.cos(j * 1.256) * 0.1] }), '#ffd84a')), paint(ball(0.05, 6, 4), '#ff8a2c')]);
}
const pocionView = {
  island: { r: 5.4, k: 0.7 },
  cam: { y: 1.0, w: 8.6, pitch: 0.68, h: 6.2, z: 0.2, zTall: 0.5 },
  foe: { p: [3.4, 0, -2.4], ry: -0.5, s: 0.8 },
  init(v) {
    v.pot = mesh([
      paintBy(at(new THREE.SphereGeometry(1.05, 16, 12, 0, Math.PI * 2, 0.55, Math.PI - 0.55), { s: [1, 0.8, 1], p: [0, 0.9, 0] }), (p) => (p.y > 1.4 ? '#4a4256' : '#3a3346')),
      paint(at(ringGeo(0.56, 0.08, 24, 6), { r: [Math.PI / 2, 0, 0], p: [0, 1.62, 0] }), '#5e566e'),
      ...[0, 2.1, 4.2].map((a) => paint(at(cyl(0.08, 0.1, 0.5, 5), { p: [Math.sin(a) * 0.7, 0.2, Math.cos(a) * 0.7] }), '#3a3346')),
      ...Array.from({ length: 7 }, (_, j) => paint(at(cone(0.16, 0.42, 5), { p: [Math.sin(j * 0.9) * 0.45, 0.14, Math.cos(j * 0.9) * 0.45] }), j % 2 ? '#ff8a2c' : '#ffd84a')),
    ]);
    v.pot.position.copy(V(0, 0, 0)); v.group.add(v.pot);
    v.brew = new THREE.Mesh(new THREE.CircleGeometry(0.64, 24).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: '#5a6b9a', emissive: '#5a6b9a', emissiveIntensity: 0.5, flatShading: true }));
    v.brew.position.copy(V(0, 1.55, 0)); v.group.add(v.brew);
    v.spoon = mesh([paint(at(cyl(0.04, 0.04, 1.6, 5), { p: [0, 0.8, 0] }), '#a8743f'), paint(at(ball(0.12, 6, 4), { s: [1, 0.5, 1.4], p: [0, 0.02, 0] }), '#a8743f')]);
    v.group.add(v.spoon);
    // Termómetro: la franja verde es «hierve»; arriba de la roja se derrama.
    const g = new THREE.Group(), H = 2.2, bar = (h, y, c, o = 1) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(0.36, h), new THREE.MeshBasicMaterial({ color: c, transparent: o < 1, opacity: o, depthWrite: false })); m.position.y = y; return m; };
    g.add(bar(H + 0.1, H / 2, '#1d1830', 0.8), bar(H * (1 - POT.warm) * 0.96, H * (POT.warm + (1 - POT.warm) / 2), '#37e07f', 0.35), bar(0.05, H, '#ff4f4f'));
    v.fill = new THREE.Mesh(new THREE.PlaneGeometry(0.24, H).translate(0, H / 2, 0), new THREE.MeshBasicMaterial({ color: '#ff9a3c', transparent: true, depthWrite: false }));
    v.fill.position.z = 0.01; g.children.forEach((m, j) => (m.renderOrder = 5 + j)); v.fill.renderOrder = 9; g.add(v.fill); v.gauge = g; v.gH = H; v.group.add(g);
    v.flying = [];
    v.heroes.forEach((h, i) => { h.root.position.copy(V(i ? 1.85 : -1.85, 0, 0.5)); h.turnTo = i ? -1.1 : 1.1; });
    v.line = extra(v);
    v.boil = 0;
  },
  update(v, dt, time) {
    const s = v.s, hot = s.heat >= POT.warm, k = Math.min(1, s.heat / POT.spill);
    v.fill.scale.y = Math.max(0.001, k); v.fill.material.color.set(hot ? (k > 0.88 ? '#ff4f4f' : '#37e07f') : '#ff9a3c');
    v.gauge.position.copy(V(-3.0, 0.4, 0.4)); v.gauge.quaternion.copy(v.stage.camera.quaternion);
    const c = new THREE.Color('#5a6b9a').lerp(new THREE.Color('#5cff9a'), k);
    v.brew.material.color.copy(c); v.brew.material.emissive.copy(c);
    v.brew.position.y = V(0, 1.55, 0).y + (hot ? Math.sin(time * 18) * 0.02 : 0);
    if (hot && (v.boil += dt) > 0.08) { v.boil = 0; const p = V((Math.random() - 0.5) * 0.9, 1.6, (Math.random() - 0.5) * 0.9); v.stage.sparks.burst(p.x, p.y, p.z, 2, { color: ['#c9ffd9', '#5cff9a'], speed: 0.5, up: 1.2, life: 0.6, size: 0.14 }); }
    const st = 1 - s.cook, sx = v.heroes[st].root.position.x > v.pot.position.x ? 0.4 : -0.4;
    v.spoon.position.copy(V(sx + Math.sin(time * 3) * 0.2, 1.3, Math.cos(time * 3) * 0.2)); v.spoon.rotation.z = -sx * 0.8;
    v.flying = v.flying.filter((f) => { f.t += dt; const kk = Math.min(1, f.t / 0.45); f.m.position.lerpVectors(f.a, f.b, kk); f.m.position.y += Math.sin(kk * Math.PI) * 0.8; f.m.rotation.y += dt * 8; if (kk < 1) return true; v.group.remove(f.m); return false; });
    v.heroes.forEach((h) => { h.root.scale.setScalar(0.85); if (!s.done) pose(h, 'idle'); });
    const r = s.recipes[Math.min(s.pot, POT.goal - 1)];
    const row = r.map((d, j) => `<span class="ing${j < s.n ? ' done' : j === s.n ? ' now' : ''}" style="--c:${ING_COLOR[d]}">${ARROW[d]} ${INGREDIENTS[d]}</span>`).join('');
    v.line(`Poción <b>${Math.min(s.pot + 1, POT.goal)}/${POT.goal}</b> · ${hearts(s.lives, POT.lives)}<br>${row}<br>Revuelve <b class="p${st}">${v.names[st]}</b> · Cocina <b class="p${s.cook}">${v.names[s.cook]}</b>`);
  },
  on(v, e) {
    const st = v.stage, top = V(0, 1.6, 0);
    if (e.t === 'stir') { sfx('splash'); v.heroes[e.p].set('cast', 0.25); }
    if (e.t === 'spill') { sfx('fire'); st.shake(0.3); st.smoke.burst(top.x, top.y, top.z, 24, { color: '#5cff9a', speed: 2.6, life: 0.7, size: 0.4, alpha: 0.85 }); v.foe?.set('cheer', 1); v.heroes[e.p].set('hurt', 0.7); v.say('¡Se derramó! Muy caliente', e.lives > 0 ? lifeText(e.lives) : '', 1); }
    if (e.t === 'cold') { sfx('frost'); v.float(up(top, 0.6), 'Aún no hierve', 'down'); }
    if (e.t === 'wrong') { sfx('foul'); v.foe?.set('cheer', 1); v.heroes[e.p].set('hurt', 0.6); st.smoke.burst(top.x, top.y, top.z, 14, { color: '#6b4a9a', speed: 1.6, life: 0.6, size: 0.35, alpha: 0.8 }); v.say(`¡Ese no! Tocaba ${ARROW[e.want]} ${INGREDIENTS[e.want]}`, e.lives > 0 ? lifeText(e.lives) : '', 1.1); }
    if (e.t === 'add') {
      sfx('note', e.n); v.heroes[e.p].set('throw', 0.35);
      const m = makeIngredient(e.d); v.group.add(m);
      v.flying.push({ m, t: 0, a: up(v.heroes[e.p].root.position, 1.2), b: top.clone() });
      setTimeout(() => st.sparks.burst(top.x, top.y, top.z, 14, { color: [ING_COLOR[e.d], '#ffffff'], speed: 2, up: 1, life: 0.5, size: 0.2 }), 450);
    }
    if (e.t === 'brew') { sfx('fanfare'); st.sparks.burst(top.x, top.y + 0.4, top.z, 50, { color: ['#5cff9a', '#ffd84a', ...COLORS], speed: 3.4, up: 2, life: 0.8, size: 0.26 }); v.heroes.forEach((h) => h.set('cheer', 0.8)); v.say(`¡Poción ${e.n} lista!`, e.n < POT.goal ? 'Cambian de papel' : '', 1.1); }
    if (e.t === 'saved') v.say('¡Las tres pociones listas!', '', 1.3);
    if (e.t === 'lost') v.say(v.s.lives > 0 ? '¡Se acabó el tiempo!' : '¡Se arruinó la poción!', '', 1.3);
  },
};

/* ---------- El globo ---------- */
const BY = 2.6; // altura en pantalla del globo
function makeBalloon() {
  const g = new THREE.Group();
  g.add(mesh([
    paintBy(at(ball(SKY.r * 1.55, 16, 12), { s: [1, 1.15, 1], p: [0, 1.6, 0] }), (p) => ['#ff5c9e', '#ffd84a', '#4b8df7', '#ffffff'][Math.floor((Math.atan2(p.x, p.z) / Math.PI + 1) * 4) % 4]),
    paint(at(cone(0.45, 0.45, 10), { r: [Math.PI, 0, 0], p: [0, 0.4, 0] }), '#e0bf55'),
    paintBy(at(cyl(0.5, 0.4, 0.42, 8), { p: [0, -0.45, 0] }), (p) => (Math.floor(p.y * 14) % 2 ? '#a8743f' : '#8a5a33')),
  ]));
  g.fire = mesh([paint(at(cone(0.16, 0.45, 6), { p: [0, 0.15, 0] }), '#ffd84a'), paint(at(cone(0.09, 0.3, 6), { p: [0, 0.12, 0] }), '#ffffff')], matGlow, false);
  g.add(g.fire);
  g.ropes = [-1, 1].map((k, i) => { const m = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 1.1, 4), new THREE.MeshBasicMaterial({ color: COLORS[i] })); m.position.set(k * 0.55, -0.85, 0); g.add(m); return m; });
  return g;
}
function makeBranch(len, side) {
  const k = side ? -1 : 1;
  return mesh([
    paint(at(cyl(0.12, 0.2, len, 6), { r: [0, 0, Math.PI / 2], p: [k * len / 2, 0, 0] }), '#7b4a2d'),
    ...Array.from({ length: Math.ceil(len * 1.2) }, (_, j) => paint(at(ico(0.3, 0), { p: [k * (0.4 + j * 0.8), 0.12 + (j % 2) * 0.1, 0] }), j % 2 ? '#3aa568' : '#2f8f5b')),
  ]);
}
function makeCrow() {
  const g = new THREE.Group();
  g.add(mesh([paint(at(ball(0.22, 8, 6), { s: [1.4, 0.9, 0.9] }), '#2b2438'), paint(at(ball(0.14, 6, 4), { p: [0.28, 0.1, 0] }), '#2b2438'), paint(at(cone(0.05, 0.16, 4), { r: [0, 0, -Math.PI / 2], p: [0.45, 0.08, 0] }), '#ffb13d'), paint(at(ball(0.035, 5, 4), { p: [0.34, 0.16, 0.1] }), '#ff4f4f')]));
  g.wings = [-1, 1].map((k) => { const w = mesh([paint(at(box(0.36, 0.04, 0.42), { p: [0, 0, k * 0.24] }), '#3a3346')]); g.add(w); return w; });
  return g;
}
const globoView = {
  island: { r: 5, k: 0.6 },
  cam: { y: BY + 2.6, w: SKY.w * 2 + 1.6, pitch: 0.12, h: 11.5 },
  foe: { p: [2.6, 0, -1.6], ry: -0.4, s: 0.7 },
  init(v) {
    v.isle = v.group.children[0];
    v.trunks = mesh([-1, 1].map((k) => paintBy(at(cyl(0.35, 0.45, 40, 7), { p: [k * (SKY.w + 0.3), 0, 0] }), (p) => (Math.sin(p.y * 3) > 0.5 ? '#6f4422' : '#7b4a2d'))));
    v.group.add(v.trunks);
    v.clouds = Array.from({ length: 10 }, (_, j) => { const m = mesh([0, 1, 2].map((n) => paint(at(ball(0.45 + n * 0.1, 8, 6), { p: [n * 0.5 - 0.5, (n % 2) * 0.15, 0] }), '#ffffff'))); m.cx = Math.sin(j * 2.7) * 3; m.cz = -2.5 - (j % 3); m.cy = j * 2.4; m.scale.setScalar(0.9 + (j % 3) * 0.3); v.group.add(m); return m; });
    v.top = mesh([paint(at(cyl(1.6, 1.9, 0.4, 10), { p: [0, 0, 0] }), '#e8e2f5'), paint(at(cyl(0.04, 0.04, 1.4, 4), { p: [0, 0.9, 0] }), '#ffffff'), paint(at(cone(0.3, 0.5, 3), { r: [0, 0, -Math.PI / 2], p: [0.28, 1.4, 0] }), '#ffd84a')]);
    v.group.add(v.top);
    v.balloon = makeBalloon(); v.group.add(v.balloon);
    v.line = extra(v);
  },
  update(v, dt, time) {
    const s = v.s, base = BY - s.alt;
    v.isle.position.copy(V(0, base - BY, 0));
    v.foe.root.position.copy(V(2.6, base - BY, -1.6));
    v.trunks.position.copy(V(0, ((-s.alt % 4) + 4) % 4 + 10, -0.2));
    v.clouds.forEach((m) => { const y = (((m.cy - s.alt * 0.6) % 24) + 24) % 24 - 6; m.position.copy(V(m.cx, y + BY, m.cz)); });
    v.top.position.copy(V(0, BY + SKY.goal - s.alt + 0.2, 0));
    v.top.visible = SKY.goal - s.alt < 14;
    const b = v.balloon;
    b.position.copy(V(s.x, BY - 1.0 + Math.sin(time * 2) * 0.06, 0)); // el centro del choque queda en la parte baja de la tela
    b.rotation.z = -s.vx * 0.06;
    b.visible = !(s.inv > 0 && Math.sin(time * 30) > 0.3);
    const f = s.fire ? 1.8 : 1; b.fire.scale.set(f, f * (1 + Math.sin(time * 30) * 0.15), f);
    b.ropes.forEach((r, i) => { r.scale.y = s.was[i] ? 0.7 : 1; r.position.y = s.was[i] ? -0.7 : -0.85; });
    if (s.fire && Math.random() < 0.5) { const p = up(b.position, 0.3); v.stage.sparks.burst(p.x, p.y, p.z, 1, { color: ['#ffd84a', '#ff8a2c'], speed: 0.6, up: 1, life: 0.4, size: 0.16 }); }
    sync(v, 'things', s.things, (q) => (q.kind === 'crow' ? makeCrow() : makeBranch(q.len, q.side)), (m, q) => {
      if (q.kind === 'crow') { m.position.copy(V(q.x, BY + q.alt - s.alt, 0)); m.rotation.y = q.v > 0 ? 0 : Math.PI; m.wings.forEach((w, j) => (w.rotation.x = Math.sin(time * 14) * 0.7 * (j ? 1 : -1))); }
      else m.position.copy(V(q.side ? SKY.w : -SKY.w, BY + q.alt - s.alt, 0));
    });
    v.heroes.forEach((h, i) => {
      if (s.done) return;
      h.root.scale.setScalar(0.42);
      h.root.position.copy(up(b.position, -0.65)).add(new THREE.Vector3(i ? 0.2 : -0.2, 0, 0.05));
      h.turnTo = 0;
      pose(h, s.was[i] ? 'cast' : 'idle');
    });
    v.line(`Altura: <b>${Math.floor(Math.min(s.alt, SKY.goal))}/${SKY.goal} m</b> · ${hearts(s.lives, SKY.lives)}`);
  },
  on(v, e) {
    const st = v.stage, p = v.balloon.position;
    if (e.t === 'bump') { sfx(e.kind === 'crow' ? 'eagle' : 'trap'); st.shake(0.3); v.foe?.set('cheer', 1); st.sparks.burst(p.x, p.y + 1, p.z, 18, { color: e.kind === 'crow' ? '#3a3346' : '#3aa568', speed: 2.4, life: 0.5, size: 0.22 }); v.say(e.kind === 'crow' ? '¡Un cuervo!' : '¡Una rama!', e.lives > 0 ? lifeText(e.lives) : '', 0.9); }
    if (e.t === 'saved') { sfx('fanfare'); v.say('¡Llegaron a la cima!', '', 1.3); }
    if (e.t === 'lost') v.say(v.s.lives > 0 ? '¡Se acabó el tiempo!' : '¡El globo se desinfló!', '', 1.3);
  },
};

export const TEAM2_VIEWS = { carruaje: raceView(true), muralla: murallaView, garraq: garraqView, mina: minaView, pocion: pocionView, globo: globoView };
