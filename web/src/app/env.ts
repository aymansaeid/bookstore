/** Build-time flags, read once. Import from here, never from import.meta.env directly. */
export const env = {
  isDev: import.meta.env.DEV,
  /**
   * The backend only issues mock checkout URLs in Development (it refuses to
   * start with the mock provider otherwise), so the page exists in dev builds
   * and when explicitly enabled for a preview build.
   */
  mockPaymentsEnabled: import.meta.env.DEV || import.meta.env.VITE_ENABLE_MOCK_PAYMENTS === 'true',
  /** '' = same origin (dev proxy). No trailing slash. */
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? '').trim().replace(/\/+$/, ''),
} as const;
