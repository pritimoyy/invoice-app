'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { FormField, FormSection, FormSelect, FormTextarea } from '@/components/invoice/form-field'
import { GST_STATES } from '@/lib/gst-states'
import type { Database } from '@/types/database'

import { createClientRecord, updateClientRecord, type ClientFormState } from './actions'

type Client = Database['public']['Tables']['clients']['Row']

const CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'GBP'].map((c) => ({
  value: c,
  label: c,
}))

const STATE_OPTIONS = GST_STATES.map((s) => ({
  value: s.code,
  label: `${s.code} — ${s.name}`,
}))

const initialState: ClientFormState = { error: null }

export function ClientForm({ client }: { client?: Client }) {
  const action = client
    ? updateClientRecord.bind(null, client.id)
    : createClientRecord
  const [state, formAction, pending] = useActionState(action, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-10">
      <FormSection title="Client">
        <FormField
          name="name"
          label="Name"
          required
          defaultValue={client?.name}
          placeholder="Company or individual"
          disabled={pending}
        />
        <FormField
          name="contact_person"
          label="Contact person"
          defaultValue={client?.contact_person}
          disabled={pending}
        />
        <FormField
          name="email"
          label="Email"
          type="email"
          defaultValue={client?.email}
          disabled={pending}
        />
        <FormField
          name="phone"
          label="Phone"
          defaultValue={client?.phone}
          disabled={pending}
        />
      </FormSection>

      <FormSection title="Address">
        <FormField
          name="address_line1"
          label="Address line 1"
          defaultValue={client?.address_line1}
          disabled={pending}
        />
        <FormField
          name="address_line2"
          label="Address line 2"
          defaultValue={client?.address_line2}
          disabled={pending}
        />
        <FormField
          name="city"
          label="City"
          defaultValue={client?.city}
          disabled={pending}
        />
        <FormField
          name="postal_code"
          label="PIN code"
          defaultValue={client?.postal_code}
          disabled={pending}
        />
        <FormSelect
          name="state_code"
          label="State"
          defaultValue={client?.state_code ?? ''}
          options={STATE_OPTIONS}
          placeholder="Select a state"
          disabled={pending}
          hint="Place of supply for this client's invoices. Leave blank for a foreign client."
        />
      </FormSection>

      <FormSection title="Tax and billing">
        <FormField
          name="gstin"
          label="GSTIN"
          defaultValue={client?.gstin}
          placeholder="19YYYYYYYYYYYZY"
          disabled={pending}
        />
        <FormSelect
          name="currency"
          label="Currency"
          defaultValue={client?.currency ?? 'INR'}
          options={CURRENCY_OPTIONS}
          disabled={pending}
        />
        <FormField
          name="payment_terms_days"
          label="Payment terms (days)"
          type="number"
          defaultValue={
            client?.payment_terms_days != null
              ? String(client.payment_terms_days)
              : ''
          }
          placeholder="Defaults to your standard terms"
          disabled={pending}
        />
      </FormSection>

      <FormSection title="Notes">
        <FormTextarea
          name="notes"
          label="Notes"
          defaultValue={client?.notes}
          disabled={pending}
        />
      </FormSection>

      <div className="flex items-center gap-4 border-t border-neutral-200 pt-8">
        <Button
          type="submit"
          disabled={pending}
          className="h-auto rounded-none bg-neutral-900 px-6 py-3 text-[13px] uppercase tracking-[0.12em] text-white hover:bg-neutral-900/90 disabled:opacity-50"
        >
          {pending ? 'Saving…' : client ? 'Save' : 'Add client'}
        </Button>

        {state.error ? (
          <p role="alert" className="text-[13px] text-red-700">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  )
}
