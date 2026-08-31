import { NextResponse } from 'next/server'

import { loadPublicInvoice } from '@/lib/pdf/load-public-invoice'
import { renderInvoicePdf } from '@/lib/pdf/render'
import { createServiceClient } from '@/lib/supabase/service'

// fontkit reads the registered .ttf files via fs at request time — this
// route needs the Node runtime, not Edge, which can't do that.
export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  const invoice = await loadPublicInvoice(token)
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const headers = {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${invoice.number}.pdf"`,
  }

  // Serve the copy frozen at send time when there is one, so the client's
  // download and the owner's are byte-identical.
  if (invoice.pdfPath) {
    const { data: cached } = await createServiceClient()
      .storage.from('invoices')
      .download(invoice.pdfPath)
    if (cached) {
      return new NextResponse(await cached.arrayBuffer(), { headers })
    }
  }

  const buffer = await renderInvoicePdf(invoice.data, invoice.rows, invoice.template)
  return new NextResponse(new Uint8Array(buffer), { headers })
}
