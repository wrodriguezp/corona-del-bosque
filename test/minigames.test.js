import test from 'node:test';
import assert from 'node:assert/strict';
import { GAMES, CHASE, TEAM, noPad, DT } from '../src/core/minigames/index.js';
import { makeRng } from '../src/core/rng.js';
import { bots, brain } from '../src/core/bots.js';

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
