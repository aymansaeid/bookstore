import { useState } from 'react';

import styles from '@/features/admin/components/admin.module.css';
import { formatCount } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { FormAlert, TextField } from '@/shared/ui/form/Field';

import { type AdminBook, adminBooksApi } from '../api';
import { useBookMutation } from '../queries';

import local from './BookStockCard.module.css';

const wholeNumber = (value: string) => (/^\d+$/.test(value.trim()) ? Number(value) : null);

/**
 * Stock (API §10): set the counted quantity with a reason for the ledger;
 * never below what unpaid checkouts hold. Also the low-stock alert level
 * and whether the book shows in the store.
 */
export function BookStockCard({ book }: { book: AdminBook }) {
  const [quantity, setQuantity] = useState(String(book.stockQuantity));
  const [note, setNote] = useState('');
  const [threshold, setThreshold] = useState(String(book.lowStockThreshold));
  const [problem, setProblem] = useState<string | null>(null);

  const stock = useBookMutation(
    book.id,
    ({ q, n }: { q: number; n: string }) => adminBooksApi.setStock(book.id, q, n),
    'حُدّث المخزون وسُجّل في دفتر الحركة.',
  );
  const alert = useBookMutation(
    book.id,
    (value: number) => adminBooksApi.setThreshold(book.id, value),
    'حُفظ حدّ التنبيه.',
  );
  const visibility = useBookMutation(
    book.id,
    (isActive: boolean) => adminBooksApi.setActive(book.id, isActive),
    book.isActive ? 'أُخفي الكتاب من المتجر.' : 'صار الكتاب ظاهراً في المتجر.',
  );

  return (
    <div className={local.wrap}>
      <dl className={local.figures}>
        <div>
          <dt>في المستودع</dt>
          <dd>{formatCount(book.stockQuantity)}</dd>
        </div>
        <div>
          <dt>محجوز لطلبات غير مدفوعة</dt>
          <dd>{formatCount(book.reservedQuantity)}</dd>
        </div>
        <div className={book.availableToSell === 0 ? local.out : book.isLowStock ? local.low : ''}>
          <dt>متاح للبيع</dt>
          <dd>{formatCount(book.availableToSell)}</dd>
        </div>
      </dl>

      <form
        className={styles.actionForm}
        onSubmit={(event) => {
          event.preventDefault();
          setProblem(null);
          const value = wholeNumber(quantity);
          if (value === null) {
            setProblem('أدخل عدداً صحيحاً.');
            return;
          }
          if (value < book.reservedQuantity) {
            setProblem(
              `لا يمكن أن يقل المخزون عن ${formatCount(book.reservedQuantity)}، المحجوزة لطلبات قيد الدفع.`,
            );
            return;
          }
          if (note.trim() === '') {
            setProblem('اكتب سبب التغيير، مثل «جرد المستودع» أو «نسختان تالفتان».');
            return;
          }
          stock.mutate(
            { q: value, n: note.trim() },
            {
              onSuccess: () => {
                setNote('');
              },
            },
          );
        }}
      >
        <p className={styles.actionTitle}>تعديل المخزون بعد الجرد</p>
        {problem && <FormAlert>{problem}</FormAlert>}
        <div className={local.row}>
          <TextField
            label="العدد الفعلي في المستودع"
            dir="ltr"
            inputMode="numeric"
            value={quantity}
            onChange={(event) => {
              setQuantity(event.target.value);
            }}
          />
          <TextField
            label="السبب (يُحفظ في دفتر الحركة)"
            maxLength={500}
            value={note}
            onChange={(event) => {
              setNote(event.target.value);
            }}
          />
        </div>
        <div className={styles.buttons}>
          <Button type="submit" variant="ink" size="sm" disabled={stock.isPending}>
            {stock.isPending ? 'جارٍ الحفظ…' : 'حفظ المخزون'}
          </Button>
        </div>
      </form>

      <form
        className={local.inline}
        onSubmit={(event) => {
          event.preventDefault();
          const value = wholeNumber(threshold);
          if (value !== null && value <= 10_000) alert.mutate(value);
        }}
      >
        <TextField
          label="نبّهني عندما يصل المتاح إلى"
          hint="يصل المدراءَ بريد كل ساعة عند بلوغه. ٠ يوقف التنبيه."
          dir="ltr"
          inputMode="numeric"
          value={threshold}
          onChange={(event) => {
            setThreshold(event.target.value);
          }}
        />
        <Button
          type="submit"
          variant="ghost"
          size="sm"
          disabled={alert.isPending || wholeNumber(threshold) === null}
        >
          حفظ الحد
        </Button>
      </form>

      <div className={local.visibility}>
        <div>
          <p className={styles.actionTitle}>
            {book.isActive ? 'ظاهر في المتجر' : 'مخفي عن المتجر'}
          </p>
          <p className={styles.muted}>
            {book.isActive
              ? 'الإخفاء يزيله من البحث والأقسام ومسارات القراءة، وتبقى الطلبات السابقة كما هي.'
              : 'لا يراه الزوار ولا يمكن طلبه حتى تُظهره.'}
          </p>
        </div>
        <Button
          variant={book.isActive ? 'ghost' : 'red'}
          size="sm"
          disabled={visibility.isPending}
          onClick={() => {
            visibility.mutate(!book.isActive);
          }}
        >
          {book.isActive ? 'إخفاء من المتجر' : 'إظهار في المتجر'}
        </Button>
      </div>
    </div>
  );
}