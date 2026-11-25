import { noPad, DT } from './minigames/kit.js';
import { TRACK, trackAt, CLAW, PRIZES, SNOW, CAT, power, TURTLE, HOCKEY } from './minigames/feria.js';
import { WALL, GRAB, MINE, POT, SKY } from './minigames/equipo2.js';

// Jugadores simulados de los minijuegos de la V4.2 (mismo formato que bots.js).
const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const wrapU = (d) => ((d % TRACK.len) + TRACK.len) % TRACK.len;

// Mira un poco más adelante en la pista y apunta ahí, frenando el derrape.
function raceBot(skill, team) {
  return [0, 1].map((i) => { let wait = 0, o = 0; return (s, rng) => {
    const p = noPad(), me = s.p[i];
    if (me.out > 0) return p;
    if ((wait -= DT) <= 0) { wait = 0.12 + (1 - skill) * 0.35 * rng.next(); o = (rng.next() - 0.5) * 0.7 + (rng.next() - 0.5) * (1 - skill) * 1.3; }
    let off = o;
    if (team) { const d = wrapU(s.cart.u - me.u); if (d < 2.6 || d > TRACK.len - 1.2) off = i ? 0.62 : -0.62; }
    const look = 1.1 + Math.hypot(me.vx, me.vy) * 0.22, c = trackAt(me.u + look);
    p.x = c.x + c.nx * off - me.x - me.vx * 0.22; p.y = c.y + c.ny * off - me.y - me.vy * 0.22;
    const m = Math.hypot(p.x, p.y) || 1; p.x /= m; p.y /= m;
    return p;
  }; });
}

