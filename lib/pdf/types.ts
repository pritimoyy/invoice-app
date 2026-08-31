import type { GstTreatment } from '@/lib/tax'

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
  igst: string
  roundOff: string
  total: string
  words: string
}

export type InvoiceTemplateData = {
  invoiceNumber: string
  issuedDate: string
  dueDate: string
  placeOfSupply: string
  // Drives which of CGST+SGST / IGST / neither gets printed — see
  // lib/tax.ts. Templates do no tax computation of their own; this is
  // purely "which already-computed line, if any, to show."
  gstTreatment: GstTreatment
  /**
   * Statutory endorsements the document must carry, already resolved to
   * their printed wording. Empty string means "print nothing" — templates
   * never decide when a declaration applies, only where it sits.
   *
   * `exportDeclaration` is the LUT line CLAUDE.md requires on a zero-rated
   * export; `reverseChargeNote` the endorsement for a reverse-charge
   * supply; `exchangeRateNote` the rate a foreign-currency invoice was
   * raised at, which a rupee-keeping accountant needs to reconcile it.
   */
  exportDeclaration: string
  reverseChargeNote: string
  exchangeRateNote: string
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
  // Free text the user typed on this invoice (seeded from
  // profiles.notes_default). Empty string when there's nothing to print —
  // templates skip the block entirely rather than leaving a bare heading.
  notes: string
  payment: {
    bankName: string
    accountNo: string
    ifsc: string
    upiId: string
    termsLabel: string
    // null whenever there's nothing to link to — no UPI id on file, a
    // foreign-currency invoice, or nothing owed. See lib/upi.ts.
    upiLink: string | null
  }
  rows: InvoiceLineRow[]
  totals: InvoiceTotals
}
