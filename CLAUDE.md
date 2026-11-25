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
Referencias actuales (V4.4, 600 partidas simuladas):
- Hay 20 o más gemas de diferencia en el ~17–19 % de las partidas (varía con el orden del azar).
- Quien llega primero gana el ~68 %.
- Minijuegos en equipo (bots): faroles ~96 %, remar ~90 %, escudo ~73 %, puente ~93 %, llama ~77 %, runas en equipo ~88 %, cruzar juntos ~71 %, piso ~79 %, carruaje ~94 %, muralla ~73 %, garra en equipo ~84 %, mina ~92 %, poción ~91 %, globo ~78 %.
- Batallas de jefe (bots): conejo ~77 %, troll ~71 %, Rey ~77 %. Reglas en `src/core/minigames/jefes.js`, bots en `src/core/bots3.js`, escena en `src/view/minigames8.js`.
- Princesa y Mago ganan ~50 % cada uno.
- Modo juntos: con 65 % de minijuegos ganados, el equipo gana la partida ~70 % (con 50 %, ~50 %; con 80 %, ~90 %).
- La computadora (`src/core/ai.js` en el tablero, `brain()` de `src/core/bots.js` en los minijuegos) le gana ~70 % a un jugador al azar. En minijuegos gana ~31 / 42 / 48 % según la dificultad. Si cambia un minijuego, recalibrar `TUNE` con `node tools/calibrar.js` (se le pueden pasar ids para calibrar solo esos).

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
- **Después de la V3.5 (comentarios):**
  - Lo más entretenido son los minijuegos, más que avanzar por el tablero. Quieren más cooperativos y no solo competir.
  - Hubo una victoria de sobra que se sintió aburrida.
  - Cuenta conejos se sentía raro: no se notaba si el toque contaba. El ritmo de hongos a veces no detectaba el toque.
  - Faltaba pantalla completa, y al cambiar de lados los personajes no se movían.
  - En el bote (remar juntos) les costó coordinarse: piden que los cooperativos vayan de fácil a difícil.
  - Todo esto, salvo lo cooperativo, se corrigió en la V3.6. Lo cooperativo (guardianes y coop de fácil a difícil), en la V3.7.
- **Por confirmar después de la V4.4:** si vale la pena desviarse a los altares, si se entiende qué hace cada reliquia (bajo el nombre, al pasar el dedo) y si las reliquias de equipo se notan en el modo juntos.
- **Por confirmar después de la V4.3:** si se entiende cuándo pegarle al jefe, si las ondas del conejo y la embestida del troll se leen bien en celular, y si el golpe juntos del Rey se coordina.
- **Por confirmar después de la V4.2:** si los 12 minijuegos nuevos se entienden, sobre todo la carrera en celular, la poción y la garra en equipo.
- **Por confirmar después de la V4.1:** si las tres dificultades contra la computadora se sienten distintas y si sus pausas son muy largas o muy cortas.
- **Por confirmar después de la V4:** si el modo juntos se entiende, si 4 corazones son pocos o muchos y si la ayuda desde la torre sirve.
- **Por confirmar después de la V3.9:** si cruza el camino, la enredadera y el piso que se cae se entienden y divierten.
- **Por confirmar después de la V3.8:** si las rondas cada 3 vueltas son muchas o pocas, y si los tres minijuegos en equipo nuevos se entienden.
- **Por confirmar después de la V3.7:** si el coop de fácil a difícil ya les deja coordinarse y si los tres guardianes por partida se sienten bien o son demasiados.
- **Otros factores:** jugar bien los minijuegos pesa. Con un 75 % de minijuegos ganados se gana ~65 % de las partidas.

## Pendiente
La lista completa está en ROADMAP. Orden acordado:
- **Siguiente:** más cartas (algunas ligadas a las reliquias, que están en `src/core/relics.js`); la misión secreta no es prioridad. Más adelante: sala con código y poderes propios (por ahora no les ven gracia).

## Servidor de vista previa (Claude Code)
`.claude/` no se sube. Para la vista previa, crear `.claude/launch.json` con:
```json
{ "version": "0.0.1", "configurations": [ { "name": "corona", "runtimeExecutable": "npm", "runtimeArgs": ["run", "dev"], "port": 5173 } ] }
```
