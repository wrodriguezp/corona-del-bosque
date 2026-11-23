import { DT, base, clamp, emit, finish } from './kit.js';

/* ---------- Tira y afloja: pulsar al ritmo ---------- */
export const PULL = { beats: 24, good: 0.17, perfect: 0.075, lead: 1.1, reach: 12 };
export const tira = {
  name: 'Tira y afloja', icon: 'swap', input: 'button',
  goal: ['Los dos tiran de una cuerda. Un aro de luz se cierra una y otra vez sobre una estrella, como un latido.', 'Pulsa tu botón justo cuando el aro toque la estrella, siguiendo el ritmo.', 'A tiempo: 1 punto. Perfecto: 2. Si pulsas cuando no toca, pierdes 1. La cuerda se va hacia quien lleva más puntos: gana quien saque 12 de ventaja, o quien vaya adelante al acabarse el tiempo.'],
  create(seed) {
    const s = { ...base(seed), beats: [], used: [-1, -1], pos: 0, next: 0 };
    let t = 1.6;
    while (s.beats.length < PULL.beats) {
      const k = s.beats.length / PULL.beats, gap = 0.95 - 0.33 * k;
      s.beats.push(t);
      // De vez en cuando, un golpe doble.
      if (k > 0.2 && s.beats.length < PULL.beats && s.rng.chance(0.22)) { t += gap * 0.55; s.beats.push(t); }
      t += gap;
    }
    return s;
  },
  step(s, pads) {
    s.t += DT;
    while (s.next < s.beats.length && s.beats[s.next] <= s.t) emit(s, 'beat', { n: s.next++ });
    for (const i of [0, 1]) {
      if (!pads[i].a) continue;
      let b = -1, off = 9;
      s.beats.forEach((t, k) => { const d = Math.abs(t - s.t); if (d < off) { off = d; b = k; } });
      if (off > PULL.good || s.used[i] >= b) { if (s.t > 0.6) { s.score[i] = Math.max(0, s.score[i] - 1); emit(s, 'slip', { p: i }); } continue; }
      s.used[i] = b;
      const n = off <= PULL.perfect ? 2 : 1;
      s.score[i] += n;
      emit(s, 'pull', { p: i, n });
    }
    s.pos = clamp((s.score[1] - s.score[0]) / PULL.reach, -1, 1);
    if (Math.abs(s.pos) >= 1 || s.t > s.beats.at(-1) + 0.7) finish(s);
  },
};

/* ---------- Memoria de runas: repetir la secuencia ---------- */
export const RUNES = { lens: [3, 4, 5, 6], show: 0.58 };
export const runas = {
  name: 'Memoria de runas', icon: 'eye', input: 'dirs',
  goal: ['Hay cuatro runas en el suelo, una por dirección. Se encienden una tras otra formando una secuencia.', 'Mira bien el orden. Cuando terminen de encenderse, repítelo con tus flechas o teclas, en el mismo orden.', 'Repetirla bien: 1 punto, y 1 más si lo haces antes que tu rival. Si te equivocas, esperas a la siguiente. Son 4 secuencias, cada vez más largas.'],
  create(seed) {
    const s = { ...base(seed), round: 0 };
    runas.begin(s);
    return s;
  },
  begin(s) {
    s.phase = 'show'; s.clock = -1; s.at = -1;
    s.seq = Array.from({ length: RUNES.lens[s.round] }, () => s.rng.int(0, 3));
    s.p = [0, 1].map(() => ({ n: 0, out: false, ok: false }));
    s.limit = s.seq.length * 0.95 + 1.6;
    emit(s, 'round', { n: s.round + 1, len: s.seq.length });
  },
  step(s, pads) {
    s.t += DT; s.clock += DT;
    if (s.phase === 'show') {
      const k = Math.floor(s.clock / RUNES.show);
      if (s.clock >= 0 && k !== s.at) {
        s.at = k;
        if (k < s.seq.length) emit(s, 'glow', { d: s.seq[k] });
        else { s.phase = 'play'; s.clock = 0; emit(s, 'go'); }
      }
      return;
    }
    if (s.phase === 'end') {
      if (s.clock < 1.5) return;
      if (++s.round >= RUNES.lens.length) return finish(s);
      return runas.begin(s);
    }
    const done = [];
    s.p.forEach((p, i) => {
      const d = pads[i].d;
      if (d == null || p.out || p.ok) return;
      if (d !== s.seq[p.n]) { p.out = true; emit(s, 'miss', { p: i, d }); return; }
      p.n++;
      emit(s, 'hit', { p: i, n: p.n, d });
      if (p.n === s.seq.length) done.push(i);
    });
    const first = !s.p.some((p) => p.ok);
    for (const i of done) { const n = first ? 2 : 1; s.p[i].ok = true; s.score[i] += n; emit(s, 'clear', { p: i, n }); }
    if (s.p.every((p) => p.out || p.ok) || s.clock > s.limit) { s.phase = 'end'; s.clock = 0; emit(s, 'end'); }
  },
};

