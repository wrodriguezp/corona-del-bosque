import '@fontsource/grenze-gotisch/400.css';
import '@fontsource/alegreya-sans/latin-400.css';
import '@fontsource/alegreya-sans/latin-500.css';
import '@fontsource/alegreya-sans/latin-700.css';
import './ui/style.css';
import * as THREE from 'three';
import { Session, localStore } from './core/session.js';
import { byId } from './core/adventures.js';
import { GAMES } from './core/minigames/index.js';
import { CARDS, FAMILIES } from './core/cards.js';
import { Stage, ease } from './view/stage.js';
import { BoardView } from './view/boardView.js';
import { makePrincess, makeMage, PRINCESS_SKINS } from './view/characters.js';
import { makeEagle, makeWorm } from './view/creatures.js';
import { MiniView } from './view/minigames.js';
import { DiceTable } from './view/dice.js';
import { Hud } from './ui/hud.js';
import { icon } from './ui/icons.js';
import { sfx, unlock } from './audio.js';

const COLORS = ['#ff5c9e', '#4b8df7'];
const stage = new Stage(document.getElementById('lienzo'));
const hud = new Hud(document.getElementById('ui'));
const store = localStore();
let S, g, view, dice, heroes, rings, busy = true, mini = null;

addEventListener('pointerdown', unlock);
addEventListener('keydown', unlock);

const newSeed = () => Math.floor(Math.random() * 1e9);
const baseYaw = () => (stage.portrait ? Math.PI / 2 * -1 : -0.16);

