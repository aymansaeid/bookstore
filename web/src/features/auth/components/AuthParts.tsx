import type { ReactNode } from 'react';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { cx } from '@/shared/lib/cx';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';
import { Logo } from '@/shared/ui/Logo/Logo';

import styles from './auth.module.css';

export function AuthHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className={styles.header}>
      <DocumentTitle title={title} />
      <Link to={paths.home} className={styles.logoLink}>
        <Logo className={styles.logo} alt="كتاب أفندي، العودة إلى المتجر" />
      </Link>
      <h1 className={styles.title}>{title}</h1>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
    </header>
  );
}

/** «تسجيل الدخول / حساب جديد» switch. Keeps ?returnTo= across both. */
export function AuthTabs({
  active,
  returnTo,
}: {
  active: 'login' | 'register';
  returnTo: string | null;
}) {
  const suffix = returnTo ? `?${new URLSearchParams({ returnTo }).toString()}` : '';
  const tabs = [
    { id: 'login', label: 'تسجيل الدخول', to: `${paths.login}${suffix}` },
    { id: 'register', label: 'حساب جديد', to: `${paths.register}${suffix}` },
  ] as const;

  return (
    <nav className={styles.tabs} aria-label="نوع الدخول">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          to={tab.to}
          replace
          className={cx(styles.tab, tab.id === active && styles.tabActive)}
          aria-current={tab.id === active ? 'page' : undefined}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

/** Spec shows WhatsApp and social sign-in; the backend doesn't support them yet. */
export function SocialSignIn() {
  return (
    <div className={styles.socialBlock}>
      <p className={styles.divider}>أو</p>
      <button type="button" className={cx(styles.socialBtn, styles.wide)} disabled>
        📱 ادخل برمز يصلك على واتساب <small>قريباً</small>
      </button>
      <div className={styles.social}>
        {['Google', 'Apple', 'Facebook'].map((name) => (
          <button key={name} type="button" className={styles.socialBtn} disabled lang="en">
            {name}
            <small lang="ar">قريباً</small>
          </button>
        ))}
      </div>
    </div>
  );
}

/** Centered result screen (check your email, verified, password changed…). */
export function AuthStatus({
  title,
  tone = 'info',
  children,
}: {
  title: string;
  tone?: 'info' | 'success' | 'error';
  children: ReactNode;
}) {
  const icon = tone === 'success' ? '✓' : tone === 'error' ? '!' : '✉';
  return (
    <section className={cx(styles.status, styles[tone])} aria-live="polite">
      <span className={styles.statusIcon} aria-hidden="true">
        {icon}
      </span>
      <h2 className={styles.statusTitle}>{title}</h2>
      {children}
    </section>
  );
}
