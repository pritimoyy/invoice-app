import type { Metadata } from 'next'
import Link from 'next/link'

import { Badge } from '@/components/ui/badge'
import { formatPaise } from '@/lib/money'
import { createClient } from '@/lib/supabase/server'

export const metadata: Metadata = {
  title: 'Dashboard',
}

const RECENT_LIMIT = 8

export default async function DashboardPage() {
  const supabase = await createClient()

  const [{ data: balances }, { data: recent }] = await Promise.all([
    supabase.from('invoice_balances').select('currency, balance_paise, is_overdue'),
    supabase
      .from('invoices')
      .select('id, number, status, bill_to_name, total_paise, currency, issue_date, kind')
      .eq('kind', 'invoice')
      .order('created_at', { ascending: false })
      .limit(RECENT_LIMIT),
  ])

  // Grouped by currency, never summed across them — a ₹ balance and a $
  // balance are not the same number and adding them would just be wrong.
  const outstandingByCurrency = new Map<string, number>()
  const overdueByCurrency = new Map<string, number>()
  for (const b of balances ?? []) {
    if (!b.currency || b.balance_paise == null || b.balance_paise <= 0) continue
    outstandingByCurrency.set(
      b.currency,
      (outstandingByCurrency.get(b.currency) ?? 0) + b.balance_paise,
    )
    if (b.is_overdue) {
      overdueByCurrency.set(b.currency, (overdueByCurrency.get(b.currency) ?? 0) + b.balance_paise)
    }
  }

  return (
    <div className="mx-auto w-full max-w-4xl">
      <h1 className="text-[22px] font-medium tracking-tight text-neutral-900">Dashboard</h1>

      <div className="mt-10 grid grid-cols-1 gap-6 border-t border-neutral-200 pt-10 sm:grid-cols-2">
        <div className="border border-neutral-200 p-6">
          <p className="text-[10px] uppercase tracking-[0.14em] text-neutral-400">Outstanding</p>
          {outstandingByCurrency.size > 0 ? (
            <div className="mt-2 flex flex-col gap-1">
              {[...outstandingByCurrency.entries()].map(([currency, paise]) => (
                <p
                  key={currency}
                  className="text-[28px] font-semibold tabular-nums text-neutral-900"
                >
                  {formatPaise(paise, { currency, showPaise: false })}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[15px] text-neutral-500">Nothing outstanding.</p>
          )}
        </div>

        <div className="border border-neutral-200 p-6">
          <p className="text-[10px] uppercase tracking-[0.14em] text-neutral-400">Overdue</p>
          {overdueByCurrency.size > 0 ? (
            <div className="mt-2 flex flex-col gap-1">
              {[...overdueByCurrency.entries()].map(([currency, paise]) => (
                <p key={currency} className="text-[28px] font-semibold tabular-nums text-red-700">
                  {formatPaise(paise, { currency, showPaise: false })}
                </p>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-[15px] text-neutral-500">Nothing overdue.</p>
          )}
        </div>
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
            {recent.map((inv) => (
              <Link
                key={inv.id}
                href={`/invoices/${inv.id}/edit`}
                className="flex items-center gap-4 border-b border-neutral-100 py-3 text-[13px] hover:bg-neutral-50"
              >
                <span className="flex-1 text-neutral-900">{inv.bill_to_name}</span>
                <Badge
                  variant="outline"
                  className="h-auto rounded-none px-1.5 py-0.5 text-[10px] uppercase tracking-[0.1em] text-neutral-500"
                >
                  {inv.status.replace('_', ' ')}
                </Badge>
                <span className="w-28 text-right tabular-nums text-neutral-900">
                  {formatPaise(inv.total_paise, { currency: inv.currency, showPaise: false })}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-[13px] text-neutral-500">No invoices yet.</p>
        )}
      </div>
    </div>
  )
}
