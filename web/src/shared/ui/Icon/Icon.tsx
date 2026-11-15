import { cx } from '@/shared/lib/cx';

import { ICON_PATHS, type IconName } from './icons';
import styles from './Icon.module.css';

interface IconProps {
  name: IconName;
  /** Pixel size; spec §3.5 default is 20. */
  size?: number;
  className?: string;
}

/**
 * Decorative by default (aria-hidden). Give the parent button or link an
 * aria-label instead of labelling the icon. Paths are static constants, so
 * innerHTML here is safe.
 */
export function Icon({ name, size = 20, className }: IconProps) {
  return (
    <svg
      className={cx(styles.icon, className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
      dangerouslySetInnerHTML={{ __html: ICON_PATHS[name] }}
    />
  );
}
