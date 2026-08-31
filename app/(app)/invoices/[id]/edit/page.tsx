import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { paiseToEditableString } from '@/lib/money'
import { createClient } from '@/lib/supabase/server'

import { DeleteInvoiceButton } from '../../delete-button'
import { InvoiceEditor } from './invoice-editor'
import { PaymentsSection } from './payments-section'

export const metadata: Metadata = {
  title: 'Edit invoice',
}

const CLIENT_DETAIL_COLUMNS =
  'id, name, address_line1, address_line2, city, postal_code, gstin, state, state_code, country, currency'

export default async function EditInvoicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // maybeSingle, not single: a bad id or an RLS-blocked row both come back
  // as null data with no error — notFound() below turns that into a real
  // 404 instead of a blank page.
  const [
    { data: invoice },
    { data: items },
    { data: clients },
    { data: profile },
    { data: services },
    { data: payments },
    { data: balance },
  ] = await Promise.all([
    supabase.from('invoices').select('*').eq('id', id).maybeSingle(),
    supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', id)
      .order('position'),
    supabase
      .from('clients')
      .select(CLIENT_DETAIL_COLUMNS)
      .eq('is_archived', false)
      .order('name'),
    supabase.from('profiles').select('*').eq('user_id', user!.id).maybeSingle(),
    supabase
      .from('services')
      .select('id, name, unit, default_rate_paise, sac_code, tax_rate_bps')
      .eq('is_archived', false)
      .order('name'),
    supabase
      .from('payments')
      .select('id, amount_paise, paid_on, method, reference, tds_paise')
      .eq('invoice_id', id)
      .order('paid_on', { ascending: false }),
    supabase
      .from('invoice_balances')
      .select('paid_paise, balance_paise, is_overdue')
      .eq('id', id)
      .maybeSingle(),
  ])

  if (!invoice) {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      <div className="mb-8 flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[22px] font-medium tracking-tight text-neutral-900">
            {invoice.bill_to_name}
          </h1>
          <Badge
            variant="outline"
            className="h-auto rounded-none px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-neutral-500"
          >
            {invoice.status.replace('_', ' ')}
          </Badge>
        </div>
        <div className="flex items-baseline gap-5">
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline"
          >
            Download PDF
          </a>
          {invoice.status !== 'draft' ? (
            <a
              href={`/i/${invoice.public_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline"
            >
              Public link
            </a>
          ) : null}
          <Link
            href="/invoices"
            className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline"
          >
            Invoices
          </Link>
          {invoice.status === 'draft' ? (
            <DeleteInvoiceButton
              invoiceId={invoice.id}
              label="Delete draft"
              className="h-auto px-0 text-[11px] uppercase tracking-[0.12em] text-neutral-500 hover:bg-transparent hover:text-red-700 hover:underline"
            />
          ) : null}
        </div>
      </div>

      <InvoiceEditor
        invoiceId={invoice.id}
        clients={clients ?? []}
        services={services ?? []}
        profile={{
          legalName: profile?.legal_name ?? '',
          tradeName: profile?.trade_name ?? '',
          addressLine1: profile?.address_line1 ?? '',
          addressLine2: profile?.address_line2 ?? '',
          city: profile?.city ?? '',
          postalCode: profile?.postal_code ?? '',
          gstin: profile?.gstin ?? '',
          pan: profile?.pan ?? '',
          bankName: profile?.bank_name ?? '',
          bankAccountNo: profile?.bank_account_no ?? '',
          bankIfsc: profile?.bank_ifsc ?? '',
          upiId: profile?.upi_id ?? '',
          defaultTermsDays: profile?.default_terms_days ?? 15,
        }}
        defaultSacCode={profile?.default_sac_code ?? ''}
        initial={{
          invoiceNumber: invoice.number,
          status: invoice.status,
          clientId: invoice.client_id ?? '',
          issueDate: invoice.issue_date,
          dueDate: invoice.due_date ?? '',
          gstTreatment: invoice.gst_treatment,
          currency: invoice.currency,
          template: invoice.template,
          discount: paiseToEditableString(invoice.discount_paise),
          notes: invoice.notes ?? '',
          terms: invoice.terms ?? '',
          items: (items ?? []).map((item) => ({
            description: item.description,
            sacCode: item.sac_code ?? '',
            unit: item.unit ?? '',
            quantity: String(item.quantity),
            rate: paiseToEditableString(item.unit_price_paise),
            discount: paiseToEditableString(item.discount_paise),
            taxRateBps: item.tax_rate_bps,
          })),
        }}
      />

      {invoice.status !== 'draft' ? (
        <PaymentsSection
          invoiceId={invoice.id}
          currency={invoice.currency}
          paidPaise={balance?.paid_paise ?? 0}
          balancePaise={balance?.balance_paise ?? invoice.total_paise}
          isOverdue={balance?.is_overdue ?? false}
          payments={payments ?? []}
        />
      ) : null}
    </div>
  )
}
