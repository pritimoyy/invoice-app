import { buildInvoiceData } from './build-invoice-data'
import type { InvoiceLineRow, InvoiceTemplateData } from './types'
import { createServiceClient } from '@/lib/supabase/service'

export type PublicInvoice = {
  id: string
  number: string
  status: string
  template: string
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

  const [{ data: items }, { data: profile }] = await Promise.all([
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
  ])

  const supplierAddressLines = [
    profile?.address_line1,
    profile?.address_line2,
    [profile?.city, profile?.postal_code].filter(Boolean).join(' ') || null,
  ].filter((line): line is string => Boolean(line))

  const { data, rows } = buildInvoiceData({
    invoiceNumber: invoice.number,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    placeOfSupply: invoice.place_of_supply ?? '',
    gstTreatment: invoice.gst_treatment,
    currency: invoice.currency,
    supplier: {
      name: profile?.trade_name || profile?.legal_name || '',
      addressLines: supplierAddressLines,
      gstin: profile?.gstin ?? '',
      pan: profile?.pan ?? '',
    },
    billTo: {
      name: invoice.bill_to_name,
      addressLines: invoice.bill_to_address ? [invoice.bill_to_address] : [],
      gstin: invoice.bill_to_gstin ?? '',
      state: invoice.bill_to_state ?? '',
      stateCode: invoice.bill_to_state_code ?? '',
      country: invoice.bill_to_country,
    },
    payment: {
      bankName: profile?.bank_name ?? '',
      accountNo: profile?.bank_account_no ?? '',
      ifsc: profile?.bank_ifsc ?? '',
      upiId: profile?.upi_id ?? '',
      termsLabel:
        invoice.terms || `${profile?.default_terms_days ?? 15} days from issue date`,
    },
    items: (items ?? []).map((item) => ({
      description: item.description,
      sacCode: item.sac_code ?? '',
      unit: item.unit ?? '',
      quantity: String(item.quantity),
      unitPricePaise: item.unit_price_paise,
      lineTotalPaise: item.line_total_paise,
    })),
    totals: {
      subtotalPaise: invoice.subtotal_paise,
      discountPaise: invoice.discount_paise,
      cgstPaise: invoice.cgst_paise,
      sgstPaise: invoice.sgst_paise,
      igstPaise: invoice.igst_paise,
      roundOffPaise: invoice.round_off_paise,
      totalPaise: invoice.total_paise,
    },
  })

  return {
    id: invoice.id,
    number: invoice.number,
    status: invoice.status,
    template: invoice.template,
    data,
    rows,
  }
}
