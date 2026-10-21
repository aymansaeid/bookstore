import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useParams } from 'react-router';

import { paths } from '@/app/paths';
import { adminBooksApi } from '@/features/admin/books/api';
import { BookDetailsForm } from '@/features/admin/books/components/BookDetailsForm';
import { BookImages } from '@/features/admin/books/components/BookImages';
import { BookMerchandisingForm } from '@/features/admin/books/components/BookMerchandisingForm';
import { BookStockCard } from '@/features/admin/books/components/BookStockCard';
import { BookTaxonomyForm } from '@/features/admin/books/components/BookTaxonomyForm';
import { adminBookKeys, useAdminBook, useBookMutation } from '@/features/admin/books/queries';
import {
  type BookDetailsValues,
  detailsInput,
  emptyBookValues,
  newBookInput,
  valuesFromBook,
} from '@/features/admin/books/schema';
import styles from '@/features/admin/components/admin.module.css';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import NotFoundPage from '@/pages/not-found/NotFoundPage';
import { ApiError, isApiError } from '@/shared/api/ApiError';
import { errorMessage } from '@/shared/api/errorMessages';
import { Button } from '@/shared/ui/Button/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';
import { toast } from '@/shared/ui/toast/toastStore';

import page from './AdminOrderPage.module.css';

const back = { to: paths.admin.books, label: 'الكتب والطبعات' };

function NewBook() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const create = useMutation({
    mutationFn: (values: BookDetailsValues) => adminBooksApi.create(newBookInput(values)),
    onSuccess: (book) => {
      queryClient.setQueryData(adminBookKeys.detail(book.id), book);
      void queryClient.invalidateQueries({ queryKey: adminBookKeys.list });
      toast.success('أُنشئ الكتاب. أكمل الصور والقسم والمحققين.');
      void navigate(paths.admin.book(book.id), { replace: true });
    },
    onError: (error) => {
      if (!(error instanceof ApiError && error.code === 'Validation')) {
        toast.error(errorMessage(error));
      }
    },
  });

  return (
    <>
      <AdminPageHeader title="كتاب جديد" back={back} />
      <section className={styles.card} aria-label="تفاصيل الكتاب">
        <BookDetailsForm
          mode="create"
          defaultValues={emptyBookValues}
          pending={create.isPending}
          error={create.error}
          onSave={(values) => {
            create.mutate(values);
          }}
        />
      </section>
    </>
  );
}

function EditBook({ id }: { id: number }) {
  const query = useAdminBook(id);
  const book = query.data;
  const update = useBookMutation(
    id,
    (values: BookDetailsValues) => adminBooksApi.update(id, detailsInput(values)),
    'حُفظت التفاصيل.',
  );

  if (query.isError && isApiError(query.error) && query.error.status === 404) {
    return <NotFoundPage backTo={paths.admin.books} backLabel="العودة إلى الكتب" />;
  }
  if (!book) {
    return (
      <>
        <AdminPageHeader title="الكتاب" back={back} />
        {query.isError ? (
          <div className={styles.empty} role="alert">
            <p>{errorMessage(query.error)}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void query.refetch();
              }}
            >
              أعد المحاولة
            </Button>
          </div>
        ) : (
          <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ تحميل الكتاب" />
        )}
      </>
    );
  }

  const details = valuesFromBook(book);

  return (
    <>
      <AdminPageHeader
        title={book.title}
        back={back}
        meta={
          <>
            <StatusBadge
              label={book.isActive ? 'ظاهر في المتجر' : 'مخفي'}
              tone={book.isActive ? 'green' : 'gray'}
            />
            {book.isActive && (
              <Link to={paths.book(book.slug)} target="_blank" rel="noreferrer">
                صفحته في المتجر ↗
              </Link>
            )}
          </>
        }
      />

      <div className={page.layout}>
        <div className={page.main}>
          <section className={styles.card} aria-labelledby="details-title">
            <h2 id="details-title" className={styles.cardTitle}>
              التفاصيل
            </h2>
            <BookDetailsForm
              // Reset to the saved values after every save.
              key={JSON.stringify(details)}
              mode="edit"
              defaultValues={details}
              pending={update.isPending}
              error={update.error}
              onSave={(values) => {
                update.mutate(values);
              }}
            />
          </section>

          <section className={styles.card} aria-labelledby="images-title">
            <h2 id="images-title" className={styles.cardTitle}>
              الصور
            </h2>
            <BookImages book={book} />
          </section>

          <section className={styles.card} aria-labelledby="merch-title">
            <h2 id="merch-title" className={styles.cardTitle}>
              العرض في المتجر
            </h2>
            <BookMerchandisingForm
              key={`${String(book.compareAtPrice)}|${book.badges.join()}|${book.highlights.join('|')}|${String(book.level)}|${String(book.volumes)}|${String(book.editionLabel)}|${String(book.installmentsAllowed)}`}
              book={book}
            />
          </section>
        </div>

        <div className={page.side}>
          <section className={styles.card} aria-labelledby="stock-title">
            <h2 id="stock-title" className={styles.cardTitle}>
              المخزون والظهور
            </h2>
            <BookStockCard
              key={`${String(book.stockQuantity)}|${String(book.lowStockThreshold)}`}
              book={book}
            />
          </section>

          <section className={styles.card} aria-labelledby="taxonomy-title">
            <h2 id="taxonomy-title" className={styles.cardTitle}>
              القسم والمحققون
            </h2>
            <BookTaxonomyForm
              key={`${String(book.categoryId)}|${book.muhaqqiqIds.join()}`}
              book={book}
            />
          </section>
        </div>
      </div>
    </>
  );
}

/** /admin/books/new and /admin/books/:id share this page (routes.tsx). */
export default function AdminBookEditorPage() {
  const { id } = useParams();
  if (id === undefined) return <NewBook />;
  const bookId = /^\d+$/.test(id) ? Number(id) : 0;
  if (bookId === 0) return <NotFoundPage backTo={paths.admin.books} backLabel="العودة إلى الكتب" />;
  return <EditBook key={bookId} id={bookId} />;
}