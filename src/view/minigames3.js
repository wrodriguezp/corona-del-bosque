import * as THREE from 'three';
import { matGlow, paint, paintBy, at, ball, box, cone, cyl, octa, mesh } from './geo.js';
import { makeDragon } from './creatures.js';
import { SLEEPY, BEAT, PAINT, STACK } from '../core/minigames/bosque.js';
import { V, COLORS } from './arena.js';
import { sfx } from '../audio.js';

const flat = (geo, color, opacity = 1) => new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide }));
const up = (p, y) => new THREE.Vector3(p.x, p.y + y, p.z);
const pose = (h, name) => { if (h.pose !== name) h.set(name); };
const SIDE = [-1, 1];
const roam = (h, p) => {
  h.root.position.copy(V(p.x, 0, p.y));
  const sp = Math.hypot(p.vx, p.vy);
  if (!['hurt', 'cheer', 'sad'].includes(h.pose)) pose(h, sp > 0.6 ? 'walk' : 'idle');
  if (sp > 0.4) h.turnTo = Math.atan2(p.vx, p.vy);
};
const TINT = ['#ff9cc5', '#8dbaff'];

// Topo, topo dorado o erizo asomando de su agujero.
function makeMole(kind) {
  const g = new THREE.Group();
  if (kind === 'hedgehog') {
    g.add(mesh([paint(at(ball(0.3, 9, 6), { s: [1, 0.9, 1], p: [0, 0.25, 0] }), '#6b4a33'), ...Array.from({ length: 14 }, (_, i) => { const a = i * 2.4, b = 0.3 + (i % 4) * 0.3; return paint(at(cone(0.06, 0.26, 4), { r: [Math.cos(a) * b, 0, Math.sin(a) * b - 0.2], p: [Math.sin(a) * 0.18, 0.4 + (i % 3) * 0.05, Math.cos(a) * 0.18 - 0.05] }), '#3a2a20'); }), paint(at(ball(0.12, 7, 5), { p: [0, 0.22, 0.26] }), '#e8c9a0'), paint(at(octa(0.05), { p: [0, 0.23, 0.38] }), '#2b2030')]));
    return g;
  }
  const fur = kind === 'gold' ? '#ffd84a' : '#8a5a3c';
  g.add(mesh([paint(at(ball(0.3, 9, 6), { s: [1, 1.15, 1], p: [0, 0.3, 0] }), fur), paint(at(ball(0.13, 7, 5), { p: [0, 0.3, 0.26] }), '#e8c9a0'), paint(at(ball(0.06, 6, 4), { p: [0, 0.34, 0.38] }), '#ff7fb2'), ...[1, -1].map((k) => paint(at(octa(0.035), { p: [k * 0.1, 0.46, 0.26] }), '#2b2030'))], kind === 'gold' ? matGlow : undefined));
  return g;
}
const STACK_H = 0.3;
const STONE = ['#d98fb0', '#8aa6d9'];
const HOLE = [[0, -1.05], [1.15, 0], [0, 1.05], [-1.15, 0]];

// Conejo pequeño: blanco, café o café con orejas blancas (para despistar).
function makeHare(white, ears) {
  const fur = white ? '#fbf7f2' : '#9a6b45', ear = white || ears ? '#fbf7f2' : '#8a5d3b';
  const g = new THREE.Group();
  g.add(mesh([
    paint(at(ball(0.24, 8, 6), { s: [0.85, 0.8, 1.15], p: [0, 0.24, 0] }), fur),
    paint(at(ball(0.16, 8, 6), { p: [0, 0.42, 0.24] }), fur),
    ...[1, -1].map((k) => paint(at(cone(0.05, 0.34, 5), { s: [1, 1, 0.5], r: [-0.25, 0, k * 0.15], p: [k * 0.07, 0.68, 0.18] }), ear)),
    paint(at(ball(0.08, 6, 4), { p: [0, 0.28, -0.27] }), '#ffffff'),
    ...[1, -1].map((k) => paint(at(octa(0.025), { p: [k * 0.08, 0.46, 0.37] }), '#2b2030')),
  ]));
  return g;
}

// Hongo de ritmo: sombrero del color de su carril.
const LANE = ['#ff6b6b', '#ffd84a', '#5fc4ff'];
const shroom = (c) => mesh([
  paintBy(at(ball(0.32, 10, 5), { s: [1, 0.62, 1] }), (p) => (p.y > 0.08 && Math.abs(Math.sin(p.x * 11) * Math.cos(p.z * 11)) > 0.6 ? '#ffffff' : c)),
  paint(at(cyl(0.12, 0.15, 0.3, 7), { p: [0, -0.18, 0] }), '#f3e6cf'),
]);

