import { cx } from '@/shared/lib/cx';

import styles from './EffendiAvatar.module.css';

interface EffendiAvatarProps {
  /** Spec §4.4 sizes: 32 / 44 / 64 / 96 (the FAB uses 46). */
  size?: number;
  /** Green "online" dot. */
  online?: boolean;
  className?: string;
}

/** «أفندي» portrait: emblem in a white circle with a white + gold double ring. */
export function EffendiAvatar({ size = 44, online = false, className }: EffendiAvatarProps) {
  return (
    <span
      className={cx(styles.avatar, className)}
      style={{ inlineSize: size, blockSize: size }}
      aria-hidden="true"
    >
      {online && <span className={styles.online} />}
    </span>
  );
}
