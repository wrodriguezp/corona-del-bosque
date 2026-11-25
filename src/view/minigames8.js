import * as THREE from 'three';
import { matGlow, paint, at, ball, box, cone, ico, octa, ringGeo, mesh } from './geo.js';
import { BOSS, CON, TRO, REY, jrey } from '../core/minigames/jefes.js';
import { extra } from './minigames6.js';
import { V, COLORS } from './arena.js';
import { sfx } from '../audio.js';

// Escenas de las batallas de jefe (V4.3). El jefe es el mismo modelo que se ve en el
// tablero (view.foe) y aquí se mueve por la arena: salta, embiste o gira el bigote.
const pose = (h, name) => { if (h.pose !== name && !['hurt', 'cheer', 'throw', 'clap', 'sad', 'cast'].includes(h.pose)) h.set(name); };
const hearts = (n, max) => `<b class="hearts">${'♥'.repeat(Math.max(0, n))}<i>${'♥'.repeat(Math.max(0, max - n))}</i></b>`;
const bar = (hp, max) => `<b class="hp"><i style="width:${Math.round((100 * Math.max(0, hp)) / max)}%"></i></b>`;
const NAME = { conejo: 'Conejo', troll: 'Troll', rey: 'Rey' };
const HEAD = { conejo: 2.7, troll: 2.9, rey: 2.6 };
const flat = (m) => { m.rotation.x = Math.PI / 2; return m; };
const glass = (color, opacity) => new THREE.MeshBasicMaterial({ color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false });

function sync(v, key, list, make, place) {
  const map = (v[key] ||= new Map()), live = new Set();
  for (const q of list) {
    live.add(q.id);
    let m = map.get(q.id);
    if (!m) { m = make(q); v.group.add(m); map.set(q.id, m); }
    place(m, q);
  }
  for (const [id, m] of map) if (!live.has(id)) { v.group.remove(m); m.traverse((o) => o.geometry?.dispose()); map.delete(id); }
}
const mark = (r, color = '#ff2a4d') => { const m = flat(new THREE.Mesh(new THREE.CircleGeometry(r, 28), glass(color, 0.3))); m.renderOrder = 2; return m; };

