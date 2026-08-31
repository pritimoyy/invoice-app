/**
 * All paise <-> rupee conversion lives here. Nowhere else in the app should
 * multiply or divide a money value by 100 — see CLAUDE.md.
 *
 * Every function here treats money as an integer count of paise. The one
 * place floats legitimately appear is right at the render boundary, where
 * `formatPaise` divides by 100 to build a display string — that division's
 * imprecision is many orders of magnitude smaller than half a paisa, so
 * `Intl.NumberFormat`'s own rounding to 2 decimals always recovers the
 * exact value. What this file will never do is derive a paise value FROM a
 * user-typed decimal string via `parseFloat(x) * 100` — that's the actual
 * anti-pattern (0.1 + 0.2 !== 0.3, and 19.99 * 100 is not reliably 1999).
 * `parseRupeesToPaise` below does that conversion with string arithmetic
 * instead, so it can't drift.
 */

/**
 * `clients.currency` / `invoices.currency` is a free `char(3)` column, not
 * constrained to this list at the database level — these are just the four
 * the app's own selects offer (see client-form.tsx). Money everywhere else
 * in the codebase is called "paise" because INR is the overwhelmingly
 * common case, but the columns really hold "smallest unit of whatever
 * currency the invoice is in" — a USD invoice's *_paise columns are cents.
 * `exchange_rate` on `invoices` is a separate reference field for the
 * INR-equivalent value GST reporting needs; it doesn't change what unit
 * these columns are actually in.
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  INR: '₹',
  USD: '$',
  EUR: '€',
  GBP: '£',
}

// Indian digit grouping (1,23,456) is specifically an INR convention;
// everything else gets the standard thousands grouping.
const GROUPING_LOCALE: Record<string, string> = { INR: 'en-IN' }

const formatterCache = new Map<string, Intl.NumberFormat>()

function getFormatter(currency: string, showPaise: boolean): Intl.NumberFormat {
  const cacheKey = `${currency}:${showPaise}`
  const cached = formatterCache.get(cacheKey)
  if (cached) return cached

  const formatter = new Intl.NumberFormat(GROUPING_LOCALE[currency] ?? 'en-US', {
    minimumFractionDigits: showPaise ? 2 : 0,
    maximumFractionDigits: showPaise ? 2 : 0,
  })
  formatterCache.set(cacheKey, formatter)
  return formatter
}

/**
 * Integer paise (or cents, or whatever the currency's smallest unit is) ->
 * a display string with the right symbol and digit grouping. `paise / 100`
 * here is safe: paise is always an exact integer, and the formatter's own
 * 2-decimal rounding absorbs the negligible float error from the division.
 *
 * Defaults to INR — every existing call site written before this took a
 * currency stays correct without changes.
 */
export function formatPaise(
  paise: number,
  { showPaise = true, currency = 'INR' }: { showPaise?: boolean; currency?: string } = {},
): string {
  if (!Number.isInteger(paise)) {
    throw new Error(`formatPaise expects an integer paise count, got ${paise}`)
  }

  const rupees = paise / 100
  const formatter = getFormatter(currency, showPaise)
  const symbol = CURRENCY_SYMBOLS[currency] ?? `${currency} `
  const sign = rupees < 0 ? '-' : ''
  return `${sign}${symbol}${formatter.format(Math.abs(rupees))}`
}

/**
 * Integer paise -> a plain "1250.50" string, no ₹ sign or digit grouping —
 * the round-trippable form for a controlled rupee <input>, where
 * parseRupeesToPaise is the inverse. formatPaise is for reading; this one
 * is for editing.
 */
export function paiseToEditableString(paise: number): string {
  const rupees = paise / 100
  const sign = rupees < 0 ? '-' : ''
  return sign + Math.abs(rupees).toFixed(2)
}

/**
 * A user-typed rupee string ("1,250.50", "1250", "-40.5") -> integer paise.
 * Pure string arithmetic — never routes the value through parseFloat, so
 * there's no float-rounding step for a bad input to hide behind. Returns
 * null for anything that isn't a plain decimal number.
 */
export function parseRupeesToPaise(input: string): number | null {
  const cleaned = input.trim().replace(/,/g, '')
  const match = /^(-?)(\d+)(?:\.(\d{1,2}))?$/.exec(cleaned)
  if (!match) return null

  const [, sign, whole, fraction = ''] = match
  const paddedFraction = fraction.padEnd(2, '0')
  const magnitude = Number(whole + paddedFraction)

  return sign === '-' ? -magnitude : magnitude
}

/**
 * quantity (up to 3 decimal places, per the invoice_items schema) × an
 * integer paise rate -> integer paise, rounded to the nearest paisa.
 *
 * quantity arrives from Postgres as a JS number (numeric(12,3) serialized
 * through PostgREST's JSON encoding) — there's no string form to parse
 * safely against, so this is a float multiplication. That's fine here: for
 * any realistic invoice quantity and rate, the representable-double error
 * in the product is many orders of magnitude below 0.5, so Math.round
 * always lands on the mathematically correct paisa. This is a different
 * situation from parseRupeesToPaise — that function protects a value at
 * the point it *enters* the system from a decimal string; this one derives
 * a result from a quantity the schema already defines as decimal.
 */
