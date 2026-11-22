// Sonido sintetizado en el momento: sin archivos de audio.
let ctx, master, musicBus, timer = null;
let muted = false;
try { muted = localStorage.getItem('corona-mudo') === '1'; } catch {}

export const isMuted = () => muted;
export function setMuted(m) {
  muted = m;
  try { localStorage.setItem('corona-mudo', m ? '1' : '0'); } catch {}
  if (master) master.gain.setTargetAtTime(m ? 0 : 0.5, ctx.currentTime, 0.05);
}
export function unlock() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    const comp = ctx.createDynamicsCompressor();
    master.connect(comp).connect(ctx.destination);
    musicBus = ctx.createGain();
    musicBus.gain.value = 0.3;
    const d = ctx.createDelay(1), fb = ctx.createGain(), wet = ctx.createGain();
    d.delayTime.value = 0.36; fb.gain.value = 0.36; wet.gain.value = 0.35;
    musicBus.connect(master); musicBus.connect(d); d.connect(fb).connect(d); d.connect(wet).connect(master);
    startMusic();
  }
  if (ctx.state === 'suspended') ctx.resume();
}

const hz = (n) => 440 * 2 ** ((n - 69) / 12);
function note(freq, t, dur, { type = 'triangle', vol = 0.2, to = null, bus = master, attack = 0.006 } = {}) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (to) o.frequency.exponentialRampToValueAtTime(to, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(bus);
  o.start(t); o.stop(t + dur + 0.05);
}
function noise(t, dur, freq, vol, q = 1) {
  const n = Math.floor(ctx.sampleRate * dur), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
  for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n) ** 2;
  const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
  s.buffer = b; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
  s.connect(f).connect(g).connect(master); s.start(t);
}

const FX = {
  click: (t) => note(700, t, 0.07, { vol: 0.1 }),
  hover: (t) => note(980, t, 0.04, { vol: 0.035, type: 'sine' }),
  die: (t) => { noise(t, 0.07, 1700, 0.6, 2); note(190, t, 0.06, { type: 'square', vol: 0.08 }); },
  hop: (t, n = 0) => { note(hz(67 + [0, 2, 4, 7, 9, 12][n % 6]), t, 0.13, { vol: 0.13 }); noise(t + 0.02, 0.05, 500, 0.2); },
  flip: (t) => noise(t, 0.2, 2400, 0.16, 0.8),
  gem: (t) => [84, 88, 91, 96].forEach((n, i) => note(hz(n), t + i * 0.055, 0.35, { vol: 0.11, type: 'sine' })),
  lose: (t) => [67, 63, 60].forEach((n, i) => note(hz(n), t + i * 0.1, 0.25, { vol: 0.13, type: 'sawtooth', to: hz(n - 2) })),
  star: (t) => [91, 98].forEach((n, i) => note(hz(n), t + i * 0.08, 0.5, { vol: 0.08, type: 'sine' })),
  trap: (t) => { note(150, t, 0.5, { type: 'sawtooth', vol: 0.2, to: 46 }); noise(t, 0.4, 300, 0.7); },
  portal: (t) => { note(180, t, 0.9, { type: 'sine', vol: 0.22, to: 1300 }); note(90, t, 0.9, { vol: 0.15, to: 640 }); },
  chest: (t) => [60, 64, 67, 72, 76, 79].forEach((n, i) => note(hz(n), t + i * 0.06, 0.5, { vol: 0.1 })),
  card: (t) => { noise(t, 0.16, 3200, 0.25); [72, 79, 84].forEach((n, i) => note(hz(n), t + 0.04 + i * 0.05, 0.4, { vol: 0.1 })); },
  curse: (t) => [58, 57, 52].forEach((n, i) => note(hz(n), t + i * 0.12, 0.4, { vol: 0.14, type: 'sawtooth' })),
  shield: (t) => [79, 86, 91].forEach((n) => note(hz(n), t, 0.8, { vol: 0.08, type: 'sine' })),
  turn: (t) => [67, 72].forEach((n, i) => note(hz(n), t + i * 0.1, 0.4, { vol: 0.12 })),
  win: (t) => [60, 64, 67, 72, 67, 72, 76, 79, 84].forEach((n, i) => { note(hz(n), t + i * 0.13, 0.7, { vol: 0.15 }); note(hz(n - 12), t + i * 0.13, 0.5, { vol: 0.09, type: 'sine' }); }),
};
export function sfx(name, arg) {
  if (!ctx || muted) return;
  FX[name]?.(ctx.currentTime + 0.005, arg);
}

// Arpa tranquila que improvisa sobre cuatro acordes.
function startMusic() {
  const chords = [[50, 57, 62, 66, 69], [47, 54, 59, 62, 66], [43, 50, 55, 59, 62], [45, 52, 57, 61, 64]];
  let step = 0, next = ctx.currentTime + 0.3;
  timer = setInterval(() => {
    if (ctx.state !== 'running') { next = ctx.currentTime + 0.1; return; }
    while (next < ctx.currentTime + 0.5) {
      const ch = chords[Math.floor(step / 16) % 4], s = step % 16;
      if (s === 0) note(hz(ch[0] - 12), next, 3.2, { vol: 0.2, type: 'sine', bus: musicBus, attack: 0.05 });
      if (s % 2 === 0 || Math.random() < 0.22) note(hz(ch[[0, 2, 1, 3, 4, 3, 2, 1][(s >> 1) % 8]] + (Math.random() < 0.14 ? 12 : 0)), next, 1.3, { vol: 0.13, bus: musicBus });
      if (Math.random() < 0.11) note(hz(ch[2 + Math.floor(Math.random() * 3)] + 12), next, 1.8, { vol: 0.07, type: 'sine', bus: musicBus, attack: 0.03 });
      next += 0.23;
      step++;
    }
  }, 120);
}
