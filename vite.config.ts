import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

const BACKENDS = {
  gateway: 'http://192.168.5.5:8090',
  router: 'http://192.168.5.5:5001',
  llama: 'http://192.168.5.5:8080',
};

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 3000,
    host: true,
    proxy: {
      '/api/gateway': {
        target: BACKENDS.gateway,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/gateway/, ''),
      },
      '/api/router': {
        target: BACKENDS.router,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/router/, ''),
      },
      '/api/llama': {
        target: BACKENDS.llama,
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/llama/, ''),
      },
    },
  },
});
