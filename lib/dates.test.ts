import { describe, expect, it } from 'vitest'

import { isoDatePlusDays, startOfMonthIso, todayIso } from './dates'

// 02:00 IST on 31 Aug is 20:30 UTC on 30 Aug — the window where a naive
// toISOString() reports the wrong calendar day for Kolkata.
const EARLY_MORNING_IST = new Date('2026-08-31T02:00:00+05:30')
const FIRST_OF_MONTH_IST = new Date('2026-08-01T09:00:00+05:30')

describe('todayIso', () => {
  it('reports the Kolkata calendar day, not the UTC one', () => {
    expect(EARLY_MORNING_IST.toISOString().slice(0, 10)).toBe('2026-08-30') // the bug
    expect(todayIso(EARLY_MORNING_IST)).toBe('2026-08-31') // the fix
  })

  it('is stable through the middle of the day', () => {
    expect(todayIso(FIRST_OF_MONTH_IST)).toBe('2026-08-01')
  })
})

describe('startOfMonthIso', () => {
  it('does not slip into the previous month', () => {
    // new Date(2026, 7, 1).toISOString() would give 2026-07-31 from IST.
    expect(startOfMonthIso(FIRST_OF_MONTH_IST)).toBe('2026-08-01')
    expect(startOfMonthIso(EARLY_MORNING_IST)).toBe('2026-08-01')
  })
})

describe('isoDatePlusDays', () => {
  it('walks forward in Kolkata days', () => {
    expect(isoDatePlusDays(7, FIRST_OF_MONTH_IST)).toBe('2026-08-08')
  })

  it('crosses a month boundary correctly', () => {
    expect(isoDatePlusDays(7, EARLY_MORNING_IST)).toBe('2026-09-07')
  })

  it('accepts negatives', () => {
    expect(isoDatePlusDays(-1, FIRST_OF_MONTH_IST)).toBe('2026-07-31')
  })
})
