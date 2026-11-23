import { DT, base, emit, finish } from './kit.js';
import { steer } from './nuevos.js';

/* ---------- El dragón dormido: avanzar solo mientras duerme ---------- */
// Mantener pulsado avanza. Antes de abrir el ojo el dragón se remueve (aviso);
// a veces es falsa alarma. Si te ve moverte con el ojo abierto, vuelves atrás.
export const SLEEPY = { goal: 10, speed: 1.05, warn: 0.55, grace: 0.12, back: 4, stun: 0.7, time: 40 };
export const dragon = {
  name: 'El dragón dormido', icon: 'flame', input: 'hold', time: SLEEPY.time,
  goal: ['Un dragón duerme sobre un tesoro y los dos se acercan a escondidas, cada quien por su camino.', 'Mantén pulsado para caminar. Cuando el dragón se mueva, suelta y quédate quieto: si abre el ojo y te ve caminando, te devuelve atrás. A veces solo se acomoda y vuelve a dormir.', 'Gana quien llegue primero al tesoro.'],
  create(seed) {
    const s = { ...base(seed), left: SLEEPY.time, pos: [0, 0], stun: [0, 0], seen: [0, 0], moving: [false, false] };
    dragon.sleep(s);
    return s;
  },
  sleep(s) { s.eye = 'sleep'; s.clock = 0; s.next = 0.9 + s.rng.next() * 2.1; },
  step(s, pads) {
    s.t += DT; s.clock += DT; s.left = Math.max(0, s.left - DT);
    if (s.eye === 'sleep' && s.clock >= s.next) { s.eye = 'stir'; s.clock = 0; s.fake = s.rng.chance(0.3); emit(s, 'stir'); }
    else if (s.eye === 'stir' && s.clock >= SLEEPY.warn) {
      if (s.fake) { emit(s, 'calm'); dragon.sleep(s); } else { s.eye = 'open'; s.clock = 0; s.next = 1 + s.rng.next() * 1.3; s.seen = [0, 0]; emit(s, 'open'); }
    } else if (s.eye === 'open' && s.clock >= s.next) { emit(s, 'close'); dragon.sleep(s); }
    for (const i of [0, 1]) {
      s.stun[i] = Math.max(0, s.stun[i] - DT);
      s.moving[i] = pads[i].h && s.stun[i] <= 0;
      if (!s.moving[i]) continue;
      if (s.eye === 'open' && s.clock > SLEEPY.grace) {
        s.pos[i] = Math.max(0, s.pos[i] - SLEEPY.back); s.stun[i] = SLEEPY.stun; s.moving[i] = false;
        emit(s, 'caught', { p: i });
        continue;
      }
      s.pos[i] = Math.min(SLEEPY.goal, s.pos[i] + SLEEPY.speed * DT);
    }
    s.score = s.pos.map((p) => Math.floor(p));
    const won = [0, 1].filter((i) => s.pos[i] >= SLEEPY.goal);
    if (won.length || s.left <= 0) {
      s.done = true;
      s.winner = won.length === 1 ? won[0] : Math.abs(s.pos[0] - s.pos[1]) < 0.05 ? -1 : s.pos[0] > s.pos[1] ? 0 : 1;
      emit(s, 'end', { w: s.winner });
    }
  },
};

