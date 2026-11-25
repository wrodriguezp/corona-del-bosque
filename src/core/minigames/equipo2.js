import { DT, base, clamp, emit } from './kit.js';
import { makeRace, TEAM_RACE, TRACK, CLAW, PRIZES, pilePrize } from './feria.js';

// Minijuegos en equipo de la V4.2. Como los otros: winner = -1 si ganan los dos,
// -2 si gana el rival, y todos van de fácil a difícil.
const end = (s, won) => { s.done = true; s.won = won; s.winner = won ? -1 : -2; emit(s, won ? 'saved' : 'lost'); };

/* ---------- Carrera contra el carruaje del Rey ---------- */
export const carruaje = {
  name: 'Escobas contra el carruaje', icon: 'crown', input: 'move2', time: TEAM_RACE.time, team: true, ...makeRace(true),
  goal: ['Juegan en equipo. Vuelan en escoba por la pista del lago y el carruaje del Rey también corre, cada vez más rápido.', 'Sigan la pista sin salirse. No choquen con el carruaje ni entre ustedes: los saca de la pista. El barro frena y los hongos dorados los lanzan.', `Entre los dos tienen que dar ${TEAM_RACE.goal} vueltas antes de que el carruaje dé ${TEAM_RACE.cartLaps}. Si llega primero, gana el Rey.`],
};

/* ---------- Defiende la muralla: ogros hipnotizados ---------- */
// Los dos caminan por la muralla y lanzan magia sola, derecho hacia adelante. Los ogros
// chicos suben por dos caminos; los grandes, por el del medio, y solo se rompe su escudo
// si les aciertan los dos casi a la vez.
export const WALL = { w: 4.4, y: 3.2, top: -5.2, speed: 6, grip: 0.22, rate: 0.4, bolt: 11, lives: 5, time: 30, pair: 0.5, gap: 0.75, paths: [-2.6, 2.6], small: { r: 0.45, hp: 2 }, big: { r: 0.8, hp: 3 } };
export const muralla = {
  name: 'Defiende la muralla', icon: 'shield', input: 'move', time: WALL.time, team: true,
  goal: ['Juegan en equipo. Están arriba de la muralla del bosque, y ogros hipnotizados suben por los caminos hacia ella.', 'Muévanse de lado a lado: lanzan magia solos, derecho hacia adelante. Los ogros chicos caen con 2 aciertos. Los grandes tienen escudo: solo se rompe si les aciertan los dos casi a la vez.', `Cada ogro que llega golpea la muralla. Si la golpean ${WALL.lives} veces, gana el Rey. Si aguantan hasta el final, ganan los dos.`],
  create(seed) {
    const s = { ...base(seed), left: WALL.time, lives: WALL.lives, ogres: [], bolts: [], id: 0, next: 1.2, nextBig: 9 };
    s.p = [-1, 1].map((k) => ({ x: k * 1.6, vx: 0, cd: k > 0 ? WALL.rate / 2 : 0 }));
    return s;
  },
  step(s, pads) {
    s.t += DT; s.left = Math.max(0, WALL.time - s.t);
    const k = Math.min(1, s.t / (WALL.time * 0.85));
    s.p.forEach((p, i) => {
      p.vx += (clamp(pads[i].x, -1, 1) * WALL.speed - p.vx) * WALL.grip;
      p.x = clamp(p.x + p.vx * DT, -WALL.w, WALL.w);
      if ((p.cd -= DT) <= 0) { p.cd = WALL.rate; s.bolts.push({ id: s.id++, from: i, x: p.x, y: WALL.y - 0.5 }); }
    });
    // No se pueden pasar uno por encima del otro.
    const [a, b] = s.p;
    if (Math.abs(a.x - b.x) < WALL.gap) { const m = (a.x + b.x) / 2, o = a.x <= b.x ? 1 : -1; a.x = clamp(m - (o * WALL.gap) / 2, -WALL.w, WALL.w); b.x = clamp(m + (o * WALL.gap) / 2, -WALL.w, WALL.w); }
    if ((s.next -= DT) <= 0 && s.left > 3) {
      s.next = 1.5 - 0.85 * k + s.rng.next() * 0.45;
      const lane = s.rng.int(0, 1);
      s.ogres.push({ id: s.id++, kind: 'small', ...WALL.small, x0: WALL.paths[lane], x: WALL.paths[lane], y: WALL.top, v: 1.1 + 1.1 * k + s.rng.next() * 0.25, ph: s.rng.next() * 6.28, sway: 0.5 + 0.9 * k, mark: [-9, -9] });
    }
    if ((s.nextBig -= DT) <= 0 && s.left > 6) {
      s.nextBig = 6.5 - 2.5 * k + s.rng.next() * 1.5;
      s.ogres.push({ id: s.id++, kind: 'big', ...WALL.big, x0: 0, x: 0, y: WALL.top, v: 0.65 + 0.45 * k, ph: s.rng.next() * 6.28, sway: 0.3, mark: [-9, -9] });
      emit(s, 'big');
    }
    for (const o of s.ogres) {
      o.y += o.v * DT; o.x = o.x0 + Math.sin(s.t * 1.4 + o.ph) * o.sway;
      if (o.y >= WALL.y - 0.8) { o.gone = true; s.lives--; emit(s, 'smash', { x: o.x, lives: s.lives, big: o.kind === 'big' }); }
    }
    for (const b of s.bolts) {
      b.y -= WALL.bolt * DT;
      if (b.y < WALL.top - 0.5) { b.gone = true; continue; }
      const o = s.ogres.filter((o) => !o.gone && Math.abs(o.x - b.x) < o.r && b.y < o.y + 0.3 && b.y > o.y - 0.6).sort((m, n) => n.y - m.y)[0];
      if (!o) continue;
      b.gone = true;
      if (o.kind === 'big') {
        o.mark[b.from] = s.t;
        if (Math.abs(o.mark[0] - o.mark[1]) > WALL.pair) { emit(s, 'clang', { p: b.from, x: o.x, y: o.y }); continue; }
        o.mark = [-9, -9];
      }
      s.score[b.from]++;
      if (--o.hp > 0) { emit(s, o.kind === 'big' ? 'crack' : 'zap', { p: b.from, x: o.x, y: o.y, hp: o.hp }); continue; }
      o.gone = true; emit(s, 'down', { p: b.from, x: o.x, y: o.y, big: o.kind === 'big' });
    }
    s.ogres = s.ogres.filter((o) => !o.gone); s.bolts = s.bolts.filter((b) => !b.gone);
    if (s.lives <= 0) return end(s, false);
    if (s.left <= 0) end(s, true);
  },
};

