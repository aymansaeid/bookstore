import { type ReactNode, useId, useState } from 'react';

import { MEDIA } from '@/shared/lib/media';
import { useMediaQuery } from '@/shared/lib/useMediaQuery';
import { Icon } from '@/shared/ui/Icon/Icon';

import styles from './FooterSection.module.css';

/** A footer column: a plain heading from 768px, a collapsible section below (spec §8.3). */
export function FooterSection({ title, children }: { title: string; children: ReactNode }) {
  const isWide = useMediaQuery(MEDIA.md);
  const [open, setOpen] = useState(false);
  const bodyId = useId();

  return (
    <div className={styles.section}>
      <h2 className={styles.heading}>
        {isWide ? (
          title
        ) : (
          <button
            type="button"
            className={styles.toggle}
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => {
              setOpen((value) => !value);
            }}
          >
            {title}
            <Icon name="plus" size={18} className={styles.toggleIcon} />
          </button>
        )}
      </h2>
      <div id={bodyId} className={styles.body} hidden={!isWide && !open}>
        {children}
      </div>
    </div>
  );
}
