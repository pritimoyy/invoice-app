import { describe, expect, it } from 'vitest'

import { nextOccurrence } from './recurrence'

describe('nextOccurrence', () => {
  it('advances by whole weeks', () => {
    expect(nextOccurrence('2026-08-31', 'weekly')).toBe('2026-09-07')
    expect(nextOccurrence('2026-08-31', 'fortnightly')).toBe('2026-09-14')
  })

  it('advances by calendar months', () => {
    expect(nextOccurrence('2026-08-15', 'monthly')).toBe('2026-09-15')
    expect(nextOccurrence('2026-08-15', 'quarterly')).toBe('2026-11-15')
    expect(nextOccurrence('2026-08-15', 'yearly')).toBe('2027-08-15')
  })

  it('rolls over the year boundary', () => {
    expect(nextOccurrence('2026-12-10', 'monthly')).toBe('2027-01-10')
    expect(nextOccurrence('2026-11-30', 'quarterly')).toBe('2027-02-28')
  })

  it('clamps to the last day of a shorter month instead of overflowing', () => {
    // The trap: naive date math turns 31 Jan + 1 month into 3 March.
    expect(nextOccurrence('2027-01-31', 'monthly')).toBe('2027-02-28')
    expect(nextOccurrence('2028-01-31', 'monthly')).toBe('2028-02-29') // leap year
    expect(nextOccurrence('2026-08-31', 'monthly')).toBe('2026-09-30')
  })

  it('keeps the anchor day when the target month is long enough', () => {
    expect(nextOccurrence('2027-02-28', 'monthly')).toBe('2027-03-28')
  })

  it('handles 29 Feb yearly by clamping to 28 Feb in a non-leap year', () => {
    expect(nextOccurrence('2028-02-29', 'yearly')).toBe('2029-02-28')
  })
})
