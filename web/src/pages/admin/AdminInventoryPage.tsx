import { useState } from 'react';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { useAdminBooks } from '@/features/admin/books/queries';
import styles from '@/features/admin/components/admin.module.css';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { signed } from '@/features/admin/inventory/labels';
import { useLowStockCheck, useReconciliation } from '@/features/admin/inventory/queries';
import { errorMessage } from '@/shared/api/errorMessages';
import { booksPhrase, formatCount } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';

import local from './AdminInventoryPage.module.css';

function Failed({ error, retry }: { error: unknown; retry: () => void }) {
  return (
    <div className={styles.empty} role="alert">
      <p>{errorMessage(error)}</p>
      <Button variant="ghost" size="sm" onClick={retry}>
        أعد المحاولة
      </Button>
    </div>
  );
}

/** Books at or under their alert level, out-of-stock ones first. */
function RestockCard() {
  const books = useAdminBooks();
  const rows = (books.data ?? [])
    .filter((b) => b.isActive && (b.isLowStock || b.availableToSell === 0))
    .sort((a, b) => a.availableToSell - b.availableToSell || a.title.localeCompare(b.title, 'ar'));

  return (
    <section className={styles.card} aria-labelledby="restock-title">
      <h2 id="restock-title" className={styles.cardTitle}>
        تحتاج إلى توريد
      </h2>
      <p className={styles.muted}>
        الكتب الظاهرة التي بلغ المتاح منها حدّ التنبيه أو نفد. يصل المدراءَ بريد عنها كل ساعة،
        ويُعدَّل الحد والمخزون من صفحة كل كتاب.
      </p>
      {books.isError && !books.data ? (
        <Failed error={books.error} retry={() => void books.refetch()} />
      ) : !books.data ? (
        <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ تحميل الكتب" />
      ) : rows.length === 0 ? (
        <p className={local.ok}>كل الكتب الظاهرة فوق حدّ التنبيه.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">الكتاب</th>
              <th scope="col">متاح للبيع</th>
              <th scope="col">حدّ التنبيه</th>
              <th scope="col">في المستودع</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((book) => (
              <tr key={book.id}>
                <td data-label="الكتاب">
                  <span className={local.title}>
                    <Link to={paths.admin.book(book.id)} className={styles.rowLink}>
                      {book.title}
                    </Link>
                    {book.editionLabel && <span className={styles.sub}>{book.editionLabel}</span>}
                  </span>
                </td>
                <td data-label="متاح للبيع" className={styles.num}>
                  <b className={book.availableToSell === 0 ? local.out : local.low}>
                    {book.availableToSell === 0 ? 'نفد' : formatCount(book.availableToSell)}
                  </b>
                </td>
                <td data-label="حدّ التنبيه" className={styles.num}>
                  {formatCount(book.lowStockThreshold)}
                </td>
                <td data-label="في المستودع" className={styles.num}>
                  {formatCount(book.stockQuantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/** Stock vs the ledger total, per book (API §10 reconciliation). */
function ReconciliationCard() {
  const report = useReconciliation();
  const [showAll, setShowAll] = useState(false);
  const all = report.data ?? [];
  const unbalanced = all.filter((row) => !row.isBalanced);
  const rows = showAll || unbalanced.length === 0 ? all : unbalanced;

  return (
    <section className={styles.card} aria-labelledby="recon-title">
      <h2 id="recon-title" className={styles.cardTitle}>
        مطابقة المخزون مع دفتر الحركة
      </h2>
      <p className={styles.muted}>
        كل تغيّر في المخزون يُسجَّل حركةً بسببها: بيع، إلغاء، إرجاع، أو جرد. إن اختلف المخزون عن
        مجموع حركاته فقد تغيّر دون تسجيل؛ افتح الكتاب وراجع دفتره ثم صحّح العدد بعد الجرد.
      </p>
      {report.isError && !report.data ? (
        <Failed error={report.error} retry={() => void report.refetch()} />
      ) : !report.data ? (
        <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ تحميل المطابقة" />
      ) : (
        <>
          <div className={local.summary}>
            {unbalanced.length === 0 ? (
              <p className={local.ok}>كل الكتب مطابقة، وعددها {formatCount(all.length)}.</p>
            ) : (
              <p className={local.bad} role="status">
                غير مطابق: {booksPhrase(unbalanced.length)} من أصل {formatCount(all.length)}.
              </p>
            )}
            {unbalanced.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                aria-pressed={showAll}
                onClick={() => {
                  setShowAll(!showAll);
                }}
              >
                {showAll ? 'غير المطابقة فقط' : 'عرض الكل'}
              </Button>
            )}
          </div>
          {rows.length > 0 && (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">الكتاب</th>
                  <th scope="col">المخزون</th>
                  <th scope="col">مجموع الحركات</th>
                  <th scope="col">الفرق</th>
                  <th scope="col">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.bookId}>
                    <td data-label="الكتاب">
                      <Link to={paths.admin.book(row.bookId)} className={styles.rowLink}>
                        {row.title}
                      </Link>
                    </td>
                    <td data-label="المخزون" className={styles.num}>
                      {formatCount(row.stockQuantity)}
                    </td>
                    <td data-label="مجموع الحركات" className={styles.num}>
                      {formatCount(row.ledgerTotal)}
                    </td>
                    <td data-label="الفرق" className={styles.num}>
                      <bdi dir="ltr" className={row.drift === 0 ? undefined : local.out}>
                        {signed(row.drift)}
                      </bdi>
                    </td>
                    <td data-label="الحالة">
                      <StatusBadge
                        label={row.isBalanced ? 'مطابق' : 'غير مطابق'}
                        tone={row.isBalanced ? 'green' : 'red'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}
    </section>
  );
}

/** Inventory and restocking (API §10 /admin/inventory). */
export default function AdminInventoryPage() {
  const check = useLowStockCheck();
  return (
    <>
      <AdminPageHeader
        title="المخزون والتوريد"
        actions={
          <Button
            variant="ghost"
            size="sm"
            disabled={check.isPending}
            onClick={() => {
              check.mutate();
            }}
          >
            {check.isPending ? 'جارٍ الفحص…' : 'افحص المخزون المنخفض الآن'}
          </Button>
        }
      />
      <div className={local.sections}>
        <RestockCard />
        <ReconciliationCard />
      </div>
    </>
  );
}