// Lo que comparten las tres arenas: el borde, los héroes, el jefe y sus estrellitas de mareo.
function arena(v) {
  const edge = flat(new THREE.Mesh(new THREE.RingGeometry(BOSS.r + 0.25, BOSS.r + 0.45, 64), glass('#ffffff', 0.35)));
  edge.position.copy(V(0, 0.03, 0)); v.group.add(edge);
  v.dizzy = new THREE.Group();
  for (let j = 0; j < 4; j++) { const st = mesh([paint(octa(0.16), '#ffe14a')], matGlow, false); st.position.set(Math.cos(j * 1.57) * 0.55, 0, Math.sin(j * 1.57) * 0.55); v.dizzy.add(st); }
  v.group.add(v.dizzy);
  v.line = extra(v);
  v.hitT = 0;
}
function heroes(v, dt, time) {
  const s = v.s;
  s.p.forEach((p, i) => {
    const h = v.heroes[i];
    if (s.done) return;
    h.root.scale.setScalar(0.85);
    h.root.position.copy(V(p.x, 0, p.y));
    h.root.visible = !(p.inv > 0 && Math.sin(time * 30) > 0.3);
    const sp = Math.hypot(p.vx, p.vy);
    if (sp > 0.5) h.turnTo = Math.atan2(p.vx, p.vy);
    pose(h, sp > 0.8 ? 'walk' : 'idle');
  });
}
function boss(v, dt, time, kind) {
  const s = v.s, b = s.boss, f = v.foe;
  f.root.position.copy(V(b.x, b.z, b.y));
  const want = Math.PI / 2 - b.dir, now = f.root.rotation.y, d = Math.atan2(Math.sin(want - now), Math.cos(want - now));
  f.root.rotation.y = now + d * Math.min(1, dt * 10);
  v.hitT = Math.max(0, v.hitT - dt);
  const k = (v.view.foe.s || 1) * (1 + v.hitT * 0.5);
  f.root.scale.set(k, (v.view.foe.s || 1) * (1 - v.hitT * 0.3), k);
  // Mareado: se tambalea y le giran estrellas sobre la cabeza.
  f.root.rotation.z = b.stun > 0 && kind !== 'rey' ? Math.sin(time * 5) * 0.12 : 0;
  v.dizzy.visible = b.stun > 0 && !s.done;
  v.dizzy.position.copy(V(b.x, HEAD[kind] * (v.view.foe.s || 1), b.y));
  v.dizzy.rotation.y = time * 4;
  const left = Math.ceil(b.stun), hp = `${NAME[kind]} ${bar(s.hp, s.max)}`;
  v.line(`${hp} &nbsp; ${hearts(s.lives, BOSS.lives)}${b.stun > 0 && !s.done ? ` &nbsp; <b>¡Mareado! ${left} s</b>` : ''}`);
}
// Zanahorias y rocas que caen: sombra roja en el piso que se llena, y la cosa bajando.
function falling(v, make) {
  sync(v, 'falls', v.s.shots.filter((q) => q.fall != null), (q) => {
    const g = new THREE.Group(), m = mark(q.r), o = make(q);
    g.add(m); g.add(o); g.o = o; g.m = m; g.f0 = q.fall;
    return g;
  }, (g, q) => {
    const k = 1 - Math.max(0, q.fall) / g.f0;
    g.position.copy(V(q.x, 0.04, q.y));
    g.m.material.opacity = 0.35 + k * 0.5;
    g.m.scale.setScalar(0.6 + k * 0.4);
    g.o.position.y = (1 - k) * 7 + 0.3;
    g.o.rotation.x += 0.15;
  });
}
const carrot = () => mesh([paint(at(cone(0.22, 0.9, 6), { r: [Math.PI, 0, 0] }), '#ff8a2a'), paint(at(cone(0.16, 0.35, 5), { p: [0, 0.55, 0] }), '#5fbf4a')]);
const rock = (size) => mesh([paint(new THREE.DodecahedronGeometry(size, 0), '#8d8795')]);
function says(v, e, extraFn) {
  const st = v.stage, s = v.s;
  if (e.t === 'hurt') { sfx('die'); st.shake(0.3); v.heroes[e.p].set('hurt', 0.9); v.float(V(e.x, 1.6, e.y), '−1 ♥', 'down'); }
  if (e.t === 'hit') {
    sfx('boing'); st.shake(0.25); v.hitT = 0.25;
    const p = V(e.x, 1.4, e.y);
    st.sparks.burst(p.x, p.y, p.z, 22, { color: ['#ffe14a', '#ffffff'], speed: 3, life: 0.5, size: 0.25 });
    v.float(p, e.both ? '¡Juntos! −1' : '−1', 'up');
    if (e.both) v.heroes.forEach((h) => h.set('cheer', 0.8)); else v.heroes[e.p].set('cheer', 0.6);
  }
  if (e.t === 'stun') { sfx('star'); v.foe.set(v.rules.boss === 'rey' ? 'dizzy' : 'hurt', REY.stun); v.say('¡Está mareado!', s.hp <= (v.rules === jrey ? REY.pair : 0) ? 'Péguenle los dos a la vez' : 'Corran a chocarlo', 1.4); }
  if (e.t === 'wake') { v.foe.set('idle'); sfx('roar'); }
  if (e.t === 'shake') v.say('¡Se sacudió!', '', 0.8);
  if (e.t === 'saved') { sfx('fanfare'); v.say(`¡Vencieron a ${v.foeName}!`, '', 1.4); }
  if (e.t === 'lost') v.say(s.lives > 0 ? '¡Se acabó el tiempo!' : '¡Se acabaron las vidas!', '', 1.4);
  extraFn?.(e);
}

