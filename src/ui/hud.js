import { icon } from './icons.js';
import { CARDS, FAMILIES } from '../core/cards.js';
import { sfx, isMuted, setMuted } from '../audio.js';

const el = (cls, html = '', tag = 'div') => {
  const e = document.createElement(tag);
  e.className = cls;
  e.innerHTML = html;
  return e;
};
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const KIND = { gem: ['gem', '#1f9d63'], star: ['star', '#d8981a'], trap: ['trap', '#b3204f'], portal: ['portal', '#7c3fd0'], shrine: ['shrine', '#139a94'], steal: ['steal', '#8d2bb8'], castle: ['castle', '#c42c6d'], calm: ['calm', '#3f9a4b'], shield: ['shield', '#2b7fd0'] };
const AV = ['crown', 'hat'];
const cardHtml = (id, big) => {
  const c = CARDS[id], f = FAMILIES[c.family];
  return big
    ? `<span class="fam">${f.name}</span><span class="big">${icon(c.icon)}</span><span class="t">${c.name}</span><span class="d">${c.text}</span>`
    : `<span class="t">${icon(c.icon)}${c.name}</span><span class="d">${c.text}</span>`;
};

export class Hud {
  constructor(root) {
    this.root = root;
    this.on = {};
    this.game = el('game hidden');
    this.root.append(this.game);
    this.keys();
  }

