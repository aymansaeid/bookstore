import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useLocation } from 'react-router';
import { z } from 'zod';

import { paths } from '@/app/paths';
import { useSession } from '@/features/auth/session';
import { useBookReviews, useReviewEligibility, useSubmitReview } from '@/features/book/queries';
import type { ReviewSort } from '@/features/book/types';
import { i18n } from '@/i18n';
import { errorMessage } from '@/shared/api/errorMessages';
import { serverFieldErrors } from '@/shared/api/formErrors';
import { cx } from '@/shared/lib/cx';
import { formatAmount, formatCount, formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { buttonClass } from '@/shared/ui/Button/buttonClass';
import { FormAlert, TextAreaField, TextField } from '@/shared/ui/form/Field';
import { Stars } from '@/shared/ui/Stars/Stars';

import styles from './BookReviews.module.css';

/** Messages are looked up when a check fails, so they follow the page's language. */
const message = (key: 'ratingRequired' | 'titleTooLong' | 'bodyTooLong') => () =>
  i18n.t(`reviews.${key}`, { ns: 'book' });

const reviewSchema = z.object({
  rating: z
    .number()
    .int()
    .min(1, { error: message('ratingRequired') })
    .max(5),
  title: z
    .string()
    .trim()
    .max(120, { error: message('titleTooLong') }),
  body: z
    .string()
    .trim()
    .min(10, { error: () => i18n.t('reviews.bodyTooShort', { ns: 'book', n: formatCount(10) }) })
    .max(2000, { error: message('bodyTooLong') }),
});
type ReviewValues = z.infer<typeof reviewSchema>;

const SORTS: readonly ReviewSort[] = ['Newest', 'HighestRated', 'LowestRated'];

function StarInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  const { t } = useTranslation('book', { keyPrefix: 'reviews' });

  return (
    <div className={styles.starInput} role="radiogroup" aria-label={t('rating')}>
      {[1, 2, 3, 4, 5].map((star) => (
        <label key={star} className={cx(styles.star, star <= value && styles.starOn)}>
          <input
            type="radio"
            name="rating"
            value={star}
            checked={value === star}
            onChange={() => {
              onChange(star);
            }}
          />
          <span aria-hidden="true">★</span>
          <span className="sr-only">{t('stars', { n: formatCount(star) })}</span>
        </label>
      ))}
    </div>
  );
}

function ReviewForm({ bookId, onDone }: { bookId: number; onDone: () => void }) {
  const { t } = useTranslation('book', { keyPrefix: 'reviews' });
  const submit = useSubmitReview(bookId);
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    control,
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ReviewValues>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, title: '', body: '' },
  });

  return (
    <form
      className={styles.form}
      noValidate
      onSubmit={(event) => {
        void handleSubmit(async (values) => {
          setServerError(null);
          try {
            await submit.mutateAsync({
              bookId,
              rating: values.rating,
              title: values.title === '' ? null : values.title,
              body: values.body,
            });
            onDone();
          } catch (error) {
            const fields = serverFieldErrors(error);
            if (fields.body) setError('body', { message: fields.body });
            else setServerError(errorMessage(error));
          }
        })(event);
      }}
    >
      {serverError && <FormAlert>{serverError}</FormAlert>}
      <Controller
        control={control}
        name="rating"
        render={({ field }) => <StarInput value={field.value} onChange={field.onChange} />}
      />
      {errors.rating?.message && <p className={styles.fieldError}>{errors.rating.message}</p>}
      <TextField
        label={t('reviewTitle')}
        error={errors.title?.message}
        {...register('title')}
      />
      <TextAreaField label={t('body')} error={errors.body?.message} {...register('body')} />
      <Button type="submit" variant="ink" disabled={isSubmitting}>
        {isSubmitting ? t('sending') : t('send')}
      </Button>
    </form>
  );
}

