-- ============================================================
-- Invoice maker — initial schema
-- Postgres / Supabase
--
-- Conventions:
--   * All money is BIGINT in paise. Never float, never numeric-for-money.
--     ₹1,250.00 is stored as 125000.
--   * Every table carries user_id and has RLS on, even though this is
--     a single-user app. The Supabase anon key is public; RLS is the
--     only thing standing between your data and the internet.
--   * Tax rates are basis points. 18% is 1800.
-- ============================================================

create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Enums
-- ------------------------------------------------------------

create type invoice_status as enum (
  'draft',
  'sent',
  'partially_paid',
  'paid',
  'overdue',
  'cancelled'
);

create type gst_treatment as enum (
  'intra_state',   -- client in West Bengal -> CGST + SGST
  'inter_state',   -- client elsewhere in India -> IGST
  'export',        -- foreign client -> zero rated, LUT declaration
  'unregistered'   -- you are below the threshold -> no tax lines at all
);

create type doc_kind as enum ('invoice', 'estimate');

create type payment_method as enum (
  'upi', 'bank_transfer', 'razorpay', 'cash', 'cheque', 'other'
);

-- ------------------------------------------------------------
-- profiles — your own business details, one row
-- ------------------------------------------------------------

create table profiles (
  user_id            uuid primary key references auth.users(id) on delete cascade,
  legal_name         text not null,
  trade_name         text,
  address_line1      text,
  address_line2      text,
  city               text,
  state              text,            -- your place of business
  state_code         text,            -- GST state code, e.g. '19' for WB
  postal_code        text,
  country            text not null default 'IN',
  email              text,
  phone              text,

  -- tax identity. all nullable: you may not be registered yet.
  gstin              text,
  pan                text,
  is_gst_registered  boolean not null default false,
  has_lut            boolean not null default false,
  default_sac_code   text,            -- 998386 for video production services

  -- payment details printed on the invoice
  upi_id             text,
  bank_account_name  text,
  bank_account_no    text,
  bank_ifsc          text,
  bank_name          text,

  -- branding
  logo_path          text,            -- Supabase Storage object path
  signature_path     text,
  invoice_prefix     text not null default 'INV',
  default_template   text not null default 'minimal',
  default_currency   char(3) not null default 'INR',
  default_terms_days int not null default 15,
  notes_default      text,            -- boilerplate terms, printed on every invoice

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

-- ------------------------------------------------------------
-- clients
-- ------------------------------------------------------------

create table clients (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,

  name           text not null,           -- billing name, may be a company
  contact_person text,
  email          text,
  phone          text,

  address_line1  text,
  address_line2  text,
  city           text,
  state          text,
  state_code     text,
  postal_code    text,
  country        text not null default 'IN',

  gstin          text,
  currency       char(3) not null default 'INR',
  payment_terms_days int,                 -- overrides your default
  notes          text,
  is_archived    boolean not null default false,

  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index clients_user_idx on clients (user_id) where is_archived = false;

-- ------------------------------------------------------------
-- services — your rate card, so you stop retyping line items
-- ------------------------------------------------------------

create table services (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,          -- 'Reel edit — 60s'
  description      text,
  unit             text not null default 'unit',  -- 'hour', 'day', 'reel', 'minute'
  default_rate_paise bigint not null check (default_rate_paise >= 0),
  sac_code         text,
  tax_rate_bps     int not null default 1800,
  is_archived      boolean not null default false,
  created_at       timestamptz not null default now()
);

create index services_user_idx on services (user_id);

-- ------------------------------------------------------------
-- invoice_counters — atomic sequential numbering per financial year
--
-- GST requires the number to be sequential, unique, and <= 16 chars.
-- Doing this with count(*) + 1 in application code WILL collide.
-- ------------------------------------------------------------

create table invoice_counters (
  user_id     uuid not null references auth.users(id) on delete cascade,
  fy          text not null,              -- '2026-27'
  kind        doc_kind not null default 'invoice',
  last_number int not null default 0,
  primary key (user_id, fy, kind)
);

-- Indian financial year: 1 April to 31 March.
create or replace function financial_year(d date)
returns text
language sql
immutable
as $$
  select case
    when extract(month from d) >= 4
      then to_char(d, 'YYYY') || '-' || to_char(d + interval '1 year', 'YY')
    else to_char(d - interval '1 year', 'YYYY') || '-' || to_char(d, 'YY')
  end;
$$;

-- Increments and returns the next number in one atomic statement.
create or replace function next_invoice_number(
  p_user_id uuid,
  p_date    date,
  p_kind    doc_kind default 'invoice'
)
returns table (fy text, seq int)
language plpgsql
as $$
declare
  v_fy text := financial_year(p_date);
begin
  return query
  insert into invoice_counters (user_id, fy, kind, last_number)
  values (p_user_id, v_fy, p_kind, 1)
  on conflict (user_id, fy, kind)
    do update set last_number = invoice_counters.last_number + 1
  returning invoice_counters.fy, invoice_counters.last_number;
end;
$$;

-- ------------------------------------------------------------
-- invoices
--
-- Totals are STORED, not computed on read. An invoice you have already
-- sent must never change because you edited a service rate later.
-- Freeze the client's address here too, for the same reason.
-- ------------------------------------------------------------

create table invoices (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  client_id         uuid references clients(id) on delete restrict,

  kind              doc_kind not null default 'invoice',
  number            text not null,          -- 'PM/26-27/0007', max 16 chars
  fy                text not null,
  seq               int  not null,

  status            invoice_status not null default 'draft',
  issue_date        date not null default current_date,
  due_date          date,
  sent_at           timestamptz,

  -- frozen snapshot of the recipient at issue time
  bill_to_name      text not null,
  bill_to_address   text,
  bill_to_gstin     text,
  bill_to_state     text,
  bill_to_state_code text,
  bill_to_country   text not null default 'IN',

  -- tax context
  gst_treatment     gst_treatment not null default 'unregistered',
  place_of_supply   text,                   -- delivery state, NOT yours
  reverse_charge    boolean not null default false,

  currency          char(3) not null default 'INR',
  exchange_rate     numeric(14,6),          -- to INR, for foreign invoices

  -- money, all paise
  subtotal_paise    bigint not null default 0,
  discount_paise    bigint not null default 0,
  cgst_paise        bigint not null default 0,
  sgst_paise        bigint not null default 0,
  igst_paise        bigint not null default 0,
  round_off_paise   bigint not null default 0,
  total_paise       bigint not null default 0,

  template          text not null default 'minimal',
  notes             text,
  terms             text,
  internal_memo     text,                   -- never printed

  -- estimate -> invoice conversion
  converted_from_id uuid references invoices(id) on delete set null,

  pdf_path          text,                   -- cached render in Storage
  public_token      uuid unique default gen_random_uuid(),  -- shareable link

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint invoices_number_unique unique (user_id, number),
  constraint invoices_seq_unique    unique (user_id, fy, kind, seq),
  constraint invoices_number_len    check (char_length(number) <= 16),
  constraint invoices_totals_signed check (total_paise >= 0),
  constraint invoices_tax_exclusive check (
    -- intra-state uses cgst+sgst, inter-state uses igst, never both
    not (igst_paise > 0 and (cgst_paise > 0 or sgst_paise > 0))
  )
);

create index invoices_user_status_idx on invoices (user_id, status);
create index invoices_client_idx      on invoices (user_id, client_id);
create index invoices_due_idx         on invoices (user_id, due_date)
  where status in ('sent', 'partially_paid', 'overdue');

-- ------------------------------------------------------------
-- invoice_items
-- ------------------------------------------------------------

create table invoice_items (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  invoice_id       uuid not null references invoices(id) on delete cascade,

  position         int  not null default 0,
  description      text not null,
  sac_code         text,
  unit             text,
  quantity         numeric(12,3) not null default 1 check (quantity > 0),
  unit_price_paise bigint not null check (unit_price_paise >= 0),
  discount_paise   bigint not null default 0,
  tax_rate_bps     int    not null default 0,

  -- stored, frozen at save time
  line_total_paise bigint not null default 0,
  tax_paise        bigint not null default 0
);

create index invoice_items_invoice_idx on invoice_items (invoice_id, position);

-- ------------------------------------------------------------
-- payments — partial payments and advances are the norm in freelance work
-- ------------------------------------------------------------

create table payments (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  invoice_id     uuid not null references invoices(id) on delete cascade,

  amount_paise   bigint not null check (amount_paise > 0),
  paid_on        date   not null default current_date,
  method         payment_method not null default 'upi',
  reference      text,                    -- UTR, Razorpay payment id, cheque no
  tds_paise      bigint not null default 0,   -- clients often deduct 10% TDS
  fees_paise     bigint not null default 0,   -- gateway cut
  notes          text,

  created_at     timestamptz not null default now()
);

create index payments_invoice_idx on payments (invoice_id);
create index payments_user_date_idx on payments (user_id, paid_on desc);

-- ------------------------------------------------------------
-- Balance view — what is actually outstanding
-- ------------------------------------------------------------

create view invoice_balances
with (security_invoker = true)
as
select
  i.id,
  i.user_id,
  i.number,
  i.client_id,
  i.status,
  i.issue_date,
  i.due_date,
  i.currency,
  i.total_paise,
  coalesce(sum(p.amount_paise + p.tds_paise), 0)              as paid_paise,
  i.total_paise - coalesce(sum(p.amount_paise + p.tds_paise), 0) as balance_paise,
  (i.due_date is not null
   and i.due_date < current_date
   and i.total_paise > coalesce(sum(p.amount_paise + p.tds_paise), 0)) as is_overdue
from invoices i
left join payments p on p.invoice_id = i.id
where i.kind = 'invoice' and i.status <> 'cancelled'
group by i.id;

-- ------------------------------------------------------------
-- updated_at trigger
-- ------------------------------------------------------------

create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_touch  before update on profiles
  for each row execute function touch_updated_at();
create trigger clients_touch   before update on clients
  for each row execute function touch_updated_at();
create trigger invoices_touch  before update on invoices
  for each row execute function touch_updated_at();

-- ============================================================
-- Row Level Security
--
-- Every table. No exceptions. Test these from the client SDK,
-- not the SQL editor — the SQL editor bypasses RLS and will
-- happily tell you a broken policy works.
--
-- (select auth.uid()) is wrapped in a subselect on purpose: it lets
-- Postgres evaluate it once per query instead of once per row.
-- ============================================================

alter table profiles         enable row level security;
alter table clients          enable row level security;
alter table services         enable row level security;
alter table invoice_counters enable row level security;
alter table invoices         enable row level security;
alter table invoice_items    enable row level security;
alter table payments         enable row level security;

create policy profiles_owner on profiles
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy clients_owner on clients
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy services_owner on services
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy counters_owner on invoice_counters
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy invoices_owner on invoices
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy invoice_items_owner on invoice_items
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy payments_owner on payments
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ------------------------------------------------------------
-- Public invoice link — deliberately NOT granted to anon
--
-- An earlier draft of this schema carried two `to anon` select policies,
-- on invoices and invoice_items, gated only on status. The anon key ships
-- in the browser bundle, so those let anyone enumerate every sent invoice
-- through PostgREST — bill_to_gstin, totals, internal_memo — without ever
-- knowing a public_token. A caller-supplied ?public_token= filter is not
-- enforcement; RLS is.
--
-- So anon gets no access here at all. The /i/<token> page (Phase 5) is
-- served from a server route using the service_role key, filtered on
-- public_token. That is the one place in this app where the anon key
-- genuinely cannot do the job.
-- ------------------------------------------------------------

-- ------------------------------------------------------------
-- Storage buckets (run in the Supabase dashboard or via the API)
-- ------------------------------------------------------------
--   branding  — private. logo, signature. served via signed URLs.
--   invoices  — private. rendered PDFs at <user_id>/<invoice_id>.pdf
-- Both need their own storage.objects policies scoped to
-- (storage.foldername(name))[1] = auth.uid()::text
