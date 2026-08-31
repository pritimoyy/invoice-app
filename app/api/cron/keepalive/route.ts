import { NextResponse } from 'next/server'

import { createServiceClient } from '@/lib/supabase/service'

export const runtime = 'nodejs'
// Never cached: a cached response would mean no database round-trip, which
// is the entire point of this route.
export const dynamic = 'force-dynamic'

/**
 * Keeps the Supabase project out of free-tier hibernation.
 *
 * Free projects suspend after ~7 days with no activity. Nothing is deleted
 * — you restore from the dashboard — but a suspended project means a client
 * opening their /i/<token> invoice link gets an error, and that is not
 * something to discover from the client.
 *
 * Invoices here get made about once a month, so ordinary use is nowhere
 * near frequent enough. A daily read is.
 *
 * Deliberately read-only. Writing a heartbeat row would also work but it
 * would put junk in a database that holds financial records; a select is
 * just as real a round-trip to Postgres as an insert.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET

  // Vercel sends `Authorization: Bearer $CRON_SECRET` automatically once
  // that variable exists on the project. Required rather than optional: the
  // alternative is an unauthenticated endpoint that anyone can use to make
  // your database do work.
  if (!secret) {
    return NextResponse.json(
      { error: 'CRON_SECRET is not configured on this deployment.' },
      { status: 500 },
    )
  }
  if (request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // service_role, because a cron has no user session. It reads one id and
  // nothing else — no invoice data is returned to the caller.
  const supabase = createServiceClient()
  const { error } = await supabase.from('invoices').select('id').limit(1)

  if (error) {
    // Surfaced as a 500 so a failing keep-alive shows up in Vercel's cron
    // logs rather than silently doing nothing for weeks.
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, at: new Date().toISOString() })
}
