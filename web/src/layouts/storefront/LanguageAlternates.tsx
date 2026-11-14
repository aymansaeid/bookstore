import { useLocation } from 'react-router';

import { DEFAULT_LANGUAGE, ENABLED_LANGUAGES, pathInLanguage } from '@/app/locale';

/**
 * hreflang links: tell search engines each page exists in every live
 * language. React 19 hoists <link> into <head>. Arabic is x-default.
 */
export function LanguageAlternates() {
  const { pathname } = useLocation();
  if (ENABLED_LANGUAGES.length < 2) return null;
  const origin = window.location.origin;

  return (
    <>
      {ENABLED_LANGUAGES.map((language) => (
        <link
          key={language}
          rel="alternate"
          hrefLang={language}
          href={`${origin}${pathInLanguage(language, pathname)}`}
        />
      ))}
      <link
        rel="alternate"
        hrefLang="x-default"
        href={`${origin}${pathInLanguage(DEFAULT_LANGUAGE, pathname)}`}
      />
    </>
  );
}