export const bots2 = {
  escobas: () => raceBot(0.75, false),
  carruaje: () => raceBot(0.75, true),
  // Pulsa cuando su garra pasa sobre un premio; prefiere los que valen más.
  garra: () => [0, 1].map((i) => (s, rng) => {
    const p = noPad(), c = s.c[i];
    if (c.st !== 'move') return p;
    const best = Math.max(...s.prizes.map((q) => PRIZES[q.kind].v));
    for (const q of s.prizes) {
      if (q.taken != null || Math.abs(q.x - c.x) > 0.16) continue;
      if (rng.chance(PRIZES[q.kind].v >= best ? 0.3 : 0.07)) { p.a = true; break; }
    }
    return p;
  }),
  // Se pone frente al rival y esquiva las bolas que le llegan.
  nieve: () => [0, 1].map((i) => { let goal = 0, wait = 0; return (s, rng) => {
    const p = noPad(), me = s.p[i], o = s.p[1 - i];
    if ((wait -= DT) <= 0) {
      wait = 0.15 + rng.next() * 0.2;
      goal = o.x + o.vx * 0.5 + (rng.next() - 0.5) * 1.2;
      for (const b of s.balls) {
        if (b.from === i) continue;
        const tt = (me.y - b.y) / b.v;
        if (tt > 0 && tt < 0.75 && Math.abs(b.x - me.x) < 0.8 && rng.chance(0.8)) goal = me.x + (me.x > b.x || me.x < -SNOW.w + 1 ? 1.4 : -1.4);
      }
    }
    p.x = Math.max(-1, Math.min(1, (goal - me.x) * 2));
    return p;
  }; }),
  // Mantiene pulsado y suelta cerca de la fuerza justa (con su error de cada tiro).
  catapulta: () => [0, 1].map((i) => { let want = null, n = -1; return (s, rng) => {
    const p = noPad(), me = s.p[i];
    if (me.n !== n) { n = me.n; want = s.targets[Math.min(n, CAT.shots - 1)] + (rng.next() - 0.5) * 0.14; }
    if (me.st === 'ready') p.h = rng.chance(0.08);
    if (me.st === 'charge') p.h = !(Math.abs(me.pw - want) < 0.025 && rng.chance(0.7));
    return p;
  }; }),
  // Camina contra la inclinación, y empuja si el rival está cerca del borde.
  tortuga: () => [0, 1].map((i) => { let push = false, wait = 0; return (s, rng) => {
    const p = noPad(), me = s.p[i], o = s.p[1 - i];
    if ((wait -= DT) <= 0) { wait = 0.2 + rng.next() * 0.3; push = near(me, o) < 1.4 && Math.hypot(o.x, o.y) > Math.hypot(me.x, me.y) + 0.3 && rng.chance(0.35); }
    p.x = -me.x * 1.1 - s.tx * 3 + (rng.next() - 0.5) * 0.6; p.y = -me.y * 1.1 - s.ty * 3 + (rng.next() - 0.5) * 0.6;
    if (push) { p.x = o.x - me.x; p.y = o.y - me.y; }
    if (Math.hypot(me.x, me.y) > TURTLE.r * 0.7) { p.x = -me.x; p.y = -me.y; }
    return p;
  }; }),
  // Defiende frente a su arco y ataca por detrás de la semilla.
  hockey: () => [0, 1].map((i) => { let err = 0, wait = 0; return (s, rng) => {
    const p = noPad(), me = s.p[i], q = s.puck, sg = i ? 1 : -1, goal = sg * HOCKEY.w;
    if ((wait -= DT) <= 0) { wait = 0.2 + rng.next() * 0.3; err = (rng.next() - 0.5) * 1.1; }
    let tx, ty;
    if (q.x * sg > 0 && !(q.vx * sg > 4)) {
      // Se pone detrás de la semilla, en la línea que va al otro arco, y la empuja.
      const gx = -goal, gy = err * 0.6, dx = q.x - gx, dy = q.y - gy, d = Math.hypot(dx, dy) || 1, bx = q.x + (dx / d) * 0.75, by = q.y + (dy / d) * 0.75;
      const ready = Math.hypot(me.x - bx, me.y - by) < 0.35 || (me.x * sg > q.x * sg && Math.abs(me.y - q.y) < 0.5);
      if (ready) { tx = q.x - (dx / d) * 0.6; ty = q.y - (dy / d) * 0.6; } else { tx = bx; ty = by + (Math.abs(me.y - q.y) < 0.5 && me.x * sg < q.x * sg ? (me.y > q.y ? 0.6 : -0.6) : 0); }
    } else { tx = goal - sg * 1.1; ty = Math.max(-1.1, Math.min(1.1, q.y * 0.6)) + err * 0.7; }
    p.x = (tx - me.x) * 3; p.y = (ty - me.y) * 3;
    return p;
  }; }),
  // Cada quien cuida su lado; si viene un ogro grande, van los dos.
  muralla: () => [0, 1].map((i) => { let goal = 0, wait = 0; return (s, rng) => {
    const p = noPad(), me = s.p[i];
    if ((wait -= DT) <= 0) {
      wait = 0.18 + rng.next() * 0.3;
      const big = s.ogres.find((o) => o.kind === 'big' && o.y > -3.2);
      const list = s.ogres.filter((o) => o.kind === 'small').sort((a, b) => b.y - a.y), mine = list.filter((o) => (i ? o.x >= 0 : o.x < 0));
      const t = big && rng.chance(0.85) ? { x: big.x + (i ? 0.4 : -0.4) } : mine[0] || (rng.chance(0.75) ? list[0] : null);
      goal = (t ? t.x : i ? 2 : -2) + (rng.next() - 0.5) * 0.5;
    }
    p.x = Math.max(-1, Math.min(1, (goal - me.x) * 2.5));
    return p;
  }; }),
  // Los dos apuntan al mismo premio: uno lo alinea de lado, el otro de fondo.
  garraq: () => [0, 1].map((i) => { let err = 0, ph = ''; return (s, rng) => {
    const p = noPad();
    if (s.phase !== ph) { ph = s.phase; err = (rng.next() - 0.5) * 0.18; }
    if (i === 0 && s.phase === 'x') {
      const t = s.prizes.slice().sort((a, b) => Math.abs(a.x - s.x - s.dx * 0.6) - Math.abs(b.x - s.x - s.dx * 0.6))[0];
      p.a = !!t && Math.abs(t.x + err - s.x) < 0.07 && rng.chance(0.6);
    }
    if (i === 1 && s.phase === 'z') {
      const t = s.prizes.slice().sort((a, b) => Math.hypot(a.x - s.x, (a.z - s.z) * 0.3) - Math.hypot(b.x - s.x, (b.z - s.z) * 0.3))[0];
      p.a = !!t && Math.abs(t.z + err - s.z) < 0.07 && rng.chance(0.6);
    }
    return p;
  }; }),
  // Quien maneja esquiva rocas; quien pica espera la piedra justo al lado.
  mina: () => [0, 1].map((i) => { let react = null; const plan = new Map(); return (s, rng) => {
    const p = noPad();
    if (s.pause > 0) return p;
    if (s.drive === i) {
      const rock = (l, z = 2.6) => s.items.some((q) => q.kind === 'rock' && q.lane === l && q.z > 0 && q.z < z);
      if (!rock(s.lane, 3.2)) { react = null; return p; }
      react ??= s.t + 0.18 + rng.next() * 0.3;
      if (s.t < react) return p;
      react = null;
      const opts = [s.lane - 1, s.lane + 1].filter((l) => l >= 0 && l <= 2 && !rock(l, 3.4));
      if (opts.length) p.d = rng.pick(opts) > s.lane ? 1 : 3;
    } else {
      // Cada piedra: un momento para pulsar (con error) y a veces se distrae.
      for (const g of s.items) {
        if (g.kind !== 'gem' || g.z > 1.5) continue;
        if (!plan.has(g.id)) plan.set(g.id, rng.chance(0.1) ? -99 : (rng.next() - 0.5) * 1.1);
        if (g.z <= plan.get(g.id)) { plan.set(g.id, -99); p.d = rng.chance(0.95) ? (g.side ? 1 : 3) : (g.side ? 3 : 1); break; }
      }
    }
    return p;
  }; }),
  // Revuelve cuando se enfría; cocina cuando hierve.
  pocion: () => [0, 1].map((i) => { let want = 0.7, wait = 0; return (s, rng) => {
    const p = noPad();
    wait -= DT;
    if (s.cook !== i) {
      if (s.heat < want && wait <= 0) { p.d = rng.int(0, 3); wait = 0.18 + rng.next() * 0.18; want = 0.62 + rng.next() * 0.31; }
    } else if (s.heat >= POT.warm + 0.03 && wait <= 0 && rng.chance(0.12)) {
      p.d = rng.chance(0.92) ? s.recipes[s.pot][s.n] : rng.int(0, 3); wait = POT.cd + rng.next() * 0.3;
    }
    return p;
  }; }),
  // Planea hacia dónde ir mirando un poco hacia arriba; los dos tiran si el camino está libre.
  globo: () => [0, 1].map((i) => { let plan = 0, wait = 0; return (s, rng) => {
    const p = noPad();
    if ((wait -= DT) <= 0) { wait = 0.2 + rng.next() * 0.2; plan = skyPlan(s, rng); }
    p.h = plan === 2 || (i === 0 ? plan === -1 : plan === 1);
    return p;
  }; }),
};

