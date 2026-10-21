import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import { formatLabel } from '@/shared/api/enums';
import { serverFieldErrors } from '@/shared/api/formErrors';
import { Button } from '@/shared/ui/Button/Button';
import { SelectField, TextAreaField, TextField } from '@/shared/ui/form/Field';

import { bookDetailsSchema, type BookDetailsValues, FORMATS, LANGUAGES } from '../schema';

import styles from './BookEditor.module.css';

interface BookDetailsFormProps {
  mode: 'create' | 'edit';
  defaultValues: BookDetailsValues;
  pending: boolean;
  /** Field errors from the server land on their fields; anything else is a toast. */
  error: unknown;
  onSave: (values: BookDetailsValues) => void;
}

/**
 * The book's own fields (API §10 POST/PUT /books). Slug and ISBN are fixed
 * once the book exists; stock has its own card with a ledger note.
 */
export function BookDetailsForm({
  mode,
  defaultValues,
  pending,
  error,
  onSave,
}: BookDetailsFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<BookDetailsValues>({
    resolver: zodResolver(bookDetailsSchema),
    defaultValues,
    mode: 'onTouched',
  });
  const server = serverFieldErrors(error);
  const fieldError = (name: keyof BookDetailsValues) => errors[name]?.message ?? server[name];
  const creating = mode === 'create';

  return (
    <form
      noValidate
      className={styles.form}
      onSubmit={(event) => {
        void handleSubmit(onSave)(event);
      }}
    >
      <div className={styles.grid}>
        <TextField label="العنوان" error={fieldError('title')} {...register('title')} />
        <TextField
          label="العنوان الفرعي (اختياري)"
          error={fieldError('subtitle')}
          {...register('subtitle')}
        />
        <TextField label="المؤلف" error={fieldError('author')} {...register('author')} />
        <TextField label="الناشر" error={fieldError('publisher')} {...register('publisher')} />
      </div>

      {creating ? (
        <div className={styles.grid}>
          <TextField
            label="الرابط (اختياري)"
            hint="يُصنع من العنوان إن تركته فارغاً، ولا يتغير بعد الإنشاء."
            dir="auto"
            error={fieldError('slug')}
            {...register('slug')}
          />
          <TextField
            label="ISBN (اختياري)"
            hint="لا يتغير بعد الإنشاء."
            dir="ltr"
            inputMode="numeric"
            error={fieldError('isbn')}
            {...register('isbn')}
          />
        </div>
      ) : (
        <dl className={styles.fixed}>
          <div>
            <dt>الرابط</dt>
            <dd dir="auto">/books/{defaultValues.slug}</dd>
          </div>
          <div>
            <dt>ISBN</dt>
            <dd dir="ltr">{defaultValues.isbn || '—'}</dd>
          </div>
        </dl>
      )}

      <TextAreaField
        label="الوصف"
        rows={6}
        maxLength={4000}
        error={fieldError('description')}
        {...register('description')}
      />

      <div className={styles.grid3}>
        <SelectField label="التجليد" error={fieldError('format')} {...register('format')}>
          {FORMATS.map((format) => (
            <option key={format} value={format}>
              {formatLabel(format)}
            </option>
          ))}
        </SelectField>
        <SelectField label="اللغة" error={fieldError('language')} {...register('language')}>
          {LANGUAGES.map((language) => (
            <option key={language.code} value={language.code}>
              {language.label}
            </option>
          ))}
          {!LANGUAGES.some((language) => language.code === defaultValues.language) && (
            <option value={defaultValues.language}>{defaultValues.language}</option>
          )}
        </SelectField>
        <TextField
          label="تاريخ النشر (اختياري)"
          type="date"
          dir="ltr"
          error={fieldError('publicationDate')}
          {...register('publicationDate')}
        />
      </div>

      <div className={styles.grid3}>
        <TextField
          label="السعر (₺)"
          dir="ltr"
          inputMode="decimal"
          error={fieldError('price')}
          {...register('price')}
        />
        <TextField
          label="عدد الصفحات"
          dir="ltr"
          inputMode="numeric"
          error={fieldError('pageCount')}
          {...register('pageCount')}
        />
        {creating && (
          <TextField
            label="المخزون الأولي"
            dir="ltr"
            inputMode="numeric"
            error={fieldError('initialStock')}
            {...register('initialStock')}
          />
        )}
      </div>

      <fieldset className={styles.fieldset}>
        <legend className={styles.legend}>الوزن والأبعاد (لحساب الشحن)</legend>
        <div className={styles.grid4}>
          <TextField
            label="الوزن (غرام)"
            dir="ltr"
            inputMode="numeric"
            error={fieldError('weightGrams')}
            {...register('weightGrams')}
          />
          <TextField
            label="الارتفاع (مم)"
            dir="ltr"
            inputMode="numeric"
            error={fieldError('heightMm')}
            {...register('heightMm')}
          />
          <TextField
            label="العرض (مم)"
            dir="ltr"
            inputMode="numeric"
            error={fieldError('widthMm')}
            {...register('widthMm')}
          />
          <TextField
            label="السماكة (مم)"
            dir="ltr"
            inputMode="numeric"
            error={fieldError('depthMm')}
            {...register('depthMm')}
          />
        </div>
      </fieldset>

      <div className={styles.actions}>
        <Button type="submit" variant="ink" disabled={pending || (!creating && !isDirty)}>
          {pending ? 'جارٍ الحفظ…' : creating ? 'إنشاء الكتاب' : 'حفظ التفاصيل'}
        </Button>
        {creating && (
          <p className={styles.note}>
            يظهر الكتاب في المتجر فور إنشائه. أضف الصور والقسم والمحققين بعدها مباشرة، أو أخفِه حتى
            تكتمل صفحته.
          </p>
        )}
      </div>
    </form>
  );
}