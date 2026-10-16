import { Link, useParams } from 'react-router';

import { paths } from '@/app/paths';
import { CatalogBrowser } from '@/features/catalog/components/CatalogBrowser';
import styles from '@/features/catalog/components/CatalogHeader.module.css';
import { useCategory } from '@/features/catalog/queries';
import NotFoundPage from '@/pages/not-found/NotFoundPage';
import { isApiError } from '@/shared/api/ApiError';
import { errorMessage } from '@/shared/api/errorMessages';
import { editionsPhrase } from '@/shared/lib/format';
import { Breadcrumbs, type Crumb } from '@/shared/ui/Breadcrumbs/Breadcrumbs';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';

export default function CategoryPage() {
  const { slug = '' } = useParams();
  const query = useCategory(slug);

  if (query.isError) {
    if (isApiError(query.error) && query.error.status === 404) return <NotFoundPage />;
    return (
      <p className="wrap" role="alert" style={{ paddingBlock: 48 }}>
        {errorMessage(query.error)}
      </p>
    );
  }

  const category = query.data;
  const crumbs: Crumb[] = [
    { label: 'الرئيسية', to: paths.home },
    { label: 'المكتبة', to: paths.search },
  ];
  if (category?.parent) {
    crumbs.push({ label: category.parent.name, to: paths.category(category.parent.slug) });
  }
  crumbs.push({ label: category?.name ?? '…' });

  return (
    <div className="wrap">
      <DocumentTitle title={category?.name ?? 'القسم'} />
      <Breadcrumbs items={crumbs} />

      <header className={styles.header}>
        {category?.letter && (
          <span className={styles.letter} aria-hidden="true">
            {category.letter}
          </span>
        )}
        <p className={styles.kicker}>تصفّح بحسب العلم</p>
        <h1 className={styles.title}>{category?.name ?? 'جارٍ التحميل…'}</h1>
        {category?.description && <p className={styles.lead}>{category.description}</p>}
        {category && <p className={styles.meta}>{editionsPhrase(category.bookCount)}</p>}
        {category && category.children.length > 0 && (
          <ul className={styles.chips} aria-label="الأقسام الفرعية">
            {category.children.map((child) => (
              <li key={child.id}>
                <Link to={paths.category(child.slug)} className={styles.chip}>
                  {child.name}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </header>

      {/* key: a new category starts with fresh UI state */}
      <CatalogBrowser key={slug} fixed={{ category: slug }} hide={{ category: true }} />
    </div>
  );
}
