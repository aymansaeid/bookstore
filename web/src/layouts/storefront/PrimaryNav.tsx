import { Link } from 'react-router';

import { type NavId, primaryNav } from '@/app/navigation';
import { cx } from '@/shared/lib/cx';
import { Spark } from '@/shared/ui/Spark/Spark';

import styles from './PrimaryNav.module.css';

interface PrimaryNavProps {
  active: NavId | null;
  label: string;
  variant?: 'bar' | 'drawer';
  className?: string;
}

export function PrimaryNav({ active, label, variant = 'bar', className }: PrimaryNavProps) {
  return (
    <nav aria-label={label} className={cx(variant === 'drawer' && styles.drawer, className)}>
      <ul className={styles.list}>
        {primaryNav.map((item) => {
          const isActive = item.id === active;
          return (
            <li key={item.id}>
              <Link
                to={item.to}
                className={cx(styles.link, isActive && styles.active)}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.spark && <Spark size={14} />}
                {item.label}
                {item.aiBadge && (
                  <span className={styles.ai} lang="en">
                    AI
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