function setup(opts, session = new Session(opts)) {
  view?.dispose(); dice?.dispose();
  heroes?.forEach((h, i) => { stage.scene.remove(h.root, rings[i]); stage.updaters.splice(stage.updaters.indexOf(h.upd), 1); });
  S = session;
  g = S.game;
  view = new BoardView(stage, g.board);
  dice = new DiceTable(stage, COLORS);
  heroes = [makePrincess(opts.skin), makeMage()];
  rings = heroes.map((h, i) => {
    const r = new THREE.Mesh(new THREE.RingGeometry(0.42, 0.52, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: COLORS[i], transparent: true, opacity: 0.9, depthWrite: false }));
    h.root.scale.setScalar(1.04);
    stage.scene.add(h.root, r);
    h.upd = (dt, t) => {
      h.update(dt);
      r.visible = h.root.visible && h.root.scale.x > 0.5;
      r.position.set(h.root.position.x, (h.ground ?? h.root.position.y) + 0.035, h.root.position.z);
      const on = mini || (g.turn === i && g.phase !== 'over');
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
    if (e.why === 'stars') { hud.star(e.p, -3); sparkle(e.p, ['#ffe27a', '#fff6cf'], 40); return; }
    sfx('chest');
    const p = heroes[e.p].root.position;
    stage.sparks.burst(p.x, p.y + 0.5, p.z, 60, { color: ['#ffd84a', '#ff9cc8', '#8fe0ff'], speed: 3, up: 3.4, g: 5, life: 1.3, size: 0.3 });
    heroes[e.p].set('cheer', 1);
    await sleep(0.8);
  },
  async spendStars(e) { hud.star(e.p, -3); sparkle(e.p, ['#ffe27a', '#fff6cf'], 30); },
  async gain(e) { hud.refresh(); sfx('card'); hud.float(head(e.p), `+ ${CARDS[e.card].name}`, 'up'); sparkle(e.p, FAMILIES[CARDS[e.card].family].color, 24); await sleep(0.7); },
  async lose(e) { hud.refresh(); sfx('lose'); hud.float(head(e.p), `− ${CARDS[e.card].name}`, 'down'); heroes[e.p].set('hurt', 1); await sleep(0.9); },
  async buy(e) { hud.clearAct(); sfx('coin'); hud.refresh(); await sleep(0.1); },
  async adventure(e) { sfx('chest'); sparkle(e.p, ['#ff9cc8', '#ffe27a', '#8fe0ff'], 40); follow(e.p, { dist: 9 }); await sleep(0.5); },
  async shop(e) { sfx('star'); follow(g.turn, { dist: 8.5, pitch: 0.6 }); await sleep(0.6); },
  async cave() { sfx('rumble'); follow(g.turn, { dist: 8, pitch: 0.6 }); await sleep(0.8); },
  async check(e) {
    await dice.roll(e.p, [e.die], () => sfx('die'));
    hud.total(e.die, [`Necesitabas ${e.need} o más`, e.ok ? '¡Logrado!' : 'No alcanzó']);
    sfx(e.ok ? 'gem' : 'lose');
    heroes[e.p].set(e.ok ? 'cheer' : 'sad', 1.2);
    await sleep(1.2);
    hud.total(null);
    dice.hide();
  },
  async grab(e) { sfx('coin'); hud.float(head(e.p), `Bolsa: ${e.bag}`, 'up'); sparkle(e.p, '#ffd84a', 22); heroes[e.p].set('throw', 0.7); await sleep(0.7); },
  async dragon(e) {
    const t = g.tile(e.id), d = view.contents.get(e.id)?.userData.dragon;
    sfx('roar');
    if (d) stage.tween(0.4, (k) => { d.userData.awake = k; d.scale.setScalar(0.72 + k * 0.5); });
    stage.shake(0.6);
    heroes[e.p].set('hurt', 2);
    await sleep(0.4);
    const h = heroes[e.p].root.position;
    for (let i = 0; i < 90; i++) { const k = Math.random(); stage.sparks.emit({ x: t.x, y: t.h + 0.9, z: t.z - 0.1, vx: (h.x - t.x) * 2 + (Math.random() - 0.5) * 2.2, vy: -0.2 + Math.random() * 1.4, vz: (h.z - t.z) * 2 + 1.6 + Math.random() * 1.6, color: ['#ff7a2b', '#ffd05a', '#ff4d3d'][i % 3], size: 0.45, life: 0.9, delay: k * 0.7, grow: 0.3 }); }
    await sleep(1);
    if (d) stage.tween(1.2, (k) => { d.userData.awake = 1 - k; d.scale.setScalar(1.22 - k * 0.5); });
  },
  async eagle(e) {
    const h = heroes[e.p], a = h.root.position.clone(), b = view.pos(e.id), bird = makeEagle();
    if (heroes[1 - e.p].at === e.id) b.add(side(e.p));
    const dir = Math.atan2(b.x - a.x, b.z - a.z);
    bird.scale.setScalar(0.95);
    stage.scene.add(bird);
    let fl = 0;
    const put = (v, k = 1) => { fl += 0.22 * k; bird.position.copy(v); bird.rotation.y = dir; bird.userData.flap(fl, 1); };
    sfx('eagle');
    const grip = 1.95;
    stage.focus(a.clone().add(new THREE.Vector3(0, 1.4, 0)), { dist: 14, pitch: 0.5 });
    const from = a.clone().add(new THREE.Vector3(-Math.sin(dir) * 10, 8, -Math.cos(dir) * 10));
    await stage.tween(1.0, (k) => put(from.clone().lerp(a.clone().setY(a.y + grip), k)), ease.out);
    h.set('fly'); h.turnTo = dir;
    sfx('flap');
    const n = Math.max(1.6, a.distanceTo(b) * 0.16);
    let beat = 0;
    stage.focusId++;
    await stage.tween(n, (k, t) => {
      const q = a.clone().lerp(b, k); q.y += Math.sin(k * Math.PI) * 3;
      h.root.position.copy(q); h.ground = -9;
      put(q.clone().setY(q.y + grip));
      stage.cam.target.copy(q).setY(q.y + 0.9);
      if (t * n > beat) { beat += 0.42; sfx('flap'); }
      if (Math.random() < 0.5) stage.smoke.emit({ x: q.x, y: q.y + 1.8, z: q.z, vy: -0.4, vx: (Math.random() - 0.5), vz: (Math.random() - 0.5), color: '#fff6e4', size: 0.18, life: 1.2 });
    }, ease.inOut);
    h.at = e.id; h.ground = b.y; h.root.position.copy(b);
    h.set('cheer', 0.9); h.turnTo = stage.cam.wYaw;
    stage.smoke.burst(b.x, b.y + 0.1, b.z, 14, { color: '#fff3d6', speed: 1.6, flat: 0.1, up: 0.4, life: 0.7, size: 0.3, alpha: 0.6 });
    hud.place(e.p, e.id);
    const c = bird.position.clone();
    stage.focus(b, { dist: 12, dur: 0.9 });
    stage.tween(1.3, (k) => put(c.clone().add(new THREE.Vector3(Math.sin(dir) * 14 * k, 9 * k, Math.cos(dir) * 14 * k))), ease.lin).then(() => stage.scene.remove(bird));
    arrange(false);
    await sleep(0.8);
  },
  async worm(e) {
    const h = heroes[e.p], a = h.root.position.clone(), b = view.pos(e.id), w = makeWorm();
    if (heroes[1 - e.p].at === e.id) b.add(side(e.p));
    const dirt = (v, n = 8) => stage.smoke.burst(v.x, v.y + 0.1, v.z, n, { color: ['#7b5238', '#936344', '#684230'], speed: 2.2, up: 1.6, g: 5, life: 0.9, size: 0.34 });
    stage.scene.add(w);
    const rise = async (v, y0, y1, dur, fn) => { w.position.copy(v); w.rotation.y = stage.cam.wYaw; await stage.tween(dur, (k) => { const y = y0 + (y1 - y0) * k; w.userData.pose(y, stage.time); fn?.(y, k); if (Math.random() < 0.6) dirt(v, 2); }, ease.inOut); };
    sfx('rumble');
    h.set('hurt', 5);
    for (let i = 0; i < 5; i++) { stage.shake(0.2); dirt(a, 5); await sleep(0.13); }
    stage.shake(0.6);
    sfx('roar');
    await rise(a, -1.2, 2.5, 0.85, (y) => { if (y > 0) { h.root.position.y = a.y + y * 0.75; const k = THREE.MathUtils.clamp((y - 1) / 1.2, 0, 1); h.root.scale.setScalar(1.04 * Math.max(0.01, 1 - k)); h.ground = -9; } });
    h.root.visible = false;
    await rise(a, 2.5, 2.2, 0.35);
    await rise(a, 2.2, -2, 0.7);
    sfx('rumble');
    const len = Math.max(1, a.distanceTo(b) * 0.13);
    stage.focus(b, { dist: 12, dur: len });
    await stage.tween(len, (k) => { const q = a.clone().lerp(b, k); q.y += 0.1; dirt(q, 2); stage.shake(0.08); }, ease.lin);
    stage.shake(0.5);
    await rise(b, -2, 1.9, 0.7);
    sfx('portal');
    h.root.visible = true;
    const top = b.y + 2.1;
    h.set('fly');
    stage.tween(0.5, (k) => h.root.scale.setScalar(1.04 * Math.max(0.01, k)));
    const land = b.clone();
    const sink = rise(b, 1.9, -2, 1.1);
    await stage.tween(1.1, (k, t) => { h.root.position.set(land.x, t < 0.5 ? top + Math.sin(t * Math.PI) * 1.4 : THREE.MathUtils.lerp(top + 1.4, b.y, ((t - 0.5) * 2) ** 2), land.z); }, ease.lin);
    await sink;
    stage.scene.remove(w);
    h.at = e.id; h.ground = b.y; h.root.position.copy(b);
    h.turnTo = stage.cam.wYaw;
    h.set('hurt', 0.8);
    dirt(b, 14);
    sfx('trap');
    hud.place(e.p, e.id);
    arrange(false);
    await sleep(0.8);
  },
  async swap(e) {
    sfx('portal');
    const pos = heroes.map((h) => h.root.position.clone());
    heroes.forEach((h) => h.set('fly', 2));
    await stage.tween(0.6, (k) => heroes.forEach((h) => h.root.scale.setScalar(1.04 * Math.max(0.01, 1 - k))));
    heroes.forEach((h, i) => { h.at = g.players[i].tile; h.root.position.copy(pos[1 - i]); h.ground = pos[1 - i].y; hud.place(i, h.at); for (let k = 0; k < 50; k++) { const a = Math.random() * 6.283, v = h.root.position; stage.sparks.emit({ x: v.x + Math.sin(a) * 0.7, y: v.y + Math.random() * 1.6, z: v.z + Math.cos(a) * 0.7, cx: v.x, cz: v.z, swirl: 6, vy: 0.8, color: COLORS[i], size: 0.28, life: 1.1 }); } });
    follow(g.turn);
    await stage.tween(0.6, (k) => heroes.forEach((h) => h.root.scale.setScalar(1.04 * Math.max(0.01, k))), ease.out);
    heroes.forEach((h) => h.set('idle'));
    arrange(false);
  },
  async duel(e) { hud.clearAct(); sfx('fanfare'); hud.banner(e.by, e.why === 'torneo' ? '¡Torneo real!' : '¡Duelo!', GAMES[e.game].name); await sleep(1.3); },
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
    await dice.roll(e.p, e.dice, () => { sfx('die'); stage.shake(0.06); }, e.kind || 'normal');
    hud.refresh();
    hud.total(e.total, e.mods);
    sfx('gem');
    await sleep(e.mods.length ? 1.5 : 0.85);
    hud.total(null);
    dice.hide();
  },
  async options() {
    const ids = g.options();
    const reach = ids.map((id) => view.pos(id)), c = heroes[g.turn].root.position.clone();
    const box = new THREE.Box3().setFromPoints([...reach, c]), mid = box.getCenter(new THREE.Vector3()), size = box.getSize(new THREE.Vector3());
    const t = Math.tan((stage.camera.fov * Math.PI) / 360), [w, h] = stage.portrait ? [size.z, size.x] : [size.x, size.z];
    stage.focus(mid, { dist: THREE.MathUtils.clamp(Math.max((w + 5) / (2 * t * stage.camera.aspect), (h + 5) / (2 * t)), 11, 46), pitch: 0.95, yaw: baseYaw(), dur: 0.6 });
    view.showOptions(ids, COLORS[g.turn]);
  },
  async step(e) {
    const h = heroes[e.p], a = h.root.position.clone();
    h.at = e.id;
    const b = view.pos(e.id);
    if ((e.last || e.shove) && heroes[1 - e.p].at === e.id) b.add(side(e.p));
    h.turnTo = Math.atan2(b.x - a.x, b.z - a.z);
    h.set(e.back ? 'fly' : 'walk');
    if (!mapOn) stage.focus(b, { dist: e.back ? 11 : 10.5, pitch: 0.72, dur: 0.5 });
    const top = Math.max(0, b.y - a.y) + (e.back ? 0.8 : 0.28);
    await stage.tween(e.back ? 0.32 : 0.36, (k) => { h.root.position.lerpVectors(a, b, k); h.ground = h.root.position.y; h.root.position.y += Math.sin(k * Math.PI) * top; }, ease.lin);
    sfx('hop', hops++);
    stage.smoke.burst(b.x, b.y + 0.06, b.z, 6, { color: ['#fff3d6', '#e6d6c0'], speed: 0.9, flat: 0.1, up: 0.3, life: 0.5, size: 0.2, alpha: 0.6, grow: 0.2 });
    hud.place(e.p, e.id);
    if (e.last || e.shove) { h.set('idle'); h.turnTo = stage.cam.wYaw; arrange(false); }
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
    if (a === 'again') start({ ...S.opts, seed: newSeed() }); else home();
    return 'stop';
  },
};

