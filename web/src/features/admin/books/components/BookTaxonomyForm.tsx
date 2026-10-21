import { useState } from 'react';

import { useAdminCategories, useAdminMuhaqqiqs } from '@/features/admin/catalog/queries';
import { errorMessage } from '@/shared/api/errorMessages';
import { formatCount } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { FormAlert, SelectField } from '@/shared/ui/form/Field';

import { type AdminBook, adminBooksApi, BOOK_LIMITS } from '../api';
import { useBookMutation } from '../queries';

import styles from './BookEditor.module.css';

/** Category and muhaqqiqs in credit order (API §4b PUT /books/{id}/taxonomy). */
export function BookTaxonomyForm({ book }: { book: AdminBook }) {
  const categories = useAdminCategories();
  const muhaqqiqs = useAdminMuhaqqiqs();
  const [categoryId, setCategoryId] = useState<number | null>(book.categoryId);
  const [credited, setCredited] = useState<number[]>(book.muhaqqiqIds);
  const [adding, setAdding] = useState('');
  const save = useBookMutation(
    book.id,
    () => adminBooksApi.setTaxonomy(book.id, categoryId, credited),
    'حُفظ القسم والمحققون.',
  );

  const all = categories.data ?? [];
  const parents = all.filter((category) => category.parentId === null);
  const childrenOf = (id: number) => all.filter((category) => category.parentId === id);
  const nameOf = (id: number) => muhaqqiqs.data?.find((m) => m.id === id)?.name ?? `#${String(id)}`;
  const available = (muhaqqiqs.data ?? []).filter((m) => !credited.includes(m.id));

  if (categories.isError || muhaqqiqs.isError) {
    return <FormAlert>{errorMessage(categories.error ?? muhaqqiqs.error)}</FormAlert>;
  }

  return (
    <form
      className={styles.form}
      onSubmit={(event) => {
        event.preventDefault();
        save.mutate(undefined);
      }}
    >
      <SelectField
        label="القسم"
        hint="القسم المخفي لا يظهر في المتجر."
        value={categoryId === null ? '' : String(categoryId)}
        disabled={!categories.data}
        onChange={(event) => {
          setCategoryId(event.target.value === '' ? null : Number(event.target.value));
        }}
      >
        <option value="">بلا قسم</option>
        {parents.map((parent) => (
          <optgroup key={parent.id} label={parent.name}>
            <option value={parent.id}>
              {parent.name}
              {parent.isActive ? '' : ' (مخفي)'}
            </option>
            {childrenOf(parent.id).map((child) => (
              <option key={child.id} value={child.id}>
                — {child.name}
                {child.isActive ? '' : ' (مخفي)'}
              </option>
            ))}
          </optgroup>
        ))}
      </SelectField>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>
          المحققون بترتيب الذكر ({formatCount(credited.length)} /{' '}
          {formatCount(BOOK_LIMITS.maxMuhaqqiqs)})
        </legend>
        {credited.length > 0 && (
          <ol className={styles.list}>
            {credited.map((id, index) => (
              <li key={id} className={styles.listItem}>
                <span className={styles.listText}>{nameOf(id)}</span>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label={`تقديم ${nameOf(id)}`}
                  disabled={index === 0}
                  onClick={() => {
                    const next = [...credited];
                    [next[index - 1], next[index]] = [next[index] ?? id, next[index - 1] ?? id];
                    setCredited(next);
                  }}
                >
                  ↑
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label={`إزالة ${nameOf(id)}`}
                  onClick={() => {
                    setCredited(credited.filter((other) => other !== id));
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ol>
        )}
        <div className={styles.addRow}>
          <SelectField
            label="إضافة محقق"
            value={adding}
            disabled={!muhaqqiqs.data || credited.length >= BOOK_LIMITS.maxMuhaqqiqs}
            onChange={(event) => {
              setAdding(event.target.value);
            }}
          >
            <option value="">اختر…</option>
            {available.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
                {m.isActive ? '' : ' (مخفي)'}
              </option>
            ))}
          </SelectField>
          <Button
            variant="ghost"
            size="sm"
            disabled={adding === ''}
            onClick={() => {
              setCredited([...credited, Number(adding)]);
              setAdding('');
            }}
          >
            إضافة
          </Button>
        </div>
      </fieldset>

      <div className={styles.actions}>
        <Button type="submit" variant="ink" disabled={save.isPending}>
          {save.isPending ? 'جارٍ الحفظ…' : 'حفظ القسم والمحققين'}
        </Button>
      </div>
    </form>
  );
}