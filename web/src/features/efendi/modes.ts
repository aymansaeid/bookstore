import { paths } from '@/app/paths';
import { i18n } from '@/i18n';

/** Spec 5.2 conversation modes. They change the suggestions and the auto-reply links. */
export type ChatMode = 'purchase' | 'content' | 'orders';

/** Labels and three suggestions each live in efendi.json → modes.<id>. */
export const CHAT_MODES: readonly ChatMode[] = ['purchase', 'content', 'orders'];
export const SUGGESTION_KEYS = ['s1', 's2', 's3'] as const;

export interface ReplyLink {
  label: string;
  to: string;
}

export interface ChatMessage {
  id: number;
  role: 'user' | 'efendi';
  text: string;
  links?: ReplyLink[];
  /** A rule-based reply, not AI. Labelled as such. */
  automatic?: boolean;
}

const searchLink = (query: string): ReplyLink => {
  const q = query.trim().slice(0, 100);
  return {
    label: i18n.t('reply.search', { ns: 'efendi', q: q.length > 40 ? `${q.slice(0, 40)}…` : q }),
    to: `${paths.search}?${new URLSearchParams({ q }).toString()}`,
  };
};

/**
 * Until the Claude backend exists (spec §6), every question gets this honest,
 * rule-based reply: no invented answers, only links to what works today.
 */
export function automaticReply(
  question: string,
  mode: ChatMode,
  book: { slug: string; title: string } | null,
): Omit<ChatMessage, 'id'> {
  const links: ReplyLink[] = [];
  if (book)
    links.push({
      label: i18n.t('reply.bookPage', { ns: 'efendi', title: book.title }),
      to: paths.book(book.slug),
    });

  if (mode === 'orders') {
    links.push(
      { label: i18n.t('reply.track', { ns: 'efendi' }), to: paths.trackOrder },
      { label: i18n.t('reply.return', { ns: 'efendi' }), to: paths.returns },
    );
  } else {
    links.push(searchLink(question));
    if (mode === 'purchase')
      links.push({ label: i18n.t('reply.paths', { ns: 'efendi' }), to: paths.readingPaths });
  }

  return {
    role: 'efendi',
    automatic: true,
    text:
      mode === 'orders'
        ? i18n.t('reply.orders', { ns: 'efendi' })
        : i18n.t('reply.other', { ns: 'efendi' }),
    links,
  };
}