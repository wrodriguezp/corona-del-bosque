import { makeRng } from './rng.js';
import { makeBoard, bfs, pathTo } from './board.js';
import { CARDS, HAND_LIMIT, offerCards } from './cards.js';

// Reglas puras: sin gráficos. Cada acción devuelve una lista de eventos que
// la vista anima en orden. Así mismo servirá para jugar en línea más adelante.

export const ARRIVE_FIRST = 8;
export const ARRIVE_SECOND = 4;
export const FINAL_TURNS = 3;
export const SIGHT = 3;

const TRAPS = {
  pozo: { title: 'Pozo escondido', text: 'El suelo cede. Retrocedes 3 casillas.' },
  zarzas: { title: 'Zarzas encantadas', text: 'Te enredas: tu próxima tirada vale la mitad.' },
  duende: { title: 'Duende ladrón', text: 'Sale de un arbusto y te quita 3 gemas.' },
};
const CALM = [
  'El viento trae una canción antigua.',
  'Una liebre plateada te mira y se va.',
  'Encuentras una fogata aún tibia.',
  'Las flores se inclinan a tu paso.',
  'Un búho te guiña un ojo.',
];

export class Game {
  constructor({ seed = Date.now(), len = 28, names = ['Princesa', 'Mago'] } = {}) {
    this.seed = seed;
    this.board = makeBoard(seed, len);
    this.rng = makeRng(seed ^ 0x9e3779b9);
    this.players = names.map((name, id) => ({
      id, name, tile: this.board.startId, gems: 3, stars: 0, hand: [], arrived: false,
      fx: { shield: false, golden: 0, magnet: false, plus: 0, double: false, fixed: 0, again: false, worst: false, minus: 0, half: false },
    }));
    this.turn = this.rng.int(0, 1);
    this.players[1 - this.turn].stars = 1; // compensa empezar segundo
    this.players[1 - this.turn].gems += 1;
    this.phase = 'ready';
    this.round = 1;
    this.cardPlayed = false;
    this.total = 0;
    this.offer = null;
    this.finalTurns = null;
    this.first = null;
    this.look(this.board.startId);
  }

  get player() { return this.players[this.turn]; }
  get rival() { return this.players[1 - this.turn]; }
  tile(id) { return this.board.tiles[id]; }

  begin() { return this.startTurn(); }

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

  addStar(ev, p, n = 1) {
    p.stars += n;
    ev.push({ t: 'star', p: p.id, n });
  }

  // Devuelve true si el escudo detuvo el golpe.
  shielded(ev, p, what) {
    if (!p.fx.shield) return false;
    p.fx.shield = false;
    ev.push({ t: 'shield', p: p.id, what });
    return true;
  }

  startTurn(extra = false) {
    const ev = [];
    const p = this.player;
    this.cardPlayed = false;
    this.phase = 'ready';
    ev.push({ t: 'turn', p: p.id, extra, left: this.first != null ? this.finalTurns : null });
    if (p.stars >= 3) {
      p.stars -= 3;
      this.makeOffer(ev, 'stars');
    }
    return ev;
  }

  makeOffer(ev, why) {
    const p = this.player;
    if (p.hand.length >= HAND_LIMIT) {
      ev.push({ t: 'msg', kind: 'gem', title: 'Mano llena', text: 'Ya tienes 4 cartas: recibes 3 gemas en su lugar.' });
      this.addGems(ev, p, 3, 'full');
      return false;
    }
    this.offer = { cards: offerCards(this.rng), why };
    this.phase = 'pick';
    ev.push({ t: 'offer', p: p.id, cards: this.offer.cards, why });
    return true;
  }

  pick(i) {
    if (this.phase !== 'pick' || !this.offer?.cards[i]) return [];
    const card = this.offer.cards[i];
    const { why } = this.offer;
    this.offer = null;
    this.player.hand.push(card);
    const ev = [{ t: 'gain', p: this.turn, card }];
    if (why === 'stars') { this.phase = 'ready'; return ev; }
    return ev.concat(this.endTurn());
  }

