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

## Project structure

```
src/
  app/
    (site)/            Marketing pages with header and footer
      page.tsx         Home (one scrolling "day")
      services/        Services, how we work, coverage, FAQ
      terms/ contact/  Terms (awaiting approved wording) and contact
    quote/             Guided quote screen
    api/quote/         Quote endpoint: validate, store, email
    layout.tsx         Root layout / metadata
    globals.css        Tailwind entry + theme tokens
  lib/
    site.ts            Central site config and copy
    quote.ts           Quote questions, branching, validation
    quote-delivery.ts  Supabase storage + Resend email
  components/          Shared UI components
supabase/              Local config and migrations
public/images/         4K photography
```

## Configuration

- Copy [`.env.example`](./.env.example) to `.env.local` and fill in the
  Supabase and Resend values. Without them, the quote screen says online
  requests aren't connected yet rather than pretending to send.
- Apply the database schema with `supabase db push` (or run the migration in
  `supabase/migrations/` in the SQL editor).
- Brand and content live in [`src/lib/site.ts`](./src/lib/site.ts). Edit there
  rather than hard-coding values in pages.
