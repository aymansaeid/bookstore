import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { paths } from '@/app/paths';
import type { SavedAddress } from '@/features/addresses/api';
import type { AddressChoice } from '@/features/checkout/checkoutStore';
import { cx } from '@/shared/lib/cx';
import { countryName, LIST_SEPARATOR } from '@/shared/lib/format';

import styles from './SavedAddressPicker.module.css';

interface SavedAddressPickerProps {
  addresses: SavedAddress[];
  choice: AddressChoice;
  onChoose: (choice: number | 'new') => void;
}

/** A signed-in customer's address book as radio cards, plus «عنوان جديد». */
export function SavedAddressPicker({ addresses, choice, onChoose }: SavedAddressPickerProps) {
  const { t } = useTranslation('checkout', { keyPrefix: 'addresses' });
  return (
    <fieldset className={styles.list}>
      <legend className="sr-only">{t('legend')}</legend>
      {addresses.map((address) => {
        const checked = choice === address.id;
        return (
          <label key={address.id} className={cx(styles.option, checked && styles.checked)}>
            <input
              type="radio"
              name="saved-address"
              checked={checked}
              onChange={() => {
                onChoose(address.id);
              }}
            />
            <span className={styles.radio} aria-hidden="true" />
            <span className={styles.label}>
              {address.label}
              {address.isDefault && <span className={styles.default}>{t('default')}</span>}
            </span>
            <span className={styles.details}>
              <span>{address.recipientName}</span>
              <span>
                {[address.line1, address.line2, address.city, countryName(address.countryCode)]
                  .filter(Boolean)
                  .join(LIST_SEPARATOR)}
              </span>
              <span dir="ltr">{address.phone}</span>
            </span>
          </label>
        );
      })}
      <label className={cx(styles.option, choice === 'new' && styles.checked)}>
        <input
          type="radio"
          name="saved-address"
          checked={choice === 'new'}
          onChange={() => {
            onChoose('new');
          }}
        />
        <span className={styles.radio} aria-hidden="true" />
        <span className={styles.label}>{t('new')}</span>
      </label>
      <Link to={paths.account.addresses} className={styles.manage}>
        {t('manage')}
      </Link>
    </fieldset>
  );
}