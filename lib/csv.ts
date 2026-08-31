/**
 * Minimal RFC 4180 CSV writing.
 *
 * Quoting is not optional here: client names contain commas ("Metro Media
 * House, Kolkata"), notes contain newlines, and an unquoted field with
 * either silently shifts every following column — which in an accounting
 * export means numbers landing in the wrong place without any error.
 */

function escapeCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return ''
  const text = String(value)
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`
  }
  return text
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(escapeCell).join(',')]
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(','))
  }
  // CRLF per the spec — Excel on Windows is the likely destination.
  return lines.join('\r\n')
}

/**
 * Paise -> a plain decimal string for spreadsheets: "125000" becomes
 * "1250.00". Deliberately not formatPaise() — no ₹ symbol, no thousands
 * separators, nothing a spreadsheet would refuse to parse as a number.
 */
export function paiseToCsvAmount(paise: number): string {
  const sign = paise < 0 ? '-' : ''
  const abs = Math.abs(paise)
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, '0')}`
}
