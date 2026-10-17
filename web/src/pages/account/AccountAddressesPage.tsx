import { useState } from 'react';

import { AccountHeader } from '@/features/account/components/AccountHeader';
import shared from '@/features/account/components/account.module.css';
import { MAX_ADDRESSES } from '@/features/addresses/api';
import { AddressForm } from '@/features/addresses/components/AddressForm';
import { useAddressMutations, useSavedAddresses } from '@/features/addresses/queries';
import { useSession } from '@/features/auth/session';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { countryName, formatCount } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { FormAlert } from '@/shared/ui/form/Field';
import { Icon } from '@/shared/ui/Icon/Icon';
import { toast } from '@/shared/ui/toast/toastStore';

import styles from './AccountAddressesPage.module.css';

/** «العناوين» (API §7): up to 10, the first saved becomes the default. */
export default function AccountAddressesPage() {
  const { customer } = useSession();
  const addresses = useSavedAddresses();
  const { save, remove, makeDefault } = useAddressMutations();
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<number | null>(null);

  const list = addresses.data ?? [];
  const full = list.length >= MAX_ADDRESSES;
  const editingAddress = typeof editing === 'number' ? list.find((a) => a.id === editing) : null;

  const startEdit = (target: number | 'new') => {
    save.reset();
    setConfirmDelete(null);
    setEditing(target);
  };

  const form = editing !== null && (
    <AddressForm
      key={String(editing)}
      address={editingAddress ?? null}
      isFirst={list.length === 0}
      defaults={
        customer
          ? {
              recipientName: `${customer.firstName} ${customer.lastName}`.trim(),
              phone: customer.phone ?? '',
            }
          : undefined
      }
      busy={save.isPending}
      error={save.error}
      onCancel={() => {
        setEditing(null);
      }}
      onSubmit={(address, isDefault) => {
        save.mutate(
          { id: editingAddress?.id ?? null, address, isDefault },
          {
            onSuccess: () => {
              setEditing(null);
              toast.success(editingAddress ? 'حُفظ التعديل.' : 'أُضيف العنوان.');
            },
          },
        );
      }}
    />
  );

  return (
    <>
      <AccountHeader
        title="العناوين"
        description={`احفظ حتى ${formatCount(MAX_ADDRESSES)} عناوين لتختار منها عند الدفع.`}
        action={
          <Button
            variant="ink"
            size="sm"
            disabled={full || editing === 'new' || addresses.isPending}
            onClick={() => {
              startEdit('new');
            }}
          >
            <Icon name="plus" size={16} /> عنوان جديد
          </Button>
        }
      />
      {full && <p className={shared.muted}>وصلت إلى الحد الأقصى. احذف عنواناً لإضافة آخر.</p>}

      {editing === 'new' && form}

      {(remove.isError || makeDefault.isError) && (
        <FormAlert>{errorMessage(remove.error ?? makeDefault.error)}</FormAlert>
      )}

      {addresses.isPending ? (
        <div className={shared.skeleton} aria-busy="true" aria-label="جارٍ تحميل العناوين" />
      ) : addresses.isError ? (
        <div className={shared.empty} role="alert">
          <p>{errorMessage(addresses.error)}</p>
        </div>
      ) : list.length === 0 ? (
        editing === null && (
          <div className={shared.empty}>
            <Icon name="pin" size={28} />
            <p>لا توجد عناوين محفوظة بعد.</p>
            <Button
              variant="ink"
              size="sm"
              onClick={() => {
                startEdit('new');
              }}
            >
              أضف أول عنوان
            </Button>
          </div>
        )
      ) : (
        <ul className={styles.grid}>
          {list.map((address) =>
            editing === address.id ? (
              <li key={address.id} className={styles.wide}>
                {form}
              </li>
            ) : (
              <li key={address.id} className={cx(styles.card, address.isDefault && styles.default)}>
                <div className={styles.head}>
                  <h2 className={styles.label}>{address.label}</h2>
                  {address.isDefault && <span className={styles.badge}>الافتراضي</span>}
                </div>
                <p className={styles.lines}>
                  <span>{address.recipientName}</span>
                  <span>{[address.line1, address.line2].filter(Boolean).join('، ')}</span>
                  <span>
                    {[
                      address.city,
                      address.stateOrProvince,
                      address.postalCode,
                      countryName(address.countryCode),
                    ]
                      .filter(Boolean)
                      .join('، ')}
                  </span>
                  <span dir="ltr" className={styles.phone}>
                    {address.phone}
                  </span>
                </p>

                {confirmDelete === address.id ? (
                  <div className={styles.confirm}>
                    <p>حذف «{address.label}»؟</p>
                    <div className={styles.actions}>
                      <Button
                        variant="red"
                        size="sm"
                        disabled={remove.isPending}
                        onClick={() => {
                          remove.mutate(address.id, {
                            onSuccess: () => {
                              setConfirmDelete(null);
                              toast.success('حُذف العنوان.');
                            },
                          });
                        }}
                      >
                        {remove.isPending ? 'جارٍ الحذف…' : 'نعم، احذف'}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setConfirmDelete(null);
                        }}
                      >
                        تراجع
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className={styles.actions}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        startEdit(address.id);
                      }}
                    >
                      تعديل
                    </Button>
                    {!address.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={makeDefault.isPending}
                        onClick={() => {
                          makeDefault.mutate(address.id);
                        }}
                      >
                        اجعله الافتراضي
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setConfirmDelete(address.id);
                      }}
                    >
                      حذف
                    </Button>
                  </div>
                )}
              </li>
            ),
          )}
        </ul>
      )}
    </>
  );
}