  playCard(i, value) {
    const p = this.player, r = this.rival;
    const card = p.hand[i];
    if (this.phase !== 'ready' || this.cardPlayed || !card) return [];
    if (CARDS[card].choose && !(value >= 1 && value <= 6)) return [];
    p.hand.splice(i, 1);
    this.cardPlayed = true;
    const ev = [{ t: 'card', p: p.id, card }];
    switch (card) {
      case 'cosecha': this.addGems(ev, p, 4, 'card'); break;
      case 'dorado': p.fx.golden += 2; break;
      case 'iman': p.fx.magnet = true; break;
      case 'botas': p.fx.plus += 3; break;
      case 'doble': p.fx.double = true; break;
      case 'encantado': p.fx.fixed = value; break;
      case 'aliento': p.fx.again = true; break;
      case 'escudo': p.fx.shield = true; break;
      case 'robo':
        if (!this.shielded(ev, r, CARDS[card].name)) this.addGems(ev, p, -this.addGems(ev, r, -3, 'stolen'), 'steal');
        break;
      case 'maleta':
        if (!this.shielded(ev, r, CARDS[card].name)) this.addGems(ev, r, -4, 'lost');
        break;
      case 'nube':
        if (!this.shielded(ev, r, CARDS[card].name)) { r.fx.worst = true; ev.push({ t: 'curse', p: r.id }); }
        break;
      case 'raices':
        if (!this.shielded(ev, r, CARDS[card].name)) { r.fx.minus += 2; ev.push({ t: 'curse', p: r.id }); }
        break;
    }
    ev.push({ t: 'hud' });
    return ev;
  }

  roll() {
    if (this.phase !== 'ready') return [];
    const p = this.player, fx = p.fx;
    const ev = [], mods = [];
    let dice, total;
    if (fx.fixed) {
      dice = [fx.fixed]; total = fx.fixed; mods.push('Dado encantado');
    } else {
      const n = fx.double || fx.worst ? 2 : 1;
      dice = Array.from({ length: n }, () => this.rng.int(1, 6));
      if (fx.double && fx.worst) { dice.push(this.rng.int(1, 6)); total = dice[0] + dice[1] + dice[2] - Math.max(...dice); mods.push('Doble dado', 'Nube gris: sin el mayor'); }
      else if (fx.double) { total = dice[0] + dice[1]; mods.push('Doble dado'); }
      else if (fx.worst) { total = Math.min(...dice); mods.push('Nube gris: vale el menor'); }
      else total = dice[0];
    }
    const natural = total;
    if (fx.plus) { total += fx.plus; mods.push(`Botas +${fx.plus}`); }
    if (fx.minus) { total = Math.max(1, total - fx.minus); mods.push(`Raíces −${fx.minus}`); }
    if (fx.half) { total = Math.max(1, Math.ceil(total / 2)); mods.push('Zarzas: la mitad'); }
    Object.assign(fx, { plus: 0, minus: 0, half: false, worst: false, double: false, fixed: 0 });
    this.total = total;
    this.phase = 'move';
    ev.push({ t: 'roll', p: p.id, dice, total, mods });
    if (natural === 1) {
      ev.push({ t: 'msg', kind: 'star', title: 'Consuelo de las hadas', text: 'Sacaste 1: ganas una estrella extra.', quick: true });
      this.addStar(ev, p);
    }
    ev.push({ t: 'options', ids: this.options() });
    return ev;
  }

  options() {
    const { dist } = bfs(this.board, this.player.tile);
    let out = [...dist].filter(([, d]) => d === this.total).map(([id]) => id);
    const dc = dist.get(this.board.castleId);
    if (dc <= this.total && !out.includes(this.board.castleId)) out.push(this.board.castleId);
    if (!out.length) {
      const far = Math.max(...dist.values());
      out = [...dist].filter(([, d]) => d === far).map(([id]) => id);
    }
    return out;
  }

  pathFor(id) {
    const { parent } = bfs(this.board, this.player.tile);
    return pathTo(parent, this.player.tile, id);
  }

  reveal(ev, id) {
    const t = this.tile(id);
    if (t.revealed) return;
    t.revealed = true;
    ev.push({ t: 'reveal', id });
  }

