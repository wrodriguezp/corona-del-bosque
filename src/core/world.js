import { bfs, makeContent, measure, relink, isConnected } from './board.js';
import { critterTick, shadeTick } from './critters.js';

// El mundo vivo: día, noche y eventos que cambian el tablero. Todo sale del azar de
// la partida (g.rng), así que se repite igual al reanudar.

export const DAY = { len: 10, night: 6 }; // turnos del ciclo; de noche desde el turno `night`
export const NIGHT = { gem: 2, trap: 2, rest: 3 };
export const WARNING = 2; // turnos entre el presagio y el evento
export const BURN = 5;
const SOON = `Quedan ${WARNING} turnos, contando este. Después,`;

const LEAPS = ['portal', 'eagle', 'worm'];
const open = (g) => g.players.filter((p) => !p.arrived);
const near = (g, t, d) => open(g).some((p) => Math.abs(g.tile(p.tile).c - t.c) <= d);

// Casillas que se pueden transformar sin romper saltos, lugares ni a nadie encima.
function loose(g) {
  const targets = new Set(g.board.tiles.map((t) => t.content?.to).filter((x) => x != null));
  return g.board.tiles.filter((t) => t.kind === 'path' && t.id !== g.board.startId && t.id !== g.board.castleId && t.dist > 2 && !t.landmark
    && !LEAPS.includes(t.content?.type) && !targets.has(t.id) && t.snare == null && !t.star && !g.players.some((p) => p.tile === t.id) && !g.critters.some((c) => c.tile === t.id));
}

const lakes = (g) => {
  const out = new Set(), isLake = (t) => t.kind === 'lake' && !t.outer;
  let grew = true;
  while (grew) {
    grew = false;
    for (const t of g.board.tiles) {
      if (!isLake(t) || out.has(t.id)) continue;
      if (g.board.around(t).some((n) => n.kind === 'path' || out.has(n.id))) { out.add(t.id); grew = true; }
    }
  }
  return [...out].map((id) => g.tile(id));
};

const groves = (g) => g.board.tiles.filter((t) => t.kind === 'grove' && !t.outer && t.c > 1 && near(g, t, 8) && g.board.around(t).some((n) => n.kind === 'path'));

function starSpots(g) {
  const ids = new Set();
  for (const p of open(g)) {
    const { dist } = bfs(g.board, p.tile), d0 = g.tile(p.tile).dist;
    const list = g.board.tiles.filter((t) => t.kind === 'path' && t.dist > 0 && t.dist < d0 && dist.get(t.id) >= 2 && dist.get(t.id) <= 7 && !t.star && t.id !== g.board.startId);
    g.rng.shuffle(list).slice(0, 4).forEach((t) => ids.add(t.id));
  }
  return [...ids];
}