export const FOREST_VIEWS = {
  dragon: {
    island: { k: 0.62, top: ['#7fae5a', '#8bbb63'] },
    cam: { y: 1.4, w: 11.4, pitch: 0.34, h: 6.4 },
    init(v) {
      v.drake = makeDragon();
      v.drake.scale.setScalar(2.5); v.drake.rotation.y = -0.9;
      v.drake.position.copy(V(0, 0, -1.2));
      v.hoard = mesh(Array.from({ length: 14 }, (_, i) => paint(at(i % 3 ? octa(0.16) : box(0.22, 0.12, 0.16), { p: [Math.sin(i * 2.4) * (0.3 + (i % 4) * 0.14), 0.08 + (i % 5) * 0.05, Math.cos(i * 2.4) * (0.2 + (i % 4) * 0.1)] }), ['#ffd84a', '#7df9ff', '#ff7fb2', '#ffc93c'][i % 4])), matGlow);
      v.hoard.position.copy(V(0, 0, 0.6));
      v.lanes = SIDE.map((k) => { const m = flat(new THREE.PlaneGeometry(SLEEPY.goal * 0.32 + 0.4, 0.5).rotateX(-Math.PI / 2), '#5d8a3f', 0.55); m.position.copy(V(k * (4.5 - SLEEPY.goal * 0.16), 0.03, 0.9)); return m; });
      v.flags = SIDE.map((k) => { const m = mesh([paint(at(cyl(0.03, 0.03, 0.9, 5), { p: [0, 0.45, 0] }), '#7b4a2d'), paint(at(cone(0.16, 0.3, 3), { r: [0, 0, -Math.PI / 2], p: [0.14, 0.78, 0] }), '#ffd84a')]); m.position.copy(V(k * 1.4, 0, 0.9)); return m; });
      // Ojo gigante sobre el dragón: se entreabre al removerse y se abre del todo al despertar.
      v.eye = new THREE.Group();
      v.eye.white = flat(new THREE.CircleGeometry(0.5, 24), '#fff6c9');
      v.eye.white.scale.set(1.5, 1, 1);
      v.eye.pupil = flat(new THREE.CircleGeometry(0.2, 16), '#2b2030');
      v.eye.pupil.scale.set(0.6, 1.4, 1); v.eye.pupil.position.z = 0.01;
      v.eye.lid = flat(new THREE.RingGeometry(0.5, 0.58, 24), '#2c8f6c');
      v.eye.lid.scale.set(1.5, 1, 1);
      v.eye.add(v.eye.white, v.eye.pupil, v.eye.lid);
      v.eye.position.copy(V(0, 3.1, -0.6));
      v.shut = mesh(paint(at(box(1.5, 0.08, 0.02), {}), '#2c8f6c'), undefined, false);
      v.shut.position.copy(V(0, 3.1, -0.6));
      v.group.add(v.drake, v.hoard, ...v.lanes, ...v.flags, v.eye, v.shut);
      v.awake = 0; v.zzz = 0; v.x = [0, 0];
      v.heroes.forEach((h, i) => { h.turnTo = SIDE[i] * -Math.PI / 2; });
    },
    update(v, dt, time) {
      const s = v.s, want = s.eye === 'open' ? 1 : s.eye === 'stir' ? 0.32 : 0;
      v.awake += (want - v.awake) * Math.min(1, dt * (want > v.awake ? 10 : 4));
      v.drake.userData.awake = v.awake;
      v.drake.userData.breathe(time);
      v.drake.rotation.z = s.eye === 'stir' ? Math.sin(time * 26) * 0.03 : 0;
      if (s.eye === 'sleep' && !s.done && (v.zzz -= dt) < 0) {
        v.zzz = 0.7;
        const p = V(0.9, 1.4, -0.4);
        v.stage.smoke.emit({ x: p.x, y: p.y, z: p.z, vx: 0.25, vy: 0.6, vz: 0, life: 1.2, size: 0.22, color: '#e8f0ff' });
      }
      v.hoard.rotation.y = Math.sin(time * 0.6) * 0.1;
      const o = Math.min(1, v.awake);
      v.eye.visible = o > 0.08 && !s.done; v.shut.visible = !v.eye.visible && !s.done;
      v.eye.scale.set(1 + (s.eye === 'open' ? Math.sin(time * 9) * 0.04 : 0), Math.max(0.08, o), 1);
      v.eye.white.material.color.set(s.eye === 'open' ? '#ffe14a' : '#fff6c9');
      v.eye.pupil.position.x = s.eye === 'open' ? Math.sin(time * 2.3) * 0.25 : 0;
      v.shut.position.y = V(0, 3.1 + (s.eye === 'sleep' ? Math.sin(time * 1.7) * 0.05 : 0), 0).y;
      v.heroes.forEach((h, i) => {
        v.x[i] += (s.pos[i] - v.x[i]) * Math.min(1, dt * 12);
        h.root.position.copy(V(SIDE[i] * (4.5 - v.x[i] * 0.32), 0, 0.9));
        if (!s.done && h.pose !== 'hurt') pose(h, s.moving[i] ? 'walk' : 'idle');
        h.turnTo = SIDE[i] * -Math.PI / 2;
      });
    },
    on(v, e) {
      const st = v.stage;
      if (e.t === 'stir') sfx('feint');
      if (e.t === 'open') { sfx('roar'); st.shake(0.2); }
      if (e.t === 'caught') {
        const h = v.heroes[e.p], p = h.root.position, from = V(0.8, 1.3, -0.2);
        sfx('fire'); h.set('hurt', SLEEPY.stun + 0.3);
        for (let k = 0; k < 24; k++) { const q = from.clone().lerp(up(p, 0.8), k / 24); st.sparks.emit({ x: q.x, y: q.y, z: q.z, vx: 0, vy: 1, vz: 0, life: 0.35 + k * 0.015, size: 0.3, color: k % 2 ? '#ff7a2e' : '#ffd84a' }); }
        v.float(up(p, 1.8), '¡Te vio! Retrocedes', 'down');
      }
      if (e.t === 'end') {
        if (e.w >= 0 && v.s.pos[e.w] >= SLEEPY.goal) { const p = v.hoard.position; sfx('chest'); st.sparks.burst(p.x, p.y + 0.4, p.z, 50, { color: ['#ffd84a', '#7df9ff', COLORS[e.w]], speed: 3.5, life: 0.8, size: 0.28 }); v.say(`¡${v.names[e.w]} llegó al tesoro!`, '', 1.4); }
        else v.say('¡Tiempo!', e.w >= 0 ? `${v.names[e.w]} quedó más cerca` : 'Quedaron igual de cerca', 1.4);
      }
    },
  },

  conejos: {
    island: { r: 7.6, k: 0.6, top: ['#9ad468', '#8cc95c'] },
    cam: { y: 0.7, w: 14.2, pitch: 0.55, h: 8.2 },
    init(v) {
      v.heroes.forEach((h, i) => { h.root.position.copy(V(SIDE[i] * 4.6, 0, 3.0)); h.turnTo = Math.PI + SIDE[i] * -0.35; });
      v.pack = new THREE.Group();
      v.group.add(v.pack);
      v.bushes = mesh(Array.from({ length: 8 }, (_, i) => paint(at(ball(0.5 + (i % 3) * 0.12, 7, 5), { s: [1, 0.7, 1], p: [(i < 4 ? -1 : 1) * (6.2 + (i % 2) * 0.4), 0.25, -2.4 + (i % 4) * 1.15] }), i % 2 ? '#3aa568' : '#2f8f5b')));
      v.group.add(v.bushes);
      FOREST_VIEWS.conejos.build(v);
    },
    build(v) {
      v.pack.clear();
      v.hares = v.s.hares.map((h) => { const m = makeHare(h.white, h.ears); m.scale.setScalar(1.35); m.visible = false; v.pack.add(m); return m; });
    },
    update(v, dt, time) {
      const s = v.s;
      if (v.round !== s.round) { v.round = s.round; FOREST_VIEWS.conejos.build(v); }
      s.hares.forEach((h, k) => {
        const m = v.hares[k], q = s.clock - h.t, x = -h.dir * 7 + h.dir * h.speed * q;
        m.visible = s.phase === 'run' && q >= 0 && Math.abs(x) < 7.2;
        if (!m.visible) return;
        m.position.copy(V(x, Math.abs(Math.sin(q * 9 + h.hop)) * 0.35, -2.2 + h.lane * 0.9));
        m.rotation.y = h.dir * Math.PI / 2;
      });
      v.heroes.forEach((h) => { if (h.pose === 'walk') h.set('idle'); });
    },
    on(v, e) {
      if (e.t === 'round') { v.heroes.forEach((h) => h.set('idle')); v.say(`Ronda ${e.n}`, 'Cuenta solo los conejos blancos', 1.4); }
      if (e.t === 'tap') {
        // Cada toque se nota: «+1» flotando, chispas de su color y un tono propio de cada quien.
        const h = v.heroes[e.p], p = h.root.position;
        sfx('note', e.p ? 7 : 0); h.set('throw', 0.25);
        v.stage.sparks.burst(p.x, p.y + 1.9, p.z, 12, { color: [COLORS[e.p], '#ffffff'], speed: 1.8, life: 0.4, size: 0.22 });
        v.float(up(p, 2.1), '+1', `up p${e.p}`);
      }
      if (e.t === 'reveal') {
        sfx('chest');
        v.say(`Eran ${e.truth} conejos blancos`, `${v.names[0]} contó ${e.count[0]} · ${v.names[1]} contó ${e.count[1]}`, 3);
        v.heroes.forEach((h, i) => {
          h.set(e.gain[i] ? 'cheer' : 'sad', 2.4);
          v.float(up(h.root.position, 2), e.count[i] === e.truth ? `¡${e.count[i]}, justo! +2` : `${e.count[i]}${e.gain[i] ? ' +1' : ''}`, e.gain[i] ? 'up' : 'down');
        });
      }
    },
  },

  pesca: {
    island: { r: 6, k: 0.66, top: ['#86c95a', '#92d466'] },
    cam: { y: 0.6, w: 10.6, pitch: 0.5, h: 6.4 },
    init(v) {
      v.pond = mesh([paintBy(at(new THREE.CircleGeometry(3, 28).rotateX(-Math.PI / 2), { s: [1, 1, 0.62] }), (p) => (Math.hypot(p.x, p.z / 0.62) > 2.7 ? '#bfe9ff' : '#3f8fd0'))], undefined, false);
      v.pond.position.copy(V(0, 0.02, -0.3));
      v.reeds = mesh(Array.from({ length: 10 }, (_, i) => paint(at(cyl(0.025, 0.03, 0.8 + (i % 3) * 0.2, 4), { r: [0.1 * Math.sin(i), 0, 0.1 * Math.cos(i)], p: [Math.sin(i * 0.62 + 2.4) * 2.9, 0.4, -0.3 - Math.abs(Math.cos(i * 0.62 + 2.4)) * 1.9] }), '#4f8f3a')));
      v.group.add(v.pond, v.reeds);
      v.heroes.forEach((h, i) => { h.root.position.copy(V(SIDE[i] * 3.6, 0, 0.5)); h.turnTo = SIDE[i] * -Math.PI / 2 + SIDE[i] * 0.3; });
      v.cork = SIDE.map((k) => { const g = new THREE.Group(); g.add(mesh([paint(at(ball(0.13, 8, 4), { s: [1, 0.8, 1], p: [0, 0.03, 0] }), '#ffffff'), paint(at(ball(0.13, 8, 4), { s: [1, 0.8, 1], r: [Math.PI, 0, 0], p: [0, -0.03, 0] }), '#ff4d4d'), paint(at(cyl(0.015, 0.015, 0.2, 4), { p: [0, 0.16, 0] }), '#ffd84a')])); g.position.copy(V(k * 1.3, 0.05, -0.1)); return g; });
      v.lines = SIDE.map(() => new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: '#f5f0e0' })));
      v.rods = SIDE.map(() => mesh(paint(at(cyl(0.025, 0.035, 1.5, 5), { p: [0, 0.75, 0] }), '#8a5a33')));
      v.group.add(...v.cork, ...v.lines, ...v.rods);
      v.dip = [0, 0]; v.kick = [0, 0]; v.rip = []; v.fish = [];
    },
    ripple(v, p, big) {
      const m = flat(new THREE.RingGeometry(0.16, 0.22, 24).rotateX(-Math.PI / 2), '#ffffff', 0.9);
      m.position.set(p.x, V(0, 0.04, 0).y, p.z);
      m.life = big ? 1 : 0.6; m.big = big;
      v.group.add(m); v.rip.push(m);
    },
    update(v, dt, time) {
      const s = v.s;
      s.p.forEach((p, i) => {
        v.kick[i] = Math.max(0, v.kick[i] - dt * 5);
        const want = p.state === 'bite' ? -0.24 : p.state === 'wait' ? -v.kick[i] * 0.09 : 0.12;
        v.dip[i] += (want - v.dip[i]) * Math.min(1, dt * (p.state === 'bite' ? 25 : 10));
        const c = v.cork[i];
        c.visible = p.state === 'wait' || p.state === 'bite';
        c.position.y = V(0, 0.05 + v.dip[i] + Math.sin(time * 2.2 + i) * 0.02, 0).y;
        c.rotation.z = Math.sin(time * 1.7 + i * 2) * 0.12 + v.kick[i] * 0.3;
        const h = v.heroes[i], r = v.rods[i];
        r.position.copy(up(h.root.position, 0.9)).add(new THREE.Vector3(SIDE[i] * -0.25, 0, 0.1));
        r.rotation.z = SIDE[i] * (0.9 + (p.state === 'bite' ? 0.18 : 0) - (v.reel?.[i] > 0 ? 0.6 : 0));
        const tip = new THREE.Vector3(0, 1.5, 0).applyEuler(r.rotation).add(r.position);
        v.lines[i].geometry.setFromPoints([tip, c.visible ? c.position : tip.clone().add(new THREE.Vector3(0, -0.5, 0))]);
        if (!s.done && !['cheer', 'sad', 'hurt'].includes(h.pose)) pose(h, 'idle');
      });
      if (v.reel) v.reel = v.reel.map((k) => Math.max(0, k - dt));
      v.rip = v.rip.filter((m) => { m.life -= dt; const k = 1 - m.life / (m.big ? 1 : 0.6); m.scale.setScalar(1 + k * (m.big ? 6 : 3)); m.material.opacity = Math.max(0, m.life); if (m.life > 0) return true; v.group.remove(m); return false; });
      v.fish = v.fish.filter((f) => { f.t += dt; const k = Math.min(1, f.t / 0.7); f.m.position.lerpVectors(f.a, f.b, k).setY(f.a.y + Math.sin(Math.PI * k) * 2.2); f.m.rotation.z += dt * 14; if (k < 1) return true; v.group.remove(f.m); return false; });
    },
    on(v, e) {
      const st = v.stage, view = FOREST_VIEWS.pesca;
      if (e.t === 'nibble') { v.kick[e.p] = 1; view.ripple(v, v.cork[e.p].position, false); }
      if (e.t === 'bite') { sfx('splash'); view.ripple(v, v.cork[e.p].position, true); const c = v.cork[e.p].position; st.sparks.burst(c.x, c.y + 0.1, c.z, 12, { color: '#d9f2ff', speed: 1.6, up: 1.5, life: 0.45, size: 0.16 }); }
      if (e.t === 'catch') {
        const h = v.heroes[e.p], c = v.cork[e.p].position.clone();
        sfx(e.big ? 'gem' : 'coin'); h.set('cheer', 1); (v.reel ||= [0, 0])[e.p] = 0.4;
        const m = mesh([paint(at(octa(e.big ? 0.32 : 0.22), { s: [1.6, 0.8, 0.5] }), e.big ? '#ffd84a' : '#ff9d3c'), paint(at(cone(0.16, 0.24, 3), { r: [0, 0, Math.PI / 2], p: [-(e.big ? 0.55 : 0.4), 0, 0] }), e.big ? '#ffb13d' : '#ff7a2e')], e.big ? matGlow : undefined);
        v.group.add(m); v.fish.push({ m, t: 0, a: c, b: up(h.root.position, 1.4) });
        view.ripple(v, c, true);
        v.float(up(h.root.position, 2.1), e.big ? '¡Pez dorado! +2' : '+1', 'up');
      }
      if (e.t === 'scare') { const h = v.heroes[e.p]; sfx('feint'); h.set('sad', 1); view.ripple(v, v.cork[e.p].position, false); v.float(up(h.root.position, 2), '¡Se espantó!', 'down'); }
      if (e.t === 'gone') { const h = v.heroes[e.p]; sfx('foul'); h.set('sad', 0.8); v.float(up(h.root.position, 2), 'Se escapó', 'down'); }
      if (e.t === 'cast') { sfx('flip'); view.ripple(v, v.cork[e.p].position, false); }
    },
  },

  hongos: {
    island: { k: 0.5, top: ['#8a6fb0', '#977cbd'] },
    cam: { y: 2.1, w: 10.8, pitch: 0.12, h: 6.6 },
    init(v) {
      v.heroes.forEach((h, i) => { h.root.position.copy(V(SIDE[i] * 0.95, 0, 1.4)); h.turnTo = SIDE[i] * -0.4; });
      const x = (i, l) => SIDE[i] * 3.0 + (l - 1) * 1.05;
      v.x = x;
      v.targets = [0, 1].map((i) => [0, 1, 2].map((l) => {
        const g = new THREE.Group();
        g.ring = flat(new THREE.RingGeometry(0.36, 0.46, 28), LANE[l], 0.9);
        g.arrow = flat(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0.2), new THREE.Vector2(0.18, -0.12), new THREE.Vector2(-0.18, -0.12)])), LANE[l], 0.7);
        g.arrow.rotation.z = [Math.PI / 2, 0, -Math.PI / 2][l];
        g.add(g.ring, g.arrow);
        g.position.copy(V(x(i, l), 0.95, 0.1)); g.glow = 0; g.bad = 0;
        v.group.add(g);
        return g;
      }));
      v.tracks = mesh([0, 1].flatMap((i) => [0, 1, 2].map((l) => paint(at(box(0.05, 4.2, 0.02), { p: [x(i, l), 3.0, -0.05] }), '#d9c8f0'))), undefined, false);
      v.group.add(v.tracks);
      v.caps = v.s.notes.map((n) => [0, 1].map(() => { const m = shroom(LANE[n.lane]); m.visible = false; v.group.add(m); return m; }));
    },
    update(v, dt, time) {
      const s = v.s;
      s.notes.forEach((n, k) => [0, 1].forEach((i) => {
        const m = v.caps[k][i], q = (n.t - s.t) / BEAT.lead;
        m.visible = !n.hit[i] && q < 1 && q > -0.18 && !s.done;
        if (!m.visible) return;
        m.position.copy(V(v.x(i, n.lane), 0.95 + q * 4, 0.15));
        m.rotation.y = time * 2 + k;
        m.scale.setScalar(q < 0 ? Math.max(0.2, 1 + q * 4) : 1);
      }));
      v.targets.forEach((row) => row.forEach((g, l) => {
        g.glow = Math.max(0, g.glow - dt * 3); g.bad = Math.max(0, g.bad - dt * 3);
        g.scale.setScalar(1 + g.glow * 0.35);
        g.ring.material.color.set(g.bad > 0 ? '#ff2d2d' : LANE[l]).lerp(new THREE.Color('#ffffff'), g.glow);
      }));
      v.heroes.forEach((h) => { if (!s.done && !['cheer', 'hurt'].includes(h.pose)) pose(h, s.t > 1.6 ? 'dance' : 'idle'); });
    },
    on(v, e) {
      const st = v.stage;
      if (e.t === 'hit') {
        const g = v.targets[e.p][e.lane], p = g.position;
        g.glow = 1; sfx('note', e.pitch);
        st.sparks.burst(p.x, p.y, p.z + 0.2, e.n > 1 ? 18 : 8, { color: [LANE[e.lane], '#ffffff'], speed: 2.2, life: 0.45, size: 0.2 });
        v.float(up(p, 0.6), e.n > 1 ? '¡Perfecto!' : '+1', 'up');
      }
      if (e.t === 'near') { const g = v.targets[e.p][e.lane]; g.glow = 0.4; sfx('tick'); v.float(up(g.position, 0.6), e.early ? '¡Antes!' : '¡Tarde!', 'down'); }
      if (e.t === 'miss') { if (e.lane >= 0) { const g = v.targets[e.p][e.lane]; g.bad = 1; v.float(up(g.position, 0.6), '−1', 'down'); } sfx('feint'); }
    },
  },

  pinta: {
    island: { r: 6.6, k: 0.72, top: ['#6faa4c', '#79b455'] },
    cam: { y: 0.1, w: 11.2, pitch: 0.86, h: 8.6 },
    init(v) {
      const n = PAINT.cols * PAINT.rows, q = PAINT.size;
      v.tiles = new THREE.InstancedMesh(new THREE.BoxGeometry(q * 0.94, 0.06, q * 0.94), new THREE.MeshStandardMaterial({ flatShading: true, roughness: 0.8 }), n);
      v.tiles.receiveShadow = true;
      const m = new THREE.Matrix4();
      for (let k = 0; k < n; k++) {
        const c = k % PAINT.cols, r = Math.floor(k / PAINT.cols);
        m.setPosition(V((c - PAINT.cols / 2 + 0.5) * q, 0.03, (r - PAINT.rows / 2 + 0.5) * q));
        v.tiles.setMatrixAt(k, m);
        v.tiles.setColorAt(k, new THREE.Color((c + r) % 2 ? '#b7e08a' : '#a8d47b'));
      }
      v.owner = new Array(n).fill(-1); v.pop = new Array(n).fill(0);
      v.flower = mesh([...Array.from({ length: 6 }, (_, i) => paint(at(ball(0.16, 7, 4), { s: [1, 0.35, 1.6], p: [Math.sin(i * 1.047) * 0.2, 0.5, Math.cos(i * 1.047) * 0.2] }), '#ffd84a')), paint(at(ball(0.12, 7, 5), { p: [0, 0.52, 0] }), '#ff7fb2'), paint(at(cyl(0.03, 0.04, 0.5, 5), { p: [0, 0.25, 0] }), '#3f9a4b')], matGlow);
      v.flower.visible = false;
      v.group.add(v.tiles, v.flower);
    },
    update(v, dt, time) {
      const s = v.s, m = new THREE.Matrix4(), q = PAINT.size;
      let dirty = false;
      s.tiles.forEach((o, k) => {
        if (v.owner[k] !== o) { v.owner[k] = o; v.pop[k] = 1; v.tiles.setColorAt(k, new THREE.Color(TINT[o])); dirty = true; }
        if (v.pop[k] > 0) {
          v.pop[k] = Math.max(0, v.pop[k] - dt * 4);
          const c = k % PAINT.cols, r = Math.floor(k / PAINT.cols);
          m.makeScale(1, 1 + v.pop[k] * 3, 1).setPosition(V((c - PAINT.cols / 2 + 0.5) * q, 0.03 + v.pop[k] * 0.08, (r - PAINT.rows / 2 + 0.5) * q));
          v.tiles.setMatrixAt(k, m); v.tiles.instanceMatrix.needsUpdate = true;
        }
      });
      if (dirty) v.tiles.instanceColor.needsUpdate = true;
      s.p.forEach((p, i) => roam(v.heroes[i], p));
      if (s.flower) { v.flower.visible = true; v.flower.position.copy(V(s.flower.x, Math.sin(time * 4) * 0.06, s.flower.y)); v.flower.rotation.y = time * 2; } else v.flower.visible = false;
    },
    on(v, e) {
      const st = v.stage;
      if (e.t === 'flower') { sfx('star'); const p = V(e.x, 0.5, e.y); st.sparks.burst(p.x, p.y, p.z, 20, { color: ['#ffd84a', '#ffffff'], speed: 2, life: 0.6, size: 0.22 }); }
      if (e.t === 'bloom') { sfx('gem'); const p = V(e.x, 0.3, e.y); st.sparks.burst(p.x, p.y, p.z, 50, { color: [COLORS[e.p], '#ffd84a', '#ffffff'], speed: 3.6, flat: 0.3, life: 0.7, size: 0.28 }); v.heroes[e.p].set('cheer', 0.8); v.float(up(p, 1.6), '¡Flor mágica!', 'up'); }
    },
  },

  topos: {
    island: { r: 6.8, k: 0.62, top: ['#86c95a', '#92d466'] },
    cam: { y: 0.3, w: 12.4, pitch: 0.72, h: 7 },
    init(v) {
      v.heroes.forEach((h, i) => { h.root.position.copy(V(SIDE[i] * 5.3, 0, 0.3)); h.turnTo = SIDE[i] * -Math.PI / 2; });
      const cx = (i) => SIDE[i] * 2.55;
      v.hole = (i, d) => V(cx(i) + HOLE[d][0], 0, 0.2 + HOLE[d][1]);
      v.dirt = mesh([0, 1].flatMap((i) => [0, 1, 2, 3].map((d) => { const p = v.hole(i, d).sub(V(0, 0, 0)); return paint(at(cyl(0.42, 0.48, 0.08, 10), { s: [1, 1, 0.8], p: [p.x, 0.04, p.z] }), '#5a3d2b'); })));
      v.dirt.position.copy(V(0, 0, 0));
      v.arrows = [0, 1].flatMap((i) => [0, 1, 2, 3].map((d) => {
        const a = flat(new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(0, 0.17), new THREE.Vector2(0.15, -0.1), new THREE.Vector2(-0.15, -0.1)])).rotateX(-Math.PI / 2), '#ffffff', 0.75);
        a.rotation.y = -d * Math.PI / 2;
        const p = v.hole(i, d), k = 0.62;
        a.position.set(p.x + HOLE[d][0] * k * 0.8, p.y + 0.05, p.z + HOLE[d][1] * k);
        return a;
      }));
      v.moles = [0, 1].map((i) => [0, 1, 2, 3].map((d) => ({ g: null, kind: null, y: 0, bonk: 0, d })));
      v.group.add(v.dirt, ...v.arrows);
    },
    update(v, dt, time) {
      const s = v.s;
      v.moles.forEach((row, i) => row.forEach((m) => {
        const q = s.pops.find((q) => q.hole === m.d && s.t >= q.t && s.t < q.t + q.dur);
        if (q && m.kind !== q.kind) { if (m.g) v.group.remove(m.g); m.g = makeMole(q.kind); m.g.scale.setScalar(1.3); m.kind = q.kind; m.g.position.copy(v.hole(i, m.d)); v.group.add(m.g); }
        const want = q && !q.hit[i] ? 1 : 0;
        m.y += (want - m.y) * Math.min(1, dt * (want ? 16 : 10));
        m.bonk = Math.max(0, m.bonk - dt * 4);
        if (m.g) { m.g.visible = m.y > 0.02; m.g.position.y = v.hole(i, m.d).y - 0.55 + m.y * 0.55; m.g.scale.set(1.3 + m.bonk * 0.4, 1.3 - m.bonk * 0.6, 1.3 + m.bonk * 0.4); m.g.rotation.y = Math.sin(time * 3 + m.d) * 0.3; }
        if (!q && m.y < 0.02) m.kind = null;
      }));
    },
    on(v, e) {
      const st = v.stage, h = v.heroes[e.p];
      if (e.t === 'bonk') { const p = v.hole(e.p, e.hole); v.moles[e.p][e.hole].bonk = 1; sfx(e.n > 1 ? 'gem' : 'hop', e.hole); h.set('throw', 0.25); st.sparks.burst(p.x, p.y + 0.4, p.z, e.n > 1 ? 24 : 10, { color: e.n > 1 ? ['#ffd84a', '#ffffff'] : ['#ffffff', COLORS[e.p]], speed: 2.4, life: 0.45, size: 0.22 }); v.float(up(p, 0.9), `+${e.n}`, 'up'); }
      if (e.t === 'ouch') { const p = v.hole(e.p, e.hole); sfx('foul'); h.set('hurt', 0.6); v.float(up(p, 0.9), '¡Erizo! −1', 'down'); }
      if (e.t === 'empty') { const p = v.hole(e.p, e.hole); sfx('feint'); st.smoke.burst(p.x, p.y + 0.1, p.z, 6, { color: '#a58260', speed: 1, life: 0.4, size: 0.2 }); v.float(up(p, 0.7), '−1', 'down'); }
    },
  },

  torre: {
    island: { k: 0.55, top: ['#9aa7c9', '#a9b5d4'] },
    cam: { y: 2.2, w: 10.4, pitch: 0.14, h: 7.4 },
    init(v) {
      v.base = SIDE.map((k) => k * 2.4);
      v.heroes.forEach((h, i) => { h.root.position.copy(V(SIDE[i] * 4.4, 0, 0.6)); h.turnTo = SIDE[i] * -Math.PI / 2 + SIDE[i] * 0.4; });
      const plinth = mesh(SIDE.map((k) => paint(at(cyl(1.25, 1.4, 0.3, 8), { p: [k * 2.4, 0.15, 0] }), '#6d6295')));
      plinth.position.copy(V(0, 0, 0));
      v.group.add(plinth);
      v.stones = [[], []]; v.fall = []; v.ty = 0;
      v.hang = [0, 1].map((i) => { const m = new THREE.Mesh(new THREE.BoxGeometry(1, STACK_H, 0.9), new THREE.MeshStandardMaterial({ color: STONE[i], flatShading: true, roughness: 0.7 })); m.castShadow = true; v.group.add(m); return m; });
    },
    top(v, i) { return 0.3 + v.s.p[i].level * STACK_H; },
    update(v, dt, time) {
      const s = v.s, view = FOREST_VIEWS.torre;
      s.p.forEach((p, i) => {
        const m = v.hang[i];
        m.visible = p.wait <= 0 && !s.done;
        m.scale.x = p.w;
        m.position.copy(V(v.base[i] + view.x(s, p), view.top(v, i) + STACK_H / 2 + 0.75, 0));
        if (!s.done && !['cheer', 'hurt', 'sad'].includes(v.heroes[i].pose)) pose(v.heroes[i], 'cast');
      });
      v.fall = v.fall.filter((f) => { f.vy -= 14 * dt; f.m.position.y += f.vy * dt; f.m.position.x += f.vx * dt; f.m.rotation.z += f.vr * dt; if (f.m.position.y > V(0, -4, 0).y) return true; v.group.remove(f.m); return false; });
      // La cámara sube con la torre más alta.
      const hi = Math.max(view.top(v, 0), view.top(v, 1));
      v.ty += (Math.max(0, hi - 3.2) - v.ty) * Math.min(1, dt * 3);
      v.stage.cam.target.y = V(0, 2.2 - 0.5 + v.ty, 0).y;
      v.stage.cam.pos.y += (v.stage.cam.target.y - v.stage.cam.pos.y) * Math.min(1, dt * 3);
    },
    x(s, p) { return p.cx + Math.sin(p.ph) * STACK.amp * s.dir; },
    piece(v, i, x, w, y, color) {
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, STACK_H, 0.9), new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 0.7 }));
      m.castShadow = m.receiveShadow = true;
      m.position.copy(V(v.base[i] + x, y, 0));
      v.group.add(m);
      return m;
    },
    on(v, e) {
      const st = v.stage, view = FOREST_VIEWS.torre, h = v.heroes[e.p];
      if (e.t === 'stack') {
        const y = 0.3 + e.level * STACK_H + STACK_H / 2, color = new THREE.Color(STONE[e.p]).offsetHSL(0, 0, (e.level % 3) * 0.05).getStyle();
        v.stones[e.p].push(view.piece(v, e.p, e.cx, e.w, y, color));
        if (e.cut > 0.01) { const cx = e.cx + e.side * (e.w / 2 + e.cut / 2), m = view.piece(v, e.p, cx, e.cut, y, color); v.fall.push({ m, vy: 1, vx: e.side * 1.5, vr: -e.side * 3 }); }
        const p = V(v.base[e.p] + e.cx, y, 0);
        sfx(e.perfect ? 'star' : 'hop', e.level);
        st.smoke.burst(p.x, p.y - 0.1, p.z + 0.4, 6, { color: '#d9d2ea', speed: 1, flat: 0.2, life: 0.4, size: 0.2 });
        if (e.perfect) { st.sparks.burst(p.x, p.y, p.z, 24, { color: ['#ffd84a', '#ffffff'], speed: 2.4, life: 0.5, size: 0.22 }); v.float(up(p, 0.5), '¡Justo al centro!', 'up'); h.set('cheer', 0.6); }
      }
      if (e.t === 'drop') { const m = view.piece(v, e.p, e.x, v.s.p[e.p].w, view.top(v, e.p) + 0.9, STONE[e.p]); v.fall.push({ m, vy: 0, vx: 0, vr: 2 }); sfx('foul'); h.set('sad', 0.8); v.float(up(h.root.position, 1.9), '¡Se cayó!', 'down'); }
    },
  },
};
