/**
 * gst_treatment -> tax lines. Nothing else in the app computes tax — see
 * CLAUDE.md. The treatment lives on the invoice; the rate lives per line
 * item, since different services on the same invoice can carry different
 * rates (or none). This file combines the two, per line.
 */

import type { Database } from '@/types/database'

import { allocateProportionally } from './money'

export type GstTreatment = Database['public']['Enums']['gst_treatment']

/**
 * The only GST rates this app offers anywhere a rate is picked (line
 * items, the services rate card). A fixed lookup rather than formatting
 * `bps / 100` inline at each call site — bps-to-percent isn't a money
 * conversion (that's lib/money.ts's territory), but it's still one value
 * that every display site should agree on rather than each computing it.
 */
export const TAX_RATE_OPTIONS: { bps: number; label: string }[] = [
  { bps: 0, label: '0%' },
  { bps: 500, label: '5%' },
  { bps: 1200, label: '12%' },
  { bps: 1800, label: '18%' },
  { bps: 2800, label: '28%' },
]

export type TaxLines = {
  cgstPaise: number
  sgstPaise: number
  igstPaise: number
}

const ZERO_TAX: TaxLines = { cgstPaise: 0, sgstPaise: 0, igstPaise: 0 }

/**
 * amountPaise × rateBps / 10000, rounded to the nearest paisa. Both
 * operands are exact integers (paise, and basis points), so their product
 * is computed exactly for any realistic invoice amount — it's only the
 * division by 10000 that's a float, and Math.round recovers the correct
 * integer from that with room to spare.
 */
function applyBps(amountPaise: number, rateBps: number): number {
  return Math.round((amountPaise * rateBps) / 10000)
}

/**
 * Tax lines for a single line item's taxable amount, at its own rate,
 * split according to the invoice's gst_treatment.
 *
 * `unregistered` and `export` both come out to no tax, but for different
 * legal reasons — the supplier isn't GST-registered at all, versus a
 * zero-rated export under LUT — so the two stay separate enum values even
 * though the arithmetic result is identical. Printing the LUT declaration
 * line for an export invoice is a document-layer concern, not this one.
 *
 * For `intra_state`, CGST and SGST are derived by computing the full-rate
 * tax once and splitting it, rather than computing 9% twice independently.
 * Two independent half-rate roundings can disagree with a single full-rate
 * rounding by a paisa on an odd taxable amount (this is exactly the "33.33%
 * of an odd amount" case the build plan calls out) — splitting a single
 * rounded total guarantees cgstPaise + sgstPaise === the full tax amount,
 * every time, which is the property that actually matters: an invoice that
 * reconciles to the paisa.
 */
export function computeLineTax(
  taxableAmountPaise: number,
  rateBps: number,
  treatment: GstTreatment,
): TaxLines {
  if (treatment === 'unregistered' || treatment === 'export') {
    return ZERO_TAX
  }

  if (treatment === 'inter_state') {
    return { ...ZERO_TAX, igstPaise: applyBps(taxableAmountPaise, rateBps) }
  }

  // intra_state
  const totalTaxPaise = applyBps(taxableAmountPaise, rateBps)
  const cgstPaise = Math.round(totalTaxPaise / 2)
  const sgstPaise = totalTaxPaise - cgstPaise
  return { cgstPaise, sgstPaise, igstPaise: 0 }
}

/** Sums per-line tax lines into an invoice-level total. */
export function sumTaxLines(lines: TaxLines[]): TaxLines {
  return lines.reduce(
    (sum, l) => ({
      cgstPaise: sum.cgstPaise + l.cgstPaise,
      sgstPaise: sum.sgstPaise + l.sgstPaise,
      igstPaise: sum.igstPaise + l.igstPaise,
    }),
    { ...ZERO_TAX },
  )
}

export type InvoiceTaxLine = {
  /** This line's own subtotal, net of its own per-line discount — not yet
   * touched by the invoice-level discount. */
  netPaise: number
  rateBps: number
}

export type InvoiceTaxResult = {
  /** Each line's taxable amount after its share of the invoice-level
   * discount — what actually got taxed, in the same order as the input. */
  lineTaxablePaise: number[]
  /** Each line's own tax lines, computed on its taxable amount above. */
  lineTax: TaxLines[]
  /** The invoice-level sum — what goes in invoices.cgst_paise etc. */
  totals: TaxLines
}

/**
 * The whole-invoice version: given every line's net amount and rate, plus
 * one invoice-level discount, works out what each line actually owes tax
 * on and sums it. This is still just orchestration of computeLineTax and a
 * generic money split, not a new tax rule — the sample invoice in
 * DESIGN_BRIEF.md is what pins down the order of operations: ₹46,000
 * subtotal less a ₹1,000 discount taxes out to ₹8,100 (18% of the
 * discounted ₹45,000), not ₹8,280 (18% of the undiscounted ₹46,000). So the
 * discount has to reduce the taxable base per line, proportionally to each
 * line's share of the subtotal, before computeLineTax ever runs — a flat
 * invoice-level discount can't just be subtracted from the final total
 * when lines carry different rates, or the GST math comes out wrong.
 */
export function computeInvoiceTax(
  lines: InvoiceTaxLine[],
  invoiceDiscountPaise: number,
  treatment: GstTreatment,
): InvoiceTaxResult {
  const discountShares = allocateProportionally(
    invoiceDiscountPaise,
    lines.map((l) => l.netPaise),
  )
  const lineTaxablePaise = lines.map((l, i) =>
    Math.max(0, l.netPaise - discountShares[i]),
  )
  const lineTax = lineTaxablePaise.map((taxable, i) =>
    computeLineTax(taxable, lines[i].rateBps, treatment),
  )

  return { lineTaxablePaise, lineTax, totals: sumTaxLines(lineTax) }
}
