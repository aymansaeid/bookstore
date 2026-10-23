import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import form from '@/features/admin/books/components/BookEditor.module.css';
import { RecordStatus } from '@/features/admin/components/RecordStatus';
import { serverFieldErrors } from '@/shared/api/formErrors';
import { booksPhrase } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { SelectField, TextAreaField, TextField } from '@/shared/ui/form/Field';

import { type AdminCategory, adminCatalogApi, CATALOG_LIMITS } from '../api';
import { useCatalogMutation } from '../queries';
import {
  categoryInput,
  categorySchema,
  type CategoryValues,
  categoryValues,
  emptyCategory,
  newCategoryInput,
} from '../schema';

interface CategoryFormProps {
  /** null = a new category. */
  category: AdminCategory | null;
  all: AdminCategory[];
  onSaved: (id: number) => void;
  onDeleted: () => void;
}

/** One category (API §4b). Two levels only: a parent must be top-level. */
export function CategoryForm({ category, all, onSaved, onDeleted }: CategoryFormProps) {
  const creating = category === null;
  const id = category?.id ?? 0;
  const hasChildren = all.some((other) => other.parentId === id && id > 0);
  const parents = all.filter((other) => other.parentId === null && other.id !== id);

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<CategoryValues>({
    resolver: zodResolver(categorySchema),
    defaultValues: category ? categoryValues(category) : emptyCategory,
    mode: 'onTouched',
  });

  const save = useCatalogMutation(
    'categories',
    (values: CategoryValues) =>
      creating
        ? adminCatalogApi.createCategory(newCategoryInput(values))
        : adminCatalogApi.updateCategory(id, categoryInput(values)),
    creating ? 'أُضيف القسم.' : 'حُفظ القسم.',
  );
  const toggle = useCatalogMutation(
    'categories',
    (isActive: boolean) => adminCatalogApi.setCategoryActive(id, isActive),
    category?.isActive ? 'أُخفي القسم.' : 'صار القسم ظاهراً.',
  );
  const remove = useCatalogMutation(
    'categories',
    () => adminCatalogApi.deleteCategory(id),
    'حُذف القسم.',
  );

  const server = serverFieldErrors(save.error);
  const fieldError = (name: keyof CategoryValues) => errors[name]?.message ?? server[name];

  const deleteBlocked = hasChildren
    ? 'له أقسام فرعية. انقلها أو احذفها أولاً.'
    : category && category.bookCount > 0
      ? `فيه ${booksPhrase(category.bookCount)}. انقلها إلى قسم آخر أولاً، أو أخفِ القسم.`
      : null;

  return (
    <div className={form.stack}>
      <form
        noValidate
        className={form.form}
        onSubmit={(event) => {
          void handleSubmit((values) => {
            save.mutate(values, {
              onSuccess: (saved) => {
                onSaved(saved.id);
              },
            });
          })(event);
        }}
      >
        <TextField
          label="اسم القسم"
          maxLength={CATALOG_LIMITS.categoryName}
          error={fieldError('name')}
          {...register('name')}
        />
        {creating ? (
          <TextField
            label="الرابط (اختياري)"
            hint="يُصنع من الاسم إن تركته فارغاً، ولا يتغير بعد الإنشاء."
            dir="auto"
            error={fieldError('slug')}
            {...register('slug')}
          />
        ) : (
          <dl className={form.fixed}>
            <div>
              <dt>الرابط</dt>
              <dd dir="auto">/category/{category.slug}</dd>
            </div>
          </dl>
        )}
        <div className={form.grid}>
          <TextField
            label="الحرف (اختياري)"
            hint="يظهر على بطاقة القسم، مثل «ح»."
            maxLength={CATALOG_LIMITS.letter}
            error={fieldError('letter')}
            {...register('letter')}
          />
          <TextField
            label="الترتيب"
            hint="الأصغر يظهر أولاً."
            dir="ltr"
            inputMode="numeric"
            error={fieldError('displayOrder')}
            {...register('displayOrder')}
          />
        </div>
        <SelectField
          label="يندرج تحت"
          hint={
            hasChildren
              ? 'له أقسام فرعية، فيبقى قسماً رئيسياً.'
              : 'الأقسام مستويان فقط: رئيسي وفرعي.'
          }
          disabled={hasChildren}
          error={fieldError('parentId')}
          {...register('parentId')}
        >
          <option value="">قسم رئيسي</option>
          {parents.map((parent) => (
            <option key={parent.id} value={parent.id}>
              {parent.name}
              {parent.isActive ? '' : ' (مخفي)'}
            </option>
          ))}
        </SelectField>
        <TextAreaField
          label="الوصف (اختياري)"
          rows={3}
          maxLength={CATALOG_LIMITS.categoryDescription}
          error={fieldError('description')}
          {...register('description')}
        />
        <div className={form.actions}>
          <Button type="submit" variant="ink" disabled={save.isPending || (!creating && !isDirty)}>
            {save.isPending ? 'جارٍ الحفظ…' : creating ? 'إضافة القسم' : 'حفظ القسم'}
          </Button>
        </div>
      </form>

      {category && (
        <RecordStatus
          isActive={category.isActive}
          hideEffect="الإخفاء يزيله من قوائم الأقسام وصفحته في المتجر، ولا يُخفي كتبه."
          onToggle={(next) => {
            toggle.mutate(next);
          }}
          toggling={toggle.isPending}
          deleteBlocked={deleteBlocked}
          onDelete={() => {
            remove.mutate(undefined, { onSuccess: onDeleted });
          }}
          deleting={remove.isPending}
        />
      )}
    </div>
  );
}