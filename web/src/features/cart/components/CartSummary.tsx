import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { useCartStore } from '@/features/cart/cartStore';
import { CountrySelect, ShippingOptions } from '@/features/checkout/components/ShippingChoice';
import type { Quote } from '@/features/checkout/types';
import { codeMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { formatMoney } from '@/shared/lib/format';
import { buttonClass } from '@/shared/ui/Button/buttonClass';
import { Checkbox } from '@/shared/ui/form/Field';
import { Icon } from '@/shared/ui/Icon/Icon';

import { CouponForm } from './CouponForm';
import styles from './CartSummary.module.css';

function Row({ label, value, tone }: { label: string; value: string; tone?: 'saving' }) {
  return (
    <div className={cx(styles.row, tone === 'saving' && styles.saving)}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function CartSummary({ quote, stale }: { quote: Quote | undefined; stale: boolean }) {
  const countryCode = useCartStore((state) => state.countryCode);
  const setCountry = useCartStore((state) => state.setCountry);
  const giftWrap = useCartStore((state) => state.giftWrap);
  const setGiftWrap = useCartStore((state) => state.setGiftWrap);

  const zoneUnsupported = quote?.problems.some(
    (problem) => problem.code === 'Checkout.ShippingZoneNotSupported',
  );
  const canCheckout = quote?.canCheckout === true;

  return (
    <aside className={styles.summary} aria-labelledby="summary-title">
      <h2 id="summary-title" className={styles.heading}>
        ملخّص الطلب
      </h2>

      <div className={styles.block}>
        <label htmlFor="cart-country" className={styles.label}>
          الشحن إلى
        </label>
        <CountrySelect id="cart-country" value={countryCode} onChange={setCountry} />
        {zoneUnsupported && (
          <p className={styles.problem}>{codeMessage('Checkout.ShippingZoneNotSupported')}</p>
        )}
      </div>

      {quote && quote.shippingOptions.length > 0 && (
        <div className={styles.block}>
          <ShippingOptions quote={quote} />
        </div>
      )}

      {quote?.giftWrap.available && (
        <div className={styles.gift}>
          <Checkbox
            checked={giftWrap}
            onChange={(event) => {
              setGiftWrap(event.target.checked);
            }}
          >
            <Icon name="gift" size={18} /> تغليف هدية فاخر (+
            {formatMoney(quote.giftWrap.fee, quote.currency)})
          </Checkbox>
          <p className={styles.hint}>يمكنك كتابة رسالة الإهداء في خطوة الدفع.</p>
        </div>
      )}

      <div className={styles.block}>
        <CouponForm quote={quote} />
      </div>

      {quote && (
        <dl className={cx(styles.totals, stale && styles.stale)} aria-busy={stale}>
          <Row label="المجموع" value={formatMoney(quote.subtotal, quote.currency)} />
          {quote.pathDiscountAmount > 0 && (
            <Row
              label={`خصم المسار${quote.pathDiscount ? ` «${quote.pathDiscount.title}»` : ''}`}
              value={`−${formatMoney(quote.pathDiscountAmount, quote.currency)}`}
              tone="saving"
            />
          )}
          {quote.discountAmount > 0 && (
            <Row
              label="كود الخصم"
              value={`−${formatMoney(quote.discountAmount, quote.currency)}`}
              tone="saving"
            />
          )}
          <Row
            label="الشحن"
            value={
              quote.selectedShippingMethod === null
                ? '—'
                : quote.shippingCost === 0
                  ? 'مجاني'
                  : formatMoney(quote.shippingCost, quote.currency)
            }
          />
          {quote.giftWrap.selected && (
            <Row label="تغليف الهدية" value={formatMoney(quote.giftWrap.fee, quote.currency)} />
          )}
          <div className={styles.totalRow}>
            <dt>الإجمالي</dt>
            <dd>{formatMoney(quote.total, quote.currency)}</dd>
          </div>
        </dl>
      )}

      {canCheckout ? (
        <Link to={paths.checkout} className={buttonClass('red', 'md', styles.checkout)}>
          <Icon name="lock" /> إتمام الطلب
        </Link>
      ) : (
        <span className={buttonClass('red', 'md', styles.checkout)} aria-disabled="true">
          <Icon name="lock" /> إتمام الطلب
        </span>
      )}
      <p className={styles.secure}>الدفع آمن عبر بوابة الدفع، ولا نحفظ بيانات بطاقتك.</p>
    </aside>
  );
}
