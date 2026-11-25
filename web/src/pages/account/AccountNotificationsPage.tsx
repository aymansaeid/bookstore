import type { TFunction } from 'i18next';
import { useTranslation } from 'react-i18next';
import { Link, useSearchParams } from 'react-router';

import { paths } from '@/app/paths';
import { AccountHeader } from '@/features/account/components/AccountHeader';
import shared from '@/features/account/components/account.module.css';
import type { CustomerNotification } from '@/features/notifications/api';
import { useMarkNotificationsRead, useNotifications } from '@/features/notifications/queries';
import { errorMessage } from '@/shared/api/errorMessages';
import { cx } from '@/shared/lib/cx';
import { formatDateTime, formatMoney } from '@/shared/lib/format';
import { usePageParam } from '@/shared/lib/usePageParam';
import { Button } from '@/shared/ui/Button/Button';
import { Icon } from '@/shared/ui/Icon/Icon';
import type { IconName } from '@/shared/ui/Icon/icons';
import { Pagination } from '@/shared/ui/Pagination/Pagination';

import styles from './AccountNotificationsPage.module.css';

/** Each notification is facts; the sentence is ours (API §7c). */
function describe(
  t: TFunction<'account', 'notifications'>,
  quote: (title: string) => string,
  n: CustomerNotification,
): { text: string; to: string | null; icon: IconName } {
  const book = n.bookTitle ? quote(n.bookTitle) : t('someBook');
  const bookLink = n.bookSlug ? paths.book(n.bookSlug) : null;
  switch (n.type) {
    case 'OrderShipped':
      return {
        text: t('shipped', { number: n.orderNumber ?? '' }),
        to: n.orderNumber ? paths.account.order(n.orderNumber) : paths.account.orders,
        icon: 'truck',
      };
    case 'BackInStock':
      return { text: t('backInStock', { book }), to: bookLink, icon: 'box' };
    case 'PriceDrop':
      return {
        text:
          n.oldPrice !== null && n.newPrice !== null
            ? t('priceDropFrom', {
                book,
                old: formatMoney(n.oldPrice, n.currency ?? 'TRY'),
                new: formatMoney(n.newPrice, n.currency ?? 'TRY'),
              })
            : t('priceDrop', { book }),
        to: bookLink,
        icon: 'gift',
      };
    case 'NewFromFollowedMuhaqqiq':
      return {
        text: t('newEdition', { name: n.muhaqqiqName ?? t('someMuhaqqiq'), book }),
        to: bookLink ?? (n.muhaqqiqSlug ? paths.muhaqqiq(n.muhaqqiqSlug) : null),
        icon: 'user',
      };
  }
}

/** «الإشعارات» (API §7c): newest first, mark one or all as read. */
export default function AccountNotificationsPage() {
  const { t } = useTranslation('account', { keyPrefix: 'notifications' });
  const { t: tShared } = useTranslation('account', { keyPrefix: 'shared' });
  const quote = (title: string) => tShared('quoted', { title });
  const [params, setParams] = useSearchParams();
  const { page, hrefFor } = usePageParam();
  const unreadOnly = params.get('filter') === 'unread';
  const notifications = useNotifications(page, unreadOnly);
  const { one, all } = useMarkNotificationsRead();
  const data = notifications.data;

  const setFilter = (unread: boolean) => {
    setParams(unread ? { filter: 'unread' } : {}, { replace: true });
  };

  return (
    <>
      <AccountHeader
        title={t('title')}
        action={
          data && data.unreadCount > 0 ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={all.isPending}
              onClick={() => {
                all.mutate();
              }}
            >
              <Icon name="check" size={16} /> {t('markAll')}
            </Button>
          ) : undefined
        }
      />

      <div className={styles.filters} role="group" aria-label={t('filter')}>
        <button
          type="button"
          className={cx(styles.filter, !unreadOnly && styles.on)}
          aria-pressed={!unreadOnly}
          onClick={() => {
            setFilter(false);
          }}
        >
          {t('all')}
        </button>
        <button
          type="button"
          className={cx(styles.filter, unreadOnly && styles.on)}
          aria-pressed={unreadOnly}
          onClick={() => {
            setFilter(true);
          }}
        >
          {t('unread')}
        </button>
      </div>

      {notifications.isError ? (
        <div className={shared.empty} role="alert">
          <p>{errorMessage(notifications.error)}</p>
        </div>
      ) : !data ? (
        <div className={shared.skeleton} aria-busy="true" aria-label={t('loading')} />
      ) : data.notifications.items.length === 0 ? (
        <div className={shared.empty}>
          <Icon name="bell" size={28} />
          <p>{unreadOnly ? t('noneUnread') : t('none')}</p>
          <p className={shared.muted}>{t('hint')}</p>
        </div>
      ) : (
        <>
          <ul className={cx(styles.list, notifications.isPlaceholderData && styles.stale)}>
            {data.notifications.items.map((notification) => {
              const { text, to, icon } = describe(t, quote, notification);
              const markRead = () => {
                if (!notification.isRead) one.mutate(notification.id);
              };
              return (
                <li
                  key={notification.id}
                  className={cx(styles.item, !notification.isRead && styles.unread)}
                >
                  <span className={styles.icon} aria-hidden="true">
                    {notification.coverThumbnailUrl ? (
                      <img src={notification.coverThumbnailUrl} alt="" width={40} height={58} />
                    ) : (
                      <Icon name={icon} size={20} />
                    )}
                  </span>
                  <div className={styles.body}>
                    {to ? (
                      <Link to={to} className={styles.text} onClick={markRead}>
                        {text}
                      </Link>
                    ) : (
                      <p className={styles.text}>{text}</p>
                    )}
                    <span className={styles.date}>{formatDateTime(notification.createdAtUtc)}</span>
                  </div>
                  {!notification.isRead && (
                    <button
                      type="button"
                      className={styles.read}
                      aria-label={t('markRead')}
                      title={t('markRead')}
                      onClick={markRead}
                    >
                      <span className={styles.dot} aria-hidden="true" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
          <Pagination
            page={data.notifications.page}
            totalPages={data.notifications.totalPages}
            hrefFor={hrefFor}
          />
        </>
      )}
    </>
  );
}