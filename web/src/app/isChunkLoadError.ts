/**
 * True when a lazy route's JS/CSS chunk failed to load. This typically
 * happens after a deploy, when an open tab asks for a file hash that no
 * longer exists. Reloading the page fixes it.
 */
const CHUNK_ERROR_PATTERNS = [
  /failed to fetch dynamically imported module/i, // Chromium
  /error loading dynamically imported module/i, // Firefox
  /importing a module script failed/i, // Safari
  /unable to preload css/i, // Vite CSS preload
];

export function isChunkLoadError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return CHUNK_ERROR_PATTERNS.some((pattern) => pattern.test(error.message));
}
