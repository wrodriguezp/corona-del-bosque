import { DT, base, clamp, emit, finish, noPad } from './kit.js';
import { tira, runas, salto, choque, huevo, burbuja } from './nuevos.js';

export { DT, noPad };

/* ---------- Duelo de hechizos: reflejos, al mejor de tres ---------- */
const duelo = {
  name: 'Duelo de hechizos', icon: 'bolt', input: 'button',
  goal: 'Espera la estrella dorada y lanza tu hechizo antes que tu rival. Si te adelantas, la ronda es para tu rival. Gana quien llegue a dos rondas.',
  create(seed) {
    const s = { ...base(seed), phase: 'wait', round: 1, clock: 0, idle: 0 };
    duelo.arm(s);
    return s;
  },
  arm(s) {
    s.phase = 'wait'; s.clock = 0;
    s.signal = 1.8 + s.rng.next() * 3.2;
    s.feints = [];
    for (let t = 0.9 + s.rng.next() * 0.8; t < s.signal - 0.75; t += 0.8 + s.rng.next()) if (s.rng.chance(0.6)) s.feints.push({ t, c: s.rng.int(0, 2) });
    emit(s, 'round', { n: s.round });
  },
  win(s, w, foul) {
    s.score[w]++;
    s.phase = 'result'; s.clock = 0; s.last = w;
    emit(s, foul ? 'foul' : 'hit', { w });
  },
  step(s, pads) {
    s.t += DT; s.clock += DT;
    if (s.phase === 'result') {
      if (s.clock < 1.9) return;
      if (s.score[0] === 2 || s.score[1] === 2) return finish(s);
      s.round++;
      return duelo.arm(s);
    }
    const a = [pads[0].a, pads[1].a];
    if (s.phase === 'wait') {
      for (const f of s.feints) if (!f.done && s.clock >= f.t) { f.done = true; emit(s, 'feint', { c: f.c }); }
      if (s.clock >= 0.4 && (a[0] || a[1])) {
        if (a[0] && a[1]) { emit(s, 'both'); return duelo.arm(s); }
        return duelo.win(s, a[0] ? 1 : 0, true);
      }
      if (s.clock >= s.signal) { s.phase = 'signal'; s.clock = 0; emit(s, 'signal'); }
      return;
    }
    if (a[0] || a[1]) {
      s.react = s.clock;
      return duelo.win(s, a[0] && a[1] ? s.rng.int(0, 1) : a[0] ? 0 : 1, false);
    }
    if (s.clock > 3) { if (++s.idle > 3) return finish(s); duelo.arm(s); }
  },
};

/* ---------- Lluvia de gemas: veinte segundos en la misma isla ---------- */
export const RAIN = { w: 5, r: 0.5, time: 20, speed: 6.4 };
const lluvia = {
  name: 'Lluvia de gemas', icon: 'gem', input: 'move', time: RAIN.time,
  goal: 'Atrapa las gemas que caen: las normales valen 1 punto y las doradas 3. Las rocas te aturden y te quitan 1. Puedes empujar a tu rival.',
  create(seed) {
    return { ...base(seed), left: RAIN.time, p: [{ x: -2.5, v: 0, stun: 0 }, { x: 2.5, v: 0, stun: 0 }], drops: [], next: 0.3, id: 0 };
  },
  step(s, pads) {
    s.t += DT; s.left = Math.max(0, RAIN.time - s.t);
    s.p.forEach((p, i) => {
      p.stun = Math.max(0, p.stun - DT);
      const want = p.stun ? 0 : clamp(pads[i].x, -1, 1) * RAIN.speed;
      p.v += (want - p.v) * 0.2;
      p.x = clamp(p.x + p.v * DT, -RAIN.w, RAIN.w);
    });
    const [a, b] = s.p, d = b.x - a.x, min = RAIN.r * 2;
    if (Math.abs(d) < min) {
      const dir = d >= 0 ? 1 : -1, push = (min - Math.abs(d)) / 2, va = a.v, vb = b.v;
      a.x = clamp(a.x - dir * push, -RAIN.w, RAIN.w); b.x = clamp(b.x + dir * push, -RAIN.w, RAIN.w);
      if ((va - vb) * dir > 3) emit(s, 'bump', { x: (a.x + b.x) / 2 });
      a.v = vb * 1.1; b.v = va * 1.1;
    }
    s.next -= DT;
    if (s.next <= 0 && s.left > 1.4) {
      s.next = 0.62 - 0.28 * (s.t / RAIN.time) + s.rng.next() * 0.2;
      const kind = s.rng.weighted({ gem: 66, gold: 10, rock: 24 });
      s.drops.push({ id: s.id++, kind, x: (s.rng.next() * 2 - 1) * RAIN.w, y: 8, v: kind === 'rock' ? 4.6 : 3.4 + s.rng.next() * 1.1 });
    }
    for (const q of s.drops) {
      q.y -= q.v * DT;
      if (q.y < 1.5 && q.y > 0.1) {
        const near = s.p.map((p, i) => [Math.abs(p.x - q.x), i]).sort((m, n) => m[0] - n[0])[0];
        if (near[0] < (q.kind === 'rock' ? 0.55 : 0.75)) {
          const i = near[1];
          q.gone = true;
          if (q.kind === 'rock') { s.p[i].stun = 0.85; s.score[i] = Math.max(0, s.score[i] - 1); emit(s, 'stun', { p: i, x: q.x, y: q.y }); }
          else { const n = q.kind === 'gold' ? 3 : 1; s.score[i] += n; emit(s, 'catch', { p: i, n, x: q.x, y: q.y }); }
        }
      }
      if (q.y <= 0.15 && !q.gone) { q.gone = true; emit(s, 'splat', { kind: q.kind, x: q.x }); }
    }
    s.drops = s.drops.filter((q) => !q.gone);
    if (s.left <= 0) finish(s);
  },
};

