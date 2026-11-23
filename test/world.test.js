import test from 'node:test';
import assert from 'node:assert/strict';
import { bfs } from '../src/core/board.js';
import { Game } from '../src/core/game.js';
import { EVENTS, DAY } from '../src/core/world.js';
import { autoplay } from '../tools/bot.js';

const fresh = (seed) => { const g = new Game({ seed, len: 28, names: ['A', 'B'] }); g.apply({ type: 'begin' }); return g; };
const whole = (g) => {
  const { dist } = bfs(g.board, g.board.startId);
  assert.equal(dist.size, g.board.tiles.filter((t) => t.kind === 'path').length, 'quedó una casilla aislada');
  assert.ok(g.players.every((p) => g.tile(p.tile).kind === 'path' && g.tile(p.tile).dist != null));
  for (const t of g.board.tiles) for (const id of t.links) assert.ok(g.tile(id).links.includes(t.id));
};

test('los eventos del mundo nunca rompen el tablero', () => {
  for (let s = 1; s <= 80; s++) {
    const g = fresh(s);
    for (let k = 0; k < 8; k++) for (const E of Object.values(EVENTS)) if (E.can(g)) { E.run(g, [], E.prepare(g)); whole(g); }
    for (const t of g.board.tiles) if (['portal', 'eagle', 'worm'].includes(t.content?.type)) assert.equal(g.tile(t.content.to).kind, 'path');
  }
});

test('en partidas completas el tablero sigue conectado y cada presagio avisa dos turnos', () => {
  const seen = {};
  for (let s = 1; s <= 200; s++) {
    const r = autoplay(s);
    whole(r.g);
    let omen = null;
    for (const e of r.log) {
      if (e.t === 'omen') omen = { id: e.id, left: 2 };
      if (e.t === 'time' && omen) omen.left--;
      if (e.t === 'event') { assert.equal(e.id, omen.id); assert.equal(omen.left, 0); omen = null; seen[e.id] = (seen[e.id] || 0) + 1; }
    }
  }
  assert.equal(Object.keys(seen).length, Object.keys(EVENTS).length);
});

test('el dragón solo daña dentro de la zona y el escudo protege', () => {
  const g = fresh(5), [a, b] = g.players;
  a.gems = b.gems = 10; g.aid = [0, 0];
  b.tile = g.tile(a.tile).links[0];
  EVENTS.dragon.run(g, [], { zone: [a.tile] });
  assert.deepEqual([a.gems, b.gems], [5, 10]);
  const zone = [a.tile, b.tile];
  a.gems = b.gems = 10; a.fx.shield = true;
  EVENTS.dragon.run(g, [], { zone });
  assert.deepEqual([a.gems, b.gems], [10, 5]);
});

test('la noche da más gemas', () => {
  for (const [turns, n] of [[0, 3], [DAY.night, 5]]) {
    const g = fresh(9), p = g.player;
    g.turns = turns;
    const t = g.board.tiles.find((q) => q.kind === 'path' && !q.landmark && q.id !== g.board.castleId && q.id !== p.tile);
    t.content = { type: 'gem', n: 3 };
    const before = p.gems;
    g.resolve([], t);
    assert.equal(p.gems - before, n);
  }
});
