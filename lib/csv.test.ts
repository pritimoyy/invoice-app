import { describe, expect, it } from 'vitest'

import { paiseToCsvAmount, toCsv } from './csv'

describe('toCsv', () => {
  it('quotes fields containing commas, quotes or newlines', () => {
    const csv = toCsv(
      ['name', 'note'],
      [['Metro Media House, Kolkata', 'line one\nline two'], ['Plain', 'He said "hi"']],
    )
    expect(csv).toBe(
      'name,note\r\n' +
        '"Metro Media House, Kolkata","line one\nline two"\r\n' +
        'Plain,"He said ""hi"""',
    )
  })

  it('renders null and undefined as empty cells', () => {
    expect(toCsv(['a', 'b'], [[null, undefined]])).toBe('a,b\r\n,')
  })
})

describe('paiseToCsvAmount', () => {
  it('formats paise as a plain spreadsheet-parseable decimal', () => {
    expect(paiseToCsvAmount(125000)).toBe('1250.00')
    expect(paiseToCsvAmount(5)).toBe('0.05')
    expect(paiseToCsvAmount(0)).toBe('0.00')
  })

  it('handles negatives (round-off can be negative)', () => {
    expect(paiseToCsvAmount(-42)).toBe('-0.42')
  })

  it('adds no currency symbol or grouping', () => {
    expect(paiseToCsvAmount(10000000)).toBe('100000.00')
  })
})
