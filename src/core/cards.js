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
  apuesta: { family: 'fortuna', name: 'Apuesta del hada', icon: 'coin', text: 'Cara o cruz: ganas 8 gemas o pierdes 3.' },
  trueque: { family: 'fortuna', name: 'Diezmo real', icon: 'crown', text: 'Ganas 1 gema por cada 3 que tenga tu rival (máx. 6).' },
  mapa: { family: 'fortuna', name: 'Mapa del tesoro', icon: 'map', text: 'La próxima casilla donde caigas te da 5 gemas extra.' },
  botas: { family: 'impulso', name: 'Botas de viento', icon: 'boot', text: 'Suma 3 a tu tirada de este turno.' },
  doble: { family: 'impulso', name: 'Doble dado', icon: 'dice', text: 'Tiras dos dados y sumas ambos.' },
  encantado: { family: 'impulso', name: 'Dado encantado', icon: 'star', text: 'Tú eliges el número que sale.', choose: true },
  prudente: { family: 'impulso', name: 'Dado prudente', icon: 'shield', text: 'Tu dado solo saca 2, 3 o 4. Además ganas 2 gemas.' },
  loco: { family: 'impulso', name: 'Dado loco', icon: 'flame', text: 'Tu dado tiene 0, 1, 1, 7, 8 y 9.' },
  aliento: { family: 'impulso', name: 'Segundo aliento', icon: 'again', text: 'Juegas otro turno después de este.' },
  escudo: { family: 'impulso', name: 'Escudo de luz', icon: 'shield', text: 'Bloquea la próxima trampa o travesura.' },
  catapulta: { family: 'impulso', name: 'Catapulta', icon: 'portal', text: 'Vuelas 3 casillas hacia el castillo y después tiras.' },
  catalejo: { family: 'impulso', name: 'Catalejo', icon: 'eye', text: 'Descubres qué esconden las casillas a 2 pasos de ti.' },
  robo: { family: 'travesura', name: 'Mano larga', icon: 'steal', text: 'Robas 3 gemas a tu rival.' },
  maleta: { family: 'travesura', name: 'Bolsa rota', icon: 'bag', text: 'Tu rival pierde 4 gemas por el camino.' },
  nube: { family: 'travesura', name: 'Nube gris', icon: 'cloud', text: 'Mala suerte: en su próximo turno tira dos dados y vale el menor.' },
  raices: { family: 'travesura', name: 'Raíces traviesas', icon: 'root', text: 'La próxima tirada de tu rival pierde 2.' },
  gusanito: { family: 'travesura', name: 'Gusano bebé', icon: 'worm', text: 'Arrastra a tu rival 3 casillas hacia atrás.' },
  cambiazo: { family: 'travesura', name: 'Cambiazo', icon: 'swap', text: 'Cambias de lugar con tu rival si está a 8 casillas o menos.' },
  candado: { family: 'travesura', name: 'Candado', icon: 'lock', text: 'Tu rival no puede usar cartas ni comprar en su próximo turno.' },
  peaje: { family: 'travesura', name: 'Peaje', icon: 'coin', text: 'Tu rival te paga 1 gema, más 1 por cada carta en su mano.' },
  reto: { family: 'travesura', name: 'Guante de reto', icon: 'duel', text: 'Retas a tu rival a un minijuego por 4 gemas.' },
};

export const HAND_LIMIT = 4;
export const PRICES = { sobre: 4, trampa: 4, repetir: 2, paso: 3 };

export function offerCards(rng) {
  return Object.keys(FAMILIES).map((f) =>
    rng.pick(Object.keys(CARDS).filter((k) => CARDS[k].family === f)));
}
