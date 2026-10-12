import { describe, expect, it } from 'vitest';

import {
  countriesPhrase,
  countryName,
  formatAmount,
  formatBadgeCount,
  formatDate,
  formatMoney,
  formatPlainDate,
  formatYear,
} from '@/shared/lib/format';

describe('format', () => {
  it('formats money with Arabic digits and ₺', () => {
    expect(formatMoney(2400)).toBe('٢٬٤٠٠\u00A0₺');
    expect(formatMoney(1304.05)).toBe('١٬٣٠٤٫٠٥\u00A0₺');
    expect(formatAmount(2400.0)).toBe('٢٬٤٠٠');
  });

  it('does not group years', () => {
    expect(formatYear(2026)).toBe('٢٠٢٦');
  });

  it('caps badge counts', () => {
    expect(formatBadgeCount(3)).toBe('٣');
    expect(formatBadgeCount(150)).toBe('٩٩+');
  });

  it('formats dates in Istanbul time, not UTC', () => {
    // 21:30 UTC on 30 Sep is already 1 Oct in Istanbul (UTC+3).
    expect(formatDate('2026-09-30T21:30:00+00:00')).not.toBe(
      formatDate('2026-09-30T20:00:00+00:00'),
    );
    expect(formatDate('2026-09-30T21:30:00+00:00')).toBe(formatPlainDate('2026-10-01'));
  });

  it('never shifts plain dates', () => {
    expect(formatPlainDate('2026-09-30')).toBe(formatDate('2026-09-30T12:00:00+00:00'));
  });

  it('names countries in Arabic and survives bad codes', () => {
    expect(countryName('TR')).toBe('تركيا');
    expect(countryName('??')).toBe('??');
  });

  it('agrees the noun with the number', () => {
    expect(countriesPhrase(1)).toBe('دولة واحدة');
    expect(countriesPhrase(5)).toBe('٥ دول');
    expect(countriesPhrase(62)).toBe('٦٢ دولة');
  });
});
