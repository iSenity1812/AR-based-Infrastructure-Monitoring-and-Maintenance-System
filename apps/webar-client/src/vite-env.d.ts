/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_ASSET_API_URL?: string;
  readonly VITE_MONITORING_API_URL?: string;
  readonly VITE_MONITORING_SOCKET_URL?: string;
  readonly VITE_ASSET_CONTEXT_API_URL?: string;
  readonly VITE_MINDAR_IMAGE_TARGET_SRC?: string;
  readonly VITE_MINDAR_TARGET_IMAGE_SRC?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
