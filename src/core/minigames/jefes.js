import { DT, base, emit } from './kit.js';
import { steer } from './nuevos.js';

// Batallas de jefe (V4.3): los tres guardianes. Se juegan siempre en equipo, en una
// arena redonda. El jefe ataca (hay que esquivar) y después queda mareado unos segundos:
// ahí se le pega corriendo hacia él. Con cada golpe se pone más rápido.
// winner = -1 si ganan los dos, -2 si gana el jefe. score[i] = golpes de cada quien.
export const BOSS = { r: 4.6, speed: 5.2, grip: 0.2, body: 0.38, inv: 1.3, lives: 5, cd: 0.45, pair: 0.6, bounce: 5 };
const end = (s, won) => { s.done = true; s.won = won; s.winner = won ? -1 : -2; emit(s, won ? 'saved' : 'lost'); };
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const lerp = (a, b, k) => a + (b - a) * k;
const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));

function create(seed, o) {
  const s = { ...base(seed), left: o.time, lives: BOSS.lives, hp: o.hp, max: o.hp, id: 0, shots: [], rings: [], rocks: [], whip: null, hits: 0, turn: 0 };
  s.boss = { x: 0, y: -0.8, r: o.body, mode: 'idle', t: 1.6, stun: 0, n: 0, z: 0, dir: Math.PI / 2, danger: null };
  s.p = [-1, 1].map((k) => ({ x: k * 1.8, y: 2.6, vx: 0, vy: 0, inv: 0, cd: 0, touch: -9 }));
  return s;
}

export function hurt(s, i, why) {
  const p = s.p[i];
  if (p.inv > 0 || s.done) return false;
  p.inv = BOSS.inv; s.lives--;
  emit(s, 'hurt', { p: i, why, lives: s.lives, x: p.x, y: p.y });
  return true;
}
function stun(s, t, why) {
  const b = s.boss;
  Object.assign(b, { mode: 'stun', stun: t, danger: null, z: 0, n: 0 });
  s.hits = 0; s.whip = null;
  emit(s, 'stun', { why, x: b.x, y: b.y });
}

// Mover a los dos, sin salirse de la arena ni encimarse.
function move(s, pads, o) {
  s.t += DT; s.left = Math.max(0, o.time - s.t);
  s.p.forEach((p, i) => {
    p.inv = Math.max(0, p.inv - DT); p.cd = Math.max(0, p.cd - DT);
    steer(p, pads[i], BOSS.speed, BOSS.grip);
    const d = Math.hypot(p.x, p.y), m = BOSS.r - BOSS.body;
    if (d > m) { p.x *= m / d; p.y *= m / d; }
  });
  const [a, c] = s.p, dx = c.x - a.x, dy = c.y - a.y, d = Math.hypot(dx, dy) || 0.001, min = BOSS.body * 2;
  if (d < min) { const k = (min - d) / 2 / d; a.x -= dx * k; a.y -= dy * k; c.x += dx * k; c.y += dy * k; }
}

// Tocar al jefe: si está mareado es un golpe; si embiste, duele; si no, solo empuja.
function contact(s, o) {
  const b = s.boss;
  if (b.z > 0.3) return;
  s.p.forEach((p, i) => {
    if (s.done) return;
    const dx = p.x - b.x, dy = p.y - b.y, d = Math.hypot(dx, dy) || 0.001, min = b.r + BOSS.body;
    if (d >= min) return;
    const nx = dx / d, ny = dy / d;
    p.x = b.x + nx * min; p.y = b.y + ny * min;
    p.vx = nx * BOSS.bounce; p.vy = ny * BOSS.bounce;
    if (b.stun > 0) {
      if (p.cd > 0 || s.hits >= o.cap) return;
      p.cd = BOSS.cd;
      // Al final, solo cuenta si le pegan los dos casi a la vez.
      if (o.pair && s.hp <= o.pair) {
        const q = s.p[1 - i];
        if (s.t - q.touch > BOSS.pair) { p.touch = s.t; return emit(s, 'clang', { p: i, x: b.x, y: b.y }); }
        q.touch = -9; p.touch = -9; s.score[0]++; s.score[1]++;
        s.hp--; s.hits++;
        emit(s, 'hit', { p: i, both: true, hp: s.hp, x: b.x, y: b.y });
      } else {
        s.score[i]++; s.hp--; s.hits++;
        emit(s, 'hit', { p: i, hp: s.hp, x: b.x, y: b.y });
      }
      if (s.hp > 0 && s.hits >= o.cap && b.stun > 0.3) { b.stun = Math.min(b.stun, 0.3); emit(s, 'shake'); }
    } else if (b.danger) hurt(s, i, b.danger);
  });
}

