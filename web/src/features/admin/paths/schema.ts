import { z } from 'zod';

import { formatCount } from '@/shared/lib/format';

import { type AdminReadingPath, PATH_LIMITS as L, type ReadingPathInput } from './api';

const tooLong = 'النص أطول من المسموح';

/** Whole numbers are typed as text and checked here, so the form never holds NaN. */
const whole = (min: number, max: number) =>
  z
    .string()
    .trim()
    .regex(/^\d+$/, 'أدخل رقماً صحيحاً')
    .refine((value) => Number(value) >= min && Number(value) <= max, {
      message: `بين ${formatCount(min)} و${formatCount(max)}`,
    });

const stageSchema = z.object({
  /** '' until a book is picked. */
  bookId: z.string().min(1, 'اختر كتاباً'),
  reason: z.string().trim().min(1, 'اكتب لماذا يأتي هذا الكتاب هنا').max(L.reason, tooLong),
  /** Optional: '' = not set. */
  weeks: z
    .string()
    .trim()
    .regex(/^\d*$/, 'أدخل رقماً صحيحاً')
    .refine((value) => value === '' || (Number(value) >= 1 && Number(value) <= L.maxStageWeeks), {
      message: `بين ١ و${formatCount(L.maxStageWeeks)}`,
    }),
});

export const pathSchema = z.object({
  title: z.string().trim().min(1, 'أدخل عنوان المسار').max(L.title, tooLong),
  slug: z.string().trim().max(L.slug, tooLong),
  description: z.string().trim().max(L.description, tooLong),
  level: z.enum(['Beginner', 'Intermediate', 'Specialist']),
  estimatedWeeks: whole(1, L.maxWeeks),
  discountPercentage: whole(0, L.maxDiscount),
  displayOrder: whole(0, L.maxDisplayOrder),
  isFeatured: z.boolean(),
  stages: z
    .array(stageSchema)
    .min(L.minStages, 'المسار يحتاج كتابين على الأقل')
    .max(L.maxStages, `حتى ${formatCount(L.maxStages)} كتب`)
    .superRefine((stages, ctx) => {
      const seen = new Set<string>();
      stages.forEach((stage, index) => {
        if (stage.bookId === '') return;
        if (seen.has(stage.bookId)) {
          ctx.addIssue({
            code: 'custom',
            message: 'هذا الكتاب مذكور في مرحلة سابقة',
            path: [index, 'bookId'],
          });
        }
        seen.add(stage.bookId);
      });
    }),
});

export type PathValues = z.infer<typeof pathSchema>;
export type StageValues = PathValues['stages'][number];

export const emptyStage: StageValues = { bookId: '', reason: '', weeks: '' };

export const emptyPath: PathValues = {
  title: '',
  slug: '',
  description: '',
  level: 'Beginner',
  estimatedWeeks: '8',
  discountPercentage: '10',
  displayOrder: '0',
  isFeatured: false,
  stages: [emptyStage, emptyStage],
};

export const pathValues = (path: AdminReadingPath): PathValues => ({
  title: path.title,
  slug: path.slug,
  description: path.description ?? '',
  level: path.level,
  estimatedWeeks: String(path.estimatedWeeks),
  discountPercentage: String(path.discountPercentage),
  displayOrder: String(path.displayOrder),
  isFeatured: path.isFeatured,
  stages: [...path.stages]
    .sort((a, b) => a.stageNumber - b.stageNumber)
    .map((stage) => ({
      bookId: String(stage.bookId),
      reason: stage.reason,
      weeks: stage.estimatedWeeks === null ? '' : String(stage.estimatedWeeks),
    })),
});

const orNull = (value: string) => (value.trim() === '' ? null : value.trim());

export const pathInput = (values: PathValues): ReadingPathInput => ({
  title: values.title.trim(),
  slug: orNull(values.slug),
  description: orNull(values.description),
  level: values.level,
  estimatedWeeks: Number(values.estimatedWeeks),
  discountPercentage: Number(values.discountPercentage),
  displayOrder: Number(values.displayOrder),
  isFeatured: values.isFeatured,
  stages: values.stages.map((stage) => ({
    bookId: Number(stage.bookId),
    reason: stage.reason.trim(),
    estimatedWeeks: stage.weeks === '' ? null : Number(stage.weeks),
  })),
});

/**
 * Same arithmetic as the server's PathPricing: the discount is a percentage
 * of the total, rounded to kuruş. Shown as a preview while editing.
 */
export function pathPrice(prices: number[], discountPercentage: number) {
  const total = Math.round(prices.reduce((sum, price) => sum + price, 0) * 100) / 100;
  const savings = Math.round(total * discountPercentage) / 100;
  return { total, savings, discounted: Math.round((total - savings) * 100) / 100 };
}