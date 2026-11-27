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

### V3.8: rondas de minijuegos (lista)
- Cada 3 vueltas (6 turnos) hay una ronda de minijuegos; antes el torneo era cada 4. Cada tercera ronda es en equipo contra el Rey Sombrío.
- Tres minijuegos en equipo nuevos, seis en total (todos de fácil a difícil):
  - **El puente:** uno cruza manteniendo pulsado y el otro sostiene las cuerdas cuando sopla una ráfaga; después cambian de papel.
  - **Pasar la llama:** lanzarse la antorcha y atraparla justo cuando llega (un aro que se cierra marca el momento). 12 pases; 3 caídas y se apaga.
  - **Runas en equipo:** cada runa se enciende del color de quien debe marcarla, y la repiten entre los dos en orden. 3 vidas.
- Con jugadores simulados se ganan el puente 93 %, pasar la llama 77 % y runas en equipo 88 %.
- Se conserva el equilibrio: 20 o más gemas de diferencia en el 17 % de las partidas; llegar primero gana el 70 %.

### V3.9: más minijuegos (lista)
- Dos nuevos para dos, dieciocho en total:
  - **Cruza el camino:** cruzar a saltitos un camino con carretas de calabaza y escobas voladoras, un prado y un arroyo con hojas flotantes. Gana quien cruce más veces.
  - **La enredadera:** carrera de escalada a puro tino: pulsar cuando la manito pasa por la hoja. Las dos enredaderas tienen las mismas hojas.
- Dos nuevos en equipo, ocho en total:
  - **Cruzar juntos:** el mismo camino; entre los dos cruzan 5 veces con 7 vidas compartidas.
  - **El piso que se cae:** juntar 12 estrellas sobre baldosas que tiemblan y caen; 4 vidas.
- Con jugadores simulados: cruza el camino y la enredadera son parejos; cruzar juntos se gana el 71 % y el piso el 79 %.
- Equilibrio: 20 o más gemas de diferencia en el ~19 % de las partidas (cambió el orden del azar); llegar primero gana el 69 %.

### Más minijuegos (ideas que quedan)
- En equipo: catapulta mágica, dibujar un hechizo con el dedo, laberinto rápido, escalar juntos atados con una cuerda, apagar incendios del bosque.
- Para dos: pesca de estrellas en el cielo.
- Variantes de los que ya existen (hielo, noche, señales falsas…).
- Las elegidas para la V4.2 ya están hechas (más abajo).

### Descartado hasta nuevo aviso
- Modo con reloj.
- Adivinar la tirada del rival (necesita multijugador en línea).

## V4: modo juntos (lista)
- En el menú se elige el modo: «Uno contra otro» o «Juntos contra el Rey».
- Ganan o pierden juntos contra el Rey Sombrío. Tienen 4 corazones entre los dos.
- Cada guardián vencido da una runa. Si gana el guardián, pierden un corazón, quien llegó retrocede y el guardián sigue cerrando el paso. Nadie se lo salta: ni con águilas, portales, catapultas ni cambios del bosque. La puerta del castillo se abre con las tres runas.
- La Sombra es el reloj: si alcanza a alguien, pierden un corazón. Espera detrás de cada guardián que siga en pie.
- Todos los minijuegos son en equipo (rondas, arenas, ataques del Rey): si ganan, la Sombra retrocede 2 casillas; si pierden, avanza 3.
- Sin travesuras, trampas ni hada madrina. Tres cartas de equipo: Abrazo de hada (+1 corazón), Farol del alba (la Sombra retrocede 4) y Lazo de amistad (el compañero avanza 3). Solo salen aventuras que no dañan al compañero.
- Quien llega primero ayuda desde la torre: con su dado hace retroceder la Sombra o empuja a su compañero. Ganan cuando llegan los dos; pierden si se acaban los corazones.
- Con jugadores simulados: si ganan el 50 % de los minijuegos, ganan la partida ~50 %; con 65 %, ~70 %; con 80 %, ~90 %.
- Por confirmar jugando: si 4 corazones son pocos o muchos, y si la ayuda desde la torre se siente útil.

