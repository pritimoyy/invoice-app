import type { Metadata } from 'next'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { FormSection, FormSelect } from '@/components/invoice/form-field'
import { createClient } from '@/lib/supabase/server'

import { createDraftInvoice } from '../../invoices/actions'

export const metadata: Metadata = {
  title: 'New estimate',
}

export default async function NewEstimatePage() {
  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name')
    .eq('is_archived', false)
    .order('name')

  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-8 text-[28px] font-semibold tracking-[-0.02em] text-foreground">
        New estimate
      </h1>

      {clients && clients.length > 0 ? (
        <form action={createDraftInvoice} className="flex flex-col gap-10">
          {/* Same action as an invoice — an estimate is the same document
              with a different kind, and it draws from its own numbering
              counter when sent. */}
          <input type="hidden" name="kind" value="estimate" />
          <FormSection title="Client">
            <FormSelect
              name="client_id"
              label="Estimate for"
              options={clients.map((c) => ({ value: c.id, label: c.name }))}
              placeholder="Select a client"
              hint="Converts to an invoice later, keeping its own number and a link back to this estimate."
            />
          </FormSection>

          <div className="pt-2">
            <Button
              type="submit"
              size="lg"
            >
              Start estimate
            </Button>
          </div>
        </form>
      ) : (
        <p className="text-[14px] text-muted-foreground">
          You need a client before you can start an estimate.{' '}
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
