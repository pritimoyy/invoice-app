import type { InvoiceStatus } from './numbering'

/**
 * What actually gets shown for a row, vs what's stored in invoice_status.
 *
 * 'overdue' and 'paid_late' are never written to the database — they're
 * derived at render time (overdue from invoice_balances.is_overdue,
 * paid_late by comparing the completing payment's date to due_date) and
 * only ever displayed. Writing 'overdue' into invoice_status would need a
 * cron this app doesn't have to keep it in sync as today's date moves;
 * computing it on read never goes stale.
 */
export type DisplayStatus =
  | 'draft'
  | 'sent'
  | 'partially_paid'
  | 'overdue'
  | 'paid'
  | 'paid_late'
  | 'cancelled'

export const DISPLAY_STATUS_LABEL: Record<DisplayStatus, string> = {
  draft: 'Draft',
  sent: 'Sent',
  partially_paid: 'Partially paid',
  overdue: 'Overdue',
  paid: 'Paid',
  paid_late: 'Paid late',
  cancelled: 'Cancelled',
}

// text-red-700 for anything currently unpaid and late; text-emerald-700
// for anything resolved (paid, whether or not it was late) — matches the
// colors already used in the dashboard and payments section. Everything
// else stays plain neutral, same as every other badge in the app.
export function displayStatusClassName(status: DisplayStatus): string {
  if (status === 'overdue') return 'text-red-700'
  if (status === 'paid' || status === 'paid_late') return 'text-emerald-700'
  return 'text-neutral-500'
}

export function computeDisplayStatus(input: {
  status: InvoiceStatus
  isOverdue: boolean
  paidLate: boolean
}): DisplayStatus {
  if (input.status === 'sent' || input.status === 'partially_paid') {
    return input.isOverdue ? 'overdue' : input.status
  }
  if (input.status === 'paid') {
    return input.paidLate ? 'paid_late' : 'paid'
  }
  return input.status
}

/**
 * Given every payment for one invoice and its due_date, was it fully paid
 * after the due date passed? Compares the *latest* payment's date, not
 * the first — an invoice isn't "paid" at all until the last installment
 * lands, so that's the date that determines on-time vs late.
 */
export function wasPaidLate(paymentDates: string[], dueDate: string | null): boolean {
  if (!dueDate || paymentDates.length === 0) return false
  const latest = paymentDates.reduce((max, d) => (d > max ? d : max))
  return latest > dueDate
}
