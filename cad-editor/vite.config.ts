import { defineConfig } from 'vite';

export default defineConfig({
  optimizeDeps: {
    // opencascade.js does its own Emscripten WASM loading via locateFile; let it be
    // dynamically imported as-is instead of esbuild pre-bundling the ~65MB module.
    exclude: ['opencascade.js'],
  },
  build: {
    chunkSizeWarningLimit: 2000,
  },
});
