import { useState } from 'react';
import { useSearchParams } from 'react-router';

import { paths } from '@/app/paths';
import { useAttemptForOrder, useCheckoutStore } from '@/features/checkout/checkoutStore';
import { CheckoutSteps } from '@/features/checkout/components/CheckoutSteps';
import { placeOrder, redirectToPayment } from '@/features/checkout/placeOrder';
import { ApiError } from '@/shared/api/ApiError';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { formatDateTime } from '@/shared/lib/format';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';
import { FormAlert } from '@/shared/ui/form/Field';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './CheckoutResult.module.css';

/** Back from the payment page without paying (API §5, cancel page). */
export default function CheckoutCancelPage() {
  const [params] = useSearchParams();
  const orderNumber = params.get('order')?.trim() ?? null;
  const attempt = useAttemptForOrder(orderNumber);
  const [error, setError] = useState<string | null>(null);
  const [needsCheckout, setNeedsCheckout] = useState(false);
  const [busy, setBusy] = useState(false);

  /**
   * Same request, same Idempotency-Key: the server returns the same order and
   * its still-valid checkoutUrl, so the stock isn't held twice. An expired
   * hold gets a new key automatically (checkoutStore.keyFor).
   */
  const resume = () => {
    if (!attempt) return;
    setBusy(true);
    setError(null);
    placeOrder(attempt.request)
      .then((response) => {
        if (!redirectToPayment(response.checkoutUrl)) {
          setBusy(false);
          setError(errorMessage(null));
        }
      })
      .catch((reason: unknown) => {
        setBusy(false);
        setError(errorMessage(reason));
        // Terms, stock, coupon or address changed: review the order on the checkout page.
        if (reason instanceof ApiError && reason.status >= 400 && reason.status < 500) {
          useCheckoutStore.getState().clearAttempt();
          setNeedsCheckout(true);
        }
      });
  };

  return (
    <div className={cx('wrap', styles.page)}>
      <DocumentTitle title="لم يكتمل الدفع" />
      <CheckoutSteps current="checkout" />
      <div className={styles.state}>
        <span className={cx(styles.badge, styles.badgeMuted)} aria-hidden="true">
          <Icon name="lock" size={28} />
        </span>
        <h1 className={styles.title}>لم يكتمل الدفع</h1>
        {attempt ? (
          <>
            <p>
              لم يُخصم أي مبلغ.
              {attempt.expiresAtUtc &&
                ` كتبك محجوزة لك حتى ${formatDateTime(attempt.expiresAtUtc)}، ويمكنك العودة إلى الدفع الآن.`}
            </p>
            {attempt.orderNumber && (
              <p className={styles.orderNumber}>
                رقم الطلب <b dir="ltr">{attempt.orderNumber}</b>
              </p>
            )}
            {error && <FormAlert>{error}</FormAlert>}
            <div className={styles.actions}>
              {needsCheckout ? (
                <ButtonLink to={paths.checkout} variant="red">
                  مراجعة الطلب
                </ButtonLink>
              ) : (
                <Button variant="red" disabled={busy} onClick={resume}>
                  <Icon name="lock" /> {busy ? 'جارٍ التحويل…' : 'العودة إلى الدفع'}
                </Button>
              )}
              <ButtonLink to={paths.checkout} variant="ghost">
                تعديل بيانات الشحن
              </ButtonLink>
            </div>
          </>
        ) : (
          <>
            <p>لم يُخصم أي مبلغ، وما زالت كتبك في السلة.</p>
            <div className={styles.actions}>
              <ButtonLink to={paths.cart} variant="ink">
                العودة إلى السلة
              </ButtonLink>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
