import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, GOLDEN } from '../src/core/game.js';
import { progress } from '../src/core/critters.js';
import { autoplay } from '../tools/bot.js';

const fresh = (seed) => { const g = new Game({ seed, len: 28, names: ['A', 'B'] }); g.apply({ type: 'begin' }); return g; };

test('en el castillo se está a salvo de las travesuras', () => {
  const g = fresh(3);
  assert.ok(g.canCard('robo') && g.canCard('cometa'));
  g.rival.arrived = true;
  for (const c of ['robo', 'maleta', 'peaje', 'cometa', 'gusanito', 'reto']) assert.equal(g.canCard(c), false, c);
  for (const c of ['cosecha', 'dorado', 'botas', 'estela']) assert.ok(g.canCard(c), c);
  g.player.hand = ['robo'];
  assert.deepEqual(g.apply({ type: 'card', i: 0 }), []);
  assert.deepEqual(g.player.hand, ['robo']);
});

test('el toque dorado suma gemas fijas', () => {
  const g = fresh(5), t = g.board.tiles.find((x) => x.kind === 'path' && x.dist > 3 && progress(g, x) < g.board.length * 0.4);
  t.content = { type: 'gem', n: 4 };
  g.player.fx.golden = 1;
  const before = g.player.gems;
  g.resolve([], t);
  assert.equal(g.player.gems - before, 4 + GOLDEN + (g.night ? 2 : 0));
});

test('el tramo final no premia más cuando alguien ya llegó', () => {
  const g = fresh(4), t = g.board.tiles.find((x) => x.kind === 'path' && x.dist != null && progress(g, x) / g.board.length > 0.85);
  assert.equal(g.nearCastle(t), 2);
  g.first = 0;
  assert.equal(g.nearCastle(t), 0);
});

test('la Sombra ataca en casi todas las partidas', () => {
  let n = 0;
  for (let s = 1; s <= 40; s++) n += autoplay(s).log.some((e) => e.t === 'event' && e.id === 'sombra');
  assert.ok(n >= 36, `solo en ${n} de 40`);
});
