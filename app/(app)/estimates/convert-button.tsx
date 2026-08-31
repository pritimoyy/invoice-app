'use client'

import { useTransition } from 'react'

import { Button } from '@/components/ui/button'

import { convertEstimateToInvoice } from '../invoices/actions'

export function ConvertEstimateButton({ estimateId }: { estimateId: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm('Create a draft invoice from this estimate?')) return
        // convertEstimateToInvoice redirects to the new draft on success,
        // and redirect() works by throwing — no try/catch here, or the
        // redirect surfaces as a raw error instead of navigating.
        startTransition(() => convertEstimateToInvoice(estimateId))
      }}
      className="h-auto px-0 text-[11px] uppercase tracking-[0.1em] text-neutral-500 hover:bg-transparent hover:text-neutral-900 hover:underline"
    >
      {pending ? 'Converting…' : 'Convert to invoice'}
    </Button>
  )
}
