/**
 * Shared shape for the three "Turn 3" invoice templates (3a Inverted,
 * 3b Bento, 3d Bento II), recreated from the Claude Design canvas.
 *
 * Every value here is a display string, already formatted. Templates do no
 * arithmetic and no paise<->rupee conversion — that's lib/money.ts and
 * lib/tax.ts's job. A template just lays out whatever it's handed.
 */

export type InvoiceLineRow = {
  n: string
  desc: string
  sac: string
  qty: string
  rate: string
  amt: string
}

export type InvoiceTotals = {
  items: string
  subtotal: string
  discount: string
  cgst: string
  sgst: string
  roundOff: string
  total: string
  words: string
}

export type InvoiceTemplateData = {
  invoiceNumber: string
  issuedDate: string
  dueDate: string
  placeOfSupply: string
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
    stateLabel: string
  }
  payment: {
    bankName: string
    accountNo: string
    ifsc: string
    upiId: string
    termsLabel: string
  }
  rows: InvoiceLineRow[]
  totals: InvoiceTotals
}
