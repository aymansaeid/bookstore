import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';

import { errorMessage } from '@/shared/api/errorMessages';
import { formatCount } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { FormAlert, SelectField } from '@/shared/ui/form/Field';

import { type AdminBook, adminBooksApi, BOOK_LIMITS } from '../api';
import { adminBookKeys, useAdminBooks, useBookMutation } from '../queries';

import styles from './BookEditor.module.css';

const bookLabel = (book: AdminBook) =>
  `${book.title}${book.editionLabel ? ` — ${book.editionLabel}` : ''}${book.isActive ? '' : ' (مخفي)'}`;

interface BookPickerProps {
  legend: string;
  hint: string;
  ids: number[];
  onChange: (ids: number[]) => void;
  /** Every other book, sorted. */
  books: AdminBook[];
  max: number;
  ordered: boolean;
  /** Why a book can't be picked, or null. */
  blocked?: (book: AdminBook) => string | null;
}

function BookPicker({
  legend,
  hint,
  ids,
  onChange,
  books,
  max,
  ordered,
  blocked,
}: BookPickerProps) {
  const [adding, setAdding] = useState('');
  const byId = new Map(books.map((b) => [b.id, b]));
  const available = books.filter((b) => !ids.includes(b.id));

  return (
    <fieldset className={styles.fieldset}>
      <legend className={styles.legend}>
        {legend} ({formatCount(ids.length)} / {formatCount(max)})
      </legend>
      <p className={styles.note}>{hint}</p>
      {ids.length > 0 && (
        <ol className={styles.list}>
          {ids.map((id, index) => {
            const found = byId.get(id);
            const label = found ? bookLabel(found) : `#${String(id)}`;
            return (
              <li key={id} className={styles.listItem}>
                <span className={styles.listText}>{label}</span>
                {ordered && (
                  <button
                    type="button"
                    className={styles.iconButton}
                    aria-label={`تقديم ${label}`}
                    disabled={index === 0}
                    onClick={() => {
                      const next = [...ids];
                      [next[index - 1], next[index]] = [next[index] ?? id, next[index - 1] ?? id];
                      onChange(next);
                    }}
                  >
                    ↑
                  </button>
                )}
                <button
                  type="button"
                  className={styles.iconButton}
                  aria-label={`إزالة ${label}`}
                  onClick={() => {
                    onChange(ids.filter((other) => other !== id));
                  }}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ol>
      )}
      <div className={styles.addRow}>
        <SelectField
          label="إضافة كتاب"
          value={adding}
          disabled={ids.length >= max}
          onChange={(event) => {
            setAdding(event.target.value);
          }}
        >
          <option value="">اختر…</option>
          {available.map((b) => {
            const reason = blocked?.(b) ?? null;
            return (
              <option key={b.id} value={b.id} disabled={reason !== null}>
                {bookLabel(b)}
                {reason === null ? '' : ` — ${reason}`}
              </option>
            );
          })}
        </SelectField>
        <Button
          variant="ghost"
          size="sm"
          disabled={adding === ''}
          onClick={() => {
            onChange([...ids, Number(adding)]);
            setAdding('');
          }}
        >
          إضافة
        </Button>
      </div>
    </fieldset>
  );
}

/**
 * Editions of the same work (shown as «اختر الطبعة») and the curated
 * «يُكمل مكتبتك» list (API §10 PUT /books/{id}/editions, /related).
 */
export function BookLinksForm({ book }: { book: AdminBook }) {
  const queryClient = useQueryClient();
  const list = useAdminBooks();
  const others = (list.data ?? [])
    .filter((b) => b.id !== book.id)
    .sort((a, b) => a.title.localeCompare(b.title, 'ar'));

  const savedEditions =
    book.editionGroupId === null
      ? []
      : others.filter((b) => b.editionGroupId === book.editionGroupId).map((b) => b.id);
  const [editionDraft, setEditionDraft] = useState<number[] | null>(null);
  const editions = editionDraft ?? savedEditions;
  const [related, setRelated] = useState<number[]>(book.relatedBookIds);

  const saveEditions = useBookMutation(
    book.id,
    (ids: number[]) => adminBooksApi.setEditions(book.id, ids),
    'حُفظت الطبعات.',
  );
  const saveRelated = useBookMutation(
    book.id,
    (ids: number[]) => adminBooksApi.setRelated(book.id, ids),
    'حُفظت الكتب المرتبطة.',
  );

  if (list.isError) return <FormAlert>{errorMessage(list.error)}</FormAlert>;
  if (!list.data) {
    return <p className={styles.note}>جارٍ تحميل الكتب…</p>;
  }

  return (
    <div className={styles.stack}>
      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          saveEditions.mutate(editions, {
            onSuccess: () => {
              setEditionDraft(null);
              // The other members' pages changed too.
              void queryClient.invalidateQueries({
                queryKey: adminBookKeys.all,
                predicate: (query) =>
                  query.queryKey[2] === 'detail' && query.queryKey[3] !== book.id,
              });
            },
          });
        }}
      >
        <BookPicker
          legend="طبعات العمل نفسه"
          hint="مثل المجلد الواحد والطبعة الكاملة. تظهر معاً في «اختر الطبعة» بصفحة الكتاب، كلٌّ باسم طبعته."
          ids={editions}
          onChange={setEditionDraft}
          books={others}
          max={BOOK_LIMITS.maxEditions}
          ordered={false}
          blocked={(b) =>
            b.editionGroupId !== null && b.editionGroupId !== book.editionGroupId
              ? 'طبعة لعمل آخر'
              : null
          }
        />
        <div className={styles.actions}>
          <Button
            type="submit"
            variant="ink"
            size="sm"
            disabled={saveEditions.isPending || editionDraft === null}
          >
            {saveEditions.isPending ? 'جارٍ الحفظ…' : 'حفظ الطبعات'}
          </Button>
        </div>
      </form>

      <form
        className={styles.form}
        onSubmit={(event) => {
          event.preventDefault();
          saveRelated.mutate(related);
        }}
      >
        <BookPicker
          legend="يُكمل مكتبتك"
          hint="كتب مختارة تظهر بهذا الترتيب أسفل صفحة الكتاب."
          ids={related}
          onChange={setRelated}
          books={others}
          max={BOOK_LIMITS.maxRelated}
          ordered
        />
        <div className={styles.actions}>
          <Button
            type="submit"
            variant="ink"
            size="sm"
            disabled={saveRelated.isPending || related.join() === book.relatedBookIds.join()}
          >
            {saveRelated.isPending ? 'جارٍ الحفظ…' : 'حفظ الكتب المرتبطة'}
          </Button>
        </div>
      </form>
    </div>
  );
}