## V4.1: jugar solo (lista)
- En el menú se elige «Dos personas» o «Yo y la computadora». La persona juega con la princesa y la computadora con el mago, en los dos modos y en el Arcade.
- Tres dificultades: Tranquila, Normal y Difícil. En el modo juntos también dan los corazones: 5, 4 o 3.
- En el tablero, la computadora decide con lo mismo que ve una persona: casillas reveladas, lugares a la vista, criaturas y la Sombra. Nunca mira lo que esconde una casilla. Usa cartas, compra, elige aventuras, entra a la cueva y juega desde el castillo. Cada decisión se cuenta en pantalla con una pausa corta.
- En los minijuegos juega con su propio jugador simulado, con «distracciones» medidas para cada minijuego. Contra un jugador típico gana ~31 % en Tranquila, ~42 % en Normal y ~48 % en Difícil. En los minijuegos en equipo juega lo mejor que puede.
- Sola contra la computadora, la persona puede usar cualquier lado del teclado o de la pantalla.
- Con jugadores simulados: la computadora le gana ~70 % de las veces a un jugador que elige al azar. En el modo juntos, con 65 % de minijuegos ganados, el equipo gana ~87 % en Tranquila, ~86 % en Normal y ~80 % en Difícil.
- Por confirmar jugando: si las dificultades se sienten distintas y si las pausas de la computadora son muy largas o muy cortas.

## V4.2: muchos minijuegos (lista)
Una entrega solo de minijuegos: 6 para dos y 6 en equipo. Todos cortos, de la semilla y probados con jugadores simulados; los de equipo van de fácil a difícil.
- Para dos:
  - **Carrera de escobas:** mini circuito alrededor de un lago, 3 vueltas. Las escobas derrapan y se puede embestir al otro: quien cae al lago o al barranco pierde un momento. Barro que frena y hongos dorados que impulsan. Quién sale por dentro lo decide el azar.
  - **La garra del mercader:** cada quien su garra sobre el mismo montón de premios (gema 1, huevo 2, conejo 3). Si agarran lo mismo, se lo queda la garra más centrada.
  - **Guerra de bolas de nieve:** cada quien en su trinchera; se lanza solo, derecho hacia adelante. Los muñecos de nieve tapan 3 bolas y vuelven a crecer.
  - **La catapulta mágica:** mantener para cargar y soltar con la fuerza justa; 6 tiros a blancos cerca y lejos, con la barra cada vez más rápida. Reemplaza a las escondidas en la niebla, que no se podían jugar bien en una sola pantalla.
  - **El rey de la tortuga:** los dos sobre un caparazón que se inclina hacia el peso y se mece cada vez más; al mejor de 3 rondas.
  - **Hockey de hongos:** mini hockey de mesa con una semilla de luz y dos hongos saltarines; gana quien llega a 5 goles.
- En equipo (contra el guardián o el Rey):
  - **Escobas contra el carruaje:** el mismo circuito; entre los dos dan 6 vueltas antes de que el carruaje dé 3. Chocar con él saca de la pista.
  - **Defiende la muralla:** ogros hipnotizados suben por los caminos; la magia sale sola. Los ogros grandes tienen escudo y solo se rompe si les aciertan los dos casi a la vez (el escudo toma el color de quien acertó primero). La muralla aguanta 5 golpes.
  - **La garra en equipo:** una garra; la izquierda la detiene de lado a lado y la derecha adelante y atrás. Su sombra en el piso muestra dónde va a bajar. Hay que sacar 7 premios.
  - **La mina:** quien maneja esquiva rocas por tres rieles; quien pica golpea las piedras brillantes cuando pasan por el aro dorado. A la mitad cambian de papel. 14 piedras, 3 vidas.
  - **La poción:** quien revuelve calienta la olla sin pasarse; quien cocina echa los 5 ingredientes de la receta cuando hierve. Con cada poción cambian de papel. 3 pociones, 3 vidas.
  - **El globo:** cada quien tira de su cuerda (izquierda o derecha); los dos a la vez avivan el fuego y suben más rápido. Hay que llegar a 100 metros esquivando ramas y cuervos, con 4 vidas.
- Con jugadores simulados, el equipo gana: carruaje ~94 %, muralla ~73 %, garra en equipo ~84 %, mina ~92 %, poción ~91 %, globo ~78 %. Los de dos están parejos (diferencia menor al 15 %) y duran entre 12 y 36 segundos.
- La computadora también los juega, calibrada como los demás.
- Por confirmar jugando: si la carrera se entiende con los controles de celular, y si la poción y la garra en equipo se coordinan bien.

