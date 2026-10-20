import { paths } from '@/app/paths';

/** Spec 5.2 conversation modes. They change the suggestions and the auto-reply links. */
export type ChatMode = 'purchase' | 'content' | 'orders';

export const CHAT_MODES: readonly { id: ChatMode; label: string; suggestions: string[] }[] = [
  {
    id: 'purchase',
    label: 'نصيحة شراء',
    suggestions: [
      'ما أفضل طبعة من زاد المعاد؟',
      'هدية لطالب علم بميزانية ١٠٠٠ ₺',
      'من أين أبدأ في علوم الحديث؟',
    ],
  },
  {
    id: 'content',
    label: 'شرح ومحتوى',
    suggestions: [
      'ما الفرق بين الشرح والحاشية؟',
      'هل في هذا الكتاب مجلد فهارس؟',
      'ما أبرز موضوعات رياض الصالحين؟',
    ],
  },
  {
    id: 'orders',
    label: 'تتبع طلباتي',
    suggestions: ['أين طلبي الآن؟', 'كم يستغرق الشحن إلى ألمانيا؟', 'كيف أُرجع كتاباً؟'],
  },
];

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
    label: `ابحث في المكتبة عن «${q.length > 40 ? `${q.slice(0, 40)}…` : q}»`,
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
  if (book) links.push({ label: `صفحة «${book.title}»`, to: paths.book(book.slug) });

  if (mode === 'orders') {
    links.push(
      { label: 'تتبّع طلبك', to: paths.trackOrder },
      { label: 'طلب إرجاع', to: paths.returns },
    );
  } else {
    links.push(searchLink(question));
    if (mode === 'purchase') links.push({ label: 'مسارات القراءة', to: paths.readingPaths });
  }

  return {
    role: 'efendi',
    automatic: true,
    text:
      mode === 'orders'
        ? 'لا أستطيع الاطلاع على طلبك بعد، فأنا قيد الإعداد. يمكنك متابعة طلبك أو إرجاعه من هنا:'
        : 'لا أستطيع الإجابة عن سؤالك بعد، فأنا قيد الإعداد. إلى أن أُطلق، هذا ما يمكنك فعله الآن:',
    links,
  };
}
