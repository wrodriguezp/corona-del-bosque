import test from 'node:test';
import assert from 'node:assert/strict';
import { GAMES, CHASE, TEAM, noPad, DT } from '../src/core/minigames/index.js';
import { makeRng } from '../src/core/rng.js';

const bots = {
  duelo: () => [0, 1].map((i) => { let at = 0; return (s, rng) => { const p = noPad(); if (s.phase === 'signal') { at ||= 0.2 + rng.next() * 0.25; p.a = s.clock >= at; } else { at = 0; p.a = s.phase === 'wait' && rng.chance(0.0006); } return p; }; }),
  lluvia: () => [0, 1].map((i) => (s) => { const me = s.p[i].x, g = s.drops.filter((d) => d.kind !== 'rock' && d.y / d.v > Math.abs(d.x - me) / 7).sort((a, b) => a.y - b.y)[0]; return { ...noPad(), x: g ? Math.max(-1, Math.min(1, (g.x - me) * 3)) : 0 }; }),
  fuga: () => [0, 1].map((i) => (s, rng) => {
    const p = noPad();
    if (s.runner === i) {
      const st = s.stars.slice().sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
      p.x = st.x - s.x; p.y = st.y - s.y;
      for (const q of s.spells) { const d = Math.hypot(q.x - s.x, q.y - s.y); if (d < 1.5) { p.x = s.x - q.x + 0.01; p.y = s.y - q.y; } }
    } else if (rng.chance(0.03)) { p.a = true; p.aim = { x: s.x + s.vx * 0.6 + (rng.next() - 0.5) * 2, y: s.y + s.vy * 0.6 + (rng.next() - 0.5) * 2 }; }
    return p;
  }),
  tira: () => [0, 1].map(() => { let k = 0, at = 0; return (s, rng) => { const p = noPad(); if (k < s.beats.length) { at ||= s.beats[k] + (rng.next() - 0.5) * 0.3; if (s.t >= at) { p.a = true; k++; at = 0; } } return p; }; }),
  runas: () => [0, 1].map((i) => { let wait = 0.5; return (s, rng) => { const p = noPad(); if (s.phase !== 'play') { wait = 0.4 + rng.next() * 0.2; return p; } wait -= DT; if (wait < 0 && s.p[i].n < s.seq.length) { wait = 0.25 + rng.next() * 0.35; p.d = rng.chance(0.93) ? s.seq[s.p[i].n] : rng.int(0, 3); } return p; }; }),
  salto: () => [0, 1].map(() => { let j = null; return (s, rng) => { const p = noPad(), m = ((s.ang % Math.PI) + Math.PI) % Math.PI, left = (s.dir > 0 ? Math.PI - m : m) / s.speed; j ??= 0.3 + (rng.next() - 0.5) * 0.42; if (left < j && left > 0.02) { p.a = true; } if (left > 0.65) j = null; return p; }; }),
  choque: () => [0, 1].map((i) => (s, rng) => { const p = noPad(), me = s.p[i], r = s.p[1 - i], d = Math.hypot(me.x, me.y); const k = d > s.r * 0.7 ? 1 : 0; p.x = k ? -me.x : r.x - me.x + (rng.next() - 0.5); p.y = k ? -me.y : r.y - me.y + (rng.next() - 0.5); return p; }),
  huevo: () => [0, 1].map((i) => (s, rng) => { const p = noPad(), me = s.p[i], r = s.p[1 - i], k = s.holder === i ? 1 : -1; p.x = k * (r.x - me.x) + (k < 0 ? -me.y * 0.9 - me.x * 0.3 : 0) + (rng.next() - 0.5); p.y = k * (r.y - me.y) + (k < 0 ? me.x * 0.9 - me.y * 0.3 : 0) + (rng.next() - 0.5); return p; }),
  burbuja: () => [0, 1].map((i) => { let goal = 0; return (s, rng) => { const p = noPad(); if (s.clock < 0) goal = 0.35 + rng.next() * 0.45; p.h = s.clock > 0.1 && s.p[i].size < goal; return p; }; }),
  dragon: () => [0, 1].map(() => { let wait = 0, react = 0; return (s, rng) => { const p = noPad(); if (s.eye === 'stir') { react ||= 0.15 + rng.next() * 0.45; } else react = 0; const stop = s.eye === 'open' || (s.eye === 'stir' && s.clock > react); if (stop) wait = 0.1 + rng.next() * 0.3; else wait -= DT; p.h = !stop && wait <= 0; return p; }; }),
  conejos: () => [0, 1].map(() => { const seen = new Set(); return (s, rng) => { const p = noPad(); if (s.phase !== 'run' || s.clock < 0) return p; for (const h of s.hares) { const q = s.clock - h.t; if (q > 0.6 && !seen.has(h.id)) { seen.add(h.id); if ((h.white && rng.chance(0.85)) || (h.ears && rng.chance(0.25))) { p.a = true; break; } } } return p; }; }),
  pesca: () => [0, 1].map((i) => { let at = 0; return (s, rng) => { const p = noPad(), me = s.p[i]; if (me.state === 'bite') { at ||= 0.2 + rng.next() * 0.6; p.a = me.clock >= at; } else { at = 0; p.a = me.state === 'wait' && rng.chance(0.002); } return p; }; }),
  hongos: () => [0, 1].map((i) => { const plan = new Map(); return (s, rng) => { const p = noPad(); for (const n of s.notes) { if (n.hit[i] || n.t < s.t - 0.3 || n.t > s.t + 0.5) continue; if (!plan.has(n)) plan.set(n, rng.chance(0.1) ? 99 : n.t + (rng.next() - 0.5) * 0.24); if (s.t >= plan.get(n)) { p.d = [3, 0, 1][n.lane]; plan.set(n, 99); break; } } return p; }; }),
  pinta: () => [0, 1].map((i) => { let goal = null; return (s, rng) => { const p = noPad(), me = s.p[i]; if (s.flower && rng.chance(0.5)) goal = s.flower; if (!goal || Math.hypot(goal.x - me.x, goal.y - me.y) < 0.4 || rng.chance(0.01)) goal = { x: (rng.next() * 2 - 1) * 4.4, y: (rng.next() * 2 - 1) * 2.8 }; p.x = goal.x - me.x; p.y = goal.y - me.y; return p; }; }),
  topos: () => [0, 1].map((i) => { const plan = new Map(); return (s, rng) => { const p = noPad(); for (const q of s.pops) { if (q.hit[i] || s.t < q.t || s.t > q.t + q.dur) continue; if (!plan.has(q)) plan.set(q, q.kind === 'hedgehog' ? (rng.chance(0.15) ? q.t + 0.3 : 99) : q.t + 0.25 + rng.next() * 0.5); if (s.t >= plan.get(q)) { p.d = q.hole; plan.set(q, 99); break; } } return p; }; }),
  torre: () => [0, 1].map((i) => { let aim = null; return (s, rng) => { const p = noPad(), me = s.p[i]; if (me.wait > 0) { aim = null; return p; } aim ??= (rng.next() - 0.5) * 0.7; const x = s.dir * Math.sin(me.ph) * 1.5; p.a = Math.abs(x - aim) < 0.08 && rng.chance(0.5); return p; }; }),
  // En equipo: jugadores decentes, con reacción humana.
  // Cada quien cuida su mitad; ve tarde (reacción) y apunta con error.
  faroles: () => { const skill = 0.75; return [0, 1].map((i) => { let t = null, wait = 0, err = [0, 0]; return (s, rng) => { const p = noPad(), me = s.p[i]; wait -= DT; if (wait <= 0) { wait = 0.25 + (1 - skill) * 0.5 * rng.next(); const list = s.blobs.slice().sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y)); const mine = list.filter((b) => (i ? b.x >= -0.3 : b.x <= 0.3)); t = mine[0] || (rng.chance(skill) ? list[0] : null); err = [(rng.next() - 0.5) * (1 - skill) * 3, (rng.next() - 0.5) * (1 - skill) * 3]; } if (t && s.blobs.includes(t)) { p.x = t.x - me.x + err[0]; p.y = t.y - me.y + err[1]; } else { p.x = (i ? 1.2 : -1.2) - me.x; p.y = -me.y; } return p; }; }); },
  remar: () => { const skill = 0.75; return [0, 1].map((i) => { let at = null; return (s, rng) => { const p = noPad(); if (s.last === i && !rng.chance((1 - skill) * 0.01)) { at = null; return p; } if (s.rest[i] > 0) return p; at ??= s.t + 0.15 + rng.next() * 0.3 * (1.6 - skill); if (s.t >= at) { p.a = true; at = null; } return p; }; }); },
  escudo: () => { const skill = 0.75; return [0, 1].map((i) => { let h = false, wait = 0; return (s, rng) => { const p = noPad(), o = 1 - i; wait -= DT; if (wait <= 0) { wait = 0.2 + (1 - skill) * 0.6 * rng.next(); const need = s.mode === 'surge' || (s.mode === 'warn' && rng.chance(skill)); const mine = i === 0 ? s.en[0] >= s.en[1] : s.en[1] > s.en[0]; h = need || (mine && s.b > 0.05) || (s.tired[o] && s.b > 0.02); if (rng.chance((1 - skill) * 0.3)) h = !h; } p.h = h; return p; }; }); },
};

