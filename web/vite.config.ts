/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url';

import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv, type ProxyOptions } from 'vite';

/**
 * Dev and preview both run on http://localhost:3000, because the backend's
 * email links and payment redirects point there (Store:StorefrontBaseUrl).
 *
 * /api and /uploads are proxied to the .NET API so the browser sees a single
 * origin: the HttpOnly refresh cookie (Path=/api/customers/auth, Secure,
 * SameSite=Lax) then works without any CORS setup. Browsers treat
 * http://localhost as a secure context, so a Secure cookie is accepted here.
 */
export default defineConfig(({ mode }) => {
  // Read without the VITE_ prefix on purpose: the proxy target is build
  // tooling config and must never be exposed to client code.
  const env = loadEnv(mode, process.cwd(), '');
  // An empty value in .env.local also means "use the default".
  const configuredTarget = env.API_PROXY_TARGET?.trim() ?? '';
  const apiTarget = configuredTarget.length > 0 ? configuredTarget : 'https://localhost:7048';

  const toApi: ProxyOptions = {
    target: apiTarget,
    changeOrigin: true,
    // The API uses the self-signed ASP.NET Core dev certificate.
    secure: false,
  };
  const proxy: Record<string, ProxyOptions> = {
    '/api': toApi,
    '/uploads': toApi,
  };

  return {
    plugins: [react()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    server: { port: 3000, strictPort: true, proxy },
    preview: { port: 3000, strictPort: true, proxy },
    build: { target: 'es2022', sourcemap: true },
    test: {
      environment: 'node',
      include: ['src/**/*.test.{ts,tsx}'],
    },
  };
});