async function run(events) {
  busy = true;
  for (const e of events) if ((await play[e.t]?.(e)) === 'stop') return;
  await prompt();
}
const act = (action) => run(S.dispatch(action));

// Muestra lo que el jugador en turno tiene que decidir según la fase.
async function prompt() {
  const p = g.player;
  switch (g.phase) {
    case 'ready': busy = false; hud.showRoll(p, !g.cardPlayed && !p.fx.locked); break;
    case 'move': busy = false; hud.showMove(g.total); break;
    case 'pick': { const i = await hud.offer(p, g.offer.cards, g.offer.why); return act({ type: 'pick', i }); }
    case 'adventure': { const i = await hud.adventure(byId[g.adventure], p, (k) => g.canChoose(k)); return act({ type: 'choose', i }); }
    case 'shop': { const i = await hud.shop(g.shop, p); return act({ type: 'shop', i }); }
    case 'cave': { const what = await hud.cave(g.cave, p); return act({ type: 'cave', what }); }
    case 'duel': { const winner = await minigame(g.duel); return act({ type: 'duel', winner }); }
  }
}

const WHY = { torneo: 'Torneo real', encuentro: '¡Encuentro en el camino!', arena: 'Arena antigua', reto: 'Guante de reto' };
async function minigame(d) {
  const names = g.players.map((p) => p.name), rules = GAMES[d.game];
  await hud.miniIntro(rules, WHY[d.why], names, stage.mobile, d.why === 'torneo' ? 'Premio: 4 gemas y una carta' : 'El ganador quita hasta 4 gemas al otro');
  const cam = { ...stage.cam, target: stage.cam.target.clone() };
  await hud.fade(true);
  hud.game.classList.add('hidden');
  stage.locked = true;
  view.group.visible = false;
  mini = new MiniView(stage, hud, heroes, names, d);
  await hud.fade(false);
  await mini.countdown();
  const w = await mini.play();
  await mini.celebrate(w);
  await hud.fade(true);
  mini.dispose();
  mini = null;
  view.group.visible = true;
  hud.game.classList.remove('hidden');
  Object.assign(stage.cam, { wYaw: cam.wYaw, yaw: cam.wYaw, wPitch: cam.wPitch, pitch: cam.wPitch, wDist: cam.wDist, dist: cam.wDist });
  stage.cam.target.copy(cam.target); stage.cam.pos.copy(cam.target);
  arrange(true);
  heroes.forEach((h) => (h.turnTo = stage.cam.wYaw));
  stage.locked = false;
  await hud.fade(false);
  return w;
}

