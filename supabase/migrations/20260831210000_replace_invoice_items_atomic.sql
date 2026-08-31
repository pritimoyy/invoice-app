-- ============================================================
-- replace_invoice_items() — swap an invoice's line items atomically.
--
-- saveDraftInvoice used to DELETE every invoice_items row and then INSERT
-- the new set as two separate round trips. Between those two statements
-- the invoice has no line items at all, so anything that interrupts the
-- request there (dropped connection, timeout, a crash mid-action) leaves
-- the invoice permanently empty while its stored totals still claim the
-- old amounts. Rare with one user, but it silently destroys billing data
-- when it happens.
--
-- A function body runs inside a single implicit transaction, so the
-- delete and the insert either both land or neither does.
--
-- SECURITY INVOKER (the default, stated here so it isn't changed by
-- accident): this must run as the calling user so the RLS policies on
-- invoice_items still apply. It is emphatically NOT security definer —
-- that would let any caller rewrite any invoice's items.
-- ============================================================

create or replace function replace_invoice_items(
  p_invoice_id uuid,
  p_items      jsonb
)
returns void
language plpgsql
security invoker
as $$
begin
  delete from invoice_items where invoice_id = p_invoice_id;

  -- jsonb_populate_recordset can't be used directly: the payload carries
  -- only the columns the app writes, and the row type has more.
  insert into invoice_items (
    user_id, invoice_id, position, description, sac_code, unit,
    quantity, unit_price_paise, discount_paise, tax_rate_bps,
    line_total_paise, tax_paise
  )
  select
    (item ->> 'user_id')::uuid,
    p_invoice_id,
    (item ->> 'position')::int,
    item ->> 'description',
    item ->> 'sac_code',
    item ->> 'unit',
    (item ->> 'quantity')::numeric,
    (item ->> 'unit_price_paise')::bigint,
    (item ->> 'discount_paise')::bigint,
    (item ->> 'tax_rate_bps')::int,
    (item ->> 'line_total_paise')::bigint,
    (item ->> 'tax_paise')::bigint
  from jsonb_array_elements(p_items) as item;
end;
$$;
