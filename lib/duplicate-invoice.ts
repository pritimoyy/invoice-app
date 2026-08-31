import type { SupabaseClient } from '@supabase/supabase-js'

import { isoDatePlusDays, todayIso } from './dates'
import type { Database } from '@/types/database'

type Client = SupabaseClient<Database>

/**
 * Copies an existing invoice into a fresh draft — the shared engine behind
 * both estimate→invoice conversion and generating the next run of a
 * recurring invoice.
 *
 * Two things it deliberately does not do:
 *
 *  - It never assigns a number. The copy starts as a draft and goes
 *    through the normal send path, so the counter stays the single source
 *    of invoice numbers (CLAUDE.md).
 *  - It copies stored totals rather than recomputing them. The source's
 *    numbers are what was agreed; re-deriving here could silently differ
 *    if a tax rate or address changed in the meantime.
 */
export async function duplicateInvoiceAsDraft(
  supabase: Client,
  userId: string,
  sourceInvoiceId: string,
  options: {
    kind?: Database['public']['Enums']['doc_kind']
    convertedFromId?: string | null
    termsDays?: number
  } = {},
): Promise<{ id: string } | { error: string }> {
  const [{ data: source }, { data: items }] = await Promise.all([
    supabase.from('invoices').select('*').eq('id', sourceInvoiceId).maybeSingle(),
    supabase
      .from('invoice_items')
      .select('*')
      .eq('invoice_id', sourceInvoiceId)
      .order('position'),
  ])

  if (!source) return { error: 'The invoice to copy could not be found.' }

  const id = crypto.randomUUID()
  const { error } = await supabase.from('invoices').insert({
    id,
    user_id: userId,
    client_id: source.client_id,
    kind: options.kind ?? 'invoice',
    // Placeholder, same scheme as a brand-new draft — overwritten by
    // next_invoice_number() when this is sent.
    number: `DRAFT-${id.slice(0, 8)}`,
    fy: id,
    seq: 0,
    status: 'draft',
    issue_date: todayIso(),
    due_date: isoDatePlusDays(options.termsDays ?? 15),
    converted_from_id: options.convertedFromId ?? null,
    bill_to_name: source.bill_to_name,
    bill_to_address: source.bill_to_address,
    bill_to_gstin: source.bill_to_gstin,
    bill_to_state: source.bill_to_state,
    bill_to_state_code: source.bill_to_state_code,
    bill_to_country: source.bill_to_country,
    gst_treatment: source.gst_treatment,
    place_of_supply: source.place_of_supply,
    currency: source.currency,
    template: source.template,
    subtotal_paise: source.subtotal_paise,
    discount_paise: source.discount_paise,
    cgst_paise: source.cgst_paise,
    sgst_paise: source.sgst_paise,
    igst_paise: source.igst_paise,
    round_off_paise: source.round_off_paise,
    total_paise: source.total_paise,
    notes: source.notes,
    terms: source.terms,
  })
  if (error) return { error: error.message }

  if (items && items.length > 0) {
    const { error: itemsError } = await supabase.rpc('replace_invoice_items', {
      p_invoice_id: id,
      p_items: items.map((item, i) => ({
        user_id: userId,
        position: i,
        description: item.description,
        sac_code: item.sac_code,
        unit: item.unit,
        quantity: item.quantity,
        unit_price_paise: item.unit_price_paise,
        discount_paise: item.discount_paise,
        tax_rate_bps: item.tax_rate_bps,
        line_total_paise: item.line_total_paise,
        tax_paise: item.tax_paise,
      })),
    })
    if (itemsError) return { error: itemsError.message }
  }

  return { id }
}
