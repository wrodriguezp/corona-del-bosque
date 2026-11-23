// Aventuras con decisiones. Cada opción aplica `fx` directamente, o tira un dado
// (`check`: número mínimo para lograrlo) y aplica `ok` o `fail`.
// `need` la reserva para quien tenga esa marca: así una decisión vuelve más tarde.
// Efectos: ver Game.applyFx.
const o = (text, ...fx) => ({ text, fx });

export const ADVENTURES = [
  { id: 'troll', icon: 'duel', title: 'El troll del puente', text: 'Un troll bosteza y estira la mano: «Peaje».', choices: [
    { label: 'Pagar 2 gemas', cost: 2, ...o('El troll te carga en hombros y te deja más adelante.', ['move', 3]) },
    { label: 'Pelear', check: 4, ok: o('¡Lo mandas al río! Cae su bolsa.', ['gems', 5]), fail: o('Te lanza como un costal.', ['move', -2], ['gems', -2]) },
    { label: 'Culpar a tu rival', ...o('«¿Ah, sí?» El troll irá a cobrarle.', ['rival', -2], ['flag', 'troll']) },
  ] },
  { id: 'troll2', need: 'troll', icon: 'duel', title: 'El troll te recuerda', text: '«Me mentiste», gruñe. «Pero me hiciste ganar dinero».', choices: [
    { label: 'Disculparte', ...o('Se sonroja y te regala su garrote de la suerte.', ['card'], ['unflag', 'troll']) },
    { label: 'Mentir otra vez', check: 5, ok: o('¡Se lo creyó de nuevo!', ['gems', 6], ['unflag', 'troll']), fail: o('Esta vez no cae. Tú sí.', ['gems', -4], ['move', -2], ['unflag', 'troll']) },
  ] },
  { id: 'zorro', icon: 'calm', title: 'Zorro en apuros', text: 'Un zorro plateado está atrapado entre ramas.', choices: [
    { label: 'Liberarlo', ...o('Inclina la cabeza y desaparece. No olvidará esto.', ['star', 1], ['flag', 'zorro']) },
    { label: 'Tomar su collar', ...o('Brilla mucho. El zorro te mira mal.', ['gems', 4], ['flag', 'zorromal']) },
  ] },
  { id: 'zorro2', need: 'zorro', icon: 'star', title: 'El zorro regresa', text: 'El zorro plateado te espera, meneando la cola.', choices: [
    { label: 'Seguirlo', ...o('Conoce un atajo secreto.', ['move', 5], ['unflag', 'zorro']) },
    { label: 'Pedirle un tesoro', ...o('Desentierra un cofre para ti.', ['offer'], ['unflag', 'zorro']) },
  ] },
  { id: 'zorro3', need: 'zorromal', icon: 'trap', title: 'Venganza plateada', text: 'El zorro trajo a toda su familia.', choices: [
    { label: 'Devolver el collar', cost: 3, ...o('Te perdona, y te deja pasar.', ['star', 2], ['unflag', 'zorromal']) },
    { label: 'Correr', check: 4, ok: o('¡Más veloz que nunca!', ['move', 2], ['unflag', 'zorromal']), fail: o('Te persiguen hasta quedar sin aliento.', ['move', -3], ['unflag', 'zorromal']) },
  ] },
  { id: 'pozo', icon: 'shrine', title: 'Pozo de los deseos', text: 'El agua susurra tu nombre.', choices: [
    { label: 'Lanzar 1 gema', cost: 1, check: 3, ok: o('¡Deseo concedido!', ['gems', 5]), fail: o('Solo se oye un «gracias» muy profundo.') },
    { label: 'Lanzar 3 gemas', cost: 3, ...o('El pozo, encantado, te devuelve magia.', ['offer']) },
    { label: 'Asomarte', check: 3, ok: o('Ves el futuro reflejado.', ['reveal', 3]), fail: o('Te asomaste demasiado. ¡Splash!', ['fx', 'half']) },
  ] },
  { id: 'bruja', icon: 'flame', title: 'La bruja y su caldero', text: '«Prueba mi sopa», dice. Huele a calcetín.', choices: [
    { label: 'Un sorbo', check: 3, ok: o('¡Deliciosa! Te sientes invencible.', ['fx', 'shield']), fail: o('Te crecen raíces en los pies.', ['fx', 'minus']) },
    { label: 'Beber todo', check: 4, ok: o('¡Explotas de energía!', ['fx', 'double'], ['fx', 'shield']), fail: o('Duermes una siesta terrible.', ['fx', 'half'], ['gems', -2]) },
    { label: 'Regalársela a tu rival', ...o('Tu rival estornuda chispas a lo lejos.', ['rivalFx', 'worst']) },
  ] },
  { id: 'hada', icon: 'star', title: 'Hada perdida', text: 'Un hada diminuta no encuentra su linterna.', choices: [
    { label: 'Ayudarla a buscar', ...o('Aparece en tu bolsillo. ¡Qué vergüenza!', ['star', 2]) },
    { label: 'Contratarla como guía', cost: 2, ...o('Ilumina lo que viene.', ['reveal', 3], ['star', 1]) },
  ] },
  { id: 'esfinge', icon: 'help', title: 'La esfinge', text: '«¿Qué sube la escalera sin pies y baja sin cabeza?»', choices: [
    { label: '¡El humo!', ...o('«Aburrido, pero aceptable».', ['gems', 2]) },
    { label: '¡El dado!', check: 5, ok: o('La esfinge ríe tanto que llora gemas.', ['gems', 7]), fail: o('«No». Te sopla colina abajo.', ['move', -2]) },
    { label: 'Retarla', ...o('«Que decida el destino. Trae a tu rival».', ['duel']) },
  ] },
  { id: 'feria', icon: 'coin', title: 'Feria ambulante', text: 'Globos, tambores y un trilero con tres vasos.', choices: [
    { label: 'Apostar 2 gemas', cost: 2, check: 4, ok: o('¡Estaba en el del medio!', ['gems', 6]), fail: o('No estaba en ninguno. Qué raro.') },
    { label: 'Algodón de azúcar', cost: 1, ...o('Energía pura.', ['fx', 'plus']) },
    { label: 'Mirar el espectáculo', ...o('Sales de la carpa con una sonrisa.', ['star', 1]) },
  ] },
  { id: 'pirata', icon: 'bag', title: 'Pirata sin barco', text: '«Vendo mapa. Casi nuevo. Casi verdadero».', choices: [
    { label: 'Comprarlo por 2', cost: 2, check: 3, ok: o('¡La X marcaba el lugar!', ['gems', 6]), fail: o('La X era una mancha de mermelada.', ['star', 1]) },
    { label: 'Retarlo a pulso', check: 4, ok: o('Le ganas el loro y la bolsa.', ['gems', 4]), fail: o('Te gana la bolsa a ti.', ['gems', -3]) },
  ] },
  { id: 'ogro', icon: 'hand', title: 'El ogro enamorado', text: 'Te pide ayuda con una carta de amor.', choices: [
    { label: 'Escribir con el corazón', ...o('Llora, te abraza y te truena la espalda.', ['gems', 3], ['flag', 'ogro']) },
    { label: 'Firmar como tu rival', check: 4, ok: o('El ogro persigue a tu rival para darle un beso.', ['rivalMove', -3]), fail: o('Reconoce tu letra.', ['move', -2]) },
  ] },
  { id: 'ogro2', need: 'ogro', icon: 'crown', title: '¡Boda de ogros!', text: 'Funcionó la carta. Te invitan a la mesa principal.', choices: [
    { label: 'Brindar', ...o('Todos te regalan algo.', ['gems', 5], ['unflag', 'ogro']) },
    { label: 'Atrapar el ramo', check: 3, ok: o('¡Tuyo! Dentro había una carta.', ['offer'], ['unflag', 'ogro']), fail: o('Lo atrapa la abuela ogra. Nadie discute.', ['star', 1], ['unflag', 'ogro']) },
  ] },
  { id: 'espejo', icon: 'portal', title: 'Espejo encantado', text: 'En el reflejo, tu rival te saluda.', choices: [
    { label: 'Cruzar', check: 4, ok: o('¡Cambian de lugar!', ['swap']), fail: o('Te das contra el vidrio.', ['gems', -1]) },
    { label: 'Romperlo', ...o('Siete años de mala suerte… para alguien.', ['rivalFx', 'worst'], ['fx', 'minus']) },
    { label: 'Peinarte', ...o('Te ves espectacular.', ['star', 1]) },
  ] },
  { id: 'anciana', icon: 'hand', title: 'Anciana con leña', text: 'Carga más de lo que puede.', choices: [
    { label: 'Ayudarla', ...o('Avanzan despacio. Al despedirse, te bendice.', ['fx', 'minus'], ['fx', 'shield'], ['star', 1]) },
    { label: 'Seguir de largo', ...o('Ganas tiempo. Ella te mira fijamente.', ['move', 1], ['flag', 'anciana']) },
  ] },
  { id: 'anciana2', need: 'anciana', icon: 'cloud', title: 'No era una anciana', text: 'La Señora del Invierno se quita el disfraz.', choices: [
    { label: 'Pedir perdón', ...o('«Aprendiste». Te congela solo un poquito.', ['fx', 'minus'], ['unflag', 'anciana']) },
    { label: 'Encarar el frío', check: 5, ok: o('Admira tu valor y te premia.', ['gems', 6], ['unflag', 'anciana']), fail: o('Ventisca.', ['move', -3], ['unflag', 'anciana']) },
  ] },
  { id: 'abejas', icon: 'trap', title: 'Panal dorado', text: 'Gotea miel mágica. Zumba con ganas.', choices: [
    { label: 'Tomar un poco', check: 3, ok: o('Dulce victoria.', ['gems', 3]), fail: o('¡Ay, ay, ay!', ['gems', -2]) },
    { label: 'Tomar todo', check: 5, ok: o('¡El panal entero!', ['gems', 8]), fail: o('Corres sin mirar atrás. Hacia atrás.', ['move', -3]) },
    { label: 'Dirigirlas a tu rival', cost: 1, ...o('Siguen el olor hasta tu rival.', ['rival', -3]) },
  ] },
  { id: 'fantasma', icon: 'cloud', title: 'Fantasma tímido', text: '«¿Bu?», pregunta, sin convicción.', choices: [
    { label: 'Gritar fuerte', ...o('¡Se siente realizado! Te deja su herencia.', ['gems', 3]) },
    { label: 'Enseñarle a asustar', check: 4, ok: o('Practica con tu rival, que huye.', ['rivalMove', -2], ['star', 1]), fail: o('Practica contigo.', ['move', -2]) },
  ] },
  { id: 'dragoncito', icon: 'flame', title: 'Huevo tibio', text: 'Un huevo con escamas se mueve.', choices: [
    { label: 'Darle calor', ...o('Nace un dragoncito y te adopta.', ['fx', 'minus'], ['flag', 'dragon']) },
    { label: 'Llevarlo a vender', ...o('Buen precio, mala conciencia.', ['gems', 4]) },
  ] },
  { id: 'dragon2', need: 'dragon', icon: 'flame', title: 'Tu dragón creció', text: 'Aterriza a tu lado, enorme y contento.', choices: [
    { label: 'Volar con él', ...o('¡El reino entero bajo tus pies!', ['move', 7], ['unflag', 'dragon']) },
    { label: 'Enviarlo por tesoro', ...o('Vuelve con el hocico lleno.', ['gems', 7], ['unflag', 'dragon']) },
  ] },
  { id: 'musicos', icon: 'sound', title: 'Banda de grillos', text: 'Necesitan voz principal para esta noche.', choices: [
    { label: 'Cantar', check: 3, ok: o('¡Ovación! Lluvia de monedas.', ['gems', 4], ['star', 1]), fail: o('Lluvia de tomates.', ['star', 1]) },
    { label: 'Organizar un concurso', ...o('¡Que suba también tu rival!', ['duel']) },
  ] },
  { id: 'estatua', icon: 'castle', title: 'Estatua del rey viejo', text: 'Su mano de piedra sostiene algo.', choices: [
    { label: 'Dejar 2 gemas de ofrenda', cost: 2, ...o('La mano se abre.', ['card'], ['star', 1]) },
    { label: 'Forzar la mano', check: 4, ok: o('¡Crac! Era una joya.', ['gems', 5]), fail: o('La estatua te da un coscorrón.', ['gems', -2], ['fx', 'half']) },
  ] },
  { id: 'rio', icon: 'shrine', title: 'Río revuelto', text: 'Hay una balsa y una cuerda vieja.', choices: [
    { label: 'La balsa', check: 4, ok: o('¡La corriente te impulsa!', ['move', 5]), fail: o('La corriente iba al otro lado.', ['move', -3]) },
    { label: 'La cuerda', ...o('Lento pero seguro.', ['move', 2]) },
    { label: 'Pescar', check: 3, ok: o('Pescas una bolsa hundida.', ['gems', 4]), fail: o('Pescas una bota.', ['fx', 'plus']) },
  ] },
  { id: 'gemelas', icon: 'swap', title: 'Las gemelas', text: 'Una miente siempre. La otra también.', choices: [
    { label: 'Creerle a la izquierda', check: 4, ok: o('Por error dijo la verdad.', ['gems', 5]), fail: o('Mentía, claro.', ['gems', -2]) },
    { label: 'Creerle a la derecha', check: 3, ok: o('¡Había un atajo!', ['move', 3]), fail: o('El atajo daba una vuelta.', ['move', -2]) },
  ] },
  { id: 'banquero', icon: 'coin', title: 'Banquero duende', text: '«Invierta hoy, recoja mañana. Confíe».', choices: [
    { label: 'Invertir 3 gemas', cost: 3, ...o('Te da un recibo muy arrugado.', ['flag', 'banco']) },
    { label: 'Asaltarlo', check: 5, ok: o('¡Manos arriba!', ['gems', 7]), fail: o('Tenía guardias. Muchos.', ['gems', -4]) },
    { label: 'Denunciar a tu rival', ...o('El duende le cobra un impuesto inventado.', ['rival', -2]) },
  ] },
  { id: 'banco2', need: 'banco', icon: 'coin', title: 'El recibo arrugado', text: 'El duende te reconoce y abre su caja.', choices: [
    { label: 'Cobrar ahora', ...o('Con intereses.', ['gems', 7], ['unflag', 'banco']) },
    { label: 'Doble o nada', check: 4, ok: o('¡Doble!', ['gems', 13], ['unflag', 'banco']), fail: o('Nada.', ['unflag', 'banco']) },
  ] },
  { id: 'tregua', icon: 'shrine', title: 'Fogata compartida', text: 'Ves a lo lejos la señal de humo de tu rival.', choices: [
    { label: 'Compartir provisiones', ...o('Los dos ganan. A veces conviene ayudarse.', ['gems', 4], ['rival', 3]) },
    { label: 'Compartir historias', ...o('Los dos reciben dos estrellas.', ['star', 2], ['rivalStar', 2]) },
    { label: 'Apagarla y robar', check: 4, ok: o('Nadie te vio.', ['steal', 4]), fail: o('¡Te atraparon! Pagas una multa.', ['pay', 3]) },
  ] },
  { id: 'caballero', icon: 'duel', title: 'Caballero oxidado', text: 'No puede moverse, pero exige un duelo.', choices: [
    { label: 'Aceitarlo', cost: 1, ...o('Agradecido, te entrega su escudo.', ['fx', 'shield']) },
    { label: 'Traer a tu rival', ...o('«¡Duelo! ¡Duelo!», rechina.', ['duel']) },
    { label: 'Quitarle monedas', check: 4, ok: o('No puede detenerte.', ['gems', 4]), fail: o('Sí podía.', ['gems', -2], ['move', -1]) },
  ] },
  { id: 'nieve', biome: 3, icon: 'cloud', title: 'Muñeco de nieve', text: 'Te propone cambiar zanahoria por gema.', choices: [
    { label: 'Aceptar', cost: 1, ...o('La zanahoria era mágica.', ['fx', 'plus'], ['star', 1]) },
    { label: 'Guerra de nieve', ...o('¡Contra tu rival!', ['duel']) },
  ] },
  { id: 'hongos', biome: 1, icon: 'calm', title: 'Círculo de hongos', text: 'Laten despacio, como un corazón.', choices: [
    { label: 'Entrar', check: 3, ok: o('Apareces mucho más adelante.', ['move', 6]), fail: o('Apareces donde no querías.', ['move', -4]) },
    { label: 'Recolectar', ...o('Se venden bien.', ['gems', 3]) },
  ] },
  { id: 'espantajo', biome: 2, icon: 'crown', title: 'Espantapájaros rey', text: 'Los cuervos le hacen reverencias.', choices: [
    { label: 'Robar su corona', check: 4, ok: o('¡Oro de verdad!', ['gems', 6]), fail: o('Los cuervos te despluman.', ['gems', -3]) },
    { label: 'Hacer reverencia', ...o('Te nombra caballero de la paja.', ['card']) },
  ] },
  { id: 'conejo', biome: 0, icon: 'again', title: 'Conejo con prisa', text: '«¡Tarde, tarde!» Salta a una madriguera.', choices: [
    { label: 'Perseguirlo', check: 4, ok: o('¡Su prisa es contagiosa!', ['fx', 'again']), fail: o('La madriguera daba a otro lado.', ['move', -2]) },
    { label: 'Quedarte su reloj', ...o('Marca la hora del té.', ['gems', 3]) },
  ] },
];

