import { Link } from 'react-router';

import { paths } from '@/app/paths';
import { useCustomerSummary } from '@/features/account/queries';
import { useSession } from '@/features/auth/session';
import { tierLabel } from '@/shared/api/enums';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './SiteHeader.module.css';

/** Spec §4.1 account capsule: gold initial on ink, name, loyalty tier. */
export function AccountPill() {
  const { status, customer } = useSession();
  const summary = useCustomerSummary();

  if (status === 'authenticated' && customer) {
    const initial = Array.from(customer.firstName.trim())[0] ?? '؟';
    const tier = summary.data ? tierLabel(summary.data.loyaltyTier) : 'حسابي';
    return (
      <Link to={paths.account.root} className={styles.account}>
        <span className={styles.accountAvatar} aria-hidden="true">
          {initial}
        </span>
        <span className={styles.accountText} aria-hidden="true">
          <b>{customer.firstName}</b>
          <small>{tier}</small>
        </span>
        <span className="sr-only">حسابي: {customer.firstName}</span>
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
        <b>حسابي</b>
        <small>تسجيل الدخول</small>
      </span>
      <span className="sr-only">حسابي: تسجيل الدخول</span>
    </Link>
  );
}
