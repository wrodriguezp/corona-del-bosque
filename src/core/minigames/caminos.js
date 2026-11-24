import { DT, base, clamp, emit, finish } from './kit.js';
import { steer } from './nuevos.js';

// Minijuegos de caminos y alturas: cruzar el camino encantado, trepar la enredadera
// y aguantar sobre un piso que se cae.

/* ---------- Cruza el camino: carretas, escobas y un arroyo ---------- */
// Una cuadrícula de filas: la orilla de salida (0), tres carriles con carretas de calabaza
// y escobas voladoras (1–3), un prado seguro (4), tres filas de arroyo con hojas
// flotantes (5–7) y la meta (8). Se avanza a saltitos con las flechas.
export const ROAD = { cols: 5, edge: 6.6, rows: 8, meadow: 4, hop: 0.16, time: 30, start: [-2, 2], lives: 7, goal: 5 };
const LANES = [
  { row: 1, kind: 'cart', len: 1.5, gap: 4.6, v: 1.6 },
  { row: 2, kind: 'broom', len: 1.1, gap: 3.3, v: -2.3 },
  { row: 3, kind: 'cart', len: 1.9, gap: 5.2, v: 1.2 },
  { row: 5, kind: 'leaf', len: 2.6, gap: 4.2, v: -1.1 },
  { row: 6, kind: 'leaf', len: 2.0, gap: 3.6, v: 1.5 },
  { row: 7, kind: 'leaf', len: 2.8, gap: 4.4, v: -1.3 },
];
const wrap = (x) => { const w = ROAD.edge * 2; return ((((x + ROAD.edge) % w) + w) % w) - ROAD.edge; };

// Dónde está cada cosa del carril en el instante t (sirve también para ayudar a los bots).
export function laneItems(s, lane, t = s.t) {
  const L = s.lanes[lane];
  return L.offs.map((o) => wrap(o + L.pos + (L.speed ?? L.v) * (t - s.t)));
}
// ¿Pisar (x, fila) en el instante t es seguro?
export function safeAt(s, row, x, t = s.t) {
  const i = s.lanes.findIndex((L) => L.row === row);
  if (i < 0) return Math.abs(x) <= ROAD.cols + 0.5;
  const L = s.lanes[i], xs = laneItems(s, i, t);
  if (L.kind === 'leaf') return xs.some((c) => Math.abs(x - c) < L.len / 2 + 0.1);
  return !xs.some((c) => Math.abs(x - c) < L.len / 2 + 0.3);
}

