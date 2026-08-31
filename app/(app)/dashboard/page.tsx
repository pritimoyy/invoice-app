import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Dashboard',
}

/**
 * Placeholder. The real dashboard is Phase 6 and answers one question — what
 * am I owed, and what's late — off the `invoice_balances` view. That view
 * has no rows yet since invoicing (Phase 3+) isn't built, so this is an
 * honest empty state rather than fabricated numbers.
 */
export default function DashboardPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="text-[22px] font-medium tracking-tight text-neutral-900">
        Dashboard
      </h1>

      <div className="mt-10 flex flex-col items-start gap-2 border-t border-neutral-200 pt-10">
        <p className="text-[15px] text-neutral-900">
          Outstanding and overdue totals will show up here.
        </p>
        <p className="max-w-md text-[13px] leading-relaxed text-neutral-500">
          This reads from the <code className="text-neutral-700">invoice_balances</code>{' '}
          view once invoices exist to bill against — nothing to show until
          then.
        </p>
      </div>
    </div>
  )
}