export function computeLineSubtotal(
  quantity: number,
  unitPricePaise: number,
): number {
  return Math.round(quantity * unitPricePaise)
}

/**
 * Line subtotal minus a flat per-line discount, clamped at zero — a
 * discount larger than the line simply zeroes that line out rather than
 * inverting it into a negative amount, which is what real invoicing
 * software does and what a database that goes on to sum these into a
 * total should be able to assume.
 */
export function computeLineTotal(
  subtotalPaise: number,
  discountPaise: number,
): number {
  return Math.max(0, subtotalPaise - discountPaise)
}

/**
 * Splits `totalPaise` across `weights` proportionally, so the parts sum to
 * exactly `totalPaise` — the last part absorbs whatever rounding remainder
 * the others left, the same "round once, allocate the remainder" technique
 * lib/tax.ts uses to split CGST from SGST. Used to spread an invoice-level
 * discount across line items by each line's share of the subtotal, before
 * tax is computed on what's left — a flat rupee count can't be divided
 * evenly across differently-priced lines without drifting off by a paisa.
 *
 * All-zero weights (an invoice with nothing on it yet) allocates nothing to
 * everyone rather than dividing by zero.
 */
export function allocateProportionally(
  totalPaise: number,
  weights: number[],
): number[] {
  const weightSum = weights.reduce((sum, w) => sum + w, 0)
  if (weightSum === 0) return weights.map(() => 0)

  let allocated = 0
  return weights.map((weight, i) => {
    if (i === weights.length - 1) {
      return totalPaise - allocated
    }
    const share = Math.round((totalPaise * weight) / weightSum)
    allocated += share
    return share
  })
}

const ONES = [
  '', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen',
  'Seventeen', 'Eighteen', 'Nineteen',
]
const TENS = [
  '', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety',
]

function twoDigitWords(n: number): string {
  if (n < 20) return ONES[n]
  return TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : '')
}

function threeDigitWords(n: number): string {
  if (n < 100) return twoDigitWords(n)
  const rest = n % 100
  return `${ONES[Math.floor(n / 100)]} Hundred${rest ? ` ${twoDigitWords(rest)}` : ''}`
}

/**
 * Integer paise -> "Rupees Fifty Three Thousand One Hundred Only", the
 * figures-in-words line GST invoices require alongside the numeral total.
 * Grouped by the Indian crore/lakh/thousand scale, not the international
 * million/billion one. Requires a whole-rupee amount — every real caller is
 * `invoices.total_paise`, which is always a multiple of 100 because
 * roundToNearestRupee guarantees it; anything else is a bug upstream, so
 * this throws rather than silently truncating odd paise into words.
 *
 * INR-specific by design, unlike formatPaise: "words" formatting for other
 * currencies isn't a documented requirement anywhere in this project, and
 * the crore/lakh grouping below is meaningless outside Indian currency
 * convention.
 */
export function numberToIndianWords(paise: number): string {
  if (!Number.isInteger(paise)) {
    throw new Error(`numberToIndianWords expects an integer paise count, got ${paise}`)
  }
  if (paise % 100 !== 0) {
    throw new Error(`numberToIndianWords expects a whole-rupee amount, got ${paise} paise`)
  }

  let rupees = Math.abs(paise / 100)
  if (rupees === 0) return 'Rupees Zero Only'

  const crore = Math.floor(rupees / 1_00_00_000)
  rupees %= 1_00_00_000
  const lakh = Math.floor(rupees / 1_00_000)
  rupees %= 1_00_000
  const thousand = Math.floor(rupees / 1000)
  rupees %= 1000
  const hundreds = rupees

  const parts: string[] = []
  if (crore) parts.push(`${threeDigitWords(crore)} Crore`)
  if (lakh) parts.push(`${threeDigitWords(lakh)} Lakh`)
  if (thousand) parts.push(`${threeDigitWords(thousand)} Thousand`)
  if (hundreds) parts.push(threeDigitWords(hundreds))

  const sign = paise < 0 ? 'Minus ' : ''
  return `${sign}Rupees ${parts.join(' ')} Only`
}

/**
 * Rounds a pre-round-off total to the nearest whole rupee — the Indian
 * invoicing convention of a "round off" line absorbing the odd paisa.
 * Returns both the rounded total and the (possibly negative) adjustment
 * that got it there, since both are stored: total_paise and
 * round_off_paise are separate columns on `invoices`.
 */
export function roundToNearestRupee(paise: number): {
  totalPaise: number
  roundOffPaise: number
} {
  const roundedRupees = Math.round(paise / 100)
  const totalPaise = roundedRupees * 100
  return { totalPaise, roundOffPaise: totalPaise - paise }
}
