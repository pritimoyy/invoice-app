import type { Metadata } from 'next'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { computeDisplayStatus, wasPaidLate } from '@/lib/invoice-status'
import { formatPaise } from '@/lib/money'
import { createClient } from '@/lib/supabase/server'

import { StatusSelect } from './status-select'

export const metadata: Metadata = {
  title: 'Invoices',
}

export default async function InvoicesPage() {
  const supabase = await createClient()
  const [{ data: invoices }, { data: balances }, { data: payments }] = await Promise.all([
    supabase
      .from('invoices')
      .select('id, number, status, bill_to_name, total_paise, currency, issue_date, kind, fy')
      .eq('kind', 'invoice')
      .order('created_at', { ascending: false }),
    supabase.from('invoice_balances').select('id, is_overdue, due_date'),
    supabase.from('payments').select('invoice_id, paid_on'),
  ])

  // Only financial years that actually have sent invoices — drafts carry a
  // uuid placeholder in `fy` until they're numbered, which must never show
  // up as a year to export.
  const financialYears = [
    ...new Set(
      (invoices ?? [])
        .filter((i) => i.status !== 'draft')
        .map((i) => i.fy)
        .filter((fy): fy is string => /^\d{4}-\d{2}$/.test(fy)),
    ),
  ].sort((a, b) => b.localeCompare(a))

  const overdueById = new Map(balances?.map((b) => [b.id, b.is_overdue ?? false]) ?? [])
  const dueDateById = new Map(balances?.map((b) => [b.id, b.due_date]) ?? [])
  const paymentDatesByInvoiceId = new Map<string, string[]>()
  for (const p of payments ?? []) {
    const dates = paymentDatesByInvoiceId.get(p.invoice_id) ?? []
    dates.push(p.paid_on)
    paymentDatesByInvoiceId.set(p.invoice_id, dates)
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-[22px] font-medium tracking-tight text-neutral-900">
          Invoices
        </h1>
        <Button
          asChild
          className="h-auto rounded-none bg-neutral-900 px-4 py-2 text-[12px] uppercase tracking-[0.1em] text-white hover:bg-neutral-900/90"
        >
          <Link href="/invoices/new">New invoice</Link>
        </Button>
      </div>

      {invoices && invoices.length > 0 ? (
        <Table className="mt-8">
          <TableHeader>
            <TableRow className="border-neutral-200 hover:bg-transparent">
              <TableHead className="h-9 px-0 text-[11px] font-normal uppercase tracking-[0.1em] text-neutral-500">
                Client
              </TableHead>
              <TableHead className="h-9 px-0 text-[11px] font-normal uppercase tracking-[0.1em] text-neutral-500">
                Date
              </TableHead>
              <TableHead className="h-9 px-0 text-[11px] font-normal uppercase tracking-[0.1em] text-neutral-500">
                Status
              </TableHead>
              <TableHead className="h-9 px-0 text-right text-[11px] font-normal uppercase tracking-[0.1em] text-neutral-500">
                Total
              </TableHead>
              <TableHead className="h-9 px-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {invoices.map((inv) => {
              const displayStatus = computeDisplayStatus({
                status: inv.status,
                isOverdue: overdueById.get(inv.id) ?? false,
                paidLate: wasPaidLate(
                  paymentDatesByInvoiceId.get(inv.id) ?? [],
                  dueDateById.get(inv.id) ?? null,
                ),
              })

              return (
                <TableRow key={inv.id} className="border-neutral-200 hover:bg-neutral-50">
                  <TableCell className="px-0 py-4">
                    <Link
                      href={`/invoices/${inv.id}/edit`}
                      className="text-[14px] text-neutral-900 hover:underline"
                    >
                      {inv.bill_to_name}
                    </Link>
                  </TableCell>
                  <TableCell className="px-0 py-4 text-[13px] text-neutral-500">
                    {new Date(inv.issue_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="px-0 py-4">
                    <StatusSelect
                      invoiceId={inv.id}
                      status={inv.status}
                      displayStatus={displayStatus}
                    />
                  </TableCell>
                  <TableCell className="px-0 py-4 text-right text-[13px] tabular-nums text-neutral-900">
                    {formatPaise(inv.total_paise, {
                      showPaise: false,
                      currency: inv.currency,
                    })}
                  </TableCell>
                  <TableCell className="px-0 py-4 text-right">
                    <Link
                      href={`/invoices/${inv.id}/edit`}
                      className="text-[11px] uppercase tracking-[0.1em] text-neutral-500 hover:text-neutral-900 hover:underline"
                    >
                      Edit
                    </Link>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      ) : (
        <p className="mt-10 text-[13px] text-neutral-500">No invoices yet.</p>
      )}

      {financialYears.length > 0 ? (
        <div className="mt-10 flex flex-wrap items-baseline gap-x-4 gap-y-2 border-t border-neutral-200 pt-6">
          <span className="text-[11px] uppercase tracking-[0.1em] text-neutral-400">
            Export for your CA
          </span>
          {financialYears.map((fy) => (
            <a
              key={fy}
              href={`/api/export/invoices?fy=${fy}`}
              className="text-[12px] tabular-nums text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline"
            >
              FY {fy}
            </a>
          ))}
          <a
            href="/api/export/invoices"
            className="text-[12px] text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline"
          >
            All
          </a>
        </div>
      ) : null}
    </div>
  )
}
