import { DT, base, clamp, emit, finish } from './kit.js';
import { steer } from './nuevos.js';

// Minijuegos de la feria del bosque (V4.2): carrera de escobas, la garra del mercader,
// bolas de nieve, la catapulta mágica, el rey de la tortuga y el hockey de hongos.

/* ---------- La pista de escobas: un óvalo alrededor de un lago ---------- */
// Dos rectas (y = ±R) unidas por dos medias vueltas. Se corre en el sentido de las
// agujas del reloj visto desde arriba: por la recta de adelante hacia la derecha.
// `u` mide cuánto se avanzó por la línea del centro (de 0 a TRACK.len).
export const TRACK = {
  L: 2.6, R: 2.2, w: 0.95, laps: 3, speed: 4.6, grip: 0.07, body: 0.42, out: 1.1, time: 45, turbo: 0.8, cool: 1.2, pad: 0.55,
  mud: [{ u: 6.2, o: 0.3 }, { u: 18.6, o: -0.3 }],
  boost: [{ u: 3.4, o: 0 }, { u: 15.5, o: 0 }],
};
TRACK.len = 4 * TRACK.L + 2 * Math.PI * TRACK.R;

// Punto de la línea del centro: posición, dirección de avance (t) y hacia afuera (n).
export function trackAt(u) {
  const { L, R, len } = TRACK;
  u = ((u % len) + len) % len;
  if (u < 2 * L) return { x: -L + u, y: R, tx: 1, ty: 0, nx: 0, ny: 1 };
  if (u < 2 * L + Math.PI * R) { const a = Math.PI / 2 - (u - 2 * L) / R; return { x: L + R * Math.cos(a), y: R * Math.sin(a), tx: Math.sin(a), ty: -Math.cos(a), nx: Math.cos(a), ny: Math.sin(a) }; }
  if (u < 4 * L + Math.PI * R) return { x: L - (u - 2 * L - Math.PI * R), y: -R, tx: -1, ty: 0, nx: 0, ny: -1 };
  const a = -Math.PI / 2 - (u - 4 * L - Math.PI * R) / R;
  return { x: -L + R * Math.cos(a), y: R * Math.sin(a), tx: Math.sin(a), ty: -Math.cos(a), nx: Math.cos(a), ny: Math.sin(a) };
}
// Cuánto se avanzó por la pista estando en (x, y).
export function trackU(x, y) {
  const { L, R } = TRACK;
  if (Math.abs(x) <= L) return y >= 0 ? x + L : 2 * L + Math.PI * R + (L - x);
  if (x > L) return 2 * L + (Math.PI / 2 - Math.atan2(y, x - L)) * R;
  const th = Math.atan2(y, x + L), f = th <= -Math.PI / 2 ? -Math.PI / 2 - th : 1.5 * Math.PI - th;
  return 4 * L + Math.PI * R + f * R;
}
// Distancia a la línea del centro: positiva hacia afuera (barranco), negativa hacia el lago.
export function trackOff(x, y) {
  const { L, R } = TRACK;
  return (Math.abs(x) <= L ? Math.abs(y) : Math.hypot(Math.abs(x) - L, y)) - R;
}
const spot = (q) => { const c = trackAt(q.u); return { x: c.x + c.nx * q.o, y: c.y + c.ny * q.o }; };
export const MUD = TRACK.mud.map(spot), BOOST = TRACK.boost.map(spot);

