import { makeRng } from '../rng.js';

// Minijuegos puros y deterministas: step() avanza 1/60 s con los mandos de cada
// jugador, pads[i] = { x, y, a, h, d, aim }. x/y van de −1 a 1, `a` vale true solo en
// el cuadro en que se pulsa, `h` mientras se mantiene, `d` es la dirección recién
// pulsada (0 arriba, 1 derecha, 2 abajo, 3 izquierda) y aim es un punto { x, y } de la
// arena. La vista y (a futuro) la red solo necesitan mandar esos mandos.
export const DT = 1 / 60;
export const noPad = () => ({ x: 0, y: 0, a: false, h: false, d: null, aim: null });

export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const emit = (s, t, o = {}) => s.events.push({ t, ...o });
export const base = (seed) => ({ rng: makeRng(seed), t: 0, events: [], done: false, winner: null, score: [0, 0], left: null });
export const finish = (s) => { s.done = true; s.winner = s.score[0] === s.score[1] ? -1 : s.score[0] > s.score[1] ? 0 : 1; };
