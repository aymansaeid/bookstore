import { useQueryClient } from '@tanstack/react-query';
import { useParams } from 'react-router';

import { paths } from '@/app/paths';
import { AccountHeader } from '@/features/account/components/AccountHeader';
import shared from '@/features/account/components/account.module.css';
import { meKeys, useCustomerId, useMyOrders } from '@/features/account/queries';
import { useSession } from '@/features/auth/session';
import { OrderDetails } from '@/features/orders/components/OrderDetails';
import type { PublicOrder } from '@/features/orders/types';
import { errorMessage } from '@/shared/api/errorMessages';
import { ButtonLink } from '@/shared/ui/Button/Button';
import { Icon } from '@/shared/ui/Icon/Icon';

/**
 * /account/orders/:orderNumber. The API has no single-order endpoint for
 * customers, so the order comes from the «طلباتي» list (one cached call).
 */
export default function AccountOrderPage() {
  const { orderNumber = '' } = useParams();
  const { customer } = useSession();
  const customerId = useCustomerId();
  const queryClient = useQueryClient();
  const orders = useMyOrders();

  const order = orders.data?.find(
    (item) => item.orderNumber.toUpperCase() === orderNumber.toUpperCase(),
  );
  const back = (
    <ButtonLink to={paths.account.orders} variant="ghost" size="sm">
      <Icon name="arrowr" size={16} /> كل الطلبات
    </ButtonLink>
  );

  if (orders.isPending) {
    return <div className={shared.skeleton} aria-busy="true" aria-label="جارٍ تحميل الطلب" />;
  }
  if (orders.isError || !order || !customer) {
    return (
      <>
        <AccountHeader title="الطلب" action={back} />
        <div className={shared.empty} role="alert">
          <p>{orders.isError ? errorMessage(orders.error) : 'لم نجد هذا الطلب في حسابك.'}</p>
        </div>
      </>
    );
  }

  const key = meKeys.orders(customerId ?? 0);
  return (
    <>
      <AccountHeader title="تفاصيل الطلب" action={back} />
      <OrderDetails
        order={order}
        // The order is filed under the account's verified email (API §5).
        lookup={{ orderNumber: order.orderNumber, email: customer.email }}
        onCancelled={(updated) => {
          queryClient.setQueryData<PublicOrder[]>(key, (list) =>
            list?.map((item) => (item.orderNumber === updated.orderNumber ? updated : item)),
          );
          void queryClient.invalidateQueries({ queryKey: meKeys.summary(customerId ?? 0) });
        }}
        onStale={() => {
          void orders.refetch();
        }}
      />
    </>
  );
}
