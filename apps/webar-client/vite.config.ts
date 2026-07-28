import basicSsl from '@vitejs/plugin-basic-ssl';
import { defineConfig } from 'vite';

const useHttps = process.env.WEBAR_HTTPS === 'true';
const localAssetApiTarget =
  process.env.WEBAR_LOCAL_ASSET_API_URL?.trim() || 'http://127.0.0.1:4002';

const localAssetProxy = {
  '/local-asset-api': {
    target: localAssetApiTarget,
    changeOrigin: true,
    rewrite: (path: string) => path.replace(/^\/local-asset-api/, ''),
  },
};

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
    proxy: localAssetProxy,
  },
  preview: {
    host: '0.0.0.0',
    port: 4174,
    strictPort: true,
    https: useHttps,
    proxy: localAssetProxy,
  },
});
