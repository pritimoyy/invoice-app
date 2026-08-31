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
import { EmptyState } from '@/components/invoice/empty-state'
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
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-foreground">
          Recurring
        </h1>
        <Button
          asChild
          >
          <Link href="/recurring/new">Repeat an invoice</Link>
        </Button>
      </div>

      <p className="mt-3 max-w-xl text-[14px] leading-relaxed text-muted-foreground">
        Nothing sends itself. When one is due you press Generate, which copies the
        invoice into a new draft for you to check and send.
      </p>

      {schedules && schedules.length > 0 ? (
        <div className="app-card mt-6 overflow-hidden">
          <Table>
          <TableHeader>
            <TableRow className="border-hairline hover:bg-transparent">
              <TableHead className="h-11 px-4 text-[14px] font-medium text-muted-foreground">
                Repeats
              </TableHead>
              <TableHead className="h-11 px-4 text-[14px] font-medium text-muted-foreground">
                Every
              </TableHead>
              <TableHead className="h-11 px-4 text-[14px] font-medium text-muted-foreground">
                Next
              </TableHead>
              <TableHead className="h-11 px-4 text-right text-[14px] font-medium text-muted-foreground">
                Amount
              </TableHead>
              <TableHead className="h-11 px-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {schedules.map((s) => {
              const source = sourceById.get(s.source_invoice_id)
              const isDue = s.is_active && s.next_due_on <= today
              return (
                <TableRow key={s.id} className="border-hairline hover:bg-secondary/50">
                  <TableCell className="px-4 py-3.5">
                    <Link
                      href={`/invoices/${s.source_invoice_id}/edit`}
                      className="text-[15px] text-foreground hover:underline"
                    >
                      {source?.bill_to_name ?? '—'}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-[14px] text-muted-foreground">
                    {CADENCE_LABEL[s.cadence]}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-[14px]">
                    <span className={isDue ? 'text-destructive' : 'text-muted-foreground'}>
                      {formatDate(s.next_due_on)}
                    </span>
                    {!s.is_active ? (
                      <Badge
                        variant="outline"
                        className="ml-2 h-auto px-2 py-0.5 text-[12px] font-medium text-muted-foreground"
                      >
                        Paused
                      </Badge>
                    ) : null}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-right text-[14px] tabular-nums text-foreground">
                    {source
                      ? formatPaise(source.total_paise, {
                          showPaise: false,
                          currency: source.currency,
                        })
                      : '—'}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-right">
                    <RecurringRowActions id={s.id} isActive={s.is_active} isDue={isDue} />
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
        </div>
      ) : (
        <EmptyState
          title="No repeat schedules yet"
          description="Pick an invoice you send regularly and it’ll be ready to generate each time it’s due."
        />
      )}
    </div>
  )
}
