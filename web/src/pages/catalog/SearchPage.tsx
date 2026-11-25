import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';

import { paths } from '@/app/paths';
import { CatalogBrowser } from '@/features/catalog/components/CatalogBrowser';
import styles from '@/features/catalog/components/CatalogHeader.module.css';
import { cx } from '@/shared/lib/cx';
import { Breadcrumbs } from '@/shared/ui/Breadcrumbs/Breadcrumbs';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';

/** /search: «المكتبة», «الموسوعات» (?minVolumes=10) and text search (?q=). */
export default function SearchPage() {
  const { t } = useTranslation('catalog', { keyPrefix: 'search' });
  const { t: tc } = useTranslation();
  const [params] = useSearchParams();
  const query = params.get('q')?.trim() ?? '';
  const encyclopedias = Number(params.get('minVolumes') ?? 0) >= 10;

  const title = query
    ? t('resultsFor', { q: query })
    : encyclopedias
      ? t('encyclopedias')
      : t('library');
  const lead = query ? t('searchLead') : encyclopedias ? t('encyclopediasLead') : t('libraryLead');

  return (
    <div className="wrap">
      <DocumentTitle title={query ? t('tabTitle', { q: query }) : title} />
      <Breadcrumbs items={[{ label: tc('ui.home'), to: paths.home }, { label: title }]} />
      <header className={cx(styles.header)}>
        <p className={styles.kicker}>{query ? t('kickerSearch') : t('kicker')}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.lead}>{lead}</p>
      </header>
      <CatalogBrowser />
    </div>
  );
}