import '@fontsource/grenze-gotisch/400.css';
import '@fontsource/alegreya-sans/latin-400.css';
import '@fontsource/alegreya-sans/latin-500.css';
import '@fontsource/alegreya-sans/latin-700.css';
import './ui/style.css';
import * as THREE from 'three';
import { Game } from './core/game.js';
import { CARDS, FAMILIES } from './core/cards.js';
import { Stage, ease } from './view/stage.js';
import { BoardView } from './view/boardView.js';
import { makePrincess, makeMage } from './view/characters.js';
import { DiceTable } from './view/dice.js';
import { Hud } from './ui/hud.js';
import { icon } from './ui/icons.js';
import { sfx, unlock } from './audio.js';

const COLORS = ['#ff5c9e', '#4b8df7'];
const stage = new Stage(document.getElementById('lienzo'));
const hud = new Hud(document.getElementById('ui'));
let g, view, dice, heroes, rings, busy = true, offset = [0, 0];

addEventListener('pointerdown', unlock);
addEventListener('keydown', unlock);

const newSeed = () => Math.floor(Math.random() * 1e9);
const baseYaw = () => (stage.portrait ? Math.PI / 2 * -1 : -0.16);

function setup(opts) {
  view?.dispose(); dice?.dispose();
  heroes?.forEach((h, i) => { stage.scene.remove(h.root, rings[i]); stage.updaters.splice(stage.updaters.indexOf(h.upd), 1); });
  g = new Game(opts);
  view = new BoardView(stage, g.board);
  dice = new DiceTable(stage, COLORS);
  heroes = [makePrincess(), makeMage()];
  rings = heroes.map((h, i) => {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: COLORS[i], transparent: true, opacity: 0.9, depthWrite: false }));
    h.root.scale.setScalar(1.04);
    stage.scene.add(h.root, r);
    h.upd = (dt, t) => {
      h.update(dt);
      r.position.set(h.root.position.x, (h.ground ?? h.root.position.y) + 0.035, h.root.position.z);
      const on = g.turn === i && g.phase !== 'over';
      r.scale.setScalar(on ? 1.1 + Math.sin(t * 5) * 0.08 : 0.8);
      r.material.opacity = on ? 0.95 : 0.4;
    };
    stage.updaters.push(h.upd);
    return r;
  });
  arrange(true);
  heroes.forEach((h) => (h.turnTo = stage.cam.yaw));
}

// Si comparten casilla, se apartan un poco, uno junto al otro en pantalla.
const side = (i) => new THREE.Vector3(Math.cos(baseYaw()), 0, -Math.sin(baseYaw())).multiplyScalar(i ? 0.45 : -0.45);
function arrange(now) {
  heroes.forEach((h, i) => { if (now) h.at = g.players[i].tile; });
  heroes.forEach((h, i) => {
    const v = view.pos(h.at);
    if (h.at === heroes[1 - i].at || h.at === g.board.castleId) v.add(side(i));
    if (now) { h.root.position.copy(v); h.ground = v.y; return; }
    const a = h.root.position.clone();
    if (a.distanceTo(v) > 0.05) stage.tween(0.3, (k) => { h.root.position.lerpVectors(a, v, k); h.ground = h.root.position.y; });
  });
}

const head = (i) => stage.project(heroes[i].root.position.clone().add(new THREE.Vector3(0, 1.9, 0)));
const sleep = (s) => stage.wait(s);
const sparkle = (i, color, n = 26) => { const p = heroes[i].root.position; stage.sparks.burst(p.x, p.y + 0.8, p.z, n, { color, speed: 2.6, up: 1.2, g: 2.5, life: 1, size: 0.26 }); };
const follow = (i, o = {}) => stage.focus(heroes[i].root.position, { dist: stage.portrait ? 12 : 11.5, pitch: 0.78, ...o });

