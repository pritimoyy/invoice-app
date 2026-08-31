import { renderToBuffer } from '@react-pdf/renderer'
import { NextResponse } from 'next/server'

import { registerFonts } from '@/lib/pdf/fonts/register'
import { loadPublicInvoice } from '@/lib/pdf/load-public-invoice'
import { pickTemplate } from '@/lib/pdf/pick-template'

// fontkit reads the registered .ttf files via fs at request time — this
// route needs the Node runtime, not Edge, which can't do that.
export const runtime = 'nodejs'

registerFonts()

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params

  const invoice = await loadPublicInvoice(token)
  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const Template = pickTemplate(invoice.template)
  const buffer = await renderToBuffer(<Template data={invoice.data} rows={invoice.rows} />)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.number}.pdf"`,
    },
  })
}
