import { describe, expect, it } from 'vitest'

import {
  allocateProportionally,
  computeLineSubtotal,
  computeLineTotal,
  formatPaise,
  numberToIndianWords,
  paiseToEditableString,
  parseRupeesToPaise,
  roundToNearestRupee,
} from './money'

describe('formatPaise', () => {
  it('formats with Indian digit grouping and two decimals', () => {
    expect(formatPaise(125000)).toBe('₹1,250.00')
    expect(formatPaise(12300000)).toBe('₹1,23,000.00')
  })

  it('formats zero', () => {
    expect(formatPaise(0)).toBe('₹0.00')
  })

  it('formats negative amounts', () => {
    expect(formatPaise(-50)).toBe('-₹0.50')
  })

  it('can omit the paise decimals', () => {
    expect(formatPaise(2600000, { showPaise: false })).toBe('₹26,000')
  })

  it('rejects a non-integer paise value', () => {
    expect(() => formatPaise(125000.5)).toThrow()
  })
})

describe('parseRupeesToPaise', () => {
  it('parses a whole rupee amount', () => {
    expect(parseRupeesToPaise('1250')).toBe(125000)
  })

  it('parses two decimal places', () => {
    expect(parseRupeesToPaise('1250.50')).toBe(125050)
  })

  it('pads a single decimal place', () => {
    expect(parseRupeesToPaise('19.9')).toBe(1990)
  })

  it('strips thousands separators', () => {
    expect(parseRupeesToPaise('1,23,456.78')).toBe(12345678)
  })

  it('handles the classic float trap exactly', () => {
    // Math.round(parseFloat('19.99') * 100) is the anti-pattern this
    // function exists to avoid — assert the string path gets it exactly
    // right regardless.
    expect(parseRupeesToPaise('19.99')).toBe(1999)
  })

  it('parses negative amounts', () => {
    expect(parseRupeesToPaise('-40.5')).toBe(-4050)
  })

  it('rejects garbage input', () => {
    expect(parseRupeesToPaise('abc')).toBeNull()
    expect(parseRupeesToPaise('')).toBeNull()
    expect(parseRupeesToPaise('1.234')).toBeNull()
    expect(parseRupeesToPaise('1.2.3')).toBeNull()
  })
})

describe('computeLineSubtotal', () => {
  it('multiplies a whole quantity', () => {
    expect(computeLineSubtotal(4, 650000)).toBe(2600000)
  })

  it('handles a fractional quantity — 2.5 hours', () => {
    expect(computeLineSubtotal(2.5, 100000)).toBe(250000)
  })

  it('handles a three-decimal quantity without drift', () => {
    expect(computeLineSubtotal(33.333, 100000)).toBe(3333300)
  })
})

describe('computeLineTotal', () => {
  it('subtracts a discount smaller than the subtotal', () => {
    expect(computeLineTotal(100000, 10000)).toBe(90000)
  })

  it('zeroes out when the discount equals the subtotal exactly', () => {
    expect(computeLineTotal(100000, 100000)).toBe(0)
  })

  it('clamps at zero when the discount exceeds the line total', () => {
    expect(computeLineTotal(50000, 75000)).toBe(0)
  })
})

describe('roundToNearestRupee', () => {
  it('rounds up odd paise', () => {
    expect(roundToNearestRupee(125051)).toEqual({
      totalPaise: 125100,
      roundOffPaise: 49,
    })
  })

  it('rounds down odd paise', () => {
    expect(roundToNearestRupee(125049)).toEqual({
      totalPaise: 125000,
      roundOffPaise: -49,
    })
  })

  it('leaves an exact rupee amount untouched', () => {
    expect(roundToNearestRupee(125000)).toEqual({
      totalPaise: 125000,
      roundOffPaise: 0,
    })
  })
})

describe('allocateProportionally', () => {
  it('splits evenly when weights are equal', () => {
    expect(allocateProportionally(300, [100, 100, 100])).toEqual([
      100, 100, 100,
    ])
  })

  it('splits by weight and the parts sum exactly to the total', () => {
    const parts = allocateProportionally(1000, [26000, 8000, 12000])
    expect(parts.reduce((a, b) => a + b, 0)).toBe(1000)
    expect(parts).toEqual([565, 174, 261])
  })

  it('allocates nothing across all-zero weights instead of dividing by zero', () => {
    expect(allocateProportionally(500, [0, 0])).toEqual([0, 0])
  })

  it('gives the whole amount to a single weight', () => {
    expect(allocateProportionally(1000, [46000])).toEqual([1000])
  })
})

describe('paiseToEditableString', () => {
  it('round-trips through parseRupeesToPaise', () => {
    expect(paiseToEditableString(125050)).toBe('1250.50')
    expect(paiseToEditableString(0)).toBe('0.00')
    expect(paiseToEditableString(-4050)).toBe('-40.50')
  })
})

describe('formatPaise currency support', () => {
  it('defaults to INR unchanged', () => {
    expect(formatPaise(150000)).toBe('₹1,500.00')
  })

  it('formats USD with standard thousands grouping', () => {
    expect(formatPaise(150000, { currency: 'USD' })).toBe('$1,500.00')
  })

  it('formats EUR and GBP', () => {
    expect(formatPaise(150000, { currency: 'EUR' })).toBe('€1,500.00')
    expect(formatPaise(150000, { currency: 'GBP' })).toBe('£1,500.00')
  })

  it('falls back to the currency code for an unrecognized currency', () => {
    expect(formatPaise(150000, { currency: 'AUD' })).toBe('AUD 1,500.00')
  })
})

describe('numberToIndianWords', () => {
  it('matches the DESIGN_BRIEF.md sample total exactly', () => {
    expect(numberToIndianWords(5_310_000)).toBe(
      'Rupees Fifty Three Thousand One Hundred Only',
    )
  })

  it('handles zero', () => {
    expect(numberToIndianWords(0)).toBe('Rupees Zero Only')
  })

  it('handles a single rupee', () => {
    expect(numberToIndianWords(100)).toBe('Rupees One Only')
  })

  it('groups by crore and lakh, not million and billion', () => {
    expect(numberToIndianWords(1_23_45_678_00)).toBe(
      'Rupees One Crore Twenty Three Lakh Forty Five Thousand Six Hundred Seventy Eight Only',
    )
  })

  it('handles exactly one crore', () => {
    expect(numberToIndianWords(1_00_00_000_00)).toBe('Rupees One Crore Only')
  })

  it('signs a negative amount', () => {
    expect(numberToIndianWords(-500_00)).toBe('Minus Rupees Five Hundred Only')
  })

  it('rejects a non-integer paise value', () => {
    expect(() => numberToIndianWords(100.5)).toThrow()
  })

  it('rejects an amount that is not a whole rupee', () => {
    expect(() => numberToIndianWords(1000)).not.toThrow()
    expect(() => numberToIndianWords(1050)).toThrow()
  })
})
