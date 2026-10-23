import { arabicFold } from '@/shared/lib/arabicFold';

const names = new Intl.DisplayNames(['ar'], { type: 'region', fallback: 'none' });

/** Codes Intl can name that are not current ISO 3166-1 countries (groupings, old states, test codes). */
const NOT_COUNTRIES = new Set(
  ['AC AN BU CP CS DD DG DY EA EU EZ FX HV IC NH', 'QO RH SU TA TP UK UN VD XA XB YD YU ZR ZZ']
    .join(' ')
    .split(' '),
);

export interface Country {
  code: string;
  name: string;
  folded: string;
}

let all: Country[] | null = null;

/** Every country the browser can name in Arabic, built once from AA–ZZ. */
export function allCountries(): Country[] {
  if (all) return all;
  const result: Country[] = [];
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      if (NOT_COUNTRIES.has(code)) continue;
      const name = names.of(code);
      if (name && name !== code) result.push({ code, name, folded: arabicFold(name) });
    }
  }
  all = result.sort((x, y) => x.name.localeCompare(y.name, 'ar'));
  return all;
}

/** By Arabic name (any spelling of hamza) or by code. */
export function searchCountries(query: string, limit = 8): Country[] {
  const text = query.trim();
  if (text === '') return [];
  const code = text.toUpperCase();
  const folded = arabicFold(text);
  return allCountries()
    .filter((country) => country.code === code || country.folded.includes(folded))
    .sort((x, y) => Number(y.code === code) - Number(x.code === code))
    .slice(0, limit);
}

/** Quick picks for a Turkish bookshop shipping abroad. */
export const COUNTRY_PRESETS: { label: string; codes: string[] }[] = [
  {
    label: 'دول الاتحاد الأوروبي',
    codes: 'AT BE BG HR CY CZ DK EE FI FR DE GR HU IE IT LV LT LU MT NL PL PT RO SK SI ES SE'.split(
      ' ',
    ),
  },
  { label: 'دول الخليج', codes: 'SA AE KW QA BH OM'.split(' ') },
  { label: 'بلاد الشام والعراق', codes: 'SY LB JO PS IQ'.split(' ') },
  { label: 'شمال أفريقيا', codes: 'EG LY TN DZ MA'.split(' ') },
];