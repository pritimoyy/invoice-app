'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { stateNameForCode } from '@/lib/gst-states'
import { createClient } from '@/lib/supabase/server'

export type SettingsState = {
  error: string | null
  saved: boolean
}

/**
 * PNG and JPEG only. Not an arbitrary restriction: this logo gets embedded
 * in the PDF later, and @react-pdf/renderer handles those two formats.
 * Rejecting an SVG here beats discovering it in Phase 4.
 */
const LOGO_TYPES = ['image/png', 'image/jpeg']
const LOGO_MAX_BYTES = 2 * 1024 * 1024

/** Empty strings become null so blank optional fields don't store ''. */
function field(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? '').trim()
  return value === '' ? null : value
}

export async function saveProfile(
  _prevState: SettingsState,
  formData: FormData,
): Promise<SettingsState> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const legalName = field(formData, 'legal_name')
  if (!legalName) {
    return { error: 'Business name is required.', saved: false }
  }

  // The dropdown submits the code; the display name is derived, so the two
  // can never drift apart.
  const stateCode = field(formData, 'state_code')
  const state = stateNameForCode(stateCode)
  if (stateCode && !state) {
    return { error: 'That state code is not a valid GST state code.', saved: false }
  }

  const termsRaw = field(formData, 'default_terms_days')
  const termsDays = termsRaw === null ? 15 : Number.parseInt(termsRaw, 10)
  if (!Number.isInteger(termsDays) || termsDays < 0) {
    return { error: 'Payment terms must be a whole number of days.', saved: false }
  }

  // Keep the existing logo unless a new file was actually chosen.
  let logoPath = field(formData, 'existing_logo_path')
  const logo = formData.get('logo')

  if (logo instanceof File && logo.size > 0) {
    if (!LOGO_TYPES.includes(logo.type)) {
      return { error: 'Logo must be a PNG or JPEG.', saved: false }
    }
    if (logo.size > LOGO_MAX_BYTES) {
      return { error: 'Logo must be under 2 MB.', saved: false }
    }

    // <user_id>/... is what the storage policy checks, so the prefix is
    // load-bearing, not just tidy.
    const path = `${user.id}/logo.${logo.type === 'image/png' ? 'png' : 'jpg'}`
    const { error: uploadError } = await supabase.storage
      .from('branding')
      .upload(path, logo, { upsert: true, contentType: logo.type })

    if (uploadError) {
      return { error: `Logo upload failed: ${uploadError.message}`, saved: false }
    }
    logoPath = path
  }

  const { error } = await supabase.from('profiles').upsert({
    user_id: user.id,
    legal_name: legalName,
    trade_name: field(formData, 'trade_name'),
    email: field(formData, 'email'),
    phone: field(formData, 'phone'),

    address_line1: field(formData, 'address_line1'),
    address_line2: field(formData, 'address_line2'),
    city: field(formData, 'city'),
    state,
    state_code: stateCode,
    postal_code: field(formData, 'postal_code'),

    is_gst_registered: formData.get('is_gst_registered') === 'on',
    gstin: field(formData, 'gstin'),
    pan: field(formData, 'pan'),
    has_lut: formData.get('has_lut') === 'on',
    default_sac_code: field(formData, 'default_sac_code'),

    upi_id: field(formData, 'upi_id'),
    bank_account_name: field(formData, 'bank_account_name'),
    bank_name: field(formData, 'bank_name'),
    bank_account_no: field(formData, 'bank_account_no'),
    bank_ifsc: field(formData, 'bank_ifsc'),

    invoice_prefix: field(formData, 'invoice_prefix') ?? 'INV',
    default_terms_days: termsDays,
    default_template: field(formData, 'default_template') ?? 'inverted',
    notes_default: field(formData, 'notes_default'),

    logo_path: logoPath,
  })

  if (error) {
    return { error: error.message, saved: false }
  }

  revalidatePath('/settings')
  return { error: null, saved: true }
}
