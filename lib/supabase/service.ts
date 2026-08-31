import { createClient as createSupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

/**
 * service_role client — bypasses RLS entirely.
 *
 * Per the schema (supabase/migrations/20260830120000_invoice_schema.sql),
 * `invoices` and `invoice_items` carry no `to anon` policy at all: an
 * earlier draft did, gated only on status, and that let anyone enumerate
 * every sent invoice through PostgREST once the anon key shipped in the
 * bundle. So the public /i/[token] view is the one place in this app where
 * the anon key genuinely cannot do the job — this client exists only for
 * that route, always filtered by the unguessable public_token, never by
 * anything an outside caller controls otherwise.
 *
 * Never import this into a client component or anything that ships to the
 * browser; it must only run in a server route.
 */
export function createServiceClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
}