// Reglas de la carrera, para dos o en equipo (contra el carruaje del Rey).
export function makeRace(team) {
  const R = {
    create(seed) {
      const s = { ...base(seed), left: team ? TEAM_RACE.time : TRACK.time, laps: 0 };
      // Quién sale por dentro lo decide el azar.
      const inner = s.rng.chance(0.5) ? 1 : -1;
      s.p = [0.4 * inner, -0.4 * inner].map((o) => { const c = trackAt(-0.6); return { x: c.x + c.nx * o, y: c.y + c.ny * o, vx: 0, vy: 0, u: TRACK.len - 0.6, prog: -0.6, laps: 0, out: 0, turbo: 0, cool: 0, mud: false }; });
      if (team) s.cart = { u: -2.2, prog: -2.2, v: TEAM_RACE.cart[0] };
      return s;
    },
    step(s, pads) {
      s.t += DT; const T = team ? TEAM_RACE.time : TRACK.time;
      s.left = Math.max(0, T - s.t);
      const k = Math.min(1, s.t / (T * 0.8));
      if (team) {
        const c = s.cart;
        c.v = TEAM_RACE.cart[0] + (TEAM_RACE.cart[1] - TEAM_RACE.cart[0]) * k;
        c.prog += c.v * DT; c.u = c.prog;
        const at = trackAt(c.u); c.x = at.x; c.y = at.y;
      }
      s.p.forEach((p, i) => {
        if (p.out > 0) {
          p.out -= DT;
          if (p.out <= 0) { const c = trackAt(p.u - 0.8); Object.assign(p, { x: c.x, y: c.y, vx: 0, vy: 0, u: trackU(c.x, c.y), turbo: 0 }); p.prog -= 0.8; emit(s, 'back', { p: i }); }
          return;
        }
        p.turbo = Math.max(0, p.turbo - DT); p.cool = Math.max(0, p.cool - DT);
        p.mud = MUD.some((m) => Math.hypot(m.x - p.x, m.y - p.y) < TRACK.pad);
        steer(p, pads[i], TRACK.speed * (p.turbo > 0 ? 1.6 : 1) * (p.mud ? 0.45 : 1), TRACK.grip);
        if (p.cool <= 0 && BOOST.some((b) => Math.hypot(b.x - p.x, b.y - p.y) < TRACK.pad)) {
          const c = trackAt(p.u);
          p.turbo = TRACK.turbo; p.cool = TRACK.cool; p.vx += c.tx * 3; p.vy += c.ty * 3;
          emit(s, 'boost', { p: i, x: p.x, y: p.y });
        }
      });
      // Choques entre escobas: quien llega más rápido empuja más.
      const [a, b] = s.p;
      if (!a.out && !b.out) bump(s, a, b, TRACK.body);
      if (team) for (const [i, p] of s.p.entries()) {
        if (p.out || Math.hypot(p.x - s.cart.x, p.y - s.cart.y) > TEAM_RACE.hit) continue;
        p.out = TRACK.out; p.u = trackU(p.x, p.y);
        emit(s, 'knock', { p: i, x: p.x, y: p.y });
      }
      s.p.forEach((p, i) => {
        if (p.out > 0) return;
        const off = trackOff(p.x, p.y);
        if (Math.abs(off) > TRACK.w) { p.out = TRACK.out; emit(s, 'fall', { p: i, x: p.x, y: p.y, lake: off < 0 }); return; }
        const u = trackU(p.x, p.y);
        let d = u - p.u;
        if (d < -TRACK.len / 2) d += TRACK.len;
        if (d > TRACK.len / 2) d -= TRACK.len;
        p.prog += d; p.u = u;
        const laps = Math.max(0, Math.floor(p.prog / TRACK.len));
        if (laps > p.laps) { p.laps = laps; s.score[i] = team ? s.score[i] + 1 : laps; s.laps++; emit(s, 'lap', { p: i, n: team ? s.laps : laps }); }
      });
      if (team) {
        if (s.laps >= TEAM_RACE.goal) return end(s, true);
        if (s.cart.prog >= TEAM_RACE.cartLaps * TRACK.len || s.left <= 0) return end(s, false);
        return;
      }
      const won = s.p.map((p, i) => (p.laps >= TRACK.laps ? i : -1)).filter((i) => i >= 0);
      if (won.length || s.left <= 0) {
        s.done = true;
        const [x, y] = s.p.map((p) => p.prog);
        s.winner = Math.abs(x - y) < 0.01 ? -1 : x > y ? 0 : 1;
        emit(s, 'finish', { w: s.winner });
      }
    },
  };
  return R;
}
export const TEAM_RACE = { time: 40, goal: 6, cartLaps: 3, cart: [3.2, 5.4], hit: 0.85 };

