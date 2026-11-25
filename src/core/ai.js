import { CARDS } from './cards.js';
import { handLimit } from './relics.js';
import { byId } from './adventures.js';
import { critterAt, CRITTERS, progress, shaded } from './critters.js';
import { CAVE } from './game.js';

// La computadora en el tablero. Decide con lo mismo que ve una persona: las
// casillas reveladas, los lugares que se ven desde lejos, las criaturas y la Sombra.
// Nunca mira lo que esconde una casilla sin revelar.
// decide(g, rng, level) → la acción para quien está en turno.

// Qué tan bien juega: ruido al elegir camino y ganas de usar cartas.
export const BOARD = {
  facil: { noise: 7, cards: 0.45, smart: 0.5 },
  normal: { noise: 3, cards: 0.75, smart: 0.8 },
  dificil: { noise: 1, cards: 0.95, smart: 1 },
};

const FX = { plus: 2, minus: -2, half: -2, worst: -2, double: 2, shield: 2, again: 3, magnet: 1, map: 2, locked: -2, rush: -1 };

// Cuánto vale para quien juega una lista de consecuencias de aventura.
function fxValue(g, fx) {
  const coop = g.coop, k = coop ? 0.5 : -0.6;
  let v = 0;
  for (const [kind, n] of fx) {
    switch (kind) {
      case 'gems': v += n; break;
      case 'rival': v += n > 0 ? n * k : -n * 0.7; break;
      case 'steal': v += n * 1.6; break;
      case 'pay': v -= n * 1.6; break;
      case 'move': v += n * 1.3; break;
      case 'rivalMove': v += coop ? n : -n; break;
      case 'star': v += n * 1.5; break;
      case 'rivalStar': v += coop ? n * 0.7 : -n * 0.7; break;
      case 'card': case 'offer': v += 3; break;
      case 'fx': v += FX[n] ?? 0; break;
      case 'rivalFx': v += coop ? -(FX[n] ?? 0) : 2; break;
      case 'reveal': v += 1; break;
      case 'flag': v += 0.5; break;
      case 'swap': v += (g.tile(g.player.tile).dist - g.tile(g.rival.tile).dist) * 1.2; break;
      case 'duel': v += coop ? 1 : 0; break;
    }
  }
  return v;
}

function choiceValue(g, c) {
  let v = -(c.cost || 0);
  if (c.check) { const p = (7 - c.check) / 6; v += p * fxValue(g, c.ok.fx) + (1 - p) * fxValue(g, c.fail.fx); }
  else v += fxValue(g, c.fx);
  return v;
}

// Cuánto vale tener esta carta en la mano.
function cardValue(g, id) {
  const p = g.player, r = g.rival, behind = g.tile(p.tile).dist - g.tile(r.tile).dist;
  switch (id) {
    case 'cosecha': return 4;
    case 'cuerno': return 9;
    case 'cometa': return r.arrived ? 1 : Math.min(5, r.gems) * 1.6;
    case 'robo': return r.arrived ? 0 : Math.min(3, r.gems) * 1.6;
    case 'maleta': return r.arrived ? 0 : Math.min(4, r.gems) * 0.8;
    case 'peaje': return r.arrived ? 0 : Math.min(1 + r.hand.length, r.gems) * 1.6;
    case 'apuesta': return 2.5;
    case 'trueque': return Math.min(6, Math.floor(r.gems / 3));
    case 'estela': return 3 + Math.max(0, behind) * 0.8;
    case 'abrazo': return g.hearts < g.maxHearts ? 8 : 4;
    case 'farol': return 5;
    case 'lazo': return r.arrived ? 0 : 4;
    case 'escudo': return 3;
    case 'aliento': return 5;
    case 'doble': case 'botas': case 'catapulta': case 'encantado': return 4;
    default: return 3;
  }
}

// ¿Conviene jugar esta carta ahora, antes de tirar?
function wantsCard(g, id) {
  const p = g.player, r = g.rival, fx = p.fx, far = g.tile(p.tile).dist;
  if (!g.canCard(id)) return false;
  switch (id) {
    case 'escudo': return !fx.shield;
    case 'apuesta': return p.gems >= 3;
    case 'trueque': return r.gems >= 9;
    case 'dorado': case 'mapa': case 'iman': return far > 4;
    case 'botas': case 'doble': return !fx.double && !fx.fixed && far > 3;
    case 'loco': return far > 9 && !fx.fixed;
    case 'prudente': return far > 2 && far <= 6;
    case 'encantado': return !fx.fixed;
    case 'catalejo': return false;
    case 'robo': case 'maleta': case 'cometa': return r.gems >= 3;
    case 'peaje': return r.gems >= 2;
    case 'gusanito': case 'nube': case 'raices': case 'candado': case 'reloj': return !r.arrived;
    case 'cambiazo': return !r.arrived && g.tile(r.tile).dist < far - 2;
    case 'estela': return !r.arrived && g.tile(r.tile).dist < far - 3;
    case 'reto': return p.gems < r.gems && r.gems >= 4;
    case 'farol': return g.players.some((q) => !q.arrived && progress(g, g.tile(q.tile)) - g.shade <= 4);
    case 'abrazo': return true;
    case 'lazo': return !r.arrived;
    default: return true;
  }
}

