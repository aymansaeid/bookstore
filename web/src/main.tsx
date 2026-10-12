import '@/styles/tokens.css';
import '@/styles/global.css';

import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';

import { router } from '@/app/router';
import { createQueryClient } from '@/shared/api/queryClient';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Kitap Efendi: #root element is missing from index.html');
}

const queryClient = createQueryClient();

createRoot(container).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>,
);
