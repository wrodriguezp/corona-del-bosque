import { makeRng } from './rng.js';
import { makeBoard, bfs, pathTo } from './board.js';
import { CARDS, COMMON, TEAM_DECK, HAND_LIMIT, PRICES, comebackCard, offerCards } from './cards.js';
import { DAY, NIGHT, worldTick } from './world.js';
import { ADVENTURES, byId, describe, friendly } from './adventures.js';
import { critterAt, meet, progress, shadeRaw, shadeTick } from './critters.js';

// Reglas puras: sin gráficos. Toda jugada entra por apply(acción) y devuelve una
// lista de eventos que la vista anima en orden. Con la misma semilla y las mismas
// acciones se obtiene siempre la misma partida (guardado, repetición, en línea).

export const ARRIVE_FIRST = 10;
export const ARRIVE_SECOND = 4;
export const FINAL_TURNS = 3;
export const CARD_GEMS = 2; // cada carta que sobra al final vale 2 gemas
export const LATE = 5; // gemas que pierde quien no alcanza a llegar al castillo
export const RUSH = 10; // segundos de la carta «¡Piensa rápido!»
export const SIGHT = 3;
export const TOURNEY_EVERY = 6; // turnos entre rondas de minijuegos: 3 por jugador
export const TEAM_ROUND = 3; // cada tantas rondas, una es en equipo
// Hada madrina: acompaña a quien va atrás. nivel: [entra, sale] según su desventaja en gemas.
export const FAIRY = { 1: [6, 3], 2: [13, 9] };
export const FAIRY_FROM = 4; // turnos de gracia al comenzar
export const DUEL_GEMS = 4;
export const CAVE = [2, 3, 3, 4, 5, 6];
export const MINIGAMES = ['duelo', 'lluvia', 'fuga', 'tira', 'runas', 'salto', 'choque', 'huevo', 'burbuja', 'dragon', 'conejos', 'pesca', 'hongos', 'pinta', 'topos', 'torre', 'cruce', 'enreda', 'escobas', 'garra', 'nieve', 'catapulta', 'tortuga', 'hockey'];
export const TEAM_GAMES = ['faroles', 'remar', 'escudo', 'puente', 'llama', 'runeq', 'cruceq', 'piso', 'carruaje', 'muralla', 'garraq', 'mina', 'pocion', 'globo'];
// Batallas de jefe (V4.3): cada guardián tiene la suya. En «uno contra otro», quien
// le pega más veces al jefe gana BOSS_GEM gema extra.
export const BOSSES = ['jconejo', 'jtroll', 'jrey'];
export const BOSS_GEM = 1;
export const TEAM_WIN = 4; // gemas para cada quien si vencen a la Sombra
export const TEAM_LOSE = 3; // gemas que les quita a cada quien si gana ella
export const NEAR = [0.5, 0.72];
// Guardianes del Rey Sombrío: cierran el paso entre zonas. Quien llega primero a uno
// se detiene y los dos juegan juntos un minijuego en equipo contra él.
export const GUARDS = [
  { at: 0.28, kind: 'conejo', name: 'el Conejo Gigante', title: '¡El Conejo Gigante cierra el paso!', text: 'Un conejo enorme, hipnotizado por el Rey Sombrío, no deja pasar a nadie. ¡A vencerlo juntos!' },
  { at: 0.53, kind: 'troll', name: 'el Troll Hipnotizado', title: '¡Un troll hipnotizado!', text: 'El Rey Sombrío puso a su troll más grande a cuidar el camino. ¡A vencerlo juntos!' },
  { at: 0.78, kind: 'rey', name: 'el Rey Sombrío', title: '¡El Rey Sombrío en persona!', text: 'El dueño de la Sombra les cierra el paso al castillo. ¡A vencerlo juntos!' },
];
// Modo cooperativo: ganan o pierden juntos contra el Rey Sombrío.
// hearts: corazones del equipo · push: casillas que retrocede la Sombra si ganan un
// minijuego · surge: casillas que avanza si pierden · lamp: carta Farol del alba.
export const COOP = { hearts: 4, push: 2, surge: 3, lamp: 4, meet: 2 };
export const GOLDEN = 3; // gemas extra del «Toque dorado» en cada casilla de gemas // tramos del camino donde los premios crecen

const TRAPS = {
  pozo: { title: 'Pozo escondido', text: 'El suelo cede. Retrocedes 3 casillas.' },
  zarzas: { title: 'Zarzas encantadas', text: 'Te enredas: tu próxima tirada valdrá la mitad.' },
  duende: { title: 'Duende ladrón', text: 'Sale de un arbusto y te quita hasta 4 gemas.' },
  urraca: { title: 'Urraca real', text: 'Se lleva una de tus cartas. Si no tienes cartas, se lleva hasta 3 gemas.' },
};
const CALM = [
  'El viento trae una canción antigua.',
  'Una liebre plateada te mira y se va.',
  'Encuentras una fogata aún tibia.',
  'Las flores se inclinan a tu paso.',
  'Un búho te guiña un ojo.',
];

const newFx = () => ({ shield: false, golden: 0, magnet: false, map: false, plus: 0, double: false, fixed: 0, die: null, again: false, worst: false, minus: 0, half: false, locked: false, rush: false });

export class Game {
  constructor({ seed = Date.now(), len = 28, names = ['Princesa', 'Mago'], mode = 'versus', level = 'normal' } = {}) {
    this.seed = seed;
    this.coop = mode === 'coop';
    // En el modo juntos el nivel elige los corazones: Tranquila 5, Normal 4, Difícil 3.
    this.maxHearts = COOP.hearts + (level === 'facil' ? 1 : level === 'dificil' ? -1 : 0);
    this.hearts = this.coop ? this.maxHearts : 0;
    this.runes = 0;
    this.shadeBack = 0;
    this.board = makeBoard(seed, len);
    this.rng = makeRng(seed ^ 0x9e3779b9);
    this.players = names.map((name, id) => ({
      id, name, tile: this.board.startId, gems: 5, stars: 0, hand: [], arrived: false, chest: 0, flags: {}, fx: newFx(),
    }));
    this.turn = this.rng.int(0, 1);
    this.players[1 - this.turn].stars = 1; // compensa empezar segundo
    this.players[1 - this.turn].gems += 1;
    this.phase = 'start';
    this.turns = 0;
    this.cardPlayed = false;
    this.bought = {};
    this.total = 0;
    this.offer = null;
    this.adventure = null;
    this.shop = null;
    this.cave = null;
    this.duel = null;
    this.aid = [0, 0];
    this.wasNight = false;
    this.nights = 0;
    this.deck = [];
    this.omen = null;
    this.nextEvent = 5;
    this.usedAdventures = [];
    this.bag = [];
    this.finalTurns = null;
    this.first = null;
    this.shade = 0;
    this.critters = [];
    this.critterId = 0;
    this.look(this.board.startId);
    // Cada guardián se para en el camino más corto, donde empieza su zona.
    const { parent } = bfs(this.board, this.board.startId), main = pathTo(parent, this.board.startId, this.board.castleId);
    this.guards = GUARDS.map((q, i) => {
      const p = Math.round(q.at * this.board.length);
      const tile = main.find((id) => progress(this, this.tile(id)) >= p) ?? main.at(-2);
      return { i, kind: q.kind, p, tile, done: false };
    });
  }

