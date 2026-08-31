import { describe, expect, it } from 'vitest'

import { formatInvoiceNumber } from './numbering'

describe('formatInvoiceNumber', () => {
  it('matches the schema comment example', () => {
    expect(formatInvoiceNumber('PM', '2026-27', 7)).toBe('PM/26-27/0007')
  })

  it('pads seq to 4 digits', () => {
    expect(formatInvoiceNumber('INV', '2026-27', 1)).toBe('INV/26-27/0001')
  })

  it('does not truncate a seq wider than 4 digits', () => {
    expect(formatInvoiceNumber('INV', '2026-27', 12345)).toBe('INV/26-27/12345')
  })

  it('stays under the 16-char invoices_number_len constraint for a typical prefix', () => {
    expect(formatInvoiceNumber('INV', '2026-27', 9999).length).toBeLessThanOrEqual(16)
  })

  it('shortens the financial year from the full form', () => {
    expect(formatInvoiceNumber('INV', '2099-00', 1)).toBe('INV/99-00/0001')
  })
})
