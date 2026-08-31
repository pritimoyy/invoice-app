import { paiseToEditableString } from './money'

/**
 * upi://pay deep links — tapping one on a phone opens the UPI app with
 * amount and payee pre-filled, no manual entry. India-only by
 * construction: doesn't apply to a foreign-currency invoice, and there's
 * nothing to link to if nothing is charged.
 *
 * %20-style encoding (encodeURIComponent), not URLSearchParams' '+' — UPI
 * apps generally parse this as an opaque intent string rather than strict
 * application/x-www-form-urlencoded, and %20 is what real-world UPI links
 * use.
 */
export function buildUpiLink(input: {
  upiId: string | null | undefined
  payeeName: string
  currency: string
  amountPaise: number
  invoiceNumber: string
}): string | null {
  if (!input.upiId || input.currency !== 'INR' || input.amountPaise <= 0) {
    return null
  }

  const params = [
    ['pa', input.upiId],
    ['pn', input.payeeName],
    ['am', paiseToEditableString(input.amountPaise)],
    ['cu', 'INR'],
    ['tn', input.invoiceNumber],
  ]
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join('&')

  return `upi://pay?${params}`
}