/* ---------- Cuenta conejos: observar y contar ---------- */
// Cruzan conejos blancos y cafés (algunos cafés con orejas blancas para despistar).
// Cada quien pulsa una vez por cada conejo blanco; al final se comparan las cuentas.
export const HARE = { rounds: 2, run: 11, reveal: 3.2 };
export const conejos = {
  name: 'Cuenta conejos', icon: 'eye', input: 'button',
  goal: ['Por un prado pasan corriendo conejos blancos y cafés, mezclados.', 'Pulsa tu botón una vez por cada conejo BLANCO que veas. Ojo: algunos cafés tienen las orejas blancas, y esos no cuentan.', 'Al final se cuentan los conejos. Si aciertas el número exacto: 2 puntos. Si nadie acierta, 1 punto para quien estuvo más cerca. Son 2 rondas.'],
  create(seed) {
    const s = { ...base(seed), round: 0 };
    conejos.begin(s);
    return s;
  },
  begin(s) {
    s.phase = 'run'; s.clock = -1.2; s.count = [0, 0];
    const n = s.rng.int(14, 19);
    s.hares = Array.from({ length: n }, (_, id) => ({
      id: s.round * 100 + id,
      t: s.rng.next() * (HARE.run - 2.2),
      white: s.rng.chance(0.5),
      lane: s.rng.int(0, 4),
      dir: s.rng.chance(0.5) ? 1 : -1,
      speed: 3.2 + s.rng.next() * 3.2,
      hop: s.rng.next() * 6,
    }));
    for (const h of s.hares) if (!h.white) h.ears = s.rng.chance(0.35);
    s.truth = s.hares.filter((h) => h.white).length;
    emit(s, 'round', { n: s.round + 1 });
  },
  step(s, pads) {
    s.t += DT; s.clock += DT;
    if (s.phase === 'run') {
      if (s.clock >= 0) for (const i of [0, 1]) if (pads[i].a) { s.count[i]++; emit(s, 'tap', { p: i }); }
      if (s.clock >= HARE.run) {
        s.phase = 'reveal'; s.clock = 0;
        const off = s.count.map((c) => Math.abs(c - s.truth)), best = Math.min(...off);
        const gain = off.map((o) => (o === 0 ? 2 : o === best && off[0] !== off[1] ? 1 : 0));
        gain.forEach((g, i) => (s.score[i] += g));
        emit(s, 'reveal', { truth: s.truth, count: [...s.count], gain });
      }
      return;
    }
    if (s.clock >= HARE.reveal) {
      if (++s.round >= HARE.rounds) return finish(s);
      conejos.begin(s);
    }
  },
};

/* ---------- La pesca: paciencia ---------- */
// Cada quien tiene su corcho y la misma lista de picadas (justo para los dos).
// Los tironcitos son falsos; solo el chapuzón grande es el pez. Tirar antes lo espanta.
export const FISH = { time: 30, window: 0.7, scare: 1.4, rest: 0.8 };
export const pesca = {
  name: 'La pesca', icon: 'calm', input: 'button', time: FISH.time,
  goal: ['Cada quien tiene su caña y un corcho flotando en el agua.', 'Mira tu corcho. Si solo tiembla un poquito, es un engaño: espera. Cuando se hunda de golpe con un chapuzón, pulsa para sacar el pez.', 'Si pulsas antes, el pez se asusta y tienes que esperar al siguiente. Gana quien pesque más peces.'],
  create(seed) {
    const s = { ...base(seed), left: FISH.time };
    s.plan = Array.from({ length: 30 }, () => {
      const wait = 1.4 + s.rng.next() * 3, fakes = [];
      for (let t = 0.6 + s.rng.next() * 0.6; t < wait - 0.5; t += 0.5 + s.rng.next() * 0.9) if (s.rng.chance(0.65)) fakes.push(t);
      return { wait, fakes, big: s.rng.chance(0.25) };
    });
    s.p = [0, 1].map(() => ({ k: 0, clock: -0.6, state: 'wait', fake: 0 }));
    return s;
  },
  step(s, pads) {
    s.t += DT; s.left = Math.max(0, s.left - DT);
    s.p.forEach((p, i) => {
      p.clock += DT;
      const f = s.plan[p.k % s.plan.length];
      if (p.state === 'wait') {
        while (p.fake < f.fakes.length && p.clock >= f.fakes[p.fake]) emit(s, 'nibble', { p: i, n: p.fake++ });
        if (p.clock >= f.wait) { p.state = 'bite'; p.clock = 0; emit(s, 'bite', { p: i, big: f.big }); }
        else if (pads[i].a && p.clock > 0) { p.state = 'scared'; p.clock = 0; emit(s, 'scare', { p: i }); }
      } else if (p.state === 'bite') {
        if (pads[i].a) { const n = f.big ? 2 : 1; s.score[i] += n; p.state = 'rest'; p.clock = 0; emit(s, 'catch', { p: i, n, big: f.big }); }
        else if (p.clock >= FISH.window) { p.state = 'rest'; p.clock = 0; emit(s, 'gone', { p: i }); }
      } else if (p.clock >= (p.state === 'scared' ? FISH.scare : FISH.rest)) { p.state = 'wait'; p.clock = 0; p.fake = 0; p.k++; emit(s, 'cast', { p: i }); }
    });
    if (s.left <= 0) finish(s);
  },
};