// Choque entre dos cuerpos redondos que se deslizan (escobas, tortuga).
export function bump(s, a, b, body, extra = 0.6, loud = 0.5) {
  const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001;
  if (d >= body * 2) return false;
  const nx = dx / d, ny = dy / d, over = (body * 2 - d) / 2;
  a.x -= nx * over; a.y -= ny * over; b.x += nx * over; b.y += ny * over;
  const va = a.vx * nx + a.vy * ny, vb = b.vx * nx + b.vy * ny, hit = va - vb;
  if (hit <= 0) return false;
  const k = 1.1 + Math.min(0.4, hit * 0.05), na = vb * k - extra, nb = va * k + extra;
  a.vx += (na - va) * nx; a.vy += (na - va) * ny;
  b.vx += (nb - vb) * nx; b.vy += (nb - vb) * ny;
  if (hit > loud && s.t - (s.bumpT ?? -1) > 0.3) { s.bumpT = s.t; emit(s, 'bump', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, n: hit }); }
  return true;
}
const end = (s, won) => { s.done = true; s.won = won; s.winner = won ? -1 : -2; emit(s, won ? 'saved' : 'lost'); };

export const escobas = {
  name: 'Carrera de escobas', icon: 'eagle', input: 'move2', time: TRACK.time, ...makeRace(false),
  goal: ['Cada quien vuela una escoba en una pista alrededor de un lago. Las escobas resbalan al doblar, como autitos chocones.', 'Muévete hacia donde quieres ir y sigue la pista. Puedes chocar a tu rival para sacarlo. El barro frena y los hongos dorados te lanzan.', `Si te sales de la pista (al lago o al barranco) pierdes un momento. Gana quien dé ${TRACK.laps} vueltas primero.`],
};

