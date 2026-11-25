import { noPad, DT, GAMES } from './minigames/index.js';
import { makeRng } from './rng.js';
import { safeAt, enreda as VINE_GAME, VINE, piso as FLOOR_GAME } from './minigames/caminos.js';

// Jugadores simulados de cada minijuego. Sirven para las pruebas y para jugar
// contra la computadora. Cada uno ve el estado completo, como lo vería una
// persona en la pantalla, y devuelve sus mandos: bots[id]() → [jugador 0, jugador 1].
// Cada función recibe (estado, rng).

export const bots = {
  duelo: () => [0, 1].map((i) => { let at = 0; return (s, rng) => { const p = noPad(); if (s.phase === 'signal') { at ||= 0.2 + rng.next() * 0.25; p.a = s.clock >= at; } else { at = 0; p.a = s.phase === 'wait' && rng.chance(0.0006); } return p; }; }),
  lluvia: () => [0, 1].map((i) => (s) => { const me = s.p[i].x, g = s.drops.filter((d) => d.kind !== 'rock' && d.y / d.v > Math.abs(d.x - me) / 7).sort((a, b) => a.y - b.y)[0]; return { ...noPad(), x: g ? Math.max(-1, Math.min(1, (g.x - me) * 3)) : 0 }; }),
  fuga: () => [0, 1].map((i) => (s, rng) => {
    const p = noPad();
    if (s.runner === i) {
      const st = s.stars.slice().sort((a, b) => Math.hypot(a.x - s.x, a.y - s.y) - Math.hypot(b.x - s.x, b.y - s.y))[0];
      p.x = st.x - s.x; p.y = st.y - s.y;
      for (const q of s.spells) { const d = Math.hypot(q.x - s.x, q.y - s.y); if (d < 1.5) { p.x = s.x - q.x + 0.01; p.y = s.y - q.y; } }
    } else if (rng.chance(0.03)) { p.a = true; p.aim = { x: s.x + s.vx * 0.6 + (rng.next() - 0.5) * 2, y: s.y + s.vy * 0.6 + (rng.next() - 0.5) * 2 }; }
    return p;
  }),
  tira: () => [0, 1].map(() => { let k = 0, at = 0; return (s, rng) => { const p = noPad(); if (k < s.beats.length) { at ||= s.beats[k] + (rng.next() - 0.5) * 0.3; if (s.t >= at) { p.a = true; k++; at = 0; } } return p; }; }),
  runas: () => [0, 1].map((i) => { let wait = 0.5; return (s, rng) => { const p = noPad(); if (s.phase !== 'play') { wait = 0.4 + rng.next() * 0.2; return p; } wait -= DT; if (wait < 0 && s.p[i].n < s.seq.length) { wait = 0.25 + rng.next() * 0.35; p.d = rng.chance(0.93) ? s.seq[s.p[i].n] : rng.int(0, 3); } return p; }; }),
  salto: () => [0, 1].map(() => { let j = null; return (s, rng) => { const p = noPad(), m = ((s.ang % Math.PI) + Math.PI) % Math.PI, left = (s.dir > 0 ? Math.PI - m : m) / s.speed; j ??= 0.3 + (rng.next() - 0.5) * 0.42; if (left < j && left > 0.02) { p.a = true; } if (left > 0.65) j = null; return p; }; }),
  choque: () => [0, 1].map((i) => (s, rng) => { const p = noPad(), me = s.p[i], r = s.p[1 - i], d = Math.hypot(me.x, me.y); const k = d > s.r * 0.7 ? 1 : 0; p.x = k ? -me.x : r.x - me.x + (rng.next() - 0.5); p.y = k ? -me.y : r.y - me.y + (rng.next() - 0.5); return p; }),
  huevo: () => [0, 1].map((i) => (s, rng) => { const p = noPad(), me = s.p[i], r = s.p[1 - i], k = s.holder === i ? 1 : -1; p.x = k * (r.x - me.x) + (k < 0 ? -me.y * 0.9 - me.x * 0.3 : 0) + (rng.next() - 0.5); p.y = k * (r.y - me.y) + (k < 0 ? me.x * 0.9 - me.y * 0.3 : 0) + (rng.next() - 0.5); return p; }),
  burbuja: () => [0, 1].map((i) => { let goal = 0; return (s, rng) => { const p = noPad(); if (s.clock < 0) goal = 0.35 + rng.next() * 0.45; p.h = s.clock > 0.1 && s.p[i].size < goal; return p; }; }),
  dragon: () => [0, 1].map(() => { let wait = 0, react = 0; return (s, rng) => { const p = noPad(); if (s.eye === 'stir') { react ||= 0.15 + rng.next() * 0.45; } else react = 0; const stop = s.eye === 'open' || (s.eye === 'stir' && s.clock > react); if (stop) wait = 0.1 + rng.next() * 0.3; else wait -= DT; p.h = !stop && wait <= 0; return p; }; }),
  conejos: () => [0, 1].map(() => { const seen = new Set(); return (s, rng) => { const p = noPad(); if (s.phase !== 'run' || s.clock < 0) return p; for (const h of s.hares) { const q = s.clock - h.t; if (q > 0.6 && !seen.has(h.id)) { seen.add(h.id); if ((h.white && rng.chance(0.85)) || (h.ears && rng.chance(0.25))) { p.a = true; break; } } } return p; }; }),
  pesca: () => [0, 1].map((i) => { let at = 0; return (s, rng) => { const p = noPad(), me = s.p[i]; if (me.state === 'bite') { at ||= 0.2 + rng.next() * 0.6; p.a = me.clock >= at; } else { at = 0; p.a = me.state === 'wait' && rng.chance(0.002); } return p; }; }),
  hongos: () => [0, 1].map((i) => { const plan = new Map(); return (s, rng) => { const p = noPad(); for (const n of s.notes) { if (n.hit[i] || n.t < s.t - 0.3 || n.t > s.t + 0.5) continue; if (!plan.has(n)) plan.set(n, rng.chance(0.1) ? 99 : n.t + (rng.next() - 0.5) * 0.24); if (s.t >= plan.get(n)) { p.d = [3, 0, 1][n.lane]; plan.set(n, 99); break; } } return p; }; }),
  pinta: () => [0, 1].map((i) => { let goal = null; return (s, rng) => { const p = noPad(), me = s.p[i]; if (s.flower && rng.chance(0.5)) goal = s.flower; if (!goal || Math.hypot(goal.x - me.x, goal.y - me.y) < 0.4 || rng.chance(0.01)) goal = { x: (rng.next() * 2 - 1) * 4.4, y: (rng.next() * 2 - 1) * 2.8 }; p.x = goal.x - me.x; p.y = goal.y - me.y; return p; }; }),
  topos: () => [0, 1].map((i) => { const plan = new Map(); return (s, rng) => { const p = noPad(); for (const q of s.pops) { if (q.hit[i] || s.t < q.t || s.t > q.t + q.dur) continue; if (!plan.has(q)) plan.set(q, q.kind === 'hedgehog' ? (rng.chance(0.15) ? q.t + 0.3 : 99) : q.t + 0.25 + rng.next() * 0.5); if (s.t >= plan.get(q)) { p.d = q.hole; plan.set(q, 99); break; } } return p; }; }),
  torre: () => [0, 1].map((i) => { let aim = null; return (s, rng) => { const p = noPad(), me = s.p[i]; if (me.wait > 0) { aim = null; return p; } aim ??= (rng.next() - 0.5) * 0.7; const x = s.dir * Math.sin(me.ph) * 1.5; p.a = Math.abs(x - aim) < 0.08 && rng.chance(0.5); return p; }; }),
  // En equipo: jugadores decentes, con reacción humana.
  // Cada quien cuida su mitad; ve tarde (reacción) y apunta con error.
  faroles: () => { const skill = 0.75; return [0, 1].map((i) => { let t = null, wait = 0, err = [0, 0]; return (s, rng) => { const p = noPad(), me = s.p[i]; wait -= DT; if (wait <= 0) { wait = 0.25 + (1 - skill) * 0.5 * rng.next(); const list = s.blobs.slice().sort((a, b) => Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y)); const mine = list.filter((b) => (i ? b.x >= -0.3 : b.x <= 0.3)); t = mine[0] || (rng.chance(skill) ? list[0] : null); err = [(rng.next() - 0.5) * (1 - skill) * 3, (rng.next() - 0.5) * (1 - skill) * 3]; } if (t && s.blobs.includes(t)) { p.x = t.x - me.x + err[0]; p.y = t.y - me.y + err[1]; } else { p.x = (i ? 1.2 : -1.2) - me.x; p.y = -me.y; } return p; }; }); },
  remar: () => { const skill = 0.75; return [0, 1].map((i) => { let at = null; return (s, rng) => { const p = noPad(); if (s.last === i && !rng.chance((1 - skill) * 0.01)) { at = null; return p; } if (s.rest[i] > 0) return p; at ??= s.t + 0.15 + rng.next() * 0.3 * (1.6 - skill); if (s.t >= at) { p.a = true; at = null; } return p; }; }); },
  escudo: () => { const skill = 0.75; return [0, 1].map((i) => { let h = false, wait = 0; return (s, rng) => { const p = noPad(), o = 1 - i; wait -= DT; if (wait <= 0) { wait = 0.2 + (1 - skill) * 0.6 * rng.next(); const need = s.mode === 'surge' || (s.mode === 'warn' && rng.chance(skill)); const mine = i === 0 ? s.en[0] >= s.en[1] : s.en[1] > s.en[0]; h = need || (mine && s.b > 0.05) || (s.tired[o] && s.b > 0.02); if (rng.chance((1 - skill) * 0.3)) h = !h; } p.h = h; return p; }; }); },
  // Quien sostiene afirma en las ráfagas (a veces tarde); quien cruza se detiene si el puente se mece.
  puente: () => { const skill = 0.75; return [0, 1].map((i) => { let h = false, wait = 0; return (s, rng) => { const p = noPad(); wait -= DT; if (wait <= 0) { wait = 0.15 + (1 - skill) * 0.7 * rng.next(); if (s.walker === i) h = s.sway < 0.45 + (rng.next() - 0.5) * 0.4 && !(s.mode === 'gust' && !s.steady && rng.chance(skill)); else h = (s.mode === 'gust' || (s.mode === 'warn' && rng.chance(skill * 0.6))) && rng.chance(0.3 + skill * 0.6); } p.h = h; return p; }; }); },
  llama: () => { const skill = 0.75; return [0, 1].map((i) => { let at = null, was = ''; return (s, rng) => { const p = noPad(), key = s.phase + s.holder; if (key !== was) { was = key; at = null; } if (s.phase === 'hold' && s.holder === i) { at ??= s.t + 0.3 + rng.next() * 0.5; if (s.t >= at) { p.a = true; at = null; } } else if (s.phase === 'fly' && s.holder !== i) { at ??= s.t - s.clock + s.flight + (rng.next() + rng.next() - 1) * (1 - skill) * 1.1; if (s.t >= at) { p.a = true; at = Infinity; } } else at = null; return p; }; }); },
  runeq: () => { const skill = 0.75; return [0, 1].map((i) => { let wait = 0.4; return (s, rng) => { const p = noPad(); if (s.phase !== 'play') { wait = 0.35 + rng.next() * 0.3; return p; } const q = s.seq[s.n]; wait -= DT; if (wait < 0 && q.p === i) { wait = 0.3 + rng.next() * 0.35; p.d = rng.chance(0.9 + skill * 0.07) ? q.d : rng.int(0, 3); } else if (q.p !== i && rng.chance((1 - skill) * 0.004)) p.d = q.d; return p; }; }); },
  // Mira si la casilla de enfrente estará libre al aterrizar; si su fila corre peligro, se hace a un lado o retrocede.
  cruce: () => roadBot(0.8),
  cruceq: () => roadBot(0.75),
  enreda: () => [0, 1].map((i) => { let react = null; return (s, rng) => { const p = noPad(), me = s.p[i]; if (me.stun > 0 || me.h >= VINE.goal) return p; const off = Math.abs(VINE_GAME.hand(me) - s.grips[me.h]); if (off < VINE.zone * 0.9) { p.a = rng.chance(0.13); } else { p.a = rng.chance(0.0015); } return p; }; }),
  piso: () => floorBot(0.75),
};

