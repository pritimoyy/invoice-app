'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import type { Database } from '@/types/database'

export type PaymentMethod = Database['public']['Enums']['payment_method']

export type RecordPaymentInput = {
  amountPaise: number
  paidOn: string
  method: PaymentMethod
  reference: string
  tdsPaise: number
  feesPaise: number
}

export type PaymentActionState = { error: string | null }

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * invoice_status carries the paid/unpaid dimension (draft/sent/
 * partially_paid/paid) as a stored, at-a-glance field — same reasoning as
 * storing invoice totals: cheaper to keep in sync on write than to make
 * every list/dashboard query join invoice_balances. 'overdue' is
 * deliberately never written here — it's time-based (today vs due_date),
 * which a write-time recompute can't track without a cron this app
 * doesn't have, so it stays a live-computed flag (invoice_balances.is_overdue)
 * wherever it's shown instead.
 */
async function recomputeInvoiceStatus(supabase: SupabaseServerClient, invoiceId: string) {
  const { data: balance } = await supabase
    .from('invoice_balances')
    .select('status, total_paise, paid_paise')
    .eq('id', invoiceId)
    .maybeSingle()

  if (!balance || balance.status === 'draft' || balance.status === 'cancelled') return

  const totalPaise = balance.total_paise ?? 0
  const paidPaise = balance.paid_paise ?? 0
  const nextStatus =
    totalPaise > 0 && paidPaise >= totalPaise
      ? 'paid'
      : paidPaise > 0
        ? 'partially_paid'
        : 'sent'

  if (nextStatus !== balance.status) {
    await supabase.from('invoices').update({ status: nextStatus }).eq('id', invoiceId)
  }
}

export async function recordPayment(
  invoiceId: string,
  input: RecordPaymentInput,
): Promise<PaymentActionState> {
  if (input.amountPaise <= 0) {
    return { error: 'Payment amount must be greater than zero.' }
  }
  if (input.tdsPaise < 0 || input.feesPaise < 0) {
    return { error: 'TDS and fees cannot be negative.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: invoice } = await supabase
    .from('invoices')
    .select('status')
    .eq('id', invoiceId)
    .maybeSingle()
  if (!invoice) {
    return { error: 'Invoice not found.' }
  }
  if (invoice.status === 'draft') {
    return { error: 'Send this invoice before recording a payment against it.' }
  }
  if (invoice.status === 'cancelled') {
    return { error: 'This invoice is cancelled.' }
  }

  const { error } = await supabase.from('payments').insert({
    user_id: user.id,
    invoice_id: invoiceId,
    amount_paise: input.amountPaise,
    paid_on: input.paidOn,
    method: input.method,
    reference: input.reference || null,
    tds_paise: input.tdsPaise,
    fees_paise: input.feesPaise,
  })
  if (error) {
    return { error: error.message }
  }

  await recomputeInvoiceStatus(supabase, invoiceId)

  revalidatePath(`/invoices/${invoiceId}/edit`)
  revalidatePath('/invoices')
  return { error: null }
}

/**
 * Hard delete — correcting a mis-entered payment (wrong amount, wrong
 * invoice) by removing and re-adding is simpler than building an edit
 * form for what should be a rare mistake. Recomputes status afterward:
 * deleting the payment that tipped an invoice into 'paid' must be able to
 * drop it back to 'partially_paid' or 'sent'.
 */
export async function deletePayment(paymentId: string, invoiceId: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('payments').delete().eq('id', paymentId)
  if (error) {
    throw new Error(error.message)
  }

  await recomputeInvoiceStatus(supabase, invoiceId)

  revalidatePath(`/invoices/${invoiceId}/edit`)
  revalidatePath('/invoices')
}
