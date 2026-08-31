import type { Metadata } from 'next'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { todayIso } from '@/lib/dates'
import { formatPaise } from '@/lib/money'
import { CADENCE_LABEL } from '@/lib/recurrence'
import { createClient } from '@/lib/supabase/server'

import { RecurringRowActions } from './row-actions'

export const metadata: Metadata = {
  title: 'Recurring',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export default async function RecurringPage() {
  const supabase = await createClient()
  const today = todayIso()

  const { data: schedules } = await supabase
    .from('recurring_invoices')
    .select('id, source_invoice_id, cadence, next_due_on, is_active, last_generated_on')
    .order('next_due_on')

  // Two queries rather than a PostgREST embed: the join would need the FK
  // constraint name spelled out, and this stays readable.
  const sourceIds = (schedules ?? []).map((s) => s.source_invoice_id)
  const { data: sources } = sourceIds.length
    ? await supabase
        .from('invoices')
        .select('id, bill_to_name, total_paise, currency')
        .in('id', sourceIds)
    : { data: [] }
  const sourceById = new Map((sources ?? []).map((i) => [i.id, i]))

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-[22px] font-medium tracking-tight text-neutral-900">
          Recurring
        </h1>
        <Button
          asChild
          className="h-auto rounded-none bg-neutral-900 px-4 py-2 text-[12px] uppercase tracking-[0.1em] text-white hover:bg-neutral-900/90"
        >
          <Link href="/recurring/new">Repeat an invoice</Link>
        </Button>
      </div>

      <p className="mt-3 max-w-xl text-[13px] leading-relaxed text-neutral-500">
        Nothing sends itself. When one is due you press Generate, which copies the
        invoice into a new draft for you to check and send.
      </p>

      {schedules && schedules.length > 0 ? (
        <Table className="mt-8">
          <TableHeader>
            <TableRow className="border-neutral-200 hover:bg-transparent">
              <TableHead className="h-9 px-0 text-[11px] font-normal uppercase tracking-[0.1em] text-neutral-500">
                Repeats
              </TableHead>
              <TableHead className="h-9 px-0 text-[11px] font-normal uppercase tracking-[0.1em] text-neutral-500">
                Every
              </TableHead>
              <TableHead className="h-9 px-0 text-[11px] font-normal uppercase tracking-[0.1em] text-neutral-500">
                Next
              </TableHead>
              <TableHead className="h-9 px-0 text-right text-[11px] font-normal uppercase tracking-[0.1em] text-neutral-500">
                Amount
              </TableHead>
              <TableHead className="h-9 px-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.map((s) => {
              const source = sourceById.get(s.source_invoice_id)
              const isDue = s.is_active && s.next_due_on <= today
              return (
                <TableRow key={s.id} className="border-neutral-200 hover:bg-neutral-50">
                  <TableCell className="px-0 py-4">
                    <Link
                      href={`/invoices/${s.source_invoice_id}/edit`}
                      className="text-[14px] text-neutral-900 hover:underline"
                    >
                      {source?.bill_to_name ?? '—'}
                    </Link>
                  </TableCell>
                  <TableCell className="px-0 py-4 text-[13px] text-neutral-500">
                    {CADENCE_LABEL[s.cadence]}
                  </TableCell>
                  <TableCell className="px-0 py-4 text-[13px]">
                    <span className={isDue ? 'text-red-700' : 'text-neutral-500'}>
                      {formatDate(s.next_due_on)}
                    </span>
                    {!s.is_active ? (
                      <Badge
                        variant="outline"
                        className="ml-2 h-auto rounded-none px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-neutral-400"
                      >
                        Paused
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="px-0 py-4 text-right text-[13px] tabular-nums text-neutral-900">
                    {source
                      ? formatPaise(source.total_paise, {
                          showPaise: false,
                          currency: source.currency,
                        })
                      : '—'}
                  </TableCell>
                  <TableCell className="px-0 py-4 text-right">
                    <RecurringRowActions id={s.id} isActive={s.is_active} isDue={isDue} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      ) : (
        <p className="mt-10 text-[13px] text-neutral-500">
          No repeat schedules yet.
        </p>
      )}
    </div>
  )
}
