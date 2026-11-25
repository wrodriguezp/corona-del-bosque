import test from 'node:test';
import assert from 'node:assert/strict';
import { GAMES } from '../src/core/minigames/index.js';
import { bots, brain } from '../src/core/bots.js';
import { makeRng } from '../src/core/rng.js';
import { Game } from '../src/core/game.js';
import { autoplay } from '../tools/bot.js';

test('la computadora juega partidas completas en los dos modos y le gana al azar', () => {
  const N = 200;
  let wins = 0;
  for (let i = 0; i < N; i++) {
    const me = i % 2, ai = me ? [null, 'normal'] : ['normal', null];
    const { g } = autoplay(300 + i, ['mixto', 'mixto'], 28, 0.5, { ai });
    if (g.winner === me) wins++;
  }
  console.log({ iaGanaAlAzar: wins / N });
  assert.ok(wins / N > 0.55, `la IA gana solo ${wins / N}`);
  for (const level of ['facil', 'normal', 'dificil']) for (let i = 0; i < 40; i++) {
    const { g } = autoplay(700 + i, ['mixto', 'mixto'], 20, 0.5, { mode: 'coop', ai: [level, level] });
    assert.ok([-1, -2].includes(g.winner));
  }
});

test('en el modo juntos el nivel elige los corazones', () => {
  const hearts = (level) => new Game({ seed: 3, mode: 'coop', level }).hearts;
  assert.deepEqual(['facil', 'normal', 'dificil'].map(hearts), [5, 4, 3]);
});

test('en los minijuegos, cada nivel de la computadora le gana más a un jugador típico', () => {
  const N = 60, total = { facil: 0, normal: 0, dificil: 0 }, ids = Object.keys(GAMES).filter((id) => !GAMES[id].team);
  for (const id of ids) for (const level of Object.keys(total)) for (let k = 1; k <= N; k++) {
    const seed = k * 41 + 5, g = GAMES[id], s = g.create(seed), rng = makeRng(seed), b = bots[id](), ai = brain(id, 1, level, seed);
    let f = 0;
    while (!s.done && f++ < 12000) { g.step(s, [b[0](s, rng), ai(s)]); s.events.length = 0; }
    total[level] += s.winner === 1 ? 1 : s.winner === -1 ? 0.5 : 0;
  }
  const rate = Object.fromEntries(Object.entries(total).map(([k, v]) => [k, +(v / (N * ids.length)).toFixed(3)]));
  console.log({ iaEnMinijuegos: rate });
  assert.ok(rate.facil < rate.normal && rate.normal < rate.dificil);
  assert.ok(rate.facil > 0.2 && rate.facil < 0.4 && rate.dificil > 0.42 && rate.dificil < 0.58);
});

test('la computadora en equipo juega lo mejor que puede, sin importar el nivel', () => {
  const s0 = GAMES.faroles.create(9), s1 = GAMES.faroles.create(9);
  const a = brain('faroles', 1, 'facil', 9), b = brain('faroles', 1, 'dificil', 9);
  for (let i = 0; i < 300; i++) { assert.deepEqual(a(s0), b(s1)); GAMES.faroles.step(s0, [{ x: 0, y: 0 }, a(s0)]); GAMES.faroles.step(s1, [{ x: 0, y: 0 }, b(s1)]); }
});
