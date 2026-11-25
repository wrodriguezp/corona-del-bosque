import test from 'node:test';
import assert from 'node:assert/strict';
import { makeBoard, bfs } from '../src/core/board.js';
import { Game, BOSSES } from '../src/core/game.js';
import { Session } from '../src/core/session.js';
import { CARDS } from '../src/core/cards.js';
import { ADVENTURES, describe } from '../src/core/adventures.js';
import { autoplay } from '../tools/bot.js';

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
    const team = CARDS[id].family === 'equipo', g = new Game({ seed: 5, mode: team ? 'coop' : 'versus' });
    g.apply({ type: 'begin' });
    if (team) { g.hearts = 2; g.shade = 5; }
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

test('el hada ayuda solo a quien va atrás y se despide al emparejar', () => {
  const g = new Game({ seed: 5 });
  g.apply({ type: 'begin' });
  const [a, b] = g.players, ev = [];
  g.turns = 10; a.gems = 5; b.gems = 25;
  g.updateFairy(ev);
  assert.deepEqual(g.aid, [2, 0]);
  assert.equal(g.duelTake(0), 8);
  assert.equal(g.duelTake(1), 2);
  g.rob(ev, b, a, 4);
  assert.deepEqual([a.gems, b.gems], [3, 27]);
  a.gems = 26;
  g.updateFairy(ev);
  assert.deepEqual(g.aid, [0, 0]);
  assert.equal(ev.at(-1).kind, 'adios');
});

test('toda consecuencia de aventura se explica con palabras', () => {
  for (const a of ADVENTURES) for (const c of a.choices) for (const out of c.check ? [c.ok, c.fail] : [c]) {
    const t = describe(out.fx, 'Mago');
    assert.ok(t && !/undefined|NaN|null/.test(t), `${a.id}: ${t}`);
  }
});

test('con hada hay menos palizas, pero quien es mejor sigue ganando más', () => {
  const N = 400;
  let big = 0, best = 0;
  for (let s = 1; s <= N; s++) {
    const { g } = autoplay(s + 9000, undefined, 28, 0.75);
    big += Math.abs(g.players[0].gems - g.players[1].gems) >= 20;
    best += g.winner === 0;
  }
  console.log({ paliza20: big / N, ganaElMejor: best / N });
  assert.ok(big / N < 0.25 && best / N > 0.6);
});

test('quien llega primero juega desde el castillo y las cartas sobrantes se vuelven gemas', () => {
  let seen = 0;
  for (let s = 1; s <= 60; s++) {
    const { g, log } = autoplay(s);
    const arrive = log.findIndex((e) => e.t === 'arrive' && e.first);
    if (arrive < 0) continue;
    const after = log.slice(arrive);
    const castle = after.filter((e) => e.t === 'castleTurn');
    assert.ok(castle.every((e) => e.p === g.first && e.die >= 1 && e.die <= 6));
    seen += castle.length;
    for (const e of log.filter((x) => x.t === 'cash')) assert.ok(e.n >= 1 && e.n <= 5);
    assert.ok(g.players.every((p) => p.hand.length === 0 && p.chest === 0));
    // Quien no llegó pierde algo al final.
    for (const p of g.players) if (!p.arrived) assert.ok(log.some((e) => e.t === 'gems' && e.why === 'late' && e.p === p.id) || p.gems === 0);
  }
  assert.ok(seen > 20);
});

test('una partida guardada con otra versión del juego se borra al abrir', () => {
  let saved = null;
  const mem = (build) => ({ build, read: () => saved, write: (d) => (saved = d), clear: () => (saved = null) });
  const s = new Session({ names: ['A', 'B'], len: 20, seed: 3 }, { store: mem('v1') });
  s.dispatch({ type: 'begin' });
  assert.ok(saved?.log.length);
  assert.ok(Session.load(mem('v1')));
  assert.equal(Session.load(mem('v2')), null);
  assert.equal(saved, null);
});

test('un guardián detiene a quien llega y juegan juntos contra él', () => {
  for (const [w, delta] of [[-1, 4], [-2, -3]]) {
    const g = new Game({ names: ['A', 'B'], len: 20, seed: 8 });
    g.apply({ type: 'begin' });
    g.players.forEach((p) => (p.gems = 10));
    const q = g.guards[0];
    assert.ok(q.p > 0 && q.p < g.board.length);
    const ev = g.meetGuard(q);
    assert.ok(q.done && ev.some((e) => e.t === 'guard') && g.duel.team && g.duel.why === 'guardia');
    const turn = g.turn;
    g.apply({ type: 'duel', winner: w });
    assert.deepEqual(g.players.map((p) => p.gems), [10 + delta, 10 + delta]);
    assert.notEqual(g.turn, turn); // el turno termina después del guardián
  }
});

test('cada guardián es una batalla de jefe y quien pega más golpes gana 1 gema extra', () => {
  for (const [i, hits, gems] of [[0, [5, 3], [15, 14]], [1, [2, 6], [14, 15]], [2, [4, 4], [14, 14]], [0, null, [14, 14]]]) {
    const g = new Game({ names: ['A', 'B'], len: 20, seed: 8 });
    g.apply({ type: 'begin' });
    g.players.forEach((p) => (p.gems = 10));
    g.meetGuard(g.guards[i]);
    assert.equal(g.duel.game, BOSSES[i]);
    g.apply(hits ? { type: 'duel', winner: -1, hits } : { type: 'duel', winner: -1 });
    assert.deepEqual(g.players.map((p) => p.gems), gems);
  }
});

test('la Sombra ataca: juegan juntos y ganan o pierden los dos', () => {
  for (const [w, delta] of [[-1, 4], [-2, -3]]) {
    const g = new Game({ names: ['A', 'B'], len: 20, seed: 8 });
    g.apply({ type: 'begin' });
    g.players.forEach((p) => (p.gems = 10));
    g.shadowAttack = true;
    const ev = g.startTurn();
    assert.ok(ev.some((e) => e.t === 'duel' && e.team));
    assert.equal(g.apply({ type: 'duel', winner: 0 }).length, 0);
    g.apply({ type: 'duel', winner: w });
    assert.deepEqual(g.players.map((p) => p.gems), [10 + delta, 10 + delta]);
    assert.equal(g.phase, 'ready');
  }
});
