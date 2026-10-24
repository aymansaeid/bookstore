import { useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router';

import { paths } from '@/app/paths';
import styles from '@/features/admin/components/admin.module.css';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import type { LegalLanguage } from '@/features/admin/legal/api';
import { LegalEditor } from '@/features/admin/legal/components/LegalEditor';
import {
  LEGAL_LANGUAGES,
  LEGAL_STATUS,
  LEGAL_TYPES,
  statusRank,
} from '@/features/admin/legal/labels';
import { useLegalVersions } from '@/features/admin/legal/queries';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { formatDateTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';

import local from './AdminLegalPage.module.css';

const DEFAULT_TYPE = LEGAL_TYPES[0];

/**
 * Legal texts (API §10 /admin/legal): one list of versions per document and
 * language. Drafts are edited, published ones are frozen and stored with orders.
 */
export default function AdminLegalPage() {
  const [params, setParams] = useSearchParams();
  const editorRef = useRef<HTMLElement>(null);
  const kind = LEGAL_TYPES.find((item) => item.type === params.get('type')) ?? DEFAULT_TYPE;
  const rawLang = params.get('lang');
  const language: LegalLanguage = rawLang === 'tr' || rawLang === 'en' ? rawLang : 'ar';
  const rawEdit = params.get('edit');
  const fromId = Number(params.get('from'));
  const versions = useLegalVersions(kind?.type ?? 'DistanceSalesContract', language);
  const all = [...(versions.data ?? [])].sort(
    (a, b) =>
      statusRank[a.status] - statusRank[b.status] || b.createdAtUtc.localeCompare(a.createdAtUtc),
  );
  const editing =
    rawEdit === 'new'
      ? 'new'
      : rawEdit !== null && /^\d+$/.test(rawEdit)
        ? all.find((doc) => doc.id === Number(rawEdit))
        : undefined;
  const base = all.find((doc) => doc.id === fromId) ?? null;
  const live = all.find((doc) => doc.status === 'Published');

  const go = (next: Record<string, string | null>, replace = false) => {
    const search = new URLSearchParams(params);
    for (const [key, value] of Object.entries(next)) {
      if (value === null) search.delete(key);
      else search.set(key, value);
    }
    setParams(search, { replace });
  };

  useEffect(() => {
    if (rawEdit !== null) editorRef.current?.scrollIntoView({ block: 'start' });
  }, [rawEdit]);

  if (!kind) return null;

  return (
    <>
      <AdminPageHeader
        title="الصفحات القانونية"
        meta={<span>لكل نص نسخ: مسودة تُعدَّل، ونسخة منشورة واحدة، ونسخ مؤرشفة</span>}
      />

      <div className={styles.toolbar}>
        <div className={styles.filters} role="group" aria-label="النص">
          {LEGAL_TYPES.map((item) => (
            <button
              key={item.type}
              type="button"
              className={cx(styles.filter, item.type === kind.type && styles.filterOn)}
              aria-pressed={item.type === kind.type}
              onClick={() => {
                go({ type: item.type, edit: null, from: null });
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
        <div>
          <label htmlFor="legal-lang" className="sr-only">
            اللغة
          </label>
          <select
            id="legal-lang"
            className={local.select}
            value={language}
            onChange={(event) => {
              go({ lang: event.target.value === 'ar' ? null : event.target.value, edit: null });
            }}
          >
            {LEGAL_LANGUAGES.map((item) => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <section className={styles.card} aria-labelledby="versions-title">
        <div className={local.head}>
          <div>
            <h2 id="versions-title" className={styles.cardTitle}>
              {kind.label}
            </h2>
            <p className={styles.muted}>
              {live ? (
                <>
                  المنشورة الآن: <bdi className={local.code}>{live.version}</bdi>
                  {language === 'ar' && (
                    <>
                      {' · '}
                      <Link to={paths.legal(kind.slug)} target="_blank" rel="noreferrer">
                        صفحتها في المتجر ↗
                      </Link>
                    </>
                  )}
                </>
              ) : (
                'لا نسخة منشورة بهذه اللغة بعد.'
              )}
            </p>
          </div>
          <Button
            variant="ink"
            size="sm"
            onClick={() => {
              go({ edit: 'new', from: live ? String(live.id) : null });
            }}
          >
            + نسخة جديدة
          </Button>
        </div>

        {versions.isError && !versions.data ? (
          <div className={styles.empty} role="alert">
            <p>{errorMessage(versions.error)}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void versions.refetch();
              }}
            >
              أعد المحاولة
            </Button>
          </div>
        ) : !versions.data ? (
          <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ تحميل النسخ" />
        ) : all.length === 0 ? (
          <p className={styles.muted}>لا نسخ بعد. أنشئ أول مسودة.</p>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">النسخة</th>
                <th scope="col">العنوان</th>
                <th scope="col">التاريخ</th>
                <th scope="col">الحالة</th>
              </tr>
            </thead>
            <tbody>
              {all.map((doc) => (
                <tr
                  key={doc.id}
                  className={cx(editing !== 'new' && editing?.id === doc.id && local.selected)}
                >
                  <td data-label="النسخة">
                    <button
                      type="button"
                      className={cx(styles.rowLink, local.open)}
                      onClick={() => {
                        go({ edit: String(doc.id), from: null });
                      }}
                    >
                      <bdi className={local.code}>{doc.version}</bdi>
                    </button>
                  </td>
                  <td data-label="العنوان">{doc.title}</td>
                  <td data-label="التاريخ" className={styles.num}>
                    {formatDateTime(doc.publishedAtUtc ?? doc.createdAtUtc)}
                  </td>
                  <td data-label="الحالة">
                    <StatusBadge
                      label={LEGAL_STATUS[doc.status].label}
                      tone={LEGAL_STATUS[doc.status].tone}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {editing !== undefined && (
        <section
          ref={editorRef}
          className={cx(styles.card, local.editor)}
          aria-labelledby="legal-editor"
        >
          <div className={local.head}>
            <h2 id="legal-editor" className={styles.cardTitle}>
              {editing === 'new' ? 'نسخة جديدة' : `النسخة ${editing.version}`}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                go({ edit: null, from: null });
              }}
            >
              إغلاق
            </Button>
          </div>
          <LegalEditor
            key={editing === 'new' ? `new-${String(base?.id)}` : JSON.stringify(editing)}
            type={kind.type}
            language={language}
            doc={editing === 'new' ? null : editing}
            base={editing === 'new' ? base : null}
            onCreated={(id) => {
              go({ edit: String(id), from: null }, true);
            }}
            onBranch={(from) => {
              go({ edit: 'new', from: String(from.id) });
            }}
          />
        </section>
      )}
    </>
  );
}