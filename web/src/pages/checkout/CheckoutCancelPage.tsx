import { useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('checkout', { keyPrefix: 'result' });
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
      <DocumentTitle title={t('unpaidTitle')} />
      <CheckoutSteps current="checkout" />
      <div className={styles.state}>
        <span className={cx(styles.badge, styles.badgeMuted)} aria-hidden="true">
          <Icon name="lock" size={28} />
        </span>
        <h1 className={styles.title}>{t('unpaidTitle')}</h1>
        {attempt ? (
          <>
            <p>
              {t('noCharge')}
              {attempt.expiresAtUtc &&
                t('heldUntil', { time: formatDateTime(attempt.expiresAtUtc) })}
            </p>
            {attempt.orderNumber && (
              <p className={styles.orderNumber}>
                <Trans
                  t={t}
                  i18nKey="orderNumber"
                  values={{ number: attempt.orderNumber }}
                  components={{ b: <b dir="ltr" /> }}
                />
              </p>
            )}
            {error && <FormAlert>{error}</FormAlert>}
            <div className={styles.actions}>
              {needsCheckout ? (
                <ButtonLink to={paths.checkout} variant="red">
                  {t('review')}
                </ButtonLink>
              ) : (
                <Button variant="red" disabled={busy} onClick={resume}>
                  <Icon name="lock" /> {busy ? t('redirecting') : t('resume')}
                </Button>
              )}
              <ButtonLink to={paths.checkout} variant="ghost">
                {t('editShipping')}
              </ButtonLink>
            </div>
          </>
        ) : (
          <>
            <p>{t('noChargeInCart')}</p>
            <div className={styles.actions}>
              <ButtonLink to={paths.cart} variant="ink">
                {t('backToCart')}
              </ButtonLink>
            </div>
          </>
        )}
      </div>
    </div>
  );
}