-- Quote requests from the website's /quote screen.
--
-- Written only by the Next.js server (/api/quote) using the project's secret
-- key. Nothing here is exposed to browsers: RLS is on with no policies, and
-- the anon and authenticated roles have no grants, so the Data API returns
-- nothing to them even if the table is exposed.

create table public.quote_requests (
  id uuid primary key default gen_random_uuid(),
  request_id text not null,
  created_at timestamptz not null default now(),
  service text not null,
  zip text not null,
  name text not null,
  email text not null,
  phone text,
  -- Every answer as submitted (after server-side validation).
  answers jsonb not null,
  email_status text not null default 'pending'
    check (email_status in ('pending', 'sent', 'failed', 'not_configured')),
  status text not null default 'new'
    check (status in ('new', 'quoted', 'closed'))
);

comment on table public.quote_requests is
  'Quote requests submitted on the website. Contains customer contact details.';

create index quote_requests_created_at_idx
  on public.quote_requests (created_at desc);

alter table public.quote_requests enable row level security;

revoke all on table public.quote_requests from anon, authenticated;
grant select, insert, update on table public.quote_requests to service_role;
