import test from 'node:test';
import assert from 'node:assert/strict';
import { GAMES, CHASE, noPad, DT } from '../src/core/minigames/index.js';
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
};

function play(id, seed, make = bots[id]) {
  const g = GAMES[id], s = g.create(seed), rng = makeRng(seed + 3), b = make();
  let n = 0;
  while (!s.done) { assert.ok(n++ < 60 * 200, `${id} no termina`); g.step(s, b.map((f) => f(s, rng))); s.events.length = 0; }
  return { s, secs: n * DT };
}

for (const id of Object.keys(GAMES)) {
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
  for (const id of ['duelo', 'lluvia', 'fuga']) play(id, 5, () => [noPad, noPad]);
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
