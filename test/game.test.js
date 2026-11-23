import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBoard, bfs } from '../src/core/board.js';
import { Game } from '../src/core/game.js';
import { Session } from '../src/core/session.js';
import { CARDS } from '../src/core/cards.js';
import { ADVENTURES } from '../src/core/adventures.js';
import { makeRng } from '../src/core/rng.js';

// Jugador simulado. style: 'corre' va directo; 'explora' busca lugares especiales.
function autoplay(seed, styles = ['mixto', 'mixto'], len = 28) {
  const s = new Session({ seed, len });
  const g = s.game, rng = makeRng(seed + 7), log = [];
  const act = (a) => log.push(...s.dispatch(a));
  let steps = 0, rolls = 0, swaps = 0, lead = -1;
  act({ type: 'begin' });
  while (g.phase !== 'over') {
    assert.ok(steps++ < 3000, `la partida ${seed} no termina (fase ${g.phase})`);
    const before = s.log.length, p = g.player;
    for (const q of g.players) {
      assert.ok(q.gems >= 0 && q.hand.length <= 4 && q.stars >= 0);
      assert.equal(g.tile(q.tile).kind, 'path');
    }
    if (g.phase === 'pick') act({ type: 'pick', i: rng.int(0, 2) });
    else if (g.phase === 'adventure') { let i; do i = rng.int(0, 2); while (!g.canChoose(i)); act({ type: 'choose', i }); }
    else if (g.phase === 'shop') { const i = g.shop.items.findIndex((it) => !it.sold && it.price <= p.gems - 4 && p.hand.length < 4); act({ type: 'shop', i: i >= 0 && rng.chance(0.5) ? i : null }); }
    else if (g.phase === 'cave') act({ type: 'cave', what: g.cave.grabs < 3 ? 'grab' : 'leave' });
    else if (g.phase === 'duel') act({ type: 'duel', winner: rng.chance(0.1) ? -1 : rng.int(0, 1) });
    else if (g.phase === 'ready') {
      if (p.hand.length && !g.cardPlayed && !p.fx.locked && rng.chance(0.6)) act({ type: 'card', i: rng.int(0, p.hand.length - 1), value: rng.int(1, 6) });
      else if (g.canBuy('sobre') && rng.chance(0.15)) act({ type: 'buy', what: 'sobre' });
      else if (g.canBuy('trampa') && rng.chance(0.1)) act({ type: 'buy', what: 'trampa' });
      else { act({ type: 'roll' }); rolls++; }
    } else if (g.phase === 'move') {
      if (g.canBuy('repetir') && g.total === 1 && rng.chance(0.2)) { act({ type: 'buy', what: 'repetir' }); continue; }
      const st = styles[g.turn];
      const score = (id) => { const t = g.tile(id); return -t.dist * (st === 'corre' ? 3 : 1.5) + (t.landmark && st !== 'corre' ? 7 : 0) + (g.rival.tile === id ? 2 : 0) + rng.next() * 2; };
      act({ type: 'move', id: g.options().sort((a, b) => score(b) - score(a))[0] });
    }
    assert.ok(s.log.length > before, `acción rechazada en fase ${g.phase}`);
    const d = g.players[0].gems - g.players[1].gems, l = d === 0 ? lead : +(d < 0);
    if (l !== lead) { swaps++; lead = l; }
  }
  return { g, s, log, rolls, swaps };
}

test('todo tablero conecta salida y castillo, y los saltos apuntan bien', () => {
  for (let s = 1; s <= 300; s++) {
    const b = makeBoard(s, [20, 28, 38][s % 3]);
    const { dist } = bfs(b, b.startId);
    assert.ok(dist.has(b.castleId));
    assert.equal(dist.size, b.tiles.filter((t) => t.kind === 'path').length);
    for (const t of b.tiles) {
      const c = t.content;
      if (!c) continue;
      if (c.type === 'portal') assert.equal(b.tiles[c.to].content.to, t.id);
      if (c.type === 'eagle') assert.ok(b.tiles[c.to].dist < t.dist && b.tiles[c.to].dist > 2);
      if (c.type === 'worm') assert.ok(b.tiles[c.to].dist > t.dist);
      if (!t.landmark) assert.equal(t.revealed, t.id === b.startId || t.id === b.castleId);
    }
    assert.ok(b.tiles.filter((t) => t.landmark).length >= 3, `pocos lugares en ${s}`);
  }
});

