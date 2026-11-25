import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { paths } from '@/app/paths';
import { useCartStore } from '@/features/cart/cartStore';
import { useAttemptForOrder, useCheckoutStore } from '@/features/checkout/checkoutStore';
import { CheckoutSteps } from '@/features/checkout/components/CheckoutSteps';
import { ordersApi } from '@/features/orders/api';
import { OrderSummary } from '@/features/orders/components/OrderSummary';
import { trackOrderUrl } from '@/features/orders/links';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';
import { FormAlert, TextField } from '@/shared/ui/form/Field';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './CheckoutResult.module.css';

/**
 * API §5: payment confirmation can land a few seconds after the redirect, so
 * poll while PendingPayment. Lookups are limited to 10 a minute, so: the first
 * call, then every 3 s, 7 calls (about 20 s) in all.
 */
const POLL_MS = 3000;
const MAX_POLLS = 7;
const CONFIRMED = new Set(['Paid', 'Shipped', 'Delivered']);

function OrderStatusView({ orderNumber, email }: { orderNumber: string; email: string }) {
  const { t } = useTranslation('checkout', { keyPrefix: 'result' });
  const { t: tc } = useTranslation();

  const order = useQuery({
    queryKey: ['order-status', orderNumber, email] as const,
    queryFn: () => ordersApi.track(orderNumber, email),
    refetchInterval: (query) =>
      query.state.data?.status === 'PendingPayment' && query.state.dataUpdateCount < MAX_POLLS
        ? POLL_MS
        : false,
    refetchOnWindowFocus: false,
    staleTime: 0,
  });
  const status = order.data?.status;
  const attempt = useAttemptForOrder(orderNumber);

  useEffect(() => {
    if (!status || !attempt) return;
    if (CONFIRMED.has(status)) {
      // Paid: this tab's cart and checkout details are done with.
      useCartStore.getState().clear();
      useCheckoutStore.getState().reset();
    } else if (status !== 'PendingPayment') {
      // Expired or cancelled: the next payment must start a new attempt with a new key.
      useCheckoutStore.getState().clearAttempt();
    }
  }, [status, attempt]);

  if (order.isPending) {
    return (
      <div className={styles.state} aria-busy="true">
        <span className={styles.spinner} aria-hidden="true" />
        <h1 className={styles.title}>{t('confirming')}</h1>
      </div>
    );
  }

  if (order.isError) {
    return (
      <div className={styles.state}>
        <h1 className={styles.title}>{t('loadFailed')}</h1>
        <FormAlert>{errorMessage(order.error)}</FormAlert>
        <div className={styles.actions}>
          <Button
            variant="ink"
            onClick={() => {
              void order.refetch();
            }}
          >
            {tc('ui.retry')}
          </Button>
          <ButtonLink to={trackOrderUrl(orderNumber)} state={{ email }} variant="ghost">
            {t('track')}
          </ButtonLink>
        </div>
      </div>
    );
  }

  const data = order.data;

  if (data.status === 'PendingPayment') {
    return (
      <div className={styles.state}>
        <span className={styles.spinner} aria-hidden="true" />
        <h1 className={styles.title}>{t('pendingTitle')}</h1>
        <p>{t('pendingText')}</p>
        <p className={styles.orderNumber}>
          <Trans
            t={t}
            i18nKey="orderNumber"
            values={{ number: data.orderNumber }}
            components={{ b: <b dir="ltr" /> }}
          />
        </p>
        <div className={styles.actions}>
          <Button
            variant="ink"
            disabled={order.isFetching}
            onClick={() => {
              void order.refetch();
            }}
          >
            {t('checkAgain')}
          </Button>
          <ButtonLink to={trackOrderUrl(data.orderNumber)} state={{ email }} variant="ghost">
            {t('trackLater')}
          </ButtonLink>
        </div>
      </div>
    );
  }

  if (!CONFIRMED.has(data.status)) {
    return (
      <div className={styles.state}>
        <span className={cx(styles.badge, styles.badgeMuted)} aria-hidden="true">
          <Icon name="x" size={28} />
        </span>
        <h1 className={styles.title}>{t('notCompleted')}</h1>
        <p>{data.status === 'Expired' ? t('expired') : t('cancelled')}</p>
        <div className={styles.actions}>
          <ButtonLink to={paths.cart} variant="ink">
            {t('backToCart')}
          </ButtonLink>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.success}>
      <div className={styles.state}>
        <span className={styles.badge} aria-hidden="true">
          <Icon name="check" size={30} />
        </span>
        <h1 className={styles.title}>{t('thanks')}</h1>
        <p>
          <Trans t={t} i18nKey="sentTo" values={{ email }} components={{ b: <b dir="ltr" /> }} />
        </p>
        <p className={styles.orderNumber}>
          <Trans
            t={t}
            i18nKey="orderNumber"
            values={{ number: data.orderNumber }}
            components={{ b: <b dir="ltr" /> }}
          />
        </p>
      </div>
      <OrderSummary order={data} />
      <div className={styles.actions}>
        <ButtonLink to={trackOrderUrl(data.orderNumber)} state={{ email }} variant="ink">
          <Icon name="truck" /> {t('track')}
        </ButtonLink>
        <ButtonLink to={paths.search} variant="ghost">
          {t('continueShopping')}
        </ButtonLink>
      </div>
    </div>
  );
}

/** Opened in another tab or device: the email isn't in this tab, so ask for it. */
function EmailPrompt({ onEmail }: { onEmail: (email: string) => void }) {
  const { t } = useTranslation('checkout', { keyPrefix: 'result' });
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  return (
    <form
      className={styles.state}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        const email = value.trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
          setError(t('emailInvalid'));
          return;
        }
        onEmail(email);
      }}
    >
      <h1 className={styles.title}>{t('viewTitle')}</h1>
      <p>{t('viewText')}</p>
      <TextField
        className={styles.emailField}
        label={t('email')}
        type="email"
        dir="ltr"
        inputMode="email"
        autoComplete="email"
        value={value}
        error={error ?? undefined}
        onChange={(event) => {
          setValue(event.target.value);
        }}
      />
      <Button type="submit" variant="ink">
        {t('view')}
      </Button>
    </form>
  );
}

export default function CheckoutSuccessPage() {
  const { t } = useTranslation('checkout', { keyPrefix: 'result' });
  const [params] = useSearchParams();
  const orderNumber = params.get('order')?.trim() ?? '';
  const attempt = useAttemptForOrder(orderNumber);
  // Kept in state: the stored attempt is cleared once the order is confirmed.
  const [email, setEmail] = useState<string | null>(() => attempt?.email ?? null);

  return (
    <div className={cx('wrap', styles.page)}>
      <DocumentTitle title={t('confirmTitle')} />
      <CheckoutSteps current="done" />
      {orderNumber === '' ? (
        <div className={styles.state}>
          <h1 className={styles.title}>{t('noOrder')}</h1>
          <ButtonLink to={paths.trackOrder} variant="ink">
            {t('trackAny')}
          </ButtonLink>
        </div>
      ) : email ? (
        <OrderStatusView orderNumber={orderNumber} email={email} />
      ) : (
        <EmailPrompt onEmail={setEmail} />
      )}
    </div>
  );
}