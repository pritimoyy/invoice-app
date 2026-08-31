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
        <h1 className="text-[22px] font-medium tracking-tight text-neutral-900">
          Services
        </h1>
        <Button
          asChild
          className="h-auto rounded-none bg-neutral-900 px-4 py-2 text-[12px] uppercase tracking-[0.1em] text-white hover:bg-neutral-900/90"
        >
          <Link href="/services/new">Add service</Link>
        </Button>
      </div>

      {services && services.length > 0 ? (
        <Table className="mt-8">
          <TableHeader>
            <TableRow className="border-neutral-200 hover:bg-transparent">
              <TableHead className="h-9 px-0 text-[11px] font-normal uppercase tracking-[0.1em] text-neutral-500">
                Name
              </TableHead>
              <TableHead className="h-9 px-0 text-[11px] font-normal uppercase tracking-[0.1em] text-neutral-500">
                Unit
              </TableHead>
              <TableHead className="h-9 px-0 text-right text-[11px] font-normal uppercase tracking-[0.1em] text-neutral-500">
                Rate
              </TableHead>
              <TableHead className="h-9 px-0 text-right text-[11px] font-normal uppercase tracking-[0.1em] text-neutral-500">
                Tax
              </TableHead>
              <TableHead className="h-9 px-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {services.map((s) => (
              <TableRow key={s.id} className="border-neutral-200 hover:bg-neutral-50">
                <TableCell className="px-0 py-4">
                  <Link
                    href={`/services/${s.id}`}
                    className="text-[14px] text-neutral-900 hover:underline"
                  >
                    {s.name}
                  </Link>
                </TableCell>
                <TableCell className="px-0 py-4 text-[13px] text-neutral-500">
                  {s.unit}
                </TableCell>
                <TableCell className="px-0 py-4 text-right text-[13px] tabular-nums text-neutral-900">
                  {formatPaise(s.default_rate_paise, { showPaise: false })}
                </TableCell>
                <TableCell className="px-0 py-4 text-right text-[13px] tabular-nums text-neutral-500">
                  {TAX_RATE_OPTIONS.find((o) => o.bps === s.tax_rate_bps)?.label ?? '—'}
                </TableCell>
                <TableCell className="px-0 py-4 text-right">
                  <div className="flex items-center justify-end gap-4">
                    <Link
                      href={`/services/${s.id}`}
                      className="text-[11px] uppercase tracking-[0.1em] text-neutral-400 hover:text-neutral-900 hover:underline"
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
                        className="h-auto px-0 text-[11px] uppercase tracking-[0.1em] text-neutral-400 hover:bg-transparent hover:text-neutral-900 hover:underline"
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
      ) : (
        <p className="mt-10 text-[13px] text-neutral-500">
          {showArchived ? 'No archived services.' : 'No services yet.'}
        </p>
      )}

      <p className="mt-8 text-[12px] text-neutral-400">
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
