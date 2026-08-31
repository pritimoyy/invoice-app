import { InvoiceBento } from './templates/bento'
import { InvoiceBentoII } from './templates/bento-ii'
import { InvoiceInverted } from './templates/inverted'

export const TEMPLATE_OPTIONS = [
  { value: 'inverted', label: 'Inverted' },
  { value: 'bento', label: 'Bento' },
  { value: 'bento-ii', label: 'Bento II' },
] as const

export type TemplateKey = (typeof TEMPLATE_OPTIONS)[number]['value']

/**
 * invoices.template defaults to 'minimal', a name that predates the three
 * templates actually recreated from Claude Design. Falls back to Inverted
 * for that default and for anything else unrecognized, rather than
 * breaking on a naming mismatch that isn't the invoice's fault — used by
 * both the PDF route and the editor's live preview so they can never pick
 * different templates for the same invoice.
 */
export function pickTemplate(templateKey: string) {
  if (templateKey === 'bento') return InvoiceBento
  if (templateKey === 'bento-ii') return InvoiceBentoII
  return InvoiceInverted
}
