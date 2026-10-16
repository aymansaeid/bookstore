import type { Quote } from '@/features/checkout/types';
import { cx } from '@/shared/lib/cx';
import { formatMoney } from '@/shared/lib/format';

import styles from './QuoteTotals.module.css';

function Row({ label, value, saving }: { label: string; value: string; saving?: boolean }) {
  return (
    <div className={cx(styles.row, saving && styles.saving)}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

/** The quote's money rows, exactly as the server calculated them (§5b). */
export function QuoteTotals({ quote, stale }: { quote: Quote; stale: boolean }) {
  const money = (amount: number) => formatMoney(amount, quote.currency);
  return (
    <dl className={cx(styles.totals, stale && styles.stale)} aria-busy={stale}>
      <Row label="المجموع" value={money(quote.subtotal)} />
      {quote.pathDiscountAmount > 0 && (
        <Row
          label={quote.pathDiscount ? `خصم المسار «${quote.pathDiscount.title}»` : 'خصم المسار'}
          value={`−${money(quote.pathDiscountAmount)}`}
          saving
        />
      )}
      {quote.discountAmount > 0 && (
        <Row
          label={quote.coupon ? `كود الخصم ${quote.coupon.code}` : 'كود الخصم'}
          value={`−${money(quote.discountAmount)}`}
          saving
        />
      )}
      <Row
        label="الشحن"
        value={
          quote.selectedShippingMethod === null
            ? '—'
            : quote.shippingCost === 0
              ? 'مجاني'
              : money(quote.shippingCost)
        }
      />
      {quote.giftWrap.selected && <Row label="تغليف الهدية" value={money(quote.giftWrap.fee)} />}
      <div className={styles.total}>
        <dt>الإجمالي</dt>
        <dd>{money(quote.total)}</dd>
      </div>
    </dl>
  );
}
