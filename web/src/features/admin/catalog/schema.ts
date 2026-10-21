import { z } from 'zod';

import { formatCount } from '@/shared/lib/format';

import {
  type AdminCategory,
  type AdminMuhaqqiq,
  CATALOG_LIMITS as L,
  type CategoryInput,
  type MuhaqqiqInput,
  type NewCategoryInput,
  type NewMuhaqqiqInput,
} from './api';

const tooLong = 'النص أطول من المسموح';
const order = z
  .string()
  .trim()
  .regex(/^\d+$/, 'أدخل رقماً صحيحاً')
  .refine((value) => Number(value) <= L.maxDisplayOrder, {
    message: `بين ٠ و${formatCount(L.maxDisplayOrder)}`,
  });

const orNull = (value: string) => (value.trim() === '' ? null : value.trim());

/* ---------- Categories ---------- */

export const categorySchema = z.object({
  name: z.string().trim().min(1, 'أدخل اسم القسم').max(L.categoryName, tooLong),
  slug: z.string().trim().max(L.slug, tooLong),
  letter: z.string().trim().max(L.letter, 'حتى ٨ أحرف'),
  description: z.string().trim().max(L.categoryDescription, tooLong),
  /** '' = top level. */
  parentId: z.string(),
  displayOrder: order,
});

export type CategoryValues = z.infer<typeof categorySchema>;

export const emptyCategory: CategoryValues = {
  name: '',
  slug: '',
  letter: '',
  description: '',
  parentId: '',
  displayOrder: '0',
};

export const categoryValues = (category: AdminCategory): CategoryValues => ({
  name: category.name,
  slug: category.slug,
  letter: category.letter ?? '',
  description: category.description ?? '',
  parentId: category.parentId === null ? '' : String(category.parentId),
  displayOrder: String(category.displayOrder),
});

export const categoryInput = (values: CategoryValues): CategoryInput => ({
  name: values.name.trim(),
  letter: orNull(values.letter),
  description: orNull(values.description),
  parentId: values.parentId === '' ? null : Number(values.parentId),
  displayOrder: Number(values.displayOrder),
});

export const newCategoryInput = (values: CategoryValues): NewCategoryInput => ({
  ...categoryInput(values),
  slug: orNull(values.slug),
});

/* ---------- Muhaqqiqs ---------- */

/** «الحديث، الفقه الشافعي» → ['الحديث', 'الفقه الشافعي'] */
export const splitSpecialties = (text: string): string[] =>
  text
    .split(/[,،]/)
    .map((item) => item.trim())
    .filter((item) => item !== '');

export const muhaqqiqSchema = z.object({
  name: z.string().trim().min(1, 'أدخل الاسم').max(L.muhaqqiqName, tooLong),
  slug: z.string().trim().max(L.slug, tooLong),
  bio: z.string().trim().max(L.bio, tooLong),
  specialties: z
    .string()
    .refine((text) => splitSpecialties(text).length <= L.specialties, {
      message: 'حتى ١٠ تخصصات',
    })
    .refine((text) => splitSpecialties(text).every((item) => item.length <= L.specialtyLength), {
      message: 'كل تخصص حتى ٥٠ حرفاً',
    }),
  isFeatured: z.boolean(),
  displayOrder: order,
});

export type MuhaqqiqValues = z.infer<typeof muhaqqiqSchema>;

export const emptyMuhaqqiq: MuhaqqiqValues = {
  name: '',
  slug: '',
  bio: '',
  specialties: '',
  isFeatured: false,
  displayOrder: '0',
};

export const muhaqqiqValues = (muhaqqiq: AdminMuhaqqiq): MuhaqqiqValues => ({
  name: muhaqqiq.name,
  slug: muhaqqiq.slug,
  bio: muhaqqiq.bio ?? '',
  specialties: muhaqqiq.specialties.join('، '),
  isFeatured: muhaqqiq.isFeatured,
  displayOrder: String(muhaqqiq.displayOrder),
});

export const muhaqqiqInput = (values: MuhaqqiqValues): MuhaqqiqInput => ({
  name: values.name.trim(),
  bio: orNull(values.bio),
  specialties: splitSpecialties(values.specialties),
  isFeatured: values.isFeatured,
  displayOrder: Number(values.displayOrder),
});

export const newMuhaqqiqInput = (values: MuhaqqiqValues): NewMuhaqqiqInput => ({
  ...muhaqqiqInput(values),
  slug: orNull(values.slug),
});