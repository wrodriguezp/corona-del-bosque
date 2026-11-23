// Mide si llegar primero al castillo vale la pena: node tools/final.js
import { autoplay } from './bot.js';
const N = 600;
let first = 0, both = 0, margin = 0, turns = 0;
for (let s = 1; s <= N; s++) {
  const { g } = autoplay(s, undefined, 28, 0.5);
  first += g.winner === g.first; both += g.players.every((p) => p.arrived); turns += g.turns;
  margin += g.players[g.first].gems - g.players[1 - g.first].gems;
}
console.log({ ganaQuienLlegaPrimero: first / N, ambosLlegan: both / N, ventajaMedia: margin / N, turnos: turns / N });
