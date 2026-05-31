/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Absolute API base URL in production (e.g. https://task.saitejareddy.online).
   *  Empty/undefined in dev, where the Vite proxy handles /api and /notifications. */
  readonly VITE_API_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
