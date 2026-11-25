import test from 'node:test';
import assert from 'node:assert/strict';
import { Game, COOP } from '../src/core/game.js';
import { RELICS, ALTAR_RELICS, TEAM_RELICS, handLimit, priceOf } from '../src/core/relics.js';
import { PRICES } from '../src/core/cards.js';

const game = (o = {}) => { const g = new Game({ names: ['A', 'B'], len: 28, seed: 8, ...o }); g.apply({ type: 'begin' }); return g; };
const altars = (g) => g.board.tiles.filter((t) => t.content?.type === 'altar');

test('cada tablero tiene altares lejanos con reliquias distintas', () => {
  let total = 0;
  for (let s = 1; s <= 100; s++) {
    const g = new Game({ seed: s, len: [20, 28, 38][s % 3] }), list = altars(g);
    assert.ok(list.length >= 2, `semilla ${s}: ${list.length} altares`);
    assert.equal(new Set(list.map((t) => t.content.relic)).size, list.length);
    assert.ok(list.every((t) => t.landmark && ALTAR_RELICS.includes(t.content.relic)));
    total += list.length;
  }
  assert.ok(total / 100 > 2.5);
});

test('la reliquia del altar es de quien llega primero', () => {
  const g = game(), t = altars(g)[0], p = g.player, id = t.content.relic;
  const ev = [];
  g.resolve(ev, t);
  assert.deepEqual(p.relics, [id]);
  assert.ok(ev.some((e) => e.t === 'relic' && e.id === id));
  g.turn = 1 - g.turn;
  const ev2 = [];
  g.resolve(ev2, t);
  assert.deepEqual(g.player.relics, []);
  assert.ok(ev2.some((e) => e.t === 'msg' && e.title === 'Altar vacío'));
});

test('cada reliquia explica su efecto con palabras', () => {
  for (const [id, r] of Object.entries(RELICS)) assert.ok(r.name && r.icon && r.text && /\d|ya no/.test(r.text), id);
});

test('bolsa, moneda, corona y amuleto hacen lo que dicen', () => {
  const g = game(), p = g.player;
  assert.equal(handLimit(p), 4);
  p.relics.push('bolsa', 'moneda', 'corona', 'amuleto');
  assert.equal(handLimit(p), 5);
  assert.equal(priceOf(p, 'sobre'), PRICES.sobre - 1);
  const gems = p.gems, ev = [];
  g.addStar(ev, p);
  assert.equal(p.gems, gems + 1);
  p.gems = 10;
  g.resolve([], { id: 0, content: { type: 'trap', trap: 'duende' } });
  assert.equal(p.gems, g.night ? 10 - 4 : 10 - 2);
});

test('raíz del roble: el pozo y el gusano no te mueven', () => {
  const g = game(), p = g.player, tiles = g.board.tiles;
  const worm = tiles.find((t) => t.content?.type === 'worm');
  p.relics.push('raiz');
  p.tile = worm.id;
  g.resolve([], worm);
  assert.equal(p.tile, worm.id);
  const pit = tiles.find((t) => t.dist > 6 && t.kind === 'path' && !t.landmark);
  p.tile = pit.id;
  g.resolve([], { id: pit.id, content: { type: 'trap', trap: 'pozo' } });
  assert.equal(p.tile, pit.id);
});

test('modo juntos: vencer a un guardián da una reliquia del equipo a los dos', () => {
  const g = game({ mode: 'coop' }), q = g.guards[0], hearts = g.hearts;
  g.meetGuard(q);
  g.apply({ type: 'duel', winner: -1 });
  const [a, b] = g.players.map((p) => p.relics);
  assert.equal(a.length, 1);
  assert.deepEqual(a, b);
  assert.ok(TEAM_RELICS.includes(a[0]));
  if (a[0] === 'roble') assert.equal(g.hearts, Math.min(hearts + 1, g.maxHearts));
  assert.ok(COOP.hearts > 0);
});
