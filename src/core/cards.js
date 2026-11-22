// Oportunidades. Cada oferta trae una carta por familia, para elegir estilo.
export const FAMILIES = {
  fortuna: { name: 'Fortuna', color: '#f2b632' },
  impulso: { name: 'Impulso', color: '#39b87f' },
  travesura: { name: 'Travesura', color: '#a558d8' },
};

export const CARDS = {
  cosecha: { family: 'fortuna', name: 'Cosecha', icon: 'gem', text: 'Ganas 4 gemas ahora mismo.' },
  dorado: { family: 'fortuna', name: 'Toque dorado', icon: 'hand', text: 'Tus próximas 2 casillas de gemas valen el doble.' },
  iman: { family: 'fortuna', name: 'Imán de gemas', icon: 'magnet', text: 'Este turno ganas 1 gema por casilla que avances (máx. 6).' },
  botas: { family: 'impulso', name: 'Botas de viento', icon: 'boot', text: 'Suma 3 a tu tirada de este turno.' },
  doble: { family: 'impulso', name: 'Doble dado', icon: 'dice', text: 'Tiras dos dados y sumas ambos.' },
  encantado: { family: 'impulso', name: 'Dado encantado', icon: 'star', text: 'Tú eliges el número que sale.', choose: true },
  aliento: { family: 'impulso', name: 'Segundo aliento', icon: 'again', text: 'Juegas otro turno después de este.' },
  escudo: { family: 'impulso', name: 'Escudo de luz', icon: 'shield', text: 'Bloquea la próxima trampa o travesura.' },
  robo: { family: 'travesura', name: 'Mano larga', icon: 'steal', text: 'Robas 3 gemas a tu rival.' },
  maleta: { family: 'travesura', name: 'Bolsa rota', icon: 'bag', text: 'Tu rival pierde 4 gemas por el camino.' },
  nube: { family: 'travesura', name: 'Nube gris', icon: 'cloud', text: 'Mala suerte: en su próximo turno tira dos dados y vale el menor.' },
  raices: { family: 'travesura', name: 'Raíces traviesas', icon: 'root', text: 'La próxima tirada de tu rival pierde 2.' },
};

export const HAND_LIMIT = 4;

export function offerCards(rng) {
  return Object.keys(FAMILIES).map((f) =>
    rng.pick(Object.keys(CARDS).filter((k) => CARDS[k].family === f)));
}
