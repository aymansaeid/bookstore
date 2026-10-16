import { Link } from 'react-router';

import { paths } from '@/app/paths';
import type { SavedAddress } from '@/features/addresses/api';
import type { AddressChoice } from '@/features/checkout/checkoutStore';
import { cx } from '@/shared/lib/cx';
import { countryName } from '@/shared/lib/format';

import styles from './SavedAddressPicker.module.css';

interface SavedAddressPickerProps {
  addresses: SavedAddress[];
  choice: AddressChoice;
  onChoose: (choice: number | 'new') => void;
}

/** A signed-in customer's address book as radio cards, plus «عنوان جديد». */
export function SavedAddressPicker({ addresses, choice, onChoose }: SavedAddressPickerProps) {
  return (
    <fieldset className={styles.list}>
      <legend className="sr-only">عنوان الشحن</legend>
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
              {address.isDefault && <span className={styles.default}>الافتراضي</span>}
            </span>
            <span className={styles.details}>
              <span>{address.recipientName}</span>
              <span>
                {[address.line1, address.line2, address.city, countryName(address.countryCode)]
                  .filter(Boolean)
                  .join('، ')}
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
        <span className={styles.label}>عنوان جديد لهذا الطلب</span>
      </label>
      <Link to={paths.account.addresses} className={styles.manage}>
        إدارة العناوين المحفوظة
      </Link>
    </fieldset>
  );
}