/* ---------- Ritmo de hongos: tres carriles al compás ---------- */
// Los hongos caen por tres carriles (← ↑ →). Se pulsa la dirección justo cuando
// el hongo toca la línea. Los dos tocan la misma canción.
export const BEAT = { lead: 1.5, good: 0.16, perfect: 0.07, notes: 30 };
const LANES = [3, 0, 1];
export const hongos = {
  name: 'Ritmo de hongos', icon: 'sound', input: 'dirs',
  goal: ['Es un juego de música. Por tres carriles (izquierda, centro y derecha) bajan hongos hacia una línea, al ritmo de la canción.', 'Cuando un hongo llegue a la línea, pulsa la dirección de su carril: izquierda, arriba (para el del centro) o derecha. No mantengas apretado: es un toque por cada hongo.', 'A tiempo: 1 punto. Justo en el momento: 2. Si pulsas cuando no hay hongo, o en el carril equivocado, pierdes 1. Gana quien tenga más puntos al terminar la canción.'],
  create(seed) {
    const s = { ...base(seed), notes: [], next: 0 };
    let t = 2, lane = 1;
    const melody = [0, 2, 4, 5, 7, 9, 11, 12];
    while (s.notes.length < BEAT.notes) {
      const k = s.notes.length / BEAT.notes, gap = 0.62 - 0.2 * k;
      lane = s.rng.chance(0.3) ? lane : s.rng.int(0, 2);
      s.notes.push({ t, lane, pitch: melody[(lane * 2 + s.notes.length) % melody.length], hit: [false, false] });
      t += s.rng.chance(0.2) ? gap * 0.5 : gap;
    }
    s.end = t + 0.8;
    return s;
  },
  step(s, pads) {
    s.t += DT;
    for (const i of [0, 1]) {
      const d = pads[i].d;
      if (d == null || d === 2 || s.t < 0.5) continue;
      const lane = LANES.indexOf(d);
      let best = null, off = 9;
      for (const n of s.notes) { const o = Math.abs(n.t - s.t); if (!n.hit[i] && n.lane === lane && o < off) { off = o; best = n; } }
      if (best && off <= BEAT.good) {
        best.hit[i] = true;
        const pts = off <= BEAT.perfect ? 2 : 1;
        s.score[i] += pts;
        emit(s, 'hit', { p: i, lane, n: pts, pitch: best.pitch });
      } else { s.score[i] = Math.max(0, s.score[i] - 1); emit(s, 'miss', { p: i, lane }); }
    }
    if (s.t >= s.end) finish(s);
  },
};