/* ---------- Salta el rayo: una vara que gira cada vez más rápido ---------- */
export const JUMP = { r: 2.7, time: 0.48, rest: 0.1, high: 1.4, clear: 0.5, lives: 3, top: 5, flip: 1.15 };
export const salto = {
  name: 'Salta el rayo', icon: 'boot', input: 'button',
  goal: ['Los dos están parados en un círculo. Un rayo da vueltas pegado al suelo, como una cuerda de saltar, cada vez más rápido.', 'Pulsa para saltar justo cuando el rayo llegue a tus pies. Ojo: a veces cambia de sentido.', 'Cada vez que te golpea pierdes una de tus 3 vidas. Gana quien termine con más vidas.'],
  create(seed) {
    const s = { ...base(seed), ang: 0, dir: 1, speed: 1.5, want: 1.5, pass: 0, flip: null, p: [0, 1].map(() => ({ air: 0, rest: 0, y: 0, hurt: 0 })) };
    s.score = [JUMP.lives, JUMP.lives];
    s.dir = s.rng.chance(0.5) ? 1 : -1;
    s.ang = Math.PI / 2;
    s.gone = 0;
    return s;
  },
  step(s, pads) {
    s.t += DT;
    s.p.forEach((p, i) => {
      p.hurt = Math.max(0, p.hurt - DT);
      p.rest = Math.max(0, p.rest - DT);
      if (p.air > 0) { p.air = Math.max(0, p.air - DT); if (!p.air) p.rest = JUMP.rest; }
      else if (pads[i].a && !p.rest) { p.air = JUMP.time; emit(s, 'jump', { p: i }); }
      const k = 1 - p.air / JUMP.time;
      p.y = p.air > 0 ? 4 * k * (1 - k) * JUMP.high : 0;
    });
    s.speed += (s.want - s.speed) * 0.06;
    const before = s.ang;
    s.ang += s.dir * s.speed * DT;
    // Los dos brazos pasan a la vez por ambas personas, cada media vuelta.
    if (Math.floor(before / Math.PI) !== Math.floor(s.ang / Math.PI)) {
      s.pass++;
      const hit = s.p.map((p) => p.y < JUMP.clear);
      hit.forEach((h, i) => { if (h) { s.score[i]--; s.p[i].hurt = 0.9; } emit(s, h ? 'hit' : 'dodge', { p: i }); });
      if (s.score[0] <= 0 || s.score[1] <= 0 || s.pass >= 34) return finish(s);
      s.want = Math.min(JUMP.top, (2 + s.pass * 0.15) * (0.75 + s.rng.next() * 0.5));
      s.flip = s.pass > 2 && s.rng.chance(0.3) ? JUMP.flip + s.rng.next() * 0.9 : null;
      s.gone = 0;
    }
    s.gone += s.speed * DT;
    if (s.flip && s.gone > s.flip) { s.flip = null; s.gone = 0; s.dir = -s.dir; s.speed *= 0.3; emit(s, 'flip'); }
  },
};

/* ---------- Cosas en común de las arenas con movimiento libre ---------- */
export const steer = (p, pad, speed, grip) => {
  let { x, y } = pad;
  const m = Math.hypot(x, y);
  if (m > 1) { x /= m; y /= m; }
  p.vx += (x * speed - p.vx) * grip; p.vy += (y * speed - p.vy) * grip;
  p.x += p.vx * DT; p.y += p.vy * DT;
};

