import { z } from 'zod';

import type { BookFormat } from '@/shared/api/enums';

import type { AdminBook, BookDetailsInput, NewBookInput } from './api';

/** Numbers are typed as text and checked here, so the form never holds NaN. */
const whole = (label: string, min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, `${label}: أدخل رقماً صحيحاً`)
    .refine((value) => Number(value) >= min && Number(value) <= max, {
      message: `${label}: بين ${String(min)} و${String(max)}`,
    });

const optionalText = (max: number) => z.string().trim().max(max, 'النص أطول من المسموح');

export const FORMATS: BookFormat[] = ['Hardcover', 'Paperback', 'BoxSet'];

export const LANGUAGES: { code: string; label: string }[] = [
  { code: 'ar', label: 'العربية' },
  { code: 'tr', label: 'التركية' },
  { code: 'en', label: 'الإنجليزية' },
];

/** Same limits as CreateBookCommandValidator / UpdateBookCommandValidator. */
export const bookDetailsSchema = z.object({
  title: z.string().trim().min(1, 'أدخل العنوان').max(500, 'العنوان أطول من المسموح'),
  subtitle: optionalText(500),
  author: z.string().trim().min(1, 'أدخل اسم المؤلف').max(300, 'الاسم أطول من المسموح'),
  slug: optionalText(200),
  isbn: optionalText(20),
  description: optionalText(4000),
  format: z.enum(['Paperback', 'Hardcover', 'BoxSet']),
  pageCount: whole('عدد الصفحات', 1, 50_000),
  language: z.string().regex(/^[a-z]{2}$/, 'اختر اللغة'),
  publisher: optionalText(300),
  publicationDate: z.string().regex(/^(\d{4}-\d{2}-\d{2})?$/, 'تاريخ غير صالح'),
  weightGrams: whole('الوزن', 1, 50_000),
  heightMm: whole('الارتفاع', 1, 2_000),
  widthMm: whole('العرض', 1, 2_000),
  depthMm: whole('السماكة', 1, 1_000),
  price: z
    .string()
    .trim()
    .regex(/^\d+(\.\d{1,2})?$/, 'أدخل سعراً مثل 2400 أو 2400.50')
    .refine((value) => Number(value) > 0, { message: 'السعر يجب أن يكون أكبر من صفر' }),
  initialStock: whole('المخزون الأولي', 0, 1_000_000),
});

export type BookDetailsValues = z.infer<typeof bookDetailsSchema>;

export const emptyBookValues: BookDetailsValues = {
  title: '',
  subtitle: '',
  author: '',
  slug: '',
  isbn: '',
  description: '',
  format: 'Hardcover',
  pageCount: '',
  language: 'ar',
  publisher: 'مؤسسة الرسالة ناشرون',
  publicationDate: '',
  weightGrams: '',
  heightMm: '',
  widthMm: '',
  depthMm: '',
  price: '',
  initialStock: '0',
};

export function valuesFromBook(book: AdminBook): BookDetailsValues {
  return {
    title: book.title,
    subtitle: book.subtitle ?? '',
    author: book.author,
    slug: book.slug,
    isbn: book.isbn,
    description: book.description,
    format: book.format,
    pageCount: String(book.pageCount),
    language: book.language,
    publisher: book.publisher ?? '',
    publicationDate: book.publicationDate ?? '',
    weightGrams: String(book.weightGrams),
    heightMm: String(book.heightMm),
    widthMm: String(book.widthMm),
    depthMm: String(book.depthMm),
    price: String(book.price),
    initialStock: '0',
  };
}

const orNull = (value: string) => (value.trim() === '' ? null : value.trim());

export function detailsInput(values: BookDetailsValues): BookDetailsInput {
  return {
    title: values.title.trim(),
    subtitle: orNull(values.subtitle),
    author: values.author.trim(),
    description: orNull(values.description),
    format: values.format,
    pageCount: Number(values.pageCount),
    language: values.language,
    publisher: orNull(values.publisher),
    publicationDate: orNull(values.publicationDate),
    weightGrams: Number(values.weightGrams),
    heightMm: Number(values.heightMm),
    widthMm: Number(values.widthMm),
    depthMm: Number(values.depthMm),
    price: Number(values.price),
  };
}

export function newBookInput(values: BookDetailsValues): NewBookInput {
  return {
    ...detailsInput(values),
    slug: orNull(values.slug),
    isbn: orNull(values.isbn),
    initialStock: Number(values.initialStock),
  };
}