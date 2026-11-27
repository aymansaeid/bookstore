import { useQuery } from '@tanstack/react-query';
import { Trans, useTranslation } from 'react-i18next';
import { NavLink, useParams } from 'react-router';

import { DEFAULT_LANGUAGE, pathInLanguage, UI_LANGUAGE } from '@/app/locale';
import { paths } from '@/app/paths';
import { LEGAL_LINKS, LEGAL_TYPE_BY_SLUG, legalApi } from '@/features/legal/api';
import NotFoundPage from '@/pages/not-found/NotFoundPage';
import { ApiError } from '@/shared/api/ApiError';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';
import { Prose } from '@/shared/ui/Prose/Prose';

import styles from './LegalPage.module.css';

/**
 * /legal/:slug: the live published text (API §5c GET /api/legal/{type}).
 * The backend's language rules (LegalLanguagePolicy): English falls back to
 * the Arabic text, which the page then says; Turkish never falls back (the
 * Turkish texts are the ones a Turkish buyer accepts), so a missing Turkish
 * text is "not published yet" with a link to the Arabic page.
 */
export default function LegalPage() {
  const { t } = useTranslation('legal');
  const { t: tCommon } = useTranslation();
  const { slug = '' } = useParams();
  const type = LEGAL_TYPE_BY_SLUG[slug];
  const link = LEGAL_LINKS.find((item) => item.slug === slug);
  const label = link ? t(`links.${link.key}`) : '';

  const document = useQuery({
    queryKey: ['legal', type, UI_LANGUAGE] as const,
    queryFn: () => (type ? legalApi.get(type, UI_LANGUAGE) : null),
    enabled: type !== undefined,
    staleTime: 10 * 60_000,
  });

  if (!type) return <NotFoundPage />;

  const notPublished = document.error instanceof ApiError && document.error.status === 404;
  const data = document.data;
  // English may be served the Arabic text (it applies until a translation is published).
  const fallback = data ? data.language !== UI_LANGUAGE : false;
  const arabicPage =
    UI_LANGUAGE === DEFAULT_LANGUAGE ? null : pathInLanguage(DEFAULT_LANGUAGE, paths.legal(slug));

  return (
    <div className={cx('wrap', styles.page)}>
      <DocumentTitle title={data?.title ?? label} />

      <nav className={styles.nav} aria-label={t('nav')}>
        <ul>
          {LEGAL_LINKS.map((item) => (
            <li key={item.slug}>
              <NavLink
                to={paths.legal(item.slug)}
                className={({ isActive }) => cx(styles.navLink, isActive && styles.active)}
              >
                {t(`links.${item.key}`)}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <article className={styles.article} aria-busy={document.isPending}>
        {document.isPending ? (
          <>
            <h1 className={styles.title}>{label}</h1>
            <div className={styles.skeleton} />
          </>
        ) : data ? (
          <>
            {fallback && <p className={styles.notice}>{t('fallback')}</p>}
            <h1
              className={styles.title}
              lang={fallback ? data.language : undefined}
              dir={fallback ? 'rtl' : undefined}
            >
              {data.title}
            </h1>
            <p className={styles.meta}>
              <Trans
                t={t}
                i18nKey="meta"
                values={{ version: data.version, date: formatDate(data.publishedAtUtc) }}
                components={{ v: <span dir="ltr" /> }}
              />
            </p>
            <Prose
              html={data.html}
              lang={fallback ? data.language : undefined}
              dir={fallback ? 'rtl' : undefined}
            />
          </>
        ) : (
          <>
            <h1 className={styles.title}>{label}</h1>
            <p className={styles.state} role={notPublished ? undefined : 'alert'}>
              {notPublished ? t('notPublished') : errorMessage(document.error)}
            </p>
            {notPublished && arabicPage && (
              <a href={arabicPage} hrefLang={DEFAULT_LANGUAGE} className={styles.arabicLink}>
                {t('readArabic')}
              </a>
            )}
            {!notPublished && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void document.refetch();
                }}
              >
                {tCommon('ui.retry')}
              </Button>
            )}
          </>
        )}
      </article>
    </div>
  );
}