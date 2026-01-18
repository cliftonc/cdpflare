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
      '/query': {
        target: 'https://cdpflare-query-api.clifton-cunningham.workers.dev',
        changeOrigin: true,
        secure: true,
      },
      '/tables': {
        target: 'https://cdpflare-query-api.clifton-cunningham.workers.dev',
        changeOrigin: true,
        secure: true,
      },
      '/health': {
        target: 'https://cdpflare-query-api.clifton-cunningham.workers.dev',
        changeOrigin: true,
        secure: true,
      },
      '/duckdb': {
        target: 'https://cdpflare-query-api.clifton-cunningham.workers.dev',
        changeOrigin: true,
        secure: true,
      },
      // Proxy ingest API routes for local development
      '/v1': {
        target: 'https://cdpflare-event-ingest.clifton-cunningham.workers.dev',
        changeOrigin: true,
        secure: true,
      },
      // Proxy cube API routes for local development
      '/cubejs-api': {
        target: 'https://cdpflare-query-api.clifton-cunningham.workers.dev',
        changeOrigin: true,
        secure: true,
      },
    },
  },
});
