import { paths } from '@/app/paths';
import { BookList } from '@/features/catalog/components/BookList';
import { useCatalogSearch } from '@/features/catalog/queries';
import type { CatalogSort } from '@/features/catalog/types';
import { cx } from '@/shared/lib/cx';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';
import { SectionHeader } from '@/shared/ui/SectionHeader/SectionHeader';

import styles from './HomePage.module.css';

/** Interim home: live shelves from the catalog. The full design (spec 5.1) replaces this. */
function Shelf({
  id,
  kicker,
  title,
  description,
  sort,
}: {
  id: string;
  kicker: string;
  title: string;
  description: string;
  sort: CatalogSort;
}) {
  const query = useCatalogSearch({ sort, pageSize: 12 });
  return (
    <section className={cx('wrap', styles.section)} aria-labelledby={id}>
      <SectionHeader
        id={id}
        kicker={kicker}
        title={title}
        description={description}
        more={{ to: `${paths.search}?sort=${sort}` }}
      />
      <BookList
        books={query.data?.results.items}
        isLoading={query.isLoading}
        isError={query.isError}
        onRetry={() => {
          void query.refetch();
        }}
      />
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <DocumentTitle />
      <h1 className="sr-only">كتاب أفندي: كنوز التراث المحقَّق</h1>
      <Shelf
        id="shelf-bestselling"
        kicker="رفوف القرّاء"
        title="الأكثر طلباً هذا الشهر"
        description="ما يختاره طلبة العلم من إصدارات الرسالة ناشرون."
        sort="Bestselling"
      />
      <Shelf
        id="shelf-newest"
        kicker="جديد المكتبة"
        title="وصل حديثاً"
        description="أحدث ما أضفناه إلى رفوفنا."
        sort="Newest"
      />
    </>
  );
}