/* ---------- La garra del mercader: cada quien su garra sobre el mismo montón ---------- */
// La garra va y viene sola por arriba. Al pulsar baja, agarra lo que tenga debajo y lo
// lleva a tu buzón. Si las dos agarran lo mismo, se lo queda la que quedó más centrada.
export const CLAW = { w: 3.6, chute: 4.5, time: 30, down: 0.55, up: 0.55, carry: 0.6, reach: 0.5, speed: [1.7, 3.3], n: 8, again: 0.8 };
export const PRIZES = { gem: { v: 1, slip: 0.08 }, egg: { v: 2, slip: 0.25 }, bunny: { v: 3, slip: 0.4 } };
export function pilePrize(s, x) {
  const kind = s.rng.weighted({ gem: 55, egg: 30, bunny: 15 });
  return { id: s.id++, kind, x: x ?? (s.rng.next() * 2 - 1) * CLAW.w, z: (s.rng.next() * 2 - 1) * 0.5, taken: null };
}
// ¿Se suelta? Más fácil si el premio es pesado o la garra quedó corrida.
const slipAt = (s, kind, off, reach) => (s.rng.chance(Math.min(0.85, PRIZES[kind].slip + (off / reach) * 0.4)) ? 0.15 + s.rng.next() * 0.8 : null);
export const garra = {
  name: 'La garra del mercader', icon: 'hand', input: 'button', time: CLAW.time,
  goal: ['Hay una máquina de garras llena de premios: gemas, huevos y conejos dormidos. Cada quien tiene su garra, que va y viene sola por arriba.', 'Pulsa tu botón cuando tu garra esté justo encima de un premio: baja, lo agarra y lo lleva a tu buzón. A veces se suelta en el camino.', 'Gema: 1 punto. Huevo: 2. Conejo: 3 (pesa más y se suelta más). Si las dos garras agarran lo mismo, se lo queda la más centrada. Gana quien junte más puntos.'],
  create(seed) {
    const s = { ...base(seed), left: CLAW.time, id: 0, prizes: [], wait: [] };
    // Repartidos parejo, para que ningún lado tenga más premios cerca.
    for (let j = 0; j < CLAW.n; j++) s.prizes.push(pilePrize(s, -CLAW.w + (j + 0.2 + s.rng.next() * 0.6) * ((CLAW.w * 2) / CLAW.n)));
    s.c = [-1, 1].map((k) => ({ x: k * CLAW.w * 0.85, dir: -k, st: 'move', t: 0, hold: null, off: 0, slip: null }));
    return s;
  },
  step(s, pads) {
    s.t += DT; s.left = Math.max(0, CLAW.time - s.t);
    const k = Math.min(1, s.t / CLAW.time), speed = CLAW.speed[0] + (CLAW.speed[1] - CLAW.speed[0]) * k;
    s.wait = s.wait.filter((w) => { if ((w.t -= DT) > 0) return true; s.prizes.push(pilePrize(s)); return false; });
    s.c.forEach((c, i) => {
      c.t += DT;
      if (c.st === 'move') {
        c.x += c.dir * speed * DT;
        if (Math.abs(c.x) > CLAW.w) { c.x = Math.sign(c.x) * CLAW.w; c.dir = -Math.sign(c.x); }
        if (pads[i].a && s.left > 0) { c.st = 'down'; c.t = 0; emit(s, 'drop', { p: i, x: c.x }); }
        return;
      }
      if (c.st === 'down' && c.t >= CLAW.down) {
        c.st = 'up'; c.t = 0;
        const q = s.prizes.filter((q) => q.taken !== i && Math.abs(q.x - c.x) < CLAW.reach).sort((a, b) => Math.abs(a.x - c.x) - Math.abs(b.x - c.x))[0];
        if (!q) return emit(s, 'miss', { p: i, x: c.x });
        const off = Math.abs(q.x - c.x);
        if (q.taken != null) {
          const o = s.c[q.taken];
          if (o.off <= off) return emit(s, 'tug', { p: i, w: q.taken, x: c.x });
          o.hold = null; o.slip = null; emit(s, 'tug', { p: i, w: i, x: c.x });
        }
        q.taken = i; c.hold = q; c.off = off; c.slip = slipAt(s, q.kind, off, CLAW.reach);
        emit(s, 'grab', { p: i, kind: q.kind, x: c.x });
        return;
      }
      if ((c.st === 'up' || c.st === 'carry') && c.hold && c.slip != null && (c.slip -= DT) <= 0) {
        const q = c.hold; c.hold = null; c.slip = null;
        q.taken = null; q.x = clamp(c.x, -CLAW.w, CLAW.w);
        emit(s, 'slip', { p: i, kind: q.kind, x: q.x });
      }
      if (c.st === 'up' && c.t >= CLAW.up) {
        if (!c.hold) { c.st = 'move'; c.t = 0; return; }
        c.st = 'carry'; c.t = 0; c.from = c.x;
      }
      if (c.st === 'carry') {
        const to = (i ? 1 : -1) * CLAW.chute, f = Math.min(1, c.t / CLAW.carry);
        c.x = c.from + (to - c.from) * f;
        if (f >= 1) {
          if (c.hold) {
            const q = c.hold, n = PRIZES[q.kind].v;
            s.score[i] += n; s.prizes = s.prizes.filter((r) => r !== q); s.wait.push({ t: CLAW.again });
            emit(s, 'win', { p: i, kind: q.kind, n });
          }
          c.hold = null; c.st = 'move'; c.t = 0; c.x = (i ? 1 : -1) * CLAW.w; c.dir = i ? -1 : 1;
        }
      }
    });
    if (s.left <= 0 && s.c.every((c) => c.st === 'move')) finish(s);
  },
};

