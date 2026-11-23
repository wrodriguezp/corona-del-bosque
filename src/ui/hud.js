import { icon } from './icons.js';
import { CARDS, FAMILIES, PRICES, HAND_LIMIT } from '../core/cards.js';
import { CAVE } from '../core/game.js';
import { DAY, EVENTS, NIGHT } from '../core/world.js';
import { sfx, isMuted, setMuted } from '../audio.js';

const el = (cls, html = '', tag = 'div') => {
  const e = document.createElement(tag);
  e.className = cls;
  e.innerHTML = html;
  return e;
};
export const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const KIND = { fairy: ['star', '#d6468f'], gem: ['gem', '#1f9d63'], star: ['star', '#d8981a'], trap: ['trap', '#b3204f'], portal: ['portal', '#7c3fd0'], shrine: ['shrine', '#139a94'], steal: ['steal', '#8d2bb8'], castle: ['castle', '#c42c6d'], calm: ['calm', '#3f9a4b'], shield: ['shield', '#2b7fd0'], duel: ['duel', '#d2452f'], eagle: ['eagle', '#2b7fd0'], worm: ['worm', '#b3466c'], flame: ['flame', '#e0651f'], crown: ['crown', '#c98a12'], coin: ['coin', '#b5811a'], cloud: ['cloud', '#5d5a8f'], hand: ['hand', '#a8552f'], bag: ['bag', '#8d5a2b'], swap: ['swap', '#7c3fd0'], again: ['again', '#1f9d63'], help: ['help', '#7c3fd0'], sound: ['sound', '#c42c6d'], moon: ['moon', '#4a4fb0'], omen: ['omen', '#6a2fa0'], snow: ['snow', '#2b86c0'], tree: ['tree', '#2f8f5b'] };
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
    this.aid = [...g.aid];
    this.game.innerHTML = '';
    this.pl = g.players.map((p) => {
      const e = el(`pl p${p.id}`, `<div class="av">${icon(AV[p.id])}</div><div class="nm">${esc(p.name)}</div><div class="row"><span class="gm">${icon('gem')}<b></b></span><span class="st" title="Con 3 estrellas eliges una oportunidad"></span><span class="hn"></span></div><div class="fx"></div>`);
      this.game.append(e);
      return e;
    });
    this.track = el('track', `<div class="bar"></div><i class="m0">${icon('crown')}</i><i class="m1">${icon('hat')}</i><span class="cs">${icon('castle')}</span>`);
    this.under = el('under');
    this.sky = el('sky');
    this.omen = el('sky omen hidden');
    this.final = el('final hidden');
    this.under.append(this.sky, this.omen, this.final);
    this.time(g.turns % DAY.len, g.night);
    this.setOmen(g.omen);
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
    this.game.append(this.track, this.under, this.act, this.tools);
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
      if (this.aid[i]) L.push(['fairy', this.aid[i] === 2 ? 'Hada madrina ×2' : 'Hada madrina']);
      if (f.shield) L.push(['good', 'Escudo']);
      if (f.golden) L.push(['good', f.golden === 1 ? 'Gemas dobles: 1 casilla' : `Gemas dobles: ${f.golden} casillas`]);
      if (f.magnet) L.push(['good', 'Imán: +1 por paso']);
      if (f.map) L.push(['good', 'Mapa: +5 al caer']);
      if (f.die) L.push(['good', `Dado ${f.die}`]);
      if (f.locked) L.push(['bad', 'Sin cartas ni compras']);
      if (f.plus) L.push(['good', `Tirada: +${f.plus}`]);
      if (f.double) L.push(['good', 'Doble dado']);
      if (f.fixed) L.push(['good', `Saldrá ${f.fixed}`]);
      if (f.again) L.push(['good', 'Turno extra']);
      if (f.worst) L.push(['bad', 'Tirada: cuenta el menor']);
      if (f.minus) L.push(['bad', `Tirada: −${f.minus}`]);
      if (f.half) L.push(['bad', 'Tirada: la mitad']);
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

  // Indicadores de día o noche y del próximo evento del mundo.
  time(clock, night) {
    const left = (night ? DAY.len : DAY.night) - clock;
    this.sky.className = `sky ${night ? 'n' : ''}`;
    this.sky.innerHTML = `${icon(night ? 'moon' : 'sun')}<span>${night ? 'Amanece' : 'Anochece'} en ${left} ${left === 1 ? 'turno' : 'turnos'}</span>`;
    this.sky.title = night ? `De noche: +${NIGHT.gem} gemas en casillas de gemas y las trampas quitan ${NIGHT.trap} más` : 'De día: todo tranquilo';
  }
  setOmen(o) {
    this.omen.classList.toggle('hidden', !o);
    if (!o) return;
    const E = EVENTS[o.id], left = Math.max(1, o.at - this.g.turns);
    this.omen.innerHTML = `${icon(E.icon)}<span>${E.chip} en ${left} ${left === 1 ? 'turno' : 'turnos'}</span>`;
  }

  async banner(i, text, small) {
    const b = el(`banner p${i}`, `${esc(text)}${small ? `<small>${esc(small)}</small>` : ''}`);
    this.game.append(b);
    b.onanimationend = () => b.remove();
    setTimeout(() => b.remove(), 1600);
  }

  buyButton(what, ic, label, key, tip) {
    const b = el('buy', `${icon(ic)}<span>${label}</span><b>${PRICES[what]}${icon('gem')}</b>`, 'button');
    b.title = `${tip} (${key})`;
    b.disabled = !this.g.canBuy(what);
    b.onclick = () => this.on.buy?.(what);
    return b;
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
    const row = el('row2');
    const r = el('roll', `${icon('dice')}Tirar el dado`, 'button');
    r.onclick = () => this.on.roll?.();
    row.append(this.buyButton('sobre', 'bag', 'Sobre misterioso', 'B', 'Recibes una carta al azar'), r, this.buyButton('trampa', 'trap', 'Trampa escondida', 'T', 'Se esconde en el camino de tu rival: si la pisa, se detiene y le robas hasta 4 gemas'));
    this.act.append(row);
  }

  showMove(n, text) {
    this.showHint(text || `<b>${n}</b> ${n === 1 ? 'paso' : 'pasos'}: elige una casilla iluminada`);
    const row = el('row2');
    row.append(this.buyButton('repetir', 'again', 'Repetir tirada', 'R', 'Vuelves a tirar el dado y vale el nuevo número'), this.buyButton('paso', 'boot', 'Un paso más', 'P', 'Avanzas una casilla más en esta tirada'));
    this.act.append(row);
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
    this.root.append(f);
    setTimeout(() => f.remove(), 1500);
  }

  // Pergamino: se cierra solo, o antes con clic, toque o espacio.
  message(kind, title, text, quick, note) {
    const [ic, color] = KIND[kind] || KIND.calm;
    const s = el('scroll', `${icon(ic)}<h3>${esc(title)}</h3><p>${esc(text)}</p>${note ? `<b class="note">${esc(note)}</b>` : ''}`);
    s.style.setProperty('--k', color);
    this.game.append(s);
    return new Promise((res) => {
      const t0 = performance.now();
      const done = () => { clearTimeout(tm); removeEventListener('pointerdown', skip); this.skip = null; s.remove(); res(); };
      const skip = () => { if (performance.now() - t0 > 350) done(); };
      const tm = setTimeout(done, this.fast ? 1 : quick ? 1500 : 1500 + (text.length + (note?.length || 0)) * 24);
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

  // Ventana genérica: los botones con data-i responden al clic y a las teclas 1, 2, 3…
  ask(inner, cls = '') {
    return new Promise((res) => {
      const m = this.modal(inner, cls), bs = [...inner.querySelectorAll('[data-i]')];
      const end = (b) => { if (!b || b.disabled) return; this.pickKey = this.okKey = null; m.remove(); sfx('click'); res(b.dataset.i); };
      bs.forEach((b) => (b.onclick = () => end(b)));
      const nums = bs.filter((b) => !b.dataset.ok);
      this.pickKey = (i) => end(nums[i]);
      const ok = bs.find((b) => b.dataset.ok);
      if (ok) this.okKey = () => end(ok);
    });
  }

  adventure(a, player, can) {
    const s = el('tale', `<div class="orn">${icon(a.icon)}</div><h2>${esc(a.title)}</h2><p>${esc(a.text)}</p><div class="picks"></div><small>${esc(player.name)} decide · tiene ${player.gems} ${icon('gem')}${a.choices.some((c) => c.check) ? `<br>${icon('dice')} Se tira un dado: si sale ese número o más, se logra.` : ''}</small>`);
    a.choices.forEach((c, i) => {
      const tags = [c.cost ? `<i class="cost">${c.cost}${icon('gem')}</i>` : '', c.check ? `<i class="die" title="Se logra si el dado saca ${c.check} o más">${icon('dice')}${c.check === 6 ? '6' : `${c.check} o más`}</i>` : ''].join('');
      const b = el('pick', `<b>${i + 1}</b><span>${esc(c.label)}</span>${tags}`, 'button');
      b.dataset.i = i;
      b.disabled = !can(i);
      s.querySelector('.picks').append(b);
    });
    return this.ask(s).then(Number);
  }

  shop(shop, player) {
    const full = player.hand.length >= HAND_LIMIT;
    const s = el('sheet', `<h2>Mercado del gato</h2><p>${full ? 'Tienes la mano llena: ya no puedes comprar.' : `${esc(player.name)}, tienes ${player.gems} gemas.`}</p><div class="offer"></div><button class="cta" data-i="out" data-ok="1">Seguir el viaje</button>`);
    shop.items.forEach((it, i) => {
      const b = el('card', cardHtml(it.card, true) + `<span class="price">${it.sold ? 'Vendida' : `${it.price}${icon('gem')}`}</span>`, 'button');
      b.style.setProperty('--f', FAMILIES[CARDS[it.card].family].color);
      b.dataset.i = i;
      b.disabled = it.sold || full || player.gems < it.price;
      s.querySelector('.offer').append(b);
    });
    return this.ask(s).then((v) => (v === 'out' ? null : +v));
  }

  cave(c, player) {
    const next = CAVE[Math.min(5, c.grabs)], risk = this.g.caveRisk(), dice = (a, b) => Array.from({ length: b - a + 1 }, (_, i) => `<i>${a + i}</i>`).join('');
    const s = el('tale', `<div class="orn">${icon('flame')}</div><h2>Cueva del dragón</h2>
      <p>${c.grabs ? `Tu bolsa tiene <b>${c.bag} gemas</b>, pero solo son tuyas si sales. ${risk ? 'Para tomar más se tira un dado:' : 'De noche duerme profundo: esta vez tampoco hay riesgo.'}` : `El dragón duerme sobre su tesoro. Esta primera vez no hay riesgo; después, un dado decide si despierta.`}</p>
      ${risk ? `<div class="risk"><div class="bad"><span>${dice(1, risk)}</span><p><b>Despierta:</b> pierdes la bolsa y retrocedes 2</p></div>${c.grabs < 6 ? `<div class="ok"><span>${dice(risk + 1, 6)}</span><p><b>Sigue dormido:</b> +${next} gemas</p></div>` : ''}</div>` : ''}
      <div class="picks"><button class="pick" data-i="grab" ${c.grabs > 5 ? 'disabled' : ''}><b>1</b><span>${c.grabs ? `Arriesgarte por ${next} gemas más` : `Tomar ${next} gemas`}</span></button><button class="pick" data-i="leave"><b>2</b><span>${c.bag ? `Salir y quedarte con ${c.bag} gemas` : 'Irte sin tocar nada'}</span></button></div>`);
    return this.ask(s, 'low');
  }

  miniIntro(rules, why, names, mobile, prize) {
    const ctl = {
      button: mobile ? ['Toca la mitad izquierda', 'Toca la mitad derecha'] : ['Tecla A o espacio', 'Enter o clic del mouse'],
      move: mobile ? ['Desliza en la mitad izquierda', 'Desliza en la mitad derecha'] : ['Teclas A y D', 'Flechas ← y →'],
      hold: mobile ? ['Mantén el dedo en la mitad izquierda', 'Mantén el dedo en la mitad derecha'] : ['Mantén A o espacio', 'Mantén Enter o el clic del mouse'],
      dirs: mobile ? ['Los cuatro botones de la izquierda', 'Los cuatro botones de la derecha'] : ['Teclas W, A, S y D', 'Flechas ↑ ← ↓ →'],
      move2: mobile ? ['Desliza en la mitad izquierda', 'Desliza en la mitad derecha'] : ['Teclas W, A, S y D', 'Flechas ↑ ← ↓ →'],
      chase: mobile ? ['Quien huye desliza abajo', 'Quien lanza toca la arena'] : ['Quien huye: WASD o flechas', 'Quien lanza: mouse y clic'],
    }[rules.input];
    const s = el('tale mini', `<div class="orn">${icon(rules.icon)}</div><small>${why}</small><h2>${rules.name}</h2><p>${rules.goal}</p>
      <div class="ctl">${ctl.map((c, i) => `<div class="p${i}">${rules.input === 'chase' ? '' : `<b>${icon(AV[i])}${esc(names[i])}</b>`}${c}</div>`).join('')}</div>
      <div class="prize">${prize.map((t, i) => `<span class="p${i}">${icon(AV[i])}${esc(t)}</span>`).join('')}</div><button class="cta" data-i="go" data-ok="1">¡Listos!</button>`);
    return this.ask(s);
  }

  miniHud(names, title, left) {
    const m = el('minihud', `<div class="sc p0">${icon('crown')}<span>${esc(names[0])}</span><b>0</b></div><div class="mid"><span>${title}</span>${left != null ? '<div class="time"><i></i></div>' : ''}</div><div class="sc p1"><b>0</b><span>${esc(names[1])}</span>${icon('hat')}</div><div class="say"></div>`);
    this.root.append(m);
    return m;
  }
  miniScore(m, score, left, total) {
    [0, 1].forEach((i) => { const b = m.querySelector(`.p${i} b`); if (b.textContent !== String(score[i])) { b.textContent = score[i]; b.classList.remove('bump'); void b.offsetWidth; b.classList.add('bump'); } });
    const t = m.querySelector('.time i');
    if (t && left != null) { t.style.width = `${(left / total) * 100}%`; t.classList.toggle('low', left < 5); }
  }
  miniSay(m, text, small, secs) {
    const s = m.querySelector('.say');
    s.innerHTML = `<div>${esc(text)}${small ? `<small>${esc(small)}</small>` : ''}</div>`;
    clearTimeout(this.sayT);
    this.sayT = setTimeout(() => (s.innerHTML = ''), secs * 1000);
  }

  async fade(on) {
    this.veil ||= this.root.appendChild(el('veil'));
    this.veil.classList.toggle('on', on);
    await new Promise((r) => setTimeout(r, this.fast ? 1 : 330));
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
      <p>Tira el dado y elige a qué casilla iluminada ir. Quien llega primero al castillo gana <b>8 gemas</b>; a la otra persona le quedan <b>3 turnos</b>. <b>Gana quien tenga más gemas.</b></p>
      <ul>
      ${li('help', '#7c3fd0', '<b>Todo es sorpresa.</b> Nadie sabe qué hay en una casilla hasta caer en ella.')}
      ${li('hand', '#a8552f', '<b>Aventuras.</b> Decide; algunas decisiones regresan después.')}
      ${li('coin', '#b5811a', '<b>Mercado.</b> Se ve desde lejos. Puedes detenerte al pasar.')}
      ${li('flame', '#e0651f', '<b>Cueva.</b> Toma gemas y sal antes de que el dragón despierte.')}
      ${li('eagle', '#2b7fd0', '<b>Águila</b> te lleva adelante; el <b>gusano</b>, atrás.')}
      ${li('duel', '#d2452f', '<b>Minijuegos.</b> En el torneo, en las arenas y al caer donde está tu rival.')}
      ${li('star', '#d8981a', '<b>3 estrellas</b> te dan una carta. Ganas una estrella por turno.')}
      ${li('gem', '#1f9d63', '<b>Gasta gemas.</b> Sobres, trampas, repetir tirada o un paso más.')}
      ${li('star', '#d6468f', '<b>Hada madrina.</b> Ayuda a quien va atrás: mejores tiradas, menos pérdidas y cartas de remontada.')}
      ${li('moon', '#4a4fb0', `<b>De noche</b> las gemas dan +${NIGHT.gem}, las trampas quitan ${NIGHT.trap} más, se ve menos lejos y el dragón duerme profundo.`)}
      ${li('omen', '#6a2fa0', '<b>Presagios.</b> Avisan dos turnos antes: dragón, bosque, eclipse, helada o lluvia de estrellas.')}
      ${li('shield', '#2b7fd0', '<b>Escudo.</b> Te protege una vez de trampas, travesuras, gusano, dragón o fuego.')}
      </ul>
      <p><b>Controles:</b> espacio tira, 1 a 4 usan cartas o eligen, B y T compran, R repite la tirada, P da un paso más, flechas y Enter eligen casilla, M muestra el mapa. Arrastra para mover la cámara, usa el botón derecho para girarla y la rueda para acercar. En móvil, usa uno o dos dedos.</p>
      <button class="cta close">¡Entendido!</button>`);
    const m = this.modal(s);
    this.closeHelp = () => { this.helpOpen = false; m.remove(); };
    s.querySelector('.close').onclick = this.closeHelp;
    m.onclick = (e) => e.target === m && this.closeHelp();
  }

  title(defaults, saved, skins) {
    return new Promise((res) => {
      const s = el('title', `<h1>La Corona<small>del Bosque Errante</small></h1>
        <div class="setup">
          <div class="names"><label>${icon('crown')}<input maxlength="12" aria-label="Nombre de la princesa" value="${esc(defaults.names[0])}"></label><label>${icon('hat')}<input maxlength="12" aria-label="Nombre del mago" value="${esc(defaults.names[1])}"></label></div>
          <div class="line"><div class="seg" role="group" aria-label="Duración"><button data-l="20">Breve</button><button data-l="28">Normal</button><button data-l="38">Larga</button></div><button class="link skin" data-a="skin"></button><button class="link" data-a="new">Otro reino</button><button class="link" data-a="help">Cómo se juega</button></div>
          <div class="line go">${saved ? `<button class="cta" data-a="resume">Continuar: ${esc(saved.players[0].name)} y ${esc(saved.players[1].name)}</button>` : ''}<button class="cta ${saved ? 'alt' : ''}" data-a="start">${saved ? 'Partida nueva' : 'Comenzar la aventura'}</button></div>
        </div>`);
      this.root.append(s);
      let len = defaults.len;
      const seg = [...s.querySelectorAll('.seg button')];
      const mark = () => seg.forEach((b) => b.setAttribute('aria-pressed', +b.dataset.l === len));
      mark();
      seg.forEach((b) => (b.onclick = () => { len = +b.dataset.l; mark(); sfx('click'); this.on.preview?.(len, false); }));
      s.querySelector('[data-a=new]').onclick = () => { sfx('flip'); this.on.preview?.(len, true); };
      s.querySelector('[data-a=help]').onclick = () => this.help();
      const sk = s.querySelector('[data-a=skin]');
      const paintSkin = () => { const k = skins.find((q) => q.id === defaults.skin) || skins[0]; sk.innerHTML = `<i style="background:${k.hair}"></i>${k.name}`; sk.title = 'Cambiar la apariencia de la princesa'; };
      paintSkin();
      sk.onclick = () => { sfx('card'); defaults.skin = skins[(skins.findIndex((q) => q.id === defaults.skin) + 1) % skins.length].id; paintSkin(); this.on.skin?.(defaults.skin); };
      const resume = s.querySelector('[data-a=resume]');
      if (resume) resume.onclick = () => { s.remove(); res('resume'); };
      s.querySelector('[data-a=start]').onclick = () => {
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
      if (this.pickKey) { if (n >= 1) this.pickKey(n - 1); else if (this.okKey && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); this.okKey(); } return; }
      if (this.root.querySelector('.pad')) return;
      if (this.skip && (e.key === ' ' || e.key === 'Enter')) { e.preventDefault(); this.skip(); return; }
      if (e.target.tagName === 'BUTTON' && (e.key === ' ' || e.key === 'Enter')) return;
      if (e.key === ' ') { e.preventDefault(); this.on.roll?.(); }
      else if (n >= 1 && n <= 4) this.on.card?.(n - 1);
      else if (/^[btrp]$/i.test(e.key)) this.on.buy?.({ b: 'sobre', t: 'trampa', r: 'repetir', p: 'paso' }[e.key.toLowerCase()]);
      else if (e.key === 'm' || e.key === 'M') this.on.map?.();
      else if (e.key === 'h' || e.key === 'H') this.help();
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === 'Tab') { if (this.on.cycle?.(1)) e.preventDefault(); }
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') { if (this.on.cycle?.(-1)) e.preventDefault(); }
      else if (e.key === 'Enter') this.on.confirm?.();
    });
  }
}
