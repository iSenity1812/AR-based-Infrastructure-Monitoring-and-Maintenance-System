import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vite';

const useHttps = process.env.WEBAR_HTTPS === 'true';

export default defineConfig({
  plugins: useHttps ? [basicSsl()] : [],
  server: {
    host: '0.0.0.0',
    port: 5174,
    strictPort: true,
    allowedHosts: [
      'footgear-excretory-ethics.ngrok-free.dev',
      '.ngrok-free.dev',
      '.ngrok-free.app',
    ],
    https: useHttps,
  },
  preview: {
    host: '0.0.0.0',
    port: 4174,
    strictPort: true,
    https: useHttps,
  },
});
