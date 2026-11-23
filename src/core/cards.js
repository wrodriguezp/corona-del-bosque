// Oportunidades. Cada oferta trae una carta por familia, para elegir estilo.
export const FAMILIES = {
  fortuna: { name: 'Fortuna', color: '#f2b632' },
  impulso: { name: 'Impulso', color: '#39b87f' },
  travesura: { name: 'Travesura', color: '#a558d8' },
  remontada: { name: 'Remontada', color: '#ff6fa8' }, // solo la trae el hada, a quien va atrás
};

export const CARDS = {
  cosecha: { family: 'fortuna', name: 'Cosecha', icon: 'gem', big: '+4 {gem}', text: 'Ganas 4 gemas ahora mismo.' },
  dorado: { family: 'fortuna', name: 'Toque dorado', icon: 'hand', big: '{gem} ×2 · 2 veces', text: 'Las próximas 2 casillas de gemas que encuentres te dan el doble.' },
  iman: { family: 'fortuna', name: 'Imán de gemas', icon: 'magnet', big: '+1 {gem} por paso', text: 'Este turno ganas 1 gema por casilla que avances (máx. 6).' },
  apuesta: { family: 'fortuna', name: 'Apuesta del hada', icon: 'coin', big: '{crown} +8 {gem} · {moon} −3 {gem}', text: 'Se lanza una moneda: cara, ganas 8 gemas; cruz, pierdes 3.' },
  trueque: { family: 'fortuna', name: 'Diezmo real', icon: 'crown', big: '+{gem} (máx. 6)', text: 'Ganas 1 gema por cada 3 que tenga tu rival (máx. 6). Tu rival no pierde nada.' },
  mapa: { family: 'fortuna', name: 'Mapa del tesoro', icon: 'map', big: '{map} +5 {gem}', text: 'Donde caigas después ganas 5 gemas, además de lo que haya ahí.' },
  botas: { family: 'impulso', name: 'Botas de viento', icon: 'boot', big: '{dice} +3', text: 'Tu tirada de este turno vale 3 más.' },
  doble: { family: 'impulso', name: 'Doble dado', icon: 'dice', big: '{dice} + {dice}', text: 'Este turno tiras dos dados y se suman.' },
  encantado: { family: 'impulso', name: 'Dado encantado', icon: 'star', big: '{dice} = tú eliges', text: 'Tú eliges el número que sale este turno.', choose: true },
  prudente: { family: 'impulso', name: 'Dado prudente', icon: 'shield', big: '{dice} 2·3·4 · +2 {gem}', text: 'Este turno tu dado solo puede sacar 2, 3 o 4. Además ganas 2 gemas.' },
  loco: { family: 'impulso', name: 'Dado loco', icon: 'flame', big: '{dice} 0·1·1·7·8·9', text: 'Este turno las caras de tu dado son 0, 1, 1, 7, 8 y 9.' },
  aliento: { family: 'impulso', name: 'Segundo aliento', icon: 'again', big: '+1 turno', text: 'Juegas otro turno después de este.' },
  escudo: { family: 'impulso', name: 'Escudo de luz', icon: 'shield', big: '{shield} ×1', text: 'Te protege una vez: de una trampa, una travesura, el gusano o el dragón.' },
  catapulta: { family: 'impulso', name: 'Catapulta', icon: 'portal', big: '→ 3 casillas', text: 'Vuelas 3 casillas hacia el castillo. Después tiras el dado normalmente.' },
  catalejo: { family: 'impulso', name: 'Catalejo', icon: 'eye', big: '{eye} 2 casillas', text: 'Se revela qué esconden las casillas a 1 o 2 pasos de ti.' },
  robo: { family: 'travesura', name: 'Mano larga', icon: 'steal', big: '{rival} −3 {gem} → tú', text: 'Le robas hasta 3 gemas a tu rival.' },
  maleta: { family: 'travesura', name: 'Bolsa rota', icon: 'bag', big: '{rival} −4 {gem}', text: 'Tu rival pierde hasta 4 gemas. Nadie se las queda.' },
  nube: { family: 'travesura', name: 'Nube gris', icon: 'cloud', big: '{rival} {dice}{dice} el menor', text: 'En su próximo turno, tu rival tira dos dados y solo cuenta el menor.' },
  raices: { family: 'travesura', name: 'Raíces traviesas', icon: 'root', big: '{rival} {dice} −2', text: 'La próxima tirada de tu rival vale 2 menos (mínimo 1).' },
  gusanito: { family: 'travesura', name: 'Gusano bebé', icon: 'worm', big: '{rival} ← 3 casillas', text: 'Tu rival retrocede 3 casillas.' },
  cambiazo: { family: 'travesura', name: 'Cambiazo', icon: 'swap', big: 'tú ⇄ {rival}', text: 'Cambias de lugar con tu rival si está a 8 casillas o menos.' },
  candado: { family: 'travesura', name: 'Candado', icon: 'lock', big: '{rival} {lock} 1 turno', text: 'Tu rival no puede usar cartas ni comprar en su próximo turno.' },
  reloj: { family: 'travesura', name: '¡Piensa rápido!', icon: 'hourglass', big: '{rival} {hourglass} 10 s', text: 'En su próximo turno, tu rival tiene 10 segundos para tirar y elegir camino. Si no alcanza, el dado se tira solo.' },
  peaje: { family: 'travesura', name: 'Peaje', icon: 'coin', big: '{rival} −1 {gem} +1 por carta', text: 'Le robas a tu rival 1 gema, y 1 más por cada carta que tenga.' },
  reto: { family: 'travesura', name: 'Guante de reto', icon: 'duel', big: '{duel} minijuego', text: 'Retas a tu rival a un minijuego: quien gane le quita gemas a quien pierda.' },
  cometa: { family: 'remontada', name: 'Cometa real', icon: 'star', big: '{rival} −5 {gem} → tú', text: 'Le robas hasta 5 gemas a tu rival.' },
  estela: { family: 'remontada', name: 'Estela de hada', icon: 'portal', big: '+3 {gem} · vuelas', text: 'Ganas 3 gemas y vuelas hasta quedar 2 casillas detrás de tu rival (máx. 8).' },
  cuerno: { family: 'remontada', name: 'Cuerno mágico', icon: 'gem', big: '+6 {gem} +2 {star}', text: 'Ganas 6 gemas y 2 estrellas.' },
};

export const HAND_LIMIT = 4;
export const PRICES = { sobre: 4, trampa: 4, repetir: 2, paso: 3 };

const OF = Object.fromEntries(Object.keys(FAMILIES).map((f) => [f, Object.keys(CARDS).filter((k) => CARDS[k].family === f)]));
export const COMMON = Object.keys(CARDS).filter((k) => CARDS[k].family !== 'remontada');

// Una carta por familia; con `help`, una familia al azar se cambia por remontada.
export function offerCards(rng, help = false) {
  const fam = ['fortuna', 'impulso', 'travesura'];
  if (help) fam[rng.int(0, 2)] = 'remontada';
  return fam.map((f) => rng.pick(OF[f]));
}
export const comebackCard = (rng) => rng.pick(OF.remontada);