export const EVENTS = {
  sombra: {
    chip: 'Ataque de la Sombra', icon: 'omen',
    title: 'La Sombra ataca', omen: 'Una niebla oscura se acerca',
    warn: `${SOON} la Sombra atacará: jugarán juntos un minijuego. Si ganan, cada quien gana gemas; si pierden, la Sombra les quita gemas a los dos.`,
    can: (g) => g.first == null,
    prepare: () => ({}),
    run(g, ev) {
      ev.push({ t: 'shadow' });
      g.shadowAttack = true;
    },
  },
  dragon: {
    chip: 'Vuela el dragón', icon: 'flame',
    title: 'El dragón sale a volar', omen: 'Una sombra enorme',
    warn: `${SOON} el dragón quemará las casillas marcadas. Quien esté ahí perderá hasta ${BURN} gemas.`,
    can: (g) => open(g).length > 0,
    prepare(g) {
      const p = g.rng.pick(open(g)), { dist } = bfs(g.board, p.tile), d0 = g.tile(p.tile).dist;
      const ahead = g.board.tiles.filter((t) => t.kind === 'path' && t.dist > 1 && t.dist < d0 && dist.get(t.id) >= 2 && dist.get(t.id) <= 4);
      const c = ahead.length ? g.rng.pick(ahead).id : p.tile;
      return { zone: [...bfs(g.board, c).dist].filter(([id, d]) => d <= 2 && id !== g.board.startId && id !== g.board.castleId).map(([id]) => id) };
    },
    run(g, ev, { zone }) {
      ev.push({ t: 'flight', zone });
      for (const id of zone) g.tile(id).burnt = true;
      const hit = open(g).filter((p) => zone.includes(p.tile));
      for (const p of hit) {
        if (g.shielded(ev, p, 'Fuego de dragón')) continue;
        ev.push({ t: 'burn', p: p.id });
        g.addGems(ev, p, -BURN, 'lost');
      }
      const free = loose(g).filter((t) => zone.includes(t.id) && (!t.revealed || !t.content || t.content.type === 'visited'));
      const gold = g.rng.shuffle(free).slice(0, 2);
      for (const t of gold) { t.content = { type: 'gem', n: 4 }; t.revealed = true; t.seen = true; ev.push({ t: 'reveal', id: t.id }); }
      const who = hit.length ? hit.map((p) => p.name).join(' y ') : null;
      g.msg(ev, 'flame', who ? `¡El fuego alcanzó a ${who}!` : 'El dragón se va volando', gold.length ? 'Se le cayeron gemas entre las cenizas: ya se ven en el tablero.' : 'Solo quedan cenizas.', true);
    },
  },
  bosque: {
    chip: 'Camina el bosque', icon: 'tree',
    title: 'El bosque camina', omen: 'Los árboles murmuran',
    warn: `${SOON} los árboles cambiarán de sitio: se abrirán y cerrarán caminos.`,
    can: (g) => groves(g).length > 0,
    prepare: () => ({}),
    run(g, ev) {
      const moves = [];
      for (const a of g.rng.shuffle(groves(g))) {
        if (moves.length >= 4) break;
        const options = g.rng.shuffle(loose(g).filter((t) => { const d = Math.hypot(t.x - a.x, t.z - a.z); return d > 1 && d < 8 && near(g, t, 8) && !moves.some((m) => m.from === t.id); }));
        a.kind = 'path';
        const b = options.find((t) => {
          t.kind = 'grove'; relink(g.board);
          if (isConnected(g.board)) return true;
          t.kind = 'path';
          return false;
        });
        if (!b) { a.kind = 'grove'; relink(g.board); continue; }
        Object.assign(b, { content: null, revealed: false });
        Object.assign(a, { seen: true, revealed: false });
        moves.push({ from: a.id, to: b.id });
      }
      measure(g.board);
      for (const m of moves) g.tile(m.from).content = makeContent(g.rng, g.tile(m.from));
      ev.push({ t: 'forest', moves });
      g.msg(ev, 'tree', 'El bosque cambió', moves.length ? 'Donde había árboles ahora hay camino, y al revés.' : 'Los árboles solo se estiraron un poco.', true);
    },
  },
  eclipse: {
    chip: 'Eclipse', icon: 'omen',
    title: 'Eclipse mágico', omen: 'El cielo se oscurece',
    warn: `${SOON} habrá eclipse: la siguiente tirada de cada quien usará dos dados.`,
    can: () => true,
    prepare: () => ({}),
    run(g, ev) {
      ev.push({ t: 'eclipse' });
      for (const p of open(g)) p.fx.double = true;
      g.msg(ev, 'omen', 'Eclipse mágico', 'La siguiente tirada de cada quien usa dos dados y se suman.', true);
    },
  },
  helada: {
    chip: 'Gran helada', icon: 'snow',
    title: 'La gran helada', omen: 'Sopla un viento helado',
    warn: `${SOON} se congelarán los lagos y se podrá caminar sobre ellos.`,
    can: (g) => lakes(g).some((t) => near(g, t, 6)),
    prepare: () => ({}),
    run(g, ev) {
      const list = lakes(g);
      for (const t of list) Object.assign(t, { kind: 'path', ice: true, seen: true });
      relink(g.board); measure(g.board);
      for (const t of list) t.content = g.rng.chance(0.5) ? { type: 'gem', n: g.rng.int(3, 5) } : makeContent(g.rng, t);
      ev.push({ t: 'freeze', ids: list.map((t) => t.id) });
      g.msg(ev, 'snow', 'Los lagos se congelaron', 'Ya puedes caminar sobre el hielo. Dicen que esconde gemas.', true);
    },
  },
  estrellas: {
    chip: 'Lluvia de estrellas', icon: 'star',
    title: 'Lluvia de estrellas', omen: 'Luces en el cielo',
    warn: `${SOON} caerán estrellas al camino: ganas una por cada una que pises al pasar.`,
    can: (g) => open(g).length > 0,
    prepare: () => ({}),
    run(g, ev) {
      const ids = starSpots(g);
      for (const id of ids) g.tile(id).star = true;
      ev.push({ t: 'starfall', ids });
      g.msg(ev, 'star', 'Lluvia de estrellas', 'Pasa por encima de una estrella caída para quedártela.', true);
    },
  },
};

// Se llama al empezar cada turno normal.
export function worldTick(g, ev) {
  if (g.ticked === g.turns) return; // tras un torneo el mismo turno vuelve a empezar
  g.ticked = g.turns;
  const night = g.night;
  ev.push({ t: 'time', clock: g.turns % DAY.len, night, left: night ? DAY.len - (g.turns % DAY.len) : DAY.night - (g.turns % DAY.len), changed: night !== g.wasNight });
  if (night !== g.wasNight) {
    g.wasNight = night;
    g.nights += night ? 1 : 0;
    if (night && g.nights === 1) g.msg(ev, 'moon', 'Cae la noche', 'Todo brilla más, y muerde más.', false, `Casillas de gemas: +${NIGHT.gem} · Fogatas: +${NIGHT.rest} gemas · Trampas: quitan ${NIGHT.trap} gemas más · Cueva: menos riesgo · Se ve menos lejos`);
  }
  shadeTick(g, ev);
  critterTick(g, ev);
  if (g.omen && g.turns >= g.omen.at) {
    const { id, data } = g.omen;
    g.omen = null;
    g.nextEvent = g.turns + g.rng.int(5, 6);
    ev.push({ t: 'event', id });
    EVENTS[id].run(g, ev, data);
    ev.push({ t: 'eventEnd' });
  } else if (!g.omen && g.turns >= g.nextEvent - WARNING) {
    if (!g.deck.length) g.deck = g.rng.shuffle(Object.keys(EVENTS));
    const i = g.deck.findIndex((id) => EVENTS[id].can(g));
    if (i < 0) { g.deck = []; return; }
    const [id] = g.deck.splice(i, 1);
    g.omen = { id, at: g.turns + WARNING, data: EVENTS[id].prepare(g) };
    ev.push({ t: 'omen', id, left: WARNING, zone: g.omen.data.zone || null });
    g.msg(ev, 'omen', EVENTS[id].omen, EVENTS[id].warn);
  }
}
