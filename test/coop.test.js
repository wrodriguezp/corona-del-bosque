import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, COOP, TEAM_WIN } from '../src/core/game.js';
import { Session } from '../src/core/session.js';
import { CARDS } from '../src/core/cards.js';
import { progress, shadeTick } from '../src/core/critters.js';
import { autoplay } from '../tools/bot.js';

const coop = (seed = 8, len = 20) => {
  const g = new Game({ names: ['A', 'B'], len, seed, mode: 'coop' });
  g.apply({ type: 'begin' });
  return g;
};

test('cooperativo: las partidas terminan, se gana llegando los dos y se pierde sin corazones', () => {
  const N = 300, wins = { 0.5: 0, 0.65: 0, 0.8: 0 };
  for (const team of [0.5, 0.65, 0.8]) for (let i = 0; i < N; i++) {
    const { g, log } = autoplay(500 + i, ['mixto', 'mixto'], 28, 0.5, { mode: 'coop', team });
    assert.ok([-1, -2].includes(g.winner));
    if (g.winner === -1) {
      wins[team]++;
      assert.ok(g.players.every((p) => p.arrived));
      assert.equal(g.runes, 3);
    } else assert.equal(g.hearts, 0);
    for (const e of log) {
      assert.notEqual(e.t, 'fairy', 'en el cooperativo no hay hada madrina');
      if (e.t === 'duel') assert.ok(e.team, `minijuego ${e.why} sin equipo`);
      if (e.t === 'gain' || e.t === 'card') assert.ok(!['travesura', 'remontada'].includes(CARDS[e.card].family), `carta ${e.card}`);
    }
  }
  const rate = Object.fromEntries(Object.entries(wins).map(([k, v]) => [k, v / N]));
  console.log({ ganaEquipo: rate });
  // Ganar minijuegos pesa, pero se puede ganar y perder.
  assert.ok(rate[0.5] < rate[0.65] && rate[0.65] < rate[0.8]);
  assert.ok(rate[0.65] > 0.55 && rate[0.65] < 0.8, `con 65 % de minijuegos ganan ${rate[0.65]}`);
});

test('cooperativo: vencer a un guardián da una runa; perder quita un corazón y sigue en pie', () => {
  const g = coop(), p = g.player, q = g.guards[0];
  p.tile = q.tile;
  g.meetGuard(q);
  g.apply({ type: 'duel', winner: -2 });
  assert.equal(g.hearts, COOP.hearts - 1);
  assert.equal(q.done, false);
  assert.ok(progress(g, g.tile(p.tile)) < q.p, 'retrocede detrás del guardián');
  assert.equal(g.runes, 0);

  const h = coop(), q2 = h.guards[0];
  h.players.forEach((x) => (x.gems = 10));
  h.player.tile = q2.tile;
  h.meetGuard(q2);
  h.apply({ type: 'duel', winner: -1 });
  assert.equal(h.runes, 1);
  assert.ok(q2.done);
  assert.deepEqual(h.players.map((x) => x.gems), [10 + TEAM_WIN, 10 + TEAM_WIN]);
});

test('cooperativo: nadie se salta a un guardián y la Sombra lo espera detrás', () => {
  const g = coop(), p = g.player, q = g.guards[0];
  p.tile = g.board.startId;
  g.shove([], p, 40);
  assert.ok(progress(g, g.tile(p.tile)) < q.p);
  g.turns = 60;
  shadeTick(g, []);
  assert.ok(g.shade <= q.p - 1, `la Sombra (${g.shade}) pasó al guardián (${q.p})`);
});

test('cooperativo: ganar un minijuego empuja la Sombra y perderlo la adelanta', () => {
  const g = coop();
  g.turns = 14;
  g.shadowAttack = true;
  g.startTurn();
  const s1 = g.shade;
  assert.ok(s1 > COOP.push);
  g.apply({ type: 'duel', winner: -1 });
  assert.equal(g.shade, Math.max(0, s1 - COOP.push));
  assert.equal(g.phase, 'ready');
  g.shadowAttack = true;
  g.ticked = g.turns;
  g.startTurn();
  const s2 = g.shade;
  g.apply({ type: 'duel', winner: -2 });
  assert.equal(g.shade, Math.min(s2 + COOP.surge, g.guards[0].p - 1), 'la Sombra avanza al perder');
});

test('cooperativo: las cartas de equipo curan, frenan la Sombra y empujan al compañero', () => {
  const g = coop();
  g.hearts = 2;
  g.player.hand = ['abrazo', 'farol', 'lazo'];
  g.apply({ type: 'card', i: 0 });
  assert.equal(g.hearts, 3);
  g.cardPlayed = false;
  g.shade = 6; g.turns = 12;
  g.apply({ type: 'card', i: 0 });
  assert.equal(g.shade, 6 - COOP.lamp);
  g.cardPlayed = false;
  const r = g.rival, before = progress(g, g.tile(r.tile));
  g.apply({ type: 'card', i: 0 });
  assert.ok(progress(g, g.tile(r.tile)) > before);
  assert.ok(!g.canBuy('trampa'));
});

test('cooperativo: una partida guardada se reconstruye idéntica', () => {
  const { s, g } = autoplay(77, ['mixto', 'mixto'], 28, 0.5, { mode: 'coop' });
  const copy = new Session(s.opts, { log: s.log }).game;
  assert.equal(copy.winner, g.winner);
  assert.equal(copy.hearts, g.hearts);
  assert.deepEqual(copy.players.map((p) => [p.tile, p.gems]), g.players.map((p) => [p.tile, p.gems]));
});
