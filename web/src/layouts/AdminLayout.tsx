import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { Navigate, Outlet, useLocation } from 'react-router';

import { paths } from '@/app/paths';
import { AdminSidebar } from '@/features/admin/components/AdminSidebar';
import { adminKeys, useAdminProfile } from '@/features/admin/queries';
import {
  endAdminSession,
  getAdminSession,
  initAdminSession,
  subscribeAdminSession,
  useAdminSession,
} from '@/features/admin/session';
import { cx } from '@/shared/lib/cx';
import { Icon } from '@/shared/ui/Icon/Icon';
import { Toaster } from '@/shared/ui/toast/Toaster';

import styles from './AdminLayout.module.css';

/**
 * Admin shell (spec 5.10), in its own chunk. No admin token → the login,
 * with a way back here. On load it confirms the token with /me (API §3).
 */
export default function AdminLayout() {
  const session = useAdminSession();
  const location = useLocation();
  const queryClient = useQueryClient();
  const profile = useAdminProfile();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    initAdminSession();
  }, []);

  // Signing out (here, by expiry, or in another tab) drops every cached admin query.
  useEffect(
    () =>
      subscribeAdminSession(() => {
        if (getAdminSession().status === 'signedOut') {
          queryClient.removeQueries({ queryKey: adminKeys.all });
        }
      }),
    [queryClient],
  );

  // Escape closes the phone menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  if (session.status === 'unknown') {
    return <div className={styles.loading} aria-busy="true" aria-label="جارٍ التحقق من الجلسة" />;
  }
  if (session.status === 'signedOut') {
    const returnTo = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`${paths.admin.login}?${new URLSearchParams({ returnTo }).toString()}`}
        replace
      />
    );
  }

  const email = profile.data?.email ?? session.email ?? '';

  return (
    <div className={styles.shell}>
      <a href="#main-content" className={styles.skip}>
        تخطَّ إلى المحتوى
      </a>

      <div id="admin-menu" className={cx(styles.sidebar, menuOpen && styles.sidebarOpen)}>
        <AdminSidebar
          onNavigate={() => {
            setMenuOpen(false);
          }}
        />
      </div>
      {menuOpen && (
        <button
          type="button"
          className={styles.scrim}
          aria-label="إغلاق القائمة"
          onClick={() => {
            setMenuOpen(false);
          }}
        />
      )}

      <div className={styles.column}>
        <header className={styles.topbar}>
          <button
            type="button"
            className={styles.menuButton}
            aria-expanded={menuOpen}
            aria-controls="admin-menu"
            aria-label="القائمة"
            onClick={() => {
              setMenuOpen((open) => !open);
            }}
          >
            <Icon name="menu" size={22} />
          </button>
          <a href={paths.home} className={styles.store} target="_blank" rel="noreferrer">
            عرض المتجر <span aria-hidden="true">↗</span>
          </a>
          <div className={styles.me}>
            <span className={styles.avatar} aria-hidden="true">
              {email.charAt(0).toUpperCase()}
            </span>
            <span className={styles.email} dir="ltr">
              {email}
            </span>
            <button
              type="button"
              className={styles.logout}
              onClick={() => {
                endAdminSession();
              }}
            >
              خروج
            </button>
          </div>
        </header>

        <main id="main-content" tabIndex={-1} className={styles.main}>
          <Outlet />
        </main>
      </div>
      <Toaster />
    </div>
  );
}
