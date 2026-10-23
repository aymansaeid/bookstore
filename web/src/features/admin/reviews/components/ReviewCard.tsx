import { useId, useState } from 'react';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import styles from '@/features/admin/components/admin.module.css';
import { formatDateTime } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { TextAreaField } from '@/shared/ui/form/Field';
import { Stars } from '@/shared/ui/Stars/Stars';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';

import { type AdminReview, adminReviewsApi, MAX_REJECT_NOTE } from '../api';
import { REVIEW_STATUS } from '../labels';
import { useModerate } from '../queries';

import local from './ReviewCard.module.css';

/** One review with its moderation actions (API §10 /admin/reviews). */
export function ReviewCard({ review }: { review: AdminReview }) {
  const noteId = useId();
  const [rejecting, setRejecting] = useState(false);
  const [note, setNote] = useState('');
  const [problem, setProblem] = useState<string | null>(null);
  const status = REVIEW_STATUS[review.status];

  const approve = useModerate(
    () => adminReviewsApi.approve(review.id),
    review.status === 'Rejected' ? 'نُشرت المراجعة بعد رفضها.' : 'نُشرت المراجعة.',
  );
  const reject = useModerate(
    (text: string) => adminReviewsApi.reject(review.id, text),
    review.status === 'Approved' ? 'أُزيلت المراجعة من صفحة الكتاب.' : 'رُفضت المراجعة.',
  );
  const busy = approve.isPending || reject.isPending;

  return (
    <article className={styles.card} aria-labelledby={`review-${String(review.id)}`}>
      <header className={local.head}>
        <div className={local.who}>
          <Stars value={review.rating} size={15} />
          <p id={`review-${String(review.id)}`} className={local.author}>
            {review.authorDisplayName}
          </p>
          <p className={styles.sub}>
            عن{' '}
            <Link to={paths.admin.book(review.bookId)} className={styles.rowLink}>
              {review.bookTitle}
            </Link>{' '}
            · {formatDateTime(review.createdAtUtc)}
            {review.updatedAtUtc && ` · عُدّلت ${formatDateTime(review.updatedAtUtc)}`}
          </p>
        </div>
        <StatusBadge label={status.label} tone={status.tone} />
      </header>

      {review.title && <h3 className={local.title}>{review.title}</h3>}
      <p className={local.body} dir="auto">
        {review.body}
      </p>

      {review.status === 'Rejected' && review.moderationNote && (
        <p className={local.note}>
          <b>سبب الرفض (داخلي):</b> {review.moderationNote}
          {review.moderatedAtUtc && <span> · {formatDateTime(review.moderatedAtUtc)}</span>}
        </p>
      )}

      {rejecting ? (
        <form
          className={styles.actionForm}
          onSubmit={(event) => {
            event.preventDefault();
            const text = note.trim();
            if (text === '') {
              setProblem('اكتب سبب الرفض. يبقى داخلياً ولا يراه القارئ.');
              return;
            }
            reject.mutate(text, {
              onSuccess: () => {
                setRejecting(false);
              },
            });
          }}
        >
          <TextAreaField
            id={noteId}
            label="سبب الرفض (داخلي، لا يراه القارئ)"
            rows={2}
            maxLength={MAX_REJECT_NOTE}
            value={note}
            error={problem ?? undefined}
            onChange={(event) => {
              setNote(event.target.value);
              setProblem(null);
            }}
          />
          <div className={styles.buttons}>
            <Button type="submit" variant="red" size="sm" disabled={busy}>
              {reject.isPending
                ? 'جارٍ الحفظ…'
                : review.status === 'Approved'
                  ? 'تأكيد الإزالة'
                  : 'تأكيد الرفض'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setRejecting(false);
                setProblem(null);
              }}
            >
              إلغاء
            </Button>
          </div>
        </form>
      ) : (
        <div className={styles.buttons}>
          {review.status !== 'Approved' && (
            <Button
              variant="ink"
              size="sm"
              disabled={busy}
              onClick={() => {
                approve.mutate(undefined);
              }}
            >
              {approve.isPending ? 'جارٍ النشر…' : 'نشر'}
            </Button>
          )}
          {review.status !== 'Rejected' && (
            <Button
              variant="ghost"
              size="sm"
              disabled={busy}
              onClick={() => {
                setRejecting(true);
              }}
            >
              {review.status === 'Approved' ? 'إزالة من صفحة الكتاب' : 'رفض'}
            </Button>
          )}
        </div>
      )}
    </article>
  );
}