  get player() { return this.players[this.turn]; }
  get night() { return this.turns % DAY.len >= DAY.night; }
  get rival() { return this.players[1 - this.turn]; }
  tile(id) { return this.board.tiles[id]; }

  apply(a) {
    switch (a.type) {
      case 'begin': return this.phase === 'start' ? this.startTurn() : [];
      case 'roll': return this.roll();
      case 'card': return this.playCard(a.i, a.value);
      case 'buy': return this.buy(a.what);
      case 'move': return this.moveTo(a.id);
      case 'pick': return this.pick(a.i);
      case 'choose': return this.choose(a.i);
      case 'shop': return this.shopBuy(a.i);
      case 'cave': return this.caveAct(a.what);
      case 'duel': return this.duelResult(a.winner, a.hits);
      case 'castle': return this.castleAct(a.what);
      default: return [];
    }
  }

  /* ---------- Utilidades ---------- */
  look(id) {
    const ids = [];
    for (const [t, d] of bfs(this.board, id).dist)
      if (d <= SIGHT - (this.night ? 1 : 0) && !this.tile(t).seen) { this.tile(t).seen = true; ids.push(t); }
    return ids;
  }

  addGems(ev, p, n, why) {
    // El hada reduce a la mitad lo que pierde quien va atrás.
    const saved = n < -1 && this.aid[p.id] && ['lost', 'stolen', 'adventure'].includes(why) ? Math.floor(-n / 2) : 0;
    if (saved && p.gems > -n - saved) ev.push({ t: 'fairy', kind: 'cuida', p: p.id, n: Math.min(saved, p.gems + n + saved) });
    n += saved;
    const real = Math.max(-p.gems, n);
    p.gems += real;
    if (real) ev.push({ t: 'gems', p: p.id, n: real, why });
    return real;
  }

  rob(ev, thief, victim, n) {
    const got = -this.addGems(ev, victim, -n, 'stolen');
    return got ? this.addGems(ev, thief, got, 'steal') : 0;
  }

  addStar(ev, p, n = 1) {
    p.stars += n;
    ev.push({ t: 'star', p: p.id, n });
  }

  msg(ev, kind, title, text, quick, note) { ev.push({ t: 'msg', kind, title, text, quick, note }); }

  /* ---------- Modo cooperativo ---------- */
  loseHeart(ev, why, p = this.turn) {
    if (this.hearts <= 0) return;
    this.hearts--;
    ev.push({ t: 'heart', n: -1, left: this.hearts, why, p });
  }

  gainHeart(ev) {
    if (this.hearts >= this.maxHearts) return;
    this.hearts++;
    ev.push({ t: 'heart', n: 1, left: this.hearts, p: this.turn });
  }

  // La Sombra retrocede n casillas (n < 0: avanza) y se recalcula al momento.
  pushShade(ev, n) {
    if (n > 0) {
      const to = Math.max(0, this.shade - n);
      if (to === this.shade) return;
      this.shadeBack = Math.max(this.shadeBack, shadeRaw(this) - to);
      this.shade = to;
      ev.push({ t: 'shade', front: to, back: true });
    } else {
      this.shadeBack += n;
      shadeTick(this, ev);
    }
  }

  // ¿Hay un guardián en pie antes de este punto del camino? Basta estar a su altura:
  // los eventos del bosque cambian las distancias y nadie debe saltárselo.
  crossed(b) { return this.coop ? this.guards.find((q) => !q.done && b >= q.p) : null; }

  // Devuelve true si el escudo detuvo el golpe.
  shielded(ev, p, what) {
    if (!p.fx.shield) return false;
    p.fx.shield = false;
    ev.push({ t: 'shield', p: p.id, what });
    return true;
  }

  giveCard(ev, p, card = this.aid[p.id] && this.rng.chance(0.2 * this.aid[p.id]) ? comebackCard(this.rng) : this.rng.pick(this.coop ? TEAM_DECK : COMMON)) {
    if (p.hand.length >= HAND_LIMIT) { this.addGems(ev, p, 3, 'full'); return; }
    p.hand.push(card);
    ev.push({ t: 'gain', p: p.id, card });
  }

  // Desplaza sin activar casillas. n > 0 hacia el castillo, n < 0 hacia la salida.
  shove(ev, p, n) {
    if (p.arrived) return;
    const { parent } = bfs(this.board, n > 0 ? this.board.castleId : this.board.startId);
    for (let k = 0; k < Math.abs(n); k++) {
      const next = parent.get(p.tile);
      if (next == null || next === this.board.castleId) break;
      if (n > 0 && this.crossed(progress(this, this.tile(next)))) break;
      p.tile = next;
      ev.push({ t: 'step', p: p.id, id: next, back: n < 0, shove: true });
      const ids = this.look(next);
      if (ids.length) ev.push({ t: 'seen', ids });
    }
  }

  reveal(ev, id) {
    const t = this.tile(id);
    if (t.revealed) return;
    t.revealed = true;
    ev.push({ t: 'reveal', id });
  }

  revealAround(ev, id, r) {
    for (const [t, d] of bfs(this.board, id).dist) if (d > 0 && d <= r && this.tile(t).content) this.reveal(ev, t);
  }

  /* ---------- Hada madrina ---------- */
  // Cuánto se queda atrás: gemas de diferencia, más un poco por la distancia.
  behind(p) {
    const r = this.players[1 - p.id];
    const road = r.arrived || p.arrived ? 0 : Math.max(-4, Math.min(6, (this.tile(p.tile).dist - this.tile(r.tile).dist) * 0.4));
    return r.gems - p.gems + road;
  }

