import { formatPaise, numberToIndianWords } from '@/lib/money'
import type { GstTreatment } from '@/lib/tax'
import { buildUpiLink } from '@/lib/upi'

import type { InvoiceLineRow, InvoiceTemplateData } from './types'

/**
 * Everything downstream of "I already know the values" — turning raw
 * fields into the display strings lib/pdf/templates expect. Used by both
 * the server-rendered PDF route (reading a saved invoice + its line items)
 * and the editor's live preview (reading in-progress form state), so a
 * saved PDF and its live preview are guaranteed to render identically for
 * the same data — they're the same function, not two hand-kept-in-sync
 * copies of the same formatting logic.
 *
 * Money formatting only happens here, not in either caller: currency comes
 * in once and every amount in the output is formatted through it.
 */

function formatDate(iso: string | null) {
  if (!iso) return ''
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export type BuildInvoiceDataInput = {
  invoiceNumber: string
  issueDate: string | null
  dueDate: string | null
  placeOfSupply: string
  gstTreatment: GstTreatment
  currency: string
  notes: string
  supplier: {
    name: string
    addressLines: string[]
    gstin: string
    pan: string
  }
  billTo: {
    name: string
    addressLines: string[]
    gstin: string
    state: string
    stateCode: string
    country: string
  }
  payment: {
    bankName: string
    accountNo: string
    ifsc: string
    upiId: string
    termsLabel: string
  }
  items: {
    description: string
    sacCode: string
    unit: string
    quantity: string
    unitPricePaise: number
    lineTotalPaise: number
  }[]
  totals: {
    subtotalPaise: number
    discountPaise: number
    cgstPaise: number
    sgstPaise: number
    igstPaise: number
    roundOffPaise: number
    totalPaise: number
  }
}

export function buildInvoiceData(input: BuildInvoiceDataInput): {
  data: InvoiceTemplateData
  rows: InvoiceLineRow[]
} {
  const { currency } = input

  const rows: InvoiceLineRow[] = input.items.map((item, i) => ({
    n: String(i + 1).padStart(2, '0'),
    desc: item.description,
    sac: item.sacCode,
    qty: [item.quantity, item.unit].filter(Boolean).join(' '),
    rate: formatPaise(item.unitPricePaise, { currency }),
    amt: formatPaise(item.lineTotalPaise, { currency }),
  }))

  const stateLabel =
    input.billTo.state && input.billTo.stateCode
      ? `${input.billTo.state} (${input.billTo.stateCode})`
      : input.billTo.state || (input.billTo.country !== 'IN' ? input.billTo.country : '')

  const data: InvoiceTemplateData = {
    invoiceNumber: input.invoiceNumber,
    issuedDate: formatDate(input.issueDate),
    dueDate: formatDate(input.dueDate),
    placeOfSupply: input.placeOfSupply,
    gstTreatment: input.gstTreatment,
    notes: input.notes.trim(),
    supplier: input.supplier,
    billTo: {
      name: input.billTo.name,
      addressLines: input.billTo.addressLines,
      gstin: input.billTo.gstin,
      stateLabel,
    },
    payment: {
      ...input.payment,
      upiLink: buildUpiLink({
        upiId: input.payment.upiId,
        payeeName: input.supplier.name,
        currency,
        amountPaise: input.totals.totalPaise,
        invoiceNumber: input.invoiceNumber,
      }),
    },
    rows,
    totals: {
      items: `${rows.length} ${rows.length === 1 ? 'item' : 'items'}`,
      subtotal: formatPaise(input.totals.subtotalPaise, { currency }),
      discount:
        input.totals.discountPaise > 0
          ? formatPaise(input.totals.discountPaise, { currency })
          : '—',
      cgst: formatPaise(input.totals.cgstPaise, { currency }),
      sgst: formatPaise(input.totals.sgstPaise, { currency }),
      igst: formatPaise(input.totals.igstPaise, { currency }),
      roundOff: formatPaise(input.totals.roundOffPaise, { currency }),
      total: formatPaise(input.totals.totalPaise, { currency }),
      words:
        currency === 'INR' ? numberToIndianWords(input.totals.totalPaise) : '',
    },
  }

  return { data, rows }
}
