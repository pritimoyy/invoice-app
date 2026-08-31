import { describe, expect, it } from 'vitest'

import { buildUpiLink } from './upi'

const base = {
  upiId: 'bera@upi',
  payeeName: 'Studio Bera',
  currency: 'INR',
  amountPaise: 2360000,
  invoiceNumber: 'INV/26-27/0001',
}

describe('buildUpiLink', () => {
  it('builds a upi://pay link with the amount in rupees', () => {
    const link = buildUpiLink(base)
    expect(link).toBe(
      'upi://pay?pa=bera%40upi&pn=Studio%20Bera&am=23600.00&cu=INR&tn=INV%2F26-27%2F0001',
    )
  })

  it('returns null with no UPI id on file', () => {
    expect(buildUpiLink({ ...base, upiId: null })).toBeNull()
    expect(buildUpiLink({ ...base, upiId: '' })).toBeNull()
  })

  it('returns null for a non-INR invoice', () => {
    expect(buildUpiLink({ ...base, currency: 'USD' })).toBeNull()
  })

  it('returns null when nothing is owed', () => {
    expect(buildUpiLink({ ...base, amountPaise: 0 })).toBeNull()
  })
})
