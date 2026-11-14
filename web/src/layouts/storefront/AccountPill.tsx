import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { useCustomerSummary } from '@/features/account/queries';
import { useSession } from '@/features/auth/session';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './SiteHeader.module.css';
import { useTranslation } from 'react-i18next';
/** Spec §4.1 account capsule: gold initial on ink, name, loyalty tier. */
export function AccountPill() {
  const { t } = useTranslation();
  const { status, customer } = useSession();
  const summary = useCustomerSummary();

  if (status === 'authenticated' && customer) {
    const initial = Array.from(customer.firstName.trim())[0] ?? '؟';
    const tier = summary.data ? t(`tier.${summary.data.loyaltyTier}`) : t('account.title');
    return (
      <Link to={paths.account.root} className={styles.account}>
        <span className={styles.accountAvatar} aria-hidden="true">
          {initial}
        </span>
        <span className={styles.accountText} aria-hidden="true">
          <b>{customer.firstName}</b>
          <small>{tier}</small>
        </span>
      <span className="sr-only">{t('account.srLabel', { name: customer.firstName })}</span>
        </Link>
    );
  }

  // Guests, and the moment before the startup refresh answers.
  return (
    <Link to={status === 'guest' ? paths.login : paths.account.root} className={styles.account}>
      <span className={styles.accountAvatar} aria-hidden="true">
        <Icon name="user" size={18} />
      </span>
     <span className={styles.accountText} aria-hidden="true">
          <b>{t('account.title')}</b>
          <small>{t('account.signIn')}</small>
        </span>
        <span className="sr-only">{t('account.srLabel', { name: t('account.signIn') })}</span>
      </Link>
  );
}
