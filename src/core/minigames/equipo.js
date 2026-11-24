import { DT, base, clamp, emit } from './kit.js';
import { steer } from './nuevos.js';

// Minijuegos en equipo: los dos ganan o pierden juntos contra la Sombra.
// winner = -1 si ganan los dos, -2 si gana la Sombra. score lleva lo que aportó cada quien.
// Todos van de fácil a difícil: al principio hay margen para aprender los controles.
const end = (s, won) => { s.done = true; s.won = won; s.winner = won ? -1 : -2; emit(s, won ? 'saved' : 'lost'); };

/* ---------- Faroles contra la Sombra: defender la llama ---------- */
// Manchas de sombra reptan desde la orilla hacia la llama del centro. Basta tocarlas
// para deshacerlas. Si tres llegan a la llama, se apaga.
export const LAMP = { r: 4.6, time: 25, speed: 4.3, grip: 0.16, touch: 0.62, core: 0.75, lives: 3 };
export const faroles = {
  name: 'Faroles contra la Sombra', icon: 'sun', input: 'move2', time: LAMP.time, team: true,
  goal: ['Juegan en equipo. En el centro hay una llama, y manchas de sombra se arrastran hacia ella desde los bordes.', 'Muevan a sus personajes y toquen las manchas para deshacerlas antes de que lleguen a la llama. Repártanse los lados.', 'Si 3 manchas llegan a la llama, se apaga y gana la Sombra. Si la llama sigue encendida al acabarse el tiempo, ganan los dos.'],
  create(seed) {
    const s = { ...base(seed), left: LAMP.time, lives: LAMP.lives, blobs: [], next: 1, id: 0 };
    s.p = [-1, 1].map((k) => ({ x: k * 1.6, y: 0.4, vx: 0, vy: 0 }));
    return s;
  },
  step(s, pads) {
    s.t += DT; s.left = Math.max(0, LAMP.time - s.t);
    const k = s.t / LAMP.time;
    s.p.forEach((p, i) => {
      steer(p, pads[i], LAMP.speed, LAMP.grip);
      const d = Math.hypot(p.x, p.y);
      if (d > LAMP.r) { p.x *= LAMP.r / d; p.y *= LAMP.r / d; }
    });
    s.next -= DT;
    if (s.next <= 0 && s.left > 2.5) {
      s.next = 0.9 - 0.58 * k + s.rng.next() * 0.3;
      // Más adelante salen de a dos, por lados opuestos: cada quien debe cuidar el suyo.
      const a0 = s.rng.next() * Math.PI * 2, n = k > 0.35 && s.rng.chance(0.55) ? 2 : 1;
      for (let j = 0; j < n; j++) {
        const a = a0 + j * (Math.PI * 0.8 + s.rng.next() * 0.4);
        s.blobs.push({ id: s.id++, x: Math.cos(a) * (LAMP.r + 0.3), y: Math.sin(a) * (LAMP.r + 0.3), v: 1.2 + 2.1 * k + s.rng.next() * 0.3 });
        emit(s, 'spawn', { a });
      }
    }
    for (const b of s.blobs) {
      const d = Math.hypot(b.x, b.y) || 1;
      b.x -= (b.x / d) * b.v * DT; b.y -= (b.y / d) * b.v * DT;
      const who = [0, 1].find((i) => Math.hypot(s.p[i].x - b.x, s.p[i].y - b.y) < LAMP.touch);
      if (who != null) { b.gone = true; s.score[who]++; emit(s, 'poof', { p: who, x: b.x, y: b.y }); continue; }
      if (d < LAMP.core) { b.gone = true; s.lives--; emit(s, 'burn', { lives: s.lives, x: b.x, y: b.y }); }
    }
    s.blobs = s.blobs.filter((b) => !b.gone);
    if (s.lives <= 0) return end(s, false);
    if (s.left <= 0) end(s, true);
  },
};

