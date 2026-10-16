import { useParams } from 'react-router';

import { paths } from '@/app/paths';
import { CatalogBrowser } from '@/features/catalog/components/CatalogBrowser';
import styles from '@/features/catalog/components/CatalogHeader.module.css';
import { useMuhaqqiq } from '@/features/catalog/queries';
import { FollowButton } from '@/features/muhaqqiq/FollowButton';
import NotFoundPage from '@/pages/not-found/NotFoundPage';
import { isApiError } from '@/shared/api/ApiError';
import { errorMessage } from '@/shared/api/errorMessages';
import { worksPhrase } from '@/shared/lib/format';
import { Breadcrumbs } from '@/shared/ui/Breadcrumbs/Breadcrumbs';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';

export default function MuhaqqiqPage() {
  const { slug = '' } = useParams();
  const query = useMuhaqqiq(slug);

  if (query.isError) {
    if (isApiError(query.error) && query.error.status === 404) return <NotFoundPage />;
    return (
      <p className="wrap" role="alert" style={{ paddingBlock: 48 }}>
        {errorMessage(query.error)}
      </p>
    );
  }

  const muhaqqiq = query.data;
  const initial = muhaqqiq ? (Array.from(muhaqqiq.name.trim())[0] ?? '') : '';

  return (
    <div className="wrap">
      <DocumentTitle title={muhaqqiq?.name ?? 'المحقّق'} />
      <Breadcrumbs
        items={[
          { label: 'الرئيسية', to: paths.home },
          { label: 'المكتبة', to: paths.search },
          { label: muhaqqiq?.name ?? '…' },
        ]}
      />

      <header className={styles.header}>
        <div className={styles.person}>
          <span className={styles.avatar} aria-hidden="true">
            {initial}
          </span>
          <div>
            <p className={styles.kicker}>أعلام المحققين</p>
            <h1 className={styles.title}>{muhaqqiq?.name ?? 'جارٍ التحميل…'}</h1>
          </div>
        </div>
        {muhaqqiq?.bio && <p className={styles.lead}>{muhaqqiq.bio}</p>}
        {muhaqqiq && (
          <div className={styles.meta}>
            <span>{worksPhrase(muhaqqiq.worksCount)}</span>
            <FollowButton muhaqqiqId={muhaqqiq.id} />
          </div>
        )}
        {muhaqqiq && muhaqqiq.specialties.length > 0 && (
          <ul className={styles.chips} aria-label="التخصصات">
            {muhaqqiq.specialties.map((item) => (
              <li key={item} className={styles.chip}>
                {item}
              </li>
            ))}
          </ul>
        )}
      </header>

      <CatalogBrowser key={slug} fixed={{ muhaqqiq: [slug] }} hide={{ muhaqqiq: true }} />
    </div>
  );
}
