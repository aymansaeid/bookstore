import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { AccountHeader } from '@/features/account/components/AccountHeader';
import shared from '@/features/account/components/account.module.css';
import { MAX_ADDRESSES } from '@/features/addresses/api';
import { AddressForm } from '@/features/addresses/components/AddressForm';
import { useAddressMutations, useSavedAddresses } from '@/features/addresses/queries';
import { useSession } from '@/features/auth/session';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { countryName, formatCount, LIST_SEPARATOR } from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { FormAlert } from '@/shared/ui/form/Field';
import { Icon } from '@/shared/ui/Icon/Icon';
import { toast } from '@/shared/ui/toast/toastStore';

import styles from './AccountAddressesPage.module.css';

/** «العناوين» (API §7): up to 10, the first saved becomes the default. */
export default function AccountAddressesPage() {
  const { t } = useTranslation('account', { keyPrefix: 'addresses' });
  const { t: tShared } = useTranslation('account', { keyPrefix: 'shared' });
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
              toast.success(editingAddress ? t('saved') : t('added'));
            },
          },
        );
      }}
    />
  );

  return (
    <>
      <AccountHeader
        title={t('title')}
        description={t('lead', { n: formatCount(MAX_ADDRESSES) })}
        action={
          <Button
            variant="ink"
            size="sm"
            disabled={full || editing === 'new' || addresses.isPending}
            onClick={() => {
              startEdit('new');
            }}
          >
            <Icon name="plus" size={16} /> {t('new')}
          </Button>
        }
      />
      {full && <p className={shared.muted}>{t('full')}</p>}

      {editing === 'new' && form}

      {(remove.isError || makeDefault.isError) && (
        <FormAlert>{errorMessage(remove.error ?? makeDefault.error)}</FormAlert>
      )}

      {addresses.isPending ? (
        <div className={shared.skeleton} aria-busy="true" aria-label={t('loading')} />
      ) : addresses.isError ? (
        <div className={shared.empty} role="alert">
          <p>{errorMessage(addresses.error)}</p>
        </div>
      ) : list.length === 0 ? (
        editing === null && (
          <div className={shared.empty}>
            <Icon name="pin" size={28} />
            <p>{t('none')}</p>
            <Button
              variant="ink"
              size="sm"
              onClick={() => {
                startEdit('new');
              }}
            >
              {t('addFirst')}
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
                  {address.isDefault && <span className={styles.badge}>{t('default')}</span>}
                </div>
                <p className={styles.lines}>
                  <span>{address.recipientName}</span>
                  <span>{[address.line1, address.line2].filter(Boolean).join(LIST_SEPARATOR)}</span>
                  <span>
                    {[
                      address.city,
                      address.stateOrProvince,
                      address.postalCode,
                      countryName(address.countryCode),
                    ]
                      .filter(Boolean)
                      .join(LIST_SEPARATOR)}
                  </span>
                  <span dir="ltr" className={styles.phone}>
                    {address.phone}
                  </span>
                </p>

                {confirmDelete === address.id ? (
                  <div className={styles.confirm}>
                    <p>{t('confirmDelete', { label: address.label })}</p>
                    <div className={styles.actions}>
                      <Button
                        variant="red"
                        size="sm"
                        disabled={remove.isPending}
                        onClick={() => {
                          remove.mutate(address.id, {
                            onSuccess: () => {
                              setConfirmDelete(null);
                              toast.success(t('deleted'));
                            },
                          });
                        }}
                      >
                        {remove.isPending ? tShared('deleting') : tShared('yesDelete')}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setConfirmDelete(null);
                        }}
                      >
                        {tShared('back')}
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
                      {tShared('edit')}
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
                        {t('makeDefault')}
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setConfirmDelete(address.id);
                      }}
                    >
                      {tShared('delete')}
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