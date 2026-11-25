import { ALTAR_RELICS } from './relics.js';
import { makeRng } from './rng.js';

export const BIOMES = [
  { id: 'pradera', name: 'Pradera del Alba' },
  { id: 'bosque', name: 'Bosque Susurrante' },
  { id: 'otono', name: 'Colinas Doradas' },
  { id: 'cristal', name: 'Cumbres de Cristal' },
];

const key = (c, row) => `${c},${row}`;

// Vecinos en coordenadas de filas alternadas (hexágonos con punta arriba).
export function neighborCoords(c, row) {
  const s = row & 1;
  return [
    [c + 1, row], [c - 1, row],
    [c + s, row - 1], [c + s - 1, row - 1],
    [c + s, row + 1], [c + s - 1, row + 1],
  ];
}

export function bfs(board, fromId) {
  const dist = new Map([[fromId, 0]]);
  const parent = new Map();
  const queue = [fromId];
  for (let i = 0; i < queue.length; i++) {
    const id = queue[i];
    for (const n of board.tiles[id].links) {
      if (dist.has(n)) continue;
      dist.set(n, dist.get(id) + 1);
      parent.set(n, id);
      queue.push(n);
    }
  }
  return { dist, parent };
}

export function pathTo(parent, fromId, toId) {
  const path = [toId];
  while (path[0] !== fromId) path.unshift(parent.get(path[0]));
  return path.slice(1);
}

// Vuelve a conectar las casillas transitables tras cambiar el terreno.
export function relink(board) {
  for (const t of board.tiles) t.links = t.kind === 'path' ? board.around(t).filter((n) => n.kind === 'path').map((n) => n.id) : [];
}

export const isConnected = (board) => bfs(board, board.startId).dist.size === board.tiles.filter((t) => t.kind === 'path').length;

// Distancia al castillo y cuánto se desvía cada casilla de la ruta más corta.
export function measure(board) {
  const dC = bfs(board, board.castleId).dist, dS = bfs(board, board.startId).dist;
  board.length ??= dC.get(board.startId);
  const now = dC.get(board.startId);
  for (const t of board.tiles) {
    t.dist = dC.get(t.id) ?? null;
    t.detour = t.dist == null ? 0 : t.dist + dS.get(t.id) - now;
  }
  return dS;
}

export function makeContent(rng, t) {
  const type = rng.weighted(t.detour <= 1
    ? { adventure: 32, gem: 18, trap: 19, chest: 9, shrine: 5, duel: 10, calm: 7 }
    : { adventure: 30, gem: 28, trap: 11, chest: 13, shrine: 6, duel: 9, calm: 3 });
  if (type === 'gem') return { type, n: t.detour <= 1 ? rng.int(2, 4) : rng.int(3, 6) };
  if (type === 'trap') return { type, trap: rng.pick(['pozo', 'zarzas', 'duende', 'urraca']) };
  return { type };
}

