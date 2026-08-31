import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import type { Database } from '@/types/database'

/**
 * Routes reachable without a session.
 *
 * `/i` is the public invoice view — a client opens it from a link in their
 * inbox and must never be bounced to a login screen.
 *
 * `/api/cron` has no session by definition; it authenticates with
 * CRON_SECRET instead, checked inside the route itself. Without this it
 * would be redirected to /login and the keep-alive would never reach the
 * database.
 */
const PUBLIC_PREFIXES = ['/login', '/i', '/auth', '/api/cron']

function isPublic(pathname: string) {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  )
}

/**
 * Optimistic session check, run from `proxy.ts`.
 *
 * Two jobs, and only these two:
 *
 *  1. Keep the auth cookie fresh. This is the only place in the request cycle
 *     that can actually write cookies — server components can't (see the
 *     try/catch in server.ts), so if the refresh does not happen here it does
 *     not happen at all, and the session dies when the access token expires.
 *
 *  2. Redirect on the *presence* of a valid token. That's a cheap gate, not an
 *     authorization decision.
 *
 * It deliberately does NOT call getUser(). Proxy runs on every request
 * including prefetches, and getUser() is a network round-trip to the Auth
 * server each time. getClaims() verifies the JWT locally with WebCrypto
 * against the cached JWKS, and still refreshes the session when the token is
 * near expiry — thin, but without giving up job 1.
 *
 * Authorization proper lives in app/(app)/layout.tsx and, underneath
 * everything, in RLS.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value)
          }
          supabaseResponse = NextResponse.next({ request })
          for (const { name, value, options } of cookiesToSet) {
            supabaseResponse.cookies.set(name, value, options)
          }
        },
      },
    },
  )

  // Nothing between createServerClient and the claims read.
  const { data } = await supabase.auth.getClaims()
  const hasSession = Boolean(data?.claims?.sub)

  const { pathname } = request.nextUrl

  if (!hasSession && !isPublic(pathname)) {
    return redirectTo('/login', request, supabaseResponse)
  }

  if (hasSession && pathname === '/login') {
    return redirectTo('/dashboard', request, supabaseResponse)
  }

  return supabaseResponse
}

/**
 * Redirect that carries over any cookies Supabase just refreshed.
 *
 * This is the logout loop. A bare NextResponse.redirect() drops the refreshed
 * Set-Cookie headers, so the browser keeps sending the stale token, the next
 * request fails the check again, and the user bounces between /login and
 * /dashboard forever.
 */
function redirectTo(
  pathname: string,
  request: NextRequest,
  supabaseResponse: NextResponse,
) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  url.search = ''

  const response = NextResponse.redirect(url)
  for (const cookie of supabaseResponse.cookies.getAll()) {
    response.cookies.set(cookie)
  }

  return response
}