// Lo que cae del cielo (zanahorias, rocas) y lo que vuela (rayos).
function shots(s) {
  const b = s.boss;
  for (const q of s.shots) {
    if (q.fall != null) {
      q.fall -= DT;
      if (q.fall > 0) continue;
      q.gone = true;
      s.p.forEach((p, i) => { if (dist(p, q) < q.r + BOSS.body * 0.5) hurt(s, i, q.kind); });
      emit(s, 'land', { kind: q.kind, x: q.x, y: q.y });
      if (q.kind === 'rock') { s.rocks.push({ id: q.id, x: q.x, y: q.y, life: TRO.rock.life }); if (s.rocks.length > TRO.rock.max) s.rocks.shift(); }
      continue;
    }
    q.x += q.vx * DT; q.y += q.vy * DT;
    if (q.back) {
      if (dist(q, b) < b.r + 0.2) { q.gone = true; if (b.stun <= 0) stun(s, REY.stun, 'gold'); }
      continue;
    }
    if (Math.hypot(q.x, q.y) > BOSS.r + 1) { q.gone = true; if (q.kind === 'gold') emit(s, 'goldLost'); continue; }
    s.p.forEach((p, i) => {
      if (q.gone || dist(p, q) > q.r + BOSS.body) return;
      if (q.kind === 'gold') {
        const dx = b.x - q.x, dy = b.y - q.y, d = Math.hypot(dx, dy) || 1;
        Object.assign(q, { back: true, vx: (dx / d) * REY.orb.back, vy: (dy / d) * REY.orb.back });
        emit(s, 'reflect', { p: i, x: q.x, y: q.y });
      } else if (hurt(s, i, 'orb')) q.gone = true;
    });
  }
  s.shots = s.shots.filter((q) => !q.gone);
  s.rocks = s.rocks.filter((r) => (r.life -= DT) > 0);
}

// Ondas del conejo: anillos que crecen con un hueco por donde pasar.
function rings(s) {
  for (const g of s.rings) {
    g.r += g.v * DT;
    if (g.r > CON.reach) g.gone = true;
    s.p.forEach((p, i) => {
      if (g.hit[i] || Math.abs(dist(p, g) - g.r) > 0.25 + BOSS.body * 0.5) return;
      const a = Math.atan2(p.y - g.y, p.x - g.x);
      if (Math.abs(wrap(a - g.gap)) < CON.gap || Math.abs(wrap(a - g.gap - Math.PI)) < CON.gap) return;
      g.hit[i] = true; hurt(s, i, 'ring');
    });
  }
  s.rings = s.rings.filter((g) => !g.gone);
}

// Fin común de cada cuadro: mareo, choques y cómo termina.
function tail(s, o) {
  const b = s.boss;
  if (b.stun > 0 && (b.stun -= DT) <= 0) { b.stun = 0; b.mode = 'idle'; b.t = 0.7; emit(s, 'wake'); }
  shots(s); rings(s); contact(s, o);
  if (s.hp <= 0) return end(s, true);
  if (s.lives <= 0 || s.left <= 0) end(s, false);
}
const aimAt = (s, i, spread) => { const p = s.p[i]; return { x: p.x + p.vx * 0.3 + (s.rng.next() - 0.5) * spread, y: p.y + p.vy * 0.3 + (s.rng.next() - 0.5) * spread }; };
const inside = (q, r) => { const d = Math.hypot(q.x, q.y); if (d > r) { q.x *= r / d; q.y *= r / d; } return q; };

