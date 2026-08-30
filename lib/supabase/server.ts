import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

import type { Database } from '@/types/database'

/**
 * Supabase client for server components, server actions and route handlers.
 *
 * Always call this per request — never hoist the result into a module-level
 * constant. The client carries the caller's session, and a shared instance
 * would leak one request's auth into another.
 *
 * Anon key only, so RLS applies. If a route genuinely needs service_role, build
 * that client locally in the route and keep it out of this file.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options)
            }
          } catch {
            // Server components cannot set cookies. Safe to ignore: the
            // middleware refreshes the session on every request.
          }
        },
      },
    },
  )
}
