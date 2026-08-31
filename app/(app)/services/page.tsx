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
import { formatPaise } from '@/lib/money'
import { TAX_RATE_OPTIONS } from '@/lib/tax'
import { createClient } from '@/lib/supabase/server'

import { setServiceArchived } from './actions'

export const metadata: Metadata = {
  title: 'Services',
}

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>
}) {
  const { archived } = await searchParams
  const showArchived = archived === '1'

  const supabase = await createClient()
  const { data: services } = await supabase
    .from('services')
    .select('id, name, unit, default_rate_paise, tax_rate_bps, is_archived')
    .eq('is_archived', showArchived)
    .order('name')

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-foreground">
          Services
        </h1>
        <Button
          asChild
          >
          <Link href="/services/new">Add service</Link>
        </Button>
      </div>

      {services && services.length > 0 ? (
        <div className="app-card mt-6 overflow-hidden">
          <Table>
          <TableHeader>
            <TableRow className="border-hairline hover:bg-transparent">
              <TableHead className="h-11 px-4 text-[13px] font-medium text-muted-foreground">
                Name
              </TableHead>
              <TableHead className="h-11 px-4 text-[13px] font-medium text-muted-foreground">
                Unit
              </TableHead>
              <TableHead className="h-11 px-4 text-right text-[13px] font-medium text-muted-foreground">
                Rate
              </TableHead>
              <TableHead className="h-11 px-4 text-right text-[13px] font-medium text-muted-foreground">
                Tax
              </TableHead>
              <TableHead className="h-11 px-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((s) => (
              <TableRow key={s.id} className="border-hairline hover:bg-secondary/50">
                <TableCell className="px-4 py-3.5">
                  <Link
                    href={`/services/${s.id}`}
                    className="text-[15px] text-foreground hover:underline"
                  >
                    {s.name}
                  </Link>
                </TableCell>
                <TableCell className="px-4 py-3.5 text-[13px] text-muted-foreground">
                  {s.unit}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-right text-[13px] tabular-nums text-foreground">
                  {formatPaise(s.default_rate_paise, { showPaise: false })}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-right text-[13px] tabular-nums text-muted-foreground">
                  {TAX_RATE_OPTIONS.find((o) => o.bps === s.tax_rate_bps)?.label ?? '—'}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-4">
                    <Link
                      href={`/services/${s.id}`}
                      className="text-[13px] font-medium text-primary hover:underline"
                    >
                      Edit
                    </Link>
                    <form
                      action={setServiceArchived.bind(null, s.id, !showArchived)}
                    >
                      <Button
                        type="submit"
                        variant="ghost"
                        size="sm"
                        className="h-auto px-0 text-[13px] font-medium text-muted-foreground hover:bg-transparent hover:text-foreground"
                      >
                        {showArchived ? 'Unarchive' : 'Archive'}
                      </Button>
                    </form>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        </div>
      ) : (
        <p className="mt-10 text-[13px] text-muted-foreground">
          {showArchived ? 'No archived services.' : 'No services yet.'}
        </p>
      )}

      <p className="mt-8 text-[13px] text-muted-foreground">
        {showArchived ? (
          <Link href="/services" className="underline-offset-4 hover:underline">
            Back to active services
          </Link>
        ) : (
          <Link
            href="/services?archived=1"
            className="underline-offset-4 hover:underline"
          >
            Show archived
          </Link>
        )}
      </p>
    </div>
  )
}
