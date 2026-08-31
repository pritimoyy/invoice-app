import { buildInvoiceDataFromRow } from './from-row'
import type { InvoiceLineRow, InvoiceTemplateData } from './types'
import { createServiceClient } from '@/lib/supabase/service'

export type PublicInvoice = {
  id: string
  number: string
  status: string
  template: string
  currency: string
  /** Already-settled amount, in paise. TDS counts as paid. */
  paidPaise: number
  /** What the client still owes, in paise. */
  balancePaise: number
  /** Storage path of the copy frozen at send time, if one exists. */
  pdfPath: string | null
  data: InvoiceTemplateData
  rows: InvoiceLineRow[]
}

/**
 * Shared by app/i/[token]/page.tsx (the read-only summary) and
 * app/i/[token]/pdf/route.tsx (the download) — same lookup, same shaping,
 * so the two can never drift into showing a different invoice for the
 * same link. See lib/supabase/service.ts for why this reads via
 * service_role rather than the normal per-request client.
 */
export async function loadPublicInvoice(token: string): Promise<PublicInvoice | null> {
  const supabase = createServiceClient()

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('public_token', token)
    .neq('status', 'draft')
    .maybeSingle()

  if (!invoice) return null

  const [{ data: items }, { data: profile }, { data: balance }] = await Promise.all([
    supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', invoice.id)
      .order('position'),
    supabase
      .from('profiles')
      .select('*')
      .eq('user_id', invoice.user_id)
      .maybeSingle(),
    supabase
      .from('invoice_balances')
      .select('paid_paise, balance_paise')
      .eq('id', invoice.id)
      .maybeSingle(),
  ])

  const { data, rows } = buildInvoiceDataFromRow(invoice, items ?? [], profile)

  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    template: invoice.template,
    currency: invoice.currency,
    pdfPath: invoice.pdf_path,
    paidPaise: balance?.paid_paise ?? 0,
    balancePaise: balance?.balance_paise ?? invoice.total_paise,
    data,
    rows,
  }
}
