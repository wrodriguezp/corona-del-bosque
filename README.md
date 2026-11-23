# La Corona del Bosque Errante

Juego de tablero 3D para dos jugadores en un mismo equipo. Todo está hecho con código (Three.js): sin imágenes ni archivos de audio.

- **Jugar sin servidor:** abre `dist/index.html`.
- **Desarrollar:** `npm install` y `npm run dev` (http://localhost:5173). `visor.html` muestra los personajes.
- **Compilar:** `npm run build` · **Pruebas:** `npm test`

`src/core` contiene las reglas puras (sin gráficos), `src/view` el mundo 3D y `src/ui` la interfaz.

## Qué hay en la V2
Cada casilla es una sorpresa: aventuras con decisiones, mercado, cueva del dragón, águila, gusano gigante, trampas y cartas. Tres minijuegos para dos (duelo, lluvia de gemas y hechizos al fugitivo), con teclado y mouse o táctiles. La partida se guarda sola.

El plan de las siguientes entregas está en [ROADMAP.md](ROADMAP.md). Cada entrega tiene su etiqueta en git: `git checkout v1` vuelve a la primera.
