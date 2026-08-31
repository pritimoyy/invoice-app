import type { Metadata } from 'next'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { isoDatePlusDays, startOfMonthIso, todayIso } from '@/lib/dates'
import {
  DISPLAY_STATUS_LABEL,
  computeDisplayStatus,
  displayStatusClassName,
  wasPaidLate,
} from '@/lib/invoice-status'
import { formatPaise } from '@/lib/money'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Dashboard',
}

const RECENT_LIMIT = 8
const DUE_SOON_DAYS = 7

function sumByCurrency(entries: [string, number][]) {
  const map = new Map<string, number>()
  for (const [currency, paise] of entries) {
    map.set(currency, (map.get(currency) ?? 0) + paise)
  }
  return map
}

function StatCard({
  label,
  amounts,
  emptyText,
  /** Gradient tiles carry the two figures that matter most; the rest stay
      plain cards so the colour actually means something. */
  gradient,
  valueClassName = 'text-foreground',
}: {
  label: string
  amounts: Map<string, number>
  emptyText: string
  gradient?: 'blue' | 'violet' | 'mint' | 'sunset'
  valueClassName?: string
}) {
  // A gradient tile is for a figure worth looking at. Painting "Nothing
  // outstanding." across a vivid blue card inverts the hierarchy — the
  // loudest thing on the page ends up carrying the least information — so
  // an empty stat falls back to a plain card.
  const isTinted = Boolean(gradient) && amounts.size > 0
  return (
    <div className={isTinted ? `app-card-tint tint-${gradient} p-5` : 'app-card p-5'}>
      <p className="text-[14px] font-medium text-muted-foreground">{label}</p>
      {amounts.size > 0 ? (
        <div className="mt-2 flex flex-col gap-0.5">
          {[...amounts.entries()].map(([currency, paise]) => (
            <p
              key={currency}
              className={`text-[28px] font-semibold tracking-[-0.02em] tabular-nums ${valueClassName}`}
            >
              {formatPaise(paise, { currency, showPaise: false })}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[15px] text-muted-foreground">{emptyText}</p>
      )}
    </div>
  )
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const today = todayIso()
  const dueSoonBy = isoDatePlusDays(DUE_SOON_DAYS)
  const monthStart = startOfMonthIso()

  const [
    { data: balances },
    { data: recent },
    { count: draftCount },
    { data: monthPayments },
    { data: allPayments },
    { count: recurringDueCount },
  ] = await Promise.all([
    supabase
      .from('invoice_balances')
      .select('id, currency, balance_paise, is_overdue, due_date'),
    supabase
      .from('invoices')
      .select('id, status, bill_to_name, total_paise, currency, issue_date, kind')
      .eq('kind', 'invoice')
      .order('created_at', { ascending: false })
      .limit(RECENT_LIMIT),
    supabase
      .from('invoices')
      .select('id', { count: 'exact', head: true })
      .eq('kind', 'invoice')
      .eq('status', 'draft'),
    supabase.from('payments').select('invoice_id, amount_paise, tds_paise').gte('paid_on', monthStart),
    supabase.from('payments').select('invoice_id, paid_on'),
    supabase
      .from('recurring_invoices')
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true)
      .lte('next_due_on', todayIso()),
  ])

  // Grouped by currency, never summed across them — a ₹ balance and a $
  // balance are not the same number and adding them would just be wrong.
  const currencyByInvoiceId = new Map<string, string>()
  const overdueById = new Map<string, boolean>()
  const dueDateById = new Map<string, string | null>()
  const outstandingEntries: [string, number][] = []
  const overdueEntries: [string, number][] = []
  const dueSoonEntries: [string, number][] = []

  for (const b of balances ?? []) {
    if (!b.currency || b.id == null) continue
    currencyByInvoiceId.set(b.id, b.currency)
    overdueById.set(b.id, b.is_overdue ?? false)
    dueDateById.set(b.id, b.due_date)
    if (b.balance_paise == null || b.balance_paise <= 0) continue
    outstandingEntries.push([b.currency, b.balance_paise])
    if (b.is_overdue) {
      overdueEntries.push([b.currency, b.balance_paise])
    } else if (b.due_date && b.due_date >= today && b.due_date <= dueSoonBy) {
      dueSoonEntries.push([b.currency, b.balance_paise])
    }
  }

  const paymentDatesByInvoiceId = new Map<string, string[]>()
  for (const p of allPayments ?? []) {
    const dates = paymentDatesByInvoiceId.get(p.invoice_id) ?? []
    dates.push(p.paid_on)
    paymentDatesByInvoiceId.set(p.invoice_id, dates)
  }

  const paidThisMonthEntries: [string, number][] = []
  for (const p of monthPayments ?? []) {
    const currency = currencyByInvoiceId.get(p.invoice_id)
    if (!currency) continue
    paidThisMonthEntries.push([currency, p.amount_paise + p.tds_paise])
  }

  const outstandingByCurrency = sumByCurrency(outstandingEntries)
  const overdueByCurrency = sumByCurrency(overdueEntries)
  const dueSoonByCurrency = sumByCurrency(dueSoonEntries)
  const paidThisMonthByCurrency = sumByCurrency(paidThisMonthEntries)

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-foreground">Dashboard</h1>
        <Button
          asChild
          >
          <Link href="/invoices/new">New invoice</Link>
        </Button>
      </div>

      {recurringDueCount ? (
        <p className="mt-3 text-[14px] text-muted-foreground">
          {recurringDueCount} recurring invoice{recurringDueCount === 1 ? '' : 's'} due —{' '}
          <Link
            href="/recurring"
            className="underline-offset-4 hover:text-foreground hover:underline"
          >
            generate {recurringDueCount === 1 ? 'it' : 'them'}
          </Link>
          .
        </p>
      ) : null}

      {draftCount ? (
        <p className="mt-3 text-[14px] text-muted-foreground">
          {draftCount} draft{draftCount === 1 ? '' : 's'} waiting to be sent —{' '}
          <Link href="/invoices" className="underline-offset-4 hover:text-foreground hover:underline">
            review them
          </Link>
          .
        </p>
      ) : null}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Outstanding"
          amounts={outstandingByCurrency}
          emptyText="Nothing outstanding."
          gradient="blue"
          valueClassName="text-primary"
        />
        <StatCard
          label="Overdue"
          amounts={overdueByCurrency}
          emptyText="Nothing overdue."
          valueClassName="text-destructive"
        />
        <StatCard
          label={`Due in ${DUE_SOON_DAYS} days`}
          amounts={dueSoonByCurrency}
          emptyText="Nothing due soon."
        />
        <StatCard
          label="Paid this month"
          amounts={paidThisMonthByCurrency}
          emptyText="Nothing yet."
          gradient="mint"
          valueClassName="text-success"
        />
      </div>

      <div className="mt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[15px] font-medium tracking-tight text-foreground">
            Recent invoices
          </h2>
          <Link
            href="/invoices"
            className="text-[14px] font-medium text-muted-foreground hover:text-foreground hover:underline"
          >
            All invoices
          </Link>
        </div>

        {recent && recent.length > 0 ? (
          <div className="app-card mt-4 overflow-hidden px-4">
            {recent.map((inv) => {
              const displayStatus = computeDisplayStatus({
                status: inv.status,
                isOverdue: overdueById.get(inv.id) ?? false,
                paidLate: wasPaidLate(
                  paymentDatesByInvoiceId.get(inv.id) ?? [],
                  dueDateById.get(inv.id) ?? null,
                ),
              })

              return (
                <Link
                  key={inv.id}
                  href={`/invoices/${inv.id}/edit`}
                  className="flex items-center gap-4 border-b border-hairline py-3 text-[14px] hover:bg-secondary"
                >
                  <span className="flex-1 text-foreground">{inv.bill_to_name}</span>
                  <span className="text-muted-foreground">
                    {new Date(inv.issue_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <Badge
                    variant="outline"
                    className={`h-auto px-2 py-0.5 text-[12px] font-medium ${displayStatusClassName(displayStatus)}`}
                  >
                    {DISPLAY_STATUS_LABEL[displayStatus]}
                  </Badge>
                  <span className="w-28 text-right tabular-nums text-foreground">
                    {formatPaise(inv.total_paise, { currency: inv.currency, showPaise: false })}
                  </span>
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="mt-4 text-[14px] text-muted-foreground">No invoices yet.</p>
        )}
      </div>
    </div>
  )
}
