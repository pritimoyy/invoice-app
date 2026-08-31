import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'

import { setServiceArchived } from '../actions'
import { ServiceForm } from '../service-form'

export const metadata: Metadata = {
  title: 'Edit service',
}

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  // maybeSingle, not single: a bad id or an RLS-blocked row both come back
  // as null data with no error — the notFound() below is what turns that
  // into a real 404 instead of a confusing blank page.
  const { data: service } = await supabase
    .from('services')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (!service) {
    notFound()
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <div className="mb-12 flex items-baseline justify-between gap-4">
        <h1 className="flex items-baseline gap-3 text-[28px] font-semibold tracking-[-0.02em] text-foreground">
          {service.name}
          {service.is_archived ? (
            <Badge
              variant="outline"
              className="h-auto px-2 py-0.5 text-[11px] font-medium text-muted-foreground"
            >
              Archived
            </Badge>
          ) : null}
        </h1>

        <form
          action={setServiceArchived.bind(
            null,
            service.id,
            !service.is_archived,
          )}
        >
          <Button
            type="submit"
            variant="ghost"
            size="sm"
            className="h-auto px-0 text-[13px] font-medium text-muted-foreground hover:bg-transparent hover:text-foreground"
          >
            {service.is_archived ? 'Unarchive' : 'Archive'}
          </Button>
        </form>
      </div>

      <ServiceForm service={service} />
    </div>
  )
}
