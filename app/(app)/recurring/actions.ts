'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { todayIso } from '@/lib/dates'
import { duplicateInvoiceAsDraft } from '@/lib/duplicate-invoice'
import { nextOccurrence, type Cadence } from '@/lib/recurrence'
import { createClient } from '@/lib/supabase/server'

const CADENCES: Cadence[] = ['weekly', 'fortnightly', 'monthly', 'quarterly', 'yearly']

export async function createRecurring(formData: FormData) {
  const sourceInvoiceId = String(formData.get('source_invoice_id') ?? '')
  const cadence = String(formData.get('cadence') ?? 'monthly') as Cadence
  const nextDueOn = String(formData.get('next_due_on') ?? '')

  if (!sourceInvoiceId) throw new Error('Pick an invoice to repeat.')
  if (!CADENCES.includes(cadence)) throw new Error('Unsupported cadence.')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(nextDueOn)) throw new Error('Pick a valid next date.')

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { error } = await supabase.from('recurring_invoices').insert({
    user_id: user.id,
    source_invoice_id: sourceInvoiceId,
    cadence,
    next_due_on: nextDueOn,
  })
  if (error) {
    // The unique constraint is the likely failure — say so in words rather
    // than leaking the constraint name.
    throw new Error(
      error.code === '23505'
        ? 'That invoice already has a repeat schedule.'
        : error.message,
    )
  }

  revalidatePath('/recurring')
  redirect('/recurring')
}

export async function setRecurringActive(id: string, isActive: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('recurring_invoices')
    .update({ is_active: isActive })
    .eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/recurring')
  revalidatePath('/dashboard')
}

export async function deleteRecurring(id: string) {
  const supabase = await createClient()
  const { error } = await supabase.from('recurring_invoices').delete().eq('id', id)
  if (error) throw new Error(error.message)

  revalidatePath('/recurring')
  revalidatePath('/dashboard')
}

/**
 * Creates the next draft from a schedule and moves the schedule forward.
 *
 * The date advances from the scheduled `next_due_on`, not from today — a
 * schedule generated three days late still lands on the 1st next month
 * rather than drifting to the 4th. Generating early works the same way.
 */
export async function generateFromRecurring(id: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: schedule } = await supabase
    .from('recurring_invoices')
    .select('id, source_invoice_id, cadence, next_due_on')
    .eq('id', id)
    .maybeSingle()
  if (!schedule) throw new Error('Schedule not found.')

  const result = await duplicateInvoiceAsDraft(
    supabase,
    user.id,
    schedule.source_invoice_id,
    { kind: 'invoice' },
  )
  if ('error' in result) throw new Error(result.error)

  const { error: bumpError } = await supabase
    .from('recurring_invoices')
    .update({
      next_due_on: nextOccurrence(schedule.next_due_on, schedule.cadence),
      last_generated_on: todayIso(),
    })
    .eq('id', id)
  if (bumpError) throw new Error(bumpError.message)

  revalidatePath('/recurring')
  revalidatePath('/invoices')
  revalidatePath('/dashboard')
  redirect(`/invoices/${result.id}/edit`)
}