  updateFairy(ev) {
    if (this.coop || this.turns < FAIRY_FROM) return;
    for (const p of this.players) {
      const was = this.aid[p.id], gap = this.behind(p);
      let now = 0;
      for (const k of [1, 2]) if (gap >= FAIRY[k][was >= k ? 1 : 0]) now = k;
      // En el tramo final el hada solo se queda con quien va muy atrás (nivel 2): evita palizas sin regalar partidas parejas.
      if (p.arrived || (this.first != null && now < 2)) now = 0;
      if (now === was) continue;
      this.aid[p.id] = now;
      ev.push({ t: 'fairy', kind: now ? 'llega' : 'adios', p: p.id, level: now, was });
    }
  }

  // Gemas que quita (o gana, en un torneo) cada quien si gana el minijuego.
  duelPrize(id) { return DUEL_GEMS + 2 * this.aid[id]; }
  duelTake(id) { const n = this.duelPrize(id); return n - (this.aid[1 - id] ? Math.floor(n / 2) : 0); }

  // ¿Trae el hada una carta de remontada a esta oferta?
  helps(p) { return this.aid[p.id] > 0 && this.rng.chance(this.aid[p.id] * 0.5); }

  // Cerca del castillo los premios crecen: +1 desde la mitad del camino, +2 en el último tramo.
  // Se apagan cuando alguien llega: el tramo final no premia a quien va lento.
  nearCastle(t) {
    if (this.first != null) return 0;
    const k = progress(this, t) / this.board.length;
    return k >= NEAR[1] ? 2 : k >= NEAR[0] ? 1 : 0;
  }

  /* ---------- Turnos ---------- */
  startTurn(extra = false) {
    const ev = [], p = this.player;
    this.cardPlayed = false;
    this.bought = {};
    this.phase = 'ready';
    ev.push({ t: 'turn', p: p.id, extra, left: this.first != null ? this.finalTurns : null });
    this.updateFairy(ev);
    if (!extra) worldTick(this, ev);
    if (this.coop && !this.hearts) return ev.concat(this.finish());
    if (this.shadowAttack) {
      this.shadowAttack = false;
      this.startDuel(ev, 'sombra');
      return ev;
    }
    if (!extra && (this.first == null || this.coop) && this.turns > 0 && this.turns % TOURNEY_EVERY === 0 && this.lastTourney !== this.turns) {
      this.lastTourney = this.turns;
      this.rounds = (this.rounds || 0) + 1;
      this.startDuel(ev, this.coop || this.rounds % TEAM_ROUND === 0 ? 'ronda' : 'torneo');
      return ev;
    }
    this.checkStars(ev);
    return ev;
  }

  checkStars(ev) {
    const p = this.player;
    if (p.stars < 3) return;
    p.stars -= 3;
    this.makeOffer(ev, 'stars');
  }

  endTurn() {
    const p = this.player, ev = [];
    if (this.coop && !this.hearts) return this.finish();
    p.fx.locked = false;
    p.fx.rush = false;
    this.adventure = this.shop = this.cave = null;
    if (p.fx.again) {
      p.fx.again = false;
      return ev.concat(this.startTurn(true));
    }
    this.addStar(ev, p);
    this.turns++;
    if (this.first != null && this.coop) return ev.concat(this.castleTurn());
    if (this.first != null) {
      this.finalTurns--;
      if (this.finalTurns <= 0) return ev.concat(this.finish());
      return ev.concat(p.arrived ? (this.turn = 1 - this.turn, this.startTurn()) : this.castleTurn());
    }
    this.turn = 1 - this.turn;
    return ev.concat(this.startTurn());
  }

  makeOffer(ev, why) {
    const p = this.player;
    if (p.hand.length >= HAND_LIMIT) {
      this.msg(ev, 'gem', 'Mano llena', 'Ya tienes 4 cartas: recibes 3 gemas en su lugar.');
      if (why === 'stars') ev.push({ t: 'spendStars', p: p.id });
      this.addGems(ev, p, 3, 'full');
      return false;
    }
    this.offer = { cards: offerCards(this.rng, this.helps(p), this.coop), why };
    this.phase = 'pick';
    ev.push({ t: 'offer', p: p.id, why });
    return true;
  }

  pick(i) {
    if (this.phase !== 'pick' || !this.offer?.cards[i]) return [];
    const card = this.offer.cards[i], { why } = this.offer;
    this.offer = null;
    this.player.hand.push(card);
    const ev = [{ t: 'gain', p: this.turn, card }];
    if (why === 'stars') { this.phase = 'ready'; return ev; }
    return ev.concat(this.endTurn());
  }

  /* ---------- Cartas y compras ---------- */
  // En el castillo se está a salvo: las cartas contra el rival no sirven si ya llegó.
  canCard(card) {
    if (card === 'abrazo') return this.hearts < this.maxHearts;
    if (card === 'farol') return this.shade > 0;
    if (card === 'lazo') return !this.rival.arrived;
    return !(this.rival.arrived && (CARDS[card].family === 'travesura' || card === 'cometa'));
  }

  playCard(i, value) {
    const p = this.player, r = this.rival, card = p.hand[i];
    if (this.phase !== 'ready' || this.cardPlayed || p.fx.locked || !card) return [];
    if (CARDS[card].choose && !(value >= 1 && value <= 6)) return [];
    if (!this.canCard(card)) return [];
    p.hand.splice(i, 1);
    this.cardPlayed = true;
    const ev = [{ t: 'card', p: p.id, card }];
    const hit = (fn) => {
      if (!this.shielded(ev, r, CARDS[card].name)) fn();
    };
    const curse = () => ev.push({ t: 'curse', p: r.id });
    switch (card) {
      case 'cosecha': this.addGems(ev, p, 4, 'card'); break;
      case 'dorado': p.fx.golden += 2; break;
      case 'iman': p.fx.magnet = true; break;
      case 'mapa': p.fx.map = true; break;
      case 'apuesta': { const heads = this.rng.chance(0.5); ev.push({ t: 'coin', p: p.id, heads }); this.addGems(ev, p, heads ? 8 : -3, heads ? 'card' : 'bet'); break; }
      case 'trueque': this.addGems(ev, p, Math.min(6, Math.floor(r.gems / 3)), 'card'); break;
      case 'botas': p.fx.plus += 3; break;
      case 'doble': p.fx.double = true; break;
      case 'encantado': p.fx.fixed = value; break;
      case 'prudente': p.fx.die = 'prudente'; this.addGems(ev, p, 2, 'card'); break;
      case 'loco': p.fx.die = 'loco'; break;
      case 'aliento': p.fx.again = true; break;
      case 'escudo': p.fx.shield = true; break;
      case 'catapulta': this.shove(ev, p, 3); break;
      case 'catalejo': this.revealAround(ev, p.tile, 2); break;
      case 'robo': hit(() => this.rob(ev, p, r, 3)); break;
      case 'maleta': hit(() => this.addGems(ev, r, -4, 'lost')); break;
      case 'peaje': hit(() => this.rob(ev, p, r, 1 + r.hand.length)); break;
      case 'nube': hit(() => { r.fx.worst = true; curse(); }); break;
      case 'raices': hit(() => { r.fx.minus += 2; curse(); }); break;
      case 'candado': hit(() => { r.fx.locked = true; curse(); }); break;
      case 'reloj': hit(() => { r.fx.rush = true; curse(); }); break;
      case 'gusanito': hit(() => this.shove(ev, r, -3)); break;
      case 'cambiazo': hit(() => this.swap(ev, 8)); break;
      case 'reto': this.startDuel(ev, 'reto'); break;
      case 'cometa': hit(() => this.rob(ev, p, r, 5)); break;
      case 'estela':
        this.addGems(ev, p, 3, 'card');
        this.shove(ev, p, Math.max(0, Math.min(8, this.tile(p.tile).dist - this.tile(r.tile).dist - 2)));
        break;
      case 'cuerno': this.addGems(ev, p, 6, 'card'); this.addStar(ev, p, 2); break;
      case 'abrazo': this.gainHeart(ev); break;
      case 'farol': this.pushShade(ev, COOP.lamp); break;
      case 'lazo': ev.push({ t: 'lazo', p: p.id, to: r.id }); this.shove(ev, r, 3); break;
    }
    ev.push({ t: 'hud' });
    return ev;
  }