/* ---------- Pinta el claro: territorio ---------- */
// Cada baldosa que pisas se pinta de tu color. A veces brota una flor mágica que
// pinta todo a su alrededor. Gana quien tenga más baldosas al final.
export const PAINT = { cols: 12, rows: 8, size: 0.8, time: 25, speed: 4.4, grip: 0.12, body: 0.45 };
export const pinta = {
  name: 'Pinta el claro', icon: 'tree', input: 'move2', time: PAINT.time,
  goal: ['El suelo es un tablero de baldosas. Cada quien deja su color por donde camina, como un pincel.', 'Corre por todas partes para pintar baldosas, y pasa por encima de las de tu rival para volverlas tuyas. Si aparece una flor mágica, tómala: pinta todo a su alrededor.', 'Gana quien tenga más baldosas de su color cuando se acabe el tiempo.'],
  create(seed) {
    const s = { ...base(seed), left: PAINT.time, tiles: new Array(PAINT.cols * PAINT.rows).fill(-1), flower: null, next: 4, id: 0 };
    s.p = [-1, 1].map((k) => ({ x: k * 3.6, y: 0, vx: 0, vy: 0 }));
    return s;
  },
  cell(x, y) {
    const c = Math.floor(x / PAINT.size + PAINT.cols / 2), r = Math.floor(y / PAINT.size + PAINT.rows / 2);
    return c >= 0 && r >= 0 && c < PAINT.cols && r < PAINT.rows ? r * PAINT.cols + c : -1;
  },
  step(s, pads) {
    s.t += DT; s.left = Math.max(0, PAINT.time - s.t);
    const W = (PAINT.cols * PAINT.size) / 2 - 0.2, H = (PAINT.rows * PAINT.size) / 2 - 0.2;
    s.p.forEach((p, i) => {
      steer(p, pads[i], PAINT.speed, PAINT.grip);
      if (Math.abs(p.x) > W) { p.x = Math.sign(p.x) * W; p.vx = 0; }
      if (Math.abs(p.y) > H) { p.y = Math.sign(p.y) * H; p.vy = 0; }
      const k = pinta.cell(p.x, p.y);
      if (k >= 0 && s.tiles[k] !== i) { s.tiles[k] = i; emit(s, 'paint', { p: i, k }); }
    });
    const [a, b] = s.p, dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 0.001;
    if (d < PAINT.body * 2) { const nx = dx / d, ny = dy / d, o = PAINT.body - d / 2; a.x -= nx * o; a.y -= ny * o; b.x += nx * o; b.y += ny * o; }
    s.next -= DT;
    if (!s.flower && s.next <= 0 && s.left > 2) {
      s.flower = { id: s.id++, x: (s.rng.next() * 2 - 1) * (W - 0.6), y: (s.rng.next() * 2 - 1) * (H - 0.6) };
      emit(s, 'flower', { ...s.flower });
    }
    if (s.flower) {
      const f = s.flower, got = [0, 1].filter((i) => Math.hypot(s.p[i].x - f.x, s.p[i].y - f.y) < 0.6);
      if (got.length === 1) {
        const i = got[0];
        for (let r = -1; r <= 1; r++) for (let c = -1; c <= 1; c++) { const k = pinta.cell(f.x + c * PAINT.size, f.y + r * PAINT.size); if (k >= 0) s.tiles[k] = i; }
        emit(s, 'bloom', { p: i, x: f.x, y: f.y });
        s.flower = null; s.next = 3 + s.rng.next() * 2;
      }
    }
    s.score = [0, 1].map((i) => s.tiles.filter((t) => t === i).length);
    if (s.left <= 0) finish(s);
  },
};

