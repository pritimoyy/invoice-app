'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'
import { FormField, FormSection, FormSelect, FormTextarea } from '@/components/invoice/form-field'
import { paiseToEditableString } from '@/lib/money'
import { TAX_RATE_OPTIONS } from '@/lib/tax'
import type { Database } from '@/types/database'

import { createServiceRecord, updateServiceRecord, type ServiceFormState } from './actions'

type Service = Database['public']['Tables']['services']['Row']

const RATE_OPTIONS = TAX_RATE_OPTIONS.map((o) => ({ value: String(o.bps), label: o.label }))

const initialState: ServiceFormState = { error: null }

export function ServiceForm({ service }: { service?: Service }) {
  const action = service
    ? updateServiceRecord.bind(null, service.id)
    : createServiceRecord
  const [state, formAction, pending] = useActionState(action, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-10">
      <FormSection title="Service">
        <FormField
          name="name"
          label="Name"
          required
          defaultValue={service?.name}
          placeholder="Reel edit — 60s"
          disabled={pending}
        />
        <FormField
          name="unit"
          label="Unit"
          defaultValue={service?.unit ?? 'unit'}
          placeholder="hour, day, reel, minute…"
          disabled={pending}
        />
        <FormField
          name="default_rate"
          label="Default rate"
          defaultValue={service ? paiseToEditableString(service.default_rate_paise) : '0.00'}
          placeholder="0.00"
          disabled={pending}
        />
        <FormSelect
          name="tax_rate_bps"
          label="Tax rate"
          defaultValue={service ? String(service.tax_rate_bps) : '1800'}
          options={RATE_OPTIONS}
          disabled={pending}
          hint="Only applies when the invoice's tax treatment charges tax at all."
        />
      </FormSection>

      <FormSection title="Notes">
        <FormTextarea
          name="description"
          label="Description"
          defaultValue={service?.description}
          disabled={pending}
        />
      </FormSection>

      <div className="flex items-center gap-4 pt-2">
        <Button
          type="submit"
          disabled={pending}
          size="lg"
        >
          {pending ? 'Saving…' : service ? 'Save' : 'Add service'}
        </Button>

        {state.error ? (
          <p role="alert" className="text-[14px] text-destructive">
            {state.error}
          </p>
        ) : null}
      </div>
    </form>
  )
}
