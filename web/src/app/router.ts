import { createBrowserRouter } from 'react-router';

import { ROUTER_BASENAME } from '@/app/locale';
import { routes } from '@/app/routes';

/**
 * Created once, outside React, as React Router requires for data routers.
 * On English and Turkish pages the basename is /en or /tr, so every existing
 * <Link to="/books/x"> and navigate('/cart') stays in the page's language
 * without knowing about it.
 */
export const router = createBrowserRouter(routes, { basename: ROUTER_BASENAME });