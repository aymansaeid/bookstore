import { paths } from '@/app/paths';

const withOrder = (path: string, orderNumber: string) =>
  `${path}?${new URLSearchParams({ order: orderNumber }).toString()}`;

/** /track?order=… (the same URL the order emails link to, API §11). */
export const trackOrderUrl = (orderNumber: string) => withOrder(paths.trackOrder, orderNumber);

/** /returns?order=… */
export const returnsUrl = (orderNumber: string) => withOrder(paths.returns, orderNumber);
