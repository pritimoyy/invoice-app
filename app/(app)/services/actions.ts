'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { parseRupeesToPaise } from '@/lib/money'
import { TAX_RATE_OPTIONS } from '@/lib/tax'
import { createClient } from '@/lib/supabase/server'

export type ServiceFormState = {
  error: string | null
}

function field(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? '').trim()
  return value === '' ? null : value
}

function readServiceFields(formData: FormData) {
  const name = field(formData, 'name')
  if (!name) {
    return { error: 'Service name is required.' } as const
  }

  const rateInput = field(formData, 'default_rate')
  const defaultRatePaise = rateInput === null ? 0 : parseRupeesToPaise(rateInput)
  if (defaultRatePaise === null || defaultRatePaise < 0) {
    return { error: 'Enter a valid default rate.' } as const
  }

  const taxRateRaw = field(formData, 'tax_rate_bps')
  const taxRateBps = taxRateRaw === null ? 1800 : Number.parseInt(taxRateRaw, 10)
  if (!TAX_RATE_OPTIONS.some((o) => o.bps === taxRateBps)) {
    return { error: 'Unsupported tax rate.' } as const
  }

  return {
    error: null,
    values: {
      name,
      description: field(formData, 'description'),
      unit: field(formData, 'unit') ?? 'unit',
      default_rate_paise: defaultRatePaise,
      tax_rate_bps: taxRateBps,
    },
  } as const
}

export async function createServiceRecord(
  _prevState: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const parsed = readServiceFields(formData)
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
    .from('services')
    .insert({ user_id: user.id, ...parsed.values })
    .select('id')
    .single()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/services')
  redirect(`/services/${data.id}`)
}

export async function updateServiceRecord(
  serviceId: string,
  _prevState: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const parsed = readServiceFields(formData)
  if (parsed.error) {
    return { error: parsed.error }
  }

  const supabase = await createClient()
  // No explicit user_id filter: RLS already scopes every row to its owner,
  // so a mismatched id fails closed (zero rows updated) rather than needing
  // a second check here.
  const { error } = await supabase
    .from('services')
    .update(parsed.values)
    .eq('id', serviceId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/services')
  revalidatePath(`/services/${serviceId}`)
  return { error: null }
}

export async function setServiceArchived(serviceId: string, archived: boolean) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('services')
    .update({ is_archived: archived })
    .eq('id', serviceId)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/services')
  revalidatePath(`/services/${serviceId}`)
}
