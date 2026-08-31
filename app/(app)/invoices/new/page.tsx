import type { Metadata } from 'next'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { FormSection, FormSelect } from '@/components/invoice/form-field'
import { createClient } from '@/lib/supabase/server'

import { createDraftInvoice } from '../actions'

export const metadata: Metadata = {
  title: 'New invoice',
}

export default async function NewInvoicePage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('is_archived', false)
    .order('name')

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-8 text-[28px] font-semibold tracking-[-0.02em] text-foreground">
        New invoice
      </h1>

      {clients && clients.length > 0 ? (
        <form action={createDraftInvoice} className="flex flex-col gap-10">
          <FormSection title="Client">
            <FormSelect
              name="client_id"
              label="Bill to"
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Select a client"
              hint="Their address, GSTIN, and state get copied onto the invoice — you can still edit them per invoice from here."
            />
          </FormSection>

          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
            >
              Start invoice
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-[13px] text-muted-foreground">
          You need a client before you can start an invoice.{' '}
          <Link
            href="/clients/new"
            className="text-foreground underline-offset-4 hover:underline"
          >
            Add one
          </Link>
          .
        </p>
      )}
    </div>
  )
}