/* ---------- La garra en equipo ---------- */
// Una sola garra. Primero va y viene de lado a lado y la detiene uno; después va y viene
// hacia adelante y atrás y la detiene el otro, y ahí baja.
export const GRAB = { w: 3.2, d: 1.5, goal: 7, time: 40, speed: [1.5, 3], down: 0.55, up: 0.55, carry: 0.8, reach: 0.5, n: 10, chute: [-4.3, 2.1], hint: 1.2 };
export const garraq = {
  name: 'La garra en equipo', icon: 'hand', input: 'button', time: GRAB.time, team: true,
  goal: ['Juegan en equipo con una sola máquina de garra llena de premios. La garra va y viene sola.', 'Primero se mueve de lado a lado: la izquierda la detiene sobre el premio. Después va hacia adelante y atrás: la derecha la detiene y la garra baja.', `Entre los dos tienen que sacar ${GRAB.goal} premios antes de que se acabe el tiempo. Si la garra queda corrida, el premio se puede soltar.`],
  create(seed) {
    const s = { ...base(seed), left: GRAB.time, id: 0, prizes: [], got: 0, phase: 'x', t0: 0, x: -GRAB.w, z: -GRAB.d, dx: 1, dz: 1, hold: null, slip: null, hint: 0, wait: [] };
    for (let j = 0; j < GRAB.n; j++) s.prizes.push(spot(s));
    return s;
  },
  step(s, pads) {
    s.t += DT; s.left = Math.max(0, GRAB.time - s.t); s.t0 += DT; s.hint = Math.max(0, s.hint - DT);
    const k = Math.min(1, s.t / (GRAB.time * 0.8)), speed = GRAB.speed[0] + (GRAB.speed[1] - GRAB.speed[0]) * k;
    s.wait = s.wait.filter((w) => { if ((w.t -= DT) > 0) return true; s.prizes.push(spot(s)); return false; });
    const early = (i) => { if (pads[i].a && !s.hint) { s.hint = GRAB.hint; emit(s, 'early', { p: i, phase: s.phase }); } };
    if (s.phase === 'x') {
      s.x += s.dx * speed * DT;
      if (Math.abs(s.x) > GRAB.w) { s.x = Math.sign(s.x) * GRAB.w; s.dx = -Math.sign(s.x); }
      if (pads[0].a) { s.phase = 'z'; s.t0 = 0; s.score[0]++; emit(s, 'stop', { p: 0 }); }
      else early(1);
    } else if (s.phase === 'z') {
      s.z += s.dz * speed * 0.8 * DT;
      if (Math.abs(s.z) > GRAB.d) { s.z = Math.sign(s.z) * GRAB.d; s.dz = -Math.sign(s.z); }
      if (pads[1].a) { s.phase = 'down'; s.t0 = 0; s.score[1]++; emit(s, 'stop', { p: 1 }); }
      else early(0);
    } else if (s.phase === 'down' && s.t0 >= GRAB.down) {
      s.phase = 'up'; s.t0 = 0;
      const q = s.prizes.map((q) => [q, Math.hypot(q.x - s.x, q.z - s.z)]).filter(([, d]) => d < GRAB.reach).sort((a, b) => a[1] - b[1])[0];
      if (!q) emit(s, 'miss', { x: s.x, z: s.z });
      else { s.hold = q[0]; s.slip = s.rng.chance(Math.min(0.85, PRIZES[q[0].kind].slip * 0.6 + (q[1] / GRAB.reach) * 0.55)) ? 0.15 + s.rng.next() * 0.9 : null; emit(s, 'grab', { kind: s.hold.kind, x: s.x, z: s.z }); }
    } else if (s.phase === 'up' || s.phase === 'carry') {
      if (s.hold && s.slip != null && (s.slip -= DT) <= 0) {
        const q = s.hold; s.hold = null; s.slip = null;
        q.x = clamp(s.x, -GRAB.w, GRAB.w); q.z = clamp(s.z, -GRAB.d, GRAB.d);
        emit(s, 'slip', { kind: q.kind, x: q.x, z: q.z });
      }
      if (s.phase === 'up' && s.t0 >= GRAB.up) {
        if (!s.hold) { s.phase = 'x'; s.t0 = 0; }
        else { s.phase = 'carry'; s.t0 = 0; s.from = [s.x, s.z]; }
      } else if (s.phase === 'carry') {
        const f = Math.min(1, s.t0 / GRAB.carry);
        s.x = s.from[0] + (GRAB.chute[0] - s.from[0]) * f; s.z = s.from[1] + (GRAB.chute[1] - s.from[1]) * f;
        if (f >= 1) {
          if (s.hold) { s.got++; s.prizes = s.prizes.filter((q) => q !== s.hold); s.wait.push({ t: CLAW.again }); emit(s, 'win', { kind: s.hold.kind, n: s.got }); }
          s.hold = null; s.phase = 'x'; s.t0 = 0; s.x = -GRAB.w; s.z = -GRAB.d; s.dx = 1; s.dz = 1;
        }
      }
    }
    if (s.got >= GRAB.goal) return end(s, true);
    if (s.left <= 0) end(s, false);
  },
};
function spot(s) {
  const q = pilePrize(s);
  q.x = (s.rng.next() * 2 - 1) * GRAB.w * 0.95; q.z = (s.rng.next() * 2 - 1) * GRAB.d * 0.9;
  return q;
}

