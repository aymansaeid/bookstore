import { Link, useParams } from 'react-router';

import { paths } from '@/app/paths';
import styles from '@/features/admin/components/admin.module.css';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { ReturnActions } from '@/features/admin/returns/components/ReturnActions';
import { CONDITION_LABELS } from '@/features/admin/returns/labels';
import { useAdminReturn } from '@/features/admin/returns/queries';
import NotFoundPage from '@/pages/not-found/NotFoundPage';
import { isApiError } from '@/shared/api/ApiError';
import { returnReasonLabel, returnStatusInfo } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import { formatCount, formatDateTime, formatMoney } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';

import page from './AdminOrderPage.module.css';

/** One return (API §10): what the customer asked, and the decision. */
export default function AdminReturnPage() {
  const { id = '' } = useParams();
  const returnId = /^\d+$/.test(id) ? Number(id) : 0;
  const query = useAdminReturn(returnId);
  const item = query.data;
  const back = { to: paths.admin.returns, label: 'الإرجاعات' };

  if (returnId === 0 || (query.isError && isApiError(query.error) && query.error.status === 404)) {
    return <NotFoundPage backTo={paths.admin.returns} backLabel="العودة إلى الإرجاعات" />;
  }

  if (!item) {
    return (
      <>
        <AdminPageHeader title="الإرجاع" back={back} />
        {query.isError ? (
          <div className={styles.empty} role="alert">
            <p>{errorMessage(query.error)}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void query.refetch();
              }}
            >
              أعد المحاولة
            </Button>
          </div>
        ) : (
          <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ تحميل الإرجاع" />
        )}
      </>
    );
  }

  const info = returnStatusInfo(item.status);
  const steps = [
    { label: 'طُلب', at: item.requestedAtUtc },
    { label: 'تمت الموافقة', at: item.approvedAtUtc },
    { label: 'رُفض', at: item.rejectedAtUtc },
    { label: 'اكتمل واستُرد', at: item.completedAtUtc },
    { label: 'ألغاه العميل', at: item.cancelledAtUtc },
  ].filter((step): step is { label: string; at: string } => step.at !== null);

  return (
    <>
      <AdminPageHeader
        title={`إرجاع الطلب ${item.orderNumber}`}
        back={back}
        meta={
          <>
            <StatusBadge label={info.label} tone={info.tone} />
            <span>{item.isFullReturn ? 'إرجاع كامل' : 'إرجاع جزئي'}</span>
          </>
        }
      />

      <div className={page.layout}>
        <div className={page.main}>
          <section className={styles.card} aria-labelledby="return-lines-title">
            <h2 id="return-lines-title" className={styles.cardTitle}>
              الكتب المرتجعة
            </h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">الكتاب</th>
                  <th scope="col">الكمية</th>
                  <th scope="col">الحالة عند الاستلام</th>
                </tr>
              </thead>
              <tbody>
                {item.lines.map((line) => (
                  <tr key={line.bookId}>
                    <td data-label="الكتاب">
                      <Link to={paths.admin.book(line.bookId)} className={styles.rowLink}>
                        {line.title}
                      </Link>
                    </td>
                    <td data-label="الكمية" className={styles.num}>
                      {formatCount(line.quantity)}
                    </td>
                    <td data-label="الحالة عند الاستلام">
                      {line.receivedCondition ? CONDITION_LABELS[line.receivedCondition] : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <dl className={page.totals}>
              <div className={page.grand}>
                <dt>مبلغ الاسترداد</dt>
                <dd>{formatMoney(item.refundAmount, item.currency)}</dd>
              </div>
            </dl>
          </section>

          <section className={styles.card} aria-labelledby="return-why-title">
            <h2 id="return-why-title" className={styles.cardTitle}>
              ما كتبه العميل
            </h2>
            <dl className={styles.facts}>
              <div>
                <dt>السبب</dt>
                <dd>{returnReasonLabel(item.reason)}</dd>
              </div>
              <div>
                <dt>التعليق</dt>
                <dd className={page.giftMessage}>{item.customerComment ?? '—'}</dd>
              </div>
            </dl>
          </section>

          {(item.returnInstructions ?? item.rejectionReason) && (
            <section className={styles.card} aria-labelledby="return-reply-title">
              <h2 id="return-reply-title" className={styles.cardTitle}>
                ردّ المتجر
              </h2>
              <dl className={styles.facts}>
                {item.returnInstructions && (
                  <div>
                    <dt>تعليمات الإرسال</dt>
                    <dd>{item.returnInstructions}</dd>
                  </div>
                )}
                {item.rejectionReason && (
                  <div>
                    <dt>سبب الرفض</dt>
                    <dd>{item.rejectionReason}</dd>
                  </div>
                )}
              </dl>
            </section>
          )}
        </div>

        <div className={page.side}>
          <section className={styles.card} aria-labelledby="return-actions-title">
            <h2 id="return-actions-title" className={styles.cardTitle}>
              الإجراءات
            </h2>
            <ReturnActions item={item} />
          </section>

          <section className={styles.card} aria-labelledby="return-facts-title">
            <h2 id="return-facts-title" className={styles.cardTitle}>
              التفاصيل
            </h2>
            <dl className={styles.facts}>
              <div>
                <dt>الطلب</dt>
                <dd>
                  <Link to={paths.admin.order(item.orderId)} className={styles.rowLink} dir="ltr">
                    {item.orderNumber}
                  </Link>
                </dd>
              </div>
              <div>
                <dt>البريد</dt>
                <dd>
                  <a href={`mailto:${item.customerEmail}`} dir="ltr">
                    {item.customerEmail}
                  </a>
                </dd>
              </div>
              {item.refundReference && (
                <div>
                  <dt>مرجع الاسترداد</dt>
                  <dd dir="ltr" className={styles.code}>
                    {item.refundReference}
                  </dd>
                </div>
              )}
            </dl>
            <ol className={page.timeline}>
              {steps.map((step) => (
                <li key={step.label}>
                  <b>{step.label}</b>
                  <span>{formatDateTime(step.at)}</span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  );
}
