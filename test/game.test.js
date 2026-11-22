import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBoard, bfs } from '../src/core/board.js';
import { Game } from '../src/core/game.js';
import { CARDS } from '../src/core/cards.js';
import { makeRng } from '../src/core/rng.js';

function autoplay(seed, len = 28) {
  const g = new Game({ seed, len });
  const rng = makeRng(seed + 7);
  const log = [];
  let turns = 0, leadSwaps = 0, lastLead = -1;
  const push = (ev) => { log.push(...ev); };
  push(g.begin());
  for (let guard = 0; g.phase !== 'over'; guard++) {
    assert.ok(guard < 2000, `la partida ${seed} no termina`);
    for (const p of g.players) {
      assert.ok(p.gems >= 0, 'gemas negativas');
      assert.ok(p.hand.length <= 4, 'mano demasiado grande');
      assert.equal(g.tile(p.tile).kind, 'path');
    }
    if (g.phase === 'pick') push(g.pick(rng.int(0, 2)));
    else if (g.phase === 'ready') {
      if (g.player.hand.length && rng.chance(0.6)) push(g.playCard(rng.int(0, g.player.hand.length - 1), rng.int(1, 6)));
      push(g.roll());
      turns++;
      assert.ok(g.options().length > 0);
    } else if (g.phase === 'move') {
      // Jugador humano simulado: avanza casi siempre, mira un poco las pistas.
      const score = (id) => { const t = g.tile(id); return -t.dist * 1.5 + (t.clue === 'brillo' ? 2 : 0) - (t.clue === 'humo' ? 2 : 0) + rng.next() * 2; };
      push(g.moveTo(g.options().sort((a, b) => score(b) - score(a))[0]));
    }
    const lead = g.players[0].gems === g.players[1].gems ? lastLead : +(g.players[1].gems > g.players[0].gems);
    if (lead !== lastLead) { leadSwaps++; lastLead = lead; }
  }
  return { g, log, turns, leadSwaps };
}

test('todo tablero conecta salida y castillo con caminos alternos', () => {
  for (let s = 1; s <= 300; s++) {
    const b = makeBoard(s);
    const { dist } = bfs(b, b.startId);
    assert.ok(dist.has(b.castleId));
    assert.equal(dist.size, b.tiles.filter((t) => t.kind === 'path').length);
    for (const t of b.tiles) if (t.content?.type === 'portal') assert.equal(b.tiles[t.content.to].content.to, t.id);
  }
});

test('la misma semilla da el mismo tablero', () => {
  const a = makeBoard(42), b = makeBoard(42);
  assert.deepEqual(a.tiles, b.tiles);
});

test('mil partidas simuladas terminan y están equilibradas', () => {
  const N = 1000;
  let wins0 = 0, firstWins = 0, turns = 0, swaps = 0, gems = 0, starter = 0;
  const types = {};
  for (let s = 1; s <= N; s++) {
    const r = autoplay(s);
    wins0 += r.g.winner === 0;
    firstWins += r.g.winner === r.g.first;
    starter += r.log.find((e) => e.t === 'turn').p === r.g.winner;
    turns += r.turns; swaps += r.leadSwaps;
    gems += r.g.players[0].gems + r.g.players[1].gems;
    for (const e of r.log) types[e.t] = (types[e.t] || 0) + 1 / N;
  }
  console.log({ wins0: wins0 / N, starter: starter / N, llegaPrimeroYGana: firstWins / N, turnos: turns / N, cambiosLider: swaps / N, gemas: gems / N / 2, eventos: Object.fromEntries(Object.entries(types).map(([k, v]) => [k, +v.toFixed(1)])) });
  assert.ok(wins0 / N > 0.44 && wins0 / N < 0.56);
});

test('cada carta se puede jugar y el escudo bloquea', () => {
  for (const id of Object.keys(CARDS)) {
    const g = new Game({ seed: 5 });
    g.begin();
    g.player.hand = [id];
    g.rival.gems = 10;
    const ev = g.playCard(0, 4);
    assert.equal(ev[0].card, id);
    assert.equal(g.player.hand.length, 0);
    assert.ok(g.roll().some((e) => e.t === 'roll'));
  }
  const g = new Game({ seed: 5 });
  g.begin();
  g.player.hand = ['robo'];
  g.rival.fx.shield = true; g.rival.gems = 10;
  g.playCard(0);
  assert.equal(g.rival.gems, 10);
  assert.equal(g.rival.fx.shield, false);
});

test('no se puede hacer trampa: acciones fuera de fase no hacen nada', () => {
  const g = new Game({ seed: 9 });
  g.begin();
  assert.deepEqual(g.moveTo(5), []);
  assert.deepEqual(g.pick(0), []);
  g.roll();
  assert.deepEqual(g.roll(), []);
  assert.deepEqual(g.moveTo(g.board.startId), []);
});
