import { Trans, useTranslation } from 'react-i18next';
import { isRouteErrorResponse, useRouteError } from 'react-router';

import { env } from '@/app/env';
import { pathInLanguage, UI_LANGUAGE } from '@/app/locale';
import { isChunkLoadError } from '@/app/isChunkLoadError';
import NotFoundPage from '@/pages/not-found/NotFoundPage';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';

import styles from './RouteErrorBoundary.module.css';

import { isApiError } from '@/shared/api/ApiError';
import { supportRequestId } from '@/shared/api/errorMessages';

/**
 * Catches render and route-loading errors. Uses plain <a href> and a hard
 * reload on purpose: after an error the router state may not be trustworthy.
 */
export function RouteErrorBoundary() {
  const { t } = useTranslation(undefined, { keyPrefix: 'errorPage' });
  const error = useRouteError();

  if (
    (isRouteErrorResponse(error) && error.status === 404) ||
    (isApiError(error) && error.status === 404)
  ) {
    return (
      <main id="main-content">
        <NotFoundPage />
      </main>
    );
  }

  if (env.isDev) {
    console.error('[RouteErrorBoundary]', error);
  }

  const chunkFailed = isChunkLoadError(error);
  const requestId = supportRequestId(error);
  const heading = chunkFailed ? t('updatedTitle') : t('title');
  const message = chunkFailed ? t('updatedText') : t('text');

  return (
    <main id="main-content" className={styles.root}>
      <DocumentTitle title={heading} />
      <h1 className={styles.title}>{heading}</h1>
      <p className={styles.text}>{message}</p>
      {requestId && (
        <p className={styles.code}>
          <Trans
            t={t}
            i18nKey="code"
            values={{ id: requestId }}
            components={{ c: <span dir="ltr" /> }}
          />
        </p>
      )}
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            window.location.reload();
          }}
        >
          {t('reload')}
        </button>
        <a className={styles.action} href={pathInLanguage(UI_LANGUAGE, '/')}>
          {t('home')}
        </a>
      </div>
    </main>
  );
}