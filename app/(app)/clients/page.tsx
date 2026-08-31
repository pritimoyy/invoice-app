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
import { EmptyState } from '@/components/invoice/empty-state'
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
        <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-foreground">
          Clients
        </h1>
        <Button
          asChild
          >
          <Link href="/clients/new">Add client</Link>
        </Button>
      </div>

      {clients && clients.length > 0 ? (
        <div className="app-card mt-6 overflow-hidden">
          <Table>
          <TableHeader>
            <TableRow className="border-hairline hover:bg-transparent">
              <TableHead className="h-11 px-4 text-[13px] font-medium text-muted-foreground">
                Name
              </TableHead>
              <TableHead className="h-11 px-4 text-[13px] font-medium text-muted-foreground">
                Location
              </TableHead>
              <TableHead className="h-11 px-4 text-[13px] font-medium text-muted-foreground">
                GSTIN
              </TableHead>
              <TableHead className="h-11 px-4" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {clients.map((c) => (
              <TableRow key={c.id} className="border-hairline hover:bg-secondary/50">
                <TableCell className="px-4 py-3.5">
                  <Link
                    href={`/clients/${c.id}`}
                    className="text-[15px] text-foreground hover:underline"
                  >
                    {c.name}
                  </Link>
                </TableCell>
                <TableCell className="px-4 py-3.5 text-[13px] text-muted-foreground">
                  {[c.city, c.state_code].filter(Boolean).join(' · ') || '—'}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-[13px] text-muted-foreground">
                  {c.gstin ?? '—'}
                </TableCell>
                <TableCell className="px-4 py-3.5 text-right">
                  <div className="flex items-center justify-end gap-4">
                    <Link
                      href={`/clients/${c.id}`}
                      className="text-[13px] font-medium text-primary hover:underline"
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
        <EmptyState
          title={showArchived ? 'No archived clients' : 'No clients yet'}
          description={showArchived ? undefined : 'Add a client before starting an invoice.'}
        />
      )}

      <p className="mt-8 text-[13px] text-muted-foreground">
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
