import { noPad } from '../core/minigames/index.js';

// Traduce teclado, mouse y toques a los mandos de los minijuegos. Para jugar en
// salas bastará reemplazar read() por mandos que lleguen de la red.
const BUTTON = [['Space', 'KeyA', 'KeyS', 'KeyD', 'KeyW', 'KeyF'], ['Enter', 'NumpadEnter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyL']];
const DIRS = [['KeyW', 'KeyD', 'KeyS', 'KeyA'], ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft']];
const clamp = (v) => Math.max(-1, Math.min(1, v));

export class Pads {
  constructor(root, aimAt, kind, mobile) {
    this.aimAt = aimAt;
    this.keys = new Set();
    this.hit = [false, false];
    this.touch = new Map();
    this.aim = null;
    this.shot = null;
    this.el = document.createElement('div');
    this.el.className = 'pad';
    this.mouse = false;
    this.dirs = [[], []];
    // En celular, cada mitad tiene sus cuatro botones de dirección.
    if (kind === 'dirs' && mobile) this.el.innerHTML = [0, 1].map((i) => `<div class="dpad p${i}">${[0, 1, 2, 3].map((d) => `<i data-p="${i}" data-d="${d}" class="d${d}"></i>`).join('')}</div>`).join('');
    root.append(this.el);
    const on = (t, ev, fn) => { t.addEventListener(ev, fn, { passive: false }); this.off.push(() => t.removeEventListener(ev, fn)); };
    this.off = [];
    on(window, 'keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (/^(Arrow|Space|Enter)/.test(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      DIRS.forEach((b, i) => b.includes(e.code) && this.dirs[i].push(b.indexOf(e.code)));
      BUTTON.forEach((b, i) => b.includes(e.code) && (this.hit[i] = true));
    });
    on(window, 'keyup', (e) => this.keys.delete(e.code));
    on(window, 'blur', () => { this.keys.clear(); this.mouse = false; });
    on(window, 'pointerup', () => (this.mouse = false));
    on(this.el, 'contextmenu', (e) => e.preventDefault());
    on(this.el, 'pointerdown', (e) => {
      e.preventDefault();
      const b = e.target.closest?.('[data-d]');
      if (b) { this.dirs[b.dataset.p].push(+b.dataset.d); b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); return; }
      try { this.el.setPointerCapture(e.pointerId); } catch {}
      if (e.pointerType === 'mouse') { this.aim = this.aimAt(e); this.shot = this.aim; this.hit[1] = true; this.mouse = true; return; }
      const low = e.clientY > innerHeight * 0.62, i = e.clientX < innerWidth / 2 ? 0 : 1;
      this.touch.set(e.pointerId, { i, low, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY });
      this.hit[i] = true;
      if (!low) this.shot = this.aimAt(e);
    });
    on(this.el, 'pointermove', (e) => {
      if (e.pointerType === 'mouse') { this.aim = this.aimAt(e); return; }
      const t = this.touch.get(e.pointerId);
      if (!t) return;
      t.x = e.clientX; t.y = e.clientY;
      // El origen sigue al dedo: cambiar de dirección responde al instante.
      const max = 46, dx = t.x - t.x0, dy = t.y - t.y0, d = Math.hypot(dx, dy);
      if (d > max) { t.x0 += dx * (1 - max / d); t.y0 += dy * (1 - max / d); }
    });
    const up = (e) => this.touch.delete(e.pointerId);
    on(this.el, 'pointerup', up);
    on(this.el, 'pointercancel', up);
  }

  axis(neg, pos) { return (pos.some((k) => this.keys.has(k)) ? 1 : 0) - (neg.some((k) => this.keys.has(k)) ? 1 : 0); }

  read(kind, s) {
    const pads = [noPad(), noPad()];
    if (kind === 'button') pads.forEach((p, i) => (p.a = this.hit[i]));
    if (kind === 'hold') {
      pads.forEach((p, i) => (p.h = this.hit[i] || BUTTON[i].some((k) => this.keys.has(k)) || [...this.touch.values()].some((t) => t.i === i)));
      if (this.mouse) pads[1].h = true;
    }
    if (kind === 'dirs') pads.forEach((p, i) => (p.d = this.dirs[i].shift() ?? null));
    else this.dirs = [[], []];
    if (kind === 'move2') {
      pads.forEach((p, i) => { const [u, r, d, l] = DIRS[i]; p.x = this.axis([l], [r]); p.y = this.axis([u], [d]); });
      for (const t of this.touch.values()) { pads[t.i].x = clamp((t.x - t.x0) / 34); pads[t.i].y = clamp((t.y - t.y0) / 34); }
    }
    if (kind === 'move') {
      pads[0].x = this.axis(['KeyA'], ['KeyD']);
      pads[1].x = this.axis(['ArrowLeft'], ['ArrowRight']);
      for (const t of this.touch.values()) pads[t.i].x = clamp((t.x - t.x0) / 34);
    }
    if (kind === 'chase') {
      const r = pads[s.runner], c = pads[1 - s.runner];
      r.x = this.axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']);
      r.y = this.axis(['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown']);
      for (const t of this.touch.values()) if (t.low) { r.x = clamp((t.x - t.x0) / 34); r.y = clamp((t.y - t.y0) / 34); }
      c.a = !!this.shot;
      c.aim = this.shot || this.aim;
    }
    this.hit = [false, false];
    this.shot = null;
    return pads;
  }

  stop() { this.off.forEach((f) => f()); this.el.remove(); }
}
