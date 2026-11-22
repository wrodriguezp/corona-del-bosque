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
      links: [], kind: 'path', content: null, revealed: false, seen: false, clue: null,
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

  const relink = () => {
    for (const t of tiles)
      t.links = t.kind !== 'path' ? [] : neighborCoords(t.c, t.row)
        .map(([c, r]) => byKey.get(key(c, r)))
        .filter((n) => n && n.kind === 'path').map((n) => n.id);
  };
  relink();
  const board = { seed, len, tiles, startId: start.id, castleId: castle.id, byKey };
  const connected = () => {
    const walk = tiles.filter((t) => t.kind === 'path').length;
    return bfs(board, start.id).dist.size === walk;
  };

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
    relink();
    if (!connected()) {
      blob.forEach((b) => (b.kind = 'path'));
      relink();
    }
  }

  const dCastle = bfs(board, castle.id).dist;
  const dStart = bfs(board, start.id).dist;
  board.length = dCastle.get(start.id);
  for (const t of tiles) {
    t.dist = dCastle.get(t.id) ?? null;
    t.detour = t.dist == null ? 0 : t.dist + dStart.get(t.id) - board.length;
  }

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

  // Contenidos: los atajos son peligrosos, los rodeos dan más gemas.
  const playable = tiles.filter((t) => t.kind === 'path' && t !== start && t !== castle && dStart.get(t.id) > 1);
  const free = rng.shuffle(playable.filter((t) => t.dist > 1));
  let pairs = 0;
  for (let i = 0; i < free.length && pairs < 4; i++) {
    const a = free[i];
    if (a.content) continue;
    const b = free.find((x) => !x.content && x !== a && Math.abs(x.dist - a.dist) >= 4 && Math.abs(x.dist - a.dist) <= 8);
    if (!b) continue;
    a.content = { type: 'portal', to: b.id };
    b.content = { type: 'portal', to: a.id };
    pairs++;
  }
  for (const t of playable) {
    if (t.content) continue;
    const direct = t.detour <= 1;
    const type = rng.weighted(direct
      ? { gem: 26, trap: 24, chest: 13, shrine: 7, calm: 30 }
      : { gem: 46, trap: 13, chest: 16, shrine: 9, calm: 16 });
    if (type === 'gem') t.content = { type, n: direct ? rng.int(1, 3) : rng.int(2, 5) };
    else if (type === 'trap') t.content = { type, trap: rng.pick(['pozo', 'zarzas', 'duende']) };
    else t.content = { type };
  }

  // Pistas a través de la niebla: casi siempre dicen la verdad… casi.
  for (const t of playable) {
    const honest = { gem: 'brillo', chest: 'brillo', shrine: 'brillo', trap: 'humo', portal: 'remolino', calm: null }[t.content.type];
    t.clue = honest;
    if (t.content.type === 'trap' && rng.chance(0.25)) t.clue = 'brillo';
    if (t.content.type === 'gem' && rng.chance(0.15)) t.clue = 'humo';
    if (t.content.type === 'calm' && rng.chance(0.25)) t.clue = 'humo';
  }
  start.revealed = castle.revealed = true;
  return board;
}