/* ---------- Hechicera y fugitivo: dos rondas, roles cambiados ---------- */
export const CHASE = { r: 4.6, time: 12, speed: 4.5, blast: 1.15, warn: 0.65, cool: 0.45 };
const fuga = {
  name: 'Hechizos al fugitivo', icon: 'bolt', input: 'chase', time: CHASE.time, selfStart: true,
  goal: 'Quien huye esquiva y recoge estrellas: +1 punto cada una. Quien lanza apunta hechizos: cada acierto le quita 1 punto a quien huye. Luego cambian de papel. Gana quien sume más puntos al huir.',
  create(seed) {
    const s = { ...base(seed), round: 1 };
    s.runner = s.rng.int(0, 1);
    fuga.begin(s);
    return s;
  },
  begin(s) {
    s.phase = 'ready'; s.clock = 0; s.left = CHASE.time;
    s.x = 0; s.y = 1.5; s.vx = s.vy = 0; s.stun = 0; s.cool = 0;
    s.spells = []; s.stars = []; s.id ||= 0;
    while (s.stars.length < 3) fuga.spawn(s);
    emit(s, 'round', { n: s.round, runner: s.runner });
  },
  spawn(s) {
    let x, y, n = 0;
    do {
      const a = s.rng.next() * 6.283, d = Math.sqrt(s.rng.next()) * (CHASE.r - 0.5);
      x = Math.cos(a) * d; y = Math.sin(a) * d;
    } while (n++ < 30 && (Math.hypot(x - s.x, y - s.y) < 2 || s.stars.some((q) => Math.hypot(q.x - x, q.y - y) < 1.6)));
    s.stars.push({ id: s.id++, x, y });
  },
  step(s, pads) {
    s.t += DT; s.clock += DT;
    if (s.phase === 'ready') { if (s.clock >= 3.6) { s.phase = 'run'; s.clock = 0; emit(s, 'go'); } return; }
    if (s.phase === 'end') {
      if (s.clock < 1.6) return;
      if (s.round === 2) return finish(s);
      s.round = 2; s.runner = 1 - s.runner;
      return fuga.begin(s);
    }
    s.left = Math.max(0, CHASE.time - s.clock);
    const r = pads[s.runner], c = pads[1 - s.runner];
    s.stun = Math.max(0, s.stun - DT); s.cool = Math.max(0, s.cool - DT);
    let { x, y } = r;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    const sp = s.stun > 0.5 ? 0 : CHASE.speed;
    s.vx += (x * sp - s.vx) * 0.22; s.vy += (y * sp - s.vy) * 0.22;
    s.x += s.vx * DT; s.y += s.vy * DT;
    const d = Math.hypot(s.x, s.y);
    if (d > CHASE.r) { s.x *= CHASE.r / d; s.y *= CHASE.r / d; }
    if (c.a && c.aim && s.cool <= 0) {
      const k = Math.min(1, CHASE.r / (Math.hypot(c.aim.x, c.aim.y) || 1));
      s.spells.push({ id: s.id++, x: c.aim.x * k, y: c.aim.y * k, t: CHASE.warn });
      s.cool = CHASE.cool;
      emit(s, 'cast', { p: 1 - s.runner });
    }
    for (const q of s.spells) {
      q.t -= DT;
      if (q.t > 0) continue;
      const hit = s.stun <= 0 && Math.hypot(q.x - s.x, q.y - s.y) < CHASE.blast;
      emit(s, 'boom', { x: q.x, y: q.y, hit, p: s.runner });
      if (hit) { s.stun = 1.3; s.score[s.runner] = Math.max(0, s.score[s.runner] - 1); }
    }
    s.spells = s.spells.filter((q) => q.t > 0);
    const got = s.stars.find((q) => Math.hypot(q.x - s.x, q.y - s.y) < 0.7);
    if (got && s.stun <= 0.5) {
      s.score[s.runner]++;
      s.stars = s.stars.filter((q) => q !== got);
      emit(s, 'catch', { p: s.runner, n: 1, x: got.x, y: got.y });
      fuga.spawn(s);
    }
    if (s.left <= 0) { s.phase = 'end'; s.clock = 0; s.spells = []; emit(s, 'end', { p: s.runner }); }
  },
};

export const GAMES = { duelo, lluvia, fuga, tira, runas, salto, choque, huevo, burbuja };
