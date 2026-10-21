import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';

import form from '@/features/admin/books/components/BookEditor.module.css';
import { RecordStatus } from '@/features/admin/components/RecordStatus';
import { serverFieldErrors } from '@/shared/api/formErrors';
import { worksPhrase } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { Checkbox, TextAreaField, TextField } from '@/shared/ui/form/Field';

import { type AdminMuhaqqiq, adminCatalogApi, CATALOG_LIMITS } from '../api';
import { useCatalogMutation } from '../queries';
import {
  emptyMuhaqqiq,
  muhaqqiqInput,
  muhaqqiqSchema,
  type MuhaqqiqValues,
  muhaqqiqValues,
  newMuhaqqiqInput,
} from '../schema';

interface MuhaqqiqFormProps {
  /** null = a new muhaqqiq. */
  muhaqqiq: AdminMuhaqqiq | null;
  onSaved: (id: number) => void;
  onDeleted: () => void;
}

/** One muhaqqiq or author (API §4b). Books credit them from the book editor. */
export function MuhaqqiqForm({ muhaqqiq, onSaved, onDeleted }: MuhaqqiqFormProps) {
  const creating = muhaqqiq === null;
  const id = muhaqqiq?.id ?? 0;

  const {
    register,
    handleSubmit,
    formState: { errors, isDirty },
  } = useForm<MuhaqqiqValues>({
    resolver: zodResolver(muhaqqiqSchema),
    defaultValues: muhaqqiq ? muhaqqiqValues(muhaqqiq) : emptyMuhaqqiq,
    mode: 'onTouched',
  });

  const save = useCatalogMutation(
    'muhaqqiqs',
    (values: MuhaqqiqValues) =>
      creating
        ? adminCatalogApi.createMuhaqqiq(newMuhaqqiqInput(values))
        : adminCatalogApi.updateMuhaqqiq(id, muhaqqiqInput(values)),
    creating ? 'أُضيف المحقق.' : 'حُفظت بيانات المحقق.',
  );
  const toggle = useCatalogMutation(
    'muhaqqiqs',
    (isActive: boolean) => adminCatalogApi.setMuhaqqiqActive(id, isActive),
    muhaqqiq?.isActive ? 'أُخفي المحقق.' : 'صار المحقق ظاهراً.',
  );
  const remove = useCatalogMutation(
    'muhaqqiqs',
    () => adminCatalogApi.deleteMuhaqqiq(id),
    'حُذف المحقق.',
  );

  const server = serverFieldErrors(save.error);
  const fieldError = (name: keyof MuhaqqiqValues) => errors[name]?.message ?? server[name];

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
          label="الاسم"
          maxLength={CATALOG_LIMITS.muhaqqiqName}
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
              <dd dir="auto">/muhaqqiqs/{muhaqqiq.slug}</dd>
            </div>
          </dl>
        )}
        <TextField
          label="التخصصات (اختياري)"
          hint="افصل بينها بفاصلة، مثل «الحديث، الفقه الشافعي». حتى ١٠."
          error={fieldError('specialties')}
          {...register('specialties')}
        />
        <TextField
          label="الترتيب"
          hint="الأصغر يظهر أولاً."
          dir="ltr"
          inputMode="numeric"
          error={fieldError('displayOrder')}
          {...register('displayOrder')}
        />
        <div className={form.checks}>
          <Checkbox {...register('isFeatured')}>
            مميّز: يظهر في قسم المحققين بالصفحة الرئيسية
          </Checkbox>
        </div>
        <TextAreaField
          label="نبذة (اختياري)"
          rows={5}
          maxLength={CATALOG_LIMITS.bio}
          error={fieldError('bio')}
          {...register('bio')}
        />
        <div className={form.actions}>
          <Button type="submit" variant="ink" disabled={save.isPending || (!creating && !isDirty)}>
            {save.isPending ? 'جارٍ الحفظ…' : creating ? 'إضافة المحقق' : 'حفظ البيانات'}
          </Button>
        </div>
      </form>

      {muhaqqiq && (
        <RecordStatus
          isActive={muhaqqiq.isActive}
          hideEffect="الإخفاء يزيل صفحته وبطاقته من المتجر، ولا يُخفي الكتب التي حقّقها."
          onToggle={(next) => {
            toggle.mutate(next);
          }}
          toggling={toggle.isPending}
          deleteBlocked={
            muhaqqiq.worksCount > 0
              ? `له ${worksPhrase(muhaqqiq.worksCount)}. أزله من كتبه أولاً، أو أخفِه.`
              : null
          }
          onDelete={() => {
            remove.mutate(undefined, { onSuccess: onDeleted });
          }}
          deleting={remove.isPending}
        />
      )}
    </div>
  );
}