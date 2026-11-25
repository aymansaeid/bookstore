import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router';

import { paths } from '@/app/paths';
import { type AdminBook, adminBooksApi } from '@/features/admin/books/api';
import { BookChecklist } from '@/features/admin/books/components/BookChecklist';
import { BookDetailsForm } from '@/features/admin/books/components/BookDetailsForm';
import { BookImages } from '@/features/admin/books/components/BookImages';
import { BookLinksForm } from '@/features/admin/books/components/BookLinksForm';
import { BookMerchandisingForm } from '@/features/admin/books/components/BookMerchandisingForm';
import { BookStockCard } from '@/features/admin/books/components/BookStockCard';
import { BookTaxonomyForm } from '@/features/admin/books/components/BookTaxonomyForm';
import { BookTranslations } from '@/features/admin/books/components/BookTranslations';
import { adminBookKeys, useAdminBook, useBookMutation } from '@/features/admin/books/queries';
import {
  type BookDetailsValues,
  detailsInput,
  emptyBookValues,
  newBookInput,
  valuesFromBook,
} from '@/features/admin/books/schema';
import {
  isTranslationLanguage,
  type TranslationLanguage,
} from '@/features/admin/books/translations';
import styles from '@/features/admin/components/admin.module.css';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { StockLedger } from '@/features/admin/inventory/components/StockLedger';
import { WaitingListNote } from '@/features/admin/inventory/components/WaitingListNote';
import { useUnsavedChanges } from '@/features/admin/lib/useUnsavedChanges';
import NotFoundPage from '@/pages/not-found/NotFoundPage';
import { ApiError, isApiError } from '@/shared/api/ApiError';
import { errorMessage } from '@/shared/api/errorMessages';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';
import { Checkbox } from '@/shared/ui/form/Field';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';
import { toast } from '@/shared/ui/toast/toastStore';

import local from './AdminBookEditorPage.module.css';
import page from './AdminOrderPage.module.css';

const back = { to: paths.admin.books, label: 'الكتب والطبعات' };

/** Jump bar, in page order. Ids are the sections' ids below. */
const SECTIONS = [
  { id: 'checklist', label: 'ما ينقص' },
  { id: 'details', label: 'التفاصيل' },
  { id: 'images', label: 'الصور' },
  { id: 'translations', label: 'الترجمات' },
  { id: 'merch', label: 'العرض' },
  { id: 'stock', label: 'المخزون' },
  { id: 'taxonomy', label: 'القسم والمحققون' },
  { id: 'links', label: 'الطبعات' },
  { id: 'ledger', label: 'دفتر المخزون' },
] as const;

/** A new edition starts from an existing book: everything but slug, ISBN and stock. */
function startingValues(from: AdminBook | undefined): BookDetailsValues {
  if (!from) return emptyBookValues;
  return { ...valuesFromBook(from), slug: '', isbn: '', initialStock: '0' };
}

function NewBook() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [params] = useSearchParams();
  const fromRaw = params.get('from');
  const fromId = fromRaw && /^\d+$/.test(fromRaw) ? Number(fromRaw) : 0;
  const from = useAdminBook(fromId);
  // New books wait hidden until their page is complete, unless the admin says otherwise.
  const [hidden, setHidden] = useState(true);

  const create = useMutation({
    mutationFn: async (values: BookDetailsValues) => {
      const book = await adminBooksApi.create(newBookInput(values));
      // The book exists now: a failure below must not fail the create (a retry would duplicate it).
      let finished = true;
      try {
        // Same section and editors as the book it was copied from.
        if (from.data && (from.data.categoryId !== null || from.data.muhaqqiqIds.length > 0)) {
          await adminBooksApi.setTaxonomy(book.id, from.data.categoryId, from.data.muhaqqiqIds);
        }
        if (hidden) await adminBooksApi.setActive(book.id, false);
      } catch {
        finished = false;
      }
      return { book, finished };
    },
    onSuccess: ({ book, finished }) => {
      void queryClient.invalidateQueries({ queryKey: adminBookKeys.detail(book.id) });
      void queryClient.invalidateQueries({ queryKey: adminBookKeys.list });
      if (finished) toast.success('أُنشئ الكتاب. أكمل ما ينقصه من القائمة في الأعلى.');
      else toast.error('أُنشئ الكتاب، لكن تعذّر إخفاؤه أو نسخ قسمه. راجع المخزون والظهور.');
      void navigate(paths.admin.book(book.id), { replace: true });
    },
    onError: (error) => {
      if (!(error instanceof ApiError && error.code === 'Validation')) {
        toast.error(errorMessage(error));
      }
    },
  });

  if (fromId > 0 && !from.data && !from.isError) {
    return (
      <>
        <AdminPageHeader title="كتاب جديد" back={back} />
        <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ نسخ بيانات الكتاب" />
      </>
    );
  }

  return (
    <>
      <AdminPageHeader
        title={from.data ? 'طبعة جديدة' : 'كتاب جديد'}
        back={back}
        meta={
          from.data ? (
            <span>منسوخة من «{from.data.title}». غيّر ما يختلف (السعر، الصفحات، الوزن…).</span>
          ) : undefined
        }
      />
      <section className={styles.card} aria-label="تفاصيل الكتاب">
        <BookDetailsForm
          key={from.data?.id ?? 0}
          mode="create"
          defaultValues={startingValues(from.data)}
          pending={create.isPending}
          error={create.error}
          onSave={(values) => {
            create.mutate(values);
          }}
          extra={
            <Checkbox
              checked={hidden}
              onChange={() => {
                setHidden(!hidden);
              }}
            >
              أنشئه مخفياً، وأُظهره بنفسي حين تكتمل صفحته
            </Checkbox>
          }
        />
      </section>
    </>
  );
}

