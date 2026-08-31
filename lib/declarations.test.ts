import { describe, expect, it } from 'vitest'

import {
  exchangeRateNoteFor,
  exportDeclarationFor,
  reverseChargeNoteFor,
} from './declarations'

describe('exportDeclarationFor', () => {
  it('prints the LUT line on a zero-rated export with an LUT on file', () => {
    expect(exportDeclarationFor('export', true)).toContain('Letter of Undertaking')
  })

  it('prints nothing for an export with no LUT rather than asserting one', () => {
    expect(exportDeclarationFor('export', false)).toBe('')
  })

  it('prints nothing for domestic treatments even with an LUT on file', () => {
    expect(exportDeclarationFor('intra_state', true)).toBe('')
    expect(exportDeclarationFor('inter_state', true)).toBe('')
    expect(exportDeclarationFor('unregistered', true)).toBe('')
  })
})

describe('reverseChargeNoteFor', () => {
  it('prints only when reverse charge applies', () => {
    expect(reverseChargeNoteFor(true)).toBe('Tax payable under reverse charge.')
    expect(reverseChargeNoteFor(false)).toBe('')
  })
})

describe('exchangeRateNoteFor', () => {
  it('states the rate for a foreign-currency invoice', () => {
    expect(exchangeRateNoteFor('USD', 83.5)).toBe('Exchange rate: 1 USD = 83.500000 INR')
  })

  it('prints nothing for an INR invoice — there is no conversion to state', () => {
    expect(exchangeRateNoteFor('INR', 83.5)).toBe('')
  })

  it('prints nothing when no rate has been recorded', () => {
    expect(exchangeRateNoteFor('USD', null)).toBe('')
    expect(exchangeRateNoteFor('USD', undefined)).toBe('')
    expect(exchangeRateNoteFor('USD', 0)).toBe('')
  })
})