/* ---------- La mina: vagoneta y pico ---------- */
// La vagoneta avanza sola por tres rieles. Quien maneja cambia de riel para esquivar las
// rocas; quien pica golpea las piedras brillantes de las paredes justo cuando pasan.
// A mitad de camino cambian de papel.
export const MINE = { lanes: [-1.3, 0, 1.3], goal: 14, lives: 3, time: 36, speed: [3.2, 6], window: 0.36, far: 11, cd: 0.25, inv: 1, swap: 1.6 };
export const mina = {
  name: 'La mina', icon: 'gem', input: 'dirs', time: MINE.time, team: true,
  goal: ['Juegan en equipo en una vagoneta que avanza sola por una mina con tres rieles. En las paredes hay piedras brillantes.', 'Quien maneja: con ← y → cambia de riel para esquivar las rocas. Quien pica: pulsa ← o → cuando una piedra brillante pase justo al lado, por ese lado. A la mitad cambian de papel.', `Entre los dos tienen que juntar ${MINE.goal} piedras brillantes. Si chocan ${MINE.lives} veces con una roca, o se acaba el tiempo, gana el Rey.`],
  create(seed) {
    const s = { ...base(seed), left: MINE.time, lives: MINE.lives, got: 0, lane: 1, drive: 0, items: [], id: 0, dist: 0, rock: 6, gem: 3, cd: 0, inv: 0, pause: 0, swapped: false };
    return s;
  },
  step(s, pads) {
    s.t += DT; s.left = Math.max(0, MINE.time - s.t);
    if (s.pause > 0) { s.pause -= DT; return; }
    const k = Math.min(1, s.t / (MINE.time * 0.8)), v = MINE.speed[0] + (MINE.speed[1] - MINE.speed[0]) * k;
    s.cd = Math.max(0, s.cd - DT); s.inv = Math.max(0, s.inv - DT);
    const dr = pads[s.drive].d, pk = pads[1 - s.drive].d;
    if (dr === 1 || dr === 3) { const lane = clamp(s.lane + (dr === 1 ? 1 : -1), 0, 2); if (lane !== s.lane) { s.lane = lane; emit(s, 'steer', { p: s.drive, lane }); } }
    if ((pk === 1 || pk === 3) && !s.cd) {
      s.cd = MINE.cd;
      const side = pk === 1 ? 1 : 0, g = s.items.find((q) => q.kind === 'gem' && !q.gone && q.side === side && Math.abs(q.z) < MINE.window);
      if (g) { g.gone = true; s.got++; s.score[1 - s.drive]++; emit(s, 'pick', { p: 1 - s.drive, side, n: s.got }); }
      else emit(s, 'whiff', { p: 1 - s.drive, side });
    }
    s.dist += v * DT;
    // Rocas: nunca tapan los tres rieles, y hay tiempo para cambiar.
    if (s.dist >= s.rock) {
      s.rock = s.dist + 3.8 - 1.2 * k + s.rng.next() * 1.4;
      const n = k > 0.25 && s.rng.chance(0.55) ? 2 : 1, lanes = s.rng.shuffle([0, 1, 2]).slice(0, n);
      for (const lane of lanes) s.items.push({ id: s.id++, kind: 'rock', lane, z: MINE.far });
    }
    if (s.dist >= s.gem) { s.gem = s.dist + 2 + s.rng.next() * 1.4; s.items.push({ id: s.id++, kind: 'gem', side: s.rng.int(0, 1), z: MINE.far }); }
    for (const q of s.items) {
      const z0 = q.z; q.z -= v * DT;
      if (q.kind === 'rock' && z0 > 0 && q.z <= 0 && q.lane === s.lane && !s.inv) { s.lives--; s.inv = MINE.inv; q.gone = true; emit(s, 'crash', { lane: q.lane, lives: s.lives }); }
      if (q.z < -2) q.gone = true;
    }
    s.items = s.items.filter((q) => !q.gone);
    if (s.got >= MINE.goal) return end(s, true);
    if (s.lives <= 0 || s.left <= 0) return end(s, false);
    if (!s.swapped && s.got >= MINE.goal / 2) { s.swapped = true; s.drive = 1 - s.drive; s.pause = MINE.swap; s.items = s.items.filter((q) => q.z > 4); emit(s, 'swap', { drive: s.drive }); }
  },
};

