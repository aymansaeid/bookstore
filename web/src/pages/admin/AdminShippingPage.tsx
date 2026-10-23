import { useEffect, useRef } from 'react';

import styles from '@/features/admin/components/admin.module.css';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import { RecordStatus } from '@/features/admin/components/RecordStatus';
import { adminShippingApi, type AdminShippingZone } from '@/features/admin/shipping/api';
import { DeliveryForm } from '@/features/admin/shipping/components/DeliveryForm';
import shipping from '@/features/admin/shipping/components/Shipping.module.css';
import { ZoneForm } from '@/features/admin/shipping/components/ZoneForm';
import { useAdminZones, useZoneMutation } from '@/features/admin/shipping/queries';
import { useEditParam } from '@/features/admin/useEditParam';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import {
  arabicPlural,
  countriesPhrase,
  countryName,
  formatCount,
  formatMoney,
} from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';

import local from './AdminCatalogPage.module.css';

const zonesPhrase = (count: number) =>
  arabicPlural(count, { one: 'منطقة واحدة', two: 'منطقتان', few: 'مناطق', many: 'منطقة' });

/** «٣ أيام»، «٢–٤ أيام»، «١٠–١٤ يوماً»: the noun agrees with the larger number. */
function daysText(min: number | null, max: number | null): string | null {
  if (min === null || max === null) return null;
  const unit = max >= 3 && max <= 10 ? 'أيام' : max <= 2 ? 'يوم' : 'يوماً';
  return min === max
    ? `${formatCount(max)} ${unit}`
    : `${formatCount(min)}–${formatCount(max)} ${unit}`;
}

function ZoneStatus({ zone, onDeleted }: { zone: AdminShippingZone; onDeleted: () => void }) {
  const toggle = useZoneMutation(
    (isActive: boolean) => adminShippingApi.setActive(zone.id, isActive),
    zone.isActive ? 'أُوقف الشحن إلى هذه المنطقة.' : 'فُعّل الشحن إلى هذه المنطقة.',
  );
  const remove = useZoneMutation(() => adminShippingApi.remove(zone.id), 'حُذفت المنطقة.');
  return (
    <RecordStatus
      isActive={zone.isActive}
      labels={{
        on: 'الشحن إلى هذه المنطقة متاح',
        off: 'الشحن إلى هذه المنطقة موقوف',
        hide: 'إيقاف',
        show: 'تفعيل',
        offEffect: 'لا تظهر دولها عند الدفع حتى تفعّلها.',
      }}
      hideEffect="الإيقاف يمنع الطلب إلى دولها فوراً، ولا يمسّ الطلبات السابقة."
      onToggle={(next) => {
        toggle.mutate(next);
      }}
      toggling={toggle.isPending}
      deleteBlocked={null}
      onDelete={() => {
        remove.mutate(undefined, { onSuccess: onDeleted });
      }}
      deleting={remove.isPending}
    />
  );
}

