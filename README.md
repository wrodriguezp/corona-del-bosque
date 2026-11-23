# 👑 La Corona del Bosque Errante

Juego de tablero 3D de aventura mágica para dos personas en la misma pantalla, en PC o celular. Cada reino se genera al azar y **todo está hecho con código**: modelos, sonidos, efectos e iconos, sin imágenes ni archivos de audio.

Una princesa y un mago cruzan un bosque donde cada casilla es una sorpresa. Tiren el dado, elijan camino y junten gemas: gana quien termine con más, no solo quien llegue primero.

- Aventuras con decisiones, algunas con consecuencias turnos después.
- Mercado, cueva del dragón, un águila que te lleva y un gusano que te traga.
- Tres minijuegos para dos: duelo de hechizos, lluvia de gemas y hechizos al fugitivo.
- 27 cartas y gemas para gastar en pleno turno.
- Día y noche, y un mundo que cambia: bosques que caminan, lagos que se congelan, eclipses, estrellas caídas y un dragón que sale a volar.
- Un hada madrina que le da una mano a quien va atrás.
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

`visor.html` muestra los personajes de cerca. El plan de entregas está en [ROADMAP.md](ROADMAP.md) y cada una tiene su etiqueta (`v1`, `v2`, `v2.1`, `v3.0`…).
