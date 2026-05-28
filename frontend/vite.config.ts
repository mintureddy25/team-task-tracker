import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite dev server proxies all /api/* and /notifications/stream to the Express
// backend so the SPA can use relative URLs and avoid CORS in dev.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ''),
      },
      '/notifications/stream': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});
