# Cosmos Staffing

@AGENTS.md

## Project

A Next.js website for **Cosmos Staffing**, a staffing company. The near-term
goal is an enquiry-focused site (visitors submit staffing enquiries). The
design is still being defined — keep additions minimal and easy to change until
direction is confirmed.

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Tailwind CSS v4 (config-less, via `@import "tailwindcss"` in `globals.css`)
- ESLint (next config) + Prettier (with Tailwind class sorting)

## Layout

- `src/app/` — routes (App Router); `layout.tsx` is the root shell.
- `src/app/api/enquiry/route.ts` — enquiry submission endpoint (scaffold).
- `src/lib/site.ts` — central site config (name, copy, contact, nav).
- `src/lib/enquiry.ts` — enquiry type + validation.
- `src/components/` — shared UI components.
- `public/` — static assets.

## Commands

- `npm run dev` — start the dev server (Turbopack).
- `npm run build` / `npm start` — production build / serve.
- `npm run lint` — ESLint. `npm run typecheck` — type-check.
- `npm run format` — Prettier write. `npm run format:check` — check only.

## Conventions

- Path alias `@/*` → `src/*`.
- Server Components by default; add `"use client"` only when needed.
- Keep brand/content in `src/lib/site.ts` rather than hard-coding in pages.

## Note

This is Next.js 16, which has breaking changes vs. older versions (see
`AGENTS.md`). Check `node_modules/next/dist/docs/` before using unfamiliar APIs.
