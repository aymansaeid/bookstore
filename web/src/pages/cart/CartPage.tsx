import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { UI_DIRECTION } from '@/app/locale';
import { paths } from '@/app/paths';
import { useCartStore } from '@/features/cart/cartStore';
import { CartLineItem } from '@/features/cart/components/CartLineItem';
import { CartSummary } from '@/features/cart/components/CartSummary';
import { FreeShippingBar } from '@/features/cart/components/FreeShippingBar';
import { CheckoutSteps } from '@/features/checkout/components/CheckoutSteps';
import { useQuote } from '@/features/checkout/useQuote';
import { useQuoteSelfHeal } from '@/features/checkout/useQuoteSelfHeal';
import { codeMessage, errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { booksPhrase, copiesPhrase, formatMoney } from '@/shared/lib/format';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';
import { buttonClass } from '@/shared/ui/Button/buttonClass';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './CartPage.module.css';

/** Problems shown inline elsewhere, or fixed automatically, are not repeated in the banner. */
const HANDLED = new Set([
  'Checkout.InsufficientStock',
  'Checkout.BookNotFound',
  'Checkout.CouponInvalid',
  'Checkout.ShippingZoneNotSupported',
  'Checkout.ShippingMethodUnavailable',
  'Checkout.GiftWrapUnavailable',
  'Checkout.PathIncomplete',
  'Checkout.PathAlreadyOwned',
  'Checkout.PathUnavailable',
]);

export default function CartPage() {
  const { t } = useTranslation('checkout', { keyPrefix: 'cart' });
  const { t: tc } = useTranslation();
  const lines = useCartStore((state) => state.lines);
  const quote = useQuote();
  const data = quote.data;

  useQuoteSelfHeal(quote);

  if (lines.length === 0) {
    return (
      <div className={cx('wrap', styles.empty)}>
        <DocumentTitle title={t('title')} />
        <span className={styles.emptyIcon} aria-hidden="true">
          <Icon name="cart" size={32} />
        </span>
        <h1 className={styles.title}>{t('emptyTitle')}</h1>
        <p>{t('emptyText')}</p>
        <ButtonLink to={paths.search} variant="ink">
          {t('browse')}
        </ButtonLink>
      </div>
    );
  }

  const copies = lines.reduce((sum, line) => sum + line.quantity, 0);
  const quantities = new Map(lines.map((line) => [line.bookId, line.quantity]));
  const banner = data?.problems.filter((problem) => !HANDLED.has(problem.code)) ?? [];
  const path = data?.pathDiscount;
  const pathProblem = data?.problems.find((problem) =>
    ['Checkout.PathIncomplete', 'Checkout.PathAlreadyOwned', 'Checkout.PathUnavailable'].includes(
      problem.code,
    ),
  );

  return (
    <div className={cx('wrap', styles.page)}>
      <DocumentTitle title={t('title')} />

      <header className={styles.header}>
        <h1 className={styles.title}>
          {t('title')}{' '}
          <span className={styles.counts}>
            ({booksPhrase(lines.length)} · {copiesPhrase(copies)})
          </span>
        </h1>
        <CheckoutSteps current="cart" />
      </header>

      {quote.isError && !data && (
        <div className={styles.error} role="alert">
          <p>{errorMessage(quote.error)}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void quote.refetch();
            }}
          >
            {tc('ui.retry')}
          </Button>
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.main}>
          {data && <FreeShippingBar quote={data} />}

          {banner.map((problem) => (
            <p key={problem.code} className={styles.problem} role="alert">
              {codeMessage(problem.code)}
            </p>
          ))}

          {pathProblem && (
            <div className={styles.problem} role="alert">
              <p>{codeMessage(pathProblem.code)}</p>
              {pathProblem.code === 'Checkout.PathIncomplete' &&
              path &&
              path.missingBookIds.length > 0 ? (
                <button
                  type="button"
                  className={buttonClass('ink', 'sm')}
                  onClick={() => {
                    const cart = useCartStore.getState();
                    for (const id of path.missingBookIds) cart.add(id);
                  }}
                >
                  {t('addMissing')}
                </button>
              ) : (
                <button
                  type="button"
                  className={buttonClass('ghost', 'sm')}
                  onClick={() => {
                    useCartStore.getState().setReadingPath(null);
                  }}
                >
                  {t('withoutPath')}
                </button>
              )}
            </div>
          )}

          {path?.applied && (
            <p className={styles.pathApplied}>
              <Icon name="route" size={18} />{' '}
              {t('pathApplied', { title: path.title, amount: formatMoney(path.amount) })}
            </p>
          )}

          {data ? (
            <ul
              className={cx(styles.lines, !quote.isCurrent && styles.stale)}
              aria-busy={!quote.isCurrent}
            >
              {data.lines.map((line) => (
                <CartLineItem
                  key={line.bookId}
                  line={line}
                  quantity={quantities.get(line.bookId) ?? line.quantity}
                  currency={data.currency}
                />
              ))}
            </ul>
          ) : (
            !quote.isError && (
              <ul className={styles.lines} aria-busy="true" aria-label={t('calculating')}>
                {lines.map((line) => (
                  <li key={line.bookId} className={styles.skeleton} />
                ))}
              </ul>
            )
          )}

          <Link to={paths.search} className={styles.continue}>
            {/* Back points against the reading direction. */}
            <Icon name={UI_DIRECTION === 'rtl' ? 'arrowr' : 'arrow'} size={16} /> {t('continue')}
          </Link>
        </div>

        <CartSummary quote={data} stale={!quote.isCurrent} />
      </div>

      {data && (
        <div className={styles.mobileBar}>
          <div>
            <p className={styles.mobileLabel}>{t('total')}</p>
            <p className={styles.mobileTotal}>{formatMoney(data.total, data.currency)}</p>
          </div>
          {data.canCheckout ? (
            <Link to={paths.checkout} className={buttonClass('red', 'sm')}>
              {t('checkout')}
            </Link>
          ) : (
            <span className={buttonClass('red', 'sm', styles.disabled)} aria-disabled="true">
              {t('checkout')}
            </span>
          )}
        </div>
      )}
    </div>
  );
}