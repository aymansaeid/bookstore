import { useQuery } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router';

import { paths } from '@/app/paths';
import { useCartStore } from '@/features/cart/cartStore';
import { useAttemptForOrder, useCheckoutStore } from '@/features/checkout/checkoutStore';
import { CheckoutSteps } from '@/features/checkout/components/CheckoutSteps';
import { ordersApi } from '@/features/orders/api';
import type { PublicOrder } from '@/features/orders/types';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { countryName, formatCount, formatMoney } from '@/shared/lib/format';
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

const trackUrl = (orderNumber: string) =>
  `${paths.trackOrder}?${new URLSearchParams({ order: orderNumber }).toString()}`;

function OrderSummary({ order }: { order: PublicOrder }) {
  const money = (amount: number) => formatMoney(amount, order.currency);
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
              <span className={styles.lineTitle}>
                {line.bookSlug ? (
                  <Link to={paths.book(line.bookSlug)}>{line.title}</Link>
                ) : (
                  line.title
                )}
                <span className={styles.muted}> × {formatCount(line.quantity)}</span>
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
      <p className={styles.muted}>
        <Icon name={order.shippingMethodCode === 'pickup' ? 'pin' : 'truck'} size={16} />{' '}
        {order.shippingMethodCode === 'pickup'
          ? 'الاستلام من مكتبتنا في إسطنبول'
          : `الشحن إلى ${order.shipToCity}، ${countryName(order.shipToCountryCode)}`}
      </p>
    </div>
  );
}

function OrderStatusView({ orderNumber, email }: { orderNumber: string; email: string }) {
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
        <h1 className={styles.title}>جارٍ تأكيد طلبك…</h1>
      </div>
    );
  }

  if (order.isError) {
    return (
      <div className={styles.state}>
        <h1 className={styles.title}>تعذّر عرض الطلب</h1>
        <FormAlert>{errorMessage(order.error)}</FormAlert>
        <div className={styles.actions}>
          <Button
            variant="ink"
            onClick={() => {
              void order.refetch();
            }}
          >
            أعد المحاولة
          </Button>
          <ButtonLink to={trackUrl(orderNumber)} variant="ghost">
            تتبّع الطلب
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
        <h1 className={styles.title}>جارٍ تأكيد الدفع</h1>
        <p>
          لم يصلنا تأكيد الدفع من البوابة بعد، وقد يستغرق ذلك لحظات. لا تُعِد الدفع؛ سنرسل التأكيد
          إلى بريدك فور وصوله.
        </p>
        <p className={styles.orderNumber}>
          رقم الطلب <b dir="ltr">{data.orderNumber}</b>
        </p>
        <div className={styles.actions}>
          <Button
            variant="ink"
            disabled={order.isFetching}
            onClick={() => {
              void order.refetch();
            }}
          >
            تحقّق مجدداً
          </Button>
          <ButtonLink to={trackUrl(data.orderNumber)} variant="ghost">
            تتبّع الطلب لاحقاً
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
        <h1 className={styles.title}>لم يكتمل هذا الطلب</h1>
        <p>
          {data.status === 'Expired'
            ? 'انتهت مهلة الدفع وأُلغي الحجز. ما زالت كتبك في السلة إن أردت المحاولة من جديد.'
            : 'أُلغي هذا الطلب. إن خُصم أي مبلغ فسيُعاد إليك تلقائياً.'}
        </p>
        <div className={styles.actions}>
          <ButtonLink to={paths.cart} variant="ink">
            العودة إلى السلة
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
        <h1 className={styles.title}>شكراً لك! تم استلام طلبك</h1>
        <p>
          أرسلنا التأكيد ومستندات الطلب إلى <b dir="ltr">{email}</b>، وسنراسلك برقم التتبّع عند
          الشحن.
        </p>
        <p className={styles.orderNumber}>
          رقم الطلب <b dir="ltr">{data.orderNumber}</b>
        </p>
      </div>
      <OrderSummary order={data} />
      <div className={styles.actions}>
        <ButtonLink to={trackUrl(data.orderNumber)} variant="ink">
          <Icon name="truck" /> تتبّع الطلب
        </ButtonLink>
        <ButtonLink to={paths.search} variant="ghost">
          متابعة التسوّق
        </ButtonLink>
      </div>
    </div>
  );
}

/** Opened in another tab or device: the email isn't in this tab, so ask for it. */
function EmailPrompt({ onEmail }: { onEmail: (email: string) => void }) {
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
          setError('أدخل بريداً إلكترونياً صحيحاً');
          return;
        }
        onEmail(email);
      }}
    >
      <h1 className={styles.title}>اعرض طلبك</h1>
      <p>أدخل البريد الإلكتروني الذي استخدمته في الطلب.</p>
      <TextField
        className={styles.emailField}
        label="البريد الإلكتروني"
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
        عرض الطلب
      </Button>
    </form>
  );
}

export default function CheckoutSuccessPage() {
  const [params] = useSearchParams();
  const orderNumber = params.get('order')?.trim() ?? '';
  const attempt = useAttemptForOrder(orderNumber);
  // Kept in state: the stored attempt is cleared once the order is confirmed.
  const [email, setEmail] = useState<string | null>(() => attempt?.email ?? null);

  return (
    <div className={cx('wrap', styles.page)}>
      <DocumentTitle title="تأكيد الطلب" />
      <CheckoutSteps current="done" />
      {orderNumber === '' ? (
        <div className={styles.state}>
          <h1 className={styles.title}>لا يوجد طلب لعرضه</h1>
          <ButtonLink to={paths.trackOrder} variant="ink">
            تتبّع طلباً
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
