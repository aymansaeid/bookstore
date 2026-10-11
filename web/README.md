# كتاب أفندي · Kitap Efendi — Web

The React storefront and admin panel for the Kitap Efendi API in `../src`.
It is one responsive Arabic (RTL) website, built mobile-first. There is no native app.

## Requirements

- Node **22.22+** (React Router 8 minimum; see `.nvmrc`). `engine-strict` refuses older versions.
- The API running locally for real data.

## Getting started

```bash
cd web
npm ci
npm run dev        # http://localhost:3000
```

Run the API with the **https** profile (`https://localhost:7048`). The dev server proxies
`/api` and `/uploads` to it, so the browser sees a single origin and the customer refresh
cookie works. To point the proxy elsewhere, copy `.env.example` to `.env.local` and set
`API_PROXY_TARGET`.

Port 3000 is fixed because the backend's email links and payment redirects point to
`http://localhost:3000` (`Store:StorefrontBaseUrl`).

## Scripts

| Script                            | What it does                                                      |
| --------------------------------- | ----------------------------------------------------------------- |
| `npm run dev`                     | Dev server with HMR on port 3000                                  |
| `npm run build`                   | Type-check, then production build into `dist/`                    |
| `npm run preview`                 | Serve `dist/` on port 3000, same proxy                            |
| `npm run check`                   | Type-check, lint, format check and tests. Run before every commit |
| `npm run lint` / `lint:fix`       | ESLint (type-aware, React hooks, jsx-a11y), zero warnings         |
| `npm run format` / `format:check` | Prettier                                                          |
| `npm test` / `test:watch`         | Vitest                                                            |

## Project structure

```
src/
  app/        bootstrap: router, route table, paths, env flags, error boundary
  layouts/    route layouts: Root, Storefront, Auth, Account, Admin, Bare
  pages/      one module per route (default export), lazy-loaded
  shared/     reusable, feature-agnostic code
```

## Conventions

- **Links:** never hand-write a path. Use `paths` from `@/app/paths`.
- **Backend-linked routes** (API guide §11) are locked by `src/app/routes.test.ts`.
- **Imports:** use the `@/` alias, not `../../`.
- **CSS:** CSS Modules, mobile-first, logical properties only, touch targets of at least
  44px, and no horizontal scroll from 360px to 1440px.
- **Page titles:** render `<DocumentTitle title="…" />`.
- **Landmarks:** layouts own the single `<main>`. Pages render sections inside it.

## Watch out: the repo root `.gitignore`

It is the .NET template and silently ignores folders named `bin`, `obj`, `debug`,
`release`, `log`, `logs`, `x64`, `x86`, `packages`, `artifacts`, `publish` and `express`,
at any depth. Don't use those as folder names under `web/`.