export function makeBoard(seed, len = 28) {
  const rng = makeRng(seed);
  const tiles = [];
  const byKey = new Map();
  const ph1 = rng.next() * 6.28, ph2 = rng.next() * 6.28, ph3 = rng.next() * 6.28;
  const center = (c) => Math.round(Math.sin(c * 0.28 + ph1) * 2.2 + Math.sin(c * 0.13 + ph2) * 1.6);
  const half = (c) => {
    const edge = Math.min(c, len - 1 - c);
    const base = 2.6 + Math.sin(c * 0.5 + ph3) * 0.8;
    return Math.min(base, 1 + edge * 0.7);
  };

  const add = (c, row, extra) => {
    const t = {
      id: tiles.length, c, row,
      x: Math.sqrt(3) * (c + (row & 1) * 0.5), z: 1.5 * row,
      links: [], kind: 'path', content: null, revealed: false, seen: false,
      ...extra,
    };
    tiles.push(t);
    byKey.set(key(c, row), t);
    return t;
  };

  for (let c = 0; c < len; c++)
    for (let row = -10; row <= 10; row++)
      if (Math.abs(row - center(c)) <= half(c)) add(c, row, {});

  const start = byKey.get(key(0, center(0)));
  const castle = byKey.get(key(len - 1, center(len - 1)));

  const board = { seed, len, tiles, startId: start.id, castleId: castle.id, byKey };
  board.around = (t) => neighborCoords(t.c, t.row).map(([c, r]) => byKey.get(key(c, r))).filter(Boolean);
  relink(board);

  // Obstáculos: parten el terreno y crean bifurcaciones reales.
  for (let c = 4; c < len - 3; c += rng.int(2, 3)) {
    const t0 = byKey.get(key(c, center(c) + rng.int(-1, 1)));
    if (!t0 || t0.kind !== 'path') continue;
    const kind = rng.pick(['lake', 'mountain', 'grove']);
    const blob = [t0];
    const size = rng.int(1, 3);
    for (let k = 0; k < size; k++) {
      const [nc, nr] = rng.pick(neighborCoords(rng.pick(blob).c, rng.pick(blob).row));
      const n = byKey.get(key(nc, nr));
      if (n && n.kind === 'path' && !blob.includes(n) && n.c > 2 && n.c < len - 2) blob.push(n);
    }
    const guarded = [start, castle];
    if (blob.some((b) => guarded.includes(b))) continue;
    blob.forEach((b) => (b.kind = kind));
    relink(board);
    if (!isConnected(board)) {
      blob.forEach((b) => (b.kind = 'path'));
      relink(board);
    }
  }

  const dStart = measure(board);

  // Orilla decorativa alrededor del camino.
  for (const t of [...tiles])
    for (const [c, r] of neighborCoords(t.c, t.row))
      if (!byKey.has(key(c, r))) add(c, r, { kind: rng.pick(['shore', 'shore', 'grove', 'shore', 'mountain']), outer: true, dist: null });

  // Bioma y altura.
  for (const t of tiles) {
    const p = Math.min(0.999, Math.max(0, (t.c + Math.sin(t.row * 1.3 + ph2) * 0.9) / len));
    t.biome = Math.floor(p * 4);
    const wave = Math.sin(t.c * 0.7 + ph1) * Math.cos(t.row * 0.6 + ph3);
    t.h = 0.35 + p * 0.9 + wave * 0.22;
    if (t.kind === 'lake') t.h -= 0.28;
    if (t.kind === 'shore') t.h -= 0.3 + rng.next() * 0.15;
    t.rand = rng.next();
  }

  // Lugares visibles desde lejos: dan metas y motivos para desviarse.
  const playable = tiles.filter((t) => t.kind === 'path' && t !== start && t !== castle && dStart.get(t.id) > 1);
  const place = (frac, type, far = [1, 4], extra = {}) => {
    const goal = board.length * frac;
    const spots = playable.filter((t) => !t.content && t.dist > 2 && Math.abs(t.dist - goal) <= 2)
      .filter((t) => !tiles.some((o) => o.landmark && Math.hypot(o.x - t.x, o.z - t.z) < 4));
    if (!spots.length) return;
    const aside = spots.filter((t) => t.detour >= far[0] && t.detour <= far[1]);
    const t = rng.pick(aside.length ? aside : spots);
    t.content = { type, done: [false, false], ...extra };
    t.landmark = t.revealed = true;
  };
  place(0.82, 'cave'); place(0.66, 'shop'); place(0.48, 'cave'); place(0.3, 'shop'); place(0.16, 'cave');
  // Altares antiguos con una reliquia, en los desvíos más lejanos: se la lleva quien llega primero.
  const relics = rng.shuffle(ALTAR_RELICS);
  place(0.24, 'altar', [2, 4], { relic: relics[0], taken: null });
  place(0.56, 'altar', [2, 4], { relic: relics[1], taken: null });
  place(0.74, 'altar', [2, 4], { relic: relics[2], taken: null });

  // Saltos largos, como serpientes y escaleras: águilas, gusanos y portales.
  const free = rng.shuffle(playable.filter((t) => t.dist > 2));
  const leap = (type, min, max, count) => {
    let made = 0;
    for (const a of free) {
      if (made >= count) break;
      if (a.content) continue;
      const to = free.find((b) => !b.content && b.dist - a.dist >= min && b.dist - a.dist <= max);
      if (!to) continue;
      a.content = { type, to: to.id };
      if (type === 'portal') to.content = { type, to: a.id };
      made++;
    }
  };
  const k = Math.max(2, Math.round(len / 9));
  leap('eagle', -8, -5, k);
  leap('worm', 4, 6, k);
  leap('portal', 3, 7, k);

  for (const t of playable) {
    if (t.content) continue;
    t.content = makeContent(rng, t);
  }
  start.revealed = castle.revealed = true;
  return board;
}
