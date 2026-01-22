import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: '/',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api/query': {
        target: 'https://icelight-query-api.clifton-cunningham.workers.dev',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/tables': {
        target: 'https://icelight-query-api.clifton-cunningham.workers.dev',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/health': {
        target: 'https://icelight-query-api.clifton-cunningham.workers.dev',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      '/api/duckdb': {
        target: 'https://icelight-query-api.clifton-cunningham.workers.dev',
        changeOrigin: true,
        secure: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
      // Proxy ingest API routes for local development
      '/v1': {
        target: 'https://icelight-event-ingest.clifton-cunningham.workers.dev',
        changeOrigin: true,
        secure: true,
      },
      // Proxy cube API routes for local development
      '/cubejs-api': {
        target: 'https://icelight-query-api.clifton-cunningham.workers.dev',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
