import * as THREE from 'three';
import { matGlow, paint, paintBy, loft, ico, star, mesh } from './geo.js';
import { GAMES, CHASE, DT } from '../core/minigames/index.js';
import { C, V, COLORS, island } from './arena.js';
import { NEW_VIEWS } from './minigames2.js';
import { Pads } from './pads.js';
import { sfx } from '../audio.js';

const FEINT = ['#b14be0', '#ff5d4a', '#3fb8ff'];

/* ---------- Vista de cada minijuego ---------- */
const VIEWS = {
  duelo: {
    island: { k: 0.6, top: ['#5fb98a', '#6fc997'] }, quiet: true,
    cam: { y: 0.75, w: 7.4, pitch: 0.16, h: 4.4 },
    init(v) {
      v.heroes.forEach((h, i) => { h.root.position.copy(V(i ? 2.5 : -2.5, 0, 0)); h.turnTo = i ? -Math.PI / 2 + 0.35 : Math.PI / 2 - 0.35; });
      v.orb = new THREE.Group();
      v.orb.position.copy(V(0, 2.3, -0.4));
      v.core = new THREE.Mesh(new THREE.OctahedronGeometry(0.34), new THREE.MeshStandardMaterial({ color: '#8d82a8', emissive: '#6a5f88', emissiveIntensity: 0.6, flatShading: true }));
      v.gold = mesh(paint(star(0.95, 0.16), '#ffd84a'), matGlow, false);
      v.gold.visible = false;
      v.orb.add(v.core, v.gold);
      v.group.add(v.orb);
      v.flash = 0;
    },
    update(v, dt, time) {
      v.core.rotation.y += dt * 2; v.core.rotation.x += dt;
      v.flash = Math.max(0, v.flash - dt * 1.8);
      v.core.material.emissive.set(v.flash > 0 ? FEINT[v.feint] : '#6a5f88');
      v.core.material.color.set(v.flash > 0 ? FEINT[v.feint] : '#8d82a8');
      v.core.scale.setScalar(1 + v.flash * 0.9);
      v.gold.visible = v.s.phase === 'signal';
      v.core.visible = !v.gold.visible;
      v.gold.rotation.z = Math.sin(time * 9) * 0.15;
      v.gold.scale.setScalar(1 + Math.sin(time * 14) * 0.08);
    },
    on(v, e) {
      const st = v.stage, o = v.orb.position;
      if (e.t === 'round') { v.say(`Ronda ${e.n}`, 'Espera la estrella dorada', 1.3); v.heroes.forEach((h, i) => { h.set('idle'); }); }
      if (e.t === 'feint') { v.flash = 1; v.feint = e.c; sfx('feint'); st.sparks.burst(o.x, o.y, o.z, 16, { color: FEINT[e.c], speed: 2, life: 0.6, size: 0.2 }); }
      if (e.t === 'both') v.say('¡Los dos se adelantaron!', 'Otra vez', 1.2);
      if (e.t === 'signal') { sfx('go'); st.sparks.burst(o.x, o.y, o.z, 60, { color: ['#ffd84a', '#fff6c9'], speed: 4, life: 0.8, size: 0.3 }); v.say('¡Ahora!', '', 0.6); }
      if (e.t === 'hit') {
        const w = v.heroes[e.w], l = v.heroes[1 - e.w];
        sfx('zap');
        w.set('cast', 1); l.set('hurt', 1.5);
        st.shake(0.4);
        const a = w.root.position.clone().add(new THREE.Vector3(0, 1.1, 0)), b = l.root.position.clone().add(new THREE.Vector3(0, 0.9, 0));
        for (let i = 0; i < 70; i++) { const q = a.clone().lerp(b, i / 70); st.sparks.emit({ x: q.x, y: q.y + Math.sin(i * 0.6) * 0.16, z: q.z + Math.cos(i * 0.6) * 0.16, color: i % 3 ? COLORS[e.w] : '#ffffff', size: 0.34, life: 0.6, delay: i * 0.002 }); }
        st.sparks.burst(b.x, b.y, b.z, 50, { color: [COLORS[e.w], '#ffffff'], speed: 4, life: 0.9, size: 0.3 });
        v.say(`¡Punto para ${v.names[e.w]}!`, v.s.react ? `Reaccionó en ${v.s.react.toFixed(2)} s` : '', 1.5);
      }
      if (e.t === 'foul') { sfx('foul'); v.heroes[1 - e.w].set('sad', 1.6); v.heroes[e.w].set('cheer', 1.4); v.say(`¡${v.names[1 - e.w]} se adelantó!`, `Punto para ${v.names[e.w]}`, 1.5); }
    },
  },

  lluvia: {
    island: { k: 0.42 },
    cam: { y: 2.0, w: 12.4, pitch: 0.14, h: 8 },
    init(v) { v.drops = new Map(); v.dir = [0, 0]; },
    make(kind) {
      if (kind === 'rock') return mesh(paintBy(ico(0.42, 0), (p) => (p.y > 0 ? '#9a8fa8' : '#6d6080')));
      return mesh(paint(loft([{ y: -0.34, r: 0.01 }, { y: 0.06, r: 0.26 }, { y: 0.2, r: 0.16 }], 6), kind === 'gold' ? '#ffd84a' : ['#37e07f', '#3fb8ff', '#ff4f9a'][Math.floor(Math.random() * 3)]), matGlow);
    },
    update(v, dt) {
      v.s.p.forEach((p, i) => {
        const h = v.heroes[i];
        h.root.position.copy(V(p.x, 0, 0));
        const go = Math.abs(p.v) > 0.8 && !p.stun;
        const pose = p.stun ? 'hurt' : go ? 'walk' : 'idle';
        if (h.pose !== pose && !(h.pose === 'cheer' && pose === 'idle')) h.set(pose);
        h.turnTo = go ? Math.sign(p.v) * 1.15 : 0;
      });
      const live = new Set();
      for (const q of v.s.drops) {
        live.add(q.id);
        let m = v.drops.get(q.id);
        if (!m) {
          m = new THREE.Group();
          m.body = VIEWS.lluvia.make(q.kind);
          if (q.kind === 'gold') m.body.scale.setScalar(1.25);
          m.mark = new THREE.Mesh(new THREE.RingGeometry(0.28, 0.38, 14).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: q.kind === 'rock' ? '#c22f4d' : '#fff6c9', transparent: true, depthWrite: false }));
          m.add(m.body, m.mark);
          v.group.add(m);
          v.drops.set(q.id, m);
        }
        m.position.copy(V(q.x, 0, 0));
        m.body.position.y = q.y; m.body.rotation.y += dt * 3; if (q.kind === 'rock') m.body.rotation.z += dt * 2;
        m.mark.position.y = 0.03; m.mark.material.opacity = 0.8 - q.y * 0.08; m.mark.scale.setScalar(0.6 + q.y * 0.1);
      }
      for (const [id, m] of v.drops) if (!live.has(id)) { v.group.remove(m); v.drops.delete(id); }
    },
    on(v, e) {
      const st = v.stage;
      if (e.t === 'catch') { const p = V(e.x, e.y, 0); sfx(e.n > 1 ? 'gem' : 'coin'); st.sparks.burst(p.x, p.y, p.z, 18, { color: e.n > 1 ? '#ffd84a' : '#7dffb0', speed: 2.4, life: 0.6, size: 0.24 }); v.float(p, `+${e.n}`, 'up'); }
      if (e.t === 'stun') { const p = V(e.x, e.y, 0); sfx('trap'); st.shake(0.3); st.smoke.burst(p.x, p.y, p.z, 14, { color: '#8c8399', speed: 2, life: 0.7, size: 0.3, g: 3 }); v.float(p, '−1', 'down'); }
      if (e.t === 'splat') { const p = V(e.x, 0.1, 0); if (e.kind === 'rock') st.smoke.burst(p.x, p.y, p.z, 8, { color: '#8c8399', speed: 1.4, flat: 0.2, up: 0.8, life: 0.5, size: 0.24 }); else st.sparks.burst(p.x, p.y, p.z, 6, { color: '#bdeaff', speed: 1.2, life: 0.4, size: 0.14 }); }
      if (e.t === 'bump') { sfx('hop'); const p = V(e.x, 0.8, 0); st.sparks.burst(p.x, p.y, p.z, 10, { color: '#ffffff', speed: 2, life: 0.4, size: 0.2 }); }
    },
  },

  fuga: {
    island: { r: 5.2, top: ['#8a7fb0', '#9b90c0'], plaza: true, tower: true },
    cam: { z: -0.7, zTall: 1.6, y: 0, w: 11.2, pitch: 0.92, h: 13.4 },
    init(v) {
      v.items = new Map();
      v.aimRing = new THREE.Mesh(new THREE.RingGeometry(CHASE.blast - 0.1, CHASE.blast, 30).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.6, depthWrite: false }));
      v.aimRing.visible = false;
      v.group.add(v.aimRing);
    },
    item(v, id, make) {
      let m = v.items.get(id);
      if (!m) { m = make(); v.group.add(m); v.items.set(id, m); }
      m.live = true;
      return m;
    },
    update(v, dt, time) {
      const s = v.s, r = v.heroes[s.runner], c = v.heroes[1 - s.runner];
      r.root.position.copy(V(s.x, 0, s.y));
      const sp = Math.hypot(s.vx, s.vy), pose = s.stun > 0.5 ? 'hurt' : sp > 0.6 ? 'walk' : 'idle';
      if (r.pose !== pose) r.set(pose);
      if (sp > 0.6) r.turnTo = Math.atan2(s.vx, s.vy); else r.turnTo = 0;
      r.root.visible = !(s.stun > 0 && s.stun < 0.8 && Math.floor(time * 12) % 2);
      c.root.visible = true;
      c.root.position.copy(V(0, 0.7, -5.7));
      c.turnTo = Math.atan2(s.x, s.y + 5.7);
      for (const m of v.items.values()) m.live = false;
      for (const q of s.stars) {
        const m = VIEWS.fuga.item(v, q.id, () => mesh(paint(star(0.36, 0.12), '#ffd84a'), matGlow));
        m.position.copy(V(q.x, 0.55 + Math.sin(time * 3 + q.id) * 0.1, q.y)); m.rotation.y = time * 2;
      }
      for (const q of s.spells) {
        const m = VIEWS.fuga.item(v, q.id, () => {
          const g = new THREE.Group(), mk = (geo, o) => { const x = new THREE.Mesh(geo.rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: COLORS[1 - s.runner], transparent: true, opacity: o, depthWrite: false })); g.add(x); return x; };
          mk(new THREE.RingGeometry(CHASE.blast - 0.09, CHASE.blast, 30), 0.95);
          g.fill = mk(new THREE.CircleGeometry(CHASE.blast - 0.1, 30), 0.5);
          return g;
        });
        m.position.copy(V(q.x, 0.05, q.y));
        m.fill.scale.setScalar(Math.max(0.01, 1 - q.t / CHASE.warn));
      }
      for (const [id, m] of v.items) if (!m.live) { v.group.remove(m); v.items.delete(id); }
      const aim = v.pads.aim;
      v.aimRing.visible = !!aim && s.phase === 'run';
      if (aim) v.aimRing.position.copy(V(aim.x, 0.04, aim.y));
      v.aimRing.material.opacity = s.cool > 0 ? 0.25 : 0.7;
    },
    on(v, e) {
      const st = v.stage;
      if (e.t === 'round') {
        const r = v.names[e.runner], c = v.names[1 - e.runner];
        v.say(`Huye ${r}, lanza ${c}`, st.mobile ? `${r}: joystick en la zona de abajo · ${c}: toca la arena` : `${r} toma el teclado · ${c} toma el mouse`, 3.2);
        for (const [, m] of v.items) v.group.remove(m);
        v.items.clear();
      }
      if (e.t === 'go') { sfx('go'); v.say('¡Corre!', '', 0.7); }
      if (e.t === 'cast') { sfx('flip'); v.heroes[e.p].set('cast', 0.5); }
      if (e.t === 'boom') {
        const p = V(e.x, 0.2, e.y), col = COLORS[1 - e.p];
        sfx(e.hit ? 'trap' : 'zap');
        st.sparks.burst(p.x, p.y, p.z, 40, { color: [col, '#ffffff'], speed: 3, up: 2, life: 0.7, size: 0.32 });
        st.smoke.burst(p.x, p.y, p.z, 10, { color: '#6a5f88', speed: 1.5, flat: 0.2, up: 0.8, life: 0.6, size: 0.4, alpha: 0.6 });
        if (e.hit) { st.shake(0.35); v.float(p, '−1', 'down'); }
      }
      if (e.t === 'catch') { const p = V(e.x, 0.6, e.y); sfx('coin'); st.sparks.burst(p.x, p.y, p.z, 20, { color: '#ffd84a', speed: 2.4, life: 0.6, size: 0.26 }); v.float(p, '+1', 'up'); }
      if (e.t === 'end') { sfx('chest'); v.say('¡Tiempo!', v.s.round === 1 ? 'Ahora cambian de papel' : '', 1.4); }
    },
  },
  ...NEW_VIEWS,
};

