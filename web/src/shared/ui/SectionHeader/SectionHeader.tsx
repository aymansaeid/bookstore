import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { ForwardArrow } from '@/shared/ui/ForwardArrow/ForwardArrow';

import styles from './SectionHeader.module.css';

interface SectionHeaderProps {
  id: string;
  kicker: string;
  title: ReactNode;
  description?: string;
  /** «عرض الكل ←» link. */
  more?: { to: string; label?: string };
  /** Tabs or arrows instead of the link. */
  aside?: ReactNode;
}

/** Gold kicker with a dash, Amiri title, grey description, action at the end. */
export function SectionHeader({ id, kicker, title, description, more, aside }: SectionHeaderProps) {
  const { t } = useTranslation();
  return (
    <div className={styles.header}>
      <div>
        <p className={styles.kicker}>{kicker}</p>
        <h2 id={id} className={styles.title}>
          {title}
        </h2>
        {description && <p className={styles.description}>{description}</p>}
      </div>
      {aside}
      {more && (
        <Link to={more.to} className={styles.more}>
          {more.label ?? t('ui.seeAll')} <ForwardArrow />
        </Link>
      )}
    </div>
  );
}