/* ---------- Entrada ---------- */
let mapOn = false;
hud.on = {
  roll: () => { if (!busy && g.phase === 'ready') { sfx('click'); act({ type: 'roll' }); } },
  buy: (what) => { if (!busy && g.canBuy(what)) { view.showOptions([], '#fff'); act({ type: 'buy', what }); } },
  skin: (id) => { prefs.skin = id; try { localStorage.setItem('corona-skin', id); } catch {} preview(prefs.len, false); },
  card: async (i) => {
    if (busy || g.phase !== 'ready' || g.cardPlayed || g.player.fx.locked || !g.player.hand[i]) return;
    let n;
    if (CARDS[g.player.hand[i]].choose) { busy = true; n = await hud.number(); busy = false; if (!n) return; }
    await act({ type: 'card', i, value: n });
    if (g.phase === 'ready') follow(g.turn);
  },
  map: () => {
    mapOn = !mapOn;
    const b = stage.bounds;
    if (mapOn) {
      const t = Math.tan((stage.camera.fov * Math.PI) / 360), dx = b.x1 - b.x0 + 8, dz = b.z1 - b.z0 + 8;
      const [w, h] = stage.portrait ? [dz, dx] : [dx, dz];
      stage.focus(new THREE.Vector3((b.x0 + b.x1) / 2, 0, (b.z0 + b.z1) / 2), { dist: Math.max(w / (2 * t * stage.camera.aspect), h / (2 * t)), pitch: 1.2, yaw: stage.portrait ? -Math.PI / 2 : 0 });
    }
    else if (g.phase === 'move') play.options();
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
  act({ type: 'move', id });
}
stage.onHover = (n) => { if (!busy && g?.phase === 'move') hoverTile(view.pickTile(n)); };
stage.onTap = (n) => {
  if (busy || g?.phase !== 'move') return;
  const id = view.pickTile(n);
  if (id == null) return hoverTile(null);
  // En pantalla táctil el primer toque muestra el camino y el segundo confirma.
  if (stage.mobile && view.hover !== id) { hoverTile(id); hud.showMove(g.total, 'Toca otra vez para confirmar'); return; }
  choose(id);
};

/* ---------- Flujo ---------- */
let prefs = { names: ['Princesa', 'Mago'], len: 28, seed: newSeed(), skin: PRINCESS_SKINS[0].id };
try { prefs.skin = localStorage.getItem('corona-skin') || prefs.skin; } catch {}

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
  const saved = Session.load(store);
  const c = await hud.title(prefs, saved?.game, PRINCESS_SKINS);
  unlock();
  if (c === 'resume') return resume(saved);
  Object.assign(prefs, c);
  start({ ...prefs });
}

