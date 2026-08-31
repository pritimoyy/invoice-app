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
import { createClient } from '@/lib/supabase/server'

import { setClientArchived } from './actions'

export const metadata: Metadata = {
  title: 'Clients',
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ archived?: string }>
}) {
  const { archived } = await searchParams
  const showArchived = archived === '1'

  const supabase = await createClient()
  const { data: clients } = await supabase
    .from('clients')
    .select('id, name, city, state_code, gstin, is_archived')
    .eq('is_archived', showArchived)
    .order('name')

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex items-baseline justify-between gap-4">
        <h1 className="text-[22px] font-medium tracking-tight text-neutral-900">
          Clients
        </h1>
        <Button
          asChild
          className="h-auto rounded-none bg-neutral-900 px-4 py-2 text-[12px] uppercase tracking-[0.1em] text-white hover:bg-neutral-900/90"
        >
          <Link href="/clients/new">Add client</Link>
        </Button>
      </div>

      {clients && clients.length > 0 ? (
        <Table className="mt-8">
          <TableHeader>
            <TableRow className="border-neutral-200 hover:bg-transparent">
              <TableHead className="h-9 px-0 text-[11px] font-normal uppercase tracking-[0.1em] text-neutral-500">
                Name
              </TableHead>
              <TableHead className="h-9 px-0 text-[11px] font-normal uppercase tracking-[0.1em] text-neutral-500">
                Location
              </TableHead>
              <TableHead className="h-9 px-0 text-[11px] font-normal uppercase tracking-[0.1em] text-neutral-500">
                GSTIN
              </TableHead>
              <TableHead className="h-9 px-0" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((c) => (
              <TableRow key={c.id} className="border-neutral-200 hover:bg-neutral-50">
                <TableCell className="px-0 py-4">
                  <Link
                    href={`/clients/${c.id}`}
                    className="text-[14px] text-neutral-900 hover:underline"
                  >
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell className="px-0 py-4 text-[13px] text-neutral-500">
                  {[c.city, c.state_code].filter(Boolean).join(' · ') || '—'}
                </TableCell>
                <TableCell className="px-0 py-4 text-[13px] text-neutral-500">
                  {c.gstin ?? '—'}
                </TableCell>
                <TableCell className="px-0 py-4 text-right">
                  <div className="flex items-center justify-end gap-4">
                    <Link
                      href={`/clients/${c.id}`}
                      className="text-[11px] uppercase tracking-[0.1em] text-neutral-400 hover:text-neutral-900 hover:underline"
                    >
                      Edit
                    </Link>
                    <form
                      action={setClientArchived.bind(null, c.id, !showArchived)}
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
          {showArchived ? 'No archived clients.' : 'No clients yet.'}
        </p>
      )}

      <p className="mt-8 text-[12px] text-neutral-400">
        {showArchived ? (
          <Link href="/clients" className="underline-offset-4 hover:underline">
            Back to active clients
          </Link>
        ) : (
          <Link
            href="/clients?archived=1"
            className="underline-offset-4 hover:underline"
          >
            Show archived
          </Link>
        )}
      </p>
    </div>
  )
}