// El mejor número para el dado encantado: el castillo si está al alcance, si no 6.
function bestFixed(g) {
  const d = g.tile(g.player.tile).dist;
  return d >= 1 && d <= 6 ? d : 6;
}

// Puntaje de terminar en esta casilla, mirando también el camino.
function tileScore(g, id, rng, L) {
  const p = g.player, t = g.tile(id), path = g.pathFor(id);
  let v = -t.dist * 1.6;
  if (id === g.board.castleId) v += 25;
  for (const s of path) {
    const q = g.tile(s);
    if (q.star) v += 2.5;
    const c = critterAt(g, s);
    if (c) v += CRITTERS[c.kind].good ? 2 : -3;
  }
  const c = t.revealed ? t.content : null;
  if (c) {
    switch (c.type) {
      case 'gem': v += c.n; break;
      case 'trap': v -= 5; break;
      case 'eagle': v += 4; break;
      case 'worm': v -= 5; break;
      case 'portal': v += 0.5; break;
      case 'chest': case 'adventure': v += 3; break;
      case 'shrine': v += 3; break;
      case 'duel': v += g.coop ? 1 : 0.5; break;
      case 'shop': v += p.gems >= 7 && p.hand.length < handLimit(p) ? 3 : -1; break;
      case 'cave': v += c.done?.[p.id] ? -1 : 4; break;
      case 'altar': v += c.taken == null ? 7 : -1; break;
      case 'visited': v += 0.5; break;
    }
  } else if (t.content == null || !t.revealed) v += 1.5;
  if (shaded(g, t)) v -= g.coop ? 9 : 4;
  // La Sombra está cerca: mejor alejarse.
  if (g.shade > 0 && progress(g, t) - g.shade < 3) v -= 2;
  if (!g.coop && id === g.rival.tile && !g.rival.arrived) v += 0.5;
  return v + rng.next() * L.noise;
}

export function decide(g, rng, level = 'normal') {
  const L = BOARD[level] || BOARD.normal, p = g.player, r = g.rival;
  switch (g.phase) {
    case 'pick': {
      const vals = g.offer.cards.map((id) => cardValue(g, id) + rng.next() * L.noise * 0.4);
      return { type: 'pick', i: vals.indexOf(Math.max(...vals)) };
    }
    case 'adventure': {
      const a = byId[g.adventure];
      let best = 0, bv = -Infinity;
      a.choices.forEach((c, i) => { if (!g.canChoose(i)) return; const v = choiceValue(g, c) + rng.next() * L.noise * 0.5; if (v > bv) { bv = v; best = i; } });
      return { type: 'choose', i: best };
    }
    case 'shop': {
      if (p.hand.length >= handLimit(p)) return { type: 'shop', i: null };
      let best = null, bv = 0;
      g.shop.items.forEach((it, i) => { if (it.sold || p.gems - it.price < 3) return; const v = cardValue(g, it.card) - it.price * 0.7; if (v > bv) { bv = v; best = i; } });
      return { type: 'shop', i: best };
    }
    case 'cave': {
      const c = g.cave;
      if (c.grabs >= CAVE.length) return { type: 'cave', what: 'leave' };
      const risk = g.caveRisk(), wake = risk / 6, next = CAVE[c.grabs];
      const grab = (1 - wake) * next > wake * (c.bag + 3) + (rng.next() - 0.5) * (1 - L.smart) * 6;
      return { type: 'cave', what: grab ? 'grab' : 'leave' };
    }
    case 'castle': {
      const n = g.castle.die;
      if (g.coop) {
        const gap = progress(g, g.tile(r.tile)) - g.shade;
        return { type: 'castle', what: g.shade > 0 && gap <= 4 ? 'farol' : 'viento' };
      }
      // La torre sirve si deja a la otra persona sin llegar a tiempo.
      const d = g.tile(r.tile).dist;
      return { type: 'castle', what: !r.arrived && d <= 3.5 * g.finalTurns && n >= 2 ? 'torre' : 'cofre' };
    }
    case 'ready': {
      if (!g.cardPlayed && !p.fx.locked && rng.chance(L.cards)) {
        const ok = p.hand.map((id, i) => [id, i]).filter(([id]) => wantsCard(g, id));
        if (ok.length) {
          const [id, i] = ok.sort((a, b) => cardValue(g, b[0]) - cardValue(g, a[0]))[0];
          return { type: 'card', i, value: CARDS[id].choose ? bestFixed(g) : undefined };
        }
      }
      if (g.canBuy('sobre') && p.gems >= 11 && rng.chance(0.5)) return { type: 'buy', what: 'sobre' };
      if (g.canBuy('trampa') && p.gems >= 13 && rng.chance(0.3)) return { type: 'buy', what: 'trampa' };
      return { type: 'roll' };
    }
    case 'move': {
      const ids = g.options(), scored = ids.map((id) => [id, tileScore(g, id, rng, L)]).sort((a, b) => b[1] - a[1]);
      // Con un 1 o un 2 y gemas de sobra, a veces repite la tirada.
      if (g.total <= 2 && g.canBuy('repetir') && p.gems >= 8 && scored[0][1] < -g.tile(p.tile).dist * 1.6 + 2 && rng.chance(L.smart * 0.6)) return { type: 'buy', what: 'repetir' };
      return { type: 'move', id: scored[0][0] };
    }
    default: return null;
  }
}
