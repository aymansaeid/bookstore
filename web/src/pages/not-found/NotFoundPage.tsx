import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { formatYear } from '@/shared/lib/format';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';

import styles from './NotFoundPage.module.css';

interface NotFoundPageProps {
  /** Where the recovery link goes. The admin area passes its own dashboard. */
  backTo?: string;
  backLabel?: string;
}

export default function NotFoundPage({ backTo = paths.home, backLabel }: NotFoundPageProps) {
  const { t } = useTranslation(undefined, { keyPrefix: 'notFound' });
  return (
    <section className={styles.root} aria-labelledby="not-found-title">
      <DocumentTitle title={t('title')} />
      <p className={styles.code} aria-hidden="true">
        {formatYear(404)}
      </p>
      <h1 id="not-found-title" className={styles.title}>
        {t('title')}
      </h1>
      <p className={styles.text}>{t('text')}</p>
      <Link className={styles.link} to={backTo}>
        {backLabel ?? t('home')}
      </Link>
    </section>
  );
}