test('mil partidas simuladas terminan y están equilibradas', () => {
  const N = 1000, T = {}, adv = {};
  let w0 = 0, firstWins = 0, rolls = 0, swaps = 0, gems = 0, starter = 0, margin = 0;
  for (let s = 1; s <= N; s++) {
    const r = autoplay(s);
    w0 += r.g.winner === 0;
    firstWins += r.g.winner === r.g.first;
    starter += r.log.find((e) => e.t === 'turn').p === r.g.winner;
    rolls += r.rolls; swaps += r.swaps;
    gems += r.g.players[0].gems + r.g.players[1].gems;
    margin += Math.abs(r.g.players[0].gems - r.g.players[1].gems);
    for (const e of r.log) { T[e.t] = (T[e.t] || 0) + 1 / N; if (e.t === 'adventure') adv[e.id] = (adv[e.id] || 0) + 1; }
  }
  console.log({ w0: w0 / N, empieza: starter / N, llegaPrimeroYGana: firstWins / N, tiradas: rolls / N, cambiosLider: swaps / N, gemas: gems / N / 2, margen: margin / N, eventos: Object.fromEntries(Object.entries(T).map(([k, v]) => [k, +v.toFixed(1)])) });
  assert.ok(w0 / N > 0.44 && w0 / N < 0.56);
  assert.equal(ADVENTURES.filter((a) => !adv[a.id]).length, 0, 'aventuras que nunca aparecen');
});

test('explorar y correr son estrategias comparables', () => {
  let explora = 0;
  const N = 600;
  for (let s = 1; s <= N; s++) explora += autoplay(s + 5000, s % 2 ? ['explora', 'corre'] : ['corre', 'explora']).g.winner === (s % 2 ? 0 : 1);
  console.log({ ganaExplorando: explora / N });
  assert.ok(explora / N > 0.35 && explora / N < 0.65);
});

test('una partida guardada se reconstruye idéntica', () => {
  for (let k = 1; k <= 30; k++) {
    const { s, g } = autoplay(k);
    const cut = Math.floor(s.log.length * 0.6);
    const a = new Session(s.opts, { log: JSON.parse(JSON.stringify(s.log.slice(0, cut))) });
    for (const x of s.log.slice(cut)) a.dispatch(x);
    assert.deepEqual(JSON.parse(JSON.stringify(a.game.players)), JSON.parse(JSON.stringify(g.players)));
    assert.equal(a.game.winner, g.winner);
  }
});

test('cada carta se puede jugar y el escudo bloquea', () => {
  for (const id of Object.keys(CARDS)) {
    const g = new Game({ seed: 5 });
    g.apply({ type: 'begin' });
    g.player.hand = [id]; g.rival.gems = 10;
    assert.equal(g.playCard(0, 4)[0].card, id);
    assert.equal(g.player.hand.length, 0);
    if (g.phase === 'duel') g.apply({ type: 'duel', winner: 0 });
    assert.ok(g.roll().some((e) => e.t === 'roll'));
  }
  const g = new Game({ seed: 5 });
  g.apply({ type: 'begin' });
  g.player.hand = ['robo']; g.rival.fx.shield = true; g.rival.gems = 10;
  g.playCard(0);
  assert.equal(g.rival.gems, 10);
});

test('toda opción de aventura tiene efectos válidos y ninguna quita más de 5 gemas', () => {
  const kinds = ['gems', 'rival', 'steal', 'pay', 'move', 'rivalMove', 'star', 'rivalStar', 'card', 'offer', 'fx', 'rivalFx', 'reveal', 'flag', 'unflag', 'swap', 'duel'];
  const raised = new Set(), needed = new Set();
  for (const a of ADVENTURES) {
    if (a.need) needed.add(a.need);
    assert.ok(a.choices.some((c) => !c.cost), `${a.id} podría quedar sin opción gratis`);
    for (const c of a.choices) for (const out of c.check ? [c.ok, c.fail] : [c]) {
      assert.ok(out.text);
      for (const [k, v] of out.fx) {
        assert.ok(kinds.includes(k), `${a.id}: ${k}`);
        if (k === 'flag') raised.add(v);
        if (k === 'gems' || k === 'rival') assert.ok(v >= -5);
      }
    }
  }
  assert.deepEqual([...raised].sort(), [...needed].sort());
});

test('acciones fuera de fase no hacen nada', () => {
  const g = new Game({ seed: 9 });
  assert.deepEqual(g.apply({ type: 'roll' }), []);
  g.apply({ type: 'begin' });
  for (const a of [{ type: 'move', id: 5 }, { type: 'pick', i: 0 }, { type: 'choose', i: 0 }, { type: 'shop', i: 0 }, { type: 'cave', what: 'grab' }, { type: 'duel', winner: 0 }, { type: 'buy', what: 'paso' }]) assert.deepEqual(g.apply(a), []);
  g.apply({ type: 'roll' });
  assert.deepEqual(g.apply({ type: 'roll' }), []);
  assert.deepEqual(g.apply({ type: 'move', id: g.board.startId }), []);
});
