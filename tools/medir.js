// Mide palizas y remontadas: node test/medir.js
import { autoplay } from './bot.js';
for (const [name, skill] of [['parejos', 0.5], ['uno gana 75% de minijuegos', 0.75]]) {
  const N = 600; let turns = 0, gems = 0, m = [], lead = 0, n = 0, w0 = 0, swaps = 0, ev = {};
  for (let s = 1; s <= N; s++) {
    const r = autoplay(s, undefined, 28, skill), [a, b] = r.g.players;
    gems += a.gems + b.gems; m.push(Math.abs(a.gems - b.gems)); w0 += r.g.winner === 0; swaps += r.swaps; turns += r.g.turns; for (const e of r.log) if (e.t === 'event' || e.t === 'burn') ev[e.id || e.t] = (ev[e.id || e.t] || 0) + 1 / N;
    const d = r.diffs[Math.floor(r.diffs.length / 2)];
    if (d) { n++; lead += (d > 0 ? 0 : 1) === r.g.winner; }
    for (const e of r.log) if (e.t === 'fairy') ev[e.kind] = (ev[e.kind] || 0) + 1 / N;
  }
  m.sort((x, y) => x - y);
  console.log(name, { mediana: m[N / 2], p90: m[N * 0.9], max: m.at(-1), paliza15: m.filter((x) => x >= 15).length / N, paliza20: m.filter((x) => x >= 20).length / N, paliza30: m.filter((x) => x >= 30).length / N, liderAMitadGana: lead / n, ganaPrincesa: w0 / N, turnos: turns / N, gemas: gems / N / 2, cambiosLider: swaps / N, eventos: ev });
}
