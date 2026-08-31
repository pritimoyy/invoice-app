import type { GstTreatment } from './tax'

/**
 * Statutory endorsements that have to appear on the printed document.
 *
 * Kept as fixed strings in one file rather than assembled at each call
 * site: this is legal wording, and wording that varies between two PDF
 * templates for the same invoice is a defect, not a style choice.
 */

const LUT_DECLARATION =
  'Supply meant for export under Letter of Undertaking without payment of Integrated Tax.'

const REVERSE_CHARGE_DECLARATION = 'Tax payable under reverse charge.'

/**
 * The LUT line CLAUDE.md requires on a zero-rated export.
 *
 * Only printed when an LUT is actually on file. An export invoice raised
 * without one is not a settled situation — zero-rating a supply requires
 * either an LUT/bond or paying IGST and claiming a refund — so this
 * deliberately prints nothing rather than asserting an undertaking that
 * may not exist. The editor warns about that case instead, where it can
 * still be corrected.
 */
export function exportDeclarationFor(treatment: GstTreatment, hasLut: boolean): string {
  return treatment === 'export' && hasLut ? LUT_DECLARATION : ''
}

export function reverseChargeNoteFor(reverseCharge: boolean): string {
  return reverseCharge ? REVERSE_CHARGE_DECLARATION : ''
}

/**
 * "1 USD = 83.500000 INR" for a foreign-currency invoice.
 *
 * The rate is a rate, not money — it is the one numeric value in this app
 * that is legitimately not paise (see CLAUDE.md), so it is formatted from
 * the stored numeric rather than routed through lib/money.ts. Nothing is
 * converted here: no INR equivalent is computed or stored, because there
 * is no column to freeze one onto and a recomputed figure would drift.
 */
export function exchangeRateNoteFor(
  currency: string,
  exchangeRate: number | null | undefined,
): string {
  if (currency === 'INR' || exchangeRate == null || exchangeRate <= 0) return ''
  return `Exchange rate: 1 ${currency} = ${exchangeRate.toFixed(6)} INR`
}