/* ---------- Animación de cada evento de las reglas ---------- */
let hops = 0, acting = 0;
const play = {
  async turn(e) {
    acting = e.p;
    hops = 0;
    mapOn = false;
    hud.clearAct();
    view.showOptions([], '#fff');
    hud.setTurn(e.p, e.left);
    hud.refresh();
    sfx('turn');
    heroes.forEach((h) => (h.turnTo = stage.cam.wYaw));
    hud.banner(e.p, e.extra ? '¡Otro turno!' : `Turno de ${g.players[e.p].name}`, e.left != null ? (e.left === 1 ? 'Último turno' : `Quedan ${e.left} turnos`) : '');
    await follow(e.p, { yaw: baseYaw() });
    await sleep(0.35);
  },
  async star(e) {
    hud.star(e.p, e.n);
    if (e.p === acting) { const s = head(e.p); hud.float(s, `+${e.n} ${icon('star')}`, 'star'); sfx('star'); await sleep(0.3); }
  },
  async gems(e) {
    hud.gems(e.p, e.n);
    const up = e.n > 0;
    hud.float(head(e.p), `${up ? '+' : '−'}${Math.abs(e.n)} ${icon('gem')}`, up ? 'up' : 'down');
    sfx(up ? 'gem' : 'lose');
    heroes[e.p].set(up ? 'cheer' : 'hurt', up ? 0.9 : 1);
    sparkle(e.p, up ? ['#7dffb0', '#ffe27a', '#8fe0ff'] : ['#ff6f8f', '#9d5a8f'], up ? 34 : 18);
    if (!up) stage.shake(0.15);
    await sleep(up ? 0.75 : 0.85);
  },
  async offer(e) {
    if (e.why === 'stars') { hud.star(e.p, -3); sparkle(e.p, ['#ffe27a', '#fff6cf'], 40); }
    else { sfx('chest'); const p = heroes[e.p].root.position; stage.sparks.burst(p.x, p.y + 0.5, p.z, 60, { color: ['#ffd84a', '#ff9cc8', '#8fe0ff'], speed: 3, up: 3.4, g: 5, life: 1.3, size: 0.3 }); heroes[e.p].set('cheer', 1); await sleep(0.8); }
    const i = await hud.offer(g.players[e.p], e.cards, e.why);
    await run(g.pick(i));
  },
  async gain() { hud.refresh(); },
  async card(e) {
    const c = CARDS[e.card], col = FAMILIES[c.family].color;
    hud.clearAct();
    heroes[e.p].set('cast', 1.1);
    sfx('card');
    const p = heroes[e.p].root.position;
    for (let i = 0; i < 46; i++) { const a = (i / 46) * 6.283 * 3; stage.sparks.emit({ x: p.x + Math.sin(a) * 0.75, y: p.y + 0.05 + (i / 46) * 1.7, z: p.z + Math.cos(a) * 0.75, cx: p.x, cz: p.z, swirl: 3, vy: 0.5, color: col, size: 0.3, life: 1.1, delay: i * 0.012 }); }
    await hud.message(c.family === 'travesura' ? 'steal' : c.family === 'fortuna' ? 'gem' : 'star', c.name, c.text, true);
    if (c.family === 'travesura') {
      const a = heroes[e.p].root.position.clone().add(new THREE.Vector3(0, 1, 0)), b = heroes[1 - e.p].root.position.clone().add(new THREE.Vector3(0, 0.9, 0));
      follow(1 - e.p, { dur: 0.8 });
      await stage.tween(0.8, (k) => { const q = a.clone().lerp(b, k); q.y += Math.sin(k * Math.PI) * 1.8; for (let j = 0; j < 3; j++) stage.sparks.emit({ x: q.x, y: q.y, z: q.z, vx: (Math.random() - 0.5), vy: (Math.random() - 0.5), vz: (Math.random() - 0.5), color: col, size: 0.34, life: 0.6 }); }, ease.inOut);
    }
  },
  async curse(e) {
    sfx('curse');
    heroes[e.p].set('hurt', 1.2);
    const p = heroes[e.p].root.position;
    for (let i = 0; i < 22; i++) stage.smoke.emit({ x: p.x + (Math.random() - 0.5) * 0.8, y: p.y + 1.9 + Math.random() * 0.3, z: p.z + (Math.random() - 0.5) * 0.8, vy: -0.25, color: '#54456e', size: 0.4, life: 1.4, grow: 0.2, alpha: 0.8 });
    hud.refresh();
    await sleep(1);
  },
  async shield(e) {
    sfx('shield');
    const p = heroes[e.p].root.position;
    for (let i = 0; i < 60; i++) { const a = Math.random() * 6.283, y = Math.random() * 2; const r = Math.sqrt(Math.max(0, 1 - (y - 1) ** 2)); stage.sparks.emit({ x: p.x + Math.sin(a) * r, y: p.y + y, z: p.z + Math.cos(a) * r, color: '#9fe6ff', size: 0.3, life: 1.1, vx: Math.sin(a) * 0.4, vz: Math.cos(a) * 0.4 }); }
    hud.refresh();
    await hud.message('shield', '¡Escudo de luz!', `${g.players[e.p].name} bloquea: ${e.what}.`, true);
  },
  async roll(e) {
    hud.clearAct();
    heroes[e.p].set('throw', 0.8);
    await dice.roll(e.p, e.dice, () => { sfx('die'); stage.shake(0.06); });
    hud.refresh();
    hud.total(e.total, e.mods);
    sfx('gem');
    await sleep(e.mods.length ? 1.5 : 0.85);
    hud.total(null);
    dice.hide();
  },
  async options(e) {
    const reach = e.ids.map((id) => view.pos(id)), c = heroes[g.turn].root.position.clone();
    const box = new THREE.Box3().setFromPoints([...reach, c]), mid = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    const t = Math.tan((stage.camera.fov * Math.PI) / 360), [w, h] = stage.portrait ? [size.z, size.x] : [size.x, size.z];
    stage.focus(mid, { dist: THREE.MathUtils.clamp(Math.max((w + 5) / (2 * t * stage.camera.aspect), (h + 5) / (2 * t)), 11, 46), pitch: 0.95, yaw: baseYaw(), dur: 0.6 });
    view.showOptions(e.ids, COLORS[g.turn]);
  },
  async step(e) {
    const h = heroes[e.p], a = h.root.position.clone();
    h.at = e.id;
    const b = view.pos(e.id);
    if ((e.last || e.back) && heroes[1 - e.p].at === e.id) b.add(side(e.p));
    h.turnTo = Math.atan2(b.x - a.x, b.z - a.z);
    h.set(e.back ? 'fly' : 'walk');
    if (!mapOn) stage.focus(b, { dist: e.back ? 11 : 10.5, pitch: 0.72, dur: 0.5 });
    const top = Math.max(0, b.y - a.y) + (e.back ? 0.8 : 0.28);
    await stage.tween(e.back ? 0.32 : 0.36, (k) => { h.root.position.lerpVectors(a, b, k); h.ground = h.root.position.y; h.root.position.y += Math.sin(k * Math.PI) * top; }, ease.lin);
    sfx('hop', hops++);
    stage.smoke.burst(b.x, b.y + 0.06, b.z, 6, { color: ['#fff3d6', '#e6d6c0'], speed: 0.9, flat: 0.1, up: 0.3, life: 0.5, size: 0.2, alpha: 0.6, grow: 0.2 });
    hud.place(e.p, e.id);
    if (e.last || e.back) { h.set('idle'); h.turnTo = stage.cam.wYaw; arrange(false); }
    if (e.last) hops = 0;
  },
  async seen(e) { view.seen(e.ids); },
  async reveal(e) { sfx('flip'); const last = g.players.some((p) => p.tile === e.id); const p = view.reveal(e.id); if (last) await p; },
  async clear(e) { view.clear(e.id); },
  async msg(e) { await hud.message(e.kind, e.title, e.text, e.quick); hud.refresh(); },
  async trap(e) {
    sfx('trap');
    stage.shake(0.5);
    heroes[e.p].set('hurt', 1.4);
    const t = g.tile(e.id);
    stage.smoke.burst(t.x, t.h + 0.2, t.z, 30, { color: e.trap === 'zarzas' ? ['#5b2a55', '#8d3f7c'] : ['#6b5566', '#3d2b45'], speed: 2, up: 1.5, g: 1, life: 1.1, size: 0.45, grow: 0.4, alpha: 0.8 });
    if (e.trap === 'pozo') { const h = heroes[e.p], y = h.root.position.y; await stage.tween(0.35, (k) => (h.root.position.y = y - Math.sin(k * Math.PI) * 0.6), ease.lin); h.root.position.y = y; }
    if (e.trap === 'zarzas') for (let i = 0; i < 24; i++) { const a = i * 0.6; stage.sparks.emit({ x: t.x + Math.sin(a) * 0.6, y: t.h + i * 0.06, z: t.z + Math.cos(a) * 0.6, cx: t.x, cz: t.z, swirl: 2, color: '#ff4f9a', size: 0.25, life: 1.2, delay: i * 0.02 }); }
    await sleep(0.45);
  },
  async teleport(e) {
    const h = heroes[e.p], from = h.root.position.clone();
    sfx('portal');
    h.set('fly', 2.2);
    const swirl = (v) => { for (let i = 0; i < 70; i++) { const a = Math.random() * 6.283; stage.sparks.emit({ x: v.x + Math.sin(a) * 0.8, y: v.y + Math.random() * 1.6, z: v.z + Math.cos(a) * 0.8, cx: v.x, cz: v.z, swirl: 6, vy: 0.8, color: i % 2 ? '#c79bff' : '#8fe0ff', size: 0.28, life: 1.1 }); } };
    swirl(from);
    const r0 = h.root.rotation.y;
    await stage.tween(0.7, (k) => { h.root.position.y = from.y + k * 0.9; h.root.scale.setScalar(1.04 * Math.max(0.01, 1 - k * k)); h.root.rotation.y = r0 + k * 10; }, ease.lin);
    const to = view.pos(e.id);
    h.at = e.id;
    if (heroes[1 - e.p].at === e.id) to.add(side(e.p));
    h.ground = to.y;
    h.root.position.copy(to);
    await stage.focus(to, { dist: 11, dur: 0.9 });
    sfx('portal');
    swirl(to);
    await stage.tween(0.6, (k) => { h.root.position.y = to.y + (1 - k) * 0.9; h.root.scale.setScalar(1.04 * Math.max(0.01, k)); h.root.rotation.y = k * 10; }, ease.out);
    h.turnTo = stage.cam.wYaw;
    h.set('idle');
    hud.place(e.p, e.id);
  },
  async arrive(e) {
    sfx('win');
    const v = view.pos(g.board.castleId);
    stage.focus(v.clone().add(new THREE.Vector3(1, 0.6, 0)), { dist: 10.5, pitch: 0.5 });
    heroes[e.p].set('cheer', 2.4);
    for (let i = 0; i < 4; i++) { stage.sparks.burst(v.x + Math.random() * 3, v.y + 2.5 + Math.random() * 1.8, v.z + (Math.random() - 0.5) * 3, 60, { color: ['#ffd84a', COLORS[e.p], '#ffffff', '#8fe0ff'], speed: 4, g: 2.5, life: 1.5, size: 0.34 }); await sleep(0.4); }
  },
  async hud() { hud.refresh(); },
  async over(e) {
    hud.clearAct();
    view.showOptions([], '#fff');
    const w = heroes[g.winner], l = heroes[1 - g.winner];
    for (const d of view.mistData.values()) d.goal = 0;
    // Ceremonia frente al castillo.
    const v = view.pos(g.board.castleId);
    [w, l].forEach((h, k) => { h.root.position.copy(v).add(new THREE.Vector3(k ? 0 : -0.15, 0, k ? 0.62 : -0.5)); h.ground = v.y; });
    hud.game.classList.add('hidden');
    const yaw = -Math.PI / 2 + 0.12;
    heroes.forEach((h) => (h.turnTo = yaw));
    sfx('win');
    w.set('cheer'); l.set('sad');
    await stage.focus(v.clone().add(new THREE.Vector3(0, 1.05, 0)), { dist: stage.portrait ? 8.5 : 7, yaw, pitch: 0.12, dur: 1.4 });
    let alive = true;
    (async () => { while (alive) { stage.sparks.burst(v.x + Math.random() * 3, v.y + 2.6 + Math.random() * 1.6, v.z + (Math.random() - 0.5) * 4, 46, { color: ['#ffd84a', COLORS[g.winner], '#ffffff'], speed: 3.4, g: 2.2, life: 1.5, size: 0.28 }); await sleep(0.7); } })();
    const a = await hud.over(g, e.tie);
    alive = false;
    if (a === 'again') { const o = { names: g.players.map((p) => p.name), len: g.board.len, seed: newSeed() }; start(o); } else home();
    return 'stop';
  },
};

