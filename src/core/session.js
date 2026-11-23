import { Game } from './game.js';

// Una partida en curso. Toda jugada pasa por dispatch(): se aplica, se guarda y se
// avisa a quien escuche. Para jugar en línea bastará un transporte que envíe y reciba
// estas mismas acciones ({ send, onReceive }) sin tocar las reglas.
export const SAVE_VERSION = 4;

export class Session {
  constructor(opts, { log = [], store = null, transport = null } = {}) {
    this.opts = opts;
    this.game = new Game(opts);
    this.log = [];
    this.store = store;
    this.transport = transport;
    for (const a of log) { this.game.apply(a); this.log.push(a); }
    transport?.onReceive((a) => this.receive(a));
    this.onEvents = () => {};
  }

  dispatch(action) {
    const ev = this.game.apply(action);
    if (!ev.length) return ev;
    this.log.push(action);
    this.transport?.send(action);
    this.save();
    return ev;
  }

  receive(action) {
    const ev = this.game.apply(action);
    if (ev.length) { this.log.push(action); this.save(); this.onEvents(ev); }
  }

  save() {
    if (this.game.phase === 'over') this.store?.clear();
    else this.store?.write({ v: SAVE_VERSION, opts: this.opts, log: this.log });
  }

  static load(store) {
    const d = store.read();
    if (!d || d.v !== SAVE_VERSION || !d.log?.length) return null;
    try {
      const s = new Session(d.opts, { log: d.log, store });
      return s.game.phase === 'over' ? null : s;
    } catch { return null; }
  }
}

export const localStore = (key = 'corona-partida') => ({
  read() { try { return JSON.parse(localStorage.getItem(key)); } catch { return null; } },
  write(d) { try { localStorage.setItem(key, JSON.stringify(d)); } catch {} },
  clear() { try { localStorage.removeItem(key); } catch {} },
});
