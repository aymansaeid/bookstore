import styles from './RouteLoading.module.css';

/** Shown while the first route chunk loads (React Router's HydrateFallback). */
export function RouteLoading() {
  return (
    <div className={styles.root} role="status" aria-live="polite">
      جارٍ التحميل…
    </div>
  );
}
