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

import { ConvertEstimateButton } from './convert-button'

export const metadata: Metadata = {
  title: 'Estimates',
}

export default async function EstimatesPage() {
  const supabase = await createClient()

  const { data: estimates } = await supabase
    .from('invoices')
    .select('id, number, status, bill_to_name, total_paise, currency, issue_date, kind')
    .eq('kind', 'estimate')
    .order('created_at', { ascending: false })

  // Which estimates already produced an invoice — invoices point back via
  // converted_from_id, so one query answers it for the whole list rather
  // than a lookup per row.
  const { data: converted } = await supabase
    .from('invoices')
    .select('converted_from_id')
    .eq('kind', 'invoice')
    .not('converted_from_id', 'is', null)
  const convertedIds = new Set(
    (converted ?? []).map((c) => c.converted_from_id).filter(Boolean) as string[],
  )

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-[22px] font-medium tracking-tight text-neutral-900">
          Estimates
        </h1>
        <Button
          asChild
          className="h-auto rounded-none bg-neutral-900 px-4 py-2 text-[12px] uppercase tracking-[0.1em] text-white hover:bg-neutral-900/90"
        >
          <Link href="/estimates/new">New estimate</Link>
        </Button>
      </div>

      {estimates && estimates.length > 0 ? (
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
            {estimates.map((est) => {
              const isConverted = convertedIds.has(est.id)
              return (
                <TableRow key={est.id} className="border-neutral-200 hover:bg-neutral-50">
                  <TableCell className="px-0 py-4">
                    <Link
                      href={`/invoices/${est.id}/edit`}
                      className="text-[14px] text-neutral-900 hover:underline"
                    >
                      {est.bill_to_name}
                    </Link>
                  </TableCell>
                  <TableCell className="px-0 py-4 text-[13px] text-neutral-500">
                    {new Date(est.issue_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="px-0 py-4">
                    <Badge
                      variant="outline"
                      className={`h-auto rounded-none px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] ${
                        isConverted ? 'text-emerald-700' : 'text-neutral-500'
                      }`}
                    >
                      {isConverted ? 'Invoiced' : est.status === 'draft' ? 'Draft' : 'Sent'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-0 py-4 text-right text-[13px] tabular-nums text-neutral-900">
                    {formatPaise(est.total_paise, {
                      showPaise: false,
                      currency: est.currency,
                    })}
                  </TableCell>
                  <TableCell className="px-0 py-4 text-right">
                    <div className="flex items-center justify-end gap-4">
                      <Link
                        href={`/invoices/${est.id}/edit`}
                        className="text-[11px] uppercase tracking-[0.1em] text-neutral-500 hover:text-neutral-900 hover:underline"
                      >
                        Edit
                      </Link>
                      {!isConverted ? (
                        <ConvertEstimateButton estimateId={est.id} />
                      ) : null}
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      ) : (
        <p className="mt-10 text-[13px] text-neutral-500">
          No estimates yet. An estimate is a quote you can turn into an invoice once
          it&apos;s accepted.
        </p>
      )}
    </div>
  )
}