// −1 izquierda, 0 nada, 1 derecha, 2 fuego (los dos tiran).
function skyPlan(s, rng) {
  const risk = (opt) => {
    let x = s.x, vx = s.vx, alt = s.alt, bad = 0;
    const want = opt === 2 || opt === 0 ? 0 : opt * SKY.side;
    for (let t = 0; t < 1.5; t += 0.1) {
      vx += (want - vx) * Math.min(1, SKY.grip * 6); x = Math.max(-SKY.w + SKY.r, Math.min(SKY.w - SKY.r, x + vx * 0.1)); alt += (opt === 2 ? SKY.boost : SKY.rise) * 0.1;
      for (const q of s.things) {
        if (q.hit) continue;
        if (q.kind === 'crow') { const cx = q.x + q.v * t; if (Math.hypot(cx - x, q.alt - alt) < SKY.r + 0.6) bad += 2 - t; }
        else if (Math.abs(q.alt - alt) < SKY.r + 0.2 && (q.side === 0 ? x - SKY.r - 0.3 < -SKY.w + q.len : x + SKY.r + 0.3 > SKY.w - q.len)) bad += 2 - t;
      }
    }
    return bad + (opt === 2 ? -0.05 : 0) + rng.next() * 0.02;
  };
  return [2, 0, -1, 1].map((o) => [o, risk(o)]).sort((a, b) => a[1] - b[1])[0][0];
}
