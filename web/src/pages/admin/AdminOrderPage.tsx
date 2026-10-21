import { Link, useParams } from 'react-router';

import { paths } from '@/app/paths';
import styles from '@/features/admin/components/admin.module.css';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import type { AdminOrder } from '@/features/admin/orders/api';
import { OrderActions } from '@/features/admin/orders/components/OrderActions';
import { OrderDocuments } from '@/features/admin/orders/components/OrderDocuments';
import { shippingMethodLabel } from '@/features/admin/orders/labels';
import { useAdminOrder } from '@/features/admin/orders/queries';
import NotFoundPage from '@/pages/not-found/NotFoundPage';
import { isApiError } from '@/shared/api/ApiError';
import { orderStatusInfo } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import { countryName, formatCount, formatDateTime, formatMoney } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';

import page from './AdminOrderPage.module.css';

function Totals({ order }: { order: AdminOrder }) {
  const money = (value: number) => formatMoney(value, order.currency);
  return (
    <dl className={page.totals}>
      <div>
        <dt>المجموع</dt>
        <dd>{money(order.subtotal)}</dd>
      </div>
      {order.pathDiscountAmount > 0 && (
        <div>
          <dt>خصم المسار</dt>
          <dd>−{money(order.pathDiscountAmount)}</dd>
        </div>
      )}
      {order.discountAmount > 0 && (
        <div>
          <dt>
            الكوبون{' '}
            {order.appliedCouponCode && (
              <span dir="ltr" className={styles.code}>
                {order.appliedCouponCode}
              </span>
            )}
          </dt>
          <dd>−{money(order.discountAmount)}</dd>
        </div>
      )}
      <div>
        <dt>الشحن ({shippingMethodLabel(order.shippingMethodCode, order.shippingMethodName)})</dt>
        <dd>{order.shippingCost === 0 ? 'مجاني' : money(order.shippingCost)}</dd>
      </div>
      {order.giftWrap && (
        <div>
          <dt>تغليف هدية</dt>
          <dd>{money(order.giftWrapFee)}</dd>
        </div>
      )}
      <div className={page.grand}>
        <dt>الإجمالي</dt>
        <dd>{money(order.total)}</dd>
      </div>
    </dl>
  );
}

function Timeline({ order }: { order: AdminOrder }) {
  const steps = [
    { label: 'أُنشئ', at: order.createdAtUtc },
    { label: 'دُفع', at: order.paidAtUtc },
    { label: 'شُحن', at: order.shippedAtUtc },
    { label: 'سُلّم', at: order.deliveredAtUtc },
    {
      label: order.cancelledByCustomer ? 'ألغاه العميل' : 'أُلغي',
      at: order.cancelledAtUtc,
    },
  ].filter((step): step is { label: string; at: string } => step.at !== null);

  return (
    <ol className={page.timeline}>
      {steps.map((step) => (
        <li key={step.label}>
          <b>{step.label}</b>
          <span>{formatDateTime(step.at)}</span>
        </li>
      ))}
    </ol>
  );
}

