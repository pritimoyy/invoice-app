'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { computeInvoiceTax, type GstTreatment } from '@/lib/tax'
import {
  computeLineSubtotal,
  computeLineTotal,
  roundToNearestRupee,
} from '@/lib/money'
import { assignNextInvoiceNumber } from '@/lib/numbering'
import { createClient } from '@/lib/supabase/server'

export type DraftLineItemInput = {
  description: string
  sacCode: string
  unit: string
  quantity: number
  unitPricePaise: number
  discountPaise: number
  taxRateBps: number
}

export type SaveDraftInput = {
  clientId: string
  issueDate: string
  dueDate: string | null
  gstTreatment: GstTreatment
  currency: string
  template: string
  discountPaise: number
  notes: string
  terms: string
  items: DraftLineItemInput[]
}

export type SaveDraftState = {
  error: string | null
}

/**
 * A brand-new draft needs *something* non-null and unique in `number`,
 * `fy`, and `seq` — those columns have no default, and there's a uniqueness
 * constraint on each. But CLAUDE.md is explicit: numbering only happens on
 * the draft → sent transition (Phase 5, not built yet), never on draft
 * creation. So this stands in a placeholder derived from the row's own id
 * — globally unique by construction, obviously not a real invoice number —
 * that Phase 5's send action will overwrite with the real
 * next_invoice_number() result.
 */
function draftNumberPlaceholder(id: string) {
  return `DRAFT-${id.slice(0, 8)}`
}

/**
 * Best-effort starting point for gst_treatment, not a determination — the
 * user sees it as a normal editable field and can always change it. Actual
 * tax correctness never depends on this guess being right, only on
 * whatever value ends up stored when the invoice is saved.
 */
function suggestGstTreatment(
  isGstRegistered: boolean,
  supplierStateCode: string | null,
  clientCountry: string,
  clientStateCode: string | null,
): GstTreatment {
  if (!isGstRegistered) return 'unregistered'
  if (clientCountry !== 'IN') return 'export'
  if (clientStateCode && clientStateCode === supplierStateCode) {
    return 'intra_state'
  }
  return 'inter_state'
}