export const byId = Object.fromEntries(ADVENTURES.map((a) => [a.id, a]));

const many = (n, one, pl) => `${n} ${n === 1 ? one : pl}`;
const gemas = (n) => many(n, 'gema', 'gemas'), casillas = (n) => many(n, 'casilla', 'casillas'), estrellas = (n) => many(n, 'estrella', 'estrellas');
const FX = { half: 'vale la mitad', minus: 'vale 2 menos', plus: 'vale 2 más', double: 'usa dos dados', worst: 'cuenta solo el menor de dos dados' };

// Resume en una línea el efecto real de un resultado: el texto divierte, esto aclara.
export function describe(fx, rival) {
  const line = ([k, v]) => {
    switch (k) {
      case 'gems': return v > 0 ? `Ganas ${gemas(v)}` : `Pierdes hasta ${gemas(-v)}`;
      case 'rival': return v > 0 ? `${rival} gana ${gemas(v)}` : `${rival} pierde hasta ${gemas(-v)}`;
      case 'steal': return `Le robas hasta ${gemas(v)} a ${rival}`;
      case 'pay': return `Le pagas hasta ${gemas(v)} a ${rival}`;
      case 'move': return v > 0 ? `Avanzas ${casillas(v)}` : `Retrocedes ${casillas(-v)}`;
      case 'rivalMove': return `${rival} ${v > 0 ? 'avanza' : 'retrocede'} ${casillas(Math.abs(v))}`;
      case 'star': return `Ganas ${estrellas(v)}`;
      case 'rivalStar': return `${rival} gana ${estrellas(v)}`;
      case 'card': return 'Recibes una carta al azar';
      case 'offer': return 'Eliges una carta';
      case 'fx': return v === 'shield' ? 'Tienes un escudo' : v === 'again' ? 'Juegas otro turno' : `Tu próxima tirada ${FX[v]}`;
      case 'rivalFx': return `La próxima tirada de ${rival} ${FX[v]}`;
      case 'reveal': return `Se revelan las casillas a ${v} pasos o menos`;
      case 'flag': return 'Esto tendrá consecuencias más adelante';
      case 'swap': return `Cambias de lugar con ${rival}`;
      case 'duel': return `Minijuego contra ${rival}`;
      default: return null;
    }
  };
  return fx.map(line).filter(Boolean).join(' · ') || 'No pasa nada';
}
