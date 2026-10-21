import { useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { formatDateTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { Icon } from '@/shared/ui/Icon/Icon';

import { adminOrdersApi } from '../api';
import { adminOrderKeys } from '../queries';

import styles from './OrderDocuments.module.css';

function Documents({ orderId }: { orderId: number }) {
  const [index, setIndex] = useState(0);
  const documents = useQuery({
    queryKey: adminOrderKeys.documents(orderId),
    queryFn: () => adminOrdersApi.documents(orderId),
    staleTime: Infinity,
  });

  if (documents.isPending) return <p className={styles.state}>جارٍ تحميل المستندات…</p>;
  if (documents.isError) {
    return (
      <p className={styles.state} role="alert">
        {errorMessage(documents.error)}
      </p>
    );
  }
  if (documents.data.length === 0) {
    return <p className={styles.state}>لا مستندات محفوظة لهذا الطلب.</p>;
  }

  const current = documents.data[Math.min(index, documents.data.length - 1)];
  return (
    <>
      <div className={styles.tabs}>
        {documents.data.map((document, i) => (
          <button
            key={document.type}
            type="button"
            className={cx(styles.tab, i === index && styles.tabOn)}
            aria-pressed={i === index}
            onClick={() => {
              setIndex(i);
            }}
          >
            {document.title}
          </button>
        ))}
      </div>
      {current && (
        <>
          <p className={styles.meta}>
            الإصدار <span dir="ltr">{current.version}</span> · قُبل في{' '}
            {formatDateTime(current.createdAtUtc)} · SHA-256{' '}
            <span dir="ltr" className={styles.hash}>
              {current.contentSha256.slice(0, 16)}…
            </span>
          </p>
          {/* Stored documents are complete HTML pages: isolate them, no scripts. */}
          <iframe
            className={styles.frame}
            title={current.title}
            srcDoc={current.html}
            sandbox=""
            referrerPolicy="no-referrer"
          />
        </>
      )}
    </>
  );
}

/** The exact contract and form this buyer accepted (API §10 /orders/{id}/documents). */
export function OrderDocuments({ orderId }: { orderId: number }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [opened, setOpened] = useState(false);

  return (
    <>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setOpened(true);
          ref.current?.showModal();
        }}
      >
        مستندات الطلب
      </Button>
      <dialog ref={ref} className={styles.dialog} aria-labelledby="admin-documents-title">
        <div className={styles.body}>
          <div className={styles.head}>
            <h2 id="admin-documents-title" className={styles.title}>
              مستندات الطلب
            </h2>
            <button
              type="button"
              className={styles.close}
              aria-label="إغلاق"
              onClick={() => {
                ref.current?.close();
              }}
            >
              <Icon name="x" size={22} />
            </button>
          </div>
          {opened && <Documents orderId={orderId} />}
        </div>
      </dialog>
    </>
  );
}
