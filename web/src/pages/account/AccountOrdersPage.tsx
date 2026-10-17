import { paths } from '@/app/paths';
import { AccountHeader } from '@/features/account/components/AccountHeader';
import shared from '@/features/account/components/account.module.css';
import { OrderCard } from '@/features/account/components/OrderCard';
import { useMyOrders } from '@/features/account/queries';
import { errorMessage } from '@/shared/api/errorMessages';
import { Button, ButtonLink } from '@/shared/ui/Button/Button';

import styles from './AccountDashboardPage.module.css';

/** «طلباتي»: every order of this account, newest first (API §6). */
export default function AccountOrdersPage() {
  const orders = useMyOrders();

  return (
    <>
      <AccountHeader
        title="طلباتي"
        description="طلبات الضيف التي أجريتها ببريد حسابك تظهر هنا أيضاً بعد تأكيده."
      />
      {orders.isPending ? (
        <div className={shared.skeleton} aria-busy="true" aria-label="جارٍ تحميل الطلبات" />
      ) : orders.isError ? (
        <div className={shared.empty} role="alert">
          <p>{errorMessage(orders.error)}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              void orders.refetch();
            }}
          >
            أعد المحاولة
          </Button>
        </div>
      ) : orders.data.length === 0 ? (
        <div className={shared.empty}>
          <p>لا توجد طلبات بعد.</p>
          <ButtonLink to={paths.search} variant="ink" size="sm">
            تصفّح المكتبة
          </ButtonLink>
        </div>
      ) : (
        <ul className={styles.orders}>
          {orders.data.map((order) => (
            <OrderCard key={order.orderNumber} order={order} />
          ))}
        </ul>
      )}
    </>
  );
}