async function run(events) {
  busy = true;
  for (const e of events) if ((await play[e.t]?.(e)) === 'stop') return;
  busy = false;
  if (g.phase === 'ready') hud.showRoll(g.player, !g.cardPlayed);
  else if (g.phase === 'move') hud.showHint(`<b>${g.total}</b> ${g.total === 1 ? 'paso' : 'pasos'}: elige una casilla iluminada`);
}

/* ---------- Entrada ---------- */
let mapOn = false;
hud.on = {
  roll: () => { if (!busy && g.phase === 'ready') { sfx('click'); run(g.roll()); } },
  card: async (i) => {
    if (busy || g.phase !== 'ready' || g.cardPlayed || !g.player.hand[i]) return;
    let n;
    if (CARDS[g.player.hand[i]].choose) { busy = true; n = await hud.number(); busy = false; if (!n) return; }
    const ev = g.playCard(i, n);
    if (ev.length) { await run(ev); follow(g.turn); }
  },
  map: () => {
    mapOn = !mapOn;
    const b = stage.bounds;
    if (mapOn) {
      const t = Math.tan((stage.camera.fov * Math.PI) / 360), dx = b.x1 - b.x0 + 8, dz = b.z1 - b.z0 + 8;
      const [w, h] = stage.portrait ? [dz, dx] : [dx, dz];
      stage.focus(new THREE.Vector3((b.x0 + b.x1) / 2, 0, (b.z0 + b.z1) / 2), { dist: Math.max(w / (2 * t * stage.camera.aspect), h / (2 * t)), pitch: 1.2, yaw: stage.portrait ? -Math.PI / 2 : 0 });
    }
    else if (g.phase === 'move') play.options({ ids: g.options() });
    else follow(g.turn, { yaw: baseYaw() });
  },
  cycle: (d) => {
    if (busy || g.phase !== 'move') return false;
    const ids = view.optIds, i = ids.indexOf(view.hover);
    hoverTile(ids[(i + d + ids.length) % ids.length] ?? ids[0]);
    return true;
  },
  confirm: () => { if (view.hover != null) choose(view.hover); },
  preview: (len, fresh) => preview(len, fresh),
};