/* ---------- El Conejo Gigante: saltos, ondas y zanahorias ---------- */
export const CON = { hp: 9, time: 50, body: 0.85, cap: 3, stun: 3.4, hops: 3, air: [1.15, 0.8], land: 1.3, ring: [1.8, 2.6], gap: 0.9, reach: 3.3, carrot: [1.1, 0.75], cr: 0.65 };
export const jconejo = {
  name: 'Batalla: el Conejo Gigante', icon: 'boot', input: 'move2', time: CON.time, team: true, boss: 'conejo', hp: CON.hp, cap: CON.cap,
  goal: ['Batalla de jefe en equipo: el Conejo Gigante salta por la arena. Al caer hace una onda que crece en círculo, con dos huecos, y entre salto y salto lanza zanahorias.', `Muévanse para esquivar: salgan de la sombra donde va a caer, pónganse en uno de los huecos de la onda (o lejos de ella) y apártense de las marcas rojas. Después de ${CON.hops} saltos queda mareado: ¡corran a chocarlo para pegarle!`, `Le ganan con ${CON.hp} golpes. Tienen ${BOSS.lives} vidas entre los dos; si se acaban, o se acaba el tiempo, gana el conejo.`],
  create: (seed) => create(seed, CON),
  step(s, pads) {
    move(s, pads, CON);
    const b = s.boss, k = 1 - s.hp / s.max;
    if (b.mode === 'hop') {
      b.ht += DT;
      const f = Math.min(1, b.ht / b.dur);
      b.x = lerp(b.fx, b.tx, f); b.y = lerp(b.fy, b.ty, f); b.z = Math.sin(f * Math.PI) * 2.4;
      if (f >= 1) {
        b.z = 0; b.mode = 'idle'; b.t = 0.6 - 0.2 * k;
        s.p.forEach((p, i) => { if (dist(p, b) < CON.land) hurt(s, i, 'land'); });
        s.rings.push({ id: s.id++, x: b.x, y: b.y, r: b.r, v: lerp(CON.ring[0], CON.ring[1], k), gap: s.rng.next() * 6.283, hit: [false, false] });
        emit(s, 'land', { kind: 'bunny', x: b.x, y: b.y });
        if (++b.n >= CON.hops) stun(s, CON.stun, 'tired');
      }
    } else if (b.mode === 'idle' && (b.t -= DT) <= 0) {
      if (b.n === 1 && !b.threw) {
        b.threw = true; b.t = 0.7;
        const n = k > 0.5 ? 3 : 2;
        for (let j = 0; j < n; j++) s.shots.push({ id: s.id++, kind: 'carrot', ...inside(aimAt(s, (s.turn + j) % 2, 1.4), BOSS.r - 0.5), fall: lerp(CON.carrot[0], CON.carrot[1], k) + j * 0.2, r: CON.cr });
        emit(s, 'throw');
      } else {
        if (b.n === 0) b.threw = false;
        const t = inside(aimAt(s, s.turn++ % 2, 1.2), BOSS.r - 1.8);
        Object.assign(b, { mode: 'hop', ht: 0, dur: lerp(CON.air[0], CON.air[1], k), fx: b.x, fy: b.y, tx: t.x, ty: t.y });
        b.dir = Math.atan2(t.y - b.y, t.x - b.x);
        emit(s, 'hop', { x: t.x, y: t.y });
      }
    }
    tail(s, CON);
  },
};

