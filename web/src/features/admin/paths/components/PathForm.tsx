import { zodResolver } from '@hookform/resolvers/zod';
import type { ReactNode } from 'react';
import { useFieldArray, useForm, useWatch } from 'react-hook-form';

import form from '@/features/admin/books/components/BookEditor.module.css';
import type { AdminBook } from '@/features/admin/books/api';
import styles from '@/features/admin/components/admin.module.css';
import { levelLabel } from '@/shared/api/enums';
import { serverFieldErrors } from '@/shared/api/formErrors';
import { formatCount, formatMoney } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { Checkbox, FormAlert, SelectField, TextAreaField, TextField } from '@/shared/ui/form/Field';

import { PATH_LIMITS } from '../api';
import { emptyStage, pathPrice, pathSchema, type PathValues } from '../schema';

import local from './PathForm.module.css';

const LEVELS = ['Beginner', 'Intermediate', 'Specialist'] as const;
const ORDINALS = [
  'الأولى',
  'الثانية',
  'الثالثة',
  'الرابعة',
  'الخامسة',
  'السادسة',
  'السابعة',
  'الثامنة',
  'التاسعة',
  'العاشرة',
];

interface PathFormProps {
  creating: boolean;
  defaultValues: PathValues;
  /** Every book, hidden ones too, for the stage pickers and the price preview. */
  books: AdminBook[];
  pending: boolean;
  error: unknown;
  onSave: (values: PathValues) => void;
  /** Shown under the price: visibility and delete for an existing path. */
  status?: ReactNode;
}