/* ---------- Guerra de bolas de nieve ---------- */
// Cada quien en su trinchera (adelante y al fondo) se mueve de lado a lado y lanza
// solo, derecho hacia el otro. Los muñecos de nieve frenan bolas hasta romperse.
export const SNOW = { w: 4.4, y: 3, speed: 5, grip: 0.2, every: [1.15, 0.72], ball: 8, hit: 0.5, stun: 0.7, time: 30, mounds: [-2.3, 2.3], my: 1.9, hp: 3, grow: 5, wide: 0.6 };
export const nieve = {
  name: 'Guerra de bolas de nieve', icon: 'snow', input: 'move', time: SNOW.time,
  goal: ['Es invierno: cada quien está en su trinchera, uno adelante y el otro al fondo, con dos muñecos de nieve delante.', 'Muévete de lado a lado. Lanzas bolas solo, derecho hacia adelante: ponte frente a tu rival para acertarle y esquiva las bolas que vienen. Los muñecos te cubren, pero se rompen.', 'Cada bola que le das a tu rival vale 1 punto, y lo deja mareado un momento. Gana quien acierte más.'],
  create(seed) {
    const s = { ...base(seed), left: SNOW.time, balls: [], id: 0 };
    s.p = [0, 1].map((i) => ({ x: i ? 1.5 : -1.5, y: i ? -SNOW.y : SNOW.y, vx: 0, cd: 1 + i * 0.05, stun: 0 }));
    s.men = [0, 1].flatMap((side) => SNOW.mounds.map((x) => ({ side, x, y: side ? -SNOW.my : SNOW.my, hp: SNOW.hp, grow: 0 })));
    return s;
  },
  step(s, pads) {
    s.t += DT; s.left = Math.max(0, SNOW.time - s.t);
    const k = Math.min(1, s.t / SNOW.time), every = SNOW.every[0] + (SNOW.every[1] - SNOW.every[0]) * k;
    s.p.forEach((p, i) => {
      p.stun = Math.max(0, p.stun - DT);
      const want = p.stun ? 0 : clamp(pads[i].x, -1, 1) * SNOW.speed;
      p.vx += (want - p.vx) * SNOW.grip; p.x = clamp(p.x + p.vx * DT, -SNOW.w, SNOW.w);
      if (p.stun) return;
      if ((p.cd -= DT) <= 0 && s.left > 0.6) {
        p.cd = every;
        s.balls.push({ id: s.id++, from: i, x: p.x, y: p.y + (i ? 0.5 : -0.5), v: i ? SNOW.ball : -SNOW.ball });
        emit(s, 'throw', { p: i });
      }
    });
    for (const m of s.men) if (m.hp <= 0 && (m.grow -= DT) <= 0) { m.hp = SNOW.hp; emit(s, 'grow', { x: m.x, y: m.y }); }
    for (const b of s.balls) {
      const y0 = b.y; b.y += b.v * DT;
      const crossed = (yy) => (y0 - yy) * (b.y - yy) <= 0;
      // Las de tu lado no te tapan: lanzas por encima de tus muñecos.
      const man = s.men.find((m) => m.hp > 0 && m.side !== b.from && crossed(m.y) && Math.abs(m.x - b.x) < SNOW.wide);
      if (man) { b.gone = true; man.hp--; if (man.hp <= 0) man.grow = SNOW.grow; emit(s, man.hp > 0 ? 'thud' : 'break', { x: b.x, y: man.y }); continue; }
      const t = s.p[1 - b.from];
      if (crossed(t.y) && Math.abs(t.x - b.x) < SNOW.hit && !t.stun) { b.gone = true; t.stun = SNOW.stun; s.score[b.from]++; emit(s, 'hit', { p: 1 - b.from, by: b.from, x: t.x, y: t.y }); continue; }
      if (Math.abs(b.y) > SNOW.y + 1.4) b.gone = true;
    }
    s.balls = s.balls.filter((b) => !b.gone);
    if (s.left <= 0 && !s.balls.length) finish(s);
  },
};

