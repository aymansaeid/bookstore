import { formatCount } from '@/shared/lib/format';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './QuantityStepper.module.css';

interface QuantityStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}

/** − value + with 44px buttons. */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 10,
  label = 'الكمية',
}: QuantityStepperProps) {
  return (
    <div className={styles.stepper} role="group" aria-label={label}>
      <button
        type="button"
        aria-label="زيادة الكمية"
        disabled={value >= max}
        onClick={() => {
          onChange(Math.min(max, value + 1));
        }}
      >
        <Icon name="plus" size={18} />
      </button>
      <output aria-live="polite">{formatCount(value)}</output>
      <button
        type="button"
        aria-label="إنقاص الكمية"
        disabled={value <= min}
        onClick={() => {
          onChange(Math.max(min, value - 1));
        }}
      >
        <Icon name="minus" size={18} />
      </button>
    </div>
  );
}
