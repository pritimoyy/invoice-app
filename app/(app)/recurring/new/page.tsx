import type { Metadata } from 'next'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { FormField, FormSection, FormSelect } from '@/components/invoice/form-field'
import { isoDatePlusDays } from '@/lib/dates'
import { formatPaise } from '@/lib/money'
import { CADENCE_OPTIONS } from '@/lib/recurrence'
import { createClient } from '@/lib/supabase/server'

import { createRecurring } from '../actions'

export const metadata: Metadata = {
  title: 'Repeat an invoice',
}

export default async function NewRecurringPage() {
  const supabase = await createClient()

  // Only real invoices can be repeated — a draft has no agreed content yet,
  // and an estimate is a quote, not something you bill again.
  const [{ data: invoices }, { data: existing }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, number, bill_to_name, total_paise, currency')
      .eq('kind', 'invoice')
      .neq('status', 'draft')
      .order('created_at', { ascending: false }),
    supabase.from('recurring_invoices').select('source_invoice_id'),
  ])

  const alreadyRepeating = new Set((existing ?? []).map((r) => r.source_invoice_id))
  const options = (invoices ?? [])
    .filter((i) => !alreadyRepeating.has(i.id))
    .map((i) => ({
      value: i.id,
      label: `${i.number} · ${i.bill_to_name} · ${formatPaise(i.total_paise, {
        showPaise: false,
        currency: i.currency,
      })}`,
    }))

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-8 text-[28px] font-semibold tracking-[-0.02em] text-foreground">
        Repeat an invoice
      </h1>

      {options.length > 0 ? (
        <form action={createRecurring} className="flex flex-col gap-10">
          <FormSection title="Schedule">
            <FormSelect
              name="source_invoice_id"
              label="Invoice to repeat"
              options={options}
              placeholder="Select an invoice"
              hint="Each run copies this invoice into a fresh draft — line items, client, and totals as they stand now."
            />
            <FormSelect
              name="cadence"
              label="Every"
              defaultValue="monthly"
              options={CADENCE_OPTIONS.map((c) => ({ value: c.value, label: c.label }))}
            />
            <FormField
              name="next_due_on"
              label="Next one due"
              type="date"
              required
              defaultValue={isoDatePlusDays(30)}
              hint="Later runs count forward from this date, so the schedule won't drift if you generate late."
            />
          </FormSection>

          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
            >
              Save schedule
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-[14px] text-muted-foreground">
          You need a sent invoice to repeat — and every one you have is already on a
          schedule.{' '}
          <Link href="/invoices" className="text-foreground underline-offset-4 hover:underline">
            Back to invoices
          </Link>
          .
        </p>
      )}
    </div>
  )
}
