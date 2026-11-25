import { noPad, DT } from './minigames/kit.js';
import { BOSS, CON, REY } from './minigames/jefes.js';

// Jugadores simulados de las batallas de jefe (V4.3). Cada cierto tiempo eligen a
// dónde ir (al jefe si está mareado; si no, a una distancia prudente) y se apartan de
// lo peligroso que ven venir. A veces se distraen (lazy) y no esquivan.
const near = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const LAZY = { jconejo: 0.16, jtroll: 0.3, jrey: 0.28 };

function home(s, i, r, c = s.boss) {
  const b = c, me = s.p[i], o = s.p[1 - i];
  let a = Math.atan2(me.y - b.y, me.x - b.x);
  const ao = Math.atan2(o.y - b.y, o.x - b.x), d = Math.atan2(Math.sin(a - ao), Math.cos(a - ao));
  if (Math.abs(d) < 1.2) a += (d >= 0 ? 1 : -1) * 0.5; // separarse un poco del compañero
  return { x: b.x + Math.cos(a) * r, y: b.y + Math.sin(a) * r };
}
const inArena = (g, m = 0.6) => { const d = Math.hypot(g.x, g.y), r = BOSS.r - m; if (d > r) { g.x *= r / d; g.y *= r / d; } return g; };

function plan(id, s, i, careful) {
  const b = s.boss, me = s.p[i];
  let g = b.stun > 0 ? { x: b.x, y: b.y } : home(s, i, id === 'jconejo' ? 3.4 : 2.8);
  const push = { x: 0, y: 0 };
  const away = (q, r, w = 1) => {
    const d = near(me, q);
    if (d > r) return;
    const k = ((r - d) / r) * w * 3, dx = me.x - q.x || 0.01, dy = me.y - q.y || 0.01, m = Math.hypot(dx, dy);
    push.x += (dx / m) * k; push.y += (dy / m) * k;
  };
  if (id === 'jconejo' && b.mode === 'hop') { g = home(s, i, 3.4, { x: b.tx, y: b.ty }); if (careful) away({ x: b.tx, y: b.ty }, CON.land + 1.1, 1.5); }
  if (id === 'jtroll' && b.stun <= 0) {
    if ((b.mode === 'aim' || b.mode === 'charge') && b.target === i) {
      // Esconderse detrás de la roca más cercana, en línea con el troll.
      const r = s.rocks.reduce((m, q) => (!m || near(q, me) < near(m, me) ? q : m), null);
      if (r && b.mode === 'aim' && careful) { const dx = r.x - b.x, dy = r.y - b.y, m = Math.hypot(dx, dy) || 1; g = { x: r.x + (dx / m) * 1.25, y: r.y + (dy / m) * 1.25 }; }
    } else if (b.mode === 'aim' || b.mode === 'charge') {
      // Salirse de la línea de la embestida.
      const cx = Math.cos(b.dir), cy = Math.sin(b.dir), rx = me.x - b.x, ry = me.y - b.y, side = rx * -cy + ry * cx;
      if (Math.abs(side) < 1.6 && rx * cx + ry * cy > -0.5 && careful) g = { x: me.x - cy * Math.sign(side || 1) * 2, y: me.y + cx * Math.sign(side || 1) * 2 };
    }
    if (b.mode === 'charge' && careful) away(b, b.r + 1.2, 1.2);
  }
  if (id === 'jrey' && s.whip && careful) g = home(s, i, REY.whip.len + 0.9);
  if (id === 'jrey' && b.stun <= 0) {
    const gold = s.shots.find((q) => q.kind === 'gold' && !q.back);
    if (gold) {
      const o = s.p[1 - i], t = { x: gold.x + gold.vx * 0.3, y: gold.y + gold.vy * 0.3 };
      if (near(me, t) <= near(o, t) + 0.2) g = t;
    }
  }
  if (careful) {
    for (const q of s.shots) {
      if (q.fall != null) away(q, q.r + 0.9, 1.4);
      else if (q.kind === 'orb') {
        for (let t = 0; t < 0.8; t += 0.1) { const p = { x: q.x + q.vx * t, y: q.y + q.vy * t }; if (near(p, me) < 1) { away(p, 1.1, 1.3); break; } }
      }
    }
    // La onda tiene dos huecos opuestos: ir al más cercano antes de que llegue.
    for (const r of s.rings) {
      const d = near(me, r);
      if (r.r > d || d > CON.reach + 0.5 || (d - r.r) / r.v > 2.2) continue;
      const a = Math.atan2(me.y - r.y, me.x - r.x), da = Math.atan2(Math.sin(a - r.gap), Math.cos(a - r.gap)), gap = Math.abs(da) < Math.PI / 2 ? r.gap : r.gap + Math.PI;
      g = { x: r.x + Math.cos(gap) * d, y: r.y + Math.sin(gap) * d };
      break;
    }
  }
  inArena(g);
  return { g, push };
}

function bossBot(id) {
  return [0, 1].map((i) => { let wait = 0, careful = true, last = null; return (s, rng) => {
    const p = noPad(), me = s.p[i];
    if ((wait -= DT) <= 0) { wait = 0.12 + rng.next() * 0.18; careful = !rng.chance(LAZY[id]); }
    last = plan(id, s, i, careful);
    const { g, push } = last;
    let x = (g.x - me.x) * 1.6 + push.x - me.vx * 0.12, y = (g.y - me.y) * 1.6 + push.y - me.vy * 0.12;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    p.x = x; p.y = y;
    return p;
  }; });
}

export const bots3 = { jconejo: () => bossBot('jconejo'), jtroll: () => bossBot('jtroll'), jrey: () => bossBot('jrey') };