/* ---------- La catapulta mágica: cargar y soltar ---------- */
// Cada quien tiene su catapulta y su blanco en su carril. Mientras mantienes pulsado,
// la fuerza sube y baja; al soltar, la piedra vuela según la fuerza. Los dos tienen
// los mismos blancos, a las mismas distancias.
export const CAT = { shots: 6, range: 9, ready: 0.5, fly: 1.1, rate: [0.55, 1.15], bull: 0.38, near: 0.95, time: 42, lanes: [-2.4, 2.4], base: 3.6 };
export const power = (t, n) => { const r = CAT.rate[0] + (CAT.rate[1] - CAT.rate[0]) * (n / (CAT.shots - 1)), f = (t * r * 2) % 2; return 1 - Math.abs(f - 1); };
export const catapulta = {
  name: 'La catapulta mágica', icon: 'castle', input: 'hold', time: CAT.time,
  goal: ['Cada quien tiene una catapulta, y en su carril aparece un blanco a lo lejos: unas veces cerca, otras muy lejos.', 'Mantén pulsado tu botón: la barra de fuerza sube y baja. Suelta cuando la fuerza sea la justa para llegar al blanco.', `Al centro del blanco: 3 puntos. Cerca: 1 punto. Son ${CAT.shots} tiros y la barra se mueve cada vez más rápido. Gana quien junte más puntos.`],
  create(seed) {
    const s = { ...base(seed), left: CAT.time };
    s.targets = Array.from({ length: CAT.shots }, () => 0.3 + s.rng.next() * 0.62);
    s.p = [0, 1].map(() => ({ n: 0, st: 'ready', t: 0, pw: 0, land: null }));
    return s;
  },
  step(s, pads) {
    s.t += DT; s.left = Math.max(0, CAT.time - s.t);
    s.p.forEach((p, i) => {
      p.t += DT;
      if (p.st === 'ready' && pads[i].h && s.left > 0) { p.st = 'charge'; p.t = 0; emit(s, 'charge', { p: i }); }
      else if (p.st === 'charge') {
        p.pw = power(p.t, p.n);
        if (!pads[i].h) { p.st = 'fly'; p.t = 0; p.land = p.pw * CAT.range; emit(s, 'launch', { p: i, pw: p.pw }); }
      } else if (p.st === 'fly' && p.t >= CAT.fly) {
        const err = Math.abs(p.land - s.targets[p.n] * CAT.range), pts = err < CAT.bull ? 3 : err < CAT.near ? 1 : 0;
        s.score[i] += pts; p.n++; p.st = p.n >= CAT.shots ? 'done' : 'wait'; p.t = 0;
        emit(s, 'land', { p: i, pts, d: p.land, long: p.land > s.targets[p.n - 1] * CAT.range });
      } else if (p.st === 'wait' && p.t >= CAT.ready) { p.st = 'ready'; p.t = 0; }
    });
    if (s.p.every((p) => p.st === 'done') || (s.left <= 0 && s.p.every((p) => p.st !== 'fly'))) finish(s);
  },
};