/* ---------- La poción ---------- */
// La olla tiene que hervir. Quien revuelve la calienta con cada toque (si se pasa, se
// derrama); quien cocina echa los ingredientes de la receta en orden. Con cada poción
// lista cambian de papel.
export const POT = { goal: 3, len: 5, lives: 3, time: 36, warm: 0.55, decay: [0.12, 0.24], stir: 0.11, cd: 0.3, start: 0.6, spill: 1, cool: 0.3 };
export const INGREDIENTS = ['Hongo', 'Pluma', 'Cristal', 'Flor']; // ↑ → ↓ ←
export const pocion = {
  name: 'La poción', icon: 'flame', input: 'dirs', time: POT.time, team: true,
  goal: ['Juegan en equipo frente a una olla mágica. Arriba se ve la receta: cinco ingredientes, cada uno con su flecha.', `Quien revuelve: pulsa cualquier flecha para calentar la olla, sin pasarse o se derrama. Cada ingrediente la enfría. Quien cocina: cuando la olla hierva, pulsa la flecha del ingrediente que sigue (↑ hongo, → pluma, ↓ cristal, ← flor). Con cada poción cambian de papel.`, `Tienen que preparar ${POT.goal} pociones. Un ingrediente equivocado o un derrame gasta 1 de sus ${POT.lives} vidas. Si se acaban o se acaba el tiempo, gana el Rey.`],
  create(seed) {
    const s = { ...base(seed), left: POT.time, lives: POT.lives, heat: POT.start, n: 0, pot: 0, cook: 0, cd: [0, 0] };
    s.recipes = Array.from({ length: POT.goal }, () => Array.from({ length: POT.len }, () => s.rng.int(0, 3)));
    return s;
  },
  step(s, pads) {
    s.t += DT; s.left = Math.max(0, POT.time - s.t);
    const k = Math.min(1, s.t / (POT.time * 0.8));
    s.heat = Math.max(0, s.heat - (POT.decay[0] + (POT.decay[1] - POT.decay[0]) * k) * DT);
    s.cd = s.cd.map((c) => Math.max(0, c - DT));
    const st = 1 - s.cook, a = pads[st].d, b = pads[s.cook].d;
    if (a != null) {
      s.heat += POT.stir * (1 - 0.25 * k);
      if (s.heat > POT.spill) { s.lives--; s.heat = POT.start; emit(s, 'spill', { p: st, lives: s.lives }); }
      else emit(s, 'stir', { p: st, heat: s.heat });
    }
    if (b != null && !s.cd[s.cook]) {
      s.cd[s.cook] = POT.cd;
      const want = s.recipes[s.pot][s.n];
      if (s.heat < POT.warm) emit(s, 'cold', { p: s.cook, d: b });
      else if (b !== want) { s.lives--; emit(s, 'wrong', { p: s.cook, d: b, want, lives: s.lives }); }
      else {
        s.n++; s.score[s.cook]++; s.score[st]++; s.heat = Math.max(0, s.heat - POT.cool);
        emit(s, 'add', { p: s.cook, d: b, n: s.n });
        if (s.n >= POT.len) { s.pot++; s.n = 0; emit(s, 'brew', { n: s.pot }); if (s.pot < POT.goal) s.cook = 1 - s.cook; }
      }
    }
    if (s.pot >= POT.goal) return end(s, true);
    if (s.lives <= 0 || s.left <= 0) end(s, false);
  },
};

