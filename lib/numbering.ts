import type { SupabaseClient } from '@supabase/supabase-js'

import type { Database } from '@/types/database'

export type InvoiceStatus = Database['public']['Enums']['invoice_status']

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
): Promise<{ number: string; fy: string; seq: number }> {
  const { data, error } = await supabase
    .rpc('next_invoice_number', { p_user_id: userId, p_date: issueDate })
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'Could not assign an invoice number.')
  }

  return { number: formatInvoiceNumber(prefix, data.fy, data.seq), fy: data.fy, seq: data.seq }
}
