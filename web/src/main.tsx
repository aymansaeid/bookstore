import '@/styles/tokens.css';
import '@/styles/global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';

import { router } from '@/app/router';
import { meKeys } from '@/features/account/queries';
import { getSession, initSession, subscribeSession } from '@/features/auth/session';
import { createQueryClient } from '@/shared/api/queryClient';
import { initCartSync } from '@/features/cart/cartStore';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Kitap Efendi: #root element is missing from index.html');
}

const queryClient = createQueryClient();

// Restore the session from the refresh cookie (API guide §3, step 1). Runs
// outside React so StrictMode's double effects can't fire two refreshes.
initSession();
initCartSync();

// Signing out (here or in another tab) drops every cached customer query.
subscribeSession(() => {
  if (getSession().status === 'guest') queryClient.removeQueries({ queryKey: meKeys.all });
});

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