const place = (h, p) => h.root.position.copy(p);
const face = (h, from, to) => (h.turnTo = Math.atan2(to.x - from.x, to.z - from.z));
const arc = (a, b, k, hgt) => new THREE.Vector3().lerpVectors(a, b, k).setY(C.y + Math.sin(Math.PI * k) * hgt);
const SCENES = [
  // Empujón: el ganador llega corriendo y saca volando al otro, que queda mareado.
  async (v, W, L, s) => {
    const pl = V(-s * 0.4, 0, 0.6), pw = V(-s * 0.4 + s * 3.4, 0, 0.6), hit = V(-s * 0.4 + s * 0.75, 0, 0.6), out = V(-s * 3.6, 0, 1.4);
    place(L, pl); place(W, pw); L.set('idle'); W.set('walk'); face(W, pw, pl);
    v.look(pl, 5.5, 0.3);
    await v.run(0.7, (k) => { place(L, pl); place(W, pw); L.turnTo = Math.sin(k * 9) * 0.9; });
    sfx('whoosh');
    await v.run(0.45, (k) => { place(L, pl); place(W, new THREE.Vector3().lerpVectors(pw, hit, k * k)); });
    sfx('boing'); W.set('throw'); L.set('fly'); v.stage.shake(0.3);
    v.stage.sparks.burst(pl.x, pl.y + 1, pl.z, 30, { color: ['#ffffff', '#ffd84a'], speed: 3.5, life: 0.5, size: 0.3 });
    await v.run(0.75, (k) => { place(W, hit); place(L, arc(pl, out, k, 2.4)); L.root.rotation.y += 0.5; });
    L.set('dizzy'); L.turnTo = 0; v.dizzy(L); W.set('dance'); W.turnTo = 0;
    v.look(hit.clone().lerp(out, 0.35), 6.5, 0.6);
    await Promise.all([v.rain(W), v.run(1.9, () => { place(W, hit); place(L, out); })]);
  },
  // Lluvia de gemas: el ganador baila bajo las gemas y al otro le llueve encima su nubecita.
  async (v, W, L, s) => {
    const pw = V(s * 0.9, 0, 0.9), pl = V(-s * 1.6, 0, -0.4);
    place(W, pw); place(L, pl); W.set('cheer'); L.set('sad'); W.turnTo = 0; L.turnTo = s * 0.6;
    v.look(pw, 5.2, 0.3);
    let rain = 0;
    const cloud = () => { const p = L.root.position; v.stage.smoke.burst(p.x, p.y + 2.5, p.z, 3, { color: '#8a87a8', speed: 0.2, life: 0.6, size: 0.6, alpha: 0.7 }); v.stage.sparks.emit?.({ x: p.x + (Math.random() - 0.5) * 0.6, y: p.y + 2.3, z: p.z + (Math.random() - 0.5) * 0.6, vy: -4, life: 0.45, size: 0.1, color: '#7fd6ff' }); };
    await v.run(0.8, (k, dt) => { place(W, pw); place(L, pl); if ((rain += dt) > 0.08) { rain = 0; cloud(); } });
    W.set('dance');
    await Promise.all([v.rain(W, 18, 2), v.run(2.2, (k, dt) => { place(W, pw); place(L, pl); if ((rain += dt) > 0.08) { rain = 0; cloud(); } })]);
  },
  // Reverencia: el ganador gira como bailarín y hace una reverencia; el otro aplaude.
  async (v, W, L, s) => {
    const pw = V(s * 0.8, 0, 0.7), pl = V(-s * 1.4, 0, 0.3);
    place(W, pw); place(L, pl); W.set('cheer'); L.set('clap'); face(L, pl, pw);
    v.look(pw.clone().lerp(pl, 0.3), 6, 0.3);
    sfx('star');
    await v.run(1.1, (k) => { place(W, pw); place(L, pl); W.turnTo = k * Math.PI * 4; W.root.rotation.y = W.turnTo; if (Math.random() < 0.3) v.stage.sparks.burst(pw.x, pw.y + 1.5, pw.z, 2, { color: ['#ffd84a', COLORS[s < 0 ? 0 : 1]], speed: 2, life: 0.6, size: 0.25 }); });
    W.turnTo = 0; W.set('bow');
    await Promise.all([v.rain(W, 12, 1.5), v.run(1.8, () => { place(W, pw); place(L, pl); })]);
  },
  // Pisotón: el ganador salta muy alto, cae junto al otro y lo hace rebotar.
  async (v, W, L, s) => {
    const pw = V(s * 2.6, 0, 0.5), pl = V(-s * 0.6, 0, 0.6), land = V(s * 0.4, 0, 0.6), bump = V(-s * 1.6, 0, 1.1);
    place(W, pw); place(L, pl); W.set('cheer'); L.set('idle'); face(W, pw, pl); L.turnTo = 0;
    v.look(pl.clone().lerp(pw, 0.4), 7, 0.3);
    await v.run(0.4, () => { place(W, pw); place(L, pl); });
    sfx('whoosh'); W.set('fly');
    await v.run(0.8, (k) => { place(L, pl); place(W, arc(pw, land, k, 3.4)); });
    sfx('boing'); v.stage.shake(0.45); L.set('fly'); W.set('cheer');
    v.stage.sparks.burst(land.x, land.y + 0.1, land.z, 40, { color: ['#ffffff', COLORS[s < 0 ? 0 : 1]], speed: 4, flat: 0.1, life: 0.5, size: 0.3 });
    await v.run(0.6, (k) => { place(W, land); place(L, arc(pl, bump, k, 1.5)); });
    L.set('dizzy'); v.dizzy(L); W.set('dance'); W.turnTo = 0;
    await Promise.all([v.rain(W), v.run(1.9, () => { place(W, land); place(L, bump); })]);
  },
];

export class MiniView {
  constructor(stage, hud, heroes, names, duel, swap) {
    Object.assign(this, { stage, hud, heroes, names, id: duel.game, rules: GAMES[duel.game], view: VIEWS[duel.game] });
    this.s = this.rules.create(duel.seed);
    this.group = new THREE.Group();
    if (this.view.island) this.group.add(island(this.view.island));
    stage.scene.add(this.group);
    this.pads = new Pads(hud.root, (e) => {
      const ray = new THREE.Raycaster(), p = new THREE.Vector3();
      ray.setFromCamera(stage.ndc(e), stage.camera);
      if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -C.y), p)) return null;
      return { x: p.x - C.x, y: p.z - C.z };
    }, this.rules.input, stage.mobile, swap);
    this.hudEl = hud.miniHud(names, this.rules.name, this.s.left, swap);
    this.hudEl.classList.toggle('low', !!this.view.low);
    this.view.init(this);
    heroes.forEach((h) => { h.set('idle'); h.root.scale.setScalar(1.04); });
    this.acc = 0;
    this.upd = (dt, time) => this.update(dt, time);
    stage.updaters.push(this.upd);
    this.camera(true);
    this.update(0, 0);
  }

  camera(now) {
    const { cam, portrait, camera } = this.stage, k = this.view.cam, t = Math.tan((camera.fov * Math.PI) / 360);
    const dist = Math.max(k.w / (2 * t * camera.aspect), k.h / (2 * t)) * 1.04;
    cam.target.copy(V(0, k.y - 0.5, (portrait ? k.zTall : k.z) || 0));
    if (now) cam.pos.copy(cam.target);
    Object.assign(cam, { wYaw: 0, yaw: 0, wPitch: k.pitch, pitch: k.pitch, wDist: dist, dist });
    this.stage.focusId = (this.stage.focusId || 0) + 1;
  }

  say(text, small, secs) { this.hud.miniSay(this.hudEl, text, small, secs); }
  float(v, text, cls) { this.hud.float(this.stage.project(v), text, cls); }

  play() {
    return new Promise((res) => { this.res = res; this.running = true; });
  }

  update(dt, time) {
    if (this.running) {
      this.acc = Math.min(0.12, this.acc + dt);
      while (this.acc >= DT && !this.s.done) {
        this.acc -= DT;
        this.rules.step(this.s, this.bot ? this.bot(this.s) : this.pads.read(this.rules.input, this.s));
      }
      for (const e of this.s.events.splice(0)) this.view.on(this, e);
      this.hud.miniScore(this.hudEl, this.s.score, this.s.left, this.rules.time);
      if (this.s.done) { this.running = false; this.res(this.s.winner); }
    }
    if (!this.show) this.view.update(this, dt, time);
    this.heroes.forEach((h) => (h.ground = this.view.floor ? C.y : h.root.position.y));
    if (this.stage.w !== this.lw || this.stage.h !== this.lh) { this.lw = this.stage.w; this.lh = this.stage.h; this.camera(true); }
  }

  async countdown() {
    if (this.rules.selfStart) return;
    for (const n of ['3', '2', '1']) { sfx('tick'); this.say(n, '', 0.65); await this.stage.wait(0.7); }
    sfx('go');
    if (!this.view.quiet) this.say('¡Ya!', '', 0.6);
  }

  // Cuadro que corre dentro del bucle del escenario; tocar o pulsar una tecla lo adelanta.
  run(dur, fn) {
    return new Promise((res) => {
      let t = 0;
      const u = (dt) => {
        t = this.skip ? dur : t + dt;
        fn(Math.min(1, t / dur), dt);
        if (t >= dur) { this.stage.updaters.splice(this.stage.updaters.indexOf(u), 1); res(); }
      };
      this.stage.updaters.push(u);
    });
  }

  look(p, dist = 6, dur = 0.5) { this.stage.focus(p.clone().setY(C.y + 0.9), { dist, yaw: 0, pitch: 0.32, dur: this.skip ? 0.01 : dur }); }

  // Gemas que caen del cielo sobre quien ganó, cada una con su tintineo.
  rain(h, n = 14, dur = 1.6) {
    const geo = new THREE.OctahedronGeometry(0.17), list = [], cols = ['#2fe08a', '#ffd84a', '#ff7ac0', '#7fd6ff'];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: cols[i % 4], emissive: cols[i % 4], emissiveIntensity: 0.5, roughness: 0.3 }));
      m.d = (i / n) * dur * 0.8; m.o = new THREE.Vector3((Math.random() - 0.5) * 1.4, 0, (Math.random() - 0.5) * 1.4); m.visible = false;
      this.group.add(m); list.push(m);
    }
    return this.run(dur + 0.3, (k) => {
      const t = k * (dur + 0.3), p = h.root.position;
      for (const m of list) {
        const q = (t - m.d) / 0.45;
        if (q < 0 || m.done) continue;
        m.visible = true;
        const f = Math.min(1, q);
        m.position.set(p.x + m.o.x * (1 - f), C.y + 1.4 + (1 - f * f) * 4.5, p.z + m.o.z * (1 - f));
        m.rotation.y += 0.2;
        if (f >= 1) { m.done = true; m.visible = false; sfx('coin'); this.stage.sparks.burst(m.position.x, m.position.y, m.position.z, 6, { color: ['#ffd84a', '#ffffff'], speed: 1.6, life: 0.4, size: 0.2 }); }
      }
    }).then(() => list.forEach((m) => { this.group.remove(m); m.material.dispose(); }));
  }

  // Estrellitas que giran sobre la cabeza de quien quedó mareado.
  dizzy(h) {
    const p = h.root.position;
    this.stage.sparks.burst(p.x, p.y + 1.9, p.z, 10, { color: ['#ffd84a', '#ffffff'], speed: 0.4, life: 1.6, size: 0.24, swirl: 5, drag: 0.2 });
  }

  // Cada victoria se celebra con una escena distinta (sin repetir la anterior), de unos 3 segundos.
  async celebrate(w) {
    const { stage, heroes, names } = this;
    this.skip = false;
    this.show = true;
    const skip = () => (this.skip = true);
    window.addEventListener('pointerdown', skip); window.addEventListener('keydown', skip);
    // Con un puf de humo la arena se cambia por una isla de fiesta, igual para todos los juegos.
    this.group.children.forEach((c) => (c.visible = false));
    this.group.add(island({ r: 5.6, k: 0.62, top: ['#ffd27a', '#ffc45c'], plaza: true }));
    heroes.forEach((h) => { h.root.visible = true; h.root.scale.setScalar(1.04); h.root.rotation.x = h.root.rotation.z = 0; const p = h.root.position; stage.smoke.burst(p.x, p.y + 0.6, p.z, 14, { color: '#ffffff', speed: 1.6, life: 0.6, size: 0.5, alpha: 0.8 }); });
    const end = this.hud.winner(w < 0 ? null : names[w], w);
    sfx(w < 0 ? 'star' : 'fanfare');
    if (w < 0) {
      heroes.forEach((h, i) => { h.root.position.copy(V(i ? 1.1 : -1.1, 0, 0.6)); h.turnTo = 0; h.set('cheer'); });
      this.look(V(0, 0, 0.6), 7);
      await this.run(1.8, () => heroes.forEach((h, i) => h.root.position.copy(V(i ? 1.1 : -1.1, 0, 0.6))));
    } else {
      const W = heroes[w], L = heroes[1 - w], s = w === 0 ? -1 : 1;
      let n;
      do n = Math.floor(Math.random() * SCENES.length); while (n === MiniView.last && SCENES.length > 1);
      MiniView.last = n;
      await SCENES[n](this, W, L, s);
    }
    end();
    window.removeEventListener('pointerdown', skip); window.removeEventListener('keydown', skip);
  }

  dispose() {
    this.stage.updaters.splice(this.stage.updaters.indexOf(this.upd), 1);
    this.stage.scene.remove(this.group);
    this.group.traverse((o) => o.geometry?.dispose());
    this.pads.stop();
    this.hudEl.remove();
    this.heroes.forEach((h) => { h.root.visible = true; h.set('idle'); });
  }
}
