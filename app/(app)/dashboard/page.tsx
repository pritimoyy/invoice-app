import type { Metadata } from 'next'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'

import { signOut } from '../actions'

export const metadata: Metadata = {
  title: 'Dashboard',
}

/**
 * Placeholder. The real dashboard is Phase 6 and answers one question — what
 * am I owed, and what's late — off the `invoice_balances` view. That view
 * doesn't exist yet, so this only proves the auth round-trip works.
 */
export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="min-h-dvh bg-white px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <header className="flex items-baseline justify-between gap-4">
          <h1 className="text-[22px] font-medium tracking-tight text-neutral-900">
            Dashboard
          </h1>

          <div className="flex items-baseline gap-5">
            <Link
              href="/settings"
              className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline"
            >
              Settings
            </Link>

            <form action={signOut}>
              <button
                type="submit"
                className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline"
              >
                Sign out
              </button>
            </form>
          </div>
        </header>

        <p className="mt-6 text-[13px] text-neutral-500">
          Signed in as{' '}
          <span className="text-neutral-900">{user?.email}</span>
        </p>

        <p className="mt-10 border-t border-neutral-200 pt-6 text-[13px] leading-relaxed text-neutral-500">
          Outstanding and overdue totals land here in Phase 6, once the schema
          is pushed and the <code className="text-neutral-900">invoice_balances</code>{' '}
          view exists.
        </p>
      </div>
    </main>
  )
}
