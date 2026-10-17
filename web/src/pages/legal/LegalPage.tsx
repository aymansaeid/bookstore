import { useQuery } from '@tanstack/react-query';
import { NavLink, useParams } from 'react-router';

import { UI_LANGUAGE } from '@/app/locale';
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

/** /legal/:slug: the live published text (API §5c GET /api/legal/{type}). */
export default function LegalPage() {
  const { slug = '' } = useParams();
  const type = LEGAL_TYPE_BY_SLUG[slug];
  const label = LEGAL_LINKS.find((link) => link.slug === slug)?.label ?? '';

  const document = useQuery({
    queryKey: ['legal', type, UI_LANGUAGE] as const,
    queryFn: () => (type ? legalApi.get(type, UI_LANGUAGE) : null),
    enabled: type !== undefined,
    staleTime: 10 * 60_000,
  });

  if (!type) return <NotFoundPage />;

  const notPublished = document.error instanceof ApiError && document.error.status === 404;

  return (
    <div className={cx('wrap', styles.page)}>
      <DocumentTitle title={document.data?.title ?? label} />

      <nav className={styles.nav} aria-label="الشروط والسياسات">
        <ul>
          {LEGAL_LINKS.map((link) => (
            <li key={link.slug}>
              <NavLink
                to={paths.legal(link.slug)}
                className={({ isActive }) => cx(styles.navLink, isActive && styles.active)}
              >
                {link.label}
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
        ) : document.data ? (
          <>
            <h1 className={styles.title}>{document.data.title}</h1>
            <p className={styles.meta}>
              الإصدار <span dir="ltr">{document.data.version}</span> · نُشر في{' '}
              {formatDate(document.data.publishedAtUtc)}
            </p>
            <Prose html={document.data.html} />
          </>
        ) : (
          <>
            <h1 className={styles.title}>{label}</h1>
            <p className={styles.state} role={notPublished ? undefined : 'alert'}>
              {notPublished ? 'لم يُنشر هذا المستند بعد.' : errorMessage(document.error)}
            </p>
            {!notPublished && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void document.refetch();
                }}
              >
                أعد المحاولة
              </Button>
            )}
          </>
        )}
      </article>
    </div>
  );
}
