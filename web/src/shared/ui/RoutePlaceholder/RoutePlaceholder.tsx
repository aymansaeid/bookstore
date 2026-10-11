import { useLocation } from 'react-router';

import { DocumentTitle } from '@/shared/ui/DocumentTitle';

import styles from './RoutePlaceholder.module.css';

interface RoutePlaceholderProps {
  /** Arabic page title, also used for document.title. */
  title: string;
  /** Where the page is specified, e.g. "Spec §5.1" or "API §6". */
  source: string;
  /** Roadmap step that replaces this placeholder. */
  step: number;
}

/** A malformed %-sequence in a hand-typed URL must not crash the page. */
function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

/**
 * Temporary stand-in for a page that a later roadmap step will build.
 * Delete this component once no route uses it.
 */
export function RoutePlaceholder({ title, source, step }: RoutePlaceholderProps) {
  const { pathname, search } = useLocation();

  return (
    <section className={styles.root} aria-labelledby="route-placeholder-title">
      <DocumentTitle title={title} />
      <h1 id="route-placeholder-title" className={styles.title}>
        {title}
      </h1>
      <dl className={styles.meta}>
        <div>
          <dt>المرجع</dt>
          <dd>{source}</dd>
        </div>
        <div>
          <dt>تُبنى في الخطوة</dt>
          <dd>{step.toLocaleString('ar-EG')}</dd>
        </div>
        <div>
          <dt>المسار</dt>
          <dd dir="ltr" className={styles.path}>
            {safeDecode(pathname + search)}
          </dd>
        </div>
      </dl>
    </section>
  );
}
