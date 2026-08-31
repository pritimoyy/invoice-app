-- ============================================================
-- recurring_invoices — "bill this again on a schedule"
--
-- Deliberately a pointer at an invoice you already built, not a second
-- copy of the invoice model. A separate template + template-items pair
-- would duplicate the line-item schema, the money rules, and the whole
-- editor UI, then drift from them. Here you build one invoice normally,
-- mark it as repeating, and generating copies it into a fresh draft.
--
-- Nothing fires on its own: generation is a button. A cron that silently
-- fails to create an invoice is worse than one you press yourself, and
-- every generated document still goes through the normal draft -> sent
-- path, so numbering is untouched.
-- ============================================================

create type recurrence_cadence as enum ('weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly');

create table recurring_invoices (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,

  -- The invoice to copy. Cascades: if the source is deleted there is
  -- nothing left to repeat.
  source_invoice_id uuid not null references invoices(id) on delete cascade,

  cadence           recurrence_cadence not null default 'monthly',
  next_due_on       date not null,
  is_active         boolean not null default true,
  last_generated_on date,

  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  -- One schedule per source invoice: two schedules copying the same
  -- invoice would just be a confusing way to double-bill.
  constraint recurring_invoices_source_unique unique (user_id, source_invoice_id)
);

create index recurring_invoices_due_idx
  on recurring_invoices (user_id, next_due_on)
  where is_active;

alter table recurring_invoices enable row level security;

create policy recurring_invoices_owner on recurring_invoices
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create trigger recurring_invoices_touch before update on recurring_invoices
  for each row execute function touch_updated_at();
