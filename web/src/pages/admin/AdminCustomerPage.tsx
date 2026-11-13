import { Link, useParams } from 'react-router';

import { paths } from '@/app/paths';
import styles from '@/features/admin/components/admin.module.css';
import { AdminPageHeader } from '@/features/admin/components/AdminPageHeader';
import type { AdminCustomer } from '@/features/admin/customers/api';
import { CustomerActions } from '@/features/admin/customers/components/CustomerActions';
import { PointsHistory } from '@/features/admin/customers/components/PointsHistory';
import { accountState, devicesPhrase, pointsPhrase } from '@/features/admin/customers/labels';
import { useAdminCustomer } from '@/features/admin/customers/queries';
import NotFoundPage from '@/pages/not-found/NotFoundPage';
import { isApiError } from '@/shared/api/ApiError';
import { levelLabel, orderStatusInfo, tierLabel } from '@/shared/api/enums';
import { errorMessage } from '@/shared/api/errorMessages';
import {
  countryName,
  formatCount,
  formatDate,
  formatDateTime,
  formatMoney,
} from '@/shared/lib/format';
import { Button } from '@/shared/ui/Button/Button';
import { StatusBadge } from '@/shared/ui/StatusBadge/StatusBadge';

import local from './AdminCustomersPage.module.css';
import page from './AdminOrderPage.module.css';

const displayName = (customer: { isAnonymized: boolean; fullName: string; id: number }) =>
  customer.isAnonymized ? `حساب محذوف رقم ${formatCount(customer.id)}` : customer.fullName;

function Figures({ customer }: { customer: AdminCustomer }) {
  const { stats, loyalty } = customer;
  const cards = [
    {
      label: 'الطلبات المدفوعة',
      value: formatCount(stats.orderCount),
      sub:
        stats.cancelledOrderCount > 0
          ? `طلبات ملغاة: ${formatCount(stats.cancelledOrderCount)}`
          : undefined,
    },
    {
      label: 'صافي الإنفاق',
      value: formatMoney(stats.netSpent, stats.currency),
      sub:
        stats.refundedTotal > 0
          ? `من ${formatMoney(stats.totalSpent, stats.currency)} بعد استرداد ${formatMoney(stats.refundedTotal, stats.currency)}`
          : undefined,
    },
    {
      label: 'متوسط الطلب',
      value: formatMoney(stats.averageOrderValue, stats.currency),
      sub: undefined,
    },
    {
      label: 'رصيد النقاط',
      value: formatCount(loyalty.balance),
      sub:
        loyalty.pendingPoints > 0
          ? `${tierLabel(loyalty.tier)} · قيد التأكيد: ${formatCount(loyalty.pendingPoints)}`
          : tierLabel(loyalty.tier),
    },
  ];

  return (
    <ul className={local.cards} aria-label="أرقام العميل">
      {cards.map((card) => (
        <li key={card.label} className={local.card}>
          <p className={local.cardLabel}>{card.label}</p>
          <p className={local.cardValue}>{card.value}</p>
          {card.sub && <p className={local.cardSub}>{card.sub}</p>}
        </li>
      ))}
    </ul>
  );
}

