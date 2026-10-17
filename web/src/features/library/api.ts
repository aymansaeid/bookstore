import { customerRequest } from '@/features/auth/session';
import type { BookSummary } from '@/features/catalog/types';

/** API guide §7b. */
export type Ownership = 'Purchased' | 'OnTheWay' | 'AddedManually';
export type ReadingStatus = 'NotStarted' | 'Reading' | 'Finished';

export interface LibraryItem {
  book: BookSummary;
  ownership: Ownership;
  readingStatus: ReadingStatus;
  progressPercent: number;
  acquiredAtUtc: string;
  lastReadAtUtc: string | null;
}

export interface Library {
  items: LibraryItem[];
  stats: {
    totalBooks: number;
    reading: number;
    finished: number;
    notStarted: number;
    totalPages: number;
    pagesRead: number;
    finishedThisYear: number;
  };
  currentlyReadingBookId: number | null;
}

const BASE = '/api/customers/me/library';

export const libraryApi = {
  get: () => customerRequest<Library>(BASE),
  markOwned: (bookId: number) => customerRequest<undefined>(`${BASE}/${bookId}`, { method: 'PUT' }),
  /** Only books marked owned elsewhere can be removed; purchases can't. */
  unmarkOwned: (bookId: number) =>
    customerRequest<undefined>(`${BASE}/${bookId}`, { method: 'DELETE' }),
  /** 100% always means Finished, whatever status is sent (API §7b). */
  updateProgress: (bookId: number, status: ReadingStatus, progressPercent: number) =>
    customerRequest<LibraryItem>(`${BASE}/${bookId}/progress`, {
      method: 'PUT',
      body: { status, progressPercent },
    }),
};

export const READING_STATUS_LABELS: Readonly<Record<ReadingStatus, string>> = {
  NotStarted: 'لم أبدأ بعد',
  Reading: 'أقرأ الآن',
  Finished: 'أنهيته',
};

export const OWNERSHIP_LABELS: Readonly<Record<Ownership, string>> = {
  Purchased: 'اشتريته من كتاب أفندي',
  OnTheWay: 'في الطريق إليك',
  AddedManually: 'أضفته بنفسي',
};