  swap(ev, max = 99) {
    const p = this.player, r = this.rival;
    const same = p.tile === r.tile;
    if (r.arrived || same || bfs(this.board, p.tile).dist.get(r.tile) > max) {
      this.msg(ev, 'portal', same ? 'Sin efecto' : 'Demasiado lejos', same ? 'Ya están en la misma casilla.' : `${r.name} está fuera de alcance: la magia se deshace.`, true);
      return;
    }
    [p.tile, r.tile] = [r.tile, p.tile];
    ev.push({ t: 'swap', a: p.id, b: r.id });
  }

  canBuy(what) {
    const p = this.player;
    if (p.fx.locked || p.gems < PRICES[what] || this.bought[what]) return false;
    if (what === 'sobre') return this.phase === 'ready' && p.hand.length < HAND_LIMIT;
    if (what === 'trampa') return this.phase === 'ready' && !this.coop && !this.rival.arrived && this.snareSpots().length > 0;
    return this.phase === 'move';
  }

  snareSpots() {
    const r = this.rival, d0 = this.tile(r.tile).dist;
    const { dist } = bfs(this.board, r.tile);
    return this.board.tiles.filter((t) => t.kind === 'path' && !t.snare && !t.landmark && t.dist > 0 && d0 - t.dist >= 2 && d0 - t.dist <= 6 && dist.get(t.id) <= 7);
  }

  buy(what) {
    if (!this.canBuy(what)) return [];
    const p = this.player, ev = [{ t: 'buy', p: p.id, what }];
    this.addGems(ev, p, -PRICES[what], 'spend');
    this.bought[what] = true;
    if (what === 'sobre') this.giveCard(ev, p);
    if (what === 'trampa') {
      this.rng.pick(this.snareSpots()).snare = p.id;
      this.msg(ev, 'trap', 'Trampa escondida', `Algo espera a ${this.rival.name} en el camino. Ni tú sabes dónde.`, true);
    }
    if (what === 'repetir') { this.phase = 'ready'; Object.assign(p.fx, this.rollFx); return ev.concat(this.roll(true)); }
    if (what === 'paso') { this.total++; ev.push({ t: 'options' }); }
    return ev;
  }

  /* ---------- Dado y movimiento ---------- */
  roll(again = false) {
    if (this.phase !== 'ready') return [];
    const p = this.player, fx = p.fx, ev = [], mods = [];
    this.rollFx = { plus: fx.plus, minus: fx.minus, half: fx.half, worst: fx.worst, double: fx.double, fixed: fx.fixed, die: fx.die };
    const faces = fx.die === 'loco' ? [0, 1, 1, 7, 8, 9] : fx.die === 'prudente' ? [2, 2, 3, 3, 4, 4] : [1, 2, 3, 4, 5, 6];
    let dice, total;
    if (fx.fixed) {
      dice = [fx.fixed]; total = fx.fixed; mods.push('Dado encantado');
    } else {
      const n = 1 + (fx.double ? 1 : 0) + (fx.worst ? 1 : 0);
      dice = Array.from({ length: n }, () => this.rng.pick(faces));
      // El hada voltea el dado de quien va atrás cuando sale muy bajo.
      const low = dice.reduce((a, b) => a + b, 0) - (fx.worst ? Math.max(...dice) : 0) <= 2;
      if (low && !fx.die && this.rng.chance(this.aid[p.id] * 0.5)) {
        ev.push({ t: 'roll', p: p.id, dice, total: null, mods: [], kind: null, pre: true }, { t: 'fairy', kind: 'dado', p: p.id });
        dice = dice.map(() => this.rng.int(3, 6));
        mods.push('El hada volteó tu dado');
      }
      const sum = dice.reduce((a, b) => a + b, 0);
      total = fx.worst ? sum - Math.max(...dice) : sum;
      if (fx.die) mods.push(`Dado ${fx.die}`);
      if (fx.double) mods.push('Doble dado');
      if (fx.worst) mods.push('Nube gris: cuenta el menor');
    }
    const natural = total, kind = fx.fixed ? null : fx.die;
    if (fx.plus) { total += fx.plus; mods.push(`Impulso +${fx.plus}`); }
    if (fx.minus) { total = Math.max(1, total - fx.minus); mods.push(`Raíces −${fx.minus}`); }
    if (fx.half) { total = Math.max(1, Math.ceil(total / 2)); mods.push('Enredo: la mitad'); }
    Object.assign(fx, { plus: 0, minus: 0, half: false, worst: false, double: false, fixed: 0, die: null });
    this.total = total;
    this.phase = 'move';
    ev.push({ t: 'roll', p: p.id, dice, total, mods, kind });
    if (natural === 1 && !again) {
      this.msg(ev, 'star', 'Consuelo de las hadas', 'Salió 1 en el dado: ganas una estrella extra.', true);
      this.addStar(ev, p);
    }
    if (total === 0) {
      this.msg(ev, 'calm', '¡Cero!', 'Este turno no avanzas, pero ganas 3 gemas de consuelo.');
      this.addGems(ev, p, 3, 'card');
      return ev.concat(this.endTurn());
    }
    ev.push({ t: 'options' });
    return ev;
  }

