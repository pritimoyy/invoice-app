import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'

import { computeDisplayStatus, wasPaidLate } from '@/lib/invoice-status'
import { paiseToEditableString } from '@/lib/money'
import { createClient } from '@/lib/supabase/server'

import { StatusSelect } from '../../status-select'
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
      .select('id, amount_paise, paid_on, method, reference, tds_paise, fees_paise')
      .eq('invoice_id', id)
      .order('paid_on', { ascending: false }),
    supabase
      .from('invoice_balances')
      .select('paid_paise, balance_paise, is_overdue, due_date')
      .eq('id', id)
      .maybeSingle(),
  ])

  if (!invoice) {
    notFound()
  }

  const displayStatus = computeDisplayStatus({
    status: invoice.status,
    isOverdue: balance?.is_overdue ?? false,
    paidLate: wasPaidLate((payments ?? []).map((p) => p.paid_on), balance?.due_date ?? null),
  })

  // One editor serves both kinds — an estimate is the same document with a
  // different `kind`. What differs is downstream: nothing is owed on a
  // quote, so no payments section, and there's no public pay-me link.
  const isEstimate = invoice.kind === 'estimate'

  // max-w-4xl, matching the sibling pages: the app layout's <main> is
  // already max-w-4xl, so anything wider here is silently clamped and only
  // reads as intent that never takes effect.
  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="mb-8 flex items-baseline justify-between gap-4">
        <div className="flex items-baseline gap-3">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-foreground">
            {invoice.bill_to_name}
          </h1>
          <StatusSelect
            invoiceId={invoice.id}
            status={invoice.status}
            displayStatus={displayStatus}
            allowSend={false}
          />
          {invoice.sent_at ? (
            <span className="text-[11px] text-muted-foreground">
              Sent{' '}
              {new Date(invoice.sent_at).toLocaleDateString('en-IN', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          ) : null}
        </div>
        <div className="flex items-baseline gap-5">
          <a
            href={`/api/invoices/${invoice.id}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-[13px] font-medium text-primary hover:underline"
          >
            Download PDF
          </a>
          {invoice.status !== 'draft' && !isEstimate ? (
            <a
              href={`/i/${invoice.public_token}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-medium text-primary hover:underline"
            >
              Public link
            </a>
          ) : null}
          <Link
            href={isEstimate ? '/estimates' : '/invoices'}
            className="text-[13px] font-medium text-primary hover:underline"
          >
            {isEstimate ? 'Estimates' : 'Invoices'}
          </Link>
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
          hasLut: profile?.has_lut ?? false,
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
          reverseCharge: invoice.reverse_charge,
          exchangeRate: invoice.exchange_rate != null ? String(invoice.exchange_rate) : '',
          internalMemo: invoice.internal_memo ?? '',
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

      {invoice.status !== 'draft' && !isEstimate ? (
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
