'use client'

import { useTransition } from 'react'

import { Button } from '@/components/ui/button'

import { deleteRecurring, generateFromRecurring, setRecurringActive } from './actions'

const linkClass =
  'h-auto px-0 text-[14px] font-medium text-muted-foreground hover:bg-transparent hover:text-foreground disabled:opacity-30'

export function RecurringRowActions({
  id,
  isActive,
  isDue,
}: {
  id: string
  isActive: boolean
  isDue: boolean
}) {
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex items-center justify-end gap-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm('Create the next draft invoice from this schedule?')) return
          // Redirects to the new draft on success — redirect() throws, so no
          // try/catch here.
          startTransition(() => generateFromRecurring(id))
        }}
        className={`${linkClass} ${isDue && isActive ? 'text-foreground' : ''}`}
      >
        {pending ? 'Generating…' : 'Generate now'}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => startTransition(() => setRecurringActive(id, !isActive))}
        className={linkClass}
      >
        {isActive ? 'Pause' : 'Resume'}
      </Button>

      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => {
          if (!confirm('Remove this repeat schedule? The invoices it made are kept.')) return
          startTransition(() => deleteRecurring(id))
        }}
        className="h-auto px-0 text-[14px] font-medium text-muted-foreground hover:bg-transparent hover:text-destructive disabled:opacity-30"
      >
        Remove
      </Button>
    </div>
  )
}