  // Destinos: a distancia exacta, o antes si hay un lugar especial o el rival.
  options() {
    const { dist } = bfs(this.board, this.player.tile), r = this.rival;
    const out = new Set([...dist].filter(([, d]) => d === this.total).map(([id]) => id));
    for (const [id, d] of dist) {
      if (d === 0 || d > this.total) continue;
      const t = this.tile(id);
      const stop = id === this.board.castleId || t.content?.type === 'shop' || (t.content?.type === 'cave' && !t.content.done[this.turn])
        || (!r.arrived && r.tile === id && id !== this.board.startId);
      if (stop) out.add(id);
    }
    if (!out.size) {
      const far = Math.max(...dist.values());
      for (const [id, d] of dist) if (d === far) out.add(id);
    }
    return [...out];
  }

  pathFor(id) {
    const { parent } = bfs(this.board, this.player.tile);
    return pathTo(parent, this.player.tile, id);
  }

  moveTo(id) {
    if (this.phase !== 'move' || !this.options().includes(id)) return [];
    const p = this.player, r = this.rival, ev = [];
    const path = this.pathFor(id);
    let walked = 0, before = progress(this, this.tile(p.tile));
    for (const step of path) {
      const now = progress(this, this.tile(step)), guard = this.crossed(now) || this.guards.find((q) => !q.done && before < q.p && now >= q.p);
      before = now;
      // En el modo cooperativo la puerta del castillo solo se abre con las tres runas.
      if (guard && step === this.board.castleId && this.coop) {
        const last = ev.findLast((e) => e.t === 'step');
        if (last) last.last = true;
        return ev.concat(this.meetGuard(guard));
      }
      p.tile = step;
      walked++;
      if (guard && step !== this.board.castleId) {
        ev.push({ t: 'step', p: p.id, id: step, last: true });
        return ev.concat(this.meetGuard(guard));
      }
      const t = this.tile(step), caught = t.snare != null && t.snare !== p.id;
      ev.push({ t: 'step', p: p.id, id: step, last: step === id || caught });
      const ids = this.look(step);
      if (ids.length) ev.push({ t: 'seen', ids });
      if (t.star) { t.star = false; ev.push({ t: 'starpick', id: step }); this.addStar(ev, p); }
      const cr = critterAt(this, step);
      if (cr && meet(this, ev, p, cr)) return ev.concat(this.endTurn());
      if (caught) {
        t.snare = null;
        ev.push({ t: 'trap', p: p.id, id: step, trap: 'red' });
        this.msg(ev, 'trap', '¡Una trampa escondida!', `${r.name} la puso aquí: te detienes aquí y te roba hasta 4 gemas.`);
        if (!this.shielded(ev, p, 'Trampa escondida')) {
          this.rob(ev, r, p, 4);
          return ev.concat(this.endTurn());
        }
      }
    }
    if (p.fx.magnet) {
      p.fx.magnet = false;
      this.addGems(ev, p, Math.min(6, walked), 'magnet');
    }
    if (id === this.board.castleId) return ev.concat(this.arrive());
    if (p.fx.map) { p.fx.map = false; this.msg(ev, 'gem', 'Mapa del tesoro', '¡Aquí era! Desentierras 5 gemas.', true); this.addGems(ev, p, 5, 'card'); }
    if (this.coop && r.tile === id && !r.arrived && id !== this.board.startId) {
      this.msg(ev, 'shrine', '¡Juntos otra vez!', `${p.name} alcanza a ${r.name}. Se dan ánimo: cada quien gana ${COOP.meet} gemas.`, true);
      for (const q of this.players) this.addGems(ev, q, COOP.meet, 'team');
    } else if (r.tile === id && !r.arrived && id !== this.board.startId) {
      this.msg(ev, 'duel', '¡Encuentro!', `${p.name} alcanza a ${r.name}. Se decide con un minijuego.`);
      this.startDuel(ev, 'encuentro');
      return ev;
    }
    this.reveal(ev, id);
    if (this.resolve(ev, this.tile(id))) return ev;
    return ev.concat(this.endTurn());
  }

