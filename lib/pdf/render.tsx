import { renderToBuffer } from '@react-pdf/renderer'

import { registerFonts } from './fonts/register'
import { pickTemplate } from './pick-template'
import type { InvoiceLineRow, InvoiceTemplateData } from './types'

/**
 * One place that turns prepared invoice data into PDF bytes, shared by the
 * owner route, the public route, and the send action's cache write — so a
 * downloaded PDF, a client's copy, and the stored copy are the same
 * document rendered the same way.
 *
 * Node runtime only: registerFonts() reads .ttf files off disk.
 */
export async function renderInvoicePdf(
  data: InvoiceTemplateData,
  rows: InvoiceLineRow[],
  template: string,
): Promise<Buffer> {
  registerFonts()
  const Template = pickTemplate(template)
  return renderToBuffer(<Template data={data} rows={rows} />)
}

/** Where a rendered invoice lives in the private `invoices` bucket. */
export function invoicePdfPath(userId: string, invoiceId: string): string {
  return `${userId}/${invoiceId}.pdf`
}