/* ---------- El Troll Hipnotizado: rocas y embestidas ---------- */
export const TRO = { hp: 8, time: 50, body: 0.8, cap: 3, stun: 3.4, aim: [1.1, 0.75], speed: [7, 9.5], rock: { warn: [1.2, 0.85], r: 0.75, size: 0.45, life: 7, max: 2 } };
export const jtroll = {
  name: 'Batalla: el Troll Hipnotizado', icon: 'shield', input: 'move2', time: TRO.time, team: true, boss: 'troll', hp: TRO.hp, cap: TRO.cap,
  goal: ['Batalla de jefe en equipo: el Troll Hipnotizado tira rocas que quedan en el piso, y después mira a uno de ustedes y embiste en línea recta.', 'Apártense de las sombras donde caen las rocas. Cuando el troll te mire, ponte detrás de una roca: si choca contra ella queda atontado. Quien no es mirado, que se aparte de su camino. Atontado, ¡corran a chocarlo para pegarle!', `Le ganan con ${TRO.hp} golpes. Tienen ${BOSS.lives} vidas entre los dos; si se acaban, o se acaba el tiempo, gana el troll.`],
  create: (seed) => create(seed, TRO),
  step(s, pads) {
    move(s, pads, TRO);
    const b = s.boss, k = 1 - s.hp / s.max;
    if (b.mode === 'charge') {
      const v = lerp(TRO.speed[0], TRO.speed[1], k);
      b.x += Math.cos(b.dir) * v * DT; b.y += Math.sin(b.dir) * v * DT;
      const rock = s.rocks.find((r) => dist(r, b) < b.r * 0.6 + TRO.rock.size);
      if (rock) { s.rocks = s.rocks.filter((r) => r !== rock); emit(s, 'crash', { x: rock.x, y: rock.y }); stun(s, TRO.stun, 'rock'); }
      else if (Math.hypot(b.x, b.y) > BOSS.r - b.r) { inside(b, BOSS.r - b.r); Object.assign(b, { mode: 'idle', t: 0.7, danger: null }); emit(s, 'wall', { x: b.x, y: b.y }); }
    } else if (b.mode === 'aim') {
      b.t -= DT;
      const p = s.p[b.target];
      if (b.t > b.lock) b.dir = Math.atan2(p.y - b.y, p.x - b.x);
      if (b.t <= 0) { b.mode = 'charge'; b.danger = 'charge'; emit(s, 'charge'); }
    } else if (b.mode === 'idle' && (b.t -= DT) <= 0) {
      if (b.n < 2) {
        b.n++; b.t = 0.45;
        b.dir = Math.atan2(s.p[s.turn % 2].y - b.y, s.p[s.turn % 2].x - b.x);
        const ra = s.rng.next() * 6.283, rr = 1.4 + s.rng.next() * 2.3, at = b.n === 1 ? inside(aimAt(s, s.turn++ % 2, 1.2), BOSS.r - 0.8) : { x: Math.cos(ra) * rr, y: Math.sin(ra) * rr };
        s.shots.push({ id: s.id++, kind: 'rock', ...at, fall: lerp(TRO.rock.warn[0], TRO.rock.warn[1], k), r: TRO.rock.r });
        emit(s, 'throw');
      } else {
        const aim = lerp(TRO.aim[0], TRO.aim[1], k);
        Object.assign(b, { n: 0, mode: 'aim', target: s.turn++ % 2, t: aim, lock: aim * 0.3 });
        emit(s, 'aim', { p: b.target });
      }
    }
    tail(s, TRO);
  },
};