  // Devuelve true si el turno queda esperando una decisión.
  resolve(ev, t) {
    const p = this.player, r = this.rival, c = t.content;
    if (!c) return false;
    const clear = () => { t.content = { type: 'visited' }; ev.push({ t: 'clear', id: t.id }); };
    switch (c.type) {
      case 'gem': {
        let n = c.n + (this.night ? NIGHT.gem : 0) + this.nearCastle(t);
        if (p.fx.golden) { n += GOLDEN; p.fx.golden--; this.msg(ev, 'gem', 'Toque dorado', `¡${GOLDEN} gemas de regalo! Recoges ${n}.`, true); }
        clear();
        if (this.aid[p.id]) { n += this.aid[p.id]; ev.push({ t: 'fairy', kind: 'regala', p: p.id, n: this.aid[p.id] }); }
        this.addGems(ev, p, n, 'tile');
        return false;
      }
      case 'trap': {
        const tr = TRAPS[c.trap];
        ev.push({ t: 'trap', p: p.id, id: t.id, trap: c.trap });
        this.msg(ev, 'trap', tr.title, tr.text);
        if (this.shielded(ev, p, tr.title)) return false;
        const extra = this.night ? NIGHT.trap : 0;
        if (extra && c.trap !== 'duende') this.addGems(ev, p, -extra, 'lost');
        if (c.trap === 'duende') this.addGems(ev, p, -4 - extra, 'lost');
        if (c.trap === 'zarzas') p.fx.half = true;
        if (c.trap === 'pozo') this.shove(ev, p, -3);
        if (c.trap === 'urraca') {
          if (p.hand.length) { const [card] = p.hand.splice(this.rng.int(0, p.hand.length - 1), 1); ev.push({ t: 'lose', p: p.id, card }); }
          else this.addGems(ev, p, -3, 'lost');
        }
        return false;
      }
      case 'portal': case 'eagle': case 'worm': {
        const to = this.tile(c.to), fwd = to.dist < t.dist, n = Math.abs(to.dist - t.dist);
        if (c.type === 'portal') this.msg(ev, 'portal', 'Portal errante', fwd ? `Un remolino te lanza ${n} casillas adelante.` : `Un remolino te arrastra ${n} casillas atrás.`);
        if (c.type === 'eagle') this.msg(ev, 'eagle', '¡El águila gigante!', `Te toma por los hombros y vuelas ${n} casillas adelante.`);
        if (c.type === 'worm') this.msg(ev, 'worm', '¡El gran gusano!', `Te traga y te escupe ${n} casillas atrás.`);
        if (c.type === 'worm' && this.shielded(ev, p, 'El gran gusano')) return false;
        p.tile = to.id;
        ev.push({ t: c.type === 'portal' ? 'teleport' : c.type, p: p.id, from: t.id, id: to.id });
        if (c.type === 'portal') this.reveal(ev, to.id);
        const ids = this.look(to.id);
        if (ids.length) ev.push({ t: 'seen', ids });
        // En el modo cooperativo nadie se salta a un guardián: los espera donde aterrizas.
        const q = this.crossed(progress(this, to));
        if (q) { ev.push(...this.meetGuard(q)); return true; }
        return false;
      }
      case 'shrine':
        this.msg(ev, 'shrine', 'Santuario compartido', r.arrived ? `${p.name} gana 3 gemas y una estrella.` : `${p.name} gana 3 gemas y una estrella. ${r.name} también gana una estrella.`);
        clear();
        this.addGems(ev, p, 3, 'tile');
        this.addStar(ev, p);
        if (!r.arrived) this.addStar(ev, r);
        return false;
      case 'chest':
        clear();
        return this.makeOffer(ev, 'chest');
      case 'duel':
        clear();
        if (this.coop) { this.msg(ev, 'duel', 'Arena antigua', 'Las piedras despiertan a la Sombra: juegan juntos un minijuego en equipo.'); this.startDuel(ev, 'arena'); return true; }
        if (r.arrived) { this.msg(ev, 'gem', 'Arena vacía', 'No hay con quién competir: ganas 3 gemas.'); this.addGems(ev, p, 3, 'tile'); return false; }
        this.msg(ev, 'duel', 'Arena antigua', 'Las piedras exigen un minijuego: quien gane le quita gemas a quien pierda.');
        this.startDuel(ev, 'arena');
        return true;
      case 'adventure': return this.startAdventure(ev, t);
      case 'shop':
        this.shop = { items: offerCards(this.rng, this.helps(p), this.coop).map((card, i) => ({ card, price: [3, 4, 4][i], sold: false })) };
        this.phase = 'shop';
        ev.push({ t: 'shop' });
        return true;
      case 'cave':
        if (c.done[p.id]) { this.msg(ev, 'calm', 'Cueva vacía', 'Ya saqueaste este lugar. El dragón te olfatea, dormido.', true); return false; }
        c.done[p.id] = true;
        this.cave = { bag: 0, grabs: 0 };
        this.phase = 'cave';
        ev.push({ t: 'cave' });
        return true;
      default: {
        const n = (this.night ? NIGHT.rest : 0) + this.nearCastle(t);
        this.msg(ev, 'calm', this.night ? 'Fogata en la noche' : 'Descanso', `${this.rng.pick(CALM)} Ganas una estrella${n ? ` y ${n} ${n === 1 ? 'gema' : 'gemas'}` : ''}.`, true);
        if (n) this.addGems(ev, p, n, 'tile');
        this.addStar(ev, p);
        return false;
      }
    }
  }

  /* ---------- Aventuras ---------- */
  startAdventure(ev, t) {
    const p = this.player;
    const open = (a) => !this.usedAdventures.includes(a.id) && (a.biome == null || a.biome === t.biome) && (!a.night || this.night);
    const pool = this.coop ? ADVENTURES.filter(friendly) : ADVENTURES;
    const follow = pool.filter((a) => a.need && p.flags[a.need] && p.flags[a.need] < this.turns);
    let list = follow.length && this.rng.chance(0.75) ? follow : pool.filter((a) => !a.need && open(a));
    if (!list.length) { this.usedAdventures = []; list = pool.filter((a) => !a.need && open(a)); }
    const a = this.rng.pick(list);
    if (!a.need) this.usedAdventures.push(a.id);
    t.content = { type: 'visited' };
    ev.push({ t: 'clear', id: t.id });
    this.adventure = a.id;
    this.phase = 'adventure';
    ev.push({ t: 'adventure', p: p.id, id: a.id });
    return true;
  }

  canChoose(i) {
    const c = byId[this.adventure]?.choices[i];
    return !!c && (c.cost || 0) <= this.player.gems;
  }

  choose(i) {
    if (this.phase !== 'adventure' || !this.canChoose(i)) return [];
    const p = this.player, a = byId[this.adventure], c = a.choices[i], ev = [];
    if (c.cost) this.addGems(ev, p, -c.cost, 'spend');
    let out = c, good = null;
    if (c.check) {
      const die = this.rng.int(1, 6);
      good = die >= c.check;
      ev.push({ t: 'check', p: p.id, die, need: c.check, ok: good });
      out = good ? c.ok : c.fail;
    }
    this.msg(ev, good === false ? 'trap' : a.icon, c.label, out.text, false, describe(out.fx, this.rival.name));
    this.phase = 'resolving';
    for (const fx of out.fx) this.applyFx(ev, fx);
    if (this.phase === 'duel' || this.phase === 'pick') return ev;
    ev.push({ t: 'hud' });
    return ev.concat(this.endTurn());
  }

  applyFx(ev, [kind, v]) {
    const p = this.player, r = this.rival;
    const set = (q, name) => {
      if (name === 'plus') q.fx.plus += 2;
      else if (name === 'minus') q.fx.minus += 2;
      else q.fx[name] = true;
    };
    const atRival = (fn) => { if (!r.arrived && !this.shielded(ev, r, byId[this.adventure].title)) fn(); };
    switch (kind) {
      case 'gems': this.addGems(ev, p, v, 'adventure'); break;
      case 'rival': v > 0 ? this.addGems(ev, r, v, 'adventure') : atRival(() => this.addGems(ev, r, v, 'lost')); break;
      case 'steal': atRival(() => this.rob(ev, p, r, v)); break;
      case 'pay': this.rob(ev, r, p, v); break;
      case 'move': this.shove(ev, p, v); break;
      case 'rivalMove': atRival(() => this.shove(ev, r, v)); break;
      case 'star': this.addStar(ev, p, v); break;
      case 'rivalStar': if (!r.arrived) this.addStar(ev, r, v); break;
      case 'card': this.giveCard(ev, p); break;
      case 'offer': this.makeOffer(ev, 'chest'); break;
      case 'fx': set(p, v); break;
      case 'rivalFx': atRival(() => { set(r, v); ev.push({ t: 'curse', p: r.id }); }); break;
      case 'reveal': this.revealAround(ev, p.tile, v); break;
      case 'flag': p.flags[v] = Math.max(1, this.turns); break;
      case 'unflag': delete p.flags[v]; break;
      case 'swap': this.swap(ev); break;
      case 'duel':
        if (r.arrived && !this.coop) this.addGems(ev, p, 3, 'adventure');
        else this.startDuel(ev, 'arena');
        break;
    }
  }

