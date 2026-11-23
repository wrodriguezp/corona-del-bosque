import { DT, base, clamp, emit } from './kit.js';
import { steer } from './nuevos.js';

// Minijuegos en equipo: los dos ganan o pierden juntos contra la Sombra.
// winner = -1 si ganan los dos, -2 si gana la Sombra. score lleva lo que aportó cada quien.
const end = (s, won) => { s.done = true; s.won = won; s.winner = won ? -1 : -2; emit(s, won ? 'saved' : 'lost'); };

/* ---------- Faroles contra la Sombra: defender la llama ---------- */
// Manchas de sombra reptan desde la orilla hacia la llama del centro. Basta tocarlas
// para deshacerlas. Si tres llegan a la llama, se apaga.
export const LAMP = { r: 4.6, time: 25, speed: 4.3, grip: 0.16, touch: 0.62, core: 0.75, lives: 3 };
export const faroles = {
  name: 'Faroles contra la Sombra', icon: 'sun', input: 'move2', time: LAMP.time, team: true,
  goal: 'Juegan en equipo. Manchas de sombra reptan hacia la llama del centro: tóquenlas para deshacerlas. Si tres llegan a la llama, se apaga y gana la Sombra. Si la llama sigue encendida al final, ganan los dos.',
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
        s.blobs.push({ id: s.id++, x: Math.cos(a) * (LAMP.r + 0.3), y: Math.sin(a) * (LAMP.r + 0.3), v: 1.7 + 1.5 * k + s.rng.next() * 0.3 });
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
export const ROW = { goal: 60, stroke: 1.05, drag: 0.75, rest: 0.22, shadow: -7, chase: 3.8, faster: 0.12, time: 30 };
export const remar = {
  name: 'Remar juntos', icon: 'again', input: 'button', time: ROW.time, team: true,
  goal: 'Juegan en equipo. Remen por turnos, una vez cada quien: así la barca avanza. Si alguien rema dos veces seguidas, la barca se tambalea y frena. Lleguen a la orilla antes de que la Sombra los alcance.',
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
      if (s.last === i) { s.v *= 0.45; s.wob = 0.6; emit(s, 'wobble', { p: i }); continue; }
      s.last = i; s.v += ROW.stroke * (s.wob > 0 ? 0.4 : 1); s.score[i]++;
      emit(s, 'stroke', { p: i });
    }
    s.v -= s.v * ROW.drag * DT;
    s.x += s.v * DT;
    s.shade += (ROW.chase + ROW.faster * s.t) * DT * (s.t > 1.5 ? 1 : 0);
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
  goal: 'Juegan en equipo. Mantén pulsado para empujar el escudo contra la Sombra, pero cansa: túrnense para descansar. Cuando la Sombra se encrespa (el cielo se pone rojo), empujen los dos a la vez. Si la Sombra rompe el escudo, gana ella.',
  create(seed) {
    const s = { ...base(seed), left: SHIELD.time, b: 0.25, en: [1, 1], tired: [false, false], push: [false, false], held: [0, 0], mode: 'calm', clock: 0 };
    s.next = 3 + s.rng.next() * 2;
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
    s.b = clamp(s.b + ((s.mode === 'surge' ? SHIELD.surge : SHIELD.base) - force) * DT, 0, 1);
    if (s.b >= 1) return end(s, false);
    if (s.left <= 0) end(s, true);
  },
};
