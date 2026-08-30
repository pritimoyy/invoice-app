-- ============================================================
-- Storage buckets — branding (logo, signature) and invoices (rendered PDFs)
--
-- Both private. Nothing here is world-readable; files reach the browser
-- only through signed URLs minted server-side.
--
-- Layout is <user_id>/<file>, and the policy below is what enforces it.
-- ============================================================

insert into storage.buckets (id, name, public)
values ('branding', 'branding', false),
       ('invoices', 'invoices', false)
on conflict (id) do nothing;

-- A user may only touch objects sitting under a folder named with their
-- own uid. Same subselect trick as the main schema: (select auth.uid())
-- is evaluated once per query rather than once per row.
create policy "own folder" on storage.objects
  for all to authenticated
  using (
    bucket_id in ('branding', 'invoices')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id in ('branding', 'invoices')
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );
