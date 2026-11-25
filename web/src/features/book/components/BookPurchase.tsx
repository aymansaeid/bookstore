import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router';

import { UI_LANGUAGE } from '@/app/locale';
import { paths } from '@/app/paths';
import { type EmailOnlyValues, emailOnlySchema, trimValue } from '@/features/auth/schemas';
import { useSession } from '@/features/auth/session';
import { bookApi } from '@/features/book/api';
import { bookKeys } from '@/features/book/queries';
import { MAX_QUANTITY, useCartStore } from '@/features/cart/cartStore';
import { addToCartWithFeedback } from '@/features/catalog/addToCart';
import type { BookSummary, PublicBook } from '@/features/catalog/types';
import { useLibrary, useToggleOwned } from '@/features/library/queries';
import { useShippingSummary } from '@/features/store/queries';
import { WishlistButton } from '@/features/wishlist/WishlistButton';
import { i18n } from '@/i18n';
import { isApiError } from '@/shared/api/ApiError';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { formatAmount, formatMoney, volumesLabel } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { FormAlert, TextField } from '@/shared/ui/form/Field';
import { Icon } from '@/shared/ui/Icon/Icon';
import { QuantityStepper } from '@/shared/ui/QuantityStepper/QuantityStepper';
import { Spark } from '@/shared/ui/Spark/Spark';
import { toast } from '@/shared/ui/toast/toastStore';

import styles from './BookPurchase.module.css';

const ASK_PRESETS = ['ask1', 'ask2', 'ask3'] as const;

function editionText(edition: BookSummary): string {
  return edition.editionLabel ?? (edition.volumes ? volumesLabel(edition.volumes) : edition.title);
}

