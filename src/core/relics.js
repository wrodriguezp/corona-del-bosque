import { HAND_LIMIT, PRICES } from './cards.js';

// Reliquias (V4.4): objetos que duran toda la partida, con un poder fijo y pequeño.
// En «uno contra otro» se encuentran en altares lejanos: se las lleva quien llega
// primero. En el modo juntos son del equipo (sirven a los dos), y cada guardián
// vencido da además una reliquia de equipo.
export const RELICS = {
  bolsa: { name: 'Bolsa sin fondo', icon: 'bag', text: 'Puedes guardar 5 cartas en vez de 4.' },
  moneda: { name: 'Moneda del mercader', icon: 'coin', text: 'Todo lo que compras cuesta 1 gema menos: en el Mercado y en los botones de compra.' },
  botas: { name: 'Botas de siete leguas', icon: 'boot', text: 'Si tu dado saca 1, avanzas 3 casillas (y sigues ganando la estrella de consuelo).' },
  farol: { name: 'Farol de luciérnagas', icon: 'moon', text: 'De noche, las casillas de gemas y las fogatas te dan 2 gemas más.' },
  amuleto: { name: 'Amuleto del duende', icon: 'trap', text: 'Las trampas te quitan hasta 2 gemas menos.' },
  raiz: { name: 'Raíz del roble', icon: 'root', text: 'El pozo y el gran gusano ya no te hacen retroceder.' },
  corona: { name: 'Corona de flores', icon: 'star', text: 'Cada vez que ganas una estrella, ganas también 1 gema.' },
  // Solo del equipo, en el modo juntos.
  roble: { name: 'Corazón de roble', icon: 'heart', text: 'El equipo gana 1 corazón y puede tener 1 más.', team: true },
  vela: { name: 'Vela del alba', icon: 'sun', text: 'Cuando pierden un minijuego, la Sombra avanza 1 casilla menos.', team: true },
  cuerno: { name: 'Cuerno del alba', icon: 'omen', text: 'Cuando ganan un minijuego, la Sombra retrocede 1 casilla más.', team: true },
};
export const ALTAR_RELICS = Object.keys(RELICS).filter((k) => !RELICS[k].team);
export const TEAM_RELICS = Object.keys(RELICS).filter((k) => RELICS[k].team);

export const hasRelic = (p, id) => !!p?.relics?.includes(id);
export const handLimit = (p) => HAND_LIMIT + (hasRelic(p, 'bolsa') ? 1 : 0);
export const priceOf = (p, what, base = PRICES[what]) => Math.max(1, base - (hasRelic(p, 'moneda') ? 1 : 0));