/* ---------- Remar juntos: huir por el río ---------- */
// La barca solo avanza si reman por turnos: una vez cada quien. Si alguien rema dos
// veces seguidas, la barca da un bandazo y frena. La Sombra viene detrás, cada vez más rápido.
export const ROW = { goal: 60, stroke: 1.05, drag: 0.75, rest: 0.22, shadow: -7, chase: 3.8, faster: 0.21, time: 30 };
export const remar = {
  name: 'Remar juntos', icon: 'again', input: 'button', time: ROW.time, team: true,
  goal: ['Juegan en equipo. Van los dos en una barca y la Sombra los persigue por detrás.', 'Remen por turnos: primero uno, después el otro, y así. Si la misma persona rema dos veces seguidas, la barca se tambalea y frena.', 'Ganan los dos si llegan a la orilla antes de que la Sombra los alcance.'],
  create(seed) {
    return { ...base(seed), left: ROW.time, x: 0, v: 0, shade: ROW.shadow, last: -1, rest: [0, 0], wob: 0 };
  },
  step(s, pads) {
    s.t += DT; s.left = Math.max(0, ROW.time - s.t);
    s.wob = Math.max(0, s.wob - DT);
    for (const i of [0, 1]) {
      s.rest[i] = Math.max(0, s.rest[i] - DT);
      if (!pads[i].a || s.rest[i] > 0) continue;
      s.rest[i] = ROW.rest;
      // Al comienzo cada remada empuja más y equivocarse frena menos; cerca de la orilla, al revés.
      const k = Math.min(1, s.x / ROW.goal);
      if (s.last === i) { s.v *= 0.72 - 0.34 * k; s.wob = 0.6; emit(s, 'wobble', { p: i }); continue; }
      s.last = i; s.v += ROW.stroke * (1.35 - 0.62 * k) * (s.wob > 0 ? 0.4 : 1); s.score[i]++;
      emit(s, 'stroke', { p: i });
    }
    s.v -= s.v * ROW.drag * DT;
    s.x += s.v * DT;
    s.shade += (ROW.chase + ROW.faster * s.t) * DT * (s.t > 2.5 ? 1 : 0);
    if (s.x >= ROW.goal) return end(s, true);
    if (s.shade >= s.x - 0.5 || s.left <= 0) end(s, false);
  },
};

/* ---------- El escudo de luz: aguantar juntos ---------- */
// Mantener pulsado empuja el escudo, pero cansa. Contra el empuje normal basta uno; cuando
// la Sombra se encrespa (avisa antes) hacen falta los dos. Conviene turnarse para descansar.
export const SHIELD = { time: 24, base: 0.165, surge: 0.4, push: 0.2, drain: 0.3, regain: 0.24, wake: 0.3, warn: 0.9, long: 1.7 };
export const escudo = {
  name: 'El escudo de luz', icon: 'shield', input: 'hold', time: SHIELD.time, team: true,
  goal: ['Juegan en equipo. Entre los dos sostienen un escudo de luz, y la Sombra empuja del otro lado.', 'Mantén pulsado para empujar, pero quien empuja se cansa: túrnense para descansar. Cuando el cielo se pone rojo, la Sombra empuja más fuerte: ahí empujen los dos a la vez.', 'Si aguantan hasta el final, ganan los dos. Si la Sombra rompe el escudo, gana ella.'],
  create(seed) {
    const s = { ...base(seed), left: SHIELD.time, b: 0.25, en: [1, 1], tired: [false, false], push: [false, false], held: [0, 0], mode: 'calm', clock: 0 };
    s.next = 4.5 + s.rng.next() * 1.5;
    return s;
  },
  step(s, pads) {
    s.t += DT; s.left = Math.max(0, SHIELD.time - s.t); s.clock += DT;
    if (s.mode === 'calm' && s.clock >= s.next) { s.mode = 'warn'; s.clock = 0; emit(s, 'warn'); }
    else if (s.mode === 'warn' && s.clock >= SHIELD.warn) { s.mode = 'surge'; s.clock = 0; emit(s, 'surge'); }
    else if (s.mode === 'surge' && s.clock >= SHIELD.long) { s.mode = 'calm'; s.clock = 0; s.next = 2.2 + s.rng.next() * 2.4; emit(s, 'calm'); }
    let force = 0;
    for (const i of [0, 1]) {
      if (s.tired[i] && s.en[i] >= SHIELD.wake) { s.tired[i] = false; emit(s, 'ready', { p: i }); }
      s.push[i] = pads[i].h && !s.tired[i];
      if (s.push[i]) {
        s.en[i] -= SHIELD.drain * DT; force += SHIELD.push; s.held[i] += DT;
        if (s.en[i] <= 0) { s.en[i] = 0; s.tired[i] = true; s.push[i] = false; emit(s, 'tired', { p: i }); }
      } else s.en[i] = Math.min(1, s.en[i] + SHIELD.regain * DT);
    }
    s.score = s.held.map(Math.floor);
    const q = s.t / SHIELD.time; // la Sombra empuja suave al principio y fuerte al final
    s.b = clamp(s.b + ((s.mode === 'surge' ? SHIELD.surge * (0.7 + 0.52 * q) : SHIELD.base * (0.55 + 0.82 * q)) - force) * DT, 0, 1);
    if (s.b >= 1) return end(s, false);
    if (s.left <= 0) end(s, true);
  },
};