/* ---------- Topos del jardín: reflejos ---------- */
// Cada quien tiene cuatro agujeros (↑ → ↓ ←). Los dos ven aparecer lo mismo a la vez.
// Topo café: 1 punto. Topo dorado: 2. Erizo: no lo toques (−1). Pulsar un agujero vacío: −1.
export const MOLE = { time: 25 };
export const topos = {
  name: 'Topos del jardín', icon: 'worm', input: 'dirs', time: MOLE.time,
  goal: ['Hay cuatro agujeros: arriba, abajo, izquierda y derecha. De ellos asoman topos, y a veces un erizo.', 'Cuando asome un topo, pulsa la dirección de ese agujero para atraparlo. Al erizo no lo toques.', 'Topo café: 1 punto. Topo dorado: 2. Si pulsas un agujero vacío o donde está el erizo, pierdes 1. Gana quien tenga más puntos.'],
  create(seed) {
    const s = { ...base(seed), left: MOLE.time, pops: [] };
    let t = 1.2;
    while (t < MOLE.time - 1) {
      const k = t / MOLE.time, kind = s.rng.weighted({ mole: 70, gold: 10, hedgehog: 20 });
      s.pops.push({ t, hole: s.rng.int(0, 3), kind, dur: 1.05 - 0.4 * k, hit: [false, false] });
      t += 0.95 - 0.4 * k + s.rng.next() * 0.35;
    }
    return s;
  },
  step(s, pads) {
    s.t += DT; s.left = Math.max(0, MOLE.time - s.t);
    for (const q of s.pops) if (!q.shown && s.t >= q.t) { q.shown = true; emit(s, 'pop', { hole: q.hole, kind: q.kind }); }
    for (const i of [0, 1]) {
      const d = pads[i].d;
      if (d == null) continue;
      const q = s.pops.find((q) => q.hole === d && s.t >= q.t && s.t < q.t + q.dur && !q.hit[i]);
      if (!q || q.kind === 'hedgehog') { s.score[i] = Math.max(0, s.score[i] - 1); if (q) q.hit[i] = true; emit(s, q ? 'ouch' : 'empty', { p: i, hole: d }); continue; }
      q.hit[i] = true;
      const n = q.kind === 'gold' ? 2 : 1;
      s.score[i] += n;
      emit(s, 'bonk', { p: i, hole: d, n });
    }
    if (s.left <= 0) finish(s);
  },
};

/* ---------- Torre de piedras: precisión ---------- */
// Una piedra se balancea sobre tu torre; pulsa para soltarla. Lo que sobresale se cae,
// así que la siguiente piedra es más angosta. Justo al centro no pierde nada.
export const STACK = { time: 25, w: 1.6, amp: 1.5, speed: 2.1, up: 0.17, perfect: 0.07, miss: 0.9 };
export const torre = {
  name: 'La torre de piedras', icon: 'castle', input: 'button', time: STACK.time,
  goal: ['Cada quien construye una torre. Arriba, una piedra se mueve de lado a lado.', 'Pulsa para soltar la piedra cuando esté justo encima de tu torre. La parte que queda fuera se cae, y la torre se va angostando. Si la dejas justo en el centro, la piedra crece un poco.', 'Gana la torre más alta.'],
  create(seed) {
    const s = { ...base(seed), left: STACK.time };
    s.p = [0, 1].map(() => ({ w: STACK.w, cx: 0, ph: Math.PI / 2, wait: 0.6, level: 0 }));
    s.dir = s.rng.chance(0.5) ? 1 : -1;
    return s;
  },
  x(s, p) { return p.cx + Math.sin(p.ph) * STACK.amp * s.dir; },
  step(s, pads) {
    s.t += DT; s.left = Math.max(0, STACK.time - s.t);
    s.p.forEach((p, i) => {
      if (p.wait > 0) { p.wait -= DT; return; }
      p.ph += (STACK.speed + p.level * STACK.up) * DT;
      if (!pads[i].a) return;
      const x = torre.x(s, p), off = x - p.cx, over = p.w - Math.abs(off);
      if (over <= 0.05) { p.wait = STACK.miss; p.ph = Math.PI / 2; emit(s, 'drop', { p: i, x }); return; }
      const perfect = Math.abs(off) < STACK.perfect;
      if (perfect) p.w = Math.min(STACK.w, p.w + 0.15); else { p.cx += off / 2; p.w = over; }
      emit(s, 'stack', { p: i, x: perfect ? p.cx : x, cut: perfect ? 0 : Math.abs(off), side: Math.sign(off), cx: p.cx, w: p.w, level: p.level, perfect });
      p.level++; p.ph = Math.PI / 2; p.wait = 0.25;
      s.score[i] = p.level;
    });
    if (s.left <= 0) finish(s);
  },
};
