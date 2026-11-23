import { makeRng } from './rng.js';
import { makeBoard, bfs, pathTo } from './board.js';
import { CARDS, HAND_LIMIT, PRICES, offerCards } from './cards.js';
import { ADVENTURES, byId } from './adventures.js';

// Reglas puras: sin gráficos. Toda jugada entra por apply(acción) y devuelve una
// lista de eventos que la vista anima en orden. Con la misma semilla y las mismas
// acciones se obtiene siempre la misma partida (guardado, repetición, en línea).

export const ARRIVE_FIRST = 8;
export const ARRIVE_SECOND = 4;
export const FINAL_TURNS = 3;
export const SIGHT = 3;
export const TOURNEY_EVERY = 8; // turnos entre torneos: 4 por jugador
export const MINIGAMES = ['duelo', 'lluvia', 'fuga'];

const TRAPS = {
  pozo: { title: 'Pozo escondido', text: 'El suelo cede. Retrocedes 3 casillas.' },
  zarzas: { title: 'Zarzas encantadas', text: 'Te enredas: tu próxima tirada vale la mitad.' },
  duende: { title: 'Duende ladrón', text: 'Sale de un arbusto y te quita 4 gemas.' },
  urraca: { title: 'Urraca real', text: 'Se lleva una de tus cartas. Si no tienes, 3 gemas.' },
};
const CALM = [
  'El viento trae una canción antigua.',
  'Una liebre plateada te mira y se va.',
  'Encuentras una fogata aún tibia.',
  'Las flores se inclinan a tu paso.',
  'Un búho te guiña un ojo.',
];

const newFx = () => ({ shield: false, golden: 0, magnet: false, map: false, plus: 0, double: false, fixed: 0, die: null, again: false, worst: false, minus: 0, half: false, locked: false });

export class Game {
  constructor({ seed = Date.now(), len = 28, names = ['Princesa', 'Mago'] } = {}) {
    this.seed = seed;
    this.board = makeBoard(seed, len);
    this.rng = makeRng(seed ^ 0x9e3779b9);
    this.players = names.map((name, id) => ({
      id, name, tile: this.board.startId, gems: 5, stars: 0, hand: [], arrived: false, flags: {}, fx: newFx(),
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
    this.usedAdventures = [];
    this.bag = [];
    this.finalTurns = null;
    this.first = null;
    this.look(this.board.startId);
  }

  get player() { return this.players[this.turn]; }
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
      case 'duel': return this.duelResult(a.winner);
      default: return [];
    }
  }

  /* ---------- Utilidades ---------- */
  look(id) {
    const ids = [];
    for (const [t, d] of bfs(this.board, id).dist)
      if (d <= SIGHT && !this.tile(t).seen) { this.tile(t).seen = true; ids.push(t); }
    return ids;
  }

  addGems(ev, p, n, why) {
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

  msg(ev, kind, title, text, quick) { ev.push({ t: 'msg', kind, title, text, quick }); }

  // Devuelve true si el escudo detuvo el golpe.
  shielded(ev, p, what) {
    if (!p.fx.shield) return false;
    p.fx.shield = false;
    ev.push({ t: 'shield', p: p.id, what });
    return true;
  }

  giveCard(ev, p, card = this.rng.pick(Object.keys(CARDS))) {
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

  /* ---------- Turnos ---------- */
  startTurn(extra = false) {
    const ev = [], p = this.player;
    this.cardPlayed = false;
    this.bought = {};
    this.phase = 'ready';
    ev.push({ t: 'turn', p: p.id, extra, left: this.first != null ? this.finalTurns : null });
    if (!extra && this.first == null && this.turns > 0 && this.turns % TOURNEY_EVERY === 0 && this.lastTourney !== this.turns) {
      this.lastTourney = this.turns;
      this.startDuel(ev, 'torneo');
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
    p.fx.locked = false;
    this.adventure = this.shop = this.cave = null;
    if (p.fx.again) {
      p.fx.again = false;
      return ev.concat(this.startTurn(true));
    }
    this.addStar(ev, p);
    this.turns++;
    if (this.first != null) {
      this.finalTurns--;
      return ev.concat(this.finalTurns <= 0 ? this.finish() : this.startTurn());
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
    this.offer = { cards: offerCards(this.rng), why };
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
  playCard(i, value) {
    const p = this.player, r = this.rival, card = p.hand[i];
    if (this.phase !== 'ready' || this.cardPlayed || p.fx.locked || !card) return [];
    if (CARDS[card].choose && !(value >= 1 && value <= 6)) return [];
    p.hand.splice(i, 1);
    this.cardPlayed = true;
    const ev = [{ t: 'card', p: p.id, card }];
    const hit = (fn) => {
      if (r.arrived && !['robo', 'maleta', 'peaje'].includes(card)) { this.msg(ev, 'calm', 'Sin efecto', `${r.name} ya está a salvo en el castillo.`, true); return; }
      if (!this.shielded(ev, r, CARDS[card].name)) fn();
    };
    const curse = () => ev.push({ t: 'curse', p: r.id });
    switch (card) {
      case 'cosecha': this.addGems(ev, p, 4, 'card'); break;
      case 'dorado': p.fx.golden += 2; break;
      case 'iman': p.fx.magnet = true; break;
      case 'mapa': p.fx.map = true; break;
      case 'apuesta': this.addGems(ev, p, this.rng.chance(0.5) ? 8 : -3, 'card'); break;
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
      case 'gusanito': hit(() => this.shove(ev, r, -3)); break;
      case 'cambiazo': hit(() => this.swap(ev, 8)); break;
      case 'reto': this.startDuel(ev, 'reto'); break;
    }
    ev.push({ t: 'hud' });
    return ev;
  }

  swap(ev, max = 99) {
    const p = this.player, r = this.rival;
    if (r.arrived || bfs(this.board, p.tile).dist.get(r.tile) > max || p.tile === r.tile) {
      this.msg(ev, 'portal', 'Demasiado lejos', 'La magia no alcanza y se deshace en chispas.', true);
      return;
    }
    [p.tile, r.tile] = [r.tile, p.tile];
    ev.push({ t: 'swap', a: p.id, b: r.id });
  }

  canBuy(what) {
    const p = this.player;
    if (p.fx.locked || p.gems < PRICES[what] || this.bought[what]) return false;
    if (what === 'sobre') return this.phase === 'ready' && p.hand.length < HAND_LIMIT;
    if (what === 'trampa') return this.phase === 'ready' && !this.rival.arrived && this.snareSpots().length > 0;
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
      const sum = dice.reduce((a, b) => a + b, 0);
      total = fx.worst ? sum - Math.max(...dice) : sum;
      if (fx.die) mods.push(`Dado ${fx.die}`);
      if (fx.double) mods.push('Doble dado');
      if (fx.worst) mods.push('Nube gris: sin el mayor');
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
      this.msg(ev, 'star', 'Consuelo de las hadas', 'Sacaste 1: ganas una estrella extra.', true);
      this.addStar(ev, p);
    }
    if (total === 0) {
      this.msg(ev, 'calm', '¡Cero!', 'El dado loco se queda dormido, y tú también. Ganas 3 gemas de consuelo.');
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
    let walked = 0;
    for (const step of path) {
      p.tile = step;
      walked++;
      const t = this.tile(step), caught = t.snare != null && t.snare !== p.id;
      ev.push({ t: 'step', p: p.id, id: step, last: step === id || caught });
      const ids = this.look(step);
      if (ids.length) ev.push({ t: 'seen', ids });
      if (caught) {
        t.snare = null;
        ev.push({ t: 'trap', p: p.id, id: step, trap: 'red' });
        this.msg(ev, 'trap', '¡Una trampa escondida!', `${r.name} la puso aquí: te detienes y te roba 4 gemas.`);
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
    if (r.tile === id && !r.arrived && id !== this.board.startId) {
      this.msg(ev, 'duel', '¡Encuentro!', `${p.name} alcanza a ${r.name}. ¡Se resuelve con un duelo!`);
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
        let n = c.n;
        if (p.fx.golden) { n *= 2; p.fx.golden--; this.msg(ev, 'gem', 'Toque dorado', `¡Las gemas se duplican! Recoges ${n}.`, true); }
        clear();
        this.addGems(ev, p, n, 'tile');
        return false;
      }
      case 'trap': {
        const tr = TRAPS[c.trap];
        ev.push({ t: 'trap', p: p.id, id: t.id, trap: c.trap });
        this.msg(ev, 'trap', tr.title, tr.text);
        if (this.shielded(ev, p, tr.title)) return false;
        if (c.trap === 'duende') this.addGems(ev, p, -4, 'lost');
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
        if (c.type === 'portal') this.msg(ev, 'portal', 'Portal errante', fwd ? 'Un remolino te lanza hacia adelante.' : 'Un remolino te arrastra hacia atrás.');
        if (c.type === 'eagle') this.msg(ev, 'eagle', '¡El águila gigante!', `Te toma por los hombros y vuelas ${n} casillas.`);
        if (c.type === 'worm') this.msg(ev, 'worm', '¡El gran gusano!', `Te traga y te escupe ${n} casillas atrás.`);
        if (c.type === 'worm' && this.shielded(ev, p, 'El gran gusano')) return false;
        p.tile = to.id;
        ev.push({ t: c.type === 'portal' ? 'teleport' : c.type, p: p.id, from: t.id, id: to.id });
        if (c.type === 'portal') this.reveal(ev, to.id);
        const ids = this.look(to.id);
        if (ids.length) ev.push({ t: 'seen', ids });
        return false;
      }
      case 'shrine':
        this.msg(ev, 'shrine', 'Santuario compartido', `${p.name} gana 3 gemas. ${r.name} también recibe una estrella.`);
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
        if (r.arrived) { this.msg(ev, 'gem', 'Arena vacía', 'No hay con quién pelear: te llevas el premio de 3 gemas.'); this.addGems(ev, p, 3, 'tile'); return false; }
        this.msg(ev, 'duel', 'Arena antigua', 'Las piedras exigen un duelo. El ganador le quita 4 gemas al otro.');
        this.startDuel(ev, 'arena');
        return true;
      case 'adventure': return this.startAdventure(ev, t);
      case 'shop':
        this.shop = { items: offerCards(this.rng).map((card, i) => ({ card, price: [3, 4, 4][i], sold: false })) };
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
      default:
        this.msg(ev, 'calm', 'Descanso', `${this.rng.pick(CALM)} Ganas una estrella.`, true);
        this.addStar(ev, p);
        return false;
    }
  }

  /* ---------- Aventuras ---------- */
  startAdventure(ev, t) {
    const p = this.player;
    const open = (a) => !this.usedAdventures.includes(a.id) && (a.biome == null || a.biome === t.biome);
    const follow = ADVENTURES.filter((a) => a.need && p.flags[a.need] && p.flags[a.need] < this.turns);
    let list = follow.length && this.rng.chance(0.75) ? follow : ADVENTURES.filter((a) => !a.need && open(a));
    if (!list.length) { this.usedAdventures = []; list = ADVENTURES.filter((a) => !a.need && open(a)); }
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
    this.msg(ev, good === false ? 'trap' : a.icon, c.label, out.text);
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
        if (r.arrived) this.addGems(ev, p, 3, 'adventure');
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

  caveAct(what) {
    if (this.phase !== 'cave') return [];
    const p = this.player, c = this.cave, ev = [];
    if (what === 'leave') {
      if (c.bag) this.addGems(ev, p, c.bag, 'cave');
      return ev.concat(this.endTurn());
    }
    const die = this.rng.int(1, 6), need = c.grabs + 1; // despierta si el dado no supera los intentos
    const ok = c.grabs === 0 || die > c.grabs;
    if (c.grabs > 0) ev.push({ t: 'check', p: p.id, die, need, ok });
    c.grabs++;
    if (ok) {
      const n = [2, 3, 3, 4, 5, 6][Math.min(5, c.grabs - 1)];
      c.bag += n;
      ev.push({ t: 'grab', p: p.id, n, bag: c.bag });
      return ev;
    }
    ev.push({ t: 'dragon', p: p.id, id: p.tile });
    this.msg(ev, 'flame', '¡El dragón despertó!', `Sueltas ${c.bag} gemas y sales volando 2 casillas atrás.`);
    if (!this.shielded(ev, p, 'Fuego de dragón')) this.shove(ev, p, -2);
    return ev.concat(this.endTurn());
  }

  /* ---------- Minijuegos ---------- */
  startDuel(ev, why) {
    if (!this.bag.length) this.bag = this.rng.shuffle(MINIGAMES);
    this.duel = { why, game: this.bag.pop(), seed: this.rng.int(1, 1e9), by: this.turn };
    this.phase = 'duel';
    ev.push({ t: 'duel', ...this.duel });
  }

  duelResult(w) {
    if (this.phase !== 'duel' || ![0, 1, -1].includes(w)) return [];
    const { why } = this.duel, ev = [];
    this.duel = null;
    this.phase = 'resolving';
    const win = this.players[w], lose = this.players[1 - w];
    if (w < 0) {
      this.msg(ev, 'shrine', '¡Empate!', 'Los dos ganan 2 gemas por el espectáculo.', true);
      for (const p of this.players) this.addGems(ev, p, 2, 'duel');
    } else if (why === 'torneo') {
      this.msg(ev, 'crown', `¡${win.name} gana el torneo!`, `Recibe 4 gemas y una carta. ${lose.name} gana una estrella.`);
      this.addGems(ev, win, 4, 'duel');
      this.giveCard(ev, win);
      this.addStar(ev, lose);
    } else {
      this.msg(ev, 'crown', `¡${win.name} gana el duelo!`, `Le quita hasta 4 gemas a ${lose.name}.`, true);
      this.rob(ev, win, lose, 4);
      if (lose.gems === 0) this.addStar(ev, lose);
    }
    if (why === 'torneo') { this.phase = 'ready'; this.checkStars(ev); return ev; }
    if (why === 'reto') { this.phase = 'ready'; return ev; }
    return ev.concat(this.endTurn());
  }

  /* ---------- Final ---------- */
  arrive() {
    const p = this.player, ev = [];
    p.arrived = true;
    p.fx.again = false;
    const isFirst = this.first == null;
    ev.push({ t: 'arrive', p: p.id, first: isFirst });
    this.addGems(ev, p, isFirst ? ARRIVE_FIRST : ARRIVE_SECOND, 'castle');
    if (isFirst) {
      this.first = p.id;
      this.finalTurns = FINAL_TURNS;
      this.turn = this.rival.id;
      this.msg(ev, 'castle', '¡Ya llegó al castillo!', `${p.name} gana ${ARRIVE_FIRST} gemas. A ${this.player.name} le quedan ${FINAL_TURNS} turnos para juntar más.`);
      return ev.concat(this.startTurn());
    }
    return ev.concat(this.finish());
  }

  finish() {
    this.phase = 'over';
    const [a, b] = this.players;
    this.winner = a.gems === b.gems ? this.first : a.gems > b.gems ? 0 : 1;
    return [{ t: 'over', winner: this.winner, tie: a.gems === b.gems }];
  }
}
