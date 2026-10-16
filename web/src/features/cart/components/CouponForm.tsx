import { useState } from 'react';

import { useCartStore } from '@/features/cart/cartStore';
import { checkoutApi } from '@/features/checkout/api';
import type { Quote } from '@/features/checkout/types';
import { errorMessage } from '@/shared/api/errorMessages';
import { formatCount, formatMoney } from '@/shared/lib/format';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './CartSummary.module.css';

/** Spec 5.6 dotted coupon box. Previews with /coupons/check, then the quote applies it. */
export function CouponForm({ quote }: { quote: Quote | undefined }) {
  const couponCode = useCartStore((state) => state.couponCode);
  const setCoupon = useCartStore((state) => state.setCoupon);
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);

  const rejected = quote?.problems.some((problem) => problem.code === 'Checkout.CouponInvalid');

  if (couponCode) {
    return (
      <div className={styles.coupon}>
        <p className={styles.couponApplied}>
          <Icon name={rejected ? 'x' : 'check'} size={16} />
          <span dir="ltr">{couponCode}</span>
          {rejected
            ? ' لا يمكن استخدام هذا الكود الآن.'
            : quote?.coupon &&
              ` خصم ${formatCount(quote.coupon.discountPercentage)}٪ (−${formatMoney(quote.discountAmount, quote.currency)})`}
        </p>
        <button
          type="button"
          className={styles.couponRemove}
          onClick={() => {
            setCoupon(null);
          }}
        >
          إزالة
        </button>
      </div>
    );
  }

  return (
    <form
      className={styles.coupon}
      onSubmit={(event) => {
        event.preventDefault();
        const value = code.trim();
        if (value === '') return;
        setChecking(true);
        setError(null);
        checkoutApi
          .checkCoupon(value)
          .then((result) => {
            setCoupon(result.code);
            setCode('');
          })
          .catch((reason: unknown) => {
            setError(errorMessage(reason));
          })
          .finally(() => {
            setChecking(false);
          });
      }}
    >
      <label htmlFor="coupon-code" className="sr-only">
        كود الخصم
      </label>
      <input
        id="coupon-code"
        className={styles.couponInput}
        value={code}
        dir="ltr"
        autoComplete="off"
        autoCapitalize="characters"
        placeholder="كود الخصم"
        maxLength={50}
        onChange={(event) => {
          setCode(event.target.value);
        }}
      />
      <button
        type="submit"
        className={styles.couponApply}
        disabled={checking || code.trim() === ''}
      >
        {checking ? '…' : 'تطبيق'}
      </button>
      {error && (
        <p className={styles.couponError} role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