/* ---------- Choque en la isla: empujar fuera del hielo ---------- */
export const SUMO = { r: 4.2, min: 0.45, body: 0.55, speed: 5.2, grip: 0.045, hold: 3.5, shrink: 7 };
export const choque = {
  name: 'Choque en el hielo', icon: 'snow', input: 'move2',
  goal: ['Los dos están en una pista de hielo redonda que se va achicando. Resbala mucho, como chocar autitos.', 'Toma vuelo y lánzate contra tu rival para empujarlo fuera de la pista. Mientras más rápido vas, más fuerte empujas.', 'Quien se cae del hielo pierde la ronda. Gana quien gane 2 rondas.'],
  create(seed) {
    const s = { ...base(seed), round: 1, idle: 0 };
    choque.begin(s);
    return s;
  },
  begin(s) {
    s.phase = 'ready'; s.clock = 0; s.r = SUMO.r;
    s.p = [-1, 1].map((k) => ({ x: k * 2.2, y: 0, vx: 0, vy: 0, out: false }));
    emit(s, 'round', { n: s.round });
  },
  step(s, pads) {
    s.t += DT; s.clock += DT;
    if (s.phase === 'ready') { if (s.clock > 1.2) { s.phase = 'run'; s.clock = 0; emit(s, 'go'); } return; }
    if (s.phase === 'end') {
      // Quien cae sigue de largo; quien se salva vuelve a pisar firme.
      s.p.forEach((p) => {
        if (p.out) { p.x += p.vx * DT; p.y += p.vy * DT; }
        else { p.vx *= 0.8; p.vy *= 0.8; p.x *= 0.93; p.y *= 0.93; }
      });
      if (s.clock < 1.7) return;
      if (s.score.includes(2) || s.idle > 2) return finish(s);
      s.round++;
      return choque.begin(s);
    }
    s.r = SUMO.r - (SUMO.r - SUMO.min) * clamp((s.clock - SUMO.hold) / SUMO.shrink, 0, 1);
    s.p.forEach((p, i) => steer(p, pads[i], SUMO.speed, SUMO.grip));
    const [a, b] = s.p, dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001;
    if (d < SUMO.body * 2) {
      const nx = dx / d, ny = dy / d, over = (SUMO.body * 2 - d) / 2;
      a.x -= nx * over; a.y -= ny * over; b.x += nx * over; b.y += ny * over;
      const va = a.vx * nx + a.vy * ny, vb = b.vx * nx + b.vy * ny, hit = va - vb;
      if (hit > 0) {
        // Choque elástico con un extra de rebote: quien llega más rápido se lleva menos.
        const k = 1.15 + Math.min(0.5, hit * 0.06);
        const na = vb * k - 0.6, nb = va * k + 0.6;
        a.vx += (na - va) * nx; a.vy += (na - va) * ny;
        b.vx += (nb - vb) * nx; b.vy += (nb - vb) * ny;
        emit(s, 'bump', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, n: hit });
      }
    }
    s.p.forEach((p) => (p.out = Math.hypot(p.x, p.y) > s.r + 0.12));
    if (!a.out && !b.out) return;
    s.phase = 'end'; s.clock = 0;
    // Si salen a la vez, pierde quien quedó más lejos; si fue casi igual, se repite.
    const gap = Math.hypot(a.x, a.y) - Math.hypot(b.x, b.y);
    if (a.out && b.out && Math.abs(gap) < 0.06) { s.idle++; emit(s, 'both'); }
    else { const w = gap > 0 ? 1 : 0; s.score[w]++; s.p[w].out = false; s.p[1 - w].out = true; emit(s, 'fall', { p: 1 - w, w }); }
  },
};