/** «اكتب مراجعتك» driven by GET /eligibility (§8). */
function WriteReview({ bookId }: { bookId: number }) {
  const { t } = useTranslation('book', { keyPrefix: 'reviews' });
  const { status } = useSession();
  const location = useLocation();
  const eligibility = useReviewEligibility(bookId);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  if (sent) {
    return <FormAlert tone="success">{t('thanks')}</FormAlert>;
  }
  if (status !== 'authenticated') {
    return (
      <Link
        to={paths.loginWithReturn(`${location.pathname}#reviews`)}
        className={buttonClass('gold', 'sm')}
      >
        {t('signIn')}
      </Link>
    );
  }
  if (!eligibility.data) return null;
  if (eligibility.data.reason === 'AlreadyReviewed') {
    return <p className={styles.note}>{t('already')}</p>;
  }
  if (!eligibility.data.canReview) {
    return <p className={styles.note}>{t('buyersOnly')}</p>;
  }
  if (!open) {
    return (
      <Button
        variant="gold"
        size="sm"
        onClick={() => {
          setOpen(true);
        }}
      >
        {t('write')}
      </Button>
    );
  }
  return (
    <ReviewForm
      bookId={bookId}
      onDone={() => {
        setSent(true);
      }}
    />
  );
}

export function BookReviews({ bookId }: { bookId: number }) {
  const { t } = useTranslation('book', { keyPrefix: 'reviews' });
  const { t: tc } = useTranslation();
  const [sort, setSort] = useState<ReviewSort>('Newest');
  const query = useBookReviews(bookId, sort);
  const summary = query.data?.pages[0]?.summary;
  const reviews = query.data?.pages.flatMap((page) => page.reviews.items) ?? [];

  return (
    <section id="reviews" className={styles.section} aria-labelledby="reviews-title">
      <h2 id="reviews-title" className={styles.heading}>
        {t('title')}
      </h2>

      <div className={styles.layout}>
        <div className={styles.summary}>
          {summary && summary.averageRating !== null ? (
            <>
              <p className={styles.average}>{formatAmount(summary.averageRating)}</p>
              <Stars value={summary.averageRating} size={20} />
              <p className={styles.count}>
                {t('fromVerified', {
                  count: summary.reviewCount,
                  n: formatCount(summary.reviewCount),
                })}
              </p>
              <ul className={styles.bars}>
                {(['5', '4', '3', '2', '1'] as const).map((level) => {
                  const count = summary.distribution[level];
                  const percent = summary.reviewCount ? (count / summary.reviewCount) * 100 : 0;
                  return (
                    <li key={level}>
                      <span>{formatCount(Number(level))}★</span>
                      <span className={styles.bar}>
                        <span style={{ inlineSize: `${percent}%` }} />
                      </span>
                      <span>{formatCount(count)}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className={styles.count}>{t('none')}</p>
          )}
          <div className={styles.write}>
            <WriteReview bookId={bookId} />
          </div>
        </div>

        <div className={styles.list}>
          {reviews.length > 0 && (
            <label className={styles.sort}>
              {t('sortBy')}
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as ReviewSort);
                }}
              >
                {SORTS.map((option) => (
                  <option key={option} value={option}>
                    {t(option)}
                  </option>
                ))}
              </select>
            </label>
          )}

          <ul className={styles.reviews}>
            {reviews.map((review) => (
              <li key={review.id} className={styles.review}>
                <div className={styles.reviewHead}>
                  <Stars value={review.rating} size={14} />
                  <span className={styles.verified}>{t('verified')}</span>
                </div>
                {review.title && <h3 className={styles.reviewTitle}>{review.title}</h3>}
                <p className={styles.reviewBody}>{review.body}</p>
                <p className={styles.reviewMeta}>
                  {review.authorDisplayName} · {formatDate(review.createdAtUtc)}
                </p>
              </li>
            ))}
          </ul>

          {query.hasNextPage && (
            <Button
              variant="ghost"
              size="sm"
              disabled={query.isFetchingNextPage}
              onClick={() => {
                void query.fetchNextPage();
              }}
            >
              {query.isFetchingNextPage ? tc('loading') : t('more')}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}