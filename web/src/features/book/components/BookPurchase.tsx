import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate } from 'react-router';

import { paths } from '@/app/paths';
import { type EmailOnlyValues, emailOnlySchema, trimValue } from '@/features/auth/schemas';
import { useSession } from '@/features/auth/session';
import { bookApi } from '@/features/book/api';
import { bookKeys } from '@/features/book/queries';
import { useCartStore, MAX_QUANTITY } from '@/features/cart/cartStore';
import { addToCartWithFeedback } from '@/features/catalog/addToCart';
import type { BookSummary, PublicBook } from '@/features/catalog/types';
import { useLibrary, useToggleOwned } from '@/features/library/queries';
import { useShippingSummary } from '@/features/store/queries';
import { WishlistButton } from '@/features/wishlist/WishlistButton';
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

const ASK_PRESETS = ['هل يناسب المبتدئين؟', 'ما الفرق بين الطبعات؟', 'بماذا أبدأ قبله؟'];

function editionText(edition: BookSummary): string {
  return edition.editionLabel ?? (edition.volumes ? volumesLabel(edition.volumes) : edition.title);
}

function EditionPicker({ book }: { book: PublicBook }) {
  const options: BookSummary[] = [book, ...(book.editions ?? [])];
  return (
    <section className={styles.editions} aria-labelledby="editions-title">
      <h2 id="editions-title" className={styles.blockTitle}>
        اختر الطبعة
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
                  {!edition.inStock && ' · غير متوفر'}
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
        أرسلنا رابط تأكيد إلى <b dir="ltr">{sentTo}</b>. افتحه لتفعيل التنبيه، وسنراسلك حين يعود
        الكتاب.
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
              toast.success('الكتاب متوفر الآن، يمكنك إضافته إلى السلة.');
              void queryClient.invalidateQueries({ queryKey: bookKeys.detail(book.slug) });
            } else {
              setServerError(errorMessage(error));
            }
          }
        })(event);
      }}
    >
      <p className={styles.notifyTitle}>
        <Icon name="bell" size={18} /> هذا الكتاب غير متوفر حالياً. نبّهني عند توفّره:
      </p>
      {serverError && <FormAlert>{serverError}</FormAlert>}
      <div className={styles.notifyRow}>
        <TextField
          label="البريد الإلكتروني"
          type="email"
          dir="ltr"
          autoComplete="email"
          className={styles.notifyField}
          error={errors.email?.message}
          {...register('email', { setValueAs: trimValue })}
        />
        <Button type="submit" variant="ink" disabled={isSubmitting}>
          نبّهني
        </Button>
      </div>
    </form>
  );
}

/** «أملك هذا الكتاب» (§7b): also keeps recommendations from suggesting it. */
function OwnedToggle({ bookId }: { bookId: number }) {
  const { status } = useSession();
  const library = useLibrary();
  const toggle = useToggleOwned();
  if (status !== 'authenticated' || !library.data) return null;

  const item = library.data.items.find((entry) => entry.book.id === bookId);
  if (item && item.ownership !== 'AddedManually') {
    return (
      <p className={styles.owned}>
        <Icon name="check" size={18} />
        {item.ownership === 'OnTheWay' ? 'في طريقه إليك ضمن طلب سابق' : 'في مكتبتك من مشترياتك'}
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
      {owned ? 'أملك هذا الكتاب' : 'أملك هذا الكتاب من مكان آخر'}
    </button>
  );
}

export function BookPurchase({ book }: { book: PublicBook }) {
  const [quantity, setQuantity] = useState(1);
  const navigate = useNavigate();
  const shipping = useShippingSummary();
  const savings = book.savingsAmount ?? 0;

  return (
    <div className={styles.purchase}>
      <div className={styles.priceRow}>
        <p className={styles.price}>
          {formatAmount(book.price)}
          <small>₺</small>
        </p>
        {book.oldPrice !== null && (
          <s className={styles.old}>
            <span className="sr-only">بدلاً من </span>
            {formatMoney(book.oldPrice, book.currency)}
          </s>
        )}
        {savings > 0 && <span className={styles.save}>وفّر {formatMoney(savings)}</span>}
      </div>
      {book.installmentsAllowed && (
        <p className={styles.installments}>متاح الدفع بالتقسيط عند إتمام الطلب</p>
      )}

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
            أضف إلى السلة
          </Button>
          <Button
            variant="ink"
            className={styles.grow}
            onClick={() => {
              useCartStore.getState().add(book.id, quantity);
              void navigate(paths.cart);
            }}
          >
            اشترِ الآن
          </Button>
          <WishlistButton book={book} className={styles.wish} />
        </div>
      ) : (
        <NotifyMeForm book={book} />
      )}

      <OwnedToggle bookId={book.id} />

      <div className={styles.ask}>
        <p className={styles.askTitle}>
          <Spark size={15} /> اسأل أفندي عن هذا الكتاب…
        </p>
        <ul className={styles.askList}>
          {ASK_PRESETS.map((question) => (
            <li key={question}>
              <Link
                to={`${paths.askEfendi}?${new URLSearchParams({ book: book.slug, q: question }).toString()}`}
                className={styles.askChip}
              >
                {question}
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <ul className={styles.trust}>
        <li>
          <Icon name="truck" />
          <span>
            {shipping.freeShippingThreshold !== undefined
              ? `شحن مجاني فوق ${formatMoney(shipping.freeShippingThreshold)} داخل تركيا`
              : 'نشحن داخل تركيا وإلى دول العالم'}
          </span>
        </li>
        <li>
          <Icon name="shield" />
          <span>طبعة أصلية من {book.publisher ?? 'الناشر'}</span>
        </li>
        <li>
          <Icon name="box" />
          <span>إرجاع خلال ١٤ يوماً من الاستلام</span>
        </li>
      </ul>
    </div>
  );
}

/** Mobile: price + add to cart stays on screen (spec 5.11, §8.3). */
export function MobileBuyBar({ book }: { book: PublicBook }) {
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
          أضف إلى السلة
        </Button>
      ) : (
        <a href="#notify" className={styles.barNotify}>
          نبّهني عند توفّره
        </a>
      )}
    </div>
  );
}
