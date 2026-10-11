import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { EffendiAvatar } from '@/shared/ui/EffendiAvatar/EffendiAvatar';

import styles from './EfendiFab.module.css';

/** Floating «اسأل أفندي» capsule, bottom-left (spec §4.4). Bottom nav replaces it on mobile. */
export function EfendiFab() {
  return (
    <Link to={paths.askEfendi} className={styles.fab}>
      <span className={styles.text}>
        <b>اسأل أفندي</b>
        <small>مساعدك الذكي في اختيار الكتب</small>
      </span>
      <EffendiAvatar size={46} online />
    </Link>
  );
}
