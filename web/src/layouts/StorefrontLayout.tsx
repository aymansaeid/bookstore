import { Outlet, useMatches } from 'react-router';

import { AnnouncementBar } from '@/layouts/storefront/AnnouncementBar';
import { BottomNav } from '@/layouts/storefront/BottomNav';
import { EfendiFab } from '@/layouts/storefront/EfendiFab';
import { isShellHandle, type ShellHandle } from '@/layouts/storefront/shellHandle';
import { SiteFooter } from '@/layouts/storefront/SiteFooter';
import { SiteHeader } from '@/layouts/storefront/SiteHeader';

import styles from './StorefrontLayout.module.css';

function useShellOptions(): ShellHandle {
  const matches = useMatches();
  return matches.reduce<ShellHandle>(
    (options, match) => (isShellHandle(match.handle) ? { ...options, ...match.handle } : options),
    {},
  );
}

/** Storefront frame: announcement bar, header, page, footer, bottom nav / FAB. */
export default function StorefrontLayout() {
  const { hideFooter = false, hideFab = false } = useShellOptions();

  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skip}>
        تخطَّ إلى المحتوى
      </a>
      <AnnouncementBar />
      <SiteHeader />
      <main id="main-content" tabIndex={-1} className={styles.main}>
        <Outlet />
      </main>
      {!hideFooter && <SiteFooter />}
      {!hideFab && <EfendiFab />}
      <BottomNav />
    </div>
  );
}
