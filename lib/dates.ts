/**
 * Calendar dates for invoicing — always Kolkata's calendar day.
 *
 * `new Date().toISOString().slice(0, 10)` is the obvious way to get a
 * YYYY-MM-DD and it is wrong here, twice over:
 *
 *  - toISOString() is UTC. Kolkata is UTC+5:30, so between midnight and
 *    05:30 IST it reports *yesterday* — invoices dated a day early, and a
 *    "due in 7 days" window shifted by one.
 *  - Falling back to the machine's local time doesn't fix it either: this
 *    deploys to Vercel, where the server runs in UTC, so "local" is UTC
 *    again.
 *
 * So the zone is pinned explicitly rather than inherited. This is a
 * single-user tool for one person in Kolkata (see CLAUDE.md); an invoice
 * issued on the 1st should read as the 1st no matter which region the
 * request happened to land in. en-CA is used purely because it formats as
 * YYYY-MM-DD, which is what Postgres `date` columns expect.
 */

const INVOICE_TIME_ZONE = 'Asia/Kolkata'

const isoDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: INVOICE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

/** Today's date in Kolkata, as YYYY-MM-DD. */
export function todayIso(date: Date = new Date()): string {
  return isoDateFormatter.format(date)
}

/** Today in Kolkata plus `days`, as YYYY-MM-DD. Accepts negatives. */
export function isoDatePlusDays(days: number, from: Date = new Date()): string {
  return todayIso(new Date(from.getTime() + days * 24 * 60 * 60 * 1000))
}

/** The 1st of the current Kolkata month, as YYYY-MM-DD. */
export function startOfMonthIso(from: Date = new Date()): string {
  return `${todayIso(from).slice(0, 7)}-01`
}