/* ---------- Huevo de dragón: pasar el huevo antes de que reviente ---------- */
export const EGG = { r: 4.4, body: 0.5, speed: 4.5, rush: 1.1, grip: 0.16, calm: 0.7 };
export const huevo = {
  name: 'Huevo de dragón', icon: 'flame', input: 'move2',
  goal: ['Uno de los dos lleva un huevo de dragón que va a explotar en cualquier momento. Nadie sabe cuándo.', 'Si tienes el huevo, persigue a tu rival y tócalo para pasárselo. Si no lo tienes, huye. Quien lleva el huevo corre un poquito más rápido.', 'Quien tenga el huevo cuando explote pierde la ronda. Gana quien gane 2 rondas.'],
  create(seed) {
    const s = { ...base(seed), round: 1 };
    s.first = s.rng.int(0, 1);
    huevo.begin(s);
    return s;
  },
  begin(s) {
    s.phase = 'ready'; s.clock = 0; s.safe = 0;
    s.holder = s.round === 3 ? s.rng.int(0, 1) : s.round === 2 ? 1 - s.first : s.first;
    s.fuse = 6.5 + s.rng.next() * 5.5;
    s.p = [-1, 1].map((k) => ({ x: k * 2.6, y: 0, vx: 0, vy: 0 }));
    emit(s, 'round', { n: s.round, p: s.holder });
  },
  step(s, pads) {
    s.t += DT; s.clock += DT;
    if (s.phase === 'ready') { if (s.clock > 1.9) { s.phase = 'run'; s.clock = 0; emit(s, 'go'); } return; }
    if (s.phase === 'end') {
      if (s.clock < 1.8) return;
      if (s.score.includes(2)) return finish(s);
      s.round++;
      return huevo.begin(s);
    }
    s.safe = Math.max(0, s.safe - DT);
    s.p.forEach((p, i) => {
      // Quien acaba de pasar el huevo tiene un respiro; quien lo recibe, un tropiezo.
      const slow = s.safe > EGG.calm * 0.45 && i === s.holder ? 0.25 : 1;
      steer(p, pads[i], EGG.speed * (i === s.holder ? EGG.rush : 1) * slow, EGG.grip);
      const d = Math.hypot(p.x, p.y);
      if (d > EGG.r) { p.x *= EGG.r / d; p.y *= EGG.r / d; }
    });
    const [a, b] = s.p, dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001, min = EGG.body * 2;
    if (d < min) {
      const o = (min - d) / 2;
      a.x -= (dx / d) * o; a.y -= (dy / d) * o; b.x += (dx / d) * o; b.y += (dy / d) * o;
    }
    if (d < min + 0.12 && s.safe <= 0) { s.holder = 1 - s.holder; s.safe = EGG.calm; emit(s, 'pass', { p: s.holder }); }
    if (s.clock >= s.fuse) { s.phase = 'end'; s.clock = 0; s.score[1 - s.holder]++; emit(s, 'boom', { p: s.holder, w: 1 - s.holder, x: s.p[s.holder].x, y: s.p[s.holder].y }); }
  },
};

/* ---------- Burbuja valiente: inflar sin que reviente ---------- */
export const BUBBLE = { rounds: 3, rate: 0.21, wait: 3.5 };
export const burbuja = {
  name: 'Burbuja valiente', icon: 'portal', input: 'hold',
  goal: ['Cada quien tiene una burbuja que crece mientras la inflas. Las dos revientan al mismo tamaño, pero no sabes cuál es.', 'Mantén pulsado para inflar y suelta para quedarte con lo que tengas. Cuando está por reventar, la burbuja tiembla.', 'Mientras más grande la sueltes, más puntos ganas. Si revienta, esa ronda no suma nada. Son 3 rondas, y en cada una revientan en un tamaño distinto.'],
  create(seed) {
    const s = { ...base(seed), round: 0 };
    burbuja.begin(s);
    return s;
  },
  begin(s) {
    s.round++;
    s.phase = 'run'; s.clock = -1.1;
    s.limit = 0.4 + s.rng.next() * 0.6;
    s.tell = s.limit - 0.1 - s.rng.next() * 0.22; // desde aquí tiembla
    s.p = [0, 1].map(() => ({ size: 0, state: 'wait', h: false }));
    emit(s, 'round', { n: s.round });
  },
  step(s, pads) {
    s.t += DT; s.clock += DT;
    if (s.phase === 'end') {
      if (s.clock < 1.9) return;
      if (s.round >= BUBBLE.rounds) return finish(s);
      return burbuja.begin(s);
    }
    if (s.clock < 0) return;
    s.p.forEach((p, i) => {
      const h = pads[i].h;
      if (p.state === 'wait') {
        if (h) { p.state = 'grow'; emit(s, 'start', { p: i }); }
        else if (s.clock > BUBBLE.wait) { p.state = 'kept'; }
      }
      if (p.state !== 'grow') return;
      if (!h) {
        p.state = 'kept';
        p.pts = Math.max(1, Math.round(p.size * 10));
        s.score[i] += p.pts;
        emit(s, 'keep', { p: i, n: p.pts });
        return;
      }
      p.size += BUBBLE.rate * DT * (1 + p.size * 0.6);
      if (p.size >= s.limit) { p.state = 'pop'; emit(s, 'pop', { p: i }); }
    });
    if (s.p.every((p) => p.state === 'kept' || p.state === 'pop')) { s.phase = 'end'; s.clock = 0; emit(s, 'end'); }
  },
};
