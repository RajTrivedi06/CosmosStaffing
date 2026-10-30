# Cosmos Cleaning

Website for **Cosmos Cleaning**, home and workplace cleaning based in Texas,
built with [Next.js](https://nextjs.org). Visitors get a personal quote through
a guided, one-question-per-screen flow at `/quote`.

## Requirements

- Node.js `>= 22.13` (see `engines` in `package.json`).
- npm (the lockfile is committed).

## Getting started

```bash
npm install
npm run dev
```

Then open <http://localhost:3000>.

## Scripts

| Script                 | Description                       |
| ---------------------- | --------------------------------- |
| `npm run dev`          | Start the dev server (Turbopack)  |
| `npm run build`        | Production build                  |
| `npm start`            | Serve the production build        |
| `npm run lint`         | Run ESLint                        |
| `npm run lint:fix`     | ESLint with autofix               |
| `npm run typecheck`    | Type-check with `tsc` (no emit)   |
| `npm run format`       | Format the codebase with Prettier |
| `npm run format:check` | Check formatting without writing  |
| `npm test`             | Unit tests (Vitest)               |
| `npm run test:e2e`     | Build, then browser tests (\*)    |

(\*) The test build goes to `.next-test` (so a running `npm run dev` is never disturbed) and forwards the Studio's paths to a local stub (`tests/e2e/studio-stub.mjs`).

## Project structure

```
src/
  app/
    (site)/            Marketing pages with header and footer
      page.tsx         Home (one scrolling "day")
      services/        Services, how we work, coverage, FAQ
      clean-with-cosmos/  For independent cleaners: what to expect
      contact/         Contact, with separate paths for clients and cleaners
    quote/             Guided quote screen
    api/quote/         Quote endpoint: validate, store, email
    layout.tsx         Root layout / metadata
    globals.css        Tailwind entry + theme tokens
  lib/
    site.ts            Central site config and copy
    quote.ts           Quote questions, branching, validation
    quote-delivery.ts  Supabase storage + Resend email
    scroll.ts          Smooth scroll and in-page link targets
    motion.ts          Motion on/off (reduced motion, no JavaScript)
    metadata.ts        Per-page titles, canonical URLs, sharing card
    studio-routes.ts   Paths forwarded to the Operations Studio
  components/          Shared UI components
tests/
  unit/                Quote logic, delivery and the API route (Vitest)
  e2e/                 Browser tests, desktop and phone (Playwright)
supabase/              Local config and migrations
public/images/         4K photography
```

## Motion

The home page plays as one scrolling day. Its scenes are built only when
`<html data-motion="on">`, which an inline script sets before the first paint.
With reduced motion, or without JavaScript, every scene renders as a still,
finished screen instead.

## The Operations Studio

Cosmos's internal Operations Studio (a separate app) serves its recipient
pages on this domain: private links (`/o`, `/q`, `/pay`, `/join`), the
cleaner portal (`/me`, sign-in at `/me/login`), `/terms` and its assets
under `/studio-assets`. This site forwards exactly those paths with
`beforeFiles` rewrites (`src/lib/studio-routes.ts`), and `vercel.json` adds
their no-store and noindex headers, both copied from the Studio's
`docs/03-guides/connect-company-domain.md`.

- Never create pages at those paths, or at `/apply` (reserved for the
  Studio's future public application). Link to them with plain `<a>`, not
  `next/link`.
- Never forward `/login`, `/api` or `/_next`, and never set cookies for
  `.cosmosservicesllc.com`.
- Changing the list needs the matching change in the Studio, released
  together. `tests/unit/studio-routes.test.ts` holds the documented template.
- This site collects no cleaner information. Applications, sign-in and
  onboarding all happen in the Studio. The recruitment page only explains
  them, and `cleaners.apply.available` in `site.ts` stays `false` until the
  Studio's application path exists and is forwarded.

Open decisions and requests for the Studio are in
[`docs/studio-integration.md`](./docs/studio-integration.md).

## Configuration

- Copy [`.env.example`](./.env.example) to `.env.local` and fill in the
  Supabase and Resend values. Without them, the quote screen says online
  requests aren't connected yet rather than pretending to send.
- Apply the database schema with `supabase db push` (or run the migration in
  `supabase/migrations/` in the SQL editor).
- Set `NEXT_PUBLIC_SITE_URL` to the live domain. Canonical URLs, the sitemap
  and `robots.txt` use it.
- `STUDIO_ORIGIN` (optional, build time) points the forwarded paths at a
  Studio preview for paired staging. Unset, they go to
  `https://studio.cosmosservicesllc.com`.
- Brand and content live in [`src/lib/site.ts`](./src/lib/site.ts). Edit there
  rather than hard-coding values in pages.
