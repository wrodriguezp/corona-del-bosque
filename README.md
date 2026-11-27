# 👑 La Corona del Bosque Errante

Juego de tablero 3D de aventura mágica para dos personas en la misma pantalla, en PC o celular. Cada reino se genera al azar y **todo está hecho con código**: modelos, sonidos, efectos e iconos, sin imágenes ni archivos de audio.

Una princesa y un mago cruzan un bosque donde cada casilla es una sorpresa. Tiren el dado, elijan camino y junten gemas: gana quien termine con más, no solo quien llegue primero.

- Aventuras con decisiones, algunas con consecuencias turnos después.
- Mercado, cueva del dragón, un águila que te lleva y un gusano que te traga.
- Veinticuatro minijuegos para dos: duelo de hechizos, lluvia de gemas, hechizos al fugitivo, tira y afloja, memoria de runas, salta el rayo, choque en el hielo, huevo de dragón, burbuja valiente, el dragón dormido, cuenta conejos, la pesca, ritmo de hongos, pinta el claro, topos del jardín, la torre de piedras, cruza el camino, la enredadera, carrera de escobas, la garra del mercader, guerra de bolas de nieve, la catapulta mágica, el rey de la tortuga y hockey de hongos.
- El Rey Sombrío, un villano bruto y bigotudo, manda la Sombra: avanza desde la salida, cada vez más rápido, y si te alcanza pierdes gemas y te escupe hacia adelante. Sus secuaces son conejos y trolls hipnotizados.
- Criaturas que vagan por el tablero: conejos y hadas que ayudan, lobos y trolls que estorban.
- Cerca del castillo las gemas y las fogatas dan más, hasta que alguien llega.
- Catorce minijuegos en equipo (faroles, remar juntos, el escudo de luz, el puente, pasar la llama, runas en equipo, cruzar juntos, el piso que se cae, escobas contra el carruaje, defiende la muralla, la garra en equipo, la mina, la poción y el globo). Ganan o pierden los dos, y cada minijuego empieza fácil y se pone difícil al final.
- Tres guardianes cierran el camino, y cada uno es una **batalla de jefe** en equipo: el jefe ataca y hay que esquivar; cuando queda mareado, se le pega chocándolo. Con cada golpe se pone más rápido. El **Conejo Gigante** salta, hace ondas con dos huecos y lanza zanahorias; el **Troll Hipnotizado** tira rocas y embiste (si choca con una roca queda atontado); el **Rey Sombrío** pelea en tres partes: bigote látigo, rayos (el dorado se le devuelve) y, al final, solo le duelen los golpes de los dos a la vez. Tienen 5 vidas entre los dos. En «uno contra otro», quien pega más golpes gana 1 gema extra.
- **Reliquias:** objetos que duran toda la partida, con un poder pequeño y fijo (guardar 5 cartas, comprar 1 gema más barato, que las trampas quiten 2 menos…). En «uno contra otro» están en altares, en los desvíos más lejanos, y se las lleva quien llega primero. En el modo juntos son del equipo, y cada guardián vencido da una más (un corazón extra o frenar la Sombra).
- 31 cartas (3 solo del modo juntos) y gemas para gastar en pleno turno.
- Un final justo: quien llega primero gana 10 gemas, queda a salvo y sigue jugando desde el castillo con su cofre y su torre.
- Día y noche, y un mundo que cambia: bosques que caminan, lagos que se congelan, eclipses, estrellas caídas y un dragón que sale a volar.
- Un hada madrina que le da una mano a quien va atrás.
- Cada 3 vueltas hay una ronda de minijuegos: un torneo y, cada tercera ronda, uno en equipo contra el Rey.
- Antes de cada minijuego se puede ver una demo (la computadora juega por los dos y se iluminan las teclas) o practicar sin que cuente. Los nombres quedan guardados en el navegador.
- **Modo juntos:** en el menú se elige entre jugar uno contra otro o juntos contra el Rey Sombrío. En el modo juntos comparten 4 corazones (5 en Tranquila y 3 en Difícil), vencen a los tres guardianes para reunir tres runas y ganan cuando llegan los dos al castillo. Todos los minijuegos son en equipo, hay cartas de equipo y quien llega primero ayuda desde la torre.
- **Jugar solo:** en el menú se elige «Yo y la computadora». Tú juegas con la princesa y la computadora con el mago, en los dos modos y en el Arcade. Hay tres dificultades (Tranquila, Normal y Difícil). La computadora decide con lo mismo que ve una persona: nunca mira lo que esconde una casilla.
- **Arcade:** desde el menú se puede jugar cualquier minijuego suelto, con marcador, y también las tres batallas de jefe.
- Pantalla completa, y en los minijuegos cada quien elige su lado: los personajes se cambian con los controles.
- Partida guardada automáticamente.

## Jugar y desarrollar
Requiere Node 20.19 o posterior.

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # reglas, equilibrio y minijuegos
npm run build    # genera dist/
```

`dist/` es un sitio estático con rutas relativas: se puede abrir con doble clic en `dist/index.html` o subir a cualquier alojamiento estático (comando de compilación `npm run build`, carpeta `dist`).

## Cómo está organizado
| Carpeta | Contenido |
|---|---|
| `src/core` | Reglas puras, sin gráficos: cada acción entra por `Session.dispatch` y devuelve eventos |
| `src/view` | Mundo 3D con Three.js: tablero, personajes, criaturas, dados, minijuegos |
| `src/ui` | Interfaz, textos y estilos |
| `test`, `tools` | Pruebas y simulador de partidas (`node tools/medir.js`) |

`visor.html` muestra los personajes de cerca. El plan de entregas está en [ROADMAP.md](ROADMAP.md); cómo trabajar, observaciones de las pruebas y pendientes, en [CLAUDE.md](CLAUDE.md) y cada una tiene su etiqueta (`v1`, `v2`, `v3.0`, `v4`, `v4.1`…).
