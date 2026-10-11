import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';

import { router } from '@/app/router';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Kitap Efendi: #root element is missing from index.html');
}

createRoot(container).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
