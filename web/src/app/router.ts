import { createBrowserRouter } from 'react-router';

import { routes } from '@/app/routes';

/** Created once, outside React, as React Router requires for data routers. */
export const router = createBrowserRouter(routes);
