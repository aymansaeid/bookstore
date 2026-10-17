import { useNavigate } from 'react-router';

import { paths } from '@/app/paths';
import { booksPhrase, formatMoney } from '@/shared/lib/format';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';

import type { ReadingPathDetail } from '../api';
import { addPathToCart } from '../buyPath';

import styles from './PathPanels.module.css';

/**
 * The dark total card (spec 5.5). Signed in, it prices only what you don't
 * own (remainingPricing); the cart quote then matches it exactly (API §7d).
 */
export function PathTotal({ path }: { path: ReadingPathDetail }) {
  const navigate = useNavigate();
  const signedIn = path.myProgress !== null;
  const pricing = path.myProgress?.remainingPricing ?? path.summary.pricing;
  const needed = path.stages.filter((stage) => !stage.owned);
  const unavailable = needed.filter((stage) => !stage.book.inStock);

  if (needed.length === 0) {
    return (
      <section className={styles.total} aria-label="إجمالي المسار">
        <p className={styles.totalLabel}>تملك كل كتب هذا المسار</p>
        <p className={styles.totalNote}>لا شيء لتشتريه؛ تابع القراءة وحدّث تقدّمك من مكتبتك.</p>
        <ButtonLink to={paths.account.library} variant="gold">
          إلى مكتبتي
        </ButtonLink>
      </section>
    );
  }

  const missing = unavailable.map((stage) => `«${stage.book.title}»`).join('، ');

  return (
    <section className={styles.total} aria-label="إجمالي المسار">
      <div className={styles.totalInfo}>
        <p className={styles.totalLabel}>
          {signedIn ? 'إجمالي ما تبقّى' : 'إجمالي المسار'} ({booksPhrase(needed.length)})
        </p>
        <p className={styles.totalPrice}>
          {formatMoney(pricing.discountedPrice, pricing.currency)}
          {pricing.savings > 0 && (
            <s className={styles.totalOld}>{formatMoney(pricing.totalPrice, pricing.currency)}</s>
          )}
        </p>
        {pricing.savings > 0 && (
          <p className={styles.saved}>
            وفّر {formatMoney(pricing.savings, pricing.currency)} بخصم المسار
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
          اشترِ المسار كاملاً
        </Button>
        <p className={styles.totalNote}>
          {unavailable.length > 0
            ? `${missing} ${unavailable.length === 1 ? 'غير متوفر' : 'غير متوفرة'} حالياً، فلا يمكن شراء المسار كاملاً الآن. يمكنك شراء بقية الكتب منفردة.`
            : signedIn
              ? 'نضيف إلى سلتك نسخة من كل كتاب لا تملكه، مع خصم المسار.'
              : 'نضيف إلى سلتك نسخة من كل كتب المسار، مع خصم المسار. سجّل الدخول ليُستثنى ما تملكه.'}
        </p>
      </div>
    </section>
  );
}
