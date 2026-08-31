'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { stateNameForCode } from '@/lib/gst-states'
import { createClient } from '@/lib/supabase/server'

export type ClientFormState = {
  error: string | null
}

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP']

function field(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? '').trim()
  return value === '' ? null : value
}

function readClientFields(formData: FormData) {
  const name = field(formData, 'name')
  if (!name) {
    return { error: 'Client name is required.' } as const
  }

  const stateCode = field(formData, 'state_code')
  const state = stateNameForCode(stateCode)
  if (stateCode && !state) {
    return { error: 'That state code is not a valid GST state code.' } as const
  }

  const currency = field(formData, 'currency') ?? 'INR'
  if (!CURRENCIES.includes(currency)) {
    return { error: 'Unsupported currency.' } as const
  }

  const termsRaw = field(formData, 'payment_terms_days')
  const paymentTermsDays = termsRaw === null ? null : Number.parseInt(termsRaw, 10)
  if (paymentTermsDays !== null && (!Number.isInteger(paymentTermsDays) || paymentTermsDays < 0)) {
    return { error: 'Payment terms must be a whole number of days.' } as const
  }

  return {
    error: null,
    values: {
      name,
      contact_person: field(formData, 'contact_person'),
      email: field(formData, 'email'),
      phone: field(formData, 'phone'),
      address_line1: field(formData, 'address_line1'),
      address_line2: field(formData, 'address_line2'),
      city: field(formData, 'city'),
      state,
      state_code: stateCode,
      postal_code: field(formData, 'postal_code'),
      gstin: field(formData, 'gstin'),
      currency,
      payment_terms_days: paymentTermsDays,
      notes: field(formData, 'notes'),
    },
  } as const
}

export async function createClientRecord(
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const parsed = readClientFields(formData)
  if (parsed.error) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  const { data, error } = await supabase
    .from('clients')
    .insert({ user_id: user.id, ...parsed.values })
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/clients')
  redirect(`/clients/${data.id}`)
}

export async function updateClientRecord(
  clientId: string,
  _prevState: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const parsed = readClientFields(formData)
  if (parsed.error) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  // No explicit user_id filter: RLS already scopes every row to its owner,
  // so a mismatched id fails closed (zero rows updated) rather than needing
  // a second check here.
  const { error } = await supabase
    .from('clients')
    .update(parsed.values)
    .eq('id', clientId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/clients')
  revalidatePath(`/clients/${clientId}`)
  return { error: null }
}

export async function setClientArchived(clientId: string, archived: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('clients')
    .update({ is_archived: archived })
    .eq('id', clientId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/clients')
  revalidatePath(`/clients/${clientId}`)
}
