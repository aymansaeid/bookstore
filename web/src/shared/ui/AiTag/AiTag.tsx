import type { ReactNode } from 'react';

import { cx } from '@/shared/lib/cx';
import { Spark } from '@/shared/ui/Spark/Spark';

import styles from './AiTag.module.css';

/** Spec §4.4 «✦ مولّد بالذكاء الاصطناعي» capsule; `dark` for ink surfaces. */
export function AiTag({
  children,
  tone = 'light',
}: {
  children: ReactNode;
  tone?: 'light' | 'dark';
}) {
  return (
    <span className={cx(styles.tag, tone === 'dark' && styles.dark)}>
      <Spark size={14} />
      {children}
    </span>
  );
}
