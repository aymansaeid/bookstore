import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { Link, useLocation } from 'react-router';
import { z } from 'zod';

import { paths } from '@/app/paths';
import { useSession } from '@/features/auth/session';
import { useBookReviews, useReviewEligibility, useSubmitReview } from '@/features/book/queries';
import type { ReviewSort } from '@/features/book/types';
import { errorMessage } from '@/shared/api/errorMessages';
import { serverFieldErrors } from '@/shared/api/formErrors';
import { cx } from '@/shared/lib/cx';
import { formatAmount, formatCount, formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { buttonClass } from '@/shared/ui/Button/buttonClass';
import { FormAlert, TextAreaField, TextField } from '@/shared/ui/form/Field';
import { Stars } from '@/shared/ui/Stars/Stars';

import styles from './BookReviews.module.css';

const reviewSchema = z.object({
  rating: z.number().int().min(1, 'اختر عدد النجوم').max(5),
  title: z.string().trim().max(120, 'العنوان أطول من المسموح'),
  body: z
    .string()
    .trim()
    .min(10, `اكتب ${formatCount(10)} أحرف على الأقل`)
    .max(2000, 'المراجعة أطول من المسموح'),
});
type ReviewValues = z.infer<typeof reviewSchema>;

const SORTS: { value: ReviewSort; label: string }[] = [
  { value: 'Newest', label: 'الأحدث' },
  { value: 'HighestRated', label: 'الأعلى تقييماً' },
  { value: 'LowestRated', label: 'الأقل تقييماً' },
];

function StarInput({ value, onChange }: { value: number; onChange: (value: number) => void }) {
  return (
    <div className={styles.starInput} role="radiogroup" aria-label="التقييم">
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
          <span className="sr-only">{formatCount(star)} من ٥</span>
        </label>
      ))}
    </div>
  );
}

function ReviewForm({ bookId, onDone }: { bookId: number; onDone: () => void }) {
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
        label="عنوان المراجعة (اختياري)"
        error={errors.title?.message}
        {...register('title')}
      />
      <TextAreaField label="مراجعتك" error={errors.body?.message} {...register('body')} />
      <Button type="submit" variant="ink" disabled={isSubmitting}>
        {isSubmitting ? 'جارٍ الإرسال…' : 'أرسل المراجعة'}
      </Button>
    </form>
  );
}

/** «اكتب مراجعتك» driven by GET /eligibility (§8). */
function WriteReview({ bookId }: { bookId: number }) {
  const { status } = useSession();
  const location = useLocation();
  const eligibility = useReviewEligibility(bookId);
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState(false);

  if (sent) {
    return <FormAlert tone="success">شكراً لك! ستظهر مراجعتك بعد مراجعتها.</FormAlert>;
  }
  if (status !== 'authenticated') {
    return (
      <Link
        to={paths.loginWithReturn(`${location.pathname}#reviews`)}
        className={buttonClass('gold', 'sm')}
      >
        سجّل الدخول لكتابة مراجعة
      </Link>
    );
  }
  if (!eligibility.data) return null;
  if (eligibility.data.reason === 'AlreadyReviewed') {
    return <p className={styles.note}>كتبتَ مراجعة لهذا الكتاب. شكراً لك.</p>;
  }
  if (!eligibility.data.canReview) {
    return <p className={styles.note}>يمكن لمن اشترى الكتاب واستلمه كتابة مراجعة.</p>;
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
        اكتب مراجعتك
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
  const [sort, setSort] = useState<ReviewSort>('Newest');
  const query = useBookReviews(bookId, sort);
  const summary = query.data?.pages[0]?.summary;
  const reviews = query.data?.pages.flatMap((page) => page.reviews.items) ?? [];

  return (
    <section id="reviews" className={styles.section} aria-labelledby="reviews-title">
      <h2 id="reviews-title" className={styles.heading}>
        المراجعات
      </h2>

      <div className={styles.layout}>
        <div className={styles.summary}>
          {summary && summary.averageRating !== null ? (
            <>
              <p className={styles.average}>{formatAmount(summary.averageRating)}</p>
              <Stars value={summary.averageRating} size={20} />
              <p className={styles.count}>
                من {formatCount(summary.reviewCount)} مراجعة لمشترين موثّقين
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
            <p className={styles.count}>لا توجد مراجعات بعد. كن أول من يكتب عن هذا الكتاب.</p>
          )}
          <div className={styles.write}>
            <WriteReview bookId={bookId} />
          </div>
        </div>

        <div className={styles.list}>
          {reviews.length > 0 && (
            <label className={styles.sort}>
              ترتيب حسب
              <select
                value={sort}
                onChange={(event) => {
                  setSort(event.target.value as ReviewSort);
                }}
              >
                {SORTS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
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
                  <span className={styles.verified}>✓ مشترٍ موثّق</span>
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
              {query.isFetchingNextPage ? 'جارٍ التحميل…' : 'عرض المزيد'}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
