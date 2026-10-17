import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { AccountHeader } from '@/features/account/components/AccountHeader';
import shared from '@/features/account/components/account.module.css';
import { useCustomerId } from '@/features/account/queries';
import {
  type MyReview,
  myReviewsApi,
  REVIEW_LIMITS,
  type ReviewStatus,
} from '@/features/reviews/api';
import type { Tone } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { formatCount, formatDate } from '@/shared/lib/format';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';
import { FormAlert, TextAreaField, TextField } from '@/shared/ui/form/Field';
import { Icon } from '@/shared/ui/Icon/Icon';
import { Stars } from '@/shared/ui/Stars/Stars';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';
import { toast } from '@/shared/ui/toast/toastStore';

import collections from './AccountCollections.module.css';
import styles from './AccountReviewsPage.module.css';

const STATUS: Readonly<Record<ReviewStatus, { label: string; tone: Tone }>> = {
  Pending: { label: 'قيد المراجعة', tone: 'gold' },
  Approved: { label: 'منشورة', tone: 'green' },
  Rejected: { label: 'لم تُنشر', tone: 'red' },
};

const reviewKeys = {
  list: (customerId: number) => ['me', 'reviews', customerId] as const,
};

function ReviewEditor({ review, onDone }: { review: MyReview; onDone: () => void }) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(review.rating);
  const [title, setTitle] = useState(review.title ?? '');
  const [body, setBody] = useState(review.body);
  const length = body.trim().length;
  const tooShort = length < REVIEW_LIMITS.bodyMin;

  const save = useMutation({
    mutationFn: () =>
      myReviewsApi.update(review.id, {
        rating,
        title: title.trim() === '' ? null : title.trim(),
        body: body.trim(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me', 'reviews'] });
      toast.success('حُفظ التعديل، وستظهر مراجعتك بعد مراجعتها.');
      onDone();
    },
  });

  return (
    <form
      className={styles.editor}
      onSubmit={(event) => {
        event.preventDefault();
        if (!tooShort) save.mutate();
      }}
    >
      <fieldset className={styles.rating}>
        <legend className={styles.legend}>تقييمك</legend>
        {[1, 2, 3, 4, 5].map((value) => (
          <label key={value} className={cx(styles.star, value <= rating && styles.starOn)}>
            <input
              type="radio"
              name={`rating-${String(review.id)}`}
              value={value}
              checked={rating === value}
              onChange={() => {
                setRating(value);
              }}
            />
            <span aria-hidden="true">★</span>
            <span className="sr-only">{formatCount(value)} من ٥</span>
          </label>
        ))}
      </fieldset>
      <TextField
        label="العنوان (اختياري)"
        maxLength={REVIEW_LIMITS.titleMax}
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
        }}
      />
      <TextAreaField
        label="مراجعتك"
        rows={5}
        maxLength={REVIEW_LIMITS.bodyMax}
        value={body}
        hint={`${formatCount(length)} / ${formatCount(REVIEW_LIMITS.bodyMax)} · ${formatCount(REVIEW_LIMITS.bodyMin)} أحرف على الأقل`}
        error={tooShort && body !== '' ? 'المراجعة قصيرة جداً' : undefined}
        onChange={(event) => {
          setBody(event.target.value);
        }}
      />
      {save.isError && <FormAlert>{errorMessage(save.error)}</FormAlert>}
      <div className={collections.actions}>
        <Button type="submit" variant="ink" size="sm" disabled={tooShort || save.isPending}>
          {save.isPending ? 'جارٍ الحفظ…' : 'حفظ التعديل'}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>
          إلغاء
        </Button>
      </div>
    </form>
  );
}

function ReviewCard({ review }: { review: MyReview }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const status = STATUS[review.status];

  const remove = useMutation({
    mutationFn: () => myReviewsApi.remove(review.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me', 'reviews'] });
      toast.success('حُذفت المراجعة.');
    },
  });

  return (
    <li className={styles.card}>
      <div className={styles.head}>
        <Link to={paths.book(review.bookSlug)} className={collections.title}>
          {review.bookTitle}
        </Link>
        <StatusBadge label={status.label} tone={status.tone} />
      </div>

      {editing ? (
        <ReviewEditor
          review={review}
          onDone={() => {
            setEditing(false);
          }}
        />
      ) : (
        <>
          <Stars value={review.rating} />
          {review.title && <p className={styles.reviewTitle}>{review.title}</p>}
          <p className={styles.body}>{review.body}</p>
          <p className={collections.sub}>
            {formatDate(review.updatedAtUtc ?? review.createdAtUtc)}
            {review.updatedAtUtc && ' · معدّلة'}
          </p>
          {review.status === 'Rejected' && (
            <p className={collections.sub}>
              لم تُنشر لأنها لا تتوافق مع إرشادات المراجعات. يمكنك تعديلها وإرسالها من جديد.
            </p>
          )}
          {remove.isError && <FormAlert>{errorMessage(remove.error)}</FormAlert>}
          {confirming ? (
            <div className={styles.confirm}>
              <p>حذف هذه المراجعة نهائياً؟</p>
              <div className={collections.actions}>
                <Button
                  variant="red"
                  size="sm"
                  disabled={remove.isPending}
                  onClick={() => {
                    remove.mutate();
                  }}
                >
                  {remove.isPending ? 'جارٍ الحذف…' : 'نعم، احذف'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setConfirming(false);
                  }}
                >
                  تراجع
                </Button>
              </div>
            </div>
          ) : (
            <div className={collections.actions}>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setEditing(true);
                }}
              >
                تعديل
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setConfirming(true);
                }}
              >
                حذف
              </Button>
            </div>
          )}
        </>
      )}
    </li>
  );
}

/** «مراجعاتي» (API §8): every review waits for moderation; edits do too. */
export default function AccountReviewsPage() {
  const customerId = useCustomerId();
  const reviews = useQuery({
    queryKey: reviewKeys.list(customerId ?? 0),
    queryFn: () => myReviewsApi.list(),
    enabled: customerId !== null,
  });

  return (
    <>
      <AccountHeader
        title="مراجعاتي"
        description="تظهر المراجعة للجميع بعد أن نراجعها، وكذلك كل تعديل عليها."
      />
      {reviews.isError ? (
        <div className={shared.empty} role="alert">
          <p>{errorMessage(reviews.error)}</p>
        </div>
      ) : !reviews.data ? (
        <div className={shared.skeleton} aria-busy="true" aria-label="جارٍ تحميل مراجعاتك" />
      ) : reviews.data.length === 0 ? (
        <div className={shared.empty}>
          <Icon name="check" size={28} />
          <p>لم تكتب مراجعات بعد. بعد استلام طلبك يمكنك تقييم الكتب من صفحاتها.</p>
          <ButtonLink to={paths.account.library} variant="ink" size="sm">
            إلى مكتبتي
          </ButtonLink>
        </div>
      ) : (
        <ul className={styles.list}>
          {reviews.data.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </ul>
      )}
    </>
  );
}
