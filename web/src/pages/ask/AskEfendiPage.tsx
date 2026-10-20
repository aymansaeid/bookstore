import { useState } from 'react';
import { useSearchParams } from 'react-router';

import { paths } from '@/app/paths';
import { useSession } from '@/features/auth/session';
import { useBook } from '@/features/book/queries';
import { CartPeek, LibraryPeek } from '@/features/efendi/components/ContextPanels';
import { EfendiChat } from '@/features/efendi/components/EfendiChat';
import { ReaderProfileCard } from '@/features/efendi/components/ReaderProfileCard';
import { cx } from '@/shared/lib/cx';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';
import { Icon } from '@/shared/ui/Icon/Icon';
import { Spark } from '@/shared/ui/Spark/Spark';

import styles from './AskEfendiPage.module.css';

const inputModeOf = (value: string | null) =>
  value === 'photo' || value === 'voice' ? value : null;

/**
 * «اسأل أفندي» (spec 5.2): three columns on wide screens, the chat alone on
 * phones with the context behind a toggle (spec §8.3). The Claude backend
 * doesn't exist yet, so replies are honest and rule-based (modes.ts).
 */
export default function AskEfendiPage() {
  const [params, setParams] = useSearchParams();
  const { status } = useSession();
  const [chatKey, setChatKey] = useState(0);
  const [contextOpen, setContextOpen] = useState(false);
  const bookSlug = params.get('book') ?? '';
  const book = useBook(bookSlug);
  const bookRef = book.data ? { slug: book.data.slug, title: book.data.title } : null;

  const newChat = () => {
    setParams({}, { replace: true });
    setChatKey((key) => key + 1);
  };

  return (
    <div className={cx('wrap', styles.page)}>
      <DocumentTitle title="اسأل أفندي" />

      <aside className={styles.history} aria-labelledby="history-title">
        <Button variant="ink" className={styles.newChat} onClick={newChat}>
          <Icon name="plus" size={18} /> محادثة جديدة
        </Button>
        <h2 id="history-title" className={styles.historyTitle}>
          محادثاتك
        </h2>
        <p className={styles.historyEmpty}>
          {status === 'authenticated'
            ? 'ستُحفظ محادثاتك هنا وفي «حسابي» بعد إطلاق أفندي.'
            : 'سجّل الدخول لتُحفظ محادثاتك بعد إطلاق أفندي.'}
        </p>
        <div className={styles.soon}>
          <Spark size={16} />
          <p>أفندي يعتمد على Claude، وهو قيد الإعداد. سيصلك إشعار عند إطلاقه.</p>
        </div>
        {status === 'authenticated' && (
          <ButtonLink to={paths.account.chats} variant="ghost" size="sm">
            محادثاتي في حسابي
          </ButtonLink>
        )}
      </aside>

      {/* Wait for ?book= so the chat starts in the right mode and context. */}
      {bookSlug !== '' && book.isPending ? (
        <div className={styles.loading} aria-busy="true" aria-label="جارٍ التحميل" />
      ) : (
        <EfendiChat
          key={`${params.toString()}#${String(chatKey)}`}
          initialQuestion={params.get('q') ?? ''}
          inputMode={inputModeOf(params.get('mode'))}
          book={bookRef}
          onNewChat={newChat}
        />
      )}

      <aside className={cx(styles.context, contextOpen && styles.open)} aria-label="سياقك">
        <button
          type="button"
          className={styles.contextToggle}
          aria-expanded={contextOpen}
          aria-controls="efendi-context"
          onClick={() => {
            setContextOpen((open) => !open);
          }}
        >
          <span>ما يعرفه أفندي عنك · مكتبتك · سلتك</span>
          <Icon name="arrow" size={16} className={styles.chevron} />
        </button>
        <div id="efendi-context" className={styles.contextBody}>
          <ReaderProfileCard />
          <LibraryPeek />
          <CartPeek />
        </div>
      </aside>
    </div>
  );
}
