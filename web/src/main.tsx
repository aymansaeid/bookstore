import '@/styles/tokens.css';
import '@/styles/global.css';
import '@/i18n';

import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';

import { readSavedLanguage, startupRedirect } from '@/app/languagePreference';
import { router } from '@/app/router';
import { RouteLoading } from '@/app/RouteLoading';
import { meKeys } from '@/features/account/queries';
import { getSession, initSession, subscribeSession } from '@/features/auth/session';
import { initCartSync } from '@/features/cart/cartStore';
import { applyDocumentLanguage } from '@/i18n/document';
import { createQueryClient } from '@/shared/api/queryClient';

function start(container: HTMLElement) {
  applyDocumentLanguage();

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
        {/* Translation files load on demand; a page waits here until its text is ready. */}
        <Suspense fallback={<RouteLoading />}>
          <RouterProvider router={router} />
        </Suspense>
      </QueryClientProvider>
    </StrictMode>,
  );
}

const container = document.getElementById('root');
if (!container) {
  throw new Error('Kitap Efendi: #root element is missing from index.html');
}

// Wrong-language URL (admin under /en, a language not live yet, or an Arabic
// link for someone who chose English): go there before anything renders.
const redirect = startupRedirect(window.location, readSavedLanguage());
if (redirect) window.location.replace(redirect);
else start(container);