function hoverTile(id) {
  if (view.hover === id) return;
  view.hover = id;
  view.showPath(id == null ? [] : g.pathFor(id));
  if (id != null) sfx('hover');
  stage.el.style.cursor = id == null ? '' : 'pointer';
}
function choose(id) {
  if (busy || g.phase !== 'move') return;
  mapOn = false;
  stage.el.style.cursor = '';
  view.showOptions([], '#fff');
  hud.clearAct();
  sfx('click');
  run(g.moveTo(id));
}
stage.onHover = (n) => { if (!busy && g?.phase === 'move') hoverTile(view.pickTile(n)); };
stage.onTap = (n) => {
  if (busy || g?.phase !== 'move') return;
  const id = view.pickTile(n);
  if (id == null) return hoverTile(null);
  // En pantalla táctil el primer toque muestra el camino y el segundo confirma.
  if (stage.mobile && view.hover !== id) { hoverTile(id); hud.showHint('Toca otra vez para confirmar'); return; }
  choose(id);
};

/* ---------- Flujo ---------- */
let prefs = { names: ['Princesa', 'Mago'], len: 28, seed: newSeed() };

function preview(len, fresh) {
  prefs.len = len;
  if (fresh) prefs.seed = newSeed();
  setup({ ...prefs });
  pose();
}
function pose() {
  const s = view.pos(g.board.startId), y = s.y - 0.16;
  heroes[0].root.position.set(s.x - 1.5, y, s.z - 0.62);
  heroes[1].root.position.set(s.x - 1.5, y, s.z + 0.62);
  heroes.forEach((h) => (h.ground = y));
  const yaw = -1.42;
  heroes.forEach((h) => (h.turnTo = yaw));
  const c = stage.cam;
  c.target.set(s.x - 1.5, y + (stage.portrait ? -0.1 : 0.12), s.z);
  c.pos.copy(c.target);
  Object.assign(c, { wYaw: yaw, yaw, wPitch: 0.16, pitch: 0.16, wDist: stage.portrait ? 8 : 5.6, dist: 9 });
  stage.focusId = (stage.focusId || 0) + 1;
}