## V4.3: batallas de jefe (lista)
Los guardianes dejan de ser un minijuego cualquiera y pasan a ser una batalla propia, en equipo, en una arena redonda. Ritmo de cada batalla: el jefe ataca (se esquiva), después queda **mareado** unos segundos (estrellitas sobre la cabeza) y ahí se le pega chocándolo, hasta 3 golpes por mareo. Con cada golpe se pone más rápido; la primera parte es generosa para aprender. 5 vidas compartidas; la barra de vida del jefe se ve arriba.
- **Conejo Gigante (a un cuarto):** salta hacia uno de los dos (su sombra en el piso avisa dónde cae). Al caer hace una onda con dos huecos opuestos: hay que ponerse en un hueco o alejarse. Entre saltos lanza zanahorias (marcas rojas). Después de 3 saltos queda mareado. 9 golpes.
- **Troll Hipnotizado (a la mitad):** tira 2 rocas (su sombra roja avisa dónde caen) que quedan en el piso. Después mira a uno (franja roja) y embiste en línea recta: si choca con una roca queda atontado; si llega al borde, solo se detiene. Quien es mirado se esconde detrás de una roca; el otro se aparta. 8 golpes.
- **Rey Sombrío (a tres cuartos), en tres partes:** primero gira su bigote como látigo (rojo y transparente mientras avisa) y se cansa tras 2 giros; después alterna látigos con rayos oscuros y uno dorado: tocar el dorado se lo devuelve y lo marea; al final, solo cuentan los golpes de los dos casi a la vez (0,6 s). 9 golpes.
- En «uno contra otro» siguen siendo en equipo, con 1 gema extra para quien dé más golpes (empate: nadie).
- También se pueden jugar en el Arcade, en su propia sección, y contra la computadora.
- Con jugadores simulados, el equipo gana: conejo ~77 % (~22 s), troll ~71 % (~31 s), Rey ~77 % (~17 s).
- Se dejó para más adelante la batalla final del modo juntos en la puerta del castillo: con los tres guardianes como batallas ya hay tres peleas por partida.
- Por confirmar jugando: si se entiende cuándo pegar, si las ondas del conejo y la embestida del troll se leen bien en celular, y si el golpe juntos del Rey se coordina.

## V4.4: reliquias (lista)
Objetos que duran toda la partida, con un poder pequeño y fijo. Se ven bajo el nombre de cada quien; al pasar el dedo o el ratón se lee qué hacen, y la ayuda las lista todas.
- **Altares:** cada tablero tiene 2 o 3, en desvíos lejanos (2 a 4 casillas fuera del camino), y se ven desde lejos con su reliquia flotando. Al pasar te detienes; se la lleva quien llega primero y el altar queda vacío.
- **Siete reliquias de altar:** Bolsa sin fondo (5 cartas en la mano), Moneda del mercader (todo cuesta 1 gema menos), Botas de siete leguas (un 1 en el dado vale 3), Farol de luciérnagas (de noche, gemas y fogatas dan +2), Amuleto del duende (las trampas quitan hasta 2 menos), Raíz del roble (el pozo y el gusano ya no te hacen retroceder) y Corona de flores (cada estrella da también 1 gema).
- **Modo juntos:** las reliquias son del equipo y sirven a los dos. Cada guardián vencido da una reliquia de equipo: Corazón de roble (+1 corazón y uno más de máximo), Vela del alba (al perder un minijuego, la Sombra avanza 1 menos) o Cuerno del alba (al ganar, retrocede 1 más).
- Equilibrio: los altares lejanos a 2–4 casillas no suben las palizas (20 gemas o más: ~17 %), y la reliquia se reparte entre quien gana y quien pierde.
- Por confirmar jugando: si vale la pena el desvío, y si se entiende qué hace cada reliquia.

### V4.4.1: arreglo de «Salta el rayo»
- El minijuego se quedaba congelado al terminar la cuenta regresiva: la escena guardaba un dato con el mismo nombre que la función que invierte los controles. Ya se juega normal.
- Una prueba nueva revisa que ninguna escena de minijuego repita ese error.

## Después
- **Siguiente:** más cartas (unas 40), algunas ligadas a las reliquias.
- Misión secreta. Ojo: en una pantalla compartida el otro la vería. Opciones: revelarla al final, mirarla con «el otro cierra los ojos» o esperar a la sala con código.

## Más adelante
- Sala con código: cada quien en su celular. Con eso, más de dos jugadores.
- Poderes propios de cada personaje.
- Más personajes y más apariencias.
- Más adornos y sonidos.

## Decisiones tomadas
- El dado normal es la base; los dados especiales son cartas.
- No se puede saber si una casilla es buena o mala antes de caer.
- Nivelar un poco, a la vista y sin regalar el triunfo: quien juega mejor debe ganar más.
- La pérdida máxima por casilla ronda las 5 gemas.
- Todo debe jugarse en PC y en celular, con una sola pantalla compartida.
- Las reglas (`src/core`) no conocen gráficos: cada acción entra por `session.dispatch`, para conectar salas en línea sin reescribir.
