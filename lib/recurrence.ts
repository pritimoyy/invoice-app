import type { Database } from '@/types/database'

export type Cadence = Database['public']['Enums']['recurrence_cadence']

export const CADENCE_OPTIONS: { value: Cadence; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'fortnightly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
]

export const CADENCE_LABEL: Record<Cadence, string> = Object.fromEntries(
  CADENCE_OPTIONS.map((o) => [o.value, o.label]),
) as Record<Cadence, string>

/**
 * Next occurrence after `fromIso` (a YYYY-MM-DD date).
 *
 * Month arithmetic is done on the calendar fields rather than by adding
 * days, and clamped to the target month's length: a schedule anchored on
 * the 31st must land on 28/29 Feb, not silently roll into March, which is
 * what `new Date(y, m + 1, 31)` does. Day-based cadences are exact
 * multiples of 7 and need no clamping.
 *
 * Pure string in / string out, so it never touches a timezone — see
 * lib/dates.ts for why that matters here.
 */
export function nextOccurrence(fromIso: string, cadence: Cadence): string {
  const [y, m, d] = fromIso.split('-').map(Number)

  if (cadence === 'weekly' || cadence === 'fortnightly') {
    const days = cadence === 'weekly' ? 7 : 14
    // UTC arithmetic on a date-only value: no local offset to shift the day.
    const t = Date.UTC(y, m - 1, d) + days * 24 * 60 * 60 * 1000
    return new Date(t).toISOString().slice(0, 10)
  }

  const monthsToAdd = cadence === 'monthly' ? 1 : cadence === 'quarterly' ? 3 : 12
  const targetMonthIndex = m - 1 + monthsToAdd
  const targetYear = y + Math.floor(targetMonthIndex / 12)
  const targetMonth = ((targetMonthIndex % 12) + 12) % 12

  // Day 0 of the following month is the last day of the target month.
  const lastDayOfTarget = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate()
  const day = Math.min(d, lastDayOfTarget)

  return `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