  build(g) {
    this.g = g;
    this.shown = g.players.map((p) => p.gems);
    this.stars = g.players.map((p) => p.stars);
    this.game.innerHTML = '';
    this.pl = g.players.map((p) => {
      const e = el(`pl p${p.id}`, `<div class="av">${icon(AV[p.id])}</div><div class="nm">${esc(p.name)}</div><div class="row"><span class="gm">${icon('gem')}<b></b></span><span class="st" title="Con 3 estrellas eliges una oportunidad"></span><span class="hn"></span></div><div class="fx"></div>`);
      this.game.append(e);
      return e;
    });
    this.track = el('track', `<div class="bar"></div><i class="m0">${icon('crown')}</i><i class="m1">${icon('hat')}</i><span class="cs">${icon('castle')}</span>`);
    this.final = el('final hidden');
    this.act = el('act');
    this.tools = el('tools', `<button data-a="map" title="Ver el mapa (M)" aria-label="Ver el mapa">${icon('map')}</button><button data-a="sound" title="Sonido" aria-label="Sonido">${icon(isMuted() ? 'mute' : 'sound')}</button><button data-a="help" title="Cómo se juega (H)" aria-label="Cómo se juega">${icon('help')}</button>`);
    this.tools.onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      sfx('click');
      b.blur();
      if (b.dataset.a === 'sound') { setMuted(!isMuted()); b.innerHTML = icon(isMuted() ? 'mute' : 'sound'); }
      if (b.dataset.a === 'map') this.on.map?.();
      if (b.dataset.a === 'help') this.help();
    };
    this.game.append(this.track, this.final, this.act, this.tools);
    this.game.classList.remove('hidden');
    this.refresh();
  }

  refresh() {
    const g = this.g;
    g.players.forEach((p, i) => {
      const e = this.pl[i];
      e.querySelector('.gm b').textContent = this.shown[i];
      e.querySelector('.st').innerHTML = [0, 1, 2].map((k) => `<span class="${k < this.stars[i] ? 'f' : ''}">${icon('star')}</span>`).join('');
      e.querySelector('.hn').textContent = p.hand.length === 1 ? '1 carta' : `${p.hand.length} cartas`;
      const f = p.fx, L = [];
      if (f.shield) L.push(['good', 'Escudo']);
      if (f.golden) L.push(['good', `Doble gema ×${f.golden}`]);
      if (f.magnet) L.push(['good', 'Imán']);
      if (f.plus) L.push(['good', `+${f.plus}`]);
      if (f.double) L.push(['good', 'Doble dado']);
      if (f.fixed) L.push(['good', `Saldrá ${f.fixed}`]);
      if (f.again) L.push(['good', 'Turno extra']);
      if (f.worst) L.push(['bad', 'Mala suerte']);
      if (f.minus) L.push(['bad', `−${f.minus} al dado`]);
      if (f.half) L.push(['bad', 'Enredo: mitad']);
      e.querySelector('.fx').innerHTML = L.map(([c, t]) => `<span class="${c}">${t}</span>`).join('');
    });
  }

  place(i, tileId) {
    const g = this.g, f = 1 - Math.min(1, g.tile(tileId).dist / g.board.length);
    this.track.querySelector('.m' + i).style.left = `calc(15px + (100% - 60px) * ${f})`;
  }

  gems(i, n) {
    this.shown[i] += n;
    this.refresh();
    const b = this.pl[i].querySelector('.gm b');
    b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump');
  }

  star(i, n) { this.stars[i] += n; this.refresh(); }

  setTurn(i, left) {
    this.pl.forEach((e, k) => e.classList.toggle('on', k === i));
    this.act.className = `act p${i}`;
    this.final.classList.toggle('hidden', left == null);
    if (left != null) this.final.textContent = left === 1 ? '¡Último turno!' : `Quedan ${left} turnos`;
  }

  async banner(i, text, small) {
    const b = el(`banner p${i}`, `${esc(text)}${small ? `<small>${esc(small)}</small>` : ''}`);
    this.game.append(b);
    b.onanimationend = () => b.remove();
    setTimeout(() => b.remove(), 1600);
  }

  showRoll(p, playable) {
    this.act.innerHTML = '';
    if (p.hand.length) {
      const h = el('hand');
      p.hand.forEach((id, i) => {
        const b = el('card', cardHtml(id), 'button');
        b.style.setProperty('--f', FAMILIES[CARDS[id].family].color);
        b.title = CARDS[id].text;
        b.disabled = !playable;
        b.onclick = () => this.on.card?.(i);
        h.append(b);
      });
      this.act.append(h);
    }
    const r = el('roll', `${icon('dice')}Tirar el dado`, 'button');
    r.onclick = () => this.on.roll?.();
    this.act.append(r);
  }

  showHint(html) { this.act.innerHTML = `<div class="hint">${html}</div>`; }
  clearAct() { this.act.innerHTML = ''; }

  total(n, mods) {
    this.game.querySelector('.total')?.remove();
    if (n == null) return;
    this.game.append(el('total', `<b>${n}</b>${mods.map((m) => `<span>${m}</span>`).join('')}`));
  }

  float(pos, text, cls) {
    const f = el(`float ${cls}`, text);
    f.style.left = pos.x + 'px';
    f.style.top = pos.y + 'px';
    this.game.append(f);
    setTimeout(() => f.remove(), 1500);
  }

  // Pergamino: se cierra solo, o antes con clic, toque o espacio.
  message(kind, title, text, quick) {
    const [ic, color] = KIND[kind] || KIND.calm;
    const s = el('scroll', `${icon(ic)}<h3>${esc(title)}</h3><p>${esc(text)}</p>`);
    s.style.setProperty('--k', color);
    this.game.append(s);
    return new Promise((res) => {
      const t0 = performance.now();
      const done = () => { clearTimeout(tm); removeEventListener('pointerdown', skip); this.skip = null; s.remove(); res(); };
      const skip = () => { if (performance.now() - t0 > 350) done(); };
      const tm = setTimeout(done, this.fast ? 1 : quick ? 1500 : 1500 + text.length * 22);
      addEventListener('pointerdown', skip);
      this.skip = skip;
    });
  }

  modal(inner, cls = '') {
    const m = el('modal ' + cls);
    m.append(inner);
    this.root.append(m);
    return m;
  }

  offer(player, cards, why) {
    return new Promise((res) => {
      const s = el('sheet', `<h2>${why === 'chest' ? '¡Cofre de oportunidades!' : '¡Tres estrellas reunidas!'}</h2><p>${esc(player.name)}, elige una carta para tu mano.</p><div class="offer"></div>`);
      const m = this.modal(s);
      this.pickKey = (i) => { if (cards[i]) { this.pickKey = null; m.remove(); sfx('card'); res(i); } };
      cards.forEach((id, i) => {
        const b = el('card', cardHtml(id, true), 'button');
        b.style.setProperty('--f', FAMILIES[CARDS[id].family].color);
        b.onclick = () => this.pickKey?.(i);
        s.querySelector('.offer').append(b);
      });
    });
  }

  number() {
    return new Promise((res) => {
      const s = el('sheet', `<h2>Dado encantado</h2><p>¿Qué número quieres que salga?</p><div class="nums">${[1, 2, 3, 4, 5, 6].map((n) => `<button>${n}</button>`).join('')}</div><button class="link">Cancelar</button>`);
      const m = this.modal(s);
      const end = (n) => { this.pickKey = null; m.remove(); res(n); };
      this.pickKey = (i) => i < 6 && end(i + 1);
      s.querySelectorAll('.nums button').forEach((b, i) => (b.onclick = () => end(i + 1)));
      s.querySelector('.link').onclick = () => end(null);
    });
  }

  help() {
    if (this.helpOpen) return;
    this.helpOpen = true;
    const li = (i, c, t) => `<li><span style="color:${c}">${icon(i)}</span><span>${t}</span></li>`;
    const s = el('help', `<h2>Cómo se juega</h2>
      <p>Tira el dado y elige a qué casilla iluminada ir. Llegar primero al castillo da <b>8 gemas</b>; después, tu rival tiene <b>3 turnos más</b>. <b>Gana quien tenga más gemas.</b></p>
      <ul>
      ${li('gem', '#1f9d63', '<b>Gemas.</b> Los rodeos suelen tener más.')}
      ${li('chest', '#c47a1e', '<b>Cofre.</b> Eliges 1 de 3 cartas.')}
      ${li('trap', '#b3204f', '<b>Trampa.</b> Abunda en los atajos.')}
      ${li('portal', '#7c3fd0', '<b>Portal.</b> Adelante o atrás.')}
      ${li('shrine', '#139a94', '<b>Santuario.</b> Ayuda a los dos.')}
      ${li('calm', '#3f9a4b', '<b>Descanso.</b> Ganas una estrella.')}
      ${li('star', '#d8981a', '<b>3 estrellas</b> dan una carta. Ganas una por turno.')}
      ${li('steal', '#8d2bb8', '<b>Encuentro.</b> Cae sobre tu rival y quítale 2 gemas.')}
      </ul>
      <p><b>Pistas en la niebla:</b> brillo dorado = algo bueno; humo oscuro = peligro; remolino = portal. A veces engañan.</p>
      <p><b>Controles:</b> espacio tira, 1 a 4 usan cartas, flechas y Enter eligen casilla, M muestra el mapa. Arrastra para mover la cámara, usa el botón derecho para girarla y la rueda para acercar. En móvil, usa uno o dos dedos.</p>
      <button class="cta close">¡Entendido!</button>`);
    const m = this.modal(s);
    this.closeHelp = () => { this.helpOpen = false; m.remove(); };
    s.querySelector('.close').onclick = this.closeHelp;
    m.onclick = (e) => e.target === m && this.closeHelp();
  }

  title(defaults) {
    return new Promise((res) => {
      const s = el('title', `<h1>La Corona<small>del Bosque Errante</small></h1>
        <div class="setup">
          <div class="names"><label>${icon('crown')}<input maxlength="12" aria-label="Nombre de la princesa" value="${esc(defaults.names[0])}"></label><label>${icon('hat')}<input maxlength="12" aria-label="Nombre del mago" value="${esc(defaults.names[1])}"></label></div>
          <div class="line"><div class="seg" role="group" aria-label="Duración"><button data-l="20">Breve</button><button data-l="28">Normal</button><button data-l="38">Larga</button></div><button class="link" data-a="new">Otro reino</button><button class="link" data-a="help">Cómo se juega</button></div>
          <button class="cta">Comenzar la aventura</button>
        </div>`);
      this.root.append(s);
      let len = defaults.len;
      const seg = [...s.querySelectorAll('.seg button')];
      const mark = () => seg.forEach((b) => b.setAttribute('aria-pressed', +b.dataset.l === len));
      mark();
      seg.forEach((b) => (b.onclick = () => { len = +b.dataset.l; mark(); sfx('click'); this.on.preview?.(len, false); }));
      s.querySelector('[data-a=new]').onclick = () => { sfx('flip'); this.on.preview?.(len, true); };
      s.querySelector('[data-a=help]').onclick = () => this.help();
      s.querySelector('.cta').onclick = () => {
        const names = [...s.querySelectorAll('input')].map((i, k) => i.value.trim() || ['Princesa', 'Mago'][k]);
        s.remove();
        res({ names, len });
      };
    });
  }

  over(g, tie) {
    const w = g.players[g.winner];
    return new Promise((res) => {
      const s = el('sheet', `<h2>¡${esc(w.name)} gana la corona!</h2><p>${tie ? 'Empate en gemas: decide quién llegó primero.' : w.id === g.first ? 'Llegó primero y con los bolsillos llenos.' : 'Llegó después, pero con más tesoro.'}</p>
        <div class="score">${g.players.map((p) => `<div class="p${p.id}">${esc(p.name)}<b>${icon('gem')}${p.gems}</b></div>`).join('')}</div>
        <div class="line"><button class="cta" data-a="again">Revancha</button><button class="link" data-a="home">Volver al inicio</button></div>`);
      const m = this.modal(s, 'over');
      s.onclick = (e) => { const a = e.target.closest('button')?.dataset.a; if (a) { m.remove(); res(a); } };
    });
  }

  keys() {
    addEventListener('keydown', (e) => {
      if (e.target.tagName === 'INPUT' || e.repeat) return;
      const n = +e.key;
      if (this.helpOpen) { if (['Escape', 'Enter', ' ', 'h', 'H'].includes(e.key)) { e.preventDefault(); this.closeHelp(); } return; }
      if (this.pickKey) { if (n >= 1) this.pickKey(n - 1); return; }
      if (this.skip && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); this.skip(); return; }
      if (e.target.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
      if (e.key === ' ') { e.preventDefault(); this.on.roll?.(); }
      else if (n >= 1 && n <= 4) this.on.card?.(n - 1);
      else if (e.key === 'm' || e.key === 'M') this.on.map?.();
      else if (e.key === 'h' || e.key === 'H') this.help();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Tab') { if (this.on.cycle?.(1)) e.preventDefault(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { if (this.on.cycle?.(-1)) e.preventDefault(); }
      else if (e.key === 'Enter') this.on.confirm?.();
    });
  }
}
