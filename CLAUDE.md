# Guía de trabajo

Juego de tablero 3D para dos personas en la misma pantalla (PC, celular o iPad). Lo juegan en pareja y comentan lo que sienten al jugar; esas observaciones guían cada versión. Qué es el juego: [README.md](README.md). Qué se hizo y qué viene: [ROADMAP.md](ROADMAP.md).

## Cómo se trabaja
- Se habla en español, con tono cálido.
- **Al terminar cada entrega:** subir la versión en `package.json`, actualizar README y ROADMAP, hacer commit, ponerle etiqueta (`v3.5`, `v3.5.1`…) y hacer `git push` con las etiquetas, sin preguntar.
- **No publicar el sitio:** eso se hace aparte.
- **Si las reglas cambian de forma que una partida guardada ya no se repite igual** (orden del azar, eventos), subir `SAVE_VERSION` en `src/core/session.js`. Los guardados viejos se borran solos.
- **Nada personal** (nombres reales, rutas de la computadora, correos) en código, comentarios ni archivos `.md`. Ser autor de los commits está bien. Antes de cada commit:
  ```bash
  git grep --untracked -niE "/home/|gmail|@.*\.(com|cl)" -- . ':!package-lock.json'
  ```

## Reglas de diseño (no cambiarlas sin preguntar)
- **Sin pistas:** nunca mostrar si una casilla es buena o mala antes de caer.
- **Dados especiales:** existen solo como cartas.
- **Minijuegos:** cortos, deterministas (todo sale de la semilla) y probados con jugadores simulados.
- **Equilibrio:** los cambios son pequeños («un poco»). Quien juega mejor debe ganar más; el hada madrina ayuda sin regalar el triunfo.
- **Textos sin ambigüedad:** cada mensaje dice el efecto real, con números.
- **Instrucciones de minijuegos:** van en tres pasos (`goal: [así es, qué haces, cómo se gana]`) y se escriben para alguien que nunca jugó algo parecido: primero qué se ve, después qué hacer con las manos y al final cómo se gana.
- **Todo** se juega en PC y en celular con una sola pantalla.

## Arquitectura en corto
- **`src/core`:** reglas puras. Toda acción entra por `Session.dispatch` y devuelve eventos, y todo el azar sale de `g.rng`. Con la misma semilla y las mismas acciones, la partida se repite igual.
- **`src/main.js`:** anima cada evento con `play[e.t]`. Ojo: cuando se reproducen los eventos, `g` ya está en su estado final.
- **`src/view`:** Three.js, todo hecho con código.
- **`src/ui/hud.js`:** interfaz y textos, incluida la ayuda «Cómo se juega», que se actualiza con cada regla nueva.

## Probar
```bash
npm install
npm test               # reglas, equilibrio y minijuegos
npm run build
node tools/medir.js    # palizas, quién gana, eventos por partida
node tools/final.js    # ¿conviene llegar primero?
```
Referencias actuales (V3.5, 600 partidas simuladas):
- Hay 20 o más gemas de diferencia en el ~20 % de las partidas.
- Quien llega primero gana el ~71 %.
- Princesa y Mago ganan ~50 % cada uno.

### En el navegador (`npm run dev`)
- `window.__corona` da acceso al juego. Por ejemplo:
  ```js
  const C = window.__corona; C.hud.fast = true; C.ff(5)
  ```
  `fast` acelera los mensajes y `C.ff(5)` adelanta 5 segundos.
- Con la pestaña oculta las animaciones no avanzan: usar `C.ff` en vez de esperar `stage.focus`.
- Renderizar justo antes de una captura.
- **Cargar una partida a medias:** guardar `{v, build:'dev', opts:{names,len,seed,skin}, log}` en `localStorage['corona-partida']`, recargar y pulsar «Continuar».
- Revisar también en tamaño celular, de pie y acostado.

## Lo que observaron jugando
- **V3.4 (3 partidas):**
  - El ritmo y la exploración se sienten mejor y los controles funcionan bien.
  - El Mago ganó siempre, incluso yendo atrás. Causas que se encontraron:
    - El Toque dorado duplicaba también los extras.
    - El último tramo premiaba a quien iba lento.
    - Las travesuras seguían funcionando contra quien ya había llegado.
    - El hada seguía ayudando en los turnos finales.
  - Nunca les salió el minijuego en equipo.
  - Las instrucciones de los minijuegos no se entendían; la del ritmo de hongos, para nada.
  - Todo esto se corrigió en la V3.5.
- **Por confirmar en la próxima prueba:**
  - Si ahora conviene llegar primero.
  - Si las nuevas instrucciones se entienden sin haber jugado.
  - Cómo se ve en celular e iPad.
- **Otros factores:** jugar bien los minijuegos pesa. Con un 75 % de minijuegos ganados se gana ~65 % de las partidas.

## Pendiente
La lista completa está en ROADMAP («Después», V4 y «Más adelante»). Lo más pedido:
- **Modo totalmente cooperativo (V4):** ganan o pierden juntos contra la Sombra.
- **Más minijuegos en equipo:** el puente, pasar la llama, runas en equipo.
- **Reliquias, misión secreta y más cartas.**

## Servidor de vista previa (Claude Code)
`.claude/` no se sube. Para la vista previa, crear `.claude/launch.json` con:
```json
{ "version": "0.0.1", "configurations": [ { "name": "corona", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 5173 } ] }
```
