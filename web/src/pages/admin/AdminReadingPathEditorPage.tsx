import { useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';

import { paths } from '@/app/paths';
import { useAdminBooks } from '@/features/admin/books/queries';
import styles from '@/features/admin/components/admin.module.css';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { RecordStatus } from '@/features/admin/components/RecordStatus';
import { adminPathsApi, type AdminReadingPath } from '@/features/admin/paths/api';
import { PathForm } from '@/features/admin/paths/components/PathForm';
import { adminPathKeys, useAdminPaths, usePathMutation } from '@/features/admin/paths/queries';
import { emptyPath, pathInput, type PathValues, pathValues } from '@/features/admin/paths/schema';
import NotFoundPage from '@/pages/not-found/NotFoundPage';
import { errorMessage } from '@/shared/api/errorMessages';
import { arabicPlural } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';

const back = { to: paths.admin.readingPaths, label: 'مسارات القراءة' };

const followersPhrase = (count: number) =>
  arabicPlural(count, { one: 'قارئ واحد', two: 'قارئان', few: 'قرّاء', many: 'قارئاً' });

function PathStatus({ path }: { path: AdminReadingPath }) {
  const navigate = useNavigate();
  const toggle = usePathMutation(
    (isActive: boolean) => adminPathsApi.setActive(path.id, isActive),
    path.isActive ? 'أُخفي المسار.' : 'صار المسار ظاهراً.',
  );
  const remove = usePathMutation(() => adminPathsApi.remove(path.id), 'حُذف المسار.');
  return (
    <RecordStatus
      isActive={path.isActive}
      hideEffect="الإخفاء يزيله من صفحة المسارات، ويبقى عند من بدأه ليكمله."
      onToggle={(next) => {
        toggle.mutate(next);
      }}
      toggling={toggle.isPending}
      deleteBlocked={
        path.enrollmentCount > 0
          ? `يتبعه ${followersPhrase(path.enrollmentCount)}. أخفِه بدلاً من حذفه.`
          : null
      }
      onDelete={() => {
        remove.mutate(undefined, {
          onSuccess: () => {
            void navigate(paths.admin.readingPaths, { replace: true });
          },
        });
      }}
      deleting={remove.isPending}
    />
  );
}

/** /admin/reading-paths/new and /admin/reading-paths/:id (API §7d). */
export default function AdminReadingPathEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const list = useAdminPaths();
  const books = useAdminBooks();
  const pathId = id === undefined ? null : /^\d+$/.test(id) ? Number(id) : 0;
  const path = pathId === null ? null : list.data?.find((p) => p.id === pathId);

  const save = usePathMutation(
    (values: PathValues) =>
      path
        ? adminPathsApi.update(path.id, pathInput(values))
        : adminPathsApi.create(pathInput(values)),
    path ? 'حُفظ المسار.' : 'أُنشئ المسار.',
  );

  if (pathId === 0 || (list.data && path === undefined)) {
    return <NotFoundPage backTo={paths.admin.readingPaths} backLabel="العودة إلى المسارات" />;
  }

  const failed = list.isError ? list.error : books.isError ? books.error : null;
  if (!books.data || (pathId !== null && !path)) {
    return (
      <>
        <AdminPageHeader title={pathId === null ? 'مسار جديد' : 'المسار'} back={back} />
        {failed ? (
          <div className={styles.empty} role="alert">
            <p>{errorMessage(failed)}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void list.refetch();
                void books.refetch();
              }}
            >
              أعد المحاولة
            </Button>
          </div>
        ) : (
          <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ التحميل" />
        )}
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={path ? path.title : 'مسار جديد'}
        back={back}
        meta={
          path && (
            <>
              <StatusBadge
                label={path.isActive ? 'ظاهر في المتجر' : 'مخفي'}
                tone={path.isActive ? 'green' : 'gray'}
              />
              {path.enrollmentCount > 0 && (
                <span>بدأه {followersPhrase(path.enrollmentCount)}</span>
              )}
              {path.isActive && (
                <Link to={paths.readingPath(path.slug)} target="_blank" rel="noreferrer">
                  صفحته في المتجر ↗
                </Link>
              )}
            </>
          )
        }
      />
      <PathForm
        // Fresh form after each save.
        key={path ? JSON.stringify(path) : 'new'}
        creating={!path}
        defaultValues={path ? pathValues(path) : emptyPath}
        books={books.data}
        pending={save.isPending}
        error={save.error}
        onSave={(values) => {
          save.mutate(values, {
            onSuccess: (saved) => {
              // Put it in the list now, so the page doesn't wait for the refetch.
              queryClient.setQueryData<AdminReadingPath[]>(adminPathKeys.list, (old) => [
                ...(old ?? []).filter((p) => p.id !== saved.id),
                saved,
              ]);
              if (!path) void navigate(paths.admin.readingPath(saved.id), { replace: true });
            },
          });
        }}
        status={path && <PathStatus path={path} />}
      />
    </>
  );
}