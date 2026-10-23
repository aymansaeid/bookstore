import { useEffect, useRef, useState } from 'react';

import styles from '@/features/admin/components/admin.module.css';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import type { CouponStatus } from '@/features/admin/coupons/api';
import { CouponForm } from '@/features/admin/coupons/components/CouponForm';
import { COUPON_FILTERS, COUPON_STATUS, usageText } from '@/features/admin/coupons/labels';
import { useAdminCoupons } from '@/features/admin/coupons/queries';
import { useEditParam } from '@/features/admin/useEditParam';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { arabicPlural, formatCount, formatDate } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';

import local from './AdminCatalogPage.module.css';

const couponsPhrase = (count: number) =>
  arabicPlural(count, { one: 'كوبون واحد', two: 'كوبونان', few: 'كوبونات', many: 'كوبوناً' });

/** Discount codes (API §10): working ones first, then by expiry. */
export default function AdminCouponsPage() {
  const coupons = useAdminCoupons();
  const { edit, open, replace, close } = useEditParam();
  const [filter, setFilter] = useState<CouponStatus | 'all'>('all');
  const editorRef = useRef<HTMLElement>(null);
  const all = coupons.data ?? [];
  const selected = typeof edit === 'number' ? all.find((c) => c.id === edit) : undefined;
  const showEditor = edit === 'new' || selected !== undefined;

  const shown = all
    .filter((c) => filter === 'all' || c.status === filter)
    .sort(
      (a, b) =>
        Number(b.status === 'Active') - Number(a.status === 'Active') ||
        a.expiresAtUtc.localeCompare(b.expiresAtUtc),
    );

  useEffect(() => {
    if (edit !== null && !window.matchMedia('(min-width: 1100px)').matches) {
      editorRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [edit]);

  return (
    <>
      <AdminPageHeader
        title="الكوبونات"
        meta={coupons.data ? <span>{couponsPhrase(all.length)}</span> : undefined}
        actions={
          <Button
            variant="ink"
            size="sm"
            onClick={() => {
              open('new');
            }}
          >
            + كوبون جديد
          </Button>
        }
      />

      <div className={local.layout}>
        {showEditor ? (
          <section
            ref={editorRef}
            className={cx(styles.card, local.editor)}
            aria-labelledby="editor-title"
          >
            <div className={local.editorHead}>
              <h2 id="editor-title" className={styles.cardTitle}>
                {selected ? <bdi>{selected.code}</bdi> : 'كوبون جديد'}
              </h2>
              <Button variant="ghost" size="sm" onClick={close}>
                إغلاق
              </Button>
            </div>
            <CouponForm
              key={selected ? JSON.stringify(selected) : 'new'}
              coupon={selected ?? null}
              onSaved={replace}
              onDeleted={close}
            />
          </section>
        ) : (
          <aside className={cx(styles.card, local.hint)}>
            <p className={styles.muted}>
              اختر كوبوناً لتعديل خصمه أو مدته أو حده، أو أنشئ كوبوناً جديداً. لا يُعرض للعميل سبب
              رفض الكود؛ السبب يظهر هنا في الحالة.
            </p>
          </aside>
        )}

        <div className={local.list}>
          <div className={styles.filters} role="group" aria-label="تصفية حسب الحالة">
            {COUPON_FILTERS.map((item) => (
              <button
                key={item.id}
                type="button"
                className={cx(styles.filter, filter === item.id && styles.filterOn)}
                aria-pressed={filter === item.id}
                onClick={() => {
                  setFilter(item.id);
                }}
              >
                {item.label}
              </button>
            ))}
          </div>

          {coupons.isError && !coupons.data ? (
            <div className={styles.empty} role="alert">
              <p>{errorMessage(coupons.error)}</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  void coupons.refetch();
                }}
              >
                أعد المحاولة
              </Button>
            </div>
          ) : !coupons.data ? (
            <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ تحميل الكوبونات" />
          ) : shown.length === 0 ? (
            <div className={styles.empty}>
              <p>
                {all.length === 0 ? 'لا كوبونات بعد. أنشئ أول كوبون.' : 'لا كوبونات بهذه الحالة.'}
              </p>
            </div>
          ) : (
            <div className={styles.card}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th scope="col">الكود</th>
                    <th scope="col">الخصم</th>
                    <th scope="col">ينتهي</th>
                    <th scope="col">الاستخدام</th>
                    <th scope="col">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((coupon) => (
                    <tr key={coupon.id} className={cx(edit === coupon.id && local.selected)}>
                      <td data-label="الكود">
                        <button
                          type="button"
                          className={cx(styles.rowLink, styles.code, local.open)}
                          dir="ltr"
                          aria-current={edit === coupon.id ? 'true' : undefined}
                          onClick={() => {
                            open(coupon.id);
                          }}
                        >
                          {coupon.code}
                        </button>
                      </td>
                      <td data-label="الخصم" className={styles.num}>
                        {formatCount(coupon.discountPercentage)}٪
                      </td>
                      <td data-label="ينتهي" className={styles.num}>
                        {formatDate(coupon.expiresAtUtc)}
                      </td>
                      <td data-label="الاستخدام" className={styles.num}>
                        {usageText(coupon)}
                      </td>
                      <td data-label="الحالة">
                        <StatusBadge
                          label={COUPON_STATUS[coupon.status].label}
                          tone={COUPON_STATUS[coupon.status].tone}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}