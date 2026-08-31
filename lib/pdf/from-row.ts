import type { Database } from '@/types/database'

import { buildInvoiceData } from './build-invoice-data'
import type { InvoiceLineRow, InvoiceTemplateData } from './types'

type InvoiceRow = Database['public']['Tables']['invoices']['Row']
type InvoiceItemRow = Database['public']['Tables']['invoice_items']['Row']
type ProfileRow = Database['public']['Tables']['profiles']['Row']

/**
 * Database rows -> template data. Three callers need this exact mapping
 * (the owner's PDF route, the public route, and the send action's cache
 * write); keeping it in one place is what stops a field being threaded
 * into one copy and forgotten in the others — which is how `notes` ended
 * up saved but never printed.
 */
export function buildInvoiceDataFromRow(
  invoice: InvoiceRow,
  items: InvoiceItemRow[],
  profile: ProfileRow | null | undefined,
): { data: InvoiceTemplateData; rows: InvoiceLineRow[] } {
  const supplierAddressLines = [
    profile?.address_line1,
    profile?.address_line2,
    [profile?.city, profile?.postal_code].filter(Boolean).join(' ') || null,
  ].filter((line): line is string => Boolean(line))

  return buildInvoiceData({
    invoiceNumber: invoice.number,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    placeOfSupply: invoice.place_of_supply ?? '',
    gstTreatment: invoice.gst_treatment,
    currency: invoice.currency,
    notes: invoice.notes ?? '',
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
    items: items.map((item) => ({
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
}
