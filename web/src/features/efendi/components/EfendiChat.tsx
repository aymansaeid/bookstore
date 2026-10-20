import { type KeyboardEvent, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router';

import { useSession } from '@/features/auth/session';
import { cx } from '@/shared/lib/cx';
import { Button } from '@/shared/ui/Button/Button';
import { EffendiAvatar } from '@/shared/ui/EffendiAvatar/EffendiAvatar';
import { Icon } from '@/shared/ui/Icon/Icon';

import { automaticReply, CHAT_MODES, type ChatMessage, type ChatMode } from '../modes';

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
  const hello = firstName ? `أهلاً بك يا ${firstName}.` : 'أهلاً بك.';
  const mode =
    inputMode === 'photo'
      ? ' البحث بصورة الغلاف يحتاجني، وأنا قيد الإعداد؛ اكتب اسم الكتاب الآن وأدلّك على نتائج البحث.'
      : inputMode === 'voice'
        ? ' السؤال بالصوت يحتاجني، وأنا قيد الإعداد؛ اكتب سؤالك الآن وأدلّك على ما يفيدك.'
        : '';
  return {
    id: 0,
    role: 'efendi',
    automatic: true,
    text: `${hello} أنا أفندي، بائع الكتب الذكي في كتاب أفندي. ما زلت قيد الإعداد ولا أجيب عن الأسئلة بعد، لكن يمكنك أن تكتب سؤالك وأدلّك على البحث والصفحات المتاحة.${mode}`,
  };
}

/** The middle column of «اسأل أفندي» (spec 5.2): header, modes, messages, composer. */
export function EfendiChat({ initialQuestion, inputMode, book, onNewChat }: EfendiChatProps) {
  const { customer } = useSession();
  const [mode, setMode] = useState<ChatMode>(book ? 'content' : 'purchase');
  const [draft, setDraft] = useState(initialQuestion.slice(0, MAX_LENGTH));
  const [messages, setMessages] = useState<ChatMessage[]>(() => [
    welcome(customer?.firstName ?? null, inputMode),
  ]);
  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const suggestions = CHAT_MODES.find((item) => item.id === mode)?.suggestions ?? [];

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
              أفندي الذكي
            </h1>
            <p className={styles.status}>
              <span className={styles.statusDot} aria-hidden="true" /> قيد الإعداد
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={styles.newChat}
            aria-label="محادثة جديدة"
            onClick={onNewChat}
          >
            <Icon name="plus" size={16} />
            <span className={styles.newChatText}>محادثة جديدة</span>
          </Button>
        </div>
        <div className={styles.modes} role="group" aria-label="نوع السؤال">
          {CHAT_MODES.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cx(styles.mode, mode === item.id && styles.modeOn)}
              aria-pressed={mode === item.id}
              onClick={() => {
                setMode(item.id);
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </header>

      <div className={styles.log} role="log" aria-live="polite" aria-label="المحادثة">
        {messages.map((message) =>
          message.role === 'user' ? (
            <div key={message.id} className={styles.userRow}>
              <p className={styles.user}>{message.text}</p>
            </div>
          ) : (
            <div key={message.id} className={styles.efendiRow}>
              <EffendiAvatar size={32} className={styles.efendiAvatar} />
              <div className={styles.efendi}>
                {message.automatic && (
                  <p className={styles.auto}>رد آلي · ليس من الذكاء الاصطناعي</p>
                )}
                <p>{message.text}</p>
                {message.links && message.links.length > 0 && (
                  <ul className={styles.links}>
                    {message.links.map((link) => (
                      <li key={link.to}>
                        <Link to={link.to} className={styles.link}>
                          {link.label} <span aria-hidden="true">←</span>
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
            سؤالك عن: <b>{book.title}</b>
          </p>
        )}
        <ul className={styles.suggestions} aria-label="أسئلة مقترحة">
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
            اكتب سؤالك لأفندي
          </label>
          <textarea
            ref={inputRef}
            id="efendi-input"
            className={styles.input}
            rows={1}
            maxLength={MAX_LENGTH}
            placeholder="اكتب سؤالك لأفندي…"
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
              title="قريباً"
              aria-label="أرفق صورة غلاف (قريباً)"
            >
              <Icon name="cam" size={20} />
            </button>
            <button
              type="button"
              className={styles.tool}
              disabled
              title="قريباً"
              aria-label="اسأل بصوتك (قريباً)"
            >
              <Icon name="mic" size={20} />
            </button>
            <button
              type="submit"
              className={styles.send}
              disabled={draft.trim() === ''}
              aria-label="إرسال"
            >
              <Icon name="send" size={20} />
            </button>
          </div>
        </form>
        <p className={styles.note}>
          أفندي قيد الإعداد. الردود هنا آلية تدلّك على البحث والصفحات المتاحة، ولا تُحفظ المحادثة.
        </p>
      </div>
    </section>
  );
}