/* ---------- El puente: uno sostiene, el otro cruza ---------- */
// Un puente colgante sobre un barranco. Primero cruza uno mientras el otro sostiene las
// cuerdas; después, al revés. Cuando sopla una ráfaga (avisa antes), quien sostiene debe
// mantener pulsado; si no, el puente se mece y quien cruza resbala si sigue caminando.
// Sostener cansa: hay que hacerlo solo durante las ráfagas.
export const BRIDGE = { time: 29, walk: 0.11, drain: 0.42, regain: 0.32, wake: 0.35, warn: 1, gust: 1.3, slip: 0.3 };
export const puente = {
  name: 'El puente', icon: 'hand', input: 'hold', time: BRIDGE.time, team: true,
  goal: ['Juegan en equipo. Hay que cruzar un puente colgante: primero cruza uno mientras el otro sostiene las cuerdas, y después al revés.', 'Quien cruza mantiene pulsado para caminar. Cuando el cielo avisa una ráfaga, quien sostiene mantiene pulsado para afirmar el puente (cansa: suelta cuando pase). Si el puente se mece, quien cruza debe soltar y esperar.', 'Si quien cruza camina con el puente meciéndose, resbala hacia atrás. Ganan los dos si ambos cruzan antes de que se acabe el tiempo.'],
  create(seed) {
    const s = { ...base(seed), left: BRIDGE.time, walker: 0, x: 0, sway: 0, en: [1, 1], tired: [false, false], steady: false, walking: false, mode: 'calm', clock: 0, crossed: 0, slips: 0 };
    s.next = 3.2 + s.rng.next() * 1.2;
    return s;
  },
  step(s, pads) {
    s.t += DT; s.left = Math.max(0, BRIDGE.time - s.t); s.clock += DT;
    const k = Math.min(1, s.t / (BRIDGE.time * 0.8)), w = s.walker, h = 1 - w;
    if (s.mode === 'calm' && s.clock >= s.next) { s.mode = 'warn'; s.clock = 0; emit(s, 'warn'); }
    else if (s.mode === 'warn' && s.clock >= BRIDGE.warn * (1.1 - 0.3 * k)) { s.mode = 'gust'; s.clock = 0; emit(s, 'gust'); }
    else if (s.mode === 'gust' && s.clock >= BRIDGE.gust * (0.8 + 0.6 * k)) { s.mode = 'calm'; s.clock = 0; s.next = 2.8 - 1.2 * k + s.rng.next() * 1.4; emit(s, 'calm'); }
    // Quien sostiene: afirma el puente mientras mantiene pulsado, y se cansa.
    if (s.tired[h] && s.en[h] >= BRIDGE.wake) { s.tired[h] = false; emit(s, 'ready', { p: h }); }
    s.steady = pads[h].h && !s.tired[h];
    if (s.steady) {
      s.en[h] -= BRIDGE.drain * DT;
      if (s.en[h] <= 0) { s.en[h] = 0; s.tired[h] = true; s.steady = false; emit(s, 'tired', { p: h }); }
    } else s.en[h] = Math.min(1, s.en[h] + BRIDGE.regain * DT);
    s.en[w] = Math.min(1, s.en[w] + BRIDGE.regain * DT);
    // Quien cruza: camina mientras mantiene pulsado. Al principio más rápido, al final más lento.
    s.walking = pads[w].h;
    let d = s.walking ? 0.12 : -0.55;
    if (s.mode === 'gust') d += s.steady ? -0.25 : (1.05 + 0.75 * k) * (s.walking ? 1 : 0.6);
    else if (s.steady) d -= 0.4;
    s.sway = clamp(s.sway + d * DT, 0, 1);
    if (s.walking) { s.x += BRIDGE.walk * (1.25 - 0.45 * k) * (1 - s.sway * 0.5) * DT; s.score[w] = Math.max(s.score[w], Math.floor(s.x * 10)); }
    if (s.sway >= 1) { s.x = Math.max(0, s.x - BRIDGE.slip); s.sway = 0.45; s.slips++; emit(s, 'slip', { p: w }); }
    if (s.x >= 1) {
      s.crossed++; emit(s, 'cross', { p: w });
      if (s.crossed >= 2) return end(s, true);
      s.walker = h; s.x = 0; s.sway = 0;
    }
    if (s.left <= 0) end(s, false);
  },
};

