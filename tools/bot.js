import assert from 'node:assert/strict';
import { Session } from '../src/core/session.js';
import { makeRng } from '../src/core/rng.js';
import { decide } from '../src/core/ai.js';
import { handLimit } from '../src/core/relics.js';

// Jugador simulado. style: 'corre' va directo; 'explora' busca lugares especiales.
// skill: probabilidad de que la princesa gane un minijuego.
// mode 'coop': juegan juntos; team es la probabilidad de ganar un minijuego en equipo.
// ai: [nivel o null, nivel o null] → ese jugador lo maneja la IA del juego.
// level: la dificultad de la partida (en el modo juntos da los corazones).
export function autoplay(seed, styles = ['mixto', 'mixto'], len = 28, skill = 0.5, { mode = 'versus', team = 0.65, ai = [null, null], level = ai[1] || ai[0] || 'normal' } = {}) {
  const s = new Session({ seed, len, mode, level });
  const g = s.game, rng = makeRng(seed + 7), log = [];
  const act = (a) => log.push(...s.dispatch(a));
  let steps = 0, rolls = 0, swaps = 0, lead = -1;
  const diffs = [];
  act({ type: 'begin' });
  while (g.phase !== 'over') {
    assert.ok(steps++ < 3000, `la partida ${seed} no termina (fase ${g.phase})`);
    const before = s.log.length, p = g.player;
    for (const q of g.players) {
      assert.ok(q.gems >= 0 && q.hand.length <= handLimit(q) && q.stars >= 0);
      assert.equal(g.tile(q.tile).kind, 'path');
    }
    if (ai[g.turn] && g.phase !== 'duel') act(decide(g, rng, ai[g.turn]));
    else if (g.phase === 'pick') act({ type: 'pick', i: rng.int(0, 2) });
    else if (g.phase === 'adventure') { let i; do i = rng.int(0, 2); while (!g.canChoose(i)); act({ type: 'choose', i }); }
    else if (g.phase === 'shop') { const i = g.shop.items.findIndex((it) => !it.sold && it.price <= p.gems - 4 && p.hand.length < handLimit(p)); act({ type: 'shop', i: i >= 0 && rng.chance(0.5) ? i : null }); }
    else if (g.phase === 'cave') act({ type: 'cave', what: g.cave.grabs < 3 ? 'grab' : 'leave' });
    else if (g.phase === 'castle') act({ type: 'castle', what: g.coop ? (g.shade > 0 && rng.chance(0.5) ? 'farol' : 'viento') : rng.chance(0.5) ? 'cofre' : 'torre' });
    else if (g.phase === 'duel') act({ type: 'duel', winner: g.duel.team ? (rng.chance(team) ? -1 : -2) : rng.chance(0.1) ? -1 : rng.chance(skill) ? 0 : 1 });
    else if (g.phase === 'ready') {
      const ok = p.hand.map((c, i) => (g.canCard(c) ? i : -1)).filter((i) => i >= 0);
      if (ok.length && !g.cardPlayed && !p.fx.locked && rng.chance(0.6)) act({ type: 'card', i: rng.pick(ok), value: rng.int(1, 6) });
      else if (g.canBuy('sobre') && rng.chance(0.15)) act({ type: 'buy', what: 'sobre' });
      else if (g.canBuy('trampa') && rng.chance(0.1)) act({ type: 'buy', what: 'trampa' });
      else { act({ type: 'roll' }); rolls++; }
    } else if (g.phase === 'move') {
      if (g.canBuy('repetir') && g.total === 1 && rng.chance(0.2)) { act({ type: 'buy', what: 'repetir' }); continue; }
      const st = styles[g.turn];
      const score = (id) => { const t = g.tile(id); return -t.dist * (st === 'corre' ? 3 : 1.5) + (t.landmark && st !== 'corre' ? 7 : 0) + (g.rival.tile === id ? 2 : 0) + rng.next() * 2; };
      act({ type: 'move', id: g.options().sort((a, b) => score(b) - score(a))[0] });
    }
    assert.ok(s.log.length > before, `acción rechazada en fase ${g.phase}`);
    const d = g.players[0].gems - g.players[1].gems, l = d === 0 ? lead : +(d < 0);
    if (l !== lead) { swaps++; lead = l; }
    diffs.push(d);
  }
  return { g, s, log, rolls, swaps, diffs };
}