function play(id, seed, make = bots[id]) {
  const g = GAMES[id], s = g.create(seed), rng = makeRng(seed + 3), b = make();
  let n = 0;
  while (!s.done) { assert.ok(n++ < 60 * 200, `${id} no termina`); g.step(s, b.map((f) => f(s, rng))); s.events.length = 0; }
  return { s, secs: n * DT };
}

for (const id of TEAM) {
  test(`${id}: en equipo se puede ganar y perder, y es repetible`, () => {
    let won = 0, secs = 0; const N = 200;
    for (let k = 1; k <= N; k++) { const r = play(id, k * 17); won += r.s.won ? 1 : 0; secs += r.secs; assert.ok([-1, -2].includes(r.s.winner)); }
    console.log(id, { ganan: won / N, segundos: secs / N });
    assert.ok(won / N > 0.3 && won / N < 0.97);
    assert.ok(secs / N < 45);
    assert.equal(play(id, 5, () => [noPad, noPad]).s.won, false);
    assert.deepEqual(play(id, 99).s.score, play(id, 99).s.score);
  });
}

for (const id of Object.keys(GAMES).filter((id) => !GAMES[id].team)) {
  test(`${id}: termina, es justo y repetible`, () => {
    const w = [0, 0, 0]; let secs = 0; const N = 300; const sc = [0, 0];
    for (let k = 1; k <= N; k++) { const r = play(id, k * 17); w[r.s.winner < 0 ? 2 : r.s.winner]++; secs += r.secs; sc[0] += r.s.score[0]; sc[1] += r.s.score[1]; }
    console.log(id, { ganaA: w[0] / N, ganaB: w[1] / N, empate: w[2] / N, segundos: secs / N, puntos: sc.map((v) => v / N) });
    assert.ok(Math.abs(w[0] - w[1]) / N < 0.15);
    assert.ok(secs / N < 45);
    assert.deepEqual(play(id, 99).s.score, play(id, 99).s.score);
  });
}

test('sin tocar nada no se bloquean', () => {
  for (const id of Object.keys(GAMES)) play(id, 5, () => [noPad, noPad]);
});

test('adelantarse en el duelo da la ronda al rival', () => {
  const s = GAMES.duelo.create(4);
  for (let i = 0; i < 30; i++) GAMES.duelo.step(s, [noPad(), noPad()]);
  GAMES.duelo.step(s, [{ ...noPad(), a: true }, noPad()]);
  assert.deepEqual(s.score, [0, 1]);
});

test('el hechizo avisa antes y solo golpea dentro de su radio', () => {
  const s = GAMES.fuga.create(4), idle = [noPad(), noPad()];
  while (s.phase !== 'run') GAMES.fuga.step(s, idle);
  s.score[s.runner] = 2;
  const pads = [noPad(), noPad()];
  pads[1 - s.runner] = { ...noPad(), a: true, aim: { x: s.x + CHASE.blast * 0.5, y: s.y } };
  GAMES.fuga.step(s, pads);
  assert.equal(s.score[s.runner], 2);
  for (let i = 0; i < 60; i++) GAMES.fuga.step(s, idle);
  assert.equal(s.score[s.runner], 1);
});
