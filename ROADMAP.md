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
- Ciclo de día y noche: de noche hay más peligro y mejores premios.
- Eventos cada pocas rondas: el bosque camina, vuela el dragón, eclipse, cumbres heladas.
- Reliquias que cambian tus reglas toda la partida.
- Maldiciones con duración limitada, que se quitan en un altar (no se contagian).
- Misión secreta por jugador.
- Poderes propios de cada personaje.
- Dos minijuegos más: tira y afloja al ritmo, memoria de runas.
- Premios finales sorpresa antes de coronar (más duelos, más caídas, más caminata).
- Llegar a unas 30 cartas.

## V4: modo cooperativo
La sombra devora el tablero, tres runas por reunir y minijuegos en equipo.

## Más adelante
- Sala con código: cada quien en su celular.
- Más personajes y más apariencias.
- Más adornos y sonidos.

## Decisiones tomadas
- El dado normal es la base; los dados especiales son cartas.
- No se puede saber si una casilla es buena o mala antes de caer.
- Nivelar un poco, a la vista y sin regalar el triunfo: quien juega mejor debe ganar más.
- La pérdida máxima por casilla ronda las 5 gemas.
- Todo debe jugarse en PC y en celular, con una sola pantalla compartida.
- Las reglas (`src/core`) no conocen gráficos: cada acción entra por `session.dispatch`, para conectar salas en línea sin reescribir.
