import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { useSession } from '@/features/auth/session';
import { i18n } from '@/i18n';
import { cx } from '@/shared/lib/cx';
import { Button } from '@/shared/ui/Button/Button';
import { EffendiAvatar } from '@/shared/ui/EffendiAvatar/EffendiAvatar';
import { ForwardArrow } from '@/shared/ui/ForwardArrow/ForwardArrow';
import { Icon } from '@/shared/ui/Icon/Icon';

import {
  automaticReply,
  CHAT_MODES,
  type ChatMessage,
  type ChatMode,
  SUGGESTION_KEYS,
} from '../modes';

import styles from './EfendiChat.module.css';

const MAX_LENGTH = 1000;

interface EfendiChatProps {
  /** ?q= from «اسأل أفندي عن هذا الكتاب» and the header. */
  initialQuestion: string;
  /** ?mode=photo|voice from the header's camera and microphone. */
  inputMode: 'photo' | 'voice' | null;
  /** ?book= : the book the question is about. */
  book: { slug: string; title: string } | null;
  onNewChat: () => void;
}

function welcome(firstName: string | null, inputMode: EfendiChatProps['inputMode']): ChatMessage {
  const t = (key: 'helloName' | 'hello' | 'intro' | 'photo' | 'voice') =>
    i18n.t(`welcome.${key}`, { ns: 'efendi', name: firstName ?? '' });
  const parts = [firstName ? t('helloName') : t('hello'), t('intro')];
  if (inputMode) parts.push(t(inputMode));
  return {
    id: 0,
    role: 'efendi',
    automatic: true,
    text: parts.join(' '),
  };
}

/** The middle column of «اسأل أفندي» (spec 5.2): header, modes, messages, composer. */
export function EfendiChat({ initialQuestion, inputMode, book, onNewChat }: EfendiChatProps) {
  const { t } = useTranslation('efendi');
  const { customer } = useSession();
  const [mode, setMode] = useState<ChatMode>(book ? 'content' : 'purchase');
  const [draft, setDraft] = useState(initialQuestion.slice(0, MAX_LENGTH));
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    welcome(customer?.firstName ?? null, inputMode),
  ]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestions = SUGGESTION_KEYS.map((key) => t(`modes.${mode}.${key}`));

  useEffect(() => {
    if (messages.length > 1) endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages.length]);

  const send = () => {
    const text = draft.trim();
    if (text === '') return;
    setMessages((current) => [
      ...current,
      { id: current.length, role: 'user', text },
      { id: current.length + 1, ...automaticReply(text, mode, book) },
    ]);
    setDraft('');
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Enter sends; Shift+Enter is a new line. Never while composing (IME).
    if (event.key === 'Enter' && !event.shiftKey && !event.nativeEvent.isComposing) {
      event.preventDefault();
      send();
    }
  };

  return (
    <section className={styles.chat} aria-labelledby="efendi-title">
      <header className={styles.head}>
        <div className={styles.who}>
          <EffendiAvatar size={44} />
          <div>
            <h1 id="efendi-title" className={styles.name}>
              {t('chat.name')}
            </h1>
            <p className={styles.status}>
              <span className={styles.statusDot} aria-hidden="true" /> {t('chat.status')}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={styles.newChat}
            aria-label={t('chat.newChat')}
            onClick={onNewChat}
          >
            <Icon name="plus" size={16} />
            <span className={styles.newChatText}>{t('chat.newChat')}</span>
          </Button>
        </div>
        <div className={styles.modes} role="group" aria-label={t('modes.label')}>
          {CHAT_MODES.map((item) => (
            <button
              key={item}
              type="button"
              className={cx(styles.mode, mode === item && styles.modeOn)}
              aria-pressed={mode === item}
              onClick={() => {
                setMode(item);
              }}
            >
              {t(`modes.${item}.label`)}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.log} role="log" aria-live="polite" aria-label={t('chat.log')}>
        {messages.map((message) =>
          message.role === 'user' ? (
            <div key={message.id} className={styles.userRow}>
              <p className={styles.user}>{message.text}</p>
            </div>
          ) : (
            <div key={message.id} className={styles.efendiRow}>
              <EffendiAvatar size={32} className={styles.efendiAvatar} />
              <div className={styles.efendi}>
                {message.automatic && <p className={styles.auto}>{t('chat.auto')}</p>}
                <p>{message.text}</p>
                {message.links && message.links.length > 0 && (
                  <ul className={styles.links}>
                    {message.links.map((link) => (
                      <li key={link.to}>
                        <Link to={link.to} className={styles.link}>
                          {link.label} <ForwardArrow />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ),
        )}
        <div ref={endRef} />
      </div>

      <div className={styles.dock}>
        {book && (
          <p className={styles.about}>
            <Trans
              t={t}
              i18nKey="chat.about"
              values={{ title: book.title }}
              components={{ b: <b /> }}
            />
          </p>
        )}
        <ul className={styles.suggestions} aria-label={t('chat.suggestions')}>
          {suggestions.map((suggestion) => (
            <li key={suggestion}>
              <button
                type="button"
                className={styles.suggestion}
                onClick={() => {
                  setDraft(suggestion);
                  inputRef.current?.focus();
                }}
              >
                {suggestion}
              </button>
            </li>
          ))}
        </ul>

        <form
          className={styles.composer}
          onSubmit={(event) => {
            event.preventDefault();
            send();
          }}
        >
          <label htmlFor="efendi-input" className="sr-only">
            {t('chat.inputLabel')}
          </label>
          <textarea
            ref={inputRef}
            id="efendi-input"
            className={styles.input}
            rows={1}
            maxLength={MAX_LENGTH}
            placeholder={t('chat.placeholder')}
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value);
            }}
            onKeyDown={onKeyDown}
          />
          <div className={styles.tools}>
            <button
              type="button"
              className={styles.tool}
              disabled
              title={t('chat.soon')}
              aria-label={t('chat.photo')}
            >
              <Icon name="cam" size={20} />
            </button>
            <button
              type="button"
              className={styles.tool}
              disabled
              title={t('chat.soon')}
              aria-label={t('chat.voice')}
            >
              <Icon name="mic" size={20} />
            </button>
            <button
              type="submit"
              className={styles.send}
              disabled={draft.trim() === ''}
              aria-label={t('chat.send')}
            >
              <Icon name="send" size={20} />
            </button>
          </div>
        </form>
        <p className={styles.note}>{t('chat.note')}</p>
      </div>
    </section>
  );
}