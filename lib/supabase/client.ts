import { createBrowserClient } from '@supabase/ssr'

import type { Database } from '@/types/database'

/**
 * Supabase client for client components.
 *
 * Anon key only — it is public by design and RLS is what protects the data.
 * The service_role key must never reach this file or anything it imports.
 */
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}
