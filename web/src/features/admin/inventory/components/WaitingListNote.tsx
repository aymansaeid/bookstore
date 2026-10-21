import styles from '@/features/admin/components/admin.module.css';
import { arabicPlural } from '@/shared/lib/format';

import { useWaitingList } from '../queries';

const readers = (count: number) =>
  arabicPlural(count, { one: 'قارئ واحد', two: 'قارئان', few: 'قرّاء', many: 'قارئاً' });

/** «Notify me» sign-ups for this book (API §10 waiting-list). Silent when nobody waits. */
export function WaitingListNote({ bookId }: { bookId: number }) {
  const { data: count } = useWaitingList(bookId);
  if (count === undefined || count === 0) return null;
  return (
    <p className={styles.muted}>
      ينتظر توفّره {readers(count)}، ويصلهم بريد تلقائياً حين يعود إلى المخزون.
    </p>
  );
}