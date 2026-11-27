import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { paths } from '@/app/paths';
import { booksPhrase, formatMoney, LIST_SEPARATOR } from '@/shared/lib/format';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';

import type { ReadingPathDetail } from '../api';
import { addPathToCart } from '../buyPath';

import styles from './PathPanels.module.css';

/**
 * The dark total card (spec 5.5). Signed in, it prices only what you don't
 * own (remainingPricing); the cart quote then matches it exactly (API §7d).
 */
export function PathTotal({ path }: { path: ReadingPathDetail }) {
  const { t } = useTranslation('paths', { keyPrefix: 'total' });
  const navigate = useNavigate();
  const signedIn = path.myProgress !== null;
  const pricing = path.myProgress?.remainingPricing ?? path.summary.pricing;
  const needed = path.stages.filter((stage) => !stage.owned);
  const unavailable = needed.filter((stage) => !stage.book.inStock);

  if (needed.length === 0) {
    return (
      <section className={styles.total} aria-label={t('label')}>
        <p className={styles.totalLabel}>{t('ownAll')}</p>
        <p className={styles.totalNote}>{t('ownAllNote')}</p>
        <ButtonLink to={paths.account.library} variant="gold">
          {t('toLibrary')}
        </ButtonLink>
      </section>
    );
  }

  const missing = unavailable
    .map((stage) => t('quoted', { title: stage.book.title }))
    .join(LIST_SEPARATOR);
  const books = booksPhrase(needed.length);

  return (
    <section className={styles.total} aria-label={t('label')}>
      <div className={styles.totalInfo}>
        <p className={styles.totalLabel}>
          {signedIn ? t('remaining', { books }) : t('whole', { books })}
        </p>
        <p className={styles.totalPrice}>
          {formatMoney(pricing.discountedPrice, pricing.currency)}
          {pricing.savings > 0 && (
            <s className={styles.totalOld}>{formatMoney(pricing.totalPrice, pricing.currency)}</s>
          )}
        </p>
        {pricing.savings > 0 && (
          <p className={styles.saved}>
            {t('saved', { amount: formatMoney(pricing.savings, pricing.currency) })}
          </p>
        )}
      </div>

      <div className={styles.totalActions}>
        <Button
          variant="red"
          disabled={unavailable.length > 0}
          onClick={() => {
            addPathToCart(
              path.summary.id,
              needed.map((stage) => stage.book.id),
              pricing.discountPercentage > 0,
            );
            void navigate(paths.cart);
          }}
        >
          {t('buy')}
        </Button>
        <p className={styles.totalNote}>
          {unavailable.length > 0
            ? t('unavailable', { count: unavailable.length, titles: missing })
            : signedIn
              ? t('noteSignedIn')
              : t('noteGuest')}
        </p>
      </div>
    </section>
  );
}