/* ---------- El globo ---------- */
// El globo sube solo. La izquierda tira de su cuerda para ir a la izquierda, la derecha
// para ir a la derecha, y si tiran los dos a la vez, el fuego crece y sube más rápido.
export const SKY = { w: 3.6, goal: 100, time: 34, lives: 4, rise: 2.6, boost: 6.2, side: 2.9, grip: 0.08, inv: 1.3, r: 0.62, ahead: 12 };
export const globo = {
  name: 'El globo', icon: 'cloud', input: 'hold', time: SKY.time, team: true,
  goal: ['Juegan en equipo en un globo que sube entre ramas y cuervos. Cada quien sostiene una cuerda: la izquierda y la derecha.', 'Mantén pulsado para tirar de tu cuerda: el globo se va hacia tu lado. Si tiran los dos a la vez, el fuego crece y el globo sube más rápido.', `Lleguen a la cima (${SKY.goal} metros) antes de que se acabe el tiempo. Cada choque gasta 1 de sus ${SKY.lives} vidas. Si se acaban, gana el Rey.`],
  create(seed) {
    const s = { ...base(seed), left: SKY.time, lives: SKY.lives, x: 0, vx: 0, alt: 0, inv: 0, things: [], id: 0, next: 6, fire: false, was: [false, false] };
    return s;
  },
  step(s, pads) {
    s.t += DT; s.left = Math.max(0, SKY.time - s.t);
    const k = Math.min(1, s.alt / SKY.goal), L = pads[0].h, R = pads[1].h;
    s.fire = L && R;
    const want = s.fire ? 0 : L ? -SKY.side : R ? SKY.side : 0;
    s.vx += (want - s.vx) * SKY.grip;
    s.x = clamp(s.x + s.vx * DT, -SKY.w + SKY.r, SKY.w - SKY.r);
    s.alt += (s.fire ? SKY.boost : SKY.rise) * DT;
    [L, R].forEach((h, i) => { if (h && !s.was[i]) s.score[i]++; s.was[i] = h; });
    s.inv = Math.max(0, s.inv - DT);
    while (s.next < s.alt + SKY.ahead && s.next < SKY.goal - 4) {
      const kk = s.next / SKY.goal, kind = s.rng.chance(0.35 + 0.15 * kk) ? 'crow' : kk > 0.35 && s.rng.chance(0.3) ? 'pair' : 'branch';
      if (kind === 'crow') s.things.push({ id: s.id++, kind, alt: s.next, x: (s.rng.next() * 2 - 1) * SKY.w, v: (s.rng.chance(0.5) ? 1 : -1) * (1.2 + 1.4 * kk) });
      else if (kind === 'pair') { const gap = 2.4 - 0.6 * kk, c = (s.rng.next() * 2 - 1) * (SKY.w - gap / 2 - 0.4); s.things.push({ id: s.id++, kind: 'branch', side: 0, alt: s.next, len: c - gap / 2 + SKY.w }, { id: s.id++, kind: 'branch', side: 1, alt: s.next, len: SKY.w - (c + gap / 2) }); }
      else s.things.push({ id: s.id++, kind, side: s.rng.int(0, 1), alt: s.next, len: 2.4 + s.rng.next() * 1.6 * (0.6 + kk * 0.6) });
      s.next += 5.6 - 2 * kk + s.rng.next() * 1.4;
    }
    for (const q of s.things) {
      if (q.kind === 'crow') { q.x += q.v * DT; if (Math.abs(q.x) > SKY.w) { q.x = Math.sign(q.x) * SKY.w; q.v = -q.v; } }
      if (q.alt < s.alt - 4) q.gone = true;
      if (s.inv || q.hit) continue;
      const dy = Math.abs(q.alt - s.alt);
      const hit = q.kind === 'crow' ? Math.hypot(q.x - s.x, q.alt - s.alt) < SKY.r + 0.3 : dy < SKY.r * 0.8 && (q.side === 0 ? s.x - SKY.r < -SKY.w + q.len : s.x + SKY.r > SKY.w - q.len);
      if (hit) { q.hit = true; s.lives--; s.inv = SKY.inv; s.vx = (q.kind === 'crow' ? Math.sign(s.x - q.x) || 1 : q.side ? -1 : 1) * 2.5; emit(s, 'bump', { kind: q.kind, lives: s.lives, x: s.x }); }
    }
    s.things = s.things.filter((q) => !q.gone);
    if (s.alt >= SKY.goal) return end(s, true);
    if (s.lives <= 0 || s.left <= 0) end(s, false);
  },
};