async function start(opts) {
  stage.locked = true;
  busy = true;
  setup(opts, new Session(opts, { store }));
  hud.build(g);
  g.players.forEach((p) => hud.place(p.id, p.tile));
  // Vuelo de presentación: del castillo a la salida.
  const a = view.pos(g.board.castleId), b = view.pos(g.board.startId);
  stage.cam.target.copy(a); stage.cam.pos.copy(a);
  Object.assign(stage.cam, { wYaw: baseYaw(), wPitch: 0.6, wDist: 15, pitch: 0.6, dist: 15, yaw: baseYaw() });
  await sleep(0.9);
  await stage.focus(b, { dist: 12, dur: 3.2 });
  stage.locked = false;
  act({ type: 'begin' });
}

async function resume(session) {
  stage.locked = true;
  busy = true;
  setup(session.opts, session);
  hud.build(g);
  g.players.forEach((p) => hud.place(p.id, p.tile));
  hud.setTurn(g.turn, g.first != null ? g.finalTurns : null);
  stage.cam.target.copy(heroes[g.turn].root.position); stage.cam.pos.copy(stage.cam.target);
  Object.assign(stage.cam, { wYaw: baseYaw(), yaw: baseYaw(), wPitch: 0.78, pitch: 0.6, wDist: 12, dist: 18 });
  hud.banner(g.turn, `Turno de ${g.player.name}`, 'Continúa la partida');
  await sleep(1.2);
  stage.locked = false;
  if (g.phase === 'move') await play.options();
  if (g.phase === 'start') return act({ type: 'begin' });
  acting = g.turn;
  run([]);
}

home();
// Solo en desarrollo: permite adelantar el reloj en las pruebas.
if (import.meta.env.DEV) window.__corona = {
  stage, hud, choose, run, act, minigame,
  get g() { return g; }, get view() { return view; }, get heroes() { return heroes; }, get busy() { return busy; }, get mini() { return mini; }, get S() { return S; },
  async ff(seconds, until = () => false) {
    stage.manual = true; stage.noDraw = true;
    for (let t = 0; t < seconds && !until(); t += 1 / 30) { stage.frame(1 / 30); await new Promise((r) => queueMicrotask(r)); if (hud.fast) await new Promise((r) => setTimeout(r, 0)); }
    stage.noDraw = false; stage.frame(0.0001); stage.frame(0.0001);
  },
};
