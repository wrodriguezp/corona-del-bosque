# Hoja de ruta

Cada entrega se guarda en git con una etiqueta (`v1`, `v2`, …).

## V1 (lista)
Tablero hexagonal procedural, niebla, dado, caminos, gemas, trampas, portales, 12 cartas, princesa y mago.

## V2: misterio y minijuegos (lista)
- Sin pistas: cada casilla es una sorpresa y solo se revela al caer en ella.
- Lugares visibles a lo lejos que dan metas: mercader y cueva del dragón.
- Aventuras con decisiones, algunas con consecuencias turnos después.
- Serpientes y escaleras a lo grande: águila y gusano gigante.
- Gastar gemas en pleno turno: sobre misterioso, repetir tirada, un paso más, trampa escondida.
- Más cartas. Los dados prudente y loco existen solo como cartas.
- Tres minijuegos: duelo de hechizos, lluvia de gemas, hechicera y fugitivo.
- Apariencias para la princesa.
- Guardado automático y partida repetible a partir de sus acciones.

### V2.1 (lista)
- Textos revisados: cada resultado explica su efecto real, y la cueva muestra qué pasa con cada número.
- Hada madrina para quien va atrás: voltea tiradas bajas, reduce pérdidas a la mitad, mejora premios y trae tres cartas de remontada.
- Se mide con `node tools/medir.js`: partidas con 20 o más gemas de diferencia, de 26 % a 13 %.

## V3: un mundo que cambia
### V3.0: mundo vivo (lista)
- Ciclo de día y noche (6 turnos de día y 4 de noche): de noche hay más peligro y mejores premios, faroles, luna y cinco aventuras propias.
- Presagios que avisan dos turnos antes de cada evento: vuela el dragón, camina el bosque, eclipse, gran helada y lluvia de estrellas.
- Se conserva el equilibrio: 20 o más gemas de diferencia en el 13 % de las partidas simuladas.

### V3.1: más minijuegos (lista)
- Seis minijuegos nuevos, nueve en total: tira y afloja al ritmo, memoria de runas, salta el rayo, choque en el hielo, huevo de dragón y burbuja valiente.
- Controles nuevos en PC y celular: mantener pulsado, cuatro direcciones (con botones en pantalla en el celular) y movimiento libre para cada quien.
- Todos se prueban con jugadores simulados: terminan, son repetibles y ninguno favorece a un lado.

### V3.1.1: final justo y se entiende sin leer (lista)
- Quien llega primero al castillo sigue jugando: en cada turno del castillo tira el dado y elige guardarlo en su cofre (se abre al final) o hacer retroceder a su rival. Llegar da 6 gemas (10 desde la V3.5).
- Quien no alcanza a llegar pierde 5 gemas. Las cartas que sobran valen 2 gemas cada una.
- Se mide con `node tools/final.js`: quien llega primero gana el 60 % de las partidas (antes, el 50 %).
- Cometa real roba hasta 5 gemas. Carta nueva: ¡Piensa rápido! (10 segundos; si no alcanza, el dado se tira solo).
- Se ve de quién es el turno (borde rosa o azul), cada carta muestra su efecto dibujado, la apuesta lanza una moneda de verdad y pagar ya no parece perder.
- Volver atrás se marca con flechas chicas y grises.
- Minijuegos: botón para cambiar de lado, joystick dibujado en pantalla y celebración de victoria con cuatro escenas distintas.

### V3.2: más minijuegos (lista)
- Siete minijuegos nuevos, dieciséis en total: el dragón dormido (avanzar solo mientras duerme), cuenta conejos (contar los blancos), la pesca (paciencia), ritmo de hongos (tres carriles al compás), pinta el claro (territorio), topos del jardín (reflejos) y la torre de piedras (precisión).
- Todos se miden con jugadores simulados: duran entre 15 y 31 segundos y ninguno favorece a un lado.

### V3.2.1: salir y guardar (lista)
- Botón para salir al menú en plena partida: queda guardada y se puede continuar, empezar otra o cambiar los nombres.
- Cada versión publicada lleva una huella de su código: si el juego se actualiza, la partida guardada con la versión anterior se borra sola.

### V3.3: juntos contra la Sombra ✓
- Evento «Ataque de la Sombra»: el presagio lo anuncia y al turno siguiente juegan en equipo.
- Tres minijuegos en equipo: faroles contra la Sombra, remar juntos y el escudo de luz.
- Si ganan, 4 gemas para cada quien; si gana la Sombra, hasta 3 menos (el escudo protege).

### Más minijuegos en equipo (ideas)
- El puente: uno sostiene el puente mientras el otro cruza, y luego al revés.
- Pasar la llama: llevar una antorcha entre los dos sin que se apague.
- Runas en equipo: cada quien ve la mitad de la secuencia.
- Defiende tu nido, catapulta mágica, dibujar un hechizo con el dedo, laberinto rápido, piso que se cae.
- Variantes de los que ya existen (hielo, noche, señales falsas…).

