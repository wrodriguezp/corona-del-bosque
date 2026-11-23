import { bfs } from './board.js';

// La Sombra que avanza y las criaturas que vagan por el tablero. Todo sale de g.rng,
// así que la partida se repite igual al reanudar.

/* ---------- La Sombra ---------- */
// Avanza desde la salida y se acelera. `front` cuenta casillas desde la salida:
// cubre todo lo que está a menos de `front` pasos del comienzo del camino.
export const SHADE = { from: 6, speed: 1.0, accel: 0.05, gems: 3, spit: 2, stop: 4 };

export const shadeFront = (g) => {
  const k = g.turns - SHADE.from;
  return k <= 0 ? 0 : Math.min(g.board.length - SHADE.stop, Math.floor(k * SHADE.speed + SHADE.accel * k * k));
};

// Cuántos pasos lleva recorridos esta casilla desde la salida.
export const progress = (g, t) => (t.dist == null ? null : g.board.length - t.dist);
export const shaded = (g, t) => g.shade > 0 && t.dist != null && progress(g, t) < g.shade;

export function shadeTick(g, ev) {
  const front = shadeFront(g);
  if (front <= g.shade) return;
  const first = g.shade === 0;
  g.shade = front;
  ev.push({ t: 'shade', front });
  if (first) g.msg(ev, 'omen', 'La Sombra despierta', 'Desde la salida avanza una sombra, cada vez más rápido. Si te alcanza, te quita gemas y te escupe hacia adelante.', false, `Si te alcanza: pierdes hasta ${SHADE.gems} gemas (el escudo protege) y sales ${SHADE.spit} casillas por delante de ella`);
  for (const c of [...g.critters]) if (shaded(g, g.tile(c.tile))) gone(g, ev, c);
  for (const p of g.players) {
    if (p.arrived || !shaded(g, g.tile(p.tile))) continue;
    ev.push({ t: 'shadeCatch', p: p.id });
    g.msg(ev, 'omen', `¡La Sombra alcanzó a ${p.name}!`, `Te quita hasta ${SHADE.gems} gemas y te escupe hacia adelante.`, true);
    if (!g.shielded(ev, p, 'La Sombra')) g.addGems(ev, p, -SHADE.gems, 'lost');
    g.shove(ev, p, g.shade + SHADE.spit - progress(g, g.tile(p.tile)));
  }
}

/* ---------- Criaturas ---------- */
export const CRITTERS = {
  conejo: { good: true, icon: 'again', title: '¡Un conejo guía!', text: 'Te enseña un atajo: tu próxima tirada vale 2 más.' },
  hada: { good: true, icon: 'star', title: '¡Un hada del bosque!', text: 'Te regala una carta.' },
  lobo: { good: false, icon: 'moon', title: '¡Un lobo!', text: 'Te muerde la bolsa: pierdes hasta 3 gemas.' },
  troll: { good: false, icon: 'duel', title: '¡El troll te cierra el paso!', text: 'Te detienes aquí y le pagas 2 gemas de peaje.' },
};
export const CRITTER = { max: 4, spawn: 0.4, from: 2, near: [3, 8], wolf: 3, toll: 2, rabbit: 2 };
const WEIGHTS = { day: { conejo: 3, hada: 2, lobo: 1, troll: 2 }, night: { conejo: 1, hada: 2, lobo: 4, troll: 1 } };
const LEAPS = ['portal', 'eagle', 'worm', 'shop', 'cave'];

export const critterAt = (g, id) => g.critters.find((c) => c.tile === id);

// Casilla donde puede pararse una criatura.
function free(g, t) {
  return t.kind === 'path' && t.id !== g.board.startId && t.id !== g.board.castleId && !t.landmark && !LEAPS.includes(t.content?.type)
    && !shaded(g, t) && !critterAt(g, t.id) && !g.players.some((p) => p.tile === t.id);
}

function gone(g, ev, c) {
  g.critters.splice(g.critters.indexOf(c), 1);
  ev.push({ t: 'critterGone', id: c.id });
}

function spawn(g, ev) {
  const open = g.players.filter((p) => !p.arrived);
  if (!open.length || g.critters.length >= CRITTER.max || !g.rng.chance(CRITTER.spawn)) return;
  const p = g.rng.pick(open), { dist } = bfs(g.board, p.tile), d0 = g.tile(p.tile).dist;
  const spots = g.board.tiles.filter((t) => t.seen && free(g, t) && t.dist < d0 && dist.get(t.id) >= CRITTER.near[0] && dist.get(t.id) <= CRITTER.near[1]);
  if (!spots.length) return;
  const kind = g.rng.weighted(WEIGHTS[g.night ? 'night' : 'day']), c = { id: g.critterId++, kind, tile: g.rng.pick(spots).id };
  g.critters.push(c);
  ev.push({ t: 'critter', ...c });
  if (!g.metCritters) {
    g.metCritters = true;
    g.msg(ev, 'tree', 'Criaturas del bosque', 'Por el camino vagan criaturas. Algunas ayudan y otras estorban: pasar por su casilla basta para encontrarlas.', false, 'Conejo: +2 en tu próxima tirada · Hada: una carta · Lobo: −3 gemas · Troll: te detiene y cobra 2 gemas');
  }
}

// Cada criatura da un salto, o se queda quieta. De noche los lobos buscan a quien esté cerca.
function wander(g, ev) {
  const moves = [];
  for (const c of g.critters) {
    const t = g.tile(c.tile), next = g.board.around(t).filter((n) => free(g, n));
    if (!next.length) continue;
    let to = null;
    if (c.kind === 'lobo' && g.night) {
      const prey = g.players.filter((p) => !p.arrived).map((p) => bfs(g.board, p.tile).dist);
      const near = (n) => Math.min(...prey.map((d) => d.get(n.id) ?? 99));
      const best = next.reduce((a, b) => (near(b) < near(a) ? b : a));
      if (near(best) < near(t) && near(t) <= 6) to = best;
    }
    if (!to && g.rng.chance(0.5)) to = g.rng.pick(next);
    if (!to) continue;
    moves.push({ id: c.id, from: c.tile, to: to.id });
    c.tile = to.id;
  }
  if (moves.length) ev.push({ t: 'critterMove', moves });
}

export function critterTick(g, ev) {
  if (g.turns < CRITTER.from) return;
  wander(g, ev);
  spawn(g, ev);
}

// Al pasar por la casilla de una criatura. Devuelve true si el turno se detiene ahí.
export function meet(g, ev, p, c) {
  const k = CRITTERS[c.kind];
  g.critters.splice(g.critters.indexOf(c), 1);
  ev.push({ t: 'meet', id: c.id, kind: c.kind, p: p.id, good: k.good });
  g.msg(ev, k.icon, k.title, k.text, true);
  if (c.kind === 'conejo') { p.fx.plus += CRITTER.rabbit; return false; }
  if (c.kind === 'hada') { g.giveCard(ev, p); return false; }
  if (g.shielded(ev, p, c.kind === 'lobo' ? 'El lobo' : 'El troll')) return false;
  g.addGems(ev, p, c.kind === 'lobo' ? -CRITTER.wolf : -CRITTER.toll, 'lost');
  return c.kind === 'troll';
}
