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
  valueClassName = 'text-neutral-900',
}: {
  label: string
  amounts: Map<string, number>
  emptyText: string
  valueClassName?: string
}) {
  return (
    <div className="border border-neutral-200 p-6">
      <p className="text-[10px] uppercase tracking-[0.14em] text-neutral-400">{label}</p>
      {amounts.size > 0 ? (
        <div className="mt-2 flex flex-col gap-1">
          {[...amounts.entries()].map(([currency, paise]) => (
            <p
              key={currency}
              className={`text-[26px] font-semibold tabular-nums ${valueClassName}`}
            >
              {formatPaise(paise, { currency, showPaise: false })}
            </p>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-[14px] text-neutral-500">{emptyText}</p>
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
        <h1 className="text-[22px] font-medium tracking-tight text-neutral-900">Dashboard</h1>
        <Button
          asChild
          className="h-auto rounded-none bg-neutral-900 px-4 py-2 text-[12px] uppercase tracking-[0.1em] text-white hover:bg-neutral-900/90"
        >
          <Link href="/invoices/new">New invoice</Link>
        </Button>
      </div>

      {recurringDueCount ? (
        <p className="mt-3 text-[13px] text-neutral-500">
          {recurringDueCount} recurring invoice{recurringDueCount === 1 ? '' : 's'} due —{' '}
          <Link
            href="/recurring"
            className="underline-offset-4 hover:text-neutral-900 hover:underline"
          >
            generate {recurringDueCount === 1 ? 'it' : 'them'}
          </Link>
          .
        </p>
      ) : null}

      {draftCount ? (
        <p className="mt-3 text-[13px] text-neutral-500">
          {draftCount} draft{draftCount === 1 ? '' : 's'} waiting to be sent —{' '}
          <Link href="/invoices" className="underline-offset-4 hover:text-neutral-900 hover:underline">
            review them
          </Link>
          .
        </p>
      ) : null}

      <div className="mt-10 grid grid-cols-1 gap-6 border-t border-neutral-200 pt-10 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Outstanding" amounts={outstandingByCurrency} emptyText="Nothing outstanding." />
        <StatCard
          label="Overdue"
          amounts={overdueByCurrency}
          emptyText="Nothing overdue."
          valueClassName="text-red-700"
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
          valueClassName="text-emerald-700"
        />
      </div>

      <div className="mt-10 border-t border-neutral-200 pt-10">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[15px] font-medium tracking-tight text-neutral-900">
            Recent invoices
          </h2>
          <Link
            href="/invoices"
            className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 hover:text-neutral-900 hover:underline"
          >
            All invoices
          </Link>
        </div>

        {recent && recent.length > 0 ? (
          <div className="mt-4 flex flex-col">
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
                  className="flex items-center gap-4 border-b border-neutral-100 py-3 text-[13px] hover:bg-neutral-50"
                >
                  <span className="flex-1 text-neutral-900">{inv.bill_to_name}</span>
                  <span className="text-neutral-500">
                    {new Date(inv.issue_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                  <Badge
                    variant="outline"
                    className={`h-auto rounded-none px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] ${displayStatusClassName(displayStatus)}`}
                  >
                    {DISPLAY_STATUS_LABEL[displayStatus]}
                  </Badge>
                  <span className="w-28 text-right tabular-nums text-neutral-900">
                    {formatPaise(inv.total_paise, { currency: inv.currency, showPaise: false })}
                  </span>
                </Link>
              )
            })}
          </div>
        ) : (
          <p className="mt-4 text-[13px] text-neutral-500">No invoices yet.</p>
        )}
      </div>
    </div>
  )
}
