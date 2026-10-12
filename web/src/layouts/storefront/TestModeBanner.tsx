import { useStoreConfig } from '@/features/store/queries';

import styles from './TestModeBanner.module.css';

/** API guide §4: when isTestMode is true, payments are simulated. Say so clearly. */
export function TestModeBanner() {
  const { data } = useStoreConfig();
  if (!data?.isTestMode) return null;

  return (
    <p className={styles.root} role="status">
      <b>وضع التجربة:</b> المدفوعات تجريبية ولن يُخصم أي مبلغ.
    </p>
  );
}
