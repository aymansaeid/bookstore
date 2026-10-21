import { useEffect, useRef, useState } from 'react';

import { MuhaqqiqForm } from '@/features/admin/catalog/components/MuhaqqiqForm';
import { useAdminMuhaqqiqs } from '@/features/admin/catalog/queries';
import styles from '@/features/admin/components/admin.module.css';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { useEditParam } from '@/features/admin/useEditParam';
import { errorMessage } from '@/shared/api/errorMessages';
import { arabicFold } from '@/shared/lib/arabicFold';
import { cx } from '@/shared/lib/cx';
import { arabicPlural, formatCount } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';

import local from './AdminCatalogPage.module.css';

const peoplePhrase = (count: number) =>
  arabicPlural(count, { one: 'محقق واحد', two: 'محققان', few: 'محققين', many: 'محققاً' });

/** Muhaqqiqs and authors (API §4b): profile, specialties, featured on the home page. */
export default function AdminMuhaqqiqsPage() {
  const muhaqqiqs = useAdminMuhaqqiqs();
  const { edit, open, replace, close } = useEditParam();
  const [query, setQuery] = useState('');
  const editorRef = useRef<HTMLElement>(null);
  const all = muhaqqiqs.data ?? [];
  const selected = typeof edit === 'number' ? all.find((m) => m.id === edit) : undefined;
  const showEditor = edit === 'new' || selected !== undefined;
  const term = arabicFold(query.trim());

  const shown = all
    .filter(
      (m) =>
        term === '' || arabicFold(`${m.name} ${m.slug} ${m.specialties.join(' ')}`).includes(term),
    )
    .sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, 'ar'));

  useEffect(() => {
    if (edit !== null && !window.matchMedia('(min-width: 1100px)').matches) {
      editorRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [edit]);

  return (
    <>
      <AdminPageHeader
        title="المحققون والمؤلفون"
        meta={muhaqqiqs.data ? <span>{peoplePhrase(all.length)}</span> : undefined}
        actions={
          <Button
            variant="ink"
            size="sm"
            onClick={() => {
              open('new');
            }}
          >
            + محقق جديد
          </Button>
        }
      />

      <div className={local.layout}>
        {showEditor ? (
          <section
            ref={editorRef}
            className={cx(styles.card, local.editor)}
            aria-labelledby="editor-title"
          >
            <div className={local.editorHead}>
              <h2 id="editor-title" className={styles.cardTitle}>
                {selected ? selected.name : 'محقق جديد'}
              </h2>
              <Button variant="ghost" size="sm" onClick={close}>
                إغلاق
              </Button>
            </div>
            <MuhaqqiqForm
              key={selected ? JSON.stringify(selected) : 'new'}
              muhaqqiq={selected ?? null}
              onSaved={replace}
              onDeleted={close}
            />
          </section>
        ) : (
          <aside className={cx(styles.card, local.hint)}>
            <p className={styles.muted}>
              اختر محققاً لتعديل بياناته، أو أضف محققاً جديداً. يُنسب المحققون إلى الكتب من صفحة كل
              كتاب، بترتيب ذكرهم على الغلاف.
            </p>
          </aside>
        )}

        <div className={local.list}>
          <div className={styles.search} role="search">
            <label htmlFor="muhaqqiq-search" className="sr-only">
              ابحث بالاسم أو التخصص
            </label>
            <input
              id="muhaqqiq-search"
              type="search"
              dir="auto"
              placeholder="الاسم أو التخصص"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
              }}
            />
          </div>

          {muhaqqiqs.isError && !muhaqqiqs.data ? (
            <div className={styles.empty} role="alert">
              <p>{errorMessage(muhaqqiqs.error)}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void muhaqqiqs.refetch();
                }}
              >
                أعد المحاولة
              </Button>
            </div>
          ) : !muhaqqiqs.data ? (
            <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ تحميل المحققين" />
          ) : shown.length === 0 ? (
            <div className={styles.empty}>
              <p>{all.length === 0 ? 'لا محققين بعد. أضف أول محقق.' : 'لا نتائج تطابق البحث.'}</p>
            </div>
          ) : (
            <div className={styles.card}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">المحقق</th>
                    <th scope="col">الأعمال</th>
                    <th scope="col">الترتيب</th>
                    <th scope="col">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((m) => (
                    <tr key={m.id} className={cx(edit === m.id && local.selected)}>
                      <td data-label="المحقق">
                        <span className={local.nameText}>
                          <button
                            type="button"
                            className={cx(styles.rowLink, local.open)}
                            aria-current={edit === m.id ? 'true' : undefined}
                            onClick={() => {
                              open(m.id);
                            }}
                          >
                            {m.name}
                          </button>
                          {m.specialties.length > 0 && (
                            <span className={styles.sub}>{m.specialties.join('، ')}</span>
                          )}
                        </span>
                      </td>
                      <td data-label="الأعمال" className={styles.num}>
                        {formatCount(m.worksCount)}
                      </td>
                      <td data-label="الترتيب" className={styles.num}>
                        {formatCount(m.displayOrder)}
                      </td>
                      <td data-label="الحالة">
                        <span className={local.badges}>
                          {m.isFeatured && <StatusBadge label="مميّز" tone="gold" />}
                          <StatusBadge
                            label={m.isActive ? 'ظاهر' : 'مخفي'}
                            tone={m.isActive ? 'green' : 'gray'}
                          />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}