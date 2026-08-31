'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { isoDatePlusDays, todayIso } from '@/lib/dates'
import { duplicateInvoiceAsDraft } from '@/lib/duplicate-invoice'
import { buildInvoiceDataFromRow } from '@/lib/pdf/from-row'
import { invoicePdfPath, renderInvoicePdf } from '@/lib/pdf/render'
import { computeInvoiceTax, type GstTreatment } from '@/lib/tax'
import {
  computeLineSubtotal,
  computeLineTotal,
  roundToNearestRupee,
} from '@/lib/money'
import { assignNextInvoiceNumber, type DocKind } from '@/lib/numbering'
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
  reverseCharge: boolean
  /** Rate to INR for a foreign-currency invoice; null for INR. */
  exchangeRate: number | null
  /** Private — never reaches the PDF or the public view. */
  internalMemo: string
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
  const kind: DocKind = formData.get('kind') === 'estimate' ? 'estimate' : 'invoice'

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
  const issueDate = todayIso()
  const termsDays = profile?.default_terms_days ?? 15
  const dueDate = isoDatePlusDays(termsDays)

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
    kind,
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
    template: profile?.default_template ?? 'inverted',
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
      reverse_charge: input.reverseCharge,
      exchange_rate: input.exchangeRate,
      internal_memo: input.internalMemo || null,
    })
    .eq('id', invoiceId)
    .eq('status', 'draft')

  if (invoiceError) {
    return { error: invoiceError.message }
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

  // One RPC, not delete-then-insert: the function body is a single
  // transaction, so an interruption can't leave the invoice with its
  // totals intact but every line item gone. See the migration
  // 20260831210000_replace_invoice_items_atomic.sql.
  const { error: itemsError } = await supabase.rpc('replace_invoice_items', {
    p_invoice_id: invoiceId,
    p_items: rows,
  })
  if (itemsError) {
    return { error: itemsError.message }
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
    supabase
      .from('invoices')
      .select('status, issue_date, total_paise, client_id, kind')
      .eq('id', invoiceId)
      .maybeSingle(),
    supabase.from('profiles').select('invoice_prefix').eq('user_id', user.id).maybeSingle(),
  ])

  if (!invoice) {
    return { error: 'Invoice not found.' }
  }
  if (invoice.status !== 'draft') {
    return { error: 'This invoice has already been sent.' }
  }
  if (!invoice.client_id || invoice.total_paise <= 0) {
    return {
      error: 'This draft has no client or line items yet — open it and fill it in before sending.',
    }
  }

  let numbering
  try {
    numbering = await assignNextInvoiceNumber(
      supabase,
      user.id,
      invoice.issue_date,
      profile?.invoice_prefix ?? 'INV',
      invoice.kind,
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

  // Cache the rendered PDF now, at the moment the invoice is frozen. This
  // is the point of caching here rather than on first download: a sent
  // invoice must produce byte-identical output forever, and a stored file
  // can't drift when a template is later restyled. A failure here is
  // deliberately not fatal — the invoice is already sent and both PDF
  // routes fall back to rendering on demand.
  await cacheInvoicePdf(supabase, user.id, invoiceId)

  revalidatePath(`/invoices/${invoiceId}/edit`)
  revalidatePath('/invoices')
  return { error: null }
}

/**
 * Renders an invoice and stores it in the private `invoices` bucket,
 * recording the path on the row. Best-effort by design: callers treat a
 * failure as "no cache yet", never as a failed send.
 */
async function cacheInvoicePdf(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  invoiceId: string,
) {
  try {
    const [{ data: invoice }, { data: items }, { data: profile }] = await Promise.all([
      supabase.from('invoices').select('*').eq('id', invoiceId).maybeSingle(),
      supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId).order('position'),
      supabase.from('profiles').select('*').eq('user_id', userId).maybeSingle(),
    ])
    if (!invoice) return

    const { data, rows } = buildInvoiceDataFromRow(invoice, items ?? [], profile)
    const buffer = await renderInvoicePdf(data, rows, invoice.template)
    const path = invoicePdfPath(userId, invoiceId)

    const { error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(path, buffer, { contentType: 'application/pdf', upsert: true })
    if (uploadError) return

    await supabase.from('invoices').update({ pdf_path: path }).eq('id', invoiceId)
  } catch {
    // Non-fatal: the send already succeeded, and the PDF routes render on
    // demand when pdf_path is null.
  }
}

/**
 * Estimate -> invoice. Creates a *new* draft invoice rather than flipping
 * the estimate's kind: the estimate keeps its own number and stays on
 * record as the thing that was quoted, and `converted_from_id` links the
 * two. The new invoice starts as a draft with no number, so it still goes
 * through the normal send path and draws from the invoice counter.
 *
 * Totals are copied as stored rather than recomputed — the estimate's
 * numbers are what was agreed, and re-deriving them here could silently
 * differ if a tax rate or client address changed since.
 */
export async function convertEstimateToInvoice(estimateId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data: estimate } = await supabase
    .from('invoices')
    .select('kind')
    .eq('id', estimateId)
    .maybeSingle()

  if (!estimate) {
    throw new Error('Estimate not found.')
  }
  if (estimate.kind !== 'estimate') {
    throw new Error('Only an estimate can be converted to an invoice.')
  }

  const result = await duplicateInvoiceAsDraft(supabase, user.id, estimateId, {
    kind: 'invoice',
    convertedFromId: estimateId,
  })
  if ('error' in result) {
    throw new Error(result.error)
  }

  revalidatePath('/estimates')
  revalidatePath('/invoices')
  redirect(`/invoices/${result.id}/edit`)
}

/**
 * Voids a sent invoice without deleting it — once a real number has gone
 * out, the record has to stay (that's the whole point of sequential
 * numbering) even if the invoice itself falls through. Not offered for
 * 'paid': money has already changed hands, so "cancel" isn't the right
 * operation there. invoice_balances already excludes cancelled rows from
 * every outstanding/overdue total, so this is enough on its own to stop
 * it counting anywhere.
 */
export async function cancelInvoice(invoiceId: string) {
  const supabase = await createClient()

  // No explicit auth.getUser() + redirect() here on purpose: CancelInvoiceButton
  // awaits this inside a try/catch, and redirect() works by throwing —
  // wrapping it in try/catch would intercept that throw and surface it as
  // a raw error instead of letting the redirect happen. RLS already
  // scopes every row to its owner, so an unauthenticated or mismatched
  // call just finds nothing and falls into the "not found" branch below,
  // same as setClientArchived/setServiceArchived already do.
  const { data: invoice } = await supabase
    .from('invoices')
    .select('status')
    .eq('id', invoiceId)
    .maybeSingle()
  if (!invoice) {
    throw new Error('Invoice not found.')
  }
  if (invoice.status !== 'sent' && invoice.status !== 'partially_paid') {
    throw new Error('Only a sent or partially paid invoice can be cancelled.')
  }

  const { error } = await supabase
    .from('invoices')
    .update({ status: 'cancelled' })
    .eq('id', invoiceId)
    .in('status', ['sent', 'partially_paid'])

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/invoices')
  revalidatePath(`/invoices/${invoiceId}/edit`)
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
