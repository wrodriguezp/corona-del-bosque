# La Corona del Bosque Errante

Juego de tablero 3D para dos jugadores en un mismo equipo. Todo está hecho con código (Three.js): sin imágenes ni archivos de audio.

- **Jugar sin servidor:** abre `dist/index.html`.
- **Desarrollar:** `npm install` y `npm run dev` (http://localhost:5173). `visor.html` muestra los personajes.
- **Compilar:** `npm run build` · **Pruebas:** `npm test`

`src/core` contiene las reglas puras (sin gráficos), `src/view` el mundo 3D y `src/ui` la interfaz.

## Etapas
1. [x] Tablero, niebla, dado, caminos, gemas, trampas, portales y cartas de oportunidad
2. [ ] Eventos de aventura con decisiones, mercader y poderes de personaje
3. [ ] Minijuegos competitivos (mouse y teclado)
4. [ ] Modo cooperativo: la sombra y las runas
5. [ ] Más personajes, pulido y juego en móvil
