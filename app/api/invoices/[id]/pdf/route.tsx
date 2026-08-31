import { renderToBuffer } from '@react-pdf/renderer'
import { NextResponse } from 'next/server'

import { registerFonts } from '@/lib/pdf/fonts/register'
import { buildInvoiceData } from '@/lib/pdf/build-invoice-data'
import { pickTemplate } from '@/lib/pdf/pick-template'
import { createClient } from '@/lib/supabase/server'

// fontkit reads the registered .ttf files via fs at request time — this
// route needs the Node runtime, not Edge, which can't do that.
export const runtime = 'nodejs'

// Templates no longer self-register on import (that broke the moment the
// same components got reused for the browser-side live preview, which
// needs fonts loaded from a URL, not a filesystem path) — so the caller
// registers them once, explicitly.
registerFonts()

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

  const [{ data: invoice }, { data: items }, { data: profile }] =
    await Promise.all([
      supabase.from('invoices').select('*').eq('id', id).maybeSingle(),
      supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', id)
        .order('position'),
      supabase
        .from('profiles')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle(),
    ])

  if (!invoice) {
    return NextResponse.json({ error: 'Invoice not found' }, { status: 404 })
  }

  const supplierAddressLines = [
    profile?.address_line1,
    profile?.address_line2,
    [profile?.city, profile?.postal_code].filter(Boolean).join(' ') || null,
  ].filter((line): line is string => Boolean(line))

  const { data, rows } = buildInvoiceData({
    invoiceNumber: invoice.number,
    issueDate: invoice.issue_date,
    dueDate: invoice.due_date,
    placeOfSupply: invoice.place_of_supply ?? '',
    gstTreatment: invoice.gst_treatment,
    currency: invoice.currency,
    supplier: {
      name: profile?.trade_name || profile?.legal_name || '',
      addressLines: supplierAddressLines,
      gstin: profile?.gstin ?? '',
      pan: profile?.pan ?? '',
    },
    billTo: {
      name: invoice.bill_to_name,
      addressLines: invoice.bill_to_address ? [invoice.bill_to_address] : [],
      gstin: invoice.bill_to_gstin ?? '',
      state: invoice.bill_to_state ?? '',
      stateCode: invoice.bill_to_state_code ?? '',
      country: invoice.bill_to_country,
    },
    payment: {
      bankName: profile?.bank_name ?? '',
      accountNo: profile?.bank_account_no ?? '',
      ifsc: profile?.bank_ifsc ?? '',
      upiId: profile?.upi_id ?? '',
      termsLabel:
        invoice.terms || `${profile?.default_terms_days ?? 15} days from issue date`,
    },
    items: (items ?? []).map((item) => ({
      description: item.description,
      sacCode: item.sac_code ?? '',
      unit: item.unit ?? '',
      quantity: String(item.quantity),
      unitPricePaise: item.unit_price_paise,
      lineTotalPaise: item.line_total_paise,
    })),
    totals: {
      subtotalPaise: invoice.subtotal_paise,
      discountPaise: invoice.discount_paise,
      cgstPaise: invoice.cgst_paise,
      sgstPaise: invoice.sgst_paise,
      igstPaise: invoice.igst_paise,
      roundOffPaise: invoice.round_off_paise,
      totalPaise: invoice.total_paise,
    },
  })

  const Template = pickTemplate(invoice.template)
  const buffer = await renderToBuffer(<Template data={data} rows={rows} />)

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="${invoice.number}.pdf"`,
    },
  })
}
