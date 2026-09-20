/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_NOAA_SWPC_URL?: string;
  readonly VITE_CELESTRAK_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