/* ---------- El rey de la tortuga: no caerse del caparazón ---------- */
// Una tortuga gigante nada y su caparazón se inclina hacia donde hay más peso, y además
// se mece cada vez más. Se resbala hacia lo bajo. Al mejor de tres rondas.
export const TURTLE = { r: 2.8, body: 0.45, speed: 3.4, grip: 0.08, tilt: 0.5, slide: 9, wob: [0.1, 0.23], cap: 18 };
export const tortuga = {
  name: 'El rey de la tortuga', icon: 'calm', input: 'move2',
  goal: ['Los dos están parados sobre el caparazón de una tortuga gigante que nada en el lago. El caparazón se inclina hacia donde hay más peso.', 'Muévete para no resbalar hacia el borde: si se inclina hacia ti, camina hacia el centro. Puedes empujar a tu rival.', 'Quien se cae al agua pierde la ronda. La tortuga se mece cada vez más. Gana quien gane 2 rondas.'],
  create(seed) {
    const s = { ...base(seed), round: 1, idle: 0 };
    tortuga.begin(s);
    return s;
  },
  begin(s) {
    s.phase = 'ready'; s.clock = 0; s.tx = 0; s.ty = 0;
    s.ph = [s.rng.next() * 6.28, s.rng.next() * 6.28];
    const side = s.rng.chance(0.5) ? 1 : -1; // quién parte a cada lado lo decide el azar
    s.p = [side, -side].map((k) => ({ x: k * 1.2, y: 0, vx: 0, vy: 0, out: false }));
    emit(s, 'round', { n: s.round });
  },
  step(s, pads) {
    s.t += DT; s.clock += DT;
    if (s.phase === 'ready') { if (s.clock > 1.2) { s.phase = 'run'; s.clock = 0; emit(s, 'go'); } return; }
    if (s.phase === 'end') {
      for (const p of s.p) if (p.out) { p.x += p.vx * DT; p.y += p.vy * DT; }
      if (s.clock < 1.7) return;
      if (s.score.includes(2) || s.idle > 2) return finish(s);
      s.round++;
      return tortuga.begin(s);
    }
    // Hacia dónde se inclina: el peso de los dos más el vaivén de la tortuga.
    const amp = TURTLE.wob[0] + TURTLE.wob[1] * s.clock, [a, b] = s.p;
    const wx = (a.x + b.x) / TURTLE.r * TURTLE.tilt + Math.sin(s.clock * 1.3 + s.ph[0]) * amp;
    const wy = (a.y + b.y) / TURTLE.r * TURTLE.tilt + Math.cos(s.clock * 1.1 + s.ph[1]) * amp;
    s.tx += (wx - s.tx) * Math.min(1, 2 * DT); s.ty += (wy - s.ty) * Math.min(1, 2 * DT);
    s.p.forEach((p, i) => { steer(p, pads[i], TURTLE.speed, TURTLE.grip); p.vx += s.tx * TURTLE.slide * DT; p.vy += s.ty * TURTLE.slide * DT; });
    bump(s, a, b, TURTLE.body, 0.4, 1.2);
    s.p.forEach((p) => (p.out = Math.hypot(p.x, p.y) > TURTLE.r + 0.1));
    if (!a.out && !b.out) {
      if (s.clock < TURTLE.cap) return;
      s.idle++; s.phase = 'end'; s.clock = 0; return emit(s, 'both');
    }
    s.phase = 'end'; s.clock = 0;
    const gap = Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y);
    if (a.out && b.out && Math.abs(gap) < 0.06) { s.idle++; emit(s, 'both'); }
    else { const w = gap > 0 ? 1 : 0; s.score[w]++; s.p[w].out = false; s.p[1 - w].out = true; emit(s, 'fall', { p: 1 - w, w }); }
  },
};