function RecentOrders({ customer }: { customer: AdminCustomer }) {
  const allOrders = `${paths.admin.orders}?search=${encodeURIComponent(customer.email)}`;
  return (
    <section className={styles.card} aria-labelledby="customer-orders-title">
      <h2 id="customer-orders-title" className={styles.cardTitle}>
        أحدث الطلبات
      </h2>
      {customer.recentOrders.length === 0 ? (
        <p className={styles.muted}>لم يطلب شيئاً بعد.</p>
      ) : (
        <>
          <table className={styles.table}>
            <thead>
              <tr>
                <th scope="col">الطلب</th>
                <th scope="col">الحالة</th>
                <th scope="col">النسخ</th>
                <th scope="col">الإجمالي</th>
                <th scope="col">التاريخ</th>
              </tr>
            </thead>
            <tbody>
              {customer.recentOrders.map((order) => {
                const info = orderStatusInfo(order.status);
                return (
                  <tr key={order.id}>
                    <td data-label="الطلب">
                      <Link to={paths.admin.order(order.id)} className={styles.rowLink} dir="ltr">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td data-label="الحالة">
                      <StatusBadge
                        label={order.status === 'Paid' ? 'بانتظار الشحن' : info.label}
                        tone={info.tone}
                      />
                    </td>
                    <td data-label="النسخ" className={styles.num}>
                      {formatCount(order.itemCount)}
                    </td>
                    <td data-label="الإجمالي" className={styles.num}>
                      {formatMoney(order.total, order.currency)}
                    </td>
                    <td data-label="التاريخ" className={styles.num}>
                      {formatDateTime(order.createdAtUtc)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {!customer.isAnonymized && (
            <Link to={allOrders} className={local.more}>
              كل طلباته
            </Link>
          )}
        </>
      )}
    </section>
  );
}

function Addresses({ customer }: { customer: AdminCustomer }) {
  if (customer.addresses.length === 0) return null;
  return (
    <section className={styles.card} aria-labelledby="customer-addresses-title">
      <h2 id="customer-addresses-title" className={styles.cardTitle}>
        العناوين المحفوظة
      </h2>
      <div className={local.addresses}>
        {customer.addresses.map((address) => (
          <address key={address.id} className={local.address}>
            <span className={local.addressHead}>
              <b>{address.label}</b>
              {address.isDefault && <StatusBadge label="الافتراضي" tone="gold" />}
            </span>
            <span>{address.recipientName}</span>
            <a href={`tel:${address.phone.replace(/\s+/g, '')}`} dir="ltr" className={local.email}>
              {address.phone}
            </a>
            <span>{address.line1}</span>
            {address.line2 && <span>{address.line2}</span>}
            <span>
              {address.city}
              {address.stateOrProvince && ` · ${address.stateOrProvince}`}
            </span>
            <span>
              <bdi>{address.postalCode}</bdi> · {countryName(address.countryCode)}
            </span>
          </address>
        ))}
      </div>
    </section>
  );
}

/** «ما يعرفه أفندي عنك»: shown only if the customer filled any of it. */
function ReaderProfile({ customer }: { customer: AdminCustomer }) {
  const { readingLevel, monthlyBudget, interests } = customer;
  if (readingLevel === null && monthlyBudget === null && interests.length === 0) return null;
  return (
    <section className={styles.card} aria-labelledby="customer-reader-title">
      <h2 id="customer-reader-title" className={styles.cardTitle}>
        ملف القارئ
      </h2>
      <dl className={styles.facts}>
        <div>
          <dt>المستوى</dt>
          <dd>{readingLevel ? levelLabel(readingLevel) : '—'}</dd>
        </div>
        <div>
          <dt>الميزانية الشهرية</dt>
          <dd>{monthlyBudget === null ? '—' : formatMoney(monthlyBudget)}</dd>
        </div>
        <div>
          <dt>الاهتمامات</dt>
          <dd>
            {interests.length === 0 ? (
              '—'
            ) : (
              <span className={local.chips}>
                {interests.map((interest) => (
                  <span key={interest.id} className={local.chip}>
                    {interest.name}
                  </span>
                ))}
              </span>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}

function Account({ customer }: { customer: AdminCustomer }) {
  const { activity, stats, loyalty } = customer;
  return (
    <section className={styles.card} aria-labelledby="customer-account-title">
      <h2 id="customer-account-title" className={styles.cardTitle}>
        الحساب
      </h2>
      <dl className={styles.facts}>
        <div>
          <dt>رقم العميل</dt>
          <dd dir="ltr">#{customer.id}</dd>
        </div>
        {!customer.isAnonymized && (
          <>
            <div>
              <dt>البريد</dt>
              <dd>
                <a href={`mailto:${customer.email}`} dir="ltr">
                  {customer.email}
                </a>
              </dd>
            </div>
            <div>
              <dt>الهاتف</dt>
              <dd>
                {customer.phone ? (
                  <a href={`tel:${customer.phone.replace(/\s+/g, '')}`} dir="ltr">
                    {customer.phone}
                  </a>
                ) : (
                  '—'
                )}
              </dd>
            </div>
            <div>
              <dt>تفعيل البريد</dt>
              <dd>
                {customer.emailVerifiedAtUtc
                  ? formatDateTime(customer.emailVerifiedAtUtc)
                  : customer.isEmailVerified
                    ? 'مفعّل'
                    : 'لم يُفعَّل بعد'}
              </dd>
            </div>
            <div>
              <dt>الرسائل التسويقية</dt>
              <dd>{customer.acceptsMarketingEmails ? 'يقبلها' : 'لا يقبلها'}</dd>
            </div>
          </>
        )}
        <div>
          <dt>التسجيل</dt>
          <dd>{formatDateTime(customer.createdAtUtc)}</dd>
        </div>
        <div>
          <dt>آخر دخول</dt>
          <dd>{customer.lastLoginAtUtc ? formatDateTime(customer.lastLoginAtUtc) : '—'}</dd>
        </div>
        <div>
          <dt>مسجّل الدخول على</dt>
          <dd>
            {activity.activeSessions === 0 ? 'لا أجهزة' : devicesPhrase(activity.activeSessions)}
          </dd>
        </div>
      </dl>

      <h3 className={styles.actionTitle}>النشاط</h3>
      <dl className={styles.facts}>
        <div>
          <dt>أول طلب</dt>
          <dd>{stats.firstOrderAtUtc ? formatDate(stats.firstOrderAtUtc) : '—'}</dd>
        </div>
        <div>
          <dt>آخر طلب</dt>
          <dd>{stats.lastOrderAtUtc ? formatDate(stats.lastOrderAtUtc) : '—'}</dd>
        </div>
        <div>
          <dt>في مكتبته</dt>
          <dd>{formatCount(activity.booksOwned)}</dd>
        </div>
        <div>
          <dt>قائمة الرغبات</dt>
          <dd>{formatCount(activity.wishlistCount)}</dd>
        </div>
        <div>
          <dt>مراجعات منشورة</dt>
          <dd>{formatCount(activity.approvedReviews)}</dd>
        </div>
        {activity.pendingReviews > 0 && (
          <div>
            <dt>مراجعات بانتظار النشر</dt>
            <dd>
              <Link to={paths.admin.reviews} className={styles.rowLink}>
                {formatCount(activity.pendingReviews)}
              </Link>
            </dd>
          </div>
        )}
        <div>
          <dt>إرجاعات مفتوحة</dt>
          <dd>
            {activity.openReturns > 0 ? (
              <Link to={paths.admin.returns} className={styles.rowLink}>
                {formatCount(activity.openReturns)}
              </Link>
            ) : (
              '٠'
            )}
          </dd>
        </div>
        <div>
          <dt>المستوى</dt>
          <dd>
            {tierLabel(loyalty.tier)}
            {loyalty.nextTier && (
              <span className={styles.sub}>
                باقي {pointsPhrase(loyalty.nextTier.pointsNeeded)} للترقية إلى «
                {tierLabel(loyalty.nextTier.tier)}»
              </span>
            )}
          </dd>
        </div>
      </dl>
    </section>
  );
}

/** One customer (API §10b): profile, figures, orders, points and account actions. */
export default function AdminCustomerPage() {
  const { id = '' } = useParams();
  const customerId = /^\d+$/.test(id) ? Number(id) : 0;
  const query = useAdminCustomer(customerId);
  const customer = query.data;
  const back = { to: paths.admin.customers, label: 'العملاء' };

  if (
    customerId === 0 ||
    (query.isError && isApiError(query.error) && query.error.status === 404)
  ) {
    return <NotFoundPage backTo={paths.admin.customers} backLabel="العودة إلى العملاء" />;
  }

  if (!customer) {
    return (
      <>
        <AdminPageHeader title="العميل" back={back} />
        {query.isError ? (
          <div className={styles.empty} role="alert">
            <p>{errorMessage(query.error)}</p>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                void query.refetch();
              }}
            >
              أعد المحاولة
            </Button>
          </div>
        ) : (
          <div className={styles.skeleton} aria-busy="true" aria-label="جارٍ تحميل العميل" />
        )}
      </>
    );
  }

  const state = accountState(customer);

  return (
    <>
      <AdminPageHeader
        title={displayName(customer)}
        back={back}
        meta={
          <>
            <StatusBadge label={state.label} tone={state.tone} />
            <span>عميل منذ {formatDate(customer.createdAtUtc)}</span>
          </>
        }
      />

      <Figures customer={customer} />

      <div className={page.layout}>
        <div className={page.main}>
          <RecentOrders customer={customer} />

          <section className={styles.card} aria-labelledby="customer-points-title">
            <h2 id="customer-points-title" className={styles.cardTitle}>
              سجل النقاط
            </h2>
            <PointsHistory customerId={customer.id} />
          </section>

          <Addresses customer={customer} />
          <ReaderProfile customer={customer} />
        </div>

        <div className={page.side}>
          <section className={styles.card} aria-labelledby="customer-actions-title">
            <h2 id="customer-actions-title" className={styles.cardTitle}>
              الإجراءات
            </h2>
            <CustomerActions customer={customer} />
          </section>
          <Account customer={customer} />
        </div>
      </div>
    </>
  );
}