import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    outDir: 'renderer-dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html')
      }
    }
  },
  server: {
    port: 5173,
    strictPort: true
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './renderer')
    }
  }
});
