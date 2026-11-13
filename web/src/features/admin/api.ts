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

/** API §10c: one KPI card. changePercent is null when the previous value was 0. */
export interface KpiCard {
  value: number;
  previous: number;
  changePercent: number | null;
  /** One point per day of the period, oldest first, zeros included. */
  series: { date: string; value: number }[];
}

/** API §10c GET /api/admin/kpis. Days are Istanbul days. */
export interface Kpis {
  periodDays: number;
  fromDate: string;
  toDate: string;
  currency: string;
  revenue: KpiCard;
  orders: KpiCard;
  averageOrderValue: KpiCard;
  /** Return requests per 100 delivered orders; its series counts requests per day. */
  returnRate: KpiCard;
  refundedAmount: number;
  /** Always null until the AI assistant exists. */
  salesViaEfendiPercent: number | null;
}

export const adminApi = {
  dashboard: (from: string, to: string, signal?: AbortSignal) =>
    adminRequest<Dashboard>('/api/admin/dashboard', { query: { from, to }, signal }),
  /** days: 7 to 90. */
  kpis: (days: number, signal?: AbortSignal) =>
    adminRequest<Kpis>('/api/admin/kpis', { query: { days }, signal }),
};
