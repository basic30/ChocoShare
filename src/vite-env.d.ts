/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_MAINTENANCE_MODE: string;
  // You can add other environment variables here later
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}