# Cosmos Staffing

Website for **Cosmos Staffing**, built with [Next.js](https://nextjs.org). The
current focus is an enquiry-driven site. The design is still evolving, so this
repo is intentionally a lean, well-structured starting point rather than a
finished site.

## Requirements

- Node.js `>= 22.13` (or `20.19+`, or `24+`) — see [`.nvmrc`](./.nvmrc).
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

## Project structure

```
src/
  app/                 App Router routes
    api/enquiry/       Enquiry submission endpoint (scaffold)
    layout.tsx         Root layout / metadata
    page.tsx           Landing page (placeholder)
    globals.css        Tailwind entry + theme tokens
  lib/
    site.ts            Central site config (name, copy, contact, nav)
    enquiry.ts         Enquiry type + validation
  components/          Shared UI components
public/                Static assets
```

## Configuration

- Copy [`.env.example`](./.env.example) to `.env.local` and fill in values as
  integrations are added (`.env*` is gitignored).
- Brand and content live in [`src/lib/site.ts`](./src/lib/site.ts) — edit there
  rather than hard-coding values in pages.

## Stack notes

- Next.js 16 (App Router) + React 19 + Tailwind CSS v4.
- The enquiry endpoint (`POST /api/enquiry`) validates submissions but does not
  yet deliver them anywhere — wire up email/CRM/DB at the `TODO` in
  [`src/app/api/enquiry/route.ts`](./src/app/api/enquiry/route.ts).