/** Shipping zones (API §10): which countries we ship to, at what price, how fast. */
export default function AdminShippingPage() {
  const zones = useAdminZones();
  const { edit, open, replace, close } = useEditParam();
  const editorRef = useRef<HTMLElement>(null);
  const all = zones.data ?? [];
  const selected = typeof edit === 'number' ? all.find((z) => z.id === edit) : undefined;
  const showEditor = edit === 'new' || selected !== undefined;

  /** Countries in every zone except the one being edited. */
  const taken = new Map<string, string>();
  for (const zone of all) {
    if (zone.id === selected?.id) continue;
    for (const code of zone.countryCodes) taken.set(code, zone.name);
  }
  const covered = new Set(all.filter((z) => z.isActive).flatMap((z) => z.countryCodes)).size;
  const rows = [...all].sort(
    (a, b) => Number(b.isActive) - Number(a.isActive) || a.name.localeCompare(b.name, 'ar'),
  );

  useEffect(() => {
    if (edit !== null && !window.matchMedia('(min-width: 1100px)').matches) {
      editorRef.current?.scrollIntoView({ block: 'start' });
    }
  }, [edit]);

  return (
    <>
      <AdminPageHeader
        title="الشحن"
        meta={
          zones.data ? (
            <span>
              {zonesPhrase(all.length)} · نشحن إلى {countriesPhrase(covered)}
            </span>
          ) : undefined
        }
        actions={
          <Button
            variant="ink"
            size="sm"
            onClick={() => {
              open('new');
            }}
          >
            + منطقة جديدة
          </Button>
        }
      />

      <div className={cx(local.layout, local.wide)}>
        {showEditor ? (
          <section
            ref={editorRef}
            className={cx(styles.card, local.editor)}
            aria-labelledby="editor-title"
          >
            <div className={local.editorHead}>
              <h2 id="editor-title" className={styles.cardTitle}>
                {selected ? selected.name : 'منطقة جديدة'}
              </h2>
              <Button variant="ghost" size="sm" onClick={close}>
                إغلاق
              </Button>
            </div>
            <ZoneForm
              key={selected ? `zone-${JSON.stringify(selected)}` : 'new'}
              zone={selected ?? null}
              taken={taken}
              onSaved={replace}
            />
            {selected && (
              <>
                <h3 className={styles.cardTitle}>التوصيل</h3>
                <DeliveryForm key={`delivery-${JSON.stringify(selected)}`} zone={selected} />
                <ZoneStatus zone={selected} onDeleted={close} />
              </>
            )}
          </section>
        ) : (
          <aside className={cx(styles.card, local.hint)}>
            <p className={styles.muted}>
              كل دولة تتبع منطقة واحدة، ولكل منطقة سعر شحن عادي، ومدة توصيل، وحد للشحن المجاني،
              وخيارات مدفوعة كالشحن السريع. الدول التي لا تتبع أي منطقة لا يمكن الطلب إليها.
            </p>
          </aside>
        )}

        {zones.isError && !zones.data ? (
          <div className={styles.empty} role="alert">
            <p>{errorMessage(zones.error)}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void zones.refetch();
              }}
            >
              أعد المحاولة
            </Button>
          </div>
        ) : !zones.data ? (
          <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ تحميل مناطق الشحن" />
        ) : rows.length === 0 ? (
          <div className={styles.empty}>
            <p>لا مناطق شحن بعد، فلا يمكن لأحد إتمام الطلب. أضف منطقة تركيا أولاً.</p>
          </div>
        ) : (
          <div className={styles.card}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th scope="col">المنطقة</th>
                  <th scope="col">الشحن العادي</th>
                  <th scope="col">مجاني فوق</th>
                  <th scope="col">خيارات</th>
                  <th scope="col">الحالة</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((zone) => (
                  <tr key={zone.id} className={cx(edit === zone.id && local.selected)}>
                    <td data-label="المنطقة">
                      <span className={local.nameText}>
                        <button
                          type="button"
                          className={cx(styles.rowLink, local.open)}
                          aria-current={edit === zone.id ? 'true' : undefined}
                          onClick={() => {
                            open(zone.id);
                          }}
                        >
                          {zone.name}
                        </button>
                        <span className={shipping.countries}>
                          {countriesPhrase(zone.countryCodes.length)}:{' '}
                          {zone.countryCodes.map(countryName).join('، ')}
                        </span>
                      </span>
                    </td>
                    <td data-label="الشحن العادي" className={styles.num}>
                      {zone.flatRate === 0 ? 'مجاني' : formatMoney(zone.flatRate, zone.currency)}
                      {daysText(zone.standardMinDays, zone.standardMaxDays) && (
                        <span className={styles.sub}>
                          {daysText(zone.standardMinDays, zone.standardMaxDays)}
                        </span>
                      )}
                    </td>
                    <td data-label="مجاني فوق" className={styles.num}>
                      {zone.freeShippingThreshold === null
                        ? '—'
                        : formatMoney(zone.freeShippingThreshold, zone.currency)}
                    </td>
                    <td data-label="خيارات" className={styles.num}>
                      {formatCount(zone.options.length)}
                    </td>
                    <td data-label="الحالة">
                      <StatusBadge
                        label={zone.isActive ? 'متاح' : 'موقوف'}
                        tone={zone.isActive ? 'green' : 'gray'}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}