async function home() {
  hud.game.classList.add('hidden');
  stage.locked = true;
  busy = true;
  preview(prefs.len, true);
  const c = await hud.title(prefs);
  Object.assign(prefs, c);
  unlock();
  start({ ...prefs });
}

async function start(opts) {
  stage.locked = true;
  busy = true;
  setup(opts);
  hud.build(g);
  g.players.forEach((p) => hud.place(p.id, p.tile));
  // Vuelo de presentación: del castillo a la salida.
  const a = view.pos(g.board.castleId), b = view.pos(g.board.startId);
  stage.cam.target.copy(a); stage.cam.pos.copy(a);
  Object.assign(stage.cam, { wYaw: baseYaw(), wPitch: 0.6, wDist: 15, pitch: 0.6, dist: 15, yaw: baseYaw() });
  await sleep(0.9);
  await stage.focus(b, { dist: 12, dur: 3.2 });
  stage.locked = false;
  run(g.begin());
}

home();
// Solo en desarrollo: permite adelantar el reloj en las pruebas.
if (import.meta.env.DEV) window.__corona = {
  stage, hud, choose, run,
  get g() { return g; }, get view() { return view; }, get heroes() { return heroes; }, get busy() { return busy; },
  async ff(seconds, until = () => false) {
    stage.manual = true; stage.noDraw = true;
    for (let t = 0; t < seconds && !until(); t += 1 / 30) { stage.frame(1 / 30); await new Promise((r) => queueMicrotask(r)); if (hud.fast) await new Promise((r) => setTimeout(r, 0)); }
    stage.noDraw = false; stage.frame(0.0001); stage.frame(0.0001);
  },
};
