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
function describe(n: CustomerNotification): { text: string; to: string | null; icon: IconName } {
  const book = n.bookTitle ? `«${n.bookTitle}»` : 'كتاب في مفضلتك';
  const bookLink = n.bookSlug ? paths.book(n.bookSlug) : null;
  switch (n.type) {
    case 'OrderShipped':
      return {
        text: `شُحن طلبك ${n.orderNumber ?? ''}. يمكنك متابعة الشحنة من صفحة الطلب.`,
        to: n.orderNumber ? paths.account.order(n.orderNumber) : paths.account.orders,
        icon: 'truck',
      };
    case 'BackInStock':
      return { text: `عاد ${book} إلى المخزون.`, to: bookLink, icon: 'box' };
    case 'PriceDrop':
      return {
        text:
          n.oldPrice !== null && n.newPrice !== null
            ? `انخفض سعر ${book} من ${formatMoney(n.oldPrice, n.currency ?? 'TRY')} إلى ${formatMoney(n.newPrice, n.currency ?? 'TRY')}.`
            : `انخفض سعر ${book}.`,
        to: bookLink,
        icon: 'gift',
      };
    case 'NewFromFollowedMuhaqqiq':
      return {
        text: `صدر تحقيق جديد لـ${n.muhaqqiqName ?? 'محقّق تتابعه'}: ${book}.`,
        to: bookLink ?? (n.muhaqqiqSlug ? paths.muhaqqiq(n.muhaqqiqSlug) : null),
        icon: 'user',
      };
  }
}

/** «الإشعارات» (API §7c): newest first, mark one or all as read. */
export default function AccountNotificationsPage() {
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
        title="الإشعارات"
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
              <Icon name="check" size={16} /> تعليم الكل كمقروء
            </Button>
          ) : undefined
        }
      />

      <div className={styles.filters} role="group" aria-label="تصفية الإشعارات">
        <button
          type="button"
          className={cx(styles.filter, !unreadOnly && styles.on)}
          aria-pressed={!unreadOnly}
          onClick={() => {
            setFilter(false);
          }}
        >
          الكل
        </button>
        <button
          type="button"
          className={cx(styles.filter, unreadOnly && styles.on)}
          aria-pressed={unreadOnly}
          onClick={() => {
            setFilter(true);
          }}
        >
          غير المقروءة
        </button>
      </div>

      {notifications.isError ? (
        <div className={shared.empty} role="alert">
          <p>{errorMessage(notifications.error)}</p>
        </div>
      ) : !data ? (
        <div className={shared.skeleton} aria-busy="true" aria-label="جارٍ تحميل الإشعارات" />
      ) : data.notifications.items.length === 0 ? (
        <div className={shared.empty}>
          <Icon name="bell" size={28} />
          <p>{unreadOnly ? 'لا إشعارات غير مقروءة.' : 'لا إشعارات بعد.'}</p>
          <p className={shared.muted}>
            ننبّهك هنا عند شحن طلباتك، وعودة كتاب إلى المخزون، وانخفاض الأسعار، وإصدارات من تتابعهم.
          </p>
        </div>
      ) : (
        <>
          <ul className={cx(styles.list, notifications.isPlaceholderData && styles.stale)}>
            {data.notifications.items.map((notification) => {
              const { text, to, icon } = describe(notification);
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
                      aria-label="تعليم كمقروء"
                      title="تعليم كمقروء"
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
