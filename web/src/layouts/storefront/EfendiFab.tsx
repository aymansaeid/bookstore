import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { cx } from '@/shared/lib/cx';
import { EffendiAvatar } from '@/shared/ui/EffendiAvatar/EffendiAvatar';

import styles from './EfendiFab.module.css';

/** Past this, the capsule shrinks to the avatar so it covers less of the page. */
const COMPACT_AFTER_PX = 240;

/**
 * Floating «اسأل أفندي» capsule, bottom-left (spec §4.4). Bottom nav replaces
 * it on mobile. Full capsule at the top of a page, just the avatar once the
 * reader scrolls into the content.
 */
export function EfendiFab() {
  const { t } = useTranslation();
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      setCompact(window.scrollY > COMPACT_AFTER_PX);
    };
    const onScroll = () => {
      if (frame === 0) frame = window.requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <Link
      to={paths.askEfendi}
      className={cx(styles.fab, compact && styles.compact)}
      aria-label={t('fab.label')}
    >
      <span className={styles.text} aria-hidden="true">
        <b>{t('fab.title')}</b>
        <small>{t('fab.subtitle')}</small>
      </span>
      <EffendiAvatar size={46} online />
    </Link>
  );
}