function roadBot(skill) {
  return [0, 1].map((i) => { let wait = 0; return (s, rng) => {
    const p = noPad(), me = s.p[i];
    if (me.out > 0 || me.hop > 0) return p;
    wait -= DT; if (wait > 0) return p;
    wait = 0.12 + (1 - skill) * 0.5 * rng.next();
    const x = Math.round(me.x), look = 0.5 + (1 - skill) * 0.8;
    const ok = (row, xx) => { for (let t = 0.1; t <= look; t += 0.08) if (!safeAt(s, row, xx, s.t + t)) return false; return true; };
    if (rng.chance((1 - skill) * 0.25)) { p.d = rng.int(0, 3); return p; } // un descuido
    if (ok(me.row + 1, x)) p.d = 0;
    else if (!ok(me.row, me.x)) p.d = [1, 3].find((d) => ok(me.row, x + (d === 1 ? 1 : -1))) ?? (me.row > 0 && ok(me.row - 1, x) ? 2 : null);
    return p;
  }; });
}

// Camina por baldosas firmes (busca el camino rodeando huecos) y sale de las que tiemblan.
function floorBot(skill) {
  const N = 5, path = (s, from, to) => {
    const prev = new Map([[from, -1]]), q = [from];
    while (q.length) { const c = q.shift(); if (c === to) break; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = (c % N) + dx, y = Math.floor(c / N) + dy, n = y * N + x; if (x < 0 || y < 0 || x >= N || y >= N || prev.has(n) || s.tiles[n].st !== 'ok') continue; prev.set(n, c); q.push(n); } }
    if (!prev.has(to)) return null;
    let c = to; while (prev.get(c) !== from && prev.get(c) !== -1) c = prev.get(c);
    return c;
  };
  return [0, 1].map((i) => { let goal = null, wait = 0; return (s, rng) => {
    const p = noPad(), me = s.p[i]; if (me.out > 0) return p;
    wait -= DT; const here = FLOOR_GAME.tileOf(me.x, me.y);
    if (wait <= 0) {
      wait = 0.2 + (1 - skill) * 0.6 * rng.next();
      let to = null;
      if (here >= 0 && s.tiles[here].st !== 'ok' && rng.chance(0.6 + skill * 0.5)) to = s.tiles.map((t, j) => j).filter((j) => s.tiles[j].st === 'ok').sort((a, b) => Math.hypot(FLOOR_GAME.at(a).x - me.x, FLOOR_GAME.at(a).y - me.y) - Math.hypot(FLOOR_GAME.at(b).x - me.x, FLOOR_GAME.at(b).y - me.y))[0];
      else if (s.stars[0]) to = s.stars[0].tile;
      const step = to == null || here < 0 ? to : to === here ? here : rng.chance(0.95) ? path(s, here, to) : to;
      goal = step == null ? null : FLOOR_GAME.at(step);
      // Para pasar a la baldosa de al lado, primero se alinea con el centro de la suya.
      if (goal && here >= 0 && step !== here) { const c = FLOOR_GAME.at(here); if (Math.abs(goal.x - c.x) > 0.1) goal = { x: goal.x, y: c.y }; else goal = { x: c.x, y: goal.y }; }
    }
    if (goal) { p.x = (goal.x - me.x) * 2.5; p.y = (goal.y - me.y) * 2.5; }
    return p;
  }; });
}

