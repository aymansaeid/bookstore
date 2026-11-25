import logo1x from '@/assets/brand/logo-1x.webp';
import logo2x from '@/assets/brand/logo-2x.webp';
import logo3x from '@/assets/brand/logo-3x.webp';
import { i18n } from '@/i18n';
import { cx } from '@/shared/lib/cx';

import styles from './Logo.module.css';

interface LogoProps {
  className?: string;
  alt?: string;
  /** Header logo is above the fold: load it first (spec §8.4 LCP). */
  priority?: boolean;
}

/** Full wordmark (spec §2). Height comes from className; width follows the 1440×681 ratio. */
export function Logo({ className, alt, priority = false }: LogoProps) {
  return (
    <img
      className={cx(styles.logo, className)}
      src={logo1x}
      srcSet={`${logo1x} 1x, ${logo2x} 2x, ${logo3x} 3x`}
      width={131}
      height={62}
      alt={alt ?? i18n.t('siteName')}
      decoding="async"
      fetchPriority={priority ? 'high' : 'auto'}
    />
  );
}