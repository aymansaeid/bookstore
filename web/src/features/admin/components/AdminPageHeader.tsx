import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { DocumentTitle } from '@/shared/ui/DocumentTitle';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './admin.module.css';

interface AdminPageHeaderProps {
  title: string;
  /** Shown under the title: a count, a date, a status. */
  meta?: ReactNode;
  back?: { to: string; label: string };
  actions?: ReactNode;
}

/** Title row of every admin page (spec 5.10): back link, Amiri title, actions on the left. */
export function AdminPageHeader({ title, meta, back, actions }: AdminPageHeaderProps) {
  return (
    <header className={styles.pageHeader}>
      <DocumentTitle title={`${title} · الإدارة`} />
      <div className={styles.pageHeaderText}>
        {back && (
          <Link to={back.to} className={styles.back}>
            <Icon name="arrowr" size={16} /> {back.label}
          </Link>
        )}
        <h1 className={styles.pageTitle}>{title}</h1>
        {meta && <div className={styles.pageMeta}>{meta}</div>}
      </div>
      {actions && <div className={styles.pageActions}>{actions}</div>}
    </header>
  );
}
