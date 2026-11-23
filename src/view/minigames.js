import * as THREE from 'three';
import { mat, matGlow, matMetal, paint, paintBy, at, loft, ico, octa, box, cone, cyl, ringGeo, star, mesh } from './geo.js';
import { GAMES, RAIN, CHASE, DT } from '../core/minigames/index.js';
import { Pads } from './pads.js';
import { ease } from './stage.js';
import { sfx } from '../audio.js';

const C = new THREE.Vector3(24, 1.1, 0); // centro de la isla de minijuegos
const COLORS = ['#ff5c9e', '#4b8df7'];
const FEINT = ['#b14be0', '#ff5d4a', '#3fb8ff'];

const V = (x, y, z) => new THREE.Vector3(C.x + x, C.y + y, C.z + z);

function island(kind) {
  const g = new THREE.Group(), r = kind === 'fuga' ? 5.2 : 7, k = kind === 'lluvia' ? 0.42 : kind === 'duelo' ? 0.6 : 1;
  const top = kind === 'fuga' ? ['#8a7fb0', '#9b90c0'] : kind === 'duelo' ? ['#5fb98a', '#6fc997'] : ['#8fd45c', '#83c952'];
  g.add(mesh(paintBy(at(loft([{ y: -2.6, r: r * 0.5, wave: [5, 0.1] }, { y: -1.1, r: r * 0.85, wave: [6, 0.07] }, { y: -0.16, r: r * 1.02, wave: [9, 0.02] }, { y: 0, r, wave: [9, 0.015] }, { y: 0.004, r: r * 0.78 }, { y: 0.008, r: r * 0.55, wave: [5, 0.06] }, { y: 0.012, r: r * 0.3 }], 26), { s: [1, 1, k] }), (v) => (v.y > -0.1 ? top[Math.abs(Math.floor(v.x * 2.3) + Math.floor(v.z * 3.1)) % 2] : v.y > -0.5 ? '#b58a66' : '#7b5a57'))));
  if (kind === 'fuga') {
    g.add(mesh([paint(at(ringGeo(CHASE.r + 0.35, 0.08, 40, 4), { r: [Math.PI / 2, 0, 0], p: [0, 0.04, 0] }), '#ffc93c'), ...Array.from({ length: 6 }, (_, i) => paint(at(star(0.28, 0.03), { r: [-Math.PI / 2, 0, 0], p: [Math.sin(i * 1.047) * 2.6, 0.03, Math.cos(i * 1.047) * 2.6] }), '#b9aee0')), paint(at(ringGeo(2.6, 0.03, 36, 4), { r: [Math.PI / 2, 0, 0], p: [0, 0.025, 0] }), '#b9aee0')]));
    g.add(mesh(paintBy(at(loft([{ y: -0.1, r: 0.9 }, { y: 0.5, r: 0.75 }, { y: 0.62, r: 0.85 }, { y: 0.7, r: 0.8 }], 8), { p: [0, 0, -5.7] }), (v) => (v.y > 0.55 ? '#efe6ff' : '#a397c9'))));
  }
  const deco = [];
  for (let i = 0; i < 18; i++) {
    const a = i * 2.399, q = r * (0.86 + (i % 3) * 0.04), x = Math.sin(a) * q, z = Math.cos(a) * q * k;
    if (kind === 'fuga' || z > 0.6) { deco.push(paintBy(at(ico(0.16 + (i % 3) * 0.05), { p: [x, 0.06, z] }), (v) => (v.y > 0.1 ? '#c9c0d6' : '#8c8399'))); continue; }
    if (i % 2) deco.push(paint(at(cyl(0.07, 0.1, 0.5, 6), { p: [x, 0.25, z] }), '#7b4a2d'), ...[[0.45, 0.6], [0.8, 0.48], [1.1, 0.34]].map(([y, w]) => paint(at(cone(w * 0.75, 0.6, 7), { p: [x, y + 0.2, z] }), i % 4 === 1 ? '#3aa568' : '#2f8f5b')));
    else deco.push(paint(at(octa(0.09), { p: [x, 0.16, z] }), ['#ff7fb2', '#ffd84a', '#9d8cff'][i % 3]), paint(at(cyl(0.012, 0.015, 0.16, 4), { p: [x, 0.08, z] }), '#3f9a4b'));
  }
  g.add(mesh(deco));
  g.position.copy(C);
  return g;
}

/* ---------- Vista de cada minijuego ---------- */
const VIEWS = {
  duelo: {
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
    cam: { y: 0, w: 11.2, pitch: 0.92, h: 13.4 },
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
        v.say(`Huye ${r}, lanza ${c}`, st.mobile ? `${r}: desliza abajo · ${c}: toca la arena` : `${r} toma el teclado · ${c} toma el mouse`, 3.2);
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
};

export class MiniView {
  constructor(stage, hud, heroes, names, duel) {
    Object.assign(this, { stage, hud, heroes, names, id: duel.game, rules: GAMES[duel.game], view: VIEWS[duel.game] });
    this.s = this.rules.create(duel.seed);
    this.group = new THREE.Group();
    this.group.add(island(this.id));
    stage.scene.add(this.group);
    this.pads = new Pads(hud.root, (e) => {
      const ray = new THREE.Raycaster(), p = new THREE.Vector3();
      ray.setFromCamera(stage.ndc(e), stage.camera);
      if (!ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0, 1, 0), -C.y), p)) return null;
      return { x: p.x - C.x, y: p.z - C.z };
    });
    this.hudEl = hud.miniHud(names, this.rules.name, this.s.left);
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
    cam.target.copy(V(0, k.y - 0.5, this.id !== 'fuga' ? 0 : portrait ? 1.6 : -0.7));
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
      this.hud.miniScore(this.hudEl, this.s.score, this.s.left, this.id === 'lluvia' ? RAIN.time : CHASE.time);
      if (this.s.done) { this.running = false; this.res(this.s.winner); }
    }
    this.view.update(this, dt, time);
    this.heroes.forEach((h) => (h.ground = h.root.position.y));
    if (this.stage.w !== this.lw || this.stage.h !== this.lh) { this.lw = this.stage.w; this.lh = this.stage.h; this.camera(true); }
  }

  async countdown() {
    if (this.id === 'fuga') return;
    for (const n of ['3', '2', '1']) { sfx('tick'); this.say(n, '', 0.65); await this.stage.wait(0.7); }
    sfx('go');
    if (this.id !== 'duelo') this.say('¡Ya!', '', 0.6);
  }

  async celebrate(w) {
    this.heroes.forEach((h, i) => { h.root.visible = true; h.turnTo = 0; h.set(w < 0 ? 'cheer' : i === w ? 'cheer' : 'sad'); });
    this.say(w < 0 ? '¡Empate!' : `¡Gana ${this.names[w]}!`, '', 2);
    sfx(w < 0 ? 'star' : 'fanfare');
    if (w >= 0) { const p = this.heroes[w].root.position; for (let k = 0; k < 3; k++) { this.stage.sparks.burst(p.x, p.y + 1.6, p.z, 50, { color: ['#ffd84a', COLORS[w], '#ffffff'], speed: 4, g: 3, life: 1.2, size: 0.3 }); await this.stage.wait(0.5); } }
    else await this.stage.wait(1.4);
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
