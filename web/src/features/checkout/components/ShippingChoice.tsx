import { useCartStore } from '@/features/cart/cartStore';
import type { Quote, ShippingOption } from '@/features/checkout/types';
import { useShippingRates } from '@/features/store/queries';
import { cx } from '@/shared/lib/cx';
import { deliveryWindow } from '@/shared/lib/dates';
import { countryName, formatMoney } from '@/shared/lib/format';
import { Icon } from '@/shared/ui/Icon/Icon';
import { STORE_COUNTRY } from '@/app/locale';

import styles from './ShippingChoice.module.css';

export function shippingOptionName(option: ShippingOption): string {
  if (option.name) return option.name;
  if (option.code === 'standard') return 'الشحن العادي';
  if (option.isPickup) return 'الاستلام من المكتبة';
  return option.code;
}

/** Only countries we ship to (API §4), Arabic names, home country first. */
export function CountrySelect({
  value,
  onChange,
  id,
}: {
  value: string;
  onChange: (code: string) => void;
  id?: string;
}) {
  const rates = useShippingRates();
  const countries = (rates.data ?? [])
    .map((rate) => ({ code: rate.countryCode, name: countryName(rate.countryCode) }))
    .sort((a, b) =>
      a.code === STORE_COUNTRY
        ? -1
        : b.code === STORE_COUNTRY
          ? 1
          : a.name.localeCompare(b.name, 'ar'),
    );

  return (
    <select
      id={id}
      className={styles.select}
      value={value}
      onChange={(event) => {
        onChange(event.target.value);
      }}
    >
      {countries.length === 0 && <option value={value}>{countryName(value)}</option>}
      {countries.map((country) => (
        <option key={country.code} value={country.code}>
          {country.name}
        </option>
      ))}
    </select>
  );
}

/** Shipping options from the quote, as a radio list (spec 5.7 card 2). */
export function ShippingOptions({ quote }: { quote: Quote }) {
  const setShippingMethod = useCartStore((state) => state.setShippingMethod);
  if (quote.shippingOptions.length === 0) return null;

  return (
    <fieldset className={styles.options}>
      <legend className="sr-only">طريقة الشحن</legend>
      {quote.shippingOptions.map((option) => {
        const checked = option.code === quote.selectedShippingMethod;
        return (
          <label key={option.code} className={cx(styles.option, checked && styles.checked)}>
            <input
              type="radio"
              name="shipping-method"
              value={option.code}
              checked={checked}
              onChange={() => {
                setShippingMethod(option.code);
              }}
            />
            <span className={styles.radio} aria-hidden="true" />
            <span className={styles.body}>
              <span className={styles.name}>
                <Icon name={option.isPickup ? 'pin' : 'truck'} size={18} />
                {shippingOptionName(option)}
                {option.isRecommended && <span className={styles.recommended}>موصى به</span>}
              </span>
              <span className={styles.detail}>
                {option.carrier && <span lang="tr">{option.carrier} · </span>}
                {option.isPickup
                  ? 'جاهز للاستلام من مكتبتنا في إسطنبول'
                  : deliveryWindow(option.minDays, option.maxDays)}
              </span>
            </span>
            <span className={cx(styles.price, option.isFree && styles.free)}>
              {option.isFree ? 'مجاني' : formatMoney(option.price, quote.currency)}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
