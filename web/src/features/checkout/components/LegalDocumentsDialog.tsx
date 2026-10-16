import { useQuery } from '@tanstack/react-query';
import type { RefObject } from 'react';

import { checkoutApi } from '@/features/checkout/api';
import type { LegalDocumentType, LegalPreviewRequest } from '@/features/checkout/types';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './LegalDocumentsDialog.module.css';

const LEGAL_TABS: { type: LegalDocumentType; label: string }[] = [
  { type: 'PreInformationForm', label: 'نموذج المعلومات المسبقة' },
  { type: 'DistanceSalesContract', label: 'عقد البيع عن بُعد' },
];

function DocumentBody({ request, tab }: { request: LegalPreviewRequest; tab: LegalDocumentType }) {
  // Fetched on demand: this endpoint shares the quote's 30 requests a minute (§5c).
  const preview = useQuery({
    queryKey: ['legal-preview', request] as const,
    queryFn: () => checkoutApi.legalPreview(request),
    staleTime: 5 * 60_000,
    retry: false,
  });

  if (preview.isPending) {
    return (
      <p className={styles.state} aria-busy="true">
        جارٍ تجهيز المستند بتفاصيل طلبك…
      </p>
    );
  }
  if (preview.isError) {
    return (
      <p className={styles.state} role="alert">
        {errorMessage(preview.error)}
      </p>
    );
  }

  const document =
    tab === 'PreInformationForm'
      ? preview.data.preInformationForm
      : preview.data.distanceSalesContract;
  if (!document) {
    return <p className={styles.state}>لم يُنشر هذا المستند بعد.</p>;
  }
  return (
    <article className={styles.document} aria-label={document.title}>
      <h3 className={styles.docTitle}>{document.title}</h3>
      {/* Safe fragment rendered by the server, no scripts possible (§5c). */}
      <div className={styles.html} dangerouslySetInnerHTML={{ __html: document.html }} />
    </article>
  );
}

interface LegalDocumentsDialogProps {
  dialogRef: RefObject<HTMLDialogElement | null>;
  /** Built when the customer opens a document; null = nothing to show yet. */
  request: LegalPreviewRequest | null;
  tab: LegalDocumentType;
  onTab: (tab: LegalDocumentType) => void;
}

/** The two documents filled in with this cart and buyer, before paying (§5c). */
export function LegalDocumentsDialog({
  dialogRef,
  request,
  tab,
  onTab,
}: LegalDocumentsDialogProps) {
  return (
    <dialog ref={dialogRef} className={styles.dialog} aria-labelledby="legal-dialog-title">
      <div className={styles.head}>
        <h2 id="legal-dialog-title" className={styles.title}>
          مستندات الطلب
        </h2>
        <button
          type="button"
          className={styles.close}
          aria-label="إغلاق"
          onClick={() => {
            dialogRef.current?.close();
          }}
        >
          <Icon name="x" size={22} />
        </button>
      </div>
      <div className={styles.tabs}>
        {LEGAL_TABS.map((item) => (
          <button
            key={item.type}
            type="button"
            className={cx(styles.tab, item.type === tab && styles.active)}
            aria-pressed={item.type === tab}
            onClick={() => {
              onTab(item.type);
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className={styles.scroll}>
        {request ? <DocumentBody request={request} tab={tab} /> : null}
      </div>
    </dialog>
  );
}