function EditionPicker({ book }: { book: PublicBook }) {
  const { t } = useTranslation('book', { keyPrefix: 'purchase' });
  const options: BookSummary[] = [book, ...(book.editions ?? [])];
  return (
    <section className={styles.editions} aria-labelledby="editions-title">
      <h2 id="editions-title" className={styles.blockTitle}>
        {t('chooseEdition')}
      </h2>
      <ul className={styles.editionList}>
        {options.map((edition) => {
          const current = edition.id === book.id;
          const content = (
            <>
              <span className={styles.editionThumb}>
                {edition.coverImageUrl && (
                  <img src={edition.coverImageUrl} alt="" width={40} height={59} loading="lazy" />
                )}
              </span>
              <span className={styles.editionText}>
                <b>{editionText(edition)}</b>
                <span>
                  {formatMoney(edition.price, edition.currency)}
                  {!edition.inStock && t('unavailable')}
                </span>
              </span>
              {current && <Icon name="check" className={styles.editionCheck} />}
            </>
          );
          return (
            <li key={edition.id}>
              {current ? (
                <div className={cx(styles.edition, styles.editionCurrent)} aria-current="true">
                  {content}
                </div>
              ) : (
                <Link to={paths.book(edition.slug)} className={styles.edition}>
                  {content}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Back-in-stock alert (§8): double opt-in, nothing is held for the customer. */
function NotifyMeForm({ book }: { book: PublicBook }) {
  const { t } = useTranslation('book', { keyPrefix: 'notify' });
  const { customer } = useSession();
  const queryClient = useQueryClient();
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<EmailOnlyValues>({
    resolver: zodResolver(emailOnlySchema),
    defaultValues: { email: customer?.email ?? '' },
  });

  if (sentTo) {
    return (
      <FormAlert tone="success">
        <Trans t={t} i18nKey="sent" values={{ email: sentTo }} components={{ b: <b dir="ltr" /> }} />
      </FormAlert>
    );
  }

  return (
    <form
      id="notify"
      className={styles.notify}
      noValidate
      onSubmit={(event) => {
        void handleSubmit(async ({ email }) => {
          setServerError(null);
          try {
            await bookApi.subscribeStock(book.id, email);
            setSentTo(email);
          } catch (error) {
            if (isApiError(error) && error.code === 'StockNotification.AlreadyInStock') {
              toast.success(i18n.t('notify.inStockNow', { ns: 'book' }));
              void queryClient.invalidateQueries({ queryKey: bookKeys.detail(book.slug) });
            } else {
              setServerError(errorMessage(error));
            }
          }
        })(event);
      }}
    >
      <p className={styles.notifyTitle}>
        <Icon name="bell" size={18} /> {t('title')}
      </p>
      {serverError && <FormAlert>{serverError}</FormAlert>}
      <div className={styles.notifyRow}>
        <TextField
          label={t('email')}
          type="email"
          dir="ltr"
          autoComplete="email"
          className={styles.notifyField}
          error={errors.email?.message}
          {...register('email', { setValueAs: trimValue })}
        />
        <Button type="submit" variant="ink" disabled={isSubmitting}>
          {t('submit')}
        </Button>
      </div>
    </form>
  );
}

/** «أملك هذا الكتاب» (§7b): also keeps recommendations from suggesting it. */
function OwnedToggle({ bookId }: { bookId: number }) {
  const { t } = useTranslation('book', { keyPrefix: 'owned' });
  const { status } = useSession();
  const library = useLibrary();
  const toggle = useToggleOwned();
  if (status !== 'authenticated' || !library.data) return null;

  const item = library.data.items.find((entry) => entry.book.id === bookId);
  if (item && item.ownership !== 'AddedManually') {
    return (
      <p className={styles.owned}>
        <Icon name="check" size={18} />
        {item.ownership === 'OnTheWay' ? t('onTheWay') : t('purchased')}
      </p>
    );
  }

  const owned = item !== undefined;
  return (
    <button
      type="button"
      className={cx(styles.ownButton, owned && styles.ownButtonOn)}
      aria-pressed={owned}
      disabled={toggle.isPending}
      onClick={() => {
        toggle.mutate({ bookId, owned });
      }}
    >
      <Icon name={owned ? 'check' : 'book'} size={18} />
      {owned ? t('own') : t('ownElsewhere')}
    </button>
  );
}

export function BookPurchase({ book }: { book: PublicBook }) {
  const { t } = useTranslation('book', { keyPrefix: 'purchase' });
  const [quantity, setQuantity] = useState(1);
  const navigate = useNavigate();
  const shipping = useShippingSummary();
  const savings = book.savingsAmount ?? 0;

  return (
    <div className={styles.purchase}>
      <div className={styles.priceRow}>
        <p className={styles.price}>
          {/* English writes the sign first (₺2,400); Arabic and Turkish after. */}
          {UI_LANGUAGE === 'en' && <small>₺</small>}
          {formatAmount(book.price)}
          {UI_LANGUAGE !== 'en' && <small>₺</small>}
        </p>
        {book.oldPrice !== null && (
          <s className={styles.old}>
            <span className="sr-only">{t('insteadOf')}</span>
            {formatMoney(book.oldPrice, book.currency)}
          </s>
        )}
        {savings > 0 && (
          <span className={styles.save}>{t('save', { amount: formatMoney(savings) })}</span>
        )}
      </div>
      {book.installmentsAllowed && <p className={styles.installments}>{t('installments')}</p>}

      {book.editions && book.editions.length > 0 && <EditionPicker book={book} />}

      {book.inStock ? (
        <div className={styles.actions}>
          <QuantityStepper value={quantity} onChange={setQuantity} max={MAX_QUANTITY} />
          <Button
            variant="red"
            className={styles.grow}
            onClick={() => {
              addToCartWithFeedback(book, quantity);
            }}
          >
            <Icon name="cart" />
            {t('addToCart')}
          </Button>
          <Button
            variant="ink"
            className={styles.grow}
            onClick={() => {
              useCartStore.getState().add(book.id, quantity);
              void navigate(paths.cart);
            }}
          >
            {t('buyNow')}
          </Button>
          <WishlistButton book={book} className={styles.wish} />
        </div>
      ) : (
        <NotifyMeForm book={book} />
      )}

      <OwnedToggle bookId={book.id} />

      <div className={styles.ask}>
        <p className={styles.askTitle}>
          <Spark size={15} /> {t('askTitle')}
        </p>
        <ul className={styles.askList}>
          {ASK_PRESETS.map((key) => {
            const question = t(key);
            return (
              <li key={key}>
                <Link
                  to={`${paths.askEfendi}?${new URLSearchParams({ book: book.slug, q: question }).toString()}`}
                  className={styles.askChip}
                >
                  {question}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <ul className={styles.trust}>
        <li>
          <Icon name="truck" />
          <span>
            {shipping.freeShippingThreshold !== undefined
              ? t('freeShipping', { amount: formatMoney(shipping.freeShippingThreshold) })
              : t('shipping')}
          </span>
        </li>
        <li>
          <Icon name="shield" />
          <span>{t('original', { publisher: book.publisher ?? t('thePublisher') })}</span>
        </li>
        <li>
          <Icon name="box" />
          <span>{t('returns')}</span>
        </li>
      </ul>
    </div>
  );
}

/** Mobile: price + add to cart stays on screen (spec 5.11, §8.3). */
export function MobileBuyBar({ book }: { book: PublicBook }) {
  const { t } = useTranslation('book', { keyPrefix: 'purchase' });
  return (
    <div className={styles.buyBar}>
      <div>
        <p className={styles.barPrice}>{formatMoney(book.price, book.currency)}</p>
        {book.oldPrice !== null && (
          <s className={styles.old}>{formatMoney(book.oldPrice, book.currency)}</s>
        )}
      </div>
      {book.inStock ? (
        <Button
          variant="red"
          size="sm"
          onClick={() => {
            addToCartWithFeedback(book);
          }}
        >
          <Icon name="cart" size={18} />
          {t('addToCart')}
        </Button>
      ) : (
        <a href="#notify" className={styles.barNotify}>
          {t('notifyBar')}
        </a>
      )}
    </div>
  );
}