import { cx } from '@/shared/lib/cx';

import styles from './Button.module.css';

export type ButtonVariant = 'red' | 'ink' | 'gold' | 'ghost' | 'glass';
export type ButtonSize = 'md' | 'sm';

/** Spec §4.5. Use for anything that must look like a button (buttons, links). */
export function buttonClass(
  variant: ButtonVariant = 'ink',
  size: ButtonSize = 'md',
  extra?: string,
): string {
  return cx(styles.btn, styles[variant], size === 'sm' && styles.sm, extra);
}
