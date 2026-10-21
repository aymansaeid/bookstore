import { useState } from 'react';

import { Button } from '@/shared/ui/Button/Button';

import styles from './admin.module.css';
import local from './RecordStatus.module.css';

interface RecordStatusProps {
  isActive: boolean;
  /** What hiding does, shown while the record is visible. */
  hideEffect: string;
  onToggle: (next: boolean) => void;
  toggling: boolean;
  /** Why it can't be deleted yet, or null when it can. */
  deleteBlocked: string | null;
  onDelete: () => void;
  deleting: boolean;
}

/**
 * Show/hide and delete for a catalog record. Hiding is the safe default;
 * deleting asks once more and is blocked while anything still uses it.
 */
export function RecordStatus({
  isActive,
  hideEffect,
  onToggle,
  toggling,
  deleteBlocked,
  onDelete,
  deleting,
}: RecordStatusProps) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className={local.wrap}>
      <div className={local.row}>
        <div className={local.text}>
          <p className={styles.actionTitle}>{isActive ? 'ظاهر في المتجر' : 'مخفي عن المتجر'}</p>
          <p className={styles.muted}>
            {isActive ? hideEffect : 'لا يراه الزوار حتى تُظهره، ويبقى كل ما ارتبط به كما هو.'}
          </p>
        </div>
        <Button
          variant={isActive ? 'ghost' : 'red'}
          size="sm"
          disabled={toggling}
          onClick={() => {
            onToggle(!isActive);
          }}
        >
          {isActive ? 'إخفاء' : 'إظهار'}
        </Button>
      </div>

      <div className={local.row}>
        <div className={local.text}>
          <p className={styles.actionTitle}>حذف نهائي</p>
          <p className={styles.muted}>{deleteBlocked ?? 'لا يمكن التراجع عن الحذف.'}</p>
        </div>
        {confirming ? (
          <div className={styles.buttons} role="group" aria-label="تأكيد الحذف">
            <Button variant="red" size="sm" disabled={deleting} onClick={onDelete}>
              {deleting ? 'جارٍ الحذف…' : 'نعم، احذف'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setConfirming(false);
              }}
            >
              إلغاء
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            disabled={deleteBlocked !== null}
            onClick={() => {
              setConfirming(true);
            }}
          >
            حذف
          </Button>
        )}
      </div>
    </div>
  );
}