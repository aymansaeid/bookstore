import { Link } from 'react-router';

import { paths } from '@/app/paths';
import styles from '@/features/admin/components/admin.module.css';
import { errorMessage } from '@/shared/api/errorMessages';
import { formatCount, formatDateTime } from '@/shared/lib/format';
import { usePageParam } from '@/shared/lib/usePageParam';
import { Button } from '@/shared/ui/Button/Button';
import { FormAlert } from '@/shared/ui/form/Field';
import { Pagination } from '@/shared/ui/Pagination/Pagination';

import { reasonLabel, signed } from '../labels';
import { useStockLedger } from '../queries';

import local from './StockLedger.module.css';

/**
 * The stock ledger (API §10 movements): every physical change with its reason.
 * Its total must equal the stock; a gap means something changed off the books.
 */
export function StockLedger({ bookId }: { bookId: number }) {
  const { page, hrefFor } = usePageParam();
  const ledger = useStockLedger(bookId, page);
  const data = ledger.data;

  if (ledger.isError && !data) {
    return (
      <div className={styles.empty} role="alert">
        <p>{errorMessage(ledger.error)}</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            void ledger.refetch();
          }}
        >
          أعد المحاولة
        </Button>
      </div>
    );
  }
  if (!data) {
    return <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ تحميل دفتر الحركة" />;
  }

  const drift = data.currentStock - data.ledgerTotal;

  return (
    <div className={local.wrap}>
      {data.isBalanced ? (
        <p className={local.balanced}>
          مطابق: مجموع الحركات {formatCount(data.ledgerTotal)} يساوي المخزون.
        </p>
      ) : (
        <FormAlert>
          غير مطابق: المخزون {formatCount(data.currentStock)} ومجموع الحركات{' '}
          {formatCount(data.ledgerTotal)}، بفرق <bdi dir="ltr">{signed(drift)}</bdi>. تغيّر المخزون
          دون حركة مسجلة؛ اجرد الكتاب وصحّح العدد مع ذكر السبب.
        </FormAlert>
      )}

      {data.movements.items.length === 0 ? (
        <p className={styles.muted}>لا حركات مسجلة بعد.</p>
      ) : (
        <table className={styles.table} aria-busy={ledger.isPlaceholderData}>
          <thead>
            <tr>
              <th scope="col">التاريخ</th>
              <th scope="col">الحركة</th>
              <th scope="col">الكمية</th>
            </tr>
          </thead>
          <tbody>
            {data.movements.items.map((movement) => (
              <tr key={movement.id}>
                <td data-label="التاريخ" className={styles.num}>
                  {formatDateTime(movement.occurredAtUtc)}
                </td>
                <td data-label="الحركة">
                  <span className={local.what}>
                    <span>
                      {reasonLabel(movement.reason)}
                      {movement.orderId !== null && (
                        <>
                          {' · '}
                          <Link to={paths.admin.order(movement.orderId)} className={styles.rowLink}>
                            الطلب <bdi>#{movement.orderId}</bdi>
                          </Link>
                        </>
                      )}
                    </span>
                    {movement.note && <span className={styles.sub}>{movement.note}</span>}
                  </span>
                </td>
                <td data-label="الكمية" className={styles.num}>
                  <bdi dir="ltr" className={movement.quantityDelta < 0 ? local.out : local.in}>
                    {signed(movement.quantityDelta)}
                  </bdi>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <Pagination
        page={data.movements.page}
        totalPages={data.movements.totalPages}
        hrefFor={hrefFor}
      />
    </div>
  );
}