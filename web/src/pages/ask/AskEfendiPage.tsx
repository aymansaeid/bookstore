import { useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation('efendi', { keyPrefix: 'page' });
  const { t: tChat } = useTranslation('efendi', { keyPrefix: 'chat' });
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
      <DocumentTitle title={t('title')} />

      <aside className={styles.history} aria-labelledby="history-title">
        <Button variant="ink" className={styles.newChat} onClick={newChat}>
          <Icon name="plus" size={18} /> {tChat('newChat')}
        </Button>
        <h2 id="history-title" className={styles.historyTitle}>
          {t('history')}
        </h2>
        <p className={styles.historyEmpty}>
          {status === 'authenticated' ? t('historySignedIn') : t('historyGuest')}
        </p>
        <div className={styles.soon}>
          <Spark size={16} />
          <p>{t('soon')}</p>
        </div>
        {status === 'authenticated' && (
          <ButtonLink to={paths.account.chats} variant="ghost" size="sm">
            {t('myChats')}
          </ButtonLink>
        )}
      </aside>

      {/* Wait for ?book= so the chat starts in the right mode and context. */}
      {bookSlug !== '' && book.isPending ? (
        <div className={styles.loading} aria-busy="true" aria-label={t('loading')} />
      ) : (
        <EfendiChat
          key={`${params.toString()}#${String(chatKey)}`}
          initialQuestion={params.get('q') ?? ''}
          inputMode={inputModeOf(params.get('mode'))}
          book={bookRef}
          onNewChat={newChat}
        />
      )}

      <aside className={cx(styles.context, contextOpen && styles.open)} aria-label={t('context')}>
        <button
          type="button"
          className={styles.contextToggle}
          aria-expanded={contextOpen}
          aria-controls="efendi-context"
          onClick={() => {
            setContextOpen((open) => !open);
          }}
        >
          <span>{t('contextToggle')}</span>
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