import { UI_DIRECTION } from '@/app/locale';

/**
 * «عرض الكل ←»: the arrow points the way the page reads, left in Arabic and
 * right in English and Turkish. Decorative; the link text says where it goes.
 */
export function ForwardArrow() {
  return <span aria-hidden="true">{UI_DIRECTION === 'rtl' ? '←' : '→'}</span>;
}