function EditBook({ id }: { id: number }) {
  const query = useAdminBook(id);
  const book = query.data;
  const [params, setParams] = useSearchParams();
  const rawLanguage = params.get('lang');
  const [detailsDirty, setDetailsDirty] = useState(false);
  const [translationsDirty, setTranslationsDirty] = useState(false);
  useUnsavedChanges(detailsDirty || translationsDirty);

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

  // The tab to open: ?lang=, else the first language still missing, else English.
  const language: TranslationLanguage = isTranslationLanguage(rawLanguage)
    ? rawLanguage
    : ((['en', 'tr'] as const).find((code) => !book.translations.includes(code)) ?? 'en');
  const openTranslation = (code: TranslationLanguage) => {
    const next = new URLSearchParams(params);
    next.set('lang', code);
    setParams(next, { replace: true, preventScrollReset: true });
    document.getElementById('translations')?.scrollIntoView({ block: 'start' });
  };

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
        actions={
          <ButtonLink
            to={`${paths.admin.newBook}?from=${String(book.id)}`}
            variant="ghost"
            size="sm"
          >
            + طبعة جديدة منه
          </ButtonLink>
        }
      />

      <nav className={local.jump} aria-label="أقسام الكتاب">
        {SECTIONS.map((section) => (
          <a key={section.id} href={`#${section.id}`}>
            {section.label}
          </a>
        ))}
      </nav>

      <div className={page.layout}>
        <div className={page.main}>
          <section
            id="checklist"
            className={`${styles.card} ${local.anchor}`}
            aria-labelledby="checklist-title"
          >
            <h2 id="checklist-title" className={styles.cardTitle}>
              ما ينقص الكتاب
            </h2>
            <BookChecklist book={book} onOpenTranslation={openTranslation} />
          </section>

          <section
            id="details"
            className={`${styles.card} ${local.anchor}`}
            aria-labelledby="details-title"
          >
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
              onDirtyChange={setDetailsDirty}
              onSave={(values) => {
                update.mutate(values);
              }}
            />
          </section>

          <section
            id="images"
            className={`${styles.card} ${local.anchor}`}
            aria-labelledby="images-title"
          >
            <h2 id="images-title" className={styles.cardTitle}>
              الصور
            </h2>
            <BookImages book={book} />
          </section>

          <section
            id="translations"
            className={`${styles.card} ${local.anchor}`}
            aria-labelledby="translations-title"
          >
            <h2 id="translations-title" className={styles.cardTitle}>
              الترجمات
            </h2>
            <p className={local.hint}>
              اكتب الترجمة بجانب النص العربي. أي حقل تتركه فارغاً يظهر بالعربية في صفحة تلك اللغة.
            </p>
            <BookTranslations
              book={book}
              language={language}
              onLanguageChange={openTranslation}
              onDirtyChange={setTranslationsDirty}
            />
          </section>

          <section
            id="merch"
            className={`${styles.card} ${local.anchor}`}
            aria-labelledby="merch-title"
          >
            <h2 id="merch-title" className={styles.cardTitle}>
              العرض في المتجر
            </h2>
            <BookMerchandisingForm
              key={`${String(book.compareAtPrice)}|${book.badges.join()}|${book.highlights.join('|')}|${String(book.level)}|${String(book.volumes)}|${String(book.editionLabel)}|${String(book.installmentsAllowed)}`}
              book={book}
            />
          </section>

          <section
            id="ledger"
            className={`${styles.card} ${local.anchor}`}
            aria-labelledby="ledger-title"
          >
            <h2 id="ledger-title" className={styles.cardTitle}>
              دفتر حركة المخزون
            </h2>
            <StockLedger bookId={book.id} />
          </section>
        </div>

        <div className={page.side}>
          <section
            id="stock"
            className={`${styles.card} ${local.anchor}`}
            aria-labelledby="stock-title"
          >
            <h2 id="stock-title" className={styles.cardTitle}>
              المخزون والظهور
            </h2>
            <BookStockCard
              key={`${String(book.stockQuantity)}|${String(book.lowStockThreshold)}`}
              book={book}
            />
            <WaitingListNote bookId={book.id} />
          </section>

          <section
            id="taxonomy"
            className={`${styles.card} ${local.anchor}`}
            aria-labelledby="taxonomy-title"
          >
            <h2 id="taxonomy-title" className={styles.cardTitle}>
              القسم والمحققون
            </h2>
            <BookTaxonomyForm
              key={`${String(book.categoryId)}|${book.muhaqqiqIds.join()}`}
              book={book}
            />
          </section>

          <section
            id="links"
            className={`${styles.card} ${local.anchor}`}
            aria-labelledby="links-title"
          >
            <h2 id="links-title" className={styles.cardTitle}>
              الطبعات والكتب المرتبطة
            </h2>
            <BookLinksForm
              key={`${String(book.editionGroupId)}|${book.relatedBookIds.join()}`}
              book={book}
            />
          </section>
        </div>
      </div>
    </>
  );
}

/** /admin/books/new (?from=id for a new edition) and /admin/books/:id share this page. */
export default function AdminBookEditorPage() {
  const { id } = useParams();
  if (id === undefined) return <NewBook />;
  const bookId = /^\d+$/.test(id) ? Number(id) : 0;
  if (bookId === 0) return <NotFoundPage backTo={paths.admin.books} backLabel="العودة إلى الكتب" />;
  return <EditBook key={bookId} id={bookId} />;
}