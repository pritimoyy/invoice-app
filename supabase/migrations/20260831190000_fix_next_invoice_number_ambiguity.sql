-- ============================================================
-- Fix: next_invoice_number() raised "column reference \"fy\" is
-- ambiguous" on every call.
--
-- Cause: `returns table (fy text, seq int)` implicitly declares `fy` and
-- `seq` as plpgsql variables in scope for the whole function body. The
-- `on conflict (user_id, fy, kind)` target list bare-references
-- invoice_counters.fy, which now has two possible meanings (the column,
-- or the function's own output variable) — Postgres's default
-- (plpgsql.variable_conflict = error) refuses to guess and raises the
-- ambiguity error instead.
--
-- Fix: #variable_conflict use_column tells this function to always
-- prefer the table column when a name collides with one of its own
-- variables. Safe here because the function never reads or assigns the
-- `fy`/`seq` variables directly — it returns its result entirely via
-- `return query`, so nothing depends on those names resolving to the
-- output parameters.
--
-- No signature change: still returns (fy text, seq int), so nothing in
-- lib/numbering.ts or types/database.ts needs to change.
-- ============================================================

create or replace function next_invoice_number(
  p_user_id uuid,
  p_date    date,
  p_kind    doc_kind default 'invoice'
)
returns table (fy text, seq int)
language plpgsql
as $$
#variable_conflict use_column
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