// Niveles de la computadora: a ratos se distrae (no toca nada por un momento) y a
// veces falla un toque. Cada minijuego es más o menos sensible a eso, así que el
// nivel se ajusta por juego (TUNE) para que contra un jugador simulado típico la
// computadora gane ~30 % en Tranquila, ~42 % en Normal y ~50 % en Difícil.
// En equipo la computadora siempre juega lo mejor que puede.
export const LEVELS = { facil: { name: 'Tranquila', goal: 0.3 }, normal: { name: 'Normal', goal: 0.42 }, dificil: { name: 'Difícil', goal: 0.5 } };
export const BLINK = 0.5, MISS = 0.35; // con k = 1
// k de cada minijuego para [Tranquila, Normal]; se calcula con tools/calibrar.js.
export const TUNE = {
  duelo: [0.87, 0.03], lluvia: [0.16, 0.02], fuga: [0.13, 0.04], tira: [0.07, 0.03], runas: [0.25, 0.07], salto: [0.32, 0.13],
  choque: [0.01, 0], huevo: [0.16, 0.07], burbuja: [0.24, 0.09], dragon: [0.07, 0.02], conejos: [0.2, 0.08], pesca: [0.88, 0.53],
  hongos: [0.07, 0.04], pinta: [0.27, 0.06], topos: [0.1, 0.04], torre: [0.48, 0.3], cruce: [0.25, 0.09], enreda: [0.19, 0.09],
};
const SPAN = 20;

// Mandos de la computadora para el jugador i del minijuego id.
export function brain(id, i, level = 'normal', seed = 1, k = null) {
  const rng = makeRng(seed ^ 0x51ed), f = bots[id]()[i];
  k ??= GAMES[id].team ? 0 : level === 'facil' ? TUNE[id]?.[0] ?? 0.5 : level === 'normal' ? TUNE[id]?.[1] ?? 0.2 : 0;
  const blink = BLINK * k, miss = MISS * k;
  let frame = 0, away = false;
  return (s) => {
    if (frame++ % SPAN === 0) away = rng.chance(blink);
    const p = f(s, rng);
    if (away || ((p.a || p.d != null) && rng.chance(miss))) { p.a = false; p.d = null; p.h = false; p.x = 0; p.y = 0; }
    return p;
  };
}
