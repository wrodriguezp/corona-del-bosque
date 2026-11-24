import { noPad } from '../core/minigames/index.js';

// Traduce teclado, mouse y toques a los mandos de los minijuegos. Para jugar en
// salas bastará reemplazar read() por mandos que lleguen de la red.
// Todo se lee por lado de la pantalla (0 izquierda, 1 derecha) y al final se
// asigna a cada jugador: con `swap` los lados se intercambian.
const BUTTON = [['Space', 'KeyA', 'KeyS', 'KeyD', 'KeyW', 'KeyF'], ['Enter', 'NumpadEnter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'KeyL']];
const DIRS = [['KeyW', 'KeyD', 'KeyS', 'KeyA'], ['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft']];
const STICK = 46, FULL = 34;
const clamp = (v) => Math.max(-1, Math.min(1, v));
const STICKS = ['move', 'move2'];

export class Pads {
  constructor(root, aimAt, kind, mobile, swap = false) {
    Object.assign(this, { aimAt, kind, swap });
    this.keys = new Set();
    this.hit = [false, false];
    this.touch = new Map();
    this.aim = null;
    this.shot = null;
    this.runner = 0;
    this.el = document.createElement('div');
    this.el.className = 'pad';
    this.mouse = false;
    this.dirs = [[], []];
    const P = (side) => (swap ? 1 - side : side);
    this.P = P;
    // En celular, cada mitad tiene sus cuatro botones de dirección.
    if (kind === 'dirs' && mobile) this.el.innerHTML = [0, 1].map((side) => `<div class="dpad p${P(side)} s${side}">${[0, 1, 2, 3].map((d) => `<i data-p="${P(side)}" data-d="${d}" class="d${d}"></i>`).join('')}</div>`).join('');
    // Quien huye tiene su joystick dibujado en su esquina; el resto de la pantalla es para lanzar.
    if (kind === 'chase' && mobile) { this.zone = document.createElement('div'); this.zone.className = 'zone'; this.el.append(this.zone); }
    root.append(this.el);
    const on = (t, ev, fn) => { t.addEventListener(ev, fn, { passive: false }); this.off.push(() => t.removeEventListener(ev, fn)); };
    this.off = [];
    on(window, 'keydown', (e) => {
      if (e.target.tagName === 'INPUT') return;
      if (/^(Arrow|Space|Enter)/.test(e.code)) e.preventDefault();
      if (e.repeat) return;
      this.keys.add(e.code);
      DIRS.forEach((b, side) => b.includes(e.code) && this.dirs[P(side)].push(b.indexOf(e.code)));
      BUTTON.forEach((b, side) => b.includes(e.code) && (this.hit[P(side)] = true));
    });
    on(window, 'keyup', (e) => this.keys.delete(e.code));
    on(window, 'blur', () => { this.keys.clear(); this.mouse = false; });
    on(window, 'pointerup', () => (this.mouse = false));
    on(this.el, 'contextmenu', (e) => e.preventDefault());
    on(this.el, 'pointerdown', (e) => {
      e.preventDefault();
      // Un toque en cualquier parte de la cruz cuenta: se toma la flecha más cercana
      // (antes, un dedo que caía entre dos flechas no hacía nada).
      const pad = e.target.closest?.('.dpad');
      if (pad) {
        let b = e.target.closest('[data-d]');
        if (!b) {
          const r = pad.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
          b = pad.querySelector(`.d${Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : dy > 0 ? 2 : 0}`);
        }
        this.dirs[b.dataset.p].push(+b.dataset.d); b.classList.remove('on'); void b.offsetWidth; b.classList.add('on'); return;
      }
      try { this.el.setPointerCapture(e.pointerId); } catch {}
      if (e.pointerType === 'mouse') { this.aim = this.aimAt(e); this.shot = this.aim; this.hit[1] = true; this.mouse = true; return; }
      const side = e.clientX < innerWidth / 2 ? 0 : 1, i = P(side);
      const t = { i, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY };
      if (kind === 'chase') {
        // Solo un dedo maneja al que huye, y solo si empieza en su zona: los
        // toques del que lanza nunca le mueven ni le reinician el joystick.
        const inZone = e.clientY > innerHeight * 0.55 && P(side) === this.runner;
        if (inZone && ![...this.touch.values()].some((q) => q.stick)) t.stick = true;
        else { this.shot = this.aimAt(e); return; }
      } else this.hit[i] = true;
      if (t.stick || STICKS.includes(kind)) this.draw(t, true);
      this.touch.set(e.pointerId, t);
    });
    on(this.el, 'pointermove', (e) => {
      if (e.pointerType === 'mouse') { this.aim = this.aimAt(e); return; }
      const t = this.touch.get(e.pointerId);
      if (!t) return;
      t.x = e.clientX; t.y = e.clientY;
      // El origen sigue al dedo: cambiar de dirección responde al instante.
      const dx = t.x - t.x0, dy = t.y - t.y0, d = Math.hypot(dx, dy);
      if (d > STICK) { t.x0 += dx * (1 - STICK / d); t.y0 += dy * (1 - STICK / d); }
      this.draw(t);
    });
    const up = (e) => { const t = this.touch.get(e.pointerId); t?.el?.remove(); this.touch.delete(e.pointerId); };
    on(this.el, 'pointerup', up);
    on(this.el, 'pointercancel', up);
  }

  // Dibuja el joystick: un aro donde se apoyó el dedo y una perilla que lo sigue.
  draw(t, first) {
    if (first) { t.el = document.createElement('div'); t.el.className = `stick p${t.i}`; t.el.innerHTML = '<i></i>'; this.el.append(t.el); }
    if (!t.el) return;
    t.el.style.transform = `translate(${t.x0}px, ${t.y0}px)`;
    t.el.firstChild.style.transform = `translate(${t.x - t.x0}px, ${t.y - t.y0}px)`;
  }

  axis(neg, pos) { return (pos.some((k) => this.keys.has(k)) ? 1 : 0) - (neg.some((k) => this.keys.has(k)) ? 1 : 0); }
  stick(t, p) { p.x = clamp((t.x - t.x0) / FULL); p.y = clamp((t.y - t.y0) / FULL); }

  read(kind, s) {
    const pads = [noPad(), noPad()], P = this.P;
    if (kind === 'button') pads.forEach((p, i) => (p.a = this.hit[i]));
    if (kind === 'hold') {
      pads.forEach((p, i) => (p.h = this.hit[i] || BUTTON[P(i)].some((k) => this.keys.has(k)) || [...this.touch.values()].some((t) => t.i === i)));
      if (this.mouse) pads[1].h = true;
    }
    if (kind === 'dirs') pads.forEach((p, i) => (p.d = this.dirs[i].shift() ?? null));
    else this.dirs = [[], []];
    if (kind === 'move2') {
      pads.forEach((p, i) => { const [u, r, d, l] = DIRS[P(i)]; p.x = this.axis([l], [r]); p.y = this.axis([u], [d]); });
      for (const t of this.touch.values()) this.stick(t, pads[t.i]);
    }
    if (kind === 'move') {
      pads.forEach((p, i) => (p.x = this.axis([['KeyA'], ['ArrowLeft']][P(i)], [['KeyD'], ['ArrowRight']][P(i)])));
      for (const t of this.touch.values()) pads[t.i].x = clamp((t.x - t.x0) / FULL);
    }
    if (kind === 'chase') {
      if (s.runner !== this.runner) { this.runner = s.runner; for (const [id, t] of this.touch) { t.el?.remove(); this.touch.delete(id); } }
      if (this.zone) this.zone.className = `zone p${s.runner} s${P(s.runner)}`;
      const r = pads[s.runner], c = pads[1 - s.runner];
      r.x = this.axis(['KeyA', 'ArrowLeft'], ['KeyD', 'ArrowRight']);
      r.y = this.axis(['KeyW', 'ArrowUp'], ['KeyS', 'ArrowDown']);
      for (const t of this.touch.values()) if (t.stick) this.stick(t, r);
      c.a = !!this.shot;
      c.aim = this.shot || this.aim;
    }
    this.hit = [false, false];
    this.shot = null;
    return pads;
  }

  stop() { this.off.forEach((f) => f()); this.el.remove(); }
}