/** One order (API §10): everything the store needs to fulfil, fix or cancel it. */
export default function AdminOrderPage() {
  const { id = '' } = useParams();
  const orderId = /^\d+$/.test(id) ? Number(id) : 0;
  const query = useAdminOrder(orderId);
  const order = query.data;

  if (orderId === 0 || (query.isError && isApiError(query.error) && query.error.status === 404)) {
    return <NotFoundPage backTo={paths.admin.orders} backLabel="العودة إلى الطلبات" />;
  }

  const back = { to: paths.admin.orders, label: 'الطلبات' };

  if (query.isError && !order) {
    return (
      <>
        <AdminPageHeader title="الطلب" back={back} />
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
      </>
    );
  }

  if (!order) {
    return (
      <>
        <AdminPageHeader title="الطلب" back={back} />
        <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ تحميل الطلب" />
      </>
    );
  }

  const info = orderStatusInfo(order.status);
  const address = order.shippingAddress;

  return (
    <>
      <AdminPageHeader
        title={`الطلب ${order.orderNumber}`}
        back={back}
        meta={
          <>
            <StatusBadge
              label={order.status === 'Paid' ? 'بانتظار الشحن' : info.label}
              tone={info.tone}
            />
            <span>{formatDateTime(order.createdAtUtc)}</span>
          </>
        }
        actions={<OrderDocuments orderId={order.id} />}
      />

      <div className={page.layout}>
        <div className={page.main}>
          <section className={styles.card} aria-labelledby="lines-title">
            <h2 id="lines-title" className={styles.cardTitle}>
              الكتب
            </h2>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">الكتاب</th>
                  <th scope="col">الكمية</th>
                  <th scope="col">السعر</th>
                  <th scope="col">المجموع</th>
                </tr>
              </thead>
              <tbody>
                {order.lines.map((line) => (
                  <tr key={line.bookId}>
                    <td data-label="الكتاب">
                      <Link to={paths.admin.book(line.bookId)} className={styles.rowLink}>
                        {line.title}
                      </Link>
                    </td>
                    <td data-label="الكمية" className={styles.num}>
                      {formatCount(line.quantity)}
                    </td>
                    <td data-label="السعر" className={styles.num}>
                      {formatMoney(line.unitPrice, order.currency)}
                    </td>
                    <td data-label="المجموع" className={styles.num}>
                      {formatMoney(line.lineTotal, order.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Totals order={order} />
          </section>

          <section className={styles.card} aria-labelledby="ship-title">
            <h2 id="ship-title" className={styles.cardTitle}>
              الشحن والعنوان
            </h2>
            <address className={page.address}>
              <b>{address.recipientName}</b>
              <a href={`tel:${address.phone.replace(/\s+/g, '')}`} dir="ltr">
                {address.phone}
              </a>
              <span>{address.line1}</span>
              {address.line2 && <span>{address.line2}</span>}
              <span>
                {address.city}
                {address.stateOrProvince && ` · ${address.stateOrProvince}`}
              </span>
              <span>
                <bdi>{address.postalCode}</bdi>
              </span>
              <span>{countryName(address.countryCode)}</span>
            </address>
            <dl className={styles.facts}>
              <div>
                <dt>طريقة الشحن</dt>
                <dd>{shippingMethodLabel(order.shippingMethodCode, order.shippingMethodName)}</dd>
              </div>
              {order.shippingCarrier && (
                <div>
                  <dt>شركة الشحن</dt>
                  <dd>{order.shippingCarrier}</dd>
                </div>
              )}
              {order.trackingNumber && (
                <div>
                  <dt>رقم التتبع</dt>
                  <dd dir="ltr" className={styles.code}>
                    {order.trackingNumber}
                  </dd>
                </div>
              )}
            </dl>
            {order.giftWrap && (
              <div className={page.gift}>
                <b>تغليف هدية</b>
                {order.giftMessage ? (
                  <p className={page.giftMessage}>{order.giftMessage}</p>
                ) : (
                  <p className={styles.muted}>بلا بطاقة إهداء.</p>
                )}
              </div>
            )}
          </section>
        </div>

        <div className={page.side}>
          <section className={styles.card} aria-labelledby="actions-title">
            <h2 id="actions-title" className={styles.cardTitle}>
              الإجراءات
            </h2>
            <OrderActions order={order} />
          </section>

          <section className={styles.card} aria-labelledby="customer-title">
            <h2 id="customer-title" className={styles.cardTitle}>
              العميل والدفع
            </h2>
            <dl className={styles.facts}>
              <div>
                <dt>البريد</dt>
                <dd>
                  <a href={`mailto:${order.customerEmail}`} dir="ltr">
                    {order.customerEmail}
                  </a>
                </dd>
              </div>
              <div>
                <dt>مرجع الدفع</dt>
                <dd dir="ltr" className={styles.code}>
                  {order.paymentReference ?? '—'}
                </dd>
              </div>
              <div>
                <dt>جلسة الدفع</dt>
                <dd dir="ltr" className={styles.code}>
                  {order.checkoutSessionId ?? '—'}
                </dd>
              </div>
              {order.readingPathId !== null && (
                <div>
                  <dt>مسار القراءة</dt>
                  <dd>#{formatCount(order.readingPathId)}</dd>
                </div>
              )}
              {order.cancellationReason && (
                <div>
                  <dt>سبب الإلغاء</dt>
                  <dd>{order.cancellationReason}</dd>
                </div>
              )}
            </dl>
            <Timeline order={order} />
          </section>
        </div>
      </div>
    </>
  );
}
