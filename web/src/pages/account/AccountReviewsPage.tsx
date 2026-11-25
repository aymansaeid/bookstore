import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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

/** Labels in account.json → reviews.status. */
const STATUS_TONE: Readonly<Record<ReviewStatus, Tone>> = {
  Pending: 'gold',
  Approved: 'green',
  Rejected: 'red',
};

const reviewKeys = {
  list: (customerId: number) => ['me', 'reviews', customerId] as const,
};

function ReviewEditor({ review, onDone }: { review: MyReview; onDone: () => void }) {
  const { t } = useTranslation('account');
  const { t: tCommon } = useTranslation();
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
      toast.success(t('reviews.savedEdit'));
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
        <legend className={styles.legend}>{t('reviews.rating')}</legend>
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
            <span className="sr-only">{tCommon('ui.stars', { value: formatCount(value) })}</span>
          </label>
        ))}
      </fieldset>
      <TextField
        label={t('reviews.titleField')}
        maxLength={REVIEW_LIMITS.titleMax}
        value={title}
        onChange={(event) => {
          setTitle(event.target.value);
        }}
      />
      <TextAreaField
        label={t('reviews.body')}
        rows={5}
        maxLength={REVIEW_LIMITS.bodyMax}
        value={body}
        hint={t('reviews.hint', {
          length: formatCount(length),
          max: formatCount(REVIEW_LIMITS.bodyMax),
          min: formatCount(REVIEW_LIMITS.bodyMin),
        })}
        error={tooShort && body !== '' ? t('reviews.tooShort') : undefined}
        onChange={(event) => {
          setBody(event.target.value);
        }}
      />
      {save.isError && <FormAlert>{errorMessage(save.error)}</FormAlert>}
      <div className={collections.actions}>
        <Button type="submit" variant="ink" size="sm" disabled={tooShort || save.isPending}>
          {save.isPending ? t('shared.saving') : t('reviews.saveEdit')}
        </Button>
        <Button variant="ghost" size="sm" onClick={onDone}>
          {t('shared.cancel')}
        </Button>
      </div>
    </form>
  );
}

function ReviewCard({ review }: { review: MyReview }) {
  const { t } = useTranslation('account');
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const tone = STATUS_TONE[review.status];

  const remove = useMutation({
    mutationFn: () => myReviewsApi.remove(review.id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['me', 'reviews'] });
      toast.success(t('reviews.deleted'));
    },
  });

  return (
    <li className={styles.card}>
      <div className={styles.head}>
        <Link to={paths.book(review.bookSlug)} className={collections.title}>
          {review.bookTitle}
        </Link>
        <StatusBadge label={t(`reviews.status.${review.status}`)} tone={tone} />
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
            {review.updatedAtUtc && t('reviews.edited')}
          </p>
          {review.status === 'Rejected' && (
            <p className={collections.sub}>{t('reviews.rejectedNote')}</p>
          )}
          {remove.isError && <FormAlert>{errorMessage(remove.error)}</FormAlert>}
          {confirming ? (
            <div className={styles.confirm}>
              <p>{t('reviews.confirmDelete')}</p>
              <div className={collections.actions}>
                <Button
                  variant="red"
                  size="sm"
                  disabled={remove.isPending}
                  onClick={() => {
                    remove.mutate();
                  }}
                >
                  {remove.isPending ? t('shared.deleting') : t('shared.yesDelete')}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setConfirming(false);
                  }}
                >
                  {t('shared.back')}
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
                {t('shared.edit')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setConfirming(true);
                }}
              >
                {t('shared.delete')}
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
  const { t } = useTranslation('account', { keyPrefix: 'reviews' });
  const customerId = useCustomerId();
  const reviews = useQuery({
    queryKey: reviewKeys.list(customerId ?? 0),
    queryFn: () => myReviewsApi.list(),
    enabled: customerId !== null,
  });

  return (
    <>
      <AccountHeader title={t('title')} description={t('lead')} />
      {reviews.isError ? (
        <div className={shared.empty} role="alert">
          <p>{errorMessage(reviews.error)}</p>
        </div>
      ) : !reviews.data ? (
        <div className={shared.skeleton} aria-busy="true" aria-label={t('loading')} />
      ) : reviews.data.length === 0 ? (
        <div className={shared.empty}>
          <Icon name="check" size={28} />
          <p>{t('none')}</p>
          <ButtonLink to={paths.account.library} variant="ink" size="sm">
            {t('toLibrary')}
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