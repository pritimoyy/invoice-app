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
import { formatPaise } from '@/lib/money'
import { createClient } from '@/lib/supabase/server'

import { DeleteInvoiceButton } from './delete-button'

export const metadata: Metadata = {
  title: 'Invoices',
}

export default async function InvoicesPage() {
  const supabase = await createClient()
  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, number, status, bill_to_name, total_paise, currency, issue_date, kind')
    .eq('kind', 'invoice')
    .order('created_at', { ascending: false })

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
            {invoices.map((inv) => (
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
                  <Badge
                    variant="outline"
                    className="h-auto rounded-none px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-neutral-500"
                  >
                    {inv.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="px-0 py-4 text-right text-[13px] tabular-nums text-neutral-900">
                  {formatPaise(inv.total_paise, {
                    showPaise: false,
                    currency: inv.currency,
                  })}
                </TableCell>
                <TableCell className="px-0 py-4 text-right">
                  <div className="flex items-center justify-end gap-4">
                    <Link
                      href={`/invoices/${inv.id}/edit`}
                      className="text-[11px] uppercase tracking-[0.1em] text-neutral-500 hover:text-neutral-900 hover:underline"
                    >
                      Edit
                    </Link>
                    {inv.status === 'draft' ? (
                      <DeleteInvoiceButton invoiceId={inv.id} />
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <p className="mt-10 text-[13px] text-neutral-500">No invoices yet.</p>
      )}
    </div>
  )
}
