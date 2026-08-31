import { describe, expect, it } from 'vitest'

import { computeInvoiceTax, computeLineTax, sumTaxLines } from './tax'

describe('computeLineTax', () => {
  it('unregistered carries no tax lines regardless of rate', () => {
    expect(computeLineTax(100000, 1800, 'unregistered')).toEqual({
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
    })
  })

  it('export is zero-rated regardless of rate', () => {
    expect(computeLineTax(100000, 1800, 'export')).toEqual({
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
    })
  })

  it('inter_state charges a single IGST line at the full rate', () => {
    expect(computeLineTax(100000, 1800, 'inter_state')).toEqual({
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 18000,
    })
  })

  it('intra_state splits into CGST + SGST summing to the full rate', () => {
    const result = computeLineTax(100000, 1800, 'intra_state')
    expect(result.igstPaise).toBe(0)
    expect(result.cgstPaise + result.sgstPaise).toBe(18000)
    expect(result.cgstPaise).toBe(9000)
    expect(result.sgstPaise).toBe(9000)
  })

  it('33.33% of an odd amount still reconciles to the paisa', () => {
    // 1000 paise at 33.33% (3333 bps): the full-rate tax is
    // round(1000 * 3333 / 10000) = round(333.3) = 333. Splitting that
    // single rounded total is what guarantees cgst + sgst === 333 exactly.
    const result = computeLineTax(1000, 3333, 'intra_state')
    expect(result.cgstPaise + result.sgstPaise).toBe(333)
    expect(result.cgstPaise).toBe(167)
    expect(result.sgstPaise).toBe(166)
  })

  it('avoids the divergence two independent half-rate roundings would hit', () => {
    // 25 paise at 18%: the correct full-rate tax is
    // round(25 * 1800 / 10000) = round(4.5) = 5. Rounding 9% twice
    // independently instead — round(25 * 900 / 10000) = round(2.25) = 2,
    // doubled — gives 4, a paisa short of the real total. Splitting the
    // single rounded total avoids that divergence entirely.
    const result = computeLineTax(25, 1800, 'intra_state')
    expect(result.cgstPaise + result.sgstPaise).toBe(5)
  })

  it('zero-rate line item carries no tax under any treatment', () => {
    expect(computeLineTax(100000, 0, 'intra_state')).toEqual({
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
    })
    expect(computeLineTax(100000, 0, 'inter_state')).toEqual({
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
    })
  })
})

describe('sumTaxLines', () => {
  it('sums an empty list to zero', () => {
    expect(sumTaxLines([])).toEqual({
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
    })
  })

  it('sums multiple lines', () => {
    const lines = [
      { cgstPaise: 900, sgstPaise: 900, igstPaise: 0 },
      { cgstPaise: 450, sgstPaise: 450, igstPaise: 0 },
    ]
    expect(sumTaxLines(lines)).toEqual({
      cgstPaise: 1350,
      sgstPaise: 1350,
      igstPaise: 0,
    })
  })
})

describe('computeInvoiceTax', () => {
  it('reproduces the DESIGN_BRIEF.md sample invoice to the paisa', () => {
    // Reel edit ₹26,000 · Motion graphics ₹8,000 · Shoot day ₹12,000, all
    // at 18%, less a ₹1,000 invoice discount. The brief's own totals:
    // Subtotal ₹46,000 · Discount ₹1,000 · CGST 9% ₹4,050 · SGST 9% ₹4,050
    // · Total ₹53,100 — this is the numbers proving the discount reduces
    // the taxable base (18% of ₹45,000 = ₹8,100 total tax) rather than
    // just the final total (which would tax the full ₹46,000 instead).
    const lines = [
      { netPaise: 2_600_000, rateBps: 1800 },
      { netPaise: 800_000, rateBps: 1800 },
      { netPaise: 1_200_000, rateBps: 1800 },
    ]
    const result = computeInvoiceTax(lines, 100_000, 'intra_state')

    expect(result.totals).toEqual({
      cgstPaise: 405_000,
      sgstPaise: 405_000,
      igstPaise: 0,
    })

    const subtotal = lines.reduce((s, l) => s + l.netPaise, 0)
    const total =
      subtotal -
      100_000 +
      result.totals.cgstPaise +
      result.totals.sgstPaise
    expect(total).toBe(5_310_000) // ₹53,100
  })

  it('allocates the discount across lines so shares sum to it exactly', () => {
    const lines = [
      { netPaise: 2_600_000, rateBps: 1800 },
      { netPaise: 800_000, rateBps: 1800 },
      { netPaise: 1_200_000, rateBps: 1800 },
    ]
    const result = computeInvoiceTax(lines, 100_000, 'intra_state')
    const subtotal = lines.reduce((s, l) => s + l.netPaise, 0)
    const taxableSum = result.lineTaxablePaise.reduce((s, v) => s + v, 0)
    expect(subtotal - taxableSum).toBe(100_000)
  })

  it('produces no tax for an unregistered invoice regardless of rate', () => {
    const lines = [{ netPaise: 100_000, rateBps: 1800 }]
    const result = computeInvoiceTax(lines, 0, 'unregistered')
    expect(result.totals).toEqual({
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
    })
  })

  it('handles a discount on a single line item', () => {
    const result = computeInvoiceTax(
      [{ netPaise: 50_000, rateBps: 1800 }],
      50_000,
      'intra_state',
    )
    expect(result.lineTaxablePaise).toEqual([0])
    expect(result.totals).toEqual({
      cgstPaise: 0,
      sgstPaise: 0,
      igstPaise: 0,
    })
  })
})