/* ---------- Hockey de hongos ---------- */
// Golpes y rebotes se avisan solo si son de verdad (no cuando la semilla queda apretada).
function ping(s, t, q, o = {}) {
  const n = Math.hypot(q.vx, q.vy);
  if (n < 1.5 || s.t - (s.ping?.[t] ?? -1) < 0.12) return;
  (s.ping ||= {})[t] = s.t;
  emit(s, t, { x: q.x, y: q.y, n, ...o });
}
// Una mesa con dos arcos. Cada quien mueve su mazo en su mitad y golpea una semilla
// de luz que rebota en los bordes y en dos hongos saltarines.
export const HOCKEY = { w: 5, h: 3, goal: 1.55, mallet: 0.45, puck: 0.28, speed: 6.2, grip: 0.25, max: 11, drag: 0.3, win: 5, time: 40, shroom: 0.32, shrooms: [[0, 1.9], [0, -1.9]], pause: 1.2 };
export const hockey = {
  name: 'Hockey de hongos', icon: 'gem', input: 'move2', time: HOCKEY.time,
  goal: ['Es una mesa de hockey: cada quien tiene su arco en un extremo y un mazo en su mitad. Al medio hay una semilla de luz que se desliza.', 'Mueve tu mazo para golpear la semilla hacia el arco de tu rival y tapa el tuyo. Rebota en los bordes y en los hongos.', `Cada gol vale 1 punto. Gana quien llegue a ${HOCKEY.win} goles, o quien tenga más al acabarse el tiempo.`],
  create(seed) {
    const s = { ...base(seed), left: HOCKEY.time, wait: 0.6 };
    s.p = [-1, 1].map((k) => ({ x: k * 3.6, y: 0, vx: 0, vy: 0 }));
    const dir = s.rng.chance(0.5) ? 1 : -1, a = (s.rng.next() - 0.5) * 1.2;
    s.puck = { x: 0, y: 0, vx: Math.cos(a) * 2.2 * dir, vy: Math.sin(a) * 2.2 };
    return s;
  },
  step(s, pads) {
    s.t += DT; s.left = Math.max(0, HOCKEY.time - s.t);
    const H = HOCKEY, m = H.mallet, q = s.puck;
    s.p.forEach((p, i) => {
      steer(p, pads[i], H.speed, H.grip);
      p.x = i ? clamp(p.x, m, H.w - m) : clamp(p.x, -H.w + m, -m);
      p.y = clamp(p.y, -H.h + m, H.h - m);
    });
    if (s.wait > 0) { s.wait -= DT; return s.left <= 0 && finish(s); }
    const f = Math.max(0, 1 - H.drag * DT);
    q.vx *= f; q.vy *= f;
    q.x += q.vx * DT; q.y += q.vy * DT;
    if (Math.abs(q.y) > H.h - H.puck) { q.y = Math.sign(q.y) * (H.h - H.puck); q.vy = -q.vy * 0.92; ping(s, 'wall', q); }
    if (Math.abs(q.x) > H.w - H.puck) {
      if (Math.abs(q.y) < H.goal) {
        const by = q.x > 0 ? 0 : 1;
        s.score[by]++;
        emit(s, 'goal', { p: by, x: q.x, y: q.y });
        if (s.score[by] >= H.win) return finish(s);
        // Saca quien recibió el gol, desde su lado.
        Object.assign(q, { x: by ? -1.4 : 1.4, y: 0, vx: 0, vy: 0 });
        s.wait = H.pause;
        return;
      }
      q.x = Math.sign(q.x) * (H.w - H.puck); q.vx = -q.vx * 0.92; ping(s, 'wall', q);
    }
    const hit = (cx, cy, r, vx, vy, e, kick) => {
      const dx = q.x - cx, dy = q.y - cy, d = Math.hypot(dx, dy) || 0.001;
      if (d >= r + H.puck) return false;
      const nx = dx / d, ny = dy / d;
      q.x = cx + nx * (r + H.puck); q.y = cy + ny * (r + H.puck);
      const rel = (q.vx - vx) * nx + (q.vy - vy) * ny;
      if (rel < 0) { q.vx -= (1 + e) * rel * nx; q.vy -= (1 + e) * rel * ny; }
      q.vx += nx * kick; q.vy += ny * kick;
      const sp = Math.hypot(q.vx, q.vy);
      if (sp > H.max) { q.vx *= H.max / sp; q.vy *= H.max / sp; }
      return true;
    };
    s.p.forEach((p, i) => { if (hit(p.x, p.y, m, p.vx, p.vy, 0.85, 0.4)) ping(s, 'hit', q, { p: i }); });
    for (const [x, y] of H.shrooms) if (hit(x, y, H.shroom, 0, 0, 1, 1.2)) ping(s, 'shroom', q, { sx: x, sy: y });
    if (s.left <= 0) finish(s);
  },
};
