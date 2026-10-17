import { Link } from 'react-router';

import { paths } from '@/app/paths';
import type { PublicOrder } from '@/features/orders/types';
import { countryName, formatCount, formatMoney } from '@/shared/lib/format';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './OrderSummary.module.css';

/** Lines, totals and destination of a PublicOrderDto (API §6). */
export function OrderSummary({ order }: { order: PublicOrder }) {
  const money = (amount: number) => formatMoney(amount, order.currency);
  const pickup = order.shippingMethodCode === 'pickup';
  return (
    <div className={styles.summary}>
      <ul className={styles.lines}>
        {order.lines.map((line) => {
          const cover = line.coverThumbnailUrl ?? line.coverImageUrl;
          return (
            <li key={line.bookId} className={styles.line}>
              <span className={styles.thumb}>
                {cover && <img src={cover} alt="" width={44} height={64} loading="lazy" />}
              </span>
              <span className={styles.title}>
                {line.bookSlug ? (
                  <Link to={paths.book(line.bookSlug)}>{line.title}</Link>
                ) : (
                  line.title
                )}
                <span className={styles.qty}> × {formatCount(line.quantity)}</span>
              </span>
              <span className={styles.lineTotal}>{money(line.lineTotal)}</span>
            </li>
          );
        })}
      </ul>
      <dl className={styles.totals}>
        <div>
          <dt>المجموع</dt>
          <dd>{money(order.subtotal)}</dd>
        </div>
        {order.pathDiscountAmount > 0 && (
          <div className={styles.saving}>
            <dt>خصم المسار</dt>
            <dd>−{money(order.pathDiscountAmount)}</dd>
          </div>
        )}
        {order.discountAmount > 0 && (
          <div className={styles.saving}>
            <dt>كود الخصم</dt>
            <dd>−{money(order.discountAmount)}</dd>
          </div>
        )}
        <div>
          <dt>الشحن</dt>
          <dd>{order.shippingCost === 0 ? 'مجاني' : money(order.shippingCost)}</dd>
        </div>
        {order.giftWrap && (
          <div>
            <dt>تغليف الهدية</dt>
            <dd>{money(order.giftWrapFee)}</dd>
          </div>
        )}
        <div className={styles.total}>
          <dt>الإجمالي</dt>
          <dd>{money(order.total)}</dd>
        </div>
      </dl>
      <p className={styles.destination}>
        <Icon name={pickup ? 'pin' : 'truck'} size={16} />
        {pickup
          ? 'الاستلام من مكتبتنا في إسطنبول'
          : `الشحن إلى ${order.shipToCity}، ${countryName(order.shipToCountryCode)}`}
      </p>
    </div>
  );
}
