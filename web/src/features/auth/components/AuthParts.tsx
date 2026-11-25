import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { UI_LANGUAGE } from '@/app/locale';
import { paths } from '@/app/paths';
import { cx } from '@/shared/lib/cx';
import { DocumentTitle } from '@/shared/ui/DocumentTitle';
import { Logo } from '@/shared/ui/Logo/Logo';

import styles from './auth.module.css';

export function AuthHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { t } = useTranslation('auth');
  return (
    <header className={styles.header}>
      <DocumentTitle title={title} />
      <Link to={paths.home} className={styles.logoLink}>
        <Logo className={styles.logo} alt={t('header.logoAlt')} />
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
  const { t } = useTranslation('auth', { keyPrefix: 'tabs' });
  const suffix = returnTo ? `?${new URLSearchParams({ returnTo }).toString()}` : '';
  const tabs = [
    { id: 'login', label: t('login'), to: `${paths.login}${suffix}` },
    { id: 'register', label: t('register'), to: `${paths.register}${suffix}` },
  ] as const;

  return (
    <nav className={styles.tabs} aria-label={t('label')}>
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
  const { t } = useTranslation('auth', { keyPrefix: 'social' });
  return (
    <div className={styles.socialBlock}>
      <p className={styles.divider}>{t('or')}</p>
      <button type="button" className={cx(styles.socialBtn, styles.wide)} disabled>
        {t('whatsapp')} <small>{t('soon')}</small>
      </button>
      <div className={styles.social}>
        {['Google', 'Apple', 'Facebook'].map((name) => (
          <button key={name} type="button" className={styles.socialBtn} disabled lang="en">
            {name}
            <small lang={UI_LANGUAGE}>{t('soon')}</small>
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