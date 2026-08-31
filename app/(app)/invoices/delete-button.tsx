'use client'

import { useTransition } from 'react'

import { Button } from '@/components/ui/button'

import { deleteDraftInvoice } from './actions'

/**
 * A plain <form action> can't ask "are you sure?" first — this wraps the
 * same server action behind a native confirm(), since deleting an invoice
 * is real, irreversible data loss even though it's "only" a draft.
 */
export function DeleteInvoiceButton({
  invoiceId,
  label = 'Delete',
  className,
}: {
  invoiceId: string
  label?: string
  className?: string
}) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm('Delete this draft invoice? This cannot be undone.')) {
          return
        }
        startTransition(() => deleteDraftInvoice(invoiceId))
      }}
      className={
        className ??
        'h-auto px-0 text-[11px] uppercase tracking-[0.1em] text-neutral-400 hover:bg-transparent hover:text-red-700 hover:underline'
      }
    >
      {pending ? 'Deleting…' : label}
    </Button>
  )
}
