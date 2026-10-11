import { isRouteErrorResponse, useRouteError } from 'react-router';

import { env } from '@/app/env';
import { isChunkLoadError } from '@/app/isChunkLoadError';
import NotFoundPage from '@/pages/not-found/NotFoundPage';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';

import styles from './RouteErrorBoundary.module.css';

/**
 * Catches render and route-loading errors. Uses plain <a href> and a hard
 * reload on purpose: after an error the router state may not be trustworthy.
 */
export function RouteErrorBoundary() {
  const error = useRouteError();

  if (isRouteErrorResponse(error) && error.status === 404) {
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
  const heading = chunkFailed ? 'تحدّث الموقع' : 'حدث خطأ غير متوقع';
  const message = chunkFailed
    ? 'صدرت نسخة أحدث من الموقع. أعد تحميل الصفحة للمتابعة.'
    : 'نعتذر، لم نتمكّن من عرض هذه الصفحة. أعد المحاولة بعد قليل.';

  return (
    <main id="main-content" className={styles.root}>
      <DocumentTitle title={heading} />
      <h1 className={styles.title}>{heading}</h1>
      <p className={styles.text}>{message}</p>
      <div className={styles.actions}>
        <button
          type="button"
          className={styles.action}
          onClick={() => {
            window.location.reload();
          }}
        >
          إعادة تحميل الصفحة
        </button>
        <a className={styles.action} href="/">
          العودة إلى الرئيسية
        </a>
      </div>
    </main>
  );
}
