import type { ReactNode } from 'react';

import { DocumentTitle } from '@/shared/ui/DocumentTitle';

import styles from './account.module.css';

/** Title row of every «حسابي» page. */
export function AccountHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <header className={styles.header}>
      <DocumentTitle title={title} />
      <div>
        <h1 className={styles.title}>{title}</h1>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {action}
    </header>
  );
}