/* ---------- Pasar la llama: lanzar y atrapar la antorcha ---------- */
// La antorcha vuela de uno a otro. Quien la recibe pulsa justo cuando le llega; quien la
// tiene la lanza pulsando (si tarda mucho, se lanza sola). Cada vez vuela más rápido y el
// margen se achica. Si se cae 3 veces, se apaga.
export const FLAME = { goal: 12, lives: 3, time: 40, hold: 2, early: 0.5, flight: [1.3, 0.62], win: [0.26, 0.13], relight: 1.1 };
export const llama = {
  name: 'Pasar la llama', icon: 'flame', input: 'button', time: FLAME.time, team: true,
  goal: ['Juegan en equipo. Tienen una antorcha y deben lanzársela de uno a otro, sin que se caiga, a través de una cueva oscura.', 'Quien tiene la antorcha pulsa para lanzarla. Quien la recibe pulsa justo cuando le llega a las manos: ni antes ni después. Cada pase es un poco más rápido.', `Con ${FLAME.goal} pases atrapados ganan los dos. Si la antorcha se cae 3 veces, se apaga y gana la Sombra.`],
  create(seed) {
    return { ...base(seed), left: FLAME.time, holder: 0, phase: 'hold', clock: 0, caught: 0, lives: FLAME.lives, flight: FLAME.flight[0], win: FLAME.win[0] };
  },
  step(s, pads) {
    s.t += DT; s.left = Math.max(0, FLAME.time - s.t); s.clock += DT;
    const r = 1 - s.holder;
    if (s.phase === 'relight') { if (s.clock >= FLAME.relight) { s.phase = 'hold'; s.clock = 0; emit(s, 'lit', { p: s.holder }); } }
    else if (s.phase === 'hold') {
      if (pads[s.holder].a || s.clock >= FLAME.hold) {
        const k = s.caught / FLAME.goal;
        s.flight = FLAME.flight[0] + (FLAME.flight[1] - FLAME.flight[0]) * k;
        s.win = FLAME.win[0] + (FLAME.win[1] - FLAME.win[0]) * k;
        s.phase = 'fly'; s.clock = 0;
        emit(s, 'throw', { p: s.holder, flight: s.flight });
      }
    } else if (s.phase === 'fly') {
      const off = s.clock - s.flight;
      let drop = off > s.win;
      if (pads[r].a && off >= -FLAME.early) {
        if (Math.abs(off) <= s.win) {
          s.caught++; s.score[r]++; s.holder = r; s.phase = 'hold'; s.clock = 0;
          emit(s, 'catch', { p: r, n: s.caught, good: Math.abs(off) < s.win * 0.45 });
          if (s.caught >= FLAME.goal) return end(s, true);
        } else drop = true;
      }
      if (drop) {
        s.lives--; s.phase = 'relight'; s.clock = 0;
        emit(s, 'drop', { p: r, lives: s.lives, early: off < 0 });
        if (s.lives <= 0) return end(s, false);
      }
    }
    if (s.left <= 0) end(s, false);
  },
};