function makeCruce(team) {
  return {
    create(seed) {
      const s = { ...base(seed), left: ROAD.time, lives: ROAD.lives, crossed: 0 };
      s.lanes = LANES.map((L) => {
        const n = Math.ceil((ROAD.edge * 2) / (L.len + L.gap)), step = (ROAD.edge * 2) / n;
        return { ...L, pos: s.rng.next() * step, offs: Array.from({ length: n }, (_, j) => j * step + (s.rng.next() - 0.5) * step * 0.3) };
      });
      s.p = ROAD.start.map((x) => ({ x, row: 0, hop: 0, out: 0, best: 0 }));
      return s;
    },
    step(s, pads) {
      s.t += DT; s.left = Math.max(0, ROAD.time - s.t);
      // De fácil a difícil: todo se mueve más rápido con el tiempo.
      const k = Math.min(1, s.t / (ROAD.time * 0.85)), speed = 0.7 + 0.65 * k;
      for (const L of s.lanes) L.pos = wrap(L.pos + L.v * speed * DT);
      for (const L of s.lanes) L.speed = L.v * speed;
      s.p.forEach((p, i) => {
        if (p.out > 0) { p.out -= DT; if (p.out <= 0) emit(s, 'back', { p: i }); return; }
        p.hop = Math.max(0, p.hop - DT);
        const d = pads[i].d;
        if (d != null && !p.hop) {
          const row = clamp(p.row + (d === 0 ? 1 : d === 2 ? -1 : 0), 0, ROAD.rows), x = clamp(Math.round(p.x) + (d === 1 ? 1 : d === 3 ? -1 : 0), -ROAD.cols, ROAD.cols);
          if (row !== p.row || x !== p.x) { p.row = row; p.x = x; p.hop = ROAD.hop; emit(s, 'hop', { p: i, row, x }); }
        }
        const lane = s.lanes.find((L) => L.row === p.row);
        if (lane?.kind === 'leaf' && !p.hop) p.x += lane.speed * DT; // la hoja te lleva
        if (p.row > p.best) p.best = p.row;
        if (p.hop) return;
        if (Math.abs(p.x) > ROAD.cols + 0.6 || !safeAt(s, p.row, p.x)) return fall(s, p, i, lane?.kind === 'leaf' ? 'splash' : 'bump');
        if (p.row === ROAD.rows) {
          s.score[i]++; s.crossed++;
          emit(s, 'cross', { p: i, n: s.score[i] });
          Object.assign(p, { row: 0, x: ROAD.start[i], best: 0, hop: 0.3 });
          if (team && s.crossed >= ROAD.goal) end(s, true);
        }
      });
      if (s.done) return;
      if (team && s.lives <= 0) return end(s, false);
      if (s.left <= 0) {
        if (team) return end(s, false);
        // Si cruzaron las mismas veces, gana quien quedó más adelante.
        const [a, b] = s.p.map((p, i) => s.score[i] * 100 + p.row);
        s.done = true; s.winner = a === b ? -1 : a > b ? 0 : 1;
      }
    },
  };
  function fall(s, p, i, how) {
    // Volver: al prado si ya lo habías pasado, si no a la salida.
    const row = p.row > ROAD.meadow ? ROAD.meadow : 0;
    emit(s, how, { p: i, x: p.x, row: p.row });
    Object.assign(p, { row, x: clamp(Math.round(p.x), -ROAD.cols, ROAD.cols), out: 0.7, hop: 0 });
    if (team) s.lives--;
  }
}
const end = (s, won) => { s.done = true; s.won = won; s.winner = won ? -1 : -2; emit(s, won ? 'saved' : 'lost'); };

const cruceRules = makeCruce(false);
export const cruce = {
  name: 'Cruza el camino', icon: 'boot', input: 'dirs', time: ROAD.time, ...cruceRules,
  goal: ['Hay que cruzar al otro lado: primero un camino con carretas de calabaza y escobas voladoras, después un prado y al final un arroyo con hojas flotantes.', 'Avanza a saltitos con tus flechas. En el camino esquiva carretas y escobas; en el arroyo salta solo sobre las hojas (te llevan con la corriente).', 'Si te choca algo o caes al agua, vuelves atrás (al prado si ya lo pasaste). Cada vez que llegas a la otra orilla ganas 1 punto. Gana quien cruce más veces.'],
};
const teamRules = makeCruce(true);
export const cruceq = {
  name: 'Cruzar juntos', icon: 'boot', input: 'dirs', time: ROAD.time, team: true, ...teamRules,
  goal: ['Juegan en equipo. Hay que cruzar al otro lado: un camino con carretas y escobas, un prado y un arroyo con hojas flotantes.', 'Avancen a saltitos con sus flechas. En el camino esquiven carretas y escobas; en el arroyo salten solo sobre las hojas.', `Entre los dos tienen que cruzar ${ROAD.goal} veces. Comparten ${ROAD.lives} vidas: cada choque o caída al agua gasta una. Si se acaban las vidas o el tiempo, gana la Sombra.`],
};

