import { useSearchParams } from 'react-router';

import { paths } from '@/app/paths';
import { CatalogBrowser } from '@/features/catalog/components/CatalogBrowser';
import styles from '@/features/catalog/components/CatalogHeader.module.css';
import { cx } from '@/shared/lib/cx';
import { Breadcrumbs } from '@/shared/ui/Breadcrumbs/Breadcrumbs';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';

/** /search: «المكتبة», «الموسوعات» (?minVolumes=10) and text search (?q=). */
export default function SearchPage() {
  const [params] = useSearchParams();
  const query = params.get('q')?.trim() ?? '';
  const encyclopedias = Number(params.get('minVolumes') ?? 0) >= 10;

  const title = query
    ? `نتائج البحث عن «${query}»`
    : encyclopedias
      ? 'الموسوعات والمجموعات الكاملة'
      : 'المكتبة';
  const lead = query
    ? 'نبحث في العناوين والمؤلفين والمحققين والأقسام، مع تجاهل التشكيل والهمزات.'
    : encyclopedias
      ? 'أمهات الكتب في مجلداتها الكاملة، بتحقيقات موثوقة.'
      : 'تصفّح إصدارات الرسالة ناشرون وأمهات الكتب المحققة.';

  return (
    <div className="wrap">
      <DocumentTitle title={query ? `بحث: ${query}` : title} />
      <Breadcrumbs items={[{ label: 'الرئيسية', to: paths.home }, { label: title }]} />
      <header className={cx(styles.header)}>
        <p className={styles.kicker}>{query ? 'البحث' : 'كتاب أفندي'}</p>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.lead}>{lead}</p>
      </header>
      <CatalogBrowser />
    </div>
  );
}
