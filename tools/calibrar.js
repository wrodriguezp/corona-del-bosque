// Ajusta cuánto se distrae la computadora en cada minijuego para cada nivel.
// Uso: node tools/calibrar.js  → imprime la tabla TUNE para src/core/bots.js
import { GAMES } from '../src/core/minigames/index.js';
import { bots, brain, LEVELS } from '../src/core/bots.js';
import { makeRng } from '../src/core/rng.js';

const N = 160;
export function rate(id, k, n = N) {
  const g = GAMES[id];
  let w = 0;
  for (let j = 1; j <= n; j++) {
    const seed = j * 31 + 7, s = g.create(seed), rng = makeRng(seed + 3), b = bots[id](), ai = brain(id, 1, 'normal', seed, k);
    let f = 0;
    while (!s.done && f++ < 12000) { g.step(s, [b[0](s, rng), ai(s)]); s.events.length = 0; }
    w += s.winner === 1 ? 1 : s.winner === -1 ? 0.5 : 0;
  }
  return w / n;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const out = {};
  for (const id of Object.keys(GAMES).filter((id) => !GAMES[id].team)) {
    out[id] = ['facil', 'normal'].map((lv) => {
      let lo = 0, hi = 1;
      for (let it = 0; it < 7; it++) { const mid = (lo + hi) / 2; if (rate(id, mid) > LEVELS[lv].goal) lo = mid; else hi = mid; }
      return +((lo + hi) / 2).toFixed(2);
    });
    console.error(id, out[id]);
  }
  console.log(`export const TUNE = { ${Object.entries(out).map(([id, v]) => `${id}: [${v.join(', ')}]`).join(', ')} };`);
}
