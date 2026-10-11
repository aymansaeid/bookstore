import { describe, expect, it } from 'vitest';

import { isChunkLoadError } from '@/app/isChunkLoadError';

describe('isChunkLoadError', () => {
  it.each([
    'Failed to fetch dynamically imported module: https://kitapefendi.com/assets/BookPage-abc.js',
    'error loading dynamically imported module: https://kitapefendi.com/assets/BookPage-abc.js',
    'Importing a module script failed.',
    'Unable to preload CSS for /assets/BookPage-abc.css',
  ])('recognises "%s"', (message) => {
    expect(isChunkLoadError(new TypeError(message))).toBe(true);
  });

  it('ignores ordinary errors and non-errors', () => {
    expect(isChunkLoadError(new Error('Cannot read properties of undefined'))).toBe(false);
    expect(isChunkLoadError('Failed to fetch dynamically imported module')).toBe(false);
    expect(isChunkLoadError(undefined)).toBe(false);
  });
});
