import { useTranslation } from 'react-i18next';
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

import styles from './CartSummary.module.css';
import { CouponForm } from './CouponForm';

function Row({ label, value, tone }: { label: string; value: string; tone?: 'saving' }) {
  return (
    <div className={cx(styles.row, tone === 'saving' && styles.saving)}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

export function CartSummary({ quote, stale }: { quote: Quote | undefined; stale: boolean }) {
  const { t } = useTranslation('checkout');
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
        {t('summary.title')}
      </h2>

      <div className={styles.block}>
        <label htmlFor="cart-country" className={styles.label}>
          {t('summary.shipTo')}
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
            <Icon name="gift" size={18} />{' '}
            {t('summary.giftWrap', { fee: formatMoney(quote.giftWrap.fee, quote.currency) })}
          </Checkbox>
          <p className={styles.hint}>{t('summary.giftHint')}</p>
        </div>
      )}

      <div className={styles.block}>
        <CouponForm quote={quote} />
      </div>

      {quote && (
        <dl className={cx(styles.totals, stale && styles.stale)} aria-busy={stale}>
          <Row label={t('totals.subtotal')} value={formatMoney(quote.subtotal, quote.currency)} />
          {quote.pathDiscountAmount > 0 && (
            <Row
              label={
                quote.pathDiscount
                  ? t('totals.pathDiscountNamed', { title: quote.pathDiscount.title })
                  : t('totals.pathDiscount')
              }
              value={`−${formatMoney(quote.pathDiscountAmount, quote.currency)}`}
              tone="saving"
            />
          )}
          {quote.discountAmount > 0 && (
            <Row
              label={t('totals.coupon')}
              value={`−${formatMoney(quote.discountAmount, quote.currency)}`}
              tone="saving"
            />
          )}
          <Row
            label={t('totals.shipping')}
            value={
              quote.selectedShippingMethod === null
                ? '—'
                : quote.shippingCost === 0
                  ? t('totals.free')
                  : formatMoney(quote.shippingCost, quote.currency)
            }
          />
          {quote.giftWrap.selected && (
            <Row
              label={t('totals.giftWrap')}
              value={formatMoney(quote.giftWrap.fee, quote.currency)}
            />
          )}
          <div className={styles.totalRow}>
            <dt>{t('totals.total')}</dt>
            <dd>{formatMoney(quote.total, quote.currency)}</dd>
          </div>
        </dl>
      )}

      {canCheckout ? (
        <Link to={paths.checkout} className={buttonClass('red', 'md', styles.checkout)}>
          <Icon name="lock" /> {t('cart.checkout')}
        </Link>
      ) : (
        <span className={buttonClass('red', 'md', styles.checkout)} aria-disabled="true">
          <Icon name="lock" /> {t('cart.checkout')}
        </span>
      )}
      <p className={styles.secure}>{t('summary.secure')}</p>
    </aside>
  );
}