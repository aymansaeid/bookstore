import { useLocation, useNavigate, useSearchParams } from 'react-router';

import type { OrderLookup } from './types';

interface LookupState {
  email?: unknown;
}

/**
 * The order being looked at on /track and /returns. The number lives in the
 * URL (?order=, as in the emails); the email only in the history entry's
 * state, so it never appears in an address bar or a shared link, yet
 * survives a reload.
 */
export function useOrderLookup() {
  const [params] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();

  const orderNumber = params.get('order')?.trim() ?? '';
  const state = location.state as LookupState | null;
  const email = typeof state?.email === 'string' ? state.email : '';
  const lookup: OrderLookup | null =
    orderNumber !== '' && email !== '' ? { orderNumber, email } : null;

  const setLookup = (next: OrderLookup) => {
    void navigate(
      { search: `?${new URLSearchParams({ order: next.orderNumber }).toString()}` },
      { replace: true, state: { email: next.email } },
    );
  };
  const clear = () => {
    void navigate({ search: '' }, { replace: true, state: null });
  };

  return { lookup, orderNumber, email, setLookup, clear };
}
