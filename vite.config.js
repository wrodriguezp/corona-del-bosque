import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Huella del código del juego: cambia solo si cambia algún archivo de src.
const stamp = (dir = 'src', h = createHash('sha1')) => {
  for (const e of readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const p = join(dir, e.name);
    if (e.isDirectory()) stamp(p, h); else h.update(p).update(readFileSync(p));
  }
  return h;
};

// La versión compilada es un script clásico con fuentes incrustadas:
// así dist/index.html se puede abrir con doble clic, sin servidor.
// El hash en el nombre (juego-[hash].js) cambia en cada build con cambios:
// el navegador baja la versión nueva tras un deploy y reusa la caché si no cambió.
const openFromDisk = {
  name: 'abrir-sin-servidor',
  enforce: 'post',
  transformIndexHtml: (html) => html.replace(/<script type="module" crossorigin/g, '<script defer').replace(/<link rel="stylesheet" crossorigin/g, '<link rel="stylesheet"'),
};

// Cada build lleva su propio sello: si el juego se actualiza, la partida guardada
// con la versión anterior se borra en vez de repetirse mal.
export default defineConfig(({ command }) => ({
  base: './',
  define: { __BUILD__: JSON.stringify(command === 'build' ? stamp().digest('hex').slice(0, 10) : 'dev') },
  server: { port: 5173, host: true, strictPort: true },
  build: {
    target: 'es2020',
    assetsInlineLimit: 1e7,
    chunkSizeWarningLimit: 3000,
    modulePreload: false,
    rollupOptions: { output: { format: 'iife', entryFileNames: 'juego-[hash].js', assetFileNames: 'juego-[hash][extname]' } },
  },
  plugins: [openFromDisk],
}));
