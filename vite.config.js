import { defineConfig } from 'vite';

// La versión compilada es un script clásico con fuentes incrustadas:
// así dist/index.html se puede abrir con doble clic, sin servidor.
const openFromDisk = {
  name: 'abrir-sin-servidor',
  enforce: 'post',
  transformIndexHtml: (html) => html.replace(/<script type="module" crossorigin/g, '<script defer').replace(/<link rel="stylesheet" crossorigin/g, '<link rel="stylesheet"'),
};

export default defineConfig({
  base: './',
  server: { port: 5173, host: true, strictPort: true },
  build: {
    target: 'es2020',
    assetsInlineLimit: 1e7,
    chunkSizeWarningLimit: 3000,
    modulePreload: false,
    rollupOptions: { output: { format: 'iife', entryFileNames: 'juego.js', assetFileNames: 'juego[extname]' } },
  },
  plugins: [openFromDisk],
});