/* ---------- El Rey Sombrío: bigote látigo, rayos y el golpe final juntos ---------- */
export const REY = { hp: 9, time: 55, body: 0.7, cap: 3, stun: 3.2, pair: 3, whip: { len: 3.4, warn: [1.0, 0.7], w: [2.1, 3.2], arc: 5.4, wide: 0.3 }, orb: { v: [3.2, 4.4], gold: 2.6, r: 0.3, back: 8 } };
export const jrey = {
  name: 'Batalla: el Rey Sombrío', icon: 'crown', input: 'move2', time: REY.time, team: true, boss: 'rey', hp: REY.hp, cap: REY.cap,
  goal: ['Batalla de jefe en equipo contra el Rey Sombrío, en tres partes. Gira su bigote como un látigo y lanza rayos oscuros y, a veces, uno dorado.', `Aléjense del bigote cuando gire y esquiven los rayos oscuros. Al principio se cansa solo; después, toquen el rayo dorado: vuelve hacia él y lo deja mareado. Al final, solo le duelen los golpes de los dos casi a la vez.`, `Le ganan con ${REY.hp} golpes. Tienen ${BOSS.lives} vidas entre los dos; si se acaban, o se acaba el tiempo, gana el Rey.`],
  create: (seed) => { const s = create(seed, REY); s.boss.y = -0.4; return s; },
  phase: (s) => (s.hp > 6 ? 1 : s.hp > 3 ? 2 : 3),
  step(s, pads) {
    move(s, pads, REY);
    const b = s.boss, k = 1 - s.hp / s.max, W = REY.whip, ph = jrey.phase(s);
    if (s.whip) {
      const w = s.whip;
      if (w.warn > 0) w.warn -= DT;
      else {
        w.a += w.w * DT; w.sweep += Math.abs(w.w) * DT;
        s.p.forEach((p, i) => {
          const dx = p.x - b.x, dy = p.y - b.y, r = Math.hypot(dx, dy), da = wrap(Math.atan2(dy, dx) - w.a);
          if (r < W.len + BOSS.body * 0.5 && Math.cos(da) > 0 && r * Math.abs(Math.sin(da)) < W.wide + BOSS.body * 0.5) hurt(s, i, 'whip');
        });
        if (w.sweep >= W.arc) { s.whip = null; b.mode = 'idle'; b.t = 0.5; b.n++; if (ph === 1 && b.n >= 2) stun(s, REY.stun, 'tired'); }
      }
      b.dir = s.whip?.a ?? b.dir;
    } else if (b.mode === 'cast' && (b.t -= DT) <= 0) {
      const v = lerp(REY.orb.v[0], REY.orb.v[1], k), dark = ph === 3 ? 3 : 2;
      for (let j = 0; j < dark; j++) {
        const t = aimAt(s, (s.turn + j) % 2, 0.6), a = Math.atan2(t.y - b.y, t.x - b.x) + (j - (dark - 1) / 2) * 0.25;
        s.shots.push({ id: s.id++, kind: 'orb', x: b.x, y: b.y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, r: REY.orb.r });
      }
      const t = aimAt(s, s.turn++ % 2, 1), a = Math.atan2(t.y - b.y, t.x - b.x);
      s.shots.push({ id: s.id++, kind: 'gold', x: b.x, y: b.y, vx: Math.cos(a) * REY.orb.gold, vy: Math.sin(a) * REY.orb.gold, r: REY.orb.r + 0.05 });
      b.mode = 'idle'; b.t = 1.6 - 0.4 * k; b.n++;
      emit(s, 'volley');
    } else if (b.mode === 'idle' && (b.t -= DT) <= 0) {
      // Primera parte: dos látigos y se cansa. Después alterna rayos y látigos.
      if (ph === 1 || b.n % 2 === 1) {
        const dir = s.rng.chance(0.5) ? 1 : -1, near = s.p[s.turn % 2];
        s.whip = { a: Math.atan2(near.y - b.y, near.x - b.x) - dir * 0.9, w: dir * lerp(W.w[0], W.w[1], k), sweep: 0, warn: lerp(W.warn[0], W.warn[1], k) };
        b.mode = 'whip';
        emit(s, 'whip');
      } else { b.mode = 'cast'; b.t = 0.6; emit(s, 'cast'); }
    }
    tail(s, REY);
  },
};

export const BOSSES = ['jconejo', 'jtroll', 'jrey'];
