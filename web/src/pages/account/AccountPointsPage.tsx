import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { AccountHeader } from '@/features/account/components/AccountHeader';
import shared from '@/features/account/components/account.module.css';
import { useCustomerId } from '@/features/account/queries';
import { loyaltyApi, TRANSACTION_LABELS } from '@/features/loyalty/api';
import { tierLabel } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { formatCount, formatDate, formatMoney } from '@/shared/lib/format';
import { usePageParam } from '@/shared/lib/usePageParam';
import { Pagination } from '@/shared/ui/Pagination/Pagination';

import styles from './AccountPointsPage.module.css';

const signed = (points: number) =>
  `${points > 0 ? '+' : points < 0 ? '−' : ''}${formatCount(Math.abs(points))}`;

/** «النقاط» (API §7e): balance, tier, next tier and the history. */
export default function AccountPointsPage() {
  const customerId = useCustomerId();
  const { page, hrefFor } = usePageParam();
  const summary = useQuery({
    queryKey: ['me', 'loyalty', customerId ?? 0] as const,
    queryFn: () => loyaltyApi.summary(),
    enabled: customerId !== null,
  });
  const history = useQuery({
    queryKey: ['me', 'loyalty-history', customerId ?? 0, page] as const,
    queryFn: () => loyaltyApi.history(page),
    enabled: customerId !== null && summary.data?.enabled === true,
    placeholderData: keepPreviousData,
  });
  const data = summary.data;

  return (
    <>
      <AccountHeader
        title="النقاط"
        description="تكسب نقاطاً مع كل طلب. استخدام النقاط عند الدفع قادم قريباً."
      />

      {summary.isError ? (
        <div className={shared.empty} role="alert">
          <p>{errorMessage(summary.error)}</p>
        </div>
      ) : !data ? (
        <div className={shared.skeleton} aria-busy="true" aria-label="جارٍ تحميل النقاط" />
      ) : !data.enabled ? (
        <div className={shared.empty}>
          <p>برنامج النقاط غير مفعّل حالياً.</p>
        </div>
      ) : (
        <>
          <section className={styles.hero} aria-label="رصيد النقاط">
            <p className={styles.tier}>★ {tierLabel(data.tier)}</p>
            <p className={styles.balance}>
              {formatCount(data.balance)} <span>نقطة</span>
            </p>
            <p className={styles.worth}>
              تعادل {formatMoney(data.balance * data.currencyPerPoint)}
            </p>
            {data.nextTier && (
              <p className={styles.next}>
                بقي {formatCount(data.nextTier.pointsNeeded)} نقطة لتصبح{' '}
                {tierLabel(data.nextTier.tier)}
              </p>
            )}
          </section>

          <dl className={styles.facts}>
            <div>
              <dt>قيد التأكيد</dt>
              <dd>{formatCount(data.pendingPoints)}</dd>
            </div>
            <div>
              <dt>آخر ١٢ شهراً</dt>
              <dd>{formatCount(data.earnedLast12Months)}</dd>
            </div>
          </dl>
          <p className={shared.muted}>
            نقاط الطلبات الجديدة تبقى «قيد التأكيد» حتى تنتهي مهلة الإرجاع.
          </p>

          <section className={shared.card} aria-labelledby="history-title">
            <h2 id="history-title" className={shared.cardTitle}>
              السجلّ
            </h2>
            {history.isError ? (
              <p className={shared.muted} role="alert">
                {errorMessage(history.error)}
              </p>
            ) : !history.data ? (
              <div className={shared.skeleton} aria-busy="true" />
            ) : history.data.items.length === 0 ? (
              <p className={shared.muted}>لا حركات بعد. ستظهر نقاطك هنا بعد أول طلب.</p>
            ) : (
              <>
                <ul className={cx(styles.history, history.isPlaceholderData && styles.stale)}>
                  {history.data.items.map((entry) => (
                    <li key={entry.id} className={styles.entry}>
                      <span className={styles.what}>
                        {TRANSACTION_LABELS[entry.type]}
                        {entry.orderNumber && (
                          <>
                            {' '}
                            <Link
                              to={paths.account.order(entry.orderNumber)}
                              className={styles.order}
                              dir="ltr"
                            >
                              {entry.orderNumber}
                            </Link>
                          </>
                        )}
                        {entry.note && <span className={styles.note}>{entry.note}</span>}
                        <span className={styles.date}>{formatDate(entry.createdAtUtc)}</span>
                      </span>
                      <b className={cx(styles.points, entry.points < 0 && styles.minus)}>
                        {signed(entry.points)}
                      </b>
                    </li>
                  ))}
                </ul>
                <Pagination
                  page={history.data.page}
                  totalPages={history.data.totalPages}
                  hrefFor={hrefFor}
                />
              </>
            )}
          </section>
        </>
      )}
    </>
  );
}
