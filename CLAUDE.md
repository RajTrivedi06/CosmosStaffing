# Cosmos Cleaning

@AGENTS.md

## Project

A Next.js website for **Cosmos Cleaning**, a home and workplace cleaning
company based in Texas (Austin, Houston, San Antonio, Dallas) that also
arranges cleaning elsewhere in the US. The site leads visitors to a guided
quote at /quote. (The repo name is left over from the earlier Cosmos Staffing
site, which has been removed.)

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 (config-less, via `@import "tailwindcss"` in `globals.css`)
- ESLint (next config) + Prettier (with Tailwind class sorting)

## Layout

- `src/app/` — routes (App Router); `layout.tsx` is the root shell.
  `(site)/` holds the marketing pages (home, services, terms, contact) with
  header and footer; `quote/` is the standalone quote screen.
- `src/app/api/quote/route.ts` — quote endpoint: validates, stores in
  Supabase, emails via Resend (`src/lib/quote-delivery.ts`).
- `src/lib/site.ts` — central site config and copy. Unconfirmed policies and
  promises render as `[PLACEHOLDER: …]`; never invent them.
- `src/lib/quote.ts` — quote questions, branching and validation.
- `src/lib/scroll.ts` — shared smooth scroll and anchor targets.
- `src/lib/motion.ts` — `html[data-motion]`, set before first paint. Scroll
  scenes are styled for motion only under `data-motion="on"`; otherwise
  (reduced motion, no JavaScript) they render still and finished.
- `supabase/migrations/` — database schema (quote_requests table).
- `src/components/` — shared UI components.
- `public/` — static assets.

## Commands

- `npm run dev` — start the dev server (Turbopack).
- `npm run build` / `npm start` — production build / serve.
- `npm run lint` — ESLint. `npm run typecheck` — type-check.
- `npm run format` — Prettier write. `npm run format:check` — check only.
- `npm test` — Vitest unit tests (`tests/unit`).
- `npm run test:e2e` — build, then Playwright browser tests (`tests/e2e`,
  desktop and phone, port 3200).

## Conventions

- Path alias `@/*` → `src/*`.
- Server Components by default; add `"use client"` only when needed.
- Keep brand/content in `src/lib/site.ts` rather than hard-coding in pages.

## Note

This is Next.js 16, which has breaking changes vs. older versions (see
`AGENTS.md`). Check `node_modules/next/dist/docs/` before using unfamiliar APIs.