export async function createDraftInvoice(formData: FormData) {
  const clientId = String(formData.get('client_id') ?? '')
  if (!clientId) {
    throw new Error('A client is required to start an invoice.')
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const [{ data: client, error: clientError }, { data: profile }] =
    await Promise.all([
      supabase.from('clients').select('*').eq('id', clientId).single(),
      supabase.from('profiles').select('*').eq('user_id', user.id).maybeSingle(),
    ])

  if (clientError || !client) {
    throw new Error('That client could not be found.')
  }

  const id = crypto.randomUUID()
  const issueDate = new Date().toISOString().slice(0, 10)
  const termsDays = profile?.default_terms_days ?? 15
  const dueDate = new Date(Date.now() + termsDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10)

  const gstTreatment = suggestGstTreatment(
    profile?.is_gst_registered ?? false,
    profile?.state_code ?? null,
    client.country,
    client.state_code,
  )

  const { error } = await supabase.from('invoices').insert({
    id,
    user_id: user.id,
    client_id: client.id,
    number: draftNumberPlaceholder(id),
    fy: id,
    seq: 0,
    status: 'draft',
    issue_date: issueDate,
    due_date: dueDate,
    bill_to_name: client.name,
    bill_to_address: [client.address_line1, client.address_line2, client.city, client.postal_code]
      .filter(Boolean)
      .join(', ') || null,
    bill_to_gstin: client.gstin,
    bill_to_state: client.state,
    bill_to_state_code: client.state_code,
    bill_to_country: client.country,
    gst_treatment: gstTreatment,
    place_of_supply: client.state,
    currency: client.currency,
    notes: profile?.notes_default ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }

  redirect(`/invoices/${id}/edit`)
}

/**
 * Recomputes every stored total from scratch using lib/money.ts and
 * lib/tax.ts — the same functions the editor uses for its live preview —
 * rather than trusting whatever numbers the client sent. Line items are
 * deleted and reinserted wholesale rather than diffed against what's
 * already there: this is a single-user app with no concurrent editors, and
 * add/remove/reorder on a client-held array has no stable identity to diff
 * against anyway.
 */
export async function saveDraftInvoice(
  invoiceId: string,
  input: SaveDraftInput,
): Promise<SaveDraftState> {
  if (input.items.length === 0) {
    return { error: 'Add at least one line item.' }
  }
  // Only the first line is required — the rest are optional bullet
  // sub-items (video titles), per invoice-document.tsx's multi-line
  // description field. The editor validates this too; this is the
  // server-side backstop.
  for (const [i, item] of input.items.entries()) {
    if (!item.description.split('\n')[0]?.trim()) {
      return { error: `Line item ${i + 1} needs a description.` }
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // Once sent, an invoice is frozen — CLAUDE.md's totals-are-stored rule
  // only holds if nothing can write to a sent row after the fact.
  const { data: existing } = await supabase
    .from('invoices')
    .select('status')
    .eq('id', invoiceId)
    .maybeSingle()
  if (existing?.status !== 'draft') {
    return { error: 'This invoice has already been sent and can no longer be edited.' }
  }

  const { data: client } = await supabase
    .from('clients')
    .select('*')
    .eq('id', input.clientId)
    .single()
  if (!client) {
    return { error: 'That client could not be found.' }
  }

  const lineSubtotals = input.items.map((item) => {
    const subtotal = computeLineSubtotal(item.quantity, item.unitPricePaise)
    return computeLineTotal(subtotal, item.discountPaise)
  })

  const taxResult = computeInvoiceTax(
    input.items.map((item, i) => ({
      netPaise: lineSubtotals[i],
      rateBps: item.taxRateBps,
    })),
    input.discountPaise,
    input.gstTreatment,
  )

  const subtotalPaise = lineSubtotals.reduce((s, v) => s + v, 0)
  const preRoundTotal =
    subtotalPaise -
    input.discountPaise +
    taxResult.totals.cgstPaise +
    taxResult.totals.sgstPaise +
    taxResult.totals.igstPaise
  const { totalPaise, roundOffPaise } = roundToNearestRupee(preRoundTotal)

  const { error: invoiceError } = await supabase
    .from('invoices')
    .update({
      client_id: client.id,
      issue_date: input.issueDate,
      due_date: input.dueDate,
      bill_to_name: client.name,
      bill_to_address: [client.address_line1, client.address_line2, client.city, client.postal_code]
        .filter(Boolean)
        .join(', ') || null,
      bill_to_gstin: client.gstin,
      bill_to_state: client.state,
      bill_to_state_code: client.state_code,
      bill_to_country: client.country,
      gst_treatment: input.gstTreatment,
      place_of_supply: client.state,
      currency: input.currency,
      template: input.template,
      subtotal_paise: subtotalPaise,
      discount_paise: input.discountPaise,
      cgst_paise: taxResult.totals.cgstPaise,
      sgst_paise: taxResult.totals.sgstPaise,
      igst_paise: taxResult.totals.igstPaise,
      round_off_paise: roundOffPaise,
      total_paise: totalPaise,
      notes: input.notes || null,
      terms: input.terms || null,
    })
    .eq('id', invoiceId)
    .eq('status', 'draft')

  if (invoiceError) {
    return { error: invoiceError.message }
  }

  const { error: deleteError } = await supabase
    .from('invoice_items')
    .delete()
    .eq('invoice_id', invoiceId)
  if (deleteError) {
    return { error: deleteError.message }
  }

  const rows = input.items.map((item, i) => ({
    user_id: user.id,
    invoice_id: invoiceId,
    position: i,
    description: item.description,
    sac_code: item.sacCode || null,
    unit: item.unit || null,
    quantity: item.quantity,
    unit_price_paise: item.unitPricePaise,
    discount_paise: item.discountPaise,
    tax_rate_bps: item.taxRateBps,
    line_total_paise: lineSubtotals[i],
    tax_paise:
      taxResult.lineTax[i].cgstPaise +
      taxResult.lineTax[i].sgstPaise +
      taxResult.lineTax[i].igstPaise,
  }))

  const { error: insertError } = await supabase
    .from('invoice_items')
    .insert(rows)
  if (insertError) {
    return { error: insertError.message }
  }

  revalidatePath(`/invoices/${invoiceId}/edit`)
  revalidatePath('/invoices')
  return { error: null }
}

export type SendInvoiceState = { error: string | null }

/**
 * The only place next_invoice_number() is called (via lib/numbering.ts) —
 * per CLAUDE.md, numbering happens on the draft -> sent transition, never
 * on draft creation. Scoped to status = 'draft' on the final update so a
 * double-click or a retry can't burn two numbers on one invoice.
 *
 * Does not recompute totals — saveDraftInvoice already wrote the current
 * form state (the caller runs that first), so this only assigns the number
 * and flips status. From here the invoice is immutable: saveDraftInvoice
 * refuses to touch a non-draft row.
 */
export async function sendInvoice(invoiceId: string): Promise<SendInvoiceState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const [{ data: invoice }, { data: profile }] = await Promise.all([
    supabase.from('invoices').select('status, issue_date').eq('id', invoiceId).maybeSingle(),
    supabase.from('profiles').select('invoice_prefix').eq('user_id', user.id).maybeSingle(),
  ])

  if (!invoice) {
    return { error: 'Invoice not found.' }
  }
  if (invoice.status !== 'draft') {
    return { error: 'This invoice has already been sent.' }
  }

  let numbering
  try {
    numbering = await assignNextInvoiceNumber(
      supabase,
      user.id,
      invoice.issue_date,
      profile?.invoice_prefix ?? 'INV',
    )
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Could not assign an invoice number.' }
  }

  const { error } = await supabase
    .from('invoices')
    .update({
      number: numbering.number,
      fy: numbering.fy,
      seq: numbering.seq,
      status: 'sent',
      sent_at: new Date().toISOString(),
    })
    .eq('id', invoiceId)
    .eq('status', 'draft')

  if (error) {
    return { error: error.message }
  }

  revalidatePath(`/invoices/${invoiceId}/edit`)
  revalidatePath('/invoices')
  return { error: null }
}

/**
 * Hard delete, not archive — a draft that was never sent has no real-world
 * consequence to preserve a record of, unlike a client (which might be
 * referenced by history you want to keep even after archiving it). Scoped
 * to status = 'draft' so this can never remove an invoice that's actually
 * gone out.
 * invoice_items cascades on invoice_id, so nothing to clean up separately.
 */
export async function deleteDraftInvoice(invoiceId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('invoices')
    .delete()
    .eq('id', invoiceId)
    .eq('status', 'draft')

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/invoices')
  redirect('/invoices')
}
