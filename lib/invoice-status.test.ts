import { describe, expect, it } from 'vitest'

import { computeDisplayStatus, wasPaidLate } from './invoice-status'

describe('computeDisplayStatus', () => {
  it('leaves draft and cancelled alone', () => {
    expect(computeDisplayStatus({ status: 'draft', isOverdue: false, paidLate: false })).toBe('draft')
    expect(computeDisplayStatus({ status: 'cancelled', isOverdue: false, paidLate: false })).toBe(
      'cancelled',
    )
  })

  it('shows overdue instead of sent/partially_paid when the balance is late', () => {
    expect(computeDisplayStatus({ status: 'sent', isOverdue: true, paidLate: false })).toBe('overdue')
    expect(computeDisplayStatus({ status: 'partially_paid', isOverdue: true, paidLate: false })).toBe(
      'overdue',
    )
  })

  it('leaves sent/partially_paid alone when not overdue', () => {
    expect(computeDisplayStatus({ status: 'sent', isOverdue: false, paidLate: false })).toBe('sent')
    expect(computeDisplayStatus({ status: 'partially_paid', isOverdue: false, paidLate: false })).toBe(
      'partially_paid',
    )
  })

  it('shows paid_late instead of paid when the completing payment was late', () => {
    expect(computeDisplayStatus({ status: 'paid', isOverdue: false, paidLate: true })).toBe('paid_late')
    expect(computeDisplayStatus({ status: 'paid', isOverdue: false, paidLate: false })).toBe('paid')
  })
})

describe('wasPaidLate', () => {
  it('is false with no due date or no payments', () => {
    expect(wasPaidLate([], '2026-09-01')).toBe(false)
    expect(wasPaidLate(['2026-09-05'], null)).toBe(false)
  })

  it('compares the latest payment, not the first', () => {
    expect(wasPaidLate(['2026-08-20', '2026-09-05'], '2026-09-01')).toBe(true)
    expect(wasPaidLate(['2026-09-05', '2026-08-20'], '2026-09-01')).toBe(true)
  })

  it('is false when the latest payment lands on or before the due date', () => {
    expect(wasPaidLate(['2026-08-20', '2026-08-25'], '2026-09-01')).toBe(false)
    expect(wasPaidLate(['2026-09-01'], '2026-09-01')).toBe(false)
  })
})
