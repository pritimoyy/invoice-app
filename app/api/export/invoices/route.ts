import { NextResponse } from 'next/server'

import { paiseToCsvAmount, toCsv } from '@/lib/csv'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

/**
 * Everything the CA needs for a financial year, one row per invoice, as a
 * CSV a spreadsheet will open without complaint.
 *
 * Filtered by `fy` (the stored '2026-27' string) rather than by a date
 * range, so it matches exactly what the numbering sequence used — an
 * invoice issued on 31 March belongs to the FY its number was drawn from,
 * which a naive date filter would put in the wrong year.
 *
 * Drafts are excluded: they have no real number and are not documents yet.
 * Cancelled invoices are included, with their status, because a gap in a
 * GST invoice sequence needs explaining rather than hiding.
 */
export async function GET(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const fy = new URL(request.url).searchParams.get('fy')

  let query = supabase
    .from('invoices')
    .select('*')
    .eq('kind', 'invoice')
    .neq('status', 'draft')
    .order('seq', { ascending: true })
  if (fy) {
    query = query.eq('fy', fy)
  }

  const { data: invoices, error } = await query
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const ids = (invoices ?? []).map((i) => i.id)
  const { data: payments } = ids.length
    ? await supabase
        .from('payments')
        .select('invoice_id, amount_paise, tds_paise')
        .in('invoice_id', ids)
    : { data: [] }

  const paidByInvoice = new Map<string, { paid: number; tds: number }>()
  for (const p of payments ?? []) {
    const acc = paidByInvoice.get(p.invoice_id) ?? { paid: 0, tds: 0 }
    acc.paid += p.amount_paise + p.tds_paise
    acc.tds += p.tds_paise
    paidByInvoice.set(p.invoice_id, acc)
  }

  const csv = toCsv(
    [
      'Invoice number',
      'FY',
      'Issue date',
      'Due date',
      'Status',
      'Client',
      'Client GSTIN',
      'Place of supply',
      'GST treatment',
      'Currency',
      'Subtotal',
      'Discount',
      'CGST',
      'SGST',
      'IGST',
      'Round off',
      'Total',
      'Paid',
      'TDS deducted',
      'Balance',
    ],
    (invoices ?? []).map((inv) => {
      const acc = paidByInvoice.get(inv.id) ?? { paid: 0, tds: 0 }
      return [
        inv.number,
        inv.fy,
        inv.issue_date,
        inv.due_date,
        inv.status,
        inv.bill_to_name,
        inv.bill_to_gstin,
        inv.place_of_supply,
        inv.gst_treatment,
        inv.currency,
        paiseToCsvAmount(inv.subtotal_paise),
        paiseToCsvAmount(inv.discount_paise),
        paiseToCsvAmount(inv.cgst_paise),
        paiseToCsvAmount(inv.sgst_paise),
        paiseToCsvAmount(inv.igst_paise),
        paiseToCsvAmount(inv.round_off_paise),
        paiseToCsvAmount(inv.total_paise),
        paiseToCsvAmount(acc.paid),
        paiseToCsvAmount(acc.tds),
        paiseToCsvAmount(inv.total_paise - acc.paid),
      ]
    }),
  )

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="invoices${fy ? `-${fy}` : ''}.csv"`,
    },
  })
}
