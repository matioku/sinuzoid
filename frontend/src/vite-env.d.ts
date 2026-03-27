/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string;
  readonly VITE_AUTH_URL: string;
  readonly VITE_LASTFM_API_KEY: string;
  readonly VITE_LASTFM_SHARED_SECRET: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