  /* ---------- Mercader y cueva ---------- */
  shopBuy(i) {
    if (this.phase !== 'shop') return [];
    if (i == null) { const ev = []; return ev.concat(this.endTurn()); }
    const p = this.player, it = this.shop.items[i];
    if (!it || it.sold || p.gems < it.price || p.hand.length >= HAND_LIMIT) return [];
    const ev = [];
    it.sold = true;
    this.addGems(ev, p, -it.price, 'spend');
    this.giveCard(ev, p, it.card);
    return ev;
  }

  // Números del dado que despiertan al dragón: de noche duerme más profundo.
  caveRisk() { return Math.max(0, this.cave.grabs - (this.night ? 1 : 0)); }

  caveAct(what) {
    if (this.phase !== 'cave') return [];
    const p = this.player, c = this.cave, ev = [];
    if (what === 'leave') {
      if (c.bag) this.addGems(ev, p, c.bag, 'cave');
      return ev.concat(this.endTurn());
    }
    if (c.grabs >= CAVE.length) return [];
    const die = this.rng.int(1, 6), risk = this.caveRisk(), need = risk + 1; // despierta si el dado no supera el riesgo
    const ok = die > risk;
    if (risk > 0) ev.push({ t: 'check', p: p.id, die, need, ok, cave: true });
    c.grabs++;
    if (ok) {
      const n = CAVE[c.grabs - 1];
      c.bag += n;
      ev.push({ t: 'grab', p: p.id, n, bag: c.bag });
      return ev;
    }
    ev.push({ t: 'dragon', p: p.id, id: p.tile });
    this.msg(ev, 'flame', '¡El dragón despertó!', `Pierdes las ${c.bag} gemas de la bolsa y retrocedes 2 casillas.`);
    if (!this.shielded(ev, p, 'Fuego de dragón')) this.shove(ev, p, -2);
    return ev.concat(this.endTurn());
  }

  // Un guardián cierra el paso: el turno se detiene y juegan juntos contra él.
  meetGuard(q) {
    const ev = [], G = GUARDS[q.i];
    q.done = true;
    ev.push({ t: 'guard', i: q.i, kind: q.kind, p: this.turn, id: this.player.tile });
    this.msg(ev, 'omen', G.title, G.text, false, this.coop ? `Si ganan: la runa ${q.i + 1} de 3 y ${TEAM_WIN} gemas para cada quien · Si gana ${G.name}: pierden 1 corazón y sigue cerrando el paso` : `Si ganan: ${TEAM_WIN} gemas para cada quien · Si gana ${G.name}: hasta −${TEAM_LOSE} a cada quien · Quien pegue más golpes: +${BOSS_GEM} gema`);
    this.startDuel(ev, 'guardia', BOSSES[q.i]);
    this.duel.guard = q.i;
    return ev;
  }

  /* ---------- Minijuegos ---------- */
  startDuel(ev, why, game = null) {
    const team = this.coop || why === 'sombra' || why === 'guardia' || why === 'ronda', list = team ? TEAM_GAMES : MINIGAMES, key = team ? 'teamBag' : 'bag';
    if (!game && !this[key]?.length) this[key] = this.rng.shuffle(list);
    this.duel = { why, game: game || this[key].pop(), seed: this.rng.int(1, 1e9), by: this.turn, team };
    this.phase = 'duel';
    ev.push({ t: 'duel', ...this.duel });
  }

  duelResult(w, hits = null) {
    if (this.phase !== 'duel' || ![0, 1, -1, -2].includes(w)) return [];
    const { why, team, guard } = this.duel, ev = [];
    if (team ? w > -1 : w === -2) return [];
    this.duel = null;
    this.phase = 'resolving';
    if (team && this.coop) return this.coopResult(ev, w === -1, why, guard);
    if (team) {
      const foe = why === 'guardia' ? GUARDS[guard].name : 'la Sombra del Rey';
      if (w === -1) {
        this.msg(ev, 'sun', `¡Vencieron a ${foe}!`, `Juntos le ganaron. Cada quien gana ${TEAM_WIN} gemas.`, true);
        for (const p of this.players) this.addGems(ev, p, TEAM_WIN, 'team');
      } else {
        this.msg(ev, 'omen', `Ganó ${foe} esta vez`, `Se lleva hasta ${TEAM_LOSE} gemas de cada quien. El escudo protege.`, true);
        for (const p of this.players) if (!this.shielded(ev, p, 'La Sombra del Rey')) this.addGems(ev, p, -TEAM_LOSE, 'lost');
      }
      if (why === 'guardia') this.bossBonus(ev, hits);
      ev.push({ t: 'teamEnd', won: w === -1, guard });
      if (why === 'guardia') return ev.concat(this.endTurn());
      this.phase = 'ready';
      this.checkStars(ev);
      return ev;
    }
    const win = this.players[w], lose = this.players[1 - w];
    if (w < 0) {
      this.msg(ev, 'shrine', '¡Empate!', 'Los dos ganan 2 gemas por el espectáculo.', true);
      for (const p of this.players) this.addGems(ev, p, 2, 'duel');
    } else if (why === 'torneo') {
      this.msg(ev, 'crown', `¡${win.name} gana el torneo!`, `Gana ${this.duelPrize(w)} gemas y una carta al azar. ${lose.name} gana una estrella.`);
      this.addGems(ev, win, this.duelPrize(w), 'duel');
      this.giveCard(ev, win);
      this.addStar(ev, lose);
    } else {
      this.msg(ev, 'crown', `¡${win.name} gana el minijuego!`, `Le quita hasta ${this.duelTake(w)} gemas a ${lose.name}.`, true);
      this.rob(ev, win, lose, this.duelPrize(w));
      if (lose.gems === 0) this.addStar(ev, lose);
    }
    if (why === 'torneo') { this.phase = 'ready'; this.checkStars(ev); return ev; }
    if (why === 'reto') { this.phase = 'ready'; return ev; }
    return ev.concat(this.endTurn());
  }

  // En «uno contra otro», la batalla de jefe se juega en equipo, pero quien le pegó
  // más veces al jefe gana una gema extra.
  bossBonus(ev, hits) {
    if (!Array.isArray(hits) || hits.length !== 2 || !hits.every((n) => Number.isInteger(n) && n >= 0) || hits[0] === hits[1]) return;
    const w = hits[0] > hits[1] ? 0 : 1, p = this.players[w];
    this.msg(ev, 'star', `¡${p.name} pegó más golpes!`, `${p.name} le dio ${hits[w]} golpes al jefe y ${this.players[1 - w].name}, ${hits[1 - w]}. Gana ${BOSS_GEM} gema extra.`, true);
    this.addGems(ev, p, BOSS_GEM, 'team');
  }

