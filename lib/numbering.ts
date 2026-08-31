import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

export type InvoiceStatus = Database['public']['Enums']['invoice_status']
export type DocKind = Database['public']['Enums']['doc_kind']

/**
 * Estimates ignore the user's invoice_prefix and always print as EST.
 *
 * next_invoice_number() keeps a separate counter per (fy, kind), so an
 * estimate and an invoice in the same year both start at seq 1 — sharing
 * a prefix would produce the identical string twice and trip the
 * (user_id, number) uniqueness constraint. A fixed 3-char prefix also
 * keeps the result at 14 characters regardless of how long the user's own
 * prefix is, comfortably inside the 16-char invoices_number_len check.
 */
const ESTIMATE_PREFIX = 'EST'

/**
 * next_invoice_number() (supabase/migrations/20260830120000_invoice_schema.sql)
 * returns the raw (fy, seq) pair from an atomic counter — it doesn't know
 * about your invoice_prefix, so formatting into the printed string
 * ('PM/26-27/0007') happens here, the one place both the send action and
 * anything that needs to display a number agree on the format.
 */

// financial_year() returns the full year, e.g. '2026-27' — the printed
// number uses the short form, '26-27', to stay well under the 16-char
// invoices_number_len constraint.
function shortFinancialYear(fy: string): string {
  const [start, end] = fy.split('-')
  return `${start.slice(-2)}-${end}`
}

export function formatInvoiceNumber(prefix: string, fy: string, seq: number): string {
  return `${prefix}/${shortFinancialYear(fy)}/${String(seq).padStart(4, '0')}`
}

/**
 * Calls next_invoice_number() and formats the result. Must only be called
 * from the draft -> sent transition (see app/(app)/invoices/actions.ts's
 * sendInvoice) — never on draft creation, per CLAUDE.md.
 */
export async function assignNextInvoiceNumber(
  supabase: SupabaseClient<Database>,
  userId: string,
  issueDate: string,
  prefix: string,
  kind: DocKind = 'invoice',
): Promise<{ number: string; fy: string; seq: number }> {
  const { data, error } = await supabase
    .rpc('next_invoice_number', { p_user_id: userId, p_date: issueDate, p_kind: kind })
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Could not assign an invoice number.')
  }

  const effectivePrefix = kind === 'estimate' ? ESTIMATE_PREFIX : prefix
  return {
    number: formatInvoiceNumber(effectivePrefix, data.fy, data.seq),
    fy: data.fy,
    seq: data.seq,
  }
}
