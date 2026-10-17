import { Link } from 'react-router';

import { paths } from '@/app/paths';
import type { PublicOrder } from '@/features/orders/types';
import { orderStatusInfo } from '@/shared/api/enums';
import { booksPhrase, formatCount, formatDate, formatMoney } from '@/shared/lib/format';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';

import styles from './OrderCard.module.css';

const MAX_COVERS = 3;

/** One row of «طلباتي»: stacked covers, number, date, status, total (spec 5.9). */
export function OrderCard({ order }: { order: PublicOrder }) {
  const status = orderStatusInfo(order.status);
  const covers = order.lines.slice(0, MAX_COVERS);
  const more = order.lines.length - covers.length;
  const href = paths.account.order(order.orderNumber);

  return (
    <li className={styles.card}>
      <span className={styles.covers} aria-hidden="true">
        {covers.map((line) => {
          const cover = line.coverThumbnailUrl ?? line.coverImageUrl;
          return (
            <span key={line.bookId} className={styles.cover}>
              {cover && <img src={cover} alt="" width={40} height={58} loading="lazy" />}
            </span>
          );
        })}
        {more > 0 && <span className={styles.more}>+{formatCount(more)}</span>}
      </span>

      <span className={styles.info}>
        <Link to={href} className={styles.number}>
          <span dir="ltr">{order.orderNumber}</span>
        </Link>
        <span className={styles.meta}>
          {formatDate(order.createdAtUtc)} · {booksPhrase(order.lines.length)}
        </span>
      </span>

      <span className={styles.side}>
        <StatusBadge label={status.label} tone={status.tone} />
        <b className={styles.total}>{formatMoney(order.total, order.currency)}</b>
      </span>
    </li>
  );
}