### V3.4: la Sombra y las criaturas (lista)
- La Sombra avanza desde la salida desde el turno 6 y se acelera; se ve en el tablero y en la barra de recorrido. Si te alcanza pierdes hasta 3 gemas y sales 2 casillas por delante de ella. Alcanza a alguien en un tercio de las partidas.
- Criaturas que aparecen en lo ya explorado y vagan por el tablero: conejo (+2 a la próxima tirada), hada (una carta), lobo (−3 gemas; de noche persigue) y troll (te detiene y cobra 2). Basta pasar por su casilla.
- Cerca del castillo las gemas y las fogatas dan más: +1 desde la mitad del camino y +2 en el último tramo.
- Se conserva el equilibrio: 20 o más gemas de diferencia en el 14 % de las partidas simuladas.

### V3.5: llegar primero vale la pena (lista)
- Llegar primero da 10 gemas, y en el castillo se está a salvo: las travesuras ya no sirven contra quien llegó.
- Los premios extra del último tramo se apagan cuando alguien llega, y el hada madrina deja de ayudar en los turnos finales.
- El «Toque dorado» suma 3 gemas en vez de duplicar (con los extras de la noche y del último tramo llegaba a 14).
- La Sombra ataca en todas las partidas: siempre hay al menos un minijuego en equipo.
- Instrucciones de los minijuegos en tres pasos: así es, qué haces y cómo se gana.
- Llegar primero gana el 71 % de las partidas simuladas (antes, el 62 %). Llegar primero yendo adelante y perder pasa en el 4 % (antes, el 10 %).
- Pendiente: un modo totalmente cooperativo (V4).

### V3.6: arreglos y Arcade (lista)
- Botón de pantalla completa (en el menú y en la partida; tecla F).
- «Cambiar lados» también cambia de lado a los personajes: la escena del minijuego se ve en espejo y cada quien queda junto a su control.
- Cuenta conejos: cada toque se ve («+1» del color de cada quien) y suena con un tono propio.
- Ritmo de hongos: más margen para acertar; si te adelantas o atrasas un poco dice «¡Antes!» o «¡Tarde!» y no resta. En celular, un toque en cualquier parte de la cruz cuenta (antes se perdía si caía entre dos flechas).
- Al empezar se explica quién parte y por qué quien juega segundo trae 1 gema y 1 estrella extra.
- Menos palizas: en los turnos finales el hada se queda solo con quien va 13 gemas o más atrás. Partidas con 20 o más gemas de diferencia: del ~23 % al ~17 %; llegar primero sigue ganando el ~72 %.
- **Arcade:** jugar cualquier minijuego suelto desde el menú, con marcador (cada quien y «juntos»).

### V3.7: el Rey Sombrío (lista)
- La Sombra es el poder de un rey villano: bruto, feo, malvado y con bigote de villano. Diseño propio.
- Secuaces hipnotizados: conejos y trolls con ojos morados.
- Tres guardianes en el camino (a un cuarto, a la mitad y a tres cuartos): el Conejo Gigante, el Troll Hipnotizado y el Rey Sombrío. Se ven a lo lejos; quien llega se detiene y juegan un minijuego en equipo contra él, que aparece en la arena y se ríe o tiembla al final. Si ganan, 4 gemas para cada quien; si pierden, hasta −3.
- El ataque del Rey ya no sale en todas las partidas (los guardianes aseguran tres minijuegos en equipo).
- Los minijuegos en equipo van de fácil a difícil: al principio se avanza más, al final cuesta más. Con jugadores simulados se ganan faroles 96 %, remar 90 % y escudo 73 %.
- Se conserva el equilibrio: 20 o más gemas de diferencia en el 18 % de las partidas; llegar primero gana el 69 %.

### V3.8: rondas de minijuegos (siguiente)
- Cada pocas vueltas, un minijuego para todos; cada cierto número de rondas, uno cooperativo.
- Nuevos en equipo: el puente, pasar la llama, runas en equipo.

### Después
- Reliquias, misión secreta, poderes propios, más cartas (unas 40).

### Descartado hasta nuevo aviso
- Modo con reloj.
- Adivinar la tirada del rival (necesita multijugador en línea).

## V4: modo cooperativo
Menú para elegir el modo. Ganan o pierden juntos contra el Rey Sombrío: la sombra devora el tablero, tres runas por reunir y minijuegos en equipo.

## Más adelante
- Jugar solo contra la computadora (una IA).
- Sala con código: cada quien en su celular. Con eso, más de dos jugadores.
- Más personajes y más apariencias.
- Más adornos y sonidos.

## Decisiones tomadas
- El dado normal es la base; los dados especiales son cartas.
- No se puede saber si una casilla es buena o mala antes de caer.
- Nivelar un poco, a la vista y sin regalar el triunfo: quien juega mejor debe ganar más.
- La pérdida máxima por casilla ronda las 5 gemas.
- Todo debe jugarse en PC y en celular, con una sola pantalla compartida.
- Las reglas (`src/core`) no conocen gráficos: cada acción entra por `session.dispatch`, para conectar salas en línea sin reescribir.