/** A reading path (API §7d): details, 2–10 ordered stages with a reason each, bundle discount. */
export function PathForm({
  creating,
  defaultValues,
  books,
  pending,
  error,
  onSave,
  status,
}: PathFormProps) {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<PathValues>({
    resolver: zodResolver(pathSchema),
    defaultValues,
    mode: 'onTouched',
  });
  const stages = useFieldArray({ control, name: 'stages' });
  const watchedStages = useWatch({ control, name: 'stages' });
  const discount = useWatch({ control, name: 'discountPercentage' });

  const server = serverFieldErrors(error);
  const fieldError = (name: keyof PathValues) => errors[name]?.message ?? server[name];
  const stageError = (index: number, name: 'bookId' | 'reason' | 'weeks') =>
    errors.stages?.[index]?.[name]?.message ?? server[`stages.${String(index)}.${name}`];
  const listError = errors.stages?.message ?? errors.stages?.root?.message;

  const byId = new Map(books.map((book) => [book.id, book]));
  const sorted = [...books].sort((a, b) => a.title.localeCompare(b.title, 'ar'));
  const picked = watchedStages
    .map((stage) => byId.get(Number(stage.bookId)))
    .filter((book): book is AdminBook => book !== undefined);
  const percent = /^\d+$/.test(discount) ? Math.min(Number(discount), PATH_LIMITS.maxDiscount) : 0;
  const price = pathPrice(
    picked.map((book) => book.price),
    percent,
  );
  const currency = picked[0]?.currency ?? 'TRY';

  return (
    <form
      noValidate
      className={local.layout}
      onSubmit={(event) => {
        void handleSubmit(onSave)(event);
      }}
    >
      <div className={local.main}>
        <section className={styles.card} aria-labelledby="path-details">
          <h2 id="path-details" className={styles.cardTitle}>
            تفاصيل المسار
          </h2>
          <div className={form.form}>
            <TextField
              label="عنوان المسار"
              maxLength={PATH_LIMITS.title}
              error={fieldError('title')}
              {...register('title')}
            />
            {creating ? (
              <TextField
                label="الرابط (اختياري)"
                hint="يُصنع من العنوان إن تركته فارغاً، ولا يتغير بعد الإنشاء."
                dir="auto"
                error={fieldError('slug')}
                {...register('slug')}
              />
            ) : (
              <dl className={form.fixed}>
                <div>
                  <dt>الرابط</dt>
                  <dd dir="auto">/paths/{defaultValues.slug}</dd>
                </div>
              </dl>
            )}
            <TextAreaField
              label="الوصف (اختياري)"
              rows={3}
              maxLength={PATH_LIMITS.description}
              error={fieldError('description')}
              {...register('description')}
            />
            <div className={form.grid3}>
              <SelectField label="المستوى" error={fieldError('level')} {...register('level')}>
                {LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {levelLabel(level)}
                  </option>
                ))}
              </SelectField>
              <TextField
                label="المدة (أسابيع)"
                dir="ltr"
                inputMode="numeric"
                error={fieldError('estimatedWeeks')}
                {...register('estimatedWeeks')}
              />
              <TextField
                label="خصم المسار (%)"
                hint={`حتى ${formatCount(PATH_LIMITS.maxDiscount)}٪.`}
                dir="ltr"
                inputMode="numeric"
                error={fieldError('discountPercentage')}
                {...register('discountPercentage')}
              />
            </div>
            <div className={form.grid}>
              <TextField
                label="الترتيب"
                hint="الأصغر يظهر أولاً."
                dir="ltr"
                inputMode="numeric"
                error={fieldError('displayOrder')}
                {...register('displayOrder')}
              />
              <div className={form.checks}>
                <Checkbox {...register('isFeatured')}>مميّز: يظهر في الصفحة الرئيسية</Checkbox>
              </div>
            </div>
          </div>
        </section>

        <section className={styles.card} aria-labelledby="path-stages">
          <h2 id="path-stages" className={styles.cardTitle}>
            المراحل ({formatCount(stages.fields.length)} / {formatCount(PATH_LIMITS.maxStages)})
          </h2>
          <p className={styles.muted}>
            كتاب في كل مرحلة، بالترتيب الذي يُقرأ به، مع سبب يظهر للقارئ: لماذا هذا الكتاب الآن؟
          </p>
          {listError && <FormAlert>{listError}</FormAlert>}
          <ol className={local.stages}>
            {stages.fields.map((field, index) => {
              const book = byId.get(Number(watchedStages[index]?.bookId));
              return (
                <li key={field.id} className={local.stage}>
                  <div className={local.stageHead}>
                    <p className={local.stageTitle}>
                      المرحلة {ORDINALS[index] ?? formatCount(index + 1)}
                    </p>
                    <div className={local.tools}>
                      <button
                        type="button"
                        className={form.iconButton}
                        aria-label={`تقديم المرحلة ${formatCount(index + 1)}`}
                        disabled={index === 0}
                        onClick={() => {
                          stages.move(index, index - 1);
                        }}
                      >
                        ↑
                      </button>
                      <button
                        type="button"
                        className={form.iconButton}
                        aria-label={`تأخير المرحلة ${formatCount(index + 1)}`}
                        disabled={index === stages.fields.length - 1}
                        onClick={() => {
                          stages.move(index, index + 1);
                        }}
                      >
                        ↓
                      </button>
                      <button
                        type="button"
                        className={form.iconButton}
                        aria-label={`حذف المرحلة ${formatCount(index + 1)}`}
                        disabled={stages.fields.length <= PATH_LIMITS.minStages}
                        onClick={() => {
                          stages.remove(index);
                        }}
                      >
                        ×
                      </button>
                    </div>
                  </div>
                  <SelectField
                    label="الكتاب"
                    error={stageError(index, 'bookId')}
                    {...register(`stages.${index}.bookId`)}
                  >
                    <option value="">اختر كتاباً…</option>
                    {sorted.map((option) => (
                      <option key={option.id} value={option.id}>
                        {option.title}
                        {option.editionLabel ? ` — ${option.editionLabel}` : ''}
                        {option.isActive ? '' : ' (مخفي)'}
                      </option>
                    ))}
                  </SelectField>
                  {book && !book.isActive && (
                    <p className={local.warn}>هذا الكتاب مخفي عن المتجر؛ أظهره قبل نشر المسار.</p>
                  )}
                  {book?.isActive && book.availableToSell === 0 && (
                    <p className={local.warn}>
                      نفد هذا الكتاب، فلن يستطيع القرّاء شراء المسار كاملاً.
                    </p>
                  )}
                  <TextAreaField
                    label="لماذا هذا الكتاب هنا؟"
                    rows={2}
                    maxLength={PATH_LIMITS.reason}
                    error={stageError(index, 'reason')}
                    {...register(`stages.${index}.reason`)}
                  />
                  <TextField
                    label="مدة المرحلة بالأسابيع (اختياري)"
                    dir="ltr"
                    inputMode="numeric"
                    className={local.weeks}
                    error={stageError(index, 'weeks')}
                    {...register(`stages.${index}.weeks`)}
                  />
                </li>
              );
            })}
          </ol>
          <Button
            variant="ghost"
            size="sm"
            className={local.add}
            disabled={stages.fields.length >= PATH_LIMITS.maxStages}
            onClick={() => {
              stages.append(emptyStage);
            }}
          >
            + إضافة مرحلة
          </Button>
        </section>
      </div>

      <div className={local.side}>
        <section className={styles.card} aria-labelledby="path-price">
          <h2 id="path-price" className={styles.cardTitle}>
            سعر المسار
          </h2>
          <dl className={local.price}>
            <div>
              <dt>مجموع الكتب ({formatCount(picked.length)})</dt>
              <dd>{formatMoney(price.total, currency)}</dd>
            </div>
            <div>
              <dt>خصم المسار ({formatCount(percent)}٪)</dt>
              <dd>− {formatMoney(price.savings, currency)}</dd>
            </div>
            <div className={local.grand}>
              <dt>يدفع القارئ</dt>
              <dd>{formatMoney(price.discounted, currency)}</dd>
            </div>
          </dl>
          <p className={styles.muted}>من يملك بعض كتب المسار يدفع ثمن الباقي فقط، بالخصم نفسه.</p>
          <Button type="submit" variant="ink" disabled={pending || (!creating && !isDirty)}>
            {pending ? 'جارٍ الحفظ…' : creating ? 'إنشاء المسار' : 'حفظ المسار'}
          </Button>
          {status}
        </section>
      </div>
    </form>
  );
}