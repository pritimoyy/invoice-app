'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { FormField, FormSection, FormSelect, FormTextarea } from '@/components/invoice/form-field'
import { GST_STATES } from '@/lib/gst-states'
import { TEMPLATE_OPTIONS } from '@/lib/pdf/pick-template'
import type { Database } from '@/types/database'

import { saveProfile, type SettingsState } from './actions'

type Profile = Database['public']['Tables']['profiles']['Row']

const initialState: SettingsState = { error: null, saved: false }

const labelClass =
  'text-[14px] font-medium text-muted-foreground font-normal'

const STATE_OPTIONS = GST_STATES.map((s) => ({
  value: s.code,
  label: `${s.code} — ${s.name}`,
}))

export function SettingsForm({
  profile,
  logoUrl,
}: {
  profile: Profile | null
  logoUrl: string | null
}) {
  const [state, formAction, pending] = useActionState(saveProfile, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-10">
      <input
        type="hidden"
        name="existing_logo_path"
        value={profile?.logo_path ?? ''}
      />

      <FormSection title="Business">
        <FormField
          name="legal_name"
          label="Legal name"
          required
          defaultValue={profile?.legal_name}
          disabled={pending}
        />
        <FormField
          name="trade_name"
          label="Trade name"
          defaultValue={profile?.trade_name}
          disabled={pending}
        />
        <FormField
          name="email"
          label="Email"
          type="email"
          defaultValue={profile?.email}
          disabled={pending}
        />
        <FormField
          name="phone"
          label="Phone"
          defaultValue={profile?.phone}
          disabled={pending}
        />
      </FormSection>

      <FormSection title="Address">
        <FormField
          name="address_line1"
          label="Address line 1"
          defaultValue={profile?.address_line1}
          disabled={pending}
        />
        <FormField
          name="address_line2"
          label="Address line 2"
          defaultValue={profile?.address_line2}
          disabled={pending}
        />
        <FormField
          name="city"
          label="City"
          defaultValue={profile?.city}
          disabled={pending}
        />
        <FormField
          name="postal_code"
          label="PIN code"
          defaultValue={profile?.postal_code}
          disabled={pending}
        />
        <FormSelect
          name="state_code"
          label="State"
          defaultValue={profile?.state_code ?? ''}
          options={STATE_OPTIONS}
          placeholder="Select a state"
          disabled={pending}
          hint="Drives intra-state vs inter-state tax. The name is derived from the code, so the two can't drift."
        />
      </FormSection>

      <FormSection title="Tax identity">
        <FormField
          name="gstin"
          label="GSTIN"
          defaultValue={profile?.gstin}
          placeholder="19XXXXXXXXXXXZX"
          disabled={pending}
        />
        <FormField
          name="pan"
          label="PAN"
          defaultValue={profile?.pan}
          disabled={pending}
        />
        <FormField
          name="default_sac_code"
          label="Default SAC code"
          defaultValue={profile?.default_sac_code}
          placeholder="998386"
          disabled={pending}
        />

        <div className="flex flex-col gap-3 pt-1">
          <label className="flex items-center gap-3 text-[14px] text-foreground">
            <input
              type="checkbox"
              name="is_gst_registered"
              defaultChecked={profile?.is_gst_registered ?? false}
              disabled={pending}
              className="size-4 accent-primary"
            />
            GST registered
          </label>
          <label className="flex items-center gap-3 text-[14px] text-foreground">
            <input
              type="checkbox"
              name="has_lut"
              defaultChecked={profile?.has_lut ?? false}
              disabled={pending}
              className="size-4 accent-primary"
            />
            LUT on file (for export invoices)
          </label>
        </div>
      </FormSection>

      <FormSection title="Payment details">
        <FormField
          name="upi_id"
          label="UPI ID"
          defaultValue={profile?.upi_id}
          disabled={pending}
        />
        <FormField
          name="bank_account_name"
          label="Account name"
          defaultValue={profile?.bank_account_name}
          disabled={pending}
        />
        <FormField
          name="bank_name"
          label="Bank"
          defaultValue={profile?.bank_name}
          disabled={pending}
        />
        <FormField
          name="bank_account_no"
          label="Account number"
          defaultValue={profile?.bank_account_no}
          disabled={pending}
        />
        <FormField
          name="bank_ifsc"
          label="IFSC"
          defaultValue={profile?.bank_ifsc}
          disabled={pending}
        />
      </FormSection>

      <FormSection title="Invoicing">
        <FormField
          name="invoice_prefix"
          label="Invoice prefix"
          defaultValue={profile?.invoice_prefix ?? 'INV'}
          disabled={pending}
        />
        <FormField
          name="default_terms_days"
          label="Payment terms (days)"
          type="number"
          defaultValue={String(profile?.default_terms_days ?? 15)}
          disabled={pending}
        />
        <FormSelect
          name="default_template"
          label="Default template"
          defaultValue={profile?.default_template ?? 'inverted'}
          options={TEMPLATE_OPTIONS.map((t) => ({ value: t.value, label: t.label }))}
          disabled={pending}
          hint="What a new invoice starts as. You can still switch template per invoice."
        />
        <FormTextarea
          name="notes_default"
          label="Default notes / terms"
          defaultValue={profile?.notes_default}
          disabled={pending}
        />
      </FormSection>

      <FormSection title="Logo">
        <div className="sm:col-span-2 flex flex-col gap-4">
          {logoUrl ? (
            <div className="flex items-center gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element -- signed
                  Storage URL, expires hourly; next/image would need the
                  Supabase host in remotePatterns for no real benefit here. */}
              <img
                src={logoUrl}
                alt="Current logo"
                className="h-12 w-auto max-w-[180px] object-contain"
              />
              <span className="text-[14px] text-muted-foreground">
                Current logo
              </span>
            </div>
          ) : (
            <p className="text-[14px] text-muted-foreground">No logo uploaded.</p>
          )}

          <div className="flex flex-col gap-2">
            <label className={labelClass} htmlFor="logo">
              Replace logo
            </label>
            <input
              id="logo"
              name="logo"
              type="file"
              accept="image/png,image/jpeg"
              disabled={pending}
              className="text-[14px] text-muted-foreground file:mr-4 file:border file:border-border file:bg-transparent file:px-3 file:py-1.5 file:text-[12px] file:uppercase file:tracking-[0.12em] file:text-foreground"
            />
            <p className="text-[14px] text-muted-foreground">
              PNG or JPEG, under 2 MB. Those are the formats the PDF renderer
              can embed.
            </p>
          </div>
        </div>
      </FormSection>

      <div className="flex items-center gap-4 pt-2">
        <Button
          type="submit"
          disabled={pending}
          size="lg"
        >
          {pending ? 'Saving…' : 'Save'}
        </Button>

        {state.error ? (
          <p role="alert" className="text-[14px] text-destructive">
            {state.error}
          </p>
        ) : null}

        {state.saved && !state.error ? (
          <p role="status" className="text-[14px] text-muted-foreground">
            Saved.
          </p>
        ) : null}
      </div>
    </form>
  )
}
