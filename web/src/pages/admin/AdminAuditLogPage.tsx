import { useState } from 'react';
import { useSearchParams } from 'react-router';

import styles from '@/features/admin/components/admin.module.css';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import {
  AUDIT_ENTITIES,
  auditActionLabel,
  auditEntityLabel,
  prettyJson,
} from '@/features/admin/system/labels';
import { useAuditLog } from '@/features/admin/system/queries';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { formatDateTime } from '@/shared/lib/format';
import { usePageParam } from '@/shared/lib/usePageParam';
import { Button } from '@/shared/ui/Button/Button';
import { Pagination } from '@/shared/ui/Pagination/Pagination';

import local from './AdminAuditLogPage.module.css';

/** Audit log (API §10): every admin change, newest first, with who did it and the details. */
export default function AdminAuditLogPage() {
  const [params, setParams] = useSearchParams();
  const { page, hrefFor } = usePageParam();
  const entityType = params.get('type');
  const entityId = params.get('id');
  const [idDraft, setIdDraft] = useState(entityId ?? '');
  const log = useAuditLog(entityType, entityId, page);
  const data = log.data;

  const setFilter = (next: Record<'type' | 'id', string | null>) => {
    const search = new URLSearchParams(params);
    search.delete('page');
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === '') search.delete(key);
      else search.set(key, value);
    }
    setParams(search, { replace: true });
  };

  return (
    <>
      <AdminPageHeader title="سجل التدقيق" meta={<span>الأحدث أولاً</span>} />

      <form
        className={local.filters}
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          setFilter({ type: entityType, id: idDraft.trim() });
        }}
      >
        <div>
          <label htmlFor="audit-type" className={local.label}>
            القسم
          </label>
          <select
            id="audit-type"
            className={local.input}
            value={entityType ?? ''}
            onChange={(event) => {
              setFilter({ type: event.target.value, id: entityId });
            }}
          >
            <option value="">كل الأقسام</option>
            {Object.entries(AUDIT_ENTITIES).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="audit-id" className={local.label}>
            رقم السجل
          </label>
          <input
            id="audit-id"
            className={local.input}
            dir="ltr"
            placeholder="مثل 42"
            value={idDraft}
            onChange={(event) => {
              setIdDraft(event.target.value);
            }}
          />
        </div>
        <Button type="submit" variant="ghost" size="sm" className={local.apply}>
          تطبيق
        </Button>
      </form>

      {log.isError && !data ? (
        <div className={styles.empty} role="alert">
          <p>{errorMessage(log.error)}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void log.refetch();
            }}
          >
            أعد المحاولة
          </Button>
        </div>
      ) : !data ? (
        <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ تحميل السجل" />
      ) : data.items.length === 0 ? (
        <div className={styles.empty}>
          <p>لا عمليات مسجّلة بهذه التصفية.</p>
        </div>
      ) : (
        <>
          <ol className={cx(local.list, log.isPlaceholderData && styles.stale)}>
            {data.items.map((entry) => (
              <li key={entry.id} className={local.entry}>
                <div className={local.head}>
                  <p className={local.action}>{auditActionLabel(entry.action)}</p>
                  <p className={styles.sub}>
                    {auditEntityLabel(entry.entityType)}
                    {entry.entityId && (
                      <>
                        {' '}
                        · <bdi className={styles.code}>{entry.entityId}</bdi>
                      </>
                    )}
                  </p>
                </div>
                <p className={local.meta}>
                  <span>{entry.actorName}</span>
                  <span>{formatDateTime(entry.occurredAtUtc)}</span>
                </p>
                <details className={local.details}>
                  <summary>التفاصيل</summary>
                  <pre dir="ltr">{prettyJson(entry.detailsJson)}</pre>
                </details>
              </li>
            ))}
          </ol>
          <Pagination page={data.page} totalPages={data.totalPages} hrefFor={hrefFor} />
        </>
      )}
    </>
  );
}