/* ---------- La enredadera: carrera de escalada a puro tino ---------- */
// Cada quien trepa una enredadera mágica. Una manito va y viene sobre la rama; hay que
// pulsar justo cuando pasa por la próxima hoja para agarrarse y subir. Si fallas, resbalas
// una hoja. Las dos enredaderas tienen las mismas hojas: es parejo.
export const VINE = { goal: 14, zone: 0.17, time: 32, stun: 0.45, speed: [1.5, 3.2] };
export const enreda = {
  name: 'La enredadera', icon: 'tree', input: 'button', time: VINE.time,
  goal: ['Cada quien trepa una enredadera mágica gigante. Sobre ella, una manito va y viene de lado a lado, y arriba brilla la próxima hoja.', 'Pulsa justo cuando la manito pase por la hoja brillante: te agarras y subes. Cuanto más alto, más rápido se mueve la manito.', `Si pulsas fuera de la hoja, resbalas una hoja hacia abajo. Gana quien llegue primero a la cima (${VINE.goal} hojas) o quien esté más alto al acabarse el tiempo.`],
  create(seed) {
    const s = { ...base(seed), left: VINE.time };
    s.grips = Array.from({ length: VINE.goal + 1 }, () => (s.rng.next() * 2 - 1) * 0.72);
    s.p = [0, 1].map(() => ({ h: 0, ph: 0, stun: 0 }));
    return s;
  },
  // Dónde está la manito de cada quien (−1 a 1).
  hand: (p) => Math.sin(p.ph),
  step(s, pads) {
    s.t += DT; s.left = Math.max(0, VINE.time - s.t);
    s.p.forEach((p, i) => {
      if (p.stun > 0) { p.stun -= DT; return; }
      const k = p.h / VINE.goal;
      p.ph += (VINE.speed[0] + (VINE.speed[1] - VINE.speed[0]) * k) * DT;
      if (!pads[i].a) return;
      const off = Math.abs(enreda.hand(p) - s.grips[p.h]);
      if (off <= VINE.zone) {
        p.h++; s.score[i] = p.h;
        emit(s, 'grab', { p: i, h: p.h, good: off < VINE.zone * 0.4 });
      } else {
        p.h = Math.max(0, p.h - 1); s.score[i] = p.h; p.stun = VINE.stun;
        emit(s, 'slip', { p: i, h: p.h });
      }
    });
    const top = s.p.findIndex((p) => p.h >= VINE.goal);
    if (top >= 0) { s.done = true; s.winner = s.p.every((p) => p.h >= VINE.goal) ? -1 : top; emit(s, 'top', { p: top }); return; }
    if (s.left <= 0) finish(s);
  },
};

