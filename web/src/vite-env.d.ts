/// <reference types="vite/client" />

interface ViteTypeOptions {
  // Only the variables declared below may be read from import.meta.env.
  strictImportMetaEnv: unknown;
}

interface ImportMetaEnv {
  readonly VITE_ENABLE_MOCK_PAYMENTS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
