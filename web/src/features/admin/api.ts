import { adminRequest } from './session';

/** API §10 GET /api/admin/dashboard. Dates are Istanbul local days (YYYY-MM-DD). */
export interface Dashboard {
  from: string;
  to: string;
  currency: string;
  revenue: number;
  paidOrders: number;
  averageOrderValue: number;
  unitsSold: number;
  ordersAwaitingShipment: number;
  ordersByStatus: Record<string, number>;
  /** Every day of the range, zeros too. */
  dailyRevenue: { date: string; revenue: number; orders: number }[];
  topCountries: { countryCode: string; countryName: string; orders: number; revenue: number }[];
  lowStock: {
    bookId: number;
    title: string;
    availableToSell: number;
    lowStockThreshold: number;
    waitingListCount: number;
  }[];
}

export const adminApi = {
  dashboard: (from: string, to: string, signal?: AbortSignal) =>
    adminRequest<Dashboard>('/api/admin/dashboard', { query: { from, to }, signal }),
};