/* ---------- El piso que se cae: juntar estrellas sobre baldosas ---------- */
// Una plaza de 5 × 5 baldosas flotando sobre el vacío. Algunas tiemblan y luego caen un
// rato. Entre los dos juntan estrellas; quien queda sobre una baldosa que cae, pierde
// una vida del equipo y reaparece.
export const FLOOR = { n: 5, size: 1.35, time: 30, goal: 12, pause: 0.45, lives: 4, speed: 3.6, grip: 0.2, touch: 0.55, gone: 2.4, back: 1 };
export const piso = {
  name: 'El piso que se cae', icon: 'star', input: 'move2', time: FLOOR.time, team: true,
  goal: ['Juegan en equipo. Están en una plaza de baldosas que flota en el aire, y aparecen estrellas sobre ellas.', 'Muevan a sus personajes para juntar estrellas. Cuando una baldosa tiembla, va a caer: salgan de ella. Al rato vuelve a su lugar.', `Entre los dos tienen que juntar ${FLOOR.goal} estrellas. Si alguien cae, pierden 1 de sus ${FLOOR.lives} vidas. Si se acaban las vidas o el tiempo, gana la Sombra.`],
  create(seed) {
    const s = { ...base(seed), left: FLOOR.time, lives: FLOOR.lives, got: 0, next: 2.2, stars: [], id: 0, wait: 0 };
    s.tiles = Array.from({ length: FLOOR.n * FLOOR.n }, () => ({ st: 'ok', t: 0 }));
    s.p = [-1, 1].map((k) => ({ x: k * FLOOR.size, y: 0, vx: 0, vy: 0, out: 0 }));
    piso.star(s);
    return s;
  },
  // Centro de la baldosa i y baldosa bajo un punto.
  at: (i) => ({ x: ((i % FLOOR.n) - (FLOOR.n - 1) / 2) * FLOOR.size, y: (Math.floor(i / FLOOR.n) - (FLOOR.n - 1) / 2) * FLOOR.size }),
  tileOf(x, y) {
    const c = Math.round(x / FLOOR.size + (FLOOR.n - 1) / 2), r = Math.round(y / FLOOR.size + (FLOOR.n - 1) / 2);
    return c < 0 || r < 0 || c >= FLOOR.n || r >= FLOOR.n ? -1 : r * FLOOR.n + c;
  },
  star(s) {
    const used = new Set(s.stars.map((q) => q.tile).concat(s.p.map((p) => piso.tileOf(p.x, p.y))));
    const free = s.tiles.map((t, i) => i).filter((i) => s.tiles[i].st === 'ok' && !used.has(i));
    if (!free.length) return;
    const tile = s.rng.pick(free);
    s.stars.push({ id: s.id++, tile, ...piso.at(tile) });
  },
  step(s, pads) {
    s.t += DT; s.left = Math.max(0, FLOOR.time - s.t);
    const k = Math.min(1, s.t / (FLOOR.time * 0.8)), warn = 1.35 - 0.5 * k;
    // Oleadas: cada vez más baldosas y con menos aviso.
    s.next -= DT;
    if (s.next <= 0) {
      s.next = 2.6 - 1 * k + s.rng.next() * 0.6;
      const ok = s.tiles.map((t, i) => i).filter((i) => s.tiles[i].st === 'ok' && !s.stars.some((q) => q.tile === i));
      const n = Math.min(ok.length - 4, 3 + Math.round(5 * k));
      s.rng.shuffle(ok).slice(0, Math.max(0, n)).forEach((i) => { s.tiles[i] = { st: 'warn', t: warn }; });
      emit(s, 'wave', { n });
    }
    s.tiles.forEach((t, i) => {
      if (t.st === 'ok') return;
      t.t -= DT;
      if (t.t > 0) return;
      if (t.st === 'warn') { t.st = 'gone'; t.t = FLOOR.gone; emit(s, 'drop', { i }); }
      else { t.st = 'ok'; emit(s, 'rise', { i }); }
    });
    s.p.forEach((p, i) => {
      if (p.out > 0) {
        p.out -= DT;
        if (p.out <= 0) { const safe = s.tiles.map((t, j) => j).filter((j) => s.tiles[j].st === 'ok'); const at = piso.at(s.rng.pick(safe.length ? safe : [12])); Object.assign(p, { x: at.x, y: at.y, vx: 0, vy: 0 }); emit(s, 'back', { p: i }); }
        return;
      }
      steer(p, pads[i], FLOOR.speed, FLOOR.grip);
      const lim = (FLOOR.n / 2) * FLOOR.size - 0.25;
      p.x = clamp(p.x, -lim, lim); p.y = clamp(p.y, -lim, lim);
      const tile = piso.tileOf(p.x, p.y);
      if (tile >= 0 && s.tiles[tile].st === 'gone') { s.lives--; p.out = FLOOR.back; emit(s, 'fall', { p: i, x: p.x, y: p.y, lives: s.lives }); return; }
      for (const q of s.stars) if (!q.gone && Math.hypot(q.x - p.x, q.y - p.y) < FLOOR.touch) { q.gone = true; s.got++; s.score[i]++; emit(s, 'star', { p: i, x: q.x, y: q.y, n: s.got }); }
    });
    // Una estrella sobre una baldosa que cae se va con ella.
    for (const q of s.stars) if (!q.gone && s.tiles[q.tile].st === 'gone') { q.gone = true; q.lost = true; }
    // Hay una estrella a la vez; la siguiente aparece al rato en otra baldosa.
    if (s.stars.some((q) => q.gone)) { s.stars = s.stars.filter((q) => !q.gone); s.wait = FLOOR.pause; }
    if (!s.stars.length && (s.wait -= DT) <= 0) piso.star(s);
    if (s.got >= FLOOR.goal) return end(s, true);
    if (s.lives <= 0 || s.left <= 0) end(s, false);
  },
};
