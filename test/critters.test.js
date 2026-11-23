import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/core/game.js';
import { SHADE, CRITTER, critterAt, progress, shaded } from '../src/core/critters.js';
import { autoplay } from '../tools/bot.js';

const fresh = (seed) => { const g = new Game({ seed, len: 28, names: ['A', 'B'] }); g.apply({ type: 'begin' }); return g; };

test('la Sombra avanza, se acelera y nunca llega al castillo', () => {
  for (let s = 1; s <= 150; s++) {
    const { g, log } = autoplay(s);
    const fronts = log.filter((e) => e.t === 'shade').map((e) => e.front);
    for (let i = 1; i < fronts.length; i++) assert.ok(fronts[i] > fronts[i - 1]);
    assert.ok(g.shade <= g.board.length - SHADE.stop);
    // Tras cada alcance, quien fue alcanzado queda delante de la Sombra.
    for (const p of g.players) if (!p.arrived) assert.ok(!shaded(g, g.tile(p.tile)) || g.phase === 'over');
  }
});

test('si la Sombra te alcanza pierdes gemas y sales por delante; el escudo protege las gemas', () => {
  const g = fresh(3), p = g.player;
  g.turns = 20; g.ticked = null;
  p.gems = 10; p.fx.shield = false;
  g.rival.tile = g.board.castleId; g.rival.arrived = true;
  const ev = g.startTurn();
  assert.ok(ev.some((e) => e.t === 'shadeCatch' && e.p === p.id));
  assert.equal(p.gems, 10 - SHADE.gems);
  assert.ok(progress(g, g.tile(p.tile)) >= g.shade + SHADE.spit);

  const h = fresh(3), q = h.player;
  h.turns = 20; h.ticked = null; q.gems = 10; q.fx.shield = true;
  h.startTurn();
  assert.equal(q.gems, 10);
  assert.ok(!shaded(h, h.tile(q.tile)));
});

test('las criaturas aparecen, vagan y se encuentran al pasar', () => {
  const kinds = {};
  for (let s = 1; s <= 150; s++) {
    const { g, log } = autoplay(s);
    assert.ok(g.critters.length <= CRITTER.max);
    for (const c of g.critters) assert.equal(g.tile(c.tile).kind, 'path');
    for (const e of log) if (e.t === 'meet') kinds[e.kind] = (kinds[e.kind] || 0) + 1;
  }
  assert.deepEqual(Object.keys(kinds).sort(), ['conejo', 'hada', 'lobo', 'troll']);
});

test('el troll te detiene y cobra; el conejo suma a la próxima tirada', () => {
  const g = fresh(8), p = g.player;
  g.phase = 'ready';
  g.apply({ type: 'roll' });
  const dest = g.options()[0], path = g.pathFor(dest);
  if (path.length < 2) return;
  const before = p.gems;
  g.critters.push({ id: 99, kind: 'troll', tile: path[0] });
  g.apply({ type: 'move', id: dest });
  assert.equal(p.tile, path[0]);
  assert.equal(p.gems, Math.max(0, before - CRITTER.toll));
  assert.equal(critterAt(g, path[0]), undefined);

  const h = fresh(8), q = h.player;
  h.phase = 'ready';
  h.apply({ type: 'roll' });
  const d2 = h.options()[0], p2 = h.pathFor(d2);
  h.critters.push({ id: 98, kind: 'conejo', tile: p2[0] });
  h.apply({ type: 'move', id: d2 });
  assert.equal(q.fx.plus, CRITTER.rabbit);
});

test('cerca del castillo las gemas valen más', () => {
  const g = fresh(4), L = g.board.length;
  const at = (k) => g.board.tiles.find((t) => t.kind === 'path' && t.dist != null && Math.abs(progress(g, t) / L - k) < 0.04);
  assert.equal(g.nearCastle(at(0.2)), 0);
  assert.equal(g.nearCastle(at(0.6)), 1);
  assert.equal(g.nearCastle(at(0.85)), 2);
});
