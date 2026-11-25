import { useQuery } from '@tanstack/react-query';
import { type RefObject, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { ordersApi } from '@/features/orders/api';
import type { OrderLookup } from '@/features/orders/types';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { formatDateTime } from '@/shared/lib/format';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './OrderDialogs.module.css';

function Documents({ lookup }: { lookup: OrderLookup }) {
  const { t } = useTranslation('orders', { keyPrefix: 'documents' });
  const [index, setIndex] = useState(0);
  const documents = useQuery({
    queryKey: ['order-documents', lookup] as const,
    queryFn: () => ordersApi.documents(lookup),
    staleTime: Infinity,
  });

  if (documents.isPending) {
    return (
      <p className={styles.state} aria-busy="true">
        {t('loading')}
      </p>
    );
  }
  if (documents.isError) {
    return (
      <p className={styles.state} role="alert">
        {errorMessage(documents.error)}
      </p>
    );
  }
  if (documents.data.length === 0) {
    return <p className={styles.state}>{t('none')}</p>;
  }

  const current = documents.data[Math.min(index, documents.data.length - 1)];
  return (
    <>
      <div className={styles.tabs}>
        {documents.data.map((document, i) => (
          <button
            key={document.type}
            type="button"
            className={cx(styles.tab, i === index && styles.active)}
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
        <article className={styles.document} aria-label={current.title}>
          <p className={styles.meta}>
            <Trans
              t={t}
              i18nKey="version"
              values={{ version: current.version, date: formatDateTime(current.createdAtUtc) }}
              components={{ v: <span dir="ltr" /> }}
            />
          </p>
          {/*
            The stored record is a complete HTML file with its own <style> (the
            copy attached to the confirmation email). An iframe keeps those
            styles off our page; an empty sandbox blocks scripts and forms.
          */}
          <iframe
            key={current.type}
            className={styles.frame}
            title={current.title}
            srcDoc={current.html}
            sandbox=""
            referrerPolicy="no-referrer"
          />
        </article>
      )}
    </>
  );
}

interface OrderDocumentsDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  lookup: OrderLookup;
  /** Mounted on first open, so nothing is fetched until the customer asks. */
  opened: boolean;
}

/** «مستندات الطلب»: the exact contract and form this buyer accepted (API §6). */
export function OrderDocumentsDialog({ dialogRef, lookup, opened }: OrderDocumentsDialogProps) {
  const { t } = useTranslation('orders', { keyPrefix: 'documents' });
  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="order-documents-title">
      <div className={styles.body}>
        <div className={styles.head}>
          <h2 id="order-documents-title" className={styles.title}>
            {t('title')}
          </h2>
          <button
            type="button"
            className={styles.close}
            aria-label={t('close')}
            onClick={() => {
              dialogRef.current?.close();
            }}
          >
            <Icon name="x" size={22} />
          </button>
        </div>
        {opened && <Documents lookup={lookup} />}
      </div>
    </dialog>
  );
}