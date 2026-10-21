import { useEffect, useRef } from 'react';

import type { AdminCategory } from '@/features/admin/catalog/api';
import { CategoryForm } from '@/features/admin/catalog/components/CategoryForm';
import { useAdminCategories } from '@/features/admin/catalog/queries';
import styles from '@/features/admin/components/admin.module.css';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { useEditParam } from '@/features/admin/useEditParam';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { arabicPlural, formatCount } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';

import local from './AdminCatalogPage.module.css';

const categoriesPhrase = (count: number) =>
  arabicPlural(count, { one: 'قسم واحد', two: 'قسمان', few: 'أقسام', many: 'قسماً' });

const byOrder = (a: AdminCategory, b: AdminCategory) =>
  a.displayOrder - b.displayOrder || a.name.localeCompare(b.name, 'ar');

/** Parents in order, each followed by its subcategories. */
function asTree(all: AdminCategory[]): { category: AdminCategory; child: boolean }[] {
  const ids = new Set(all.map((c) => c.id));
  const roots = all.filter((c) => c.parentId === null || !ids.has(c.parentId)).sort(byOrder);
  return roots.flatMap((root) => [
    { category: root, child: false },
    ...all
      .filter((c) => c.parentId === root.id)
      .sort(byOrder)
      .map((category) => ({ category, child: true })),
  ]);
}

/** Categories (API §4b): two levels, a letter for the tile, order, hide or delete. */
export default function AdminCategoriesPage() {
  const categories = useAdminCategories();
  const { edit, open, replace, close } = useEditParam();
  const editorRef = useRef<HTMLElement>(null);
  const all = categories.data ?? [];
  const selected = typeof edit === 'number' ? all.find((c) => c.id === edit) : undefined;
  const showEditor = edit === 'new' || selected !== undefined;

  useEffect(() => {
    // Phones: the editor sits above the list; bring it into view when it opens.
    if (edit !== null && !window.matchMedia('(min-width: 1100px)').matches) {
      editorRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [edit]);

  return (
    <>
      <AdminPageHeader
        title="الأقسام"
        meta={categories.data ? <span>{categoriesPhrase(all.length)}</span> : undefined}
        actions={
          <Button
            variant="ink"
            size="sm"
            onClick={() => {
              open('new');
            }}
          >
            + قسم جديد
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
                {selected ? selected.name : 'قسم جديد'}
              </h2>
              <Button variant="ghost" size="sm" onClick={close}>
                إغلاق
              </Button>
            </div>
            <CategoryForm
              // Fresh form for each record, and after each save.
              key={selected ? JSON.stringify(selected) : 'new'}
              category={selected ?? null}
              all={all}
              onSaved={replace}
              onDeleted={close}
            />
          </section>
        ) : (
          <aside className={cx(styles.card, local.hint)}>
            <p className={styles.muted}>
              اختر قسماً لتعديله، أو أضف قسماً جديداً. الكتب تُنسب إلى الأقسام من صفحة كل كتاب.
            </p>
          </aside>
        )}

        {categories.isError && !categories.data ? (
          <div className={styles.empty} role="alert">
            <p>{errorMessage(categories.error)}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void categories.refetch();
              }}
            >
              أعد المحاولة
            </Button>
          </div>
        ) : !categories.data ? (
          <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ تحميل الأقسام" />
        ) : all.length === 0 ? (
          <div className={styles.empty}>
            <p>لا أقسام بعد. أضف أول قسم.</p>
          </div>
        ) : (
          <div className={styles.card}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">القسم</th>
                  <th scope="col">الترتيب</th>
                  <th scope="col">الكتب</th>
                  <th scope="col">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {asTree(all).map(({ category, child }) => (
                  <tr key={category.id} className={cx(edit === category.id && local.selected)}>
                    <td data-label="القسم">
                      <span className={cx(local.name, child && local.child)}>
                        <span
                          className={cx(local.letter, category.letter === null && local.noLetter)}
                          aria-hidden="true"
                        >
                          {category.letter ?? '·'}
                        </span>
                        <span className={local.nameText}>
                          <button
                            type="button"
                            className={cx(styles.rowLink, local.open)}
                            aria-current={edit === category.id ? 'true' : undefined}
                            onClick={() => {
                              open(category.id);
                            }}
                          >
                            {category.name}
                          </button>
                          <span className={styles.sub} dir="auto">
                            {child ? 'قسم فرعي · ' : ''}
                            {category.slug}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td data-label="الترتيب" className={styles.num}>
                      {formatCount(category.displayOrder)}
                    </td>
                    <td data-label="الكتب" className={styles.num}>
                      {formatCount(category.bookCount)}
                    </td>
                    <td data-label="الحالة">
                      <StatusBadge
                        label={category.isActive ? 'ظاهر' : 'مخفي'}
                        tone={category.isActive ? 'green' : 'gray'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}