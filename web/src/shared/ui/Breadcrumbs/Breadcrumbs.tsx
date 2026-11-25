import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import styles from './Breadcrumbs.module.css';

export interface Crumb {
  label: string;
  to?: string;
}

export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('ui.breadcrumbs')} className={styles.nav}>
      <ol className={styles.list}>
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`}>
            {item.to && index < items.length - 1 ? (
              <Link to={item.to}>{item.label}</Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}