/* ---------- Runas en equipo: cada quien tiene su parte ---------- */
// Las runas se encienden una tras otra, cada una del color de quien debe marcarla. Después
// repiten la secuencia entre los dos, en orden: cada quien marca solo las de su color.
export const TEAM_RUNES = { lens: [3, 4, 5, 6], show: [0.7, 0.5], lives: 3, gap: 1.1 };
export const runeq = {
  name: 'Runas en equipo', icon: 'eye', input: 'dirs', team: true,
  goal: ['Juegan en equipo. Hay cuatro runas en el suelo, una por dirección. Se encienden una tras otra, cada una del color de uno de los dos.', 'Miren bien el orden y los colores. Después repítanlo entre los dos, en el mismo orden: cada quien marca con sus flechas solo las runas de su color, y espera su turno.', 'Son 4 secuencias, cada vez más largas. Si alguien se equivoca o se adelanta, pierden 1 de sus 3 vidas y la secuencia se repite. Ganan los dos si completan las 4.'],
  create(seed) {
    const s = { ...base(seed), round: 0, lives: TEAM_RUNES.lives };
    runeq.deal(s);
    return s;
  },
  deal(s) {
    const n = TEAM_RUNES.lens[s.round];
    s.seq = Array.from({ length: n }, () => ({ d: s.rng.int(0, 3), p: s.rng.int(0, 1) }));
    if (s.seq.every((q) => q.p === s.seq[0].p)) s.seq[s.rng.int(0, n - 1)].p = 1 - s.seq[0].p; // siempre juegan los dos
    runeq.show(s);
  },
  show(s) { s.phase = 'show'; s.clock = -0.6; s.at = -1; s.n = 0; emit(s, 'round', { n: s.round + 1, len: s.seq.length }); },
  step(s, pads) {
    s.t += DT; s.clock += DT;
    if (s.phase === 'show') {
      const speed = TEAM_RUNES.show[0] + (TEAM_RUNES.show[1] - TEAM_RUNES.show[0]) * (s.round / (TEAM_RUNES.lens.length - 1));
      const k = Math.floor(s.clock / speed);
      if (s.clock >= 0 && k !== s.at) {
        s.at = k;
        if (k < s.seq.length) emit(s, 'glow', s.seq[k]);
        else { s.phase = 'play'; s.clock = 0; s.limit = 2.2 + s.seq.length * 0.9; emit(s, 'go'); }
      }
      return;
    }
    if (s.phase === 'end') {
      if (s.clock < TEAM_RUNES.gap) return;
      if (s.lives <= 0) return end(s, false);
      if (s.redo) { s.redo = false; return runeq.show(s); }
      if (++s.round >= TEAM_RUNES.lens.length) return end(s, true);
      return runeq.deal(s);
    }
    const q = s.seq[s.n];
    // Primero se mira a quien le toca: si los dos pulsan a la vez, cuenta su jugada.
    for (const i of [q.p, 1 - q.p]) {
      const d = pads[i].d;
      if (d == null) continue;
      if (i !== q.p || d !== q.d) return runeq.fail(s, i, d);
      s.n++; s.score[i]++;
      emit(s, 'hit', { p: i, d, n: s.n });
      if (s.n >= s.seq.length) { s.phase = 'end'; s.clock = 0; emit(s, 'clear', { n: s.round + 1 }); }
      return;
    }
    if (s.clock > s.limit) runeq.fail(s, q.p, null);
  },
  fail(s, p, d) {
    s.lives--; s.redo = true; s.phase = 'end'; s.clock = 0;
    emit(s, 'miss', { p, d, lives: s.lives, want: s.seq[s.n] });
  },
};
