import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';

import styles from './NotFoundPage.module.css';

interface NotFoundPageProps {
  /** Where the recovery link goes. The admin area passes its own dashboard. */
  backTo?: string;
  backLabel?: string;
}

export default function NotFoundPage({
  backTo = paths.home,
  backLabel = 'العودة إلى الرئيسية',
}: NotFoundPageProps) {
  return (
    <section className={styles.root} aria-labelledby="not-found-title">
      <DocumentTitle title="الصفحة غير موجودة" />
      <p className={styles.code} aria-hidden="true">
        {(404).toLocaleString('ar-EG')}
      </p>
      <h1 id="not-found-title" className={styles.title}>
        الصفحة غير موجودة
      </h1>
      <p className={styles.text}>ربما نُقلت هذه الصفحة، أو أن الرابط غير صحيح.</p>
      <Link className={styles.link} to={backTo}>
        {backLabel}
      </Link>
    </section>
  );
}