  moveTo(id) {
    if (this.phase !== 'move' || !this.options().includes(id)) return [];
    const p = this.player, r = this.rival;
    const ev = [];
    const path = this.pathFor(id);
    for (const step of path) {
      p.tile = step;
      ev.push({ t: 'step', p: p.id, id: step, last: step === id });
      const ids = this.look(step);
      if (ids.length) ev.push({ t: 'seen', ids });
      this.reveal(ev, step);
    }
    if (p.fx.magnet) {
      p.fx.magnet = false;
      this.addGems(ev, p, Math.min(6, path.length), 'magnet');
    }
    if (id === this.board.castleId) return ev.concat(this.arrive());

    if (r.tile === id && !r.arrived && id !== this.board.startId) {
      ev.push({ t: 'msg', kind: 'steal', title: '¡Encuentro!', text: `${p.name} alcanza a ${r.name} y le quita hasta 2 gemas.` });
      if (!this.shielded(ev, r, 'Encuentro')) this.addGems(ev, p, -this.addGems(ev, r, -2, 'stolen'), 'steal');
    }
    if (this.resolve(ev, this.tile(id))) return ev;
    return ev.concat(this.endTurn());
  }

  // Devuelve true si el turno queda esperando una elección.
  resolve(ev, t) {
    const p = this.player, r = this.rival, c = t.content;
    if (!c) return false;
    const msg = (kind, title, text) => ev.push({ t: 'msg', kind, title, text });
    const clear = () => { t.content = { type: 'calm' }; ev.push({ t: 'clear', id: t.id }); };
    switch (c.type) {
      case 'gem': {
        let n = c.n;
        if (p.fx.golden) { n *= 2; p.fx.golden--; msg('gem', 'Toque dorado', `¡Las gemas se duplican! Recoges ${n}.`); }
        clear();
        this.addGems(ev, p, n, 'tile');
        return false;
      }
      case 'trap': {
        const tr = TRAPS[c.trap];
        ev.push({ t: 'trap', p: p.id, id: t.id, trap: c.trap });
        msg('trap', tr.title, tr.text);
        if (this.shielded(ev, p, tr.title)) return false;
        if (c.trap === 'duende') this.addGems(ev, p, -3, 'lost');
        if (c.trap === 'zarzas') p.fx.half = true;
        if (c.trap === 'pozo') {
          const { parent } = bfs(this.board, this.board.startId);
          for (let k = 0; k < 3 && p.tile !== this.board.startId; k++) {
            p.tile = parent.get(p.tile);
            ev.push({ t: 'step', p: p.id, id: p.tile, back: true });
            this.reveal(ev, p.tile);
          }
        }
        return false;
      }
      case 'portal': {
        const to = this.tile(c.to);
        const fwd = to.dist < t.dist;
        msg('portal', 'Portal errante', fwd ? 'Un remolino te lanza hacia adelante.' : 'Un remolino te arrastra hacia atrás.');
        p.tile = to.id;
        ev.push({ t: 'teleport', p: p.id, from: t.id, id: to.id });
        const ids = this.look(to.id);
        if (ids.length) ev.push({ t: 'seen', ids });
        this.reveal(ev, to.id);
        return false;
      }
      case 'shrine':
        msg('shrine', 'Santuario compartido', `${p.name} gana 2 gemas. ${r.name} también recibe una estrella.`);
        clear();
        this.addGems(ev, p, 2, 'tile');
        this.addStar(ev, p);
        if (!r.arrived) this.addStar(ev, r);
        return false;
      case 'chest':
        clear();
        return this.makeOffer(ev, 'chest');
      default:
        msg('calm', 'Descanso', `${this.rng.pick(CALM)} Ganas una estrella.`);
        this.addStar(ev, p);
        return false;
    }
  }

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
      ev.push({ t: 'msg', kind: 'castle', title: '¡Ya llegó al castillo!', text: `${p.name} gana ${ARRIVE_FIRST} gemas. A ${this.player.name} le quedan ${FINAL_TURNS} turnos para juntar más.` });
      return ev.concat(this.startTurn());
    }
    return ev.concat(this.finish());
  }

  endTurn() {
    const p = this.player, ev = [];
    if (p.fx.again) {
      p.fx.again = false;
      return ev.concat(this.startTurn(true));
    }
    this.addStar(ev, p);
    if (this.first != null) {
      this.finalTurns--;
      if (this.finalTurns <= 0) return ev.concat(this.finish());
      return ev.concat(this.startTurn());
    }
    this.turn = 1 - this.turn;
    this.round++;
    return ev.concat(this.startTurn());
  }

  finish() {
    this.phase = 'over';
    const [a, b] = this.players;
    const winner = a.gems === b.gems ? this.first : a.gems > b.gems ? 0 : 1;
    this.winner = winner;
    return [{ t: 'over', winner, tie: a.gems === b.gems }];
  }
}