/* ---------- El Conejo Gigante ---------- */
const conejoView = {
  island: { r: 6, k: 0.75 },
  cam: { y: 0, z: 0.3, zTall: 0.7, w: 11.4, pitch: 0.92, h: 11.6 },
  foe: { p: [0, 0, -0.8], ry: 0, s: 0.9 },
  init(v) {
    arena(v);
    v.shadow = mark(CON.land, '#2b1f3a'); v.shadow.material.opacity = 0; v.group.add(v.shadow);
  },
  update(v, dt, time) {
    const s = v.s, b = s.boss;
    heroes(v, dt, time); boss(v, dt, time, 'conejo');
    v.shadow.visible = b.mode === 'hop';
    if (b.mode === 'hop') { v.shadow.position.copy(V(b.tx, 0.05, b.ty)); v.shadow.material.opacity = 0.25 + (b.ht / b.dur) * 0.4; v.shadow.material.color.set(b.ht / b.dur > 0.6 ? '#ff3b5c' : '#2b1f3a'); }
    falling(v, carrot);
    // Las ondas: dos arcos que crecen, con un hueco a cada lado.
    sync(v, 'waves', s.rings, () => { const m = new THREE.Group(); m.renderOrder = 3; return m; }, (m, g) => {
      m.children.forEach((c) => { c.geometry.dispose(); }); m.clear();
      const len = Math.PI - CON.gap * 2, o = 1 - g.r / CON.reach;
      for (const a of [g.gap + CON.gap, g.gap + Math.PI + CON.gap]) m.add(flat(new THREE.Mesh(new THREE.RingGeometry(Math.max(0.01, g.r - 0.28), g.r + 0.28, 40, 1, a, len), glass('#7fd8ff', 0.55 + o * 0.4))));
      m.position.copy(V(g.x, 0.08, g.y));
    });
  },
  on(v, e) {
    says(v, e, (e) => {
      if (e.t === 'hop') sfx('hop', 3);
      if (e.t === 'land' && e.kind === 'bunny') { sfx('rumble'); v.stage.shake(0.35); const p = V(e.x, 0.1, e.y); v.stage.smoke.burst(p.x, p.y, p.z, 18, { color: '#d8cbb0', speed: 2.6, life: 0.6, size: 0.4 }); }
      if (e.t === 'land' && e.kind === 'carrot') { sfx('flip'); const p = V(e.x, 0.2, e.y); v.stage.sparks.burst(p.x, p.y, p.z, 10, { color: '#ff8a2a', speed: 2, life: 0.4, size: 0.2 }); }
      if (e.t === 'throw') sfx('whoosh');
    });
  },
};

/* ---------- El Troll Hipnotizado ---------- */
const trollView = {
  island: { r: 6, k: 0.75, top: ['#9fb874', '#a9c07c'] },
  cam: { y: 0, z: 0.3, zTall: 0.7, w: 11.4, pitch: 0.92, h: 11.6 },
  foe: { p: [0, 0, -0.8], ry: 0, s: 0.95 },
  init(v) {
    arena(v);
    // Flecha de la embestida: una franja roja en el piso hacia donde mira.
    v.lane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), glass('#ff3b5c', 0.3));
    v.lane.rotation.x = -Math.PI / 2; v.lane.renderOrder = 2;
    v.laneG = new THREE.Group(); v.laneG.add(v.lane); v.group.add(v.laneG);
  },
  update(v, dt, time) {
    const s = v.s, b = s.boss;
    heroes(v, dt, time); boss(v, dt, time, 'troll');
    const show = (b.mode === 'aim' || b.mode === 'charge') && !s.done;
    v.laneG.visible = show;
    if (show) {
      // Hasta el borde de la arena, que es donde se detiene si no choca con una roca.
      const dx = Math.cos(b.dir), dy = Math.sin(b.dir), bd = b.x * dx + b.y * dy, R = BOSS.r - b.r;
      const L = Math.max(0.5, -bd + Math.sqrt(Math.max(0, bd * bd - (b.x * b.x + b.y * b.y) + R * R)) + b.r);
      v.laneG.position.copy(V(b.x, 0.06, b.y)); v.laneG.rotation.y = -b.dir;
      v.lane.scale.set(L, b.r * 2, 1); v.lane.position.set(L / 2, 0, 0);
      v.lane.material.opacity = b.mode === 'charge' ? 0.5 : 0.18 + 0.2 * Math.abs(Math.sin(time * 8));
    }
    if (b.mode === 'aim' && !s.done) v.foe.root.position.y += Math.abs(Math.sin(time * 14)) * 0.06;
    falling(v, () => rock(TRO.rock.size));
    sync(v, 'boulders', s.rocks, () => rock(TRO.rock.size), (m, r) => { m.position.copy(V(r.x, TRO.rock.size * 0.7, r.y)); m.visible = r.life > 1.2 || Math.sin(r.life * 20) > 0; });
  },
  on(v, e) {
    says(v, e, (e) => {
      if (e.t === 'throw') sfx('whoosh');
      if (e.t === 'land' && e.kind === 'rock') { sfx('rumble'); v.stage.shake(0.2); const p = V(e.x, 0.2, e.y); v.stage.smoke.burst(p.x, p.y, p.z, 12, { color: '#a79fae', speed: 2, life: 0.5, size: 0.35 }); }
      if (e.t === 'aim') { sfx('roar'); v.say(`¡Mira a ${v.names[e.p]}!`, 'Escóndete detrás de una roca', 1.1); }
      if (e.t === 'charge') sfx('flap');
      if (e.t === 'crash') { sfx('trap'); v.stage.shake(0.5); const p = V(e.x, 0.5, e.y); v.stage.smoke.burst(p.x, p.y, p.z, 24, { color: '#8d8795', speed: 3.2, life: 0.7, size: 0.45 }); }
      if (e.t === 'wall') { sfx('boing'); v.stage.shake(0.25); }
    });
  },
};

