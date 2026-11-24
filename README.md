# 👑 La Corona del Bosque Errante

Juego de tablero 3D de aventura mágica para dos personas en la misma pantalla, en PC o celular. Cada reino se genera al azar y **todo está hecho con código**: modelos, sonidos, efectos e iconos, sin imágenes ni archivos de audio.

Una princesa y un mago cruzan un bosque donde cada casilla es una sorpresa. Tiren el dado, elijan camino y junten gemas: gana quien termine con más, no solo quien llegue primero.

- Aventuras con decisiones, algunas con consecuencias turnos después.
- Mercado, cueva del dragón, un águila que te lleva y un gusano que te traga.
- Dieciséis minijuegos para dos: duelo de hechizos, lluvia de gemas, hechizos al fugitivo, tira y afloja, memoria de runas, salta el rayo, choque en el hielo, huevo de dragón, burbuja valiente, el dragón dormido, cuenta conejos, la pesca, ritmo de hongos, pinta el claro, topos del jardín y la torre de piedras.
- El Rey Sombrío, un villano bruto y bigotudo, manda la Sombra: avanza desde la salida, cada vez más rápido, y si te alcanza pierdes gemas y te escupe hacia adelante. Sus secuaces son conejos y trolls hipnotizados.
- Criaturas que vagan por el tablero: conejos y hadas que ayudan, lobos y trolls que estorban.
- Cerca del castillo las gemas y las fogatas dan más, hasta que alguien llega.
- Tres guardianes cierran el camino (el Conejo Gigante, el Troll Hipnotizado y el Rey Sombrío): quien llega se detiene y juegan juntos un minijuego en equipo (faroles, remar juntos, el escudo de luz, el puente, pasar la llama o runas en equipo). Ganan o pierden los dos, y cada minijuego empieza fácil y se pone difícil al final.
- 28 cartas y gemas para gastar en pleno turno.
- Un final justo: quien llega primero gana 10 gemas, queda a salvo y sigue jugando desde el castillo con su cofre y su torre.
- Día y noche, y un mundo que cambia: bosques que caminan, lagos que se congelan, eclipses, estrellas caídas y un dragón que sale a volar.
- Un hada madrina que le da una mano a quien va atrás.
- Cada 3 vueltas hay una ronda de minijuegos: un torneo y, cada tercera ronda, uno en equipo contra el Rey.
- **Arcade:** desde el menú se puede jugar cualquier minijuego suelto, con marcador.
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

`visor.html` muestra los personajes de cerca. El plan de entregas está en [ROADMAP.md](ROADMAP.md); cómo trabajar, observaciones de las pruebas y pendientes, en [CLAUDE.md](CLAUDE.md) y cada una tiene su etiqueta (`v1`, `v2`, `v2.1`, `v3.0`, `v3.1`, `v3.1.1`…).