  // Modo cooperativo: los guardianes dan runas o quitan corazones; los demás
  // minijuegos empujan la Sombra hacia atrás o la dejan avanzar.
  coopResult(ev, won, why, guard) {
    const p = this.player;
    if (guard != null) {
      const G = GUARDS[guard], q = this.guards[guard];
      if (won) {
        this.runes++;
        this.msg(ev, 'sun', `¡Vencieron a ${G.name}!`, `Ganan la runa ${this.runes} de 3 y cada quien gana ${TEAM_WIN} gemas. El camino queda libre.`, true);
        ev.push({ t: 'rune', n: this.runes, guard, p: p.id });
        for (const x of this.players) this.addGems(ev, x, TEAM_WIN, 'team');
      } else {
        q.done = false;
        this.msg(ev, 'omen', `Ganó ${G.name} esta vez`, `El equipo pierde un corazón. ${p.name} retrocede y ${G.name} vuelve a cerrar el paso.`, true);
        this.loseHeart(ev, 'guard');
        for (let k = 0; k < 12 && progress(this, this.tile(p.tile)) >= q.p - 1; k++) this.shove(ev, p, -1);
      }
      ev.push({ t: 'teamEnd', won, guard, stay: !won });
      return ev.concat(this.endTurn());
    }
    if (won) {
      this.msg(ev, 'sun', '¡Vencieron a la Sombra!', `La Sombra retrocede ${COOP.push} casillas y cada quien gana ${TEAM_WIN} gemas.`, true);
      for (const x of this.players) this.addGems(ev, x, TEAM_WIN, 'team');
      ev.push({ t: 'teamEnd', won });
      this.pushShade(ev, COOP.push);
    } else {
      this.msg(ev, 'omen', 'Ganó la Sombra esta vez', `La Sombra avanza ${COOP.surge} casillas de golpe.`, true);
      ev.push({ t: 'teamEnd', won });
      this.pushShade(ev, -COOP.surge);
    }
    if (!this.hearts) return ev.concat(this.finish());
    if (why === 'arena' || why === 'adventure') return ev.concat(this.endTurn());
    this.phase = 'ready';
    if (why !== 'reto') this.checkStars(ev);
    return ev;
  }

  /* ---------- Final ---------- */
  arrive() {
    const p = this.player, ev = [];
    p.arrived = true;
    p.fx.again = false;
    const isFirst = this.first == null;
    ev.push({ t: 'arrive', p: p.id, first: isFirst });
    this.addGems(ev, p, isFirst ? ARRIVE_FIRST : ARRIVE_SECOND, 'castle');
    this.cashCards(ev, p);
    if (isFirst && this.coop) {
      this.first = p.id;
      this.turn = this.rival.id;
      this.finalTurns = null;
      this.msg(ev, 'castle', `¡${p.name} llegó al castillo!`, `Las tres runas abren la puerta. Desde la torre ayuda en cada vuelta: tira un dado para frenar la Sombra o empujar a ${this.player.name}. Cuando llegue ${this.player.name}, ganan los dos.`);
      return ev.concat(this.startTurn());
    }
    if (isFirst) {
      this.first = p.id;
      this.turn = this.rival.id;
      this.finalTurns = FINAL_TURNS + (this.aid[this.turn] === 2 ? 1 : 0);
      this.msg(ev, 'castle', '¡Ya llegó al castillo!', `${p.name} gana ${ARRIVE_FIRST} gemas y queda a salvo: nadie le puede quitar gemas. Juega desde el castillo. A ${this.player.name} le quedan ${this.finalTurns} turnos: si no llega, pierde ${LATE} gemas.`);
      return ev.concat(this.startTurn());
    }
    return ev.concat(this.finish());
  }

  // Quien ya llegó sigue jugando desde el castillo: tira el dado y elige
  // guardarlo en su cofre (se abre al final) o lanzar una travesura desde la torre.
  castleTurn() {
    this.turn = this.first;
    this.cardPlayed = false;
    this.bought = {};
    this.phase = 'castle';
    this.castle = { die: this.rng.int(1, 6) };
    return [{ t: 'turn', p: this.turn, castle: true, left: this.finalTurns }, { t: 'castleTurn', p: this.turn, die: this.castle.die }];
  }

  castleAct(what) {
    if (this.phase !== 'castle' || !(this.coop ? ['farol', 'viento'] : ['cofre', 'torre']).includes(what)) return [];
    const p = this.player, r = this.rival, n = this.castle.die, ev = [{ t: 'castleAct', p: p.id, what, n }];
    this.castle = null;
    if (what === 'farol') this.pushShade(ev, n);
    else if (what === 'viento') this.shove(ev, r, Math.ceil(n / 2));
    else if (what === 'cofre') p.chest += n;
    else if (!this.shielded(ev, r, 'Torre del castillo')) this.shove(ev, r, -n);
    this.turn = r.id;
    this.phase = 'resolving';
    return ev.concat(this.startTurn());
  }

  // Las cartas que sobran se vuelven gemas.
  cashCards(ev, p) {
    const n = p.hand.length;
    if (!n) return;
    p.hand = [];
    ev.push({ t: 'cash', p: p.id, n });
    this.addGems(ev, p, n * CARD_GEMS, 'cash');
  }

  finish() {
    const ev = [];
    if (this.coop) {
      this.phase = 'over';
      const won = this.players.every((p) => p.arrived);
      this.winner = won ? -1 : -2;
      return [{ t: 'over', coop: true, won, hearts: this.hearts, runes: this.runes }];
    }
    for (const p of this.players) {
      if (p.chest) { ev.push({ t: 'chest', p: p.id, n: p.chest }); this.addGems(ev, p, p.chest, 'chest'); p.chest = 0; }
      this.cashCards(ev, p);
      if (!p.arrived) { this.msg(ev, 'castle', 'No llegó al castillo', `${p.name} se quedó en el camino y pierde ${LATE} gemas.`, true); this.addGems(ev, p, -LATE, 'late'); }
    }
    this.phase = 'over';
    const [a, b] = this.players;
    this.winner = a.gems === b.gems ? this.first : a.gems > b.gems ? 0 : 1;
    return ev.concat([{ t: 'over', winner: this.winner, tie: a.gems === b.gems }]);
  }
}
