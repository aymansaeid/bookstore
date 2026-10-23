import { useId, useState } from 'react';

import { countriesPhrase, countryName, formatCount } from '@/shared/lib/format';

import { COUNTRY_PRESETS, searchCountries } from '../countries';

import local from './Shipping.module.css';

interface CountryPickerProps {
  value: string[];
  onChange: (codes: string[]) => void;
  /** Countries in OTHER zones → that zone's name. One country, one zone. */
  taken: ReadonlyMap<string, string>;
  error?: string | undefined;
}

/** Countries of a zone: search by Arabic name or ISO code, or add a region in one go. */
export function CountryPicker({ value, onChange, taken, error }: CountryPickerProps) {
  const inputId = useId();
  const [query, setQuery] = useState('');
  const [note, setNote] = useState<string | null>(null);
  const suggestions = searchCountries(query);
  const sorted = [...value].sort((a, b) => countryName(a).localeCompare(countryName(b), 'ar'));

  const add = (codes: string[]) => {
    const fresh = codes.filter((code) => !value.includes(code) && !taken.has(code));
    const skipped = codes.filter((code) => taken.has(code)).length;
    if (fresh.length > 0) onChange([...value, ...fresh]);
    setNote(skipped > 0 ? `تخطّينا ${countriesPhrase(skipped)} لأنها في مناطق أخرى.` : null);
  };

  return (
    <fieldset className={local.picker}>
      <legend className={local.legend}>الدول ({formatCount(value.length)})</legend>

      {sorted.length > 0 && (
        <ul className={local.chips}>
          {sorted.map((code) => (
            <li key={code} className={local.chip}>
              <span>{countryName(code)}</span>
              <bdi className={local.chipCode}>{code}</bdi>
              <button
                type="button"
                className={local.chipRemove}
                aria-label={`إزالة ${countryName(code)}`}
                onClick={() => {
                  onChange(value.filter((other) => other !== code));
                }}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}

      <label htmlFor={inputId} className={local.searchLabel}>
        أضف دولة
      </label>
      <input
        id={inputId}
        className={local.search}
        type="search"
        dir="auto"
        autoComplete="off"
        placeholder="اكتب اسم الدولة أو رمزها، مثل ألمانيا أو DE"
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
        }}
        onKeyDown={(event) => {
          if (event.key !== 'Enter') return;
          event.preventDefault();
          const first = suggestions.find((c) => !value.includes(c.code) && !taken.has(c.code));
          if (first) {
            add([first.code]);
            setQuery('');
          }
        }}
      />
      {suggestions.length > 0 && (
        <ul className={local.suggestions} aria-label="نتائج البحث">
          {suggestions.map((country) => {
            const owner = taken.get(country.code);
            const added = value.includes(country.code);
            return (
              <li key={country.code}>
                <button
                  type="button"
                  className={local.suggestion}
                  disabled={added || owner !== undefined}
                  onClick={() => {
                    add([country.code]);
                    setQuery('');
                  }}
                >
                  <span>{country.name}</span>
                  <bdi className={local.chipCode}>{country.code}</bdi>
                  {added && <span className={local.why}>مضافة</span>}
                  {owner !== undefined && <span className={local.why}>في «{owner}»</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {query.trim() !== '' && suggestions.length === 0 && (
        <p className={local.why}>لا دولة بهذا الاسم أو الرمز.</p>
      )}

      <div className={local.presets}>
        {COUNTRY_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            className={local.preset}
            onClick={() => {
              add(preset.codes);
            }}
          >
            + {preset.label}
          </button>
        ))}
      </div>
      {note && (
        <p className={local.why} role="status">
          {note}
        </p>
      )}
      {error && (
        <p className={local.error} role="alert">
          {error}
        </p>
      )}
    </fieldset>
  );
}