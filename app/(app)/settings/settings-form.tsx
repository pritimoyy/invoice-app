'use client'

import { useActionState } from 'react'

import { GST_STATES } from '@/lib/gst-states'
import type { Database } from '@/types/database'

import { saveProfile, type SettingsState } from './actions'

type Profile = Database['public']['Tables']['profiles']['Row']

const initialState: SettingsState = { error: null, saved: false }

const inputClass =
  'w-full border-b border-neutral-300 bg-transparent pb-2 text-[15px] ' +
  'text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 ' +
  'focus:border-neutral-900 disabled:opacity-50'

const labelClass =
  'block text-[11px] uppercase tracking-[0.12em] text-neutral-500'

function Field({
  name,
  label,
  defaultValue,
  type = 'text',
  required = false,
  placeholder,
  disabled,
}: {
  name: string
  label: string
  defaultValue?: string | null
  type?: string
  required?: boolean
  placeholder?: string
  disabled?: boolean
}) {
  return (
    <div className="flex flex-col gap-2">
      <label className={labelClass} htmlFor={name}>
        {label}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        defaultValue={defaultValue ?? ''}
        disabled={disabled}
        className={inputClass}
      />
    </div>
  )
}

function Section({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="border-t border-neutral-200 pt-8">
      <h2 className="mb-6 text-[11px] uppercase tracking-[0.12em] text-neutral-400">
        {title}
      </h2>
      <div className="grid gap-6 sm:grid-cols-2">{children}</div>
    </section>
  )
}

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

      <Section title="Business">
        <Field
          name="legal_name"
          label="Legal name"
          required
          defaultValue={profile?.legal_name}
          disabled={pending}
        />
        <Field
          name="trade_name"
          label="Trade name"
          defaultValue={profile?.trade_name}
          disabled={pending}
        />
        <Field
          name="email"
          label="Email"
          type="email"
          defaultValue={profile?.email}
          disabled={pending}
        />
        <Field
          name="phone"
          label="Phone"
          defaultValue={profile?.phone}
          disabled={pending}
        />
      </Section>

      <Section title="Address">
        <Field
          name="address_line1"
          label="Address line 1"
          defaultValue={profile?.address_line1}
          disabled={pending}
        />
        <Field
          name="address_line2"
          label="Address line 2"
          defaultValue={profile?.address_line2}
          disabled={pending}
        />
        <Field
          name="city"
          label="City"
          defaultValue={profile?.city}
          disabled={pending}
        />
        <Field
          name="postal_code"
          label="PIN code"
          defaultValue={profile?.postal_code}
          disabled={pending}
        />

        <div className="flex flex-col gap-2">
          <label className={labelClass} htmlFor="state_code">
            State
          </label>
          <select
            id="state_code"
            name="state_code"
            defaultValue={profile?.state_code ?? ''}
            disabled={pending}
            className={inputClass}
          >
            <option value="">Select a state</option>
            {GST_STATES.map((s) => (
              <option key={s.code} value={s.code}>
                {s.code} — {s.name}
              </option>
            ))}
          </select>
          <p className="text-[12px] text-neutral-400">
            Drives intra-state vs inter-state tax. The name is derived from
            the code, so the two can&apos;t drift.
          </p>
        </div>
      </Section>

      <Section title="Tax identity">
        <Field
          name="gstin"
          label="GSTIN"
          defaultValue={profile?.gstin}
          placeholder="19XXXXXXXXXXXZX"
          disabled={pending}
        />
        <Field
          name="pan"
          label="PAN"
          defaultValue={profile?.pan}
          disabled={pending}
        />
        <Field
          name="default_sac_code"
          label="Default SAC code"
          defaultValue={profile?.default_sac_code}
          placeholder="998386"
          disabled={pending}
        />

        <div className="flex flex-col gap-3 pt-1">
          <label className="flex items-center gap-3 text-[13px] text-neutral-700">
            <input
              type="checkbox"
              name="is_gst_registered"
              defaultChecked={profile?.is_gst_registered ?? false}
              disabled={pending}
              className="size-4 accent-neutral-900"
            />
            GST registered
          </label>
          <label className="flex items-center gap-3 text-[13px] text-neutral-700">
            <input
              type="checkbox"
              name="has_lut"
              defaultChecked={profile?.has_lut ?? false}
              disabled={pending}
              className="size-4 accent-neutral-900"
            />
            LUT on file (for export invoices)
          </label>
        </div>
      </Section>

      <Section title="Payment details">
        <Field
          name="upi_id"
          label="UPI ID"
          defaultValue={profile?.upi_id}
          disabled={pending}
        />
        <Field
          name="bank_account_name"
          label="Account name"
          defaultValue={profile?.bank_account_name}
          disabled={pending}
        />
        <Field
          name="bank_name"
          label="Bank"
          defaultValue={profile?.bank_name}
          disabled={pending}
        />
        <Field
          name="bank_account_no"
          label="Account number"
          defaultValue={profile?.bank_account_no}
          disabled={pending}
        />
        <Field
          name="bank_ifsc"
          label="IFSC"
          defaultValue={profile?.bank_ifsc}
          disabled={pending}
        />
      </Section>

      <Section title="Invoicing">
        <Field
          name="invoice_prefix"
          label="Invoice prefix"
          defaultValue={profile?.invoice_prefix ?? 'INV'}
          disabled={pending}
        />
        <Field
          name="default_terms_days"
          label="Payment terms (days)"
          type="number"
          defaultValue={String(profile?.default_terms_days ?? 15)}
          disabled={pending}
        />
        <div className="sm:col-span-2 flex flex-col gap-2">
          <label className={labelClass} htmlFor="notes_default">
            Default notes / terms
          </label>
          <textarea
            id="notes_default"
            name="notes_default"
            rows={3}
            defaultValue={profile?.notes_default ?? ''}
            disabled={pending}
            className={`${inputClass} resize-y`}
          />
        </div>
      </Section>

      <Section title="Logo">
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
              <span className="text-[12px] text-neutral-400">
                Current logo
              </span>
            </div>
          ) : (
            <p className="text-[13px] text-neutral-500">No logo uploaded.</p>
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
              className="text-[13px] text-neutral-600 file:mr-4 file:border file:border-neutral-300 file:bg-transparent file:px-3 file:py-1.5 file:text-[11px] file:uppercase file:tracking-[0.12em] file:text-neutral-700"
            />
            <p className="text-[12px] text-neutral-400">
              PNG or JPEG, under 2 MB. Those are the formats the PDF renderer
              can embed.
            </p>
          </div>
        </div>
      </Section>

      <div className="flex items-center gap-4 border-t border-neutral-200 pt-8">
        <button
          type="submit"
          disabled={pending}
          className="bg-neutral-900 px-6 py-3 text-[13px] uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Save'}
        </button>

        {state.error ? (
          <p role="alert" className="text-[13px] text-red-700">
            {state.error}
          </p>
        ) : null}

        {state.saved && !state.error ? (
          <p role="status" className="text-[13px] text-neutral-500">
            Saved.
          </p>
        ) : null}
      </div>
    </form>
  )
}
