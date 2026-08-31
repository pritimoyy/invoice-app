import { NextResponse } from 'next/server'

import { buildInvoiceDataFromRow } from '@/lib/pdf/from-row'
import { renderInvoicePdf } from '@/lib/pdf/render'
import { createClient } from '@/lib/supabase/server'

// fontkit reads the registered .ttf files via fs at request time — this
// route needs the Node runtime, not Edge, which can't do that.
export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const headers = {
    'Content-Type': 'application/pdf',
    'Content-Disposition': `inline; filename="${invoice.number}.pdf"`,
  }

  // A sent invoice has a frozen copy in Storage (written by sendInvoice).
  // Serving that rather than re-rendering is what guarantees the document
  // never changes after it has gone out, even if a template is restyled.
  if (invoice.pdf_path) {
    const { data: cached } = await supabase.storage
      .from('invoices')
      .download(invoice.pdf_path)
    if (cached) {
      return new NextResponse(await cached.arrayBuffer(), { headers })
    }
  }

  const [{ data: items }, { data: profile }] = await Promise.all([
    supabase.from('invoice_items').select('*').eq('invoice_id', id).order('position'),
    supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
  ])

  const { data, rows } = buildInvoiceDataFromRow(invoice, items ?? [], profile)
  const buffer = await renderInvoicePdf(data, rows, invoice.template)

  return new NextResponse(new Uint8Array(buffer), { headers })
}
