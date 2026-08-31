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
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-foreground">
          Estimates
        </h1>
        <Button
          asChild
          >
          <Link href="/estimates/new">New estimate</Link>
        </Button>
      </div>

      {estimates && estimates.length > 0 ? (
        <div className="app-card mt-6 overflow-hidden">
          <Table>
          <TableHeader>
            <TableRow className="border-hairline hover:bg-transparent">
              <TableHead className="h-11 px-4 text-[12px] font-medium text-muted-foreground">
                Client
              </TableHead>
              <TableHead className="h-11 px-4 text-[12px] font-medium text-muted-foreground">
                Date
              </TableHead>
              <TableHead className="h-11 px-4 text-[12px] font-medium text-muted-foreground">
                Status
              </TableHead>
              <TableHead className="h-11 px-4 text-right text-[12px] font-medium text-muted-foreground">
                Total
              </TableHead>
              <TableHead className="h-11 px-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {estimates.map((est) => {
              const isConverted = convertedIds.has(est.id)
              return (
                <TableRow key={est.id} className="border-hairline hover:bg-secondary/50">
                  <TableCell className="px-4 py-3.5">
                    <Link
                      href={`/invoices/${est.id}/edit`}
                      className="text-[14px] text-foreground hover:underline"
                    >
                      {est.bill_to_name}
                    </Link>
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-[13px] text-muted-foreground">
                    {new Date(est.issue_date).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </TableCell>
                  <TableCell className="px-4 py-3.5">
                    <Badge
                      variant="outline"
                      className={`h-auto px-2 py-0.5 text-[11px] font-medium ${
                        isConverted ? 'text-success' : 'text-muted-foreground'
                      }`}
                    >
                      {isConverted ? 'Invoiced' : est.status === 'draft' ? 'Draft' : 'Sent'}
                    </Badge>
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-right text-[13px] tabular-nums text-foreground">
                    {formatPaise(est.total_paise, {
                      showPaise: false,
                      currency: est.currency,
                    })}
                  </TableCell>
                  <TableCell className="px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-4">
                      <Link
                        href={`/invoices/${est.id}/edit`}
                        className="text-[13px] font-medium text-primary hover:underline"
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
        </div>
      ) : (
        <p className="mt-10 text-[13px] text-muted-foreground">
          No estimates yet. An estimate is a quote you can turn into an invoice once
          it&apos;s accepted.
        </p>
      )}
    </div>
  )
}