/* ---------- El Rey Sombrío ---------- */
const reyView = {
  island: { r: 6, k: 0.75, top: ['#8a7fb0', '#9b90c0'] },
  cam: { y: 0, z: 0.3, zTall: 0.7, w: 11.4, pitch: 0.92, h: 11.6 },
  foe: { p: [0, 0, -0.4], ry: 0, s: 0.95 },
  init(v) {
    arena(v);
    // El bigote látigo: una barra que gira alrededor del Rey (roja y transparente mientras avisa).
    const W = REY.whip;
    v.whip = new THREE.Group();
    v.lash = new THREE.Mesh(new THREE.BoxGeometry(W.len, 0.18, W.wide * 2), new THREE.MeshStandardMaterial({ color: '#141018', emissive: '#ff4fd8', emissiveIntensity: 0.3, transparent: true, flatShading: true }));
    v.lash.position.set(W.len / 2 + 0.2, 0.9, 0);
    v.whip.add(v.lash); v.group.add(v.whip);
  },
  update(v, dt, time) {
    const s = v.s, b = s.boss;
    heroes(v, dt, time); boss(v, dt, time, 'rey');
    const w = s.whip;
    v.whip.visible = !!w && !s.done;
    if (w) {
      v.whip.position.copy(V(b.x, 0, b.y)); v.whip.rotation.y = -w.a;
      const warn = w.warn > 0;
      v.lash.material.opacity = warn ? 0.25 + 0.25 * Math.abs(Math.sin(time * 10)) : 1;
      v.lash.material.emissive.set(warn ? '#ff3b5c' : '#ff4fd8');
    }
    if (b.stun <= 0 && !s.done && v.foe.king.pose !== 'cast' && b.mode !== 'cast') pose(v.foe.king, w ? 'cast' : 'idle');
    sync(v, 'orbs', s.shots, (q) => {
      const gold = q.kind === 'gold';
      return mesh([paint(ico(q.r, 1), gold ? '#ffd84a' : '#1c0a2a'), paint(at(ball(q.r * 0.5, 6, 4), {}), gold ? '#fff6c9' : '#ff4fd8')], matGlow, false);
    }, (m, q) => { m.position.copy(V(q.x, 1.0, q.y)); m.rotation.y += 0.1; m.scale.setScalar(q.kind === 'gold' ? 1 + Math.sin(performance.now() / 90) * 0.12 : 1); });
    const ph = jrey.phase(s);
    if (ph !== v.ph) { if (v.ph) v.say(ph === 2 ? 'Segunda parte' : 'Última parte', ph === 2 ? 'Toquen el rayo dorado para devolvérselo' : 'Péguenle los dos a la vez', 1.6); v.ph = ph; }
  },
  on(v, e) {
    says(v, e, (e) => {
      if (e.t === 'whip') sfx('whoosh');
      if (e.t === 'cast') { v.foe.set('cast', 0.8); sfx('portal'); }
      if (e.t === 'volley') sfx('zap');
      if (e.t === 'reflect') { sfx('shield'); const p = V(e.x, 1, e.y); v.stage.sparks.burst(p.x, p.y, p.z, 18, { color: ['#ffd84a', '#fff6c9'], speed: 2.6, life: 0.5, size: 0.24 }); v.float(p, '¡Devuelto!', 'up'); }
      if (e.t === 'clang') { sfx('feint'); v.float(V(e.x, 1.8, e.y), '¡Los dos!', 'down'); }
    });
  },
};

export const BOSS_VIEWS = { jconejo: conejoView, jtroll: trollView, jrey: reyView };
