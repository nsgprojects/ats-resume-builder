import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
        timeout: 180000,          // 3 min — matches apiLong client
        proxyTimeout: 180000      // http-proxy option
      }
    }
  }
});
