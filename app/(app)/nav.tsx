'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import { signOut } from './actions'

const LINKS = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/clients', label: 'Clients' },
  { href: '/services', label: 'Services' },
  { href: '/estimates', label: 'Estimates' },
  { href: '/invoices', label: 'Invoices' },
  { href: '/recurring', label: 'Recurring' },
  { href: '/settings', label: 'Settings' },
]

function isActive(pathname: string, href: string) {
  return href === '/dashboard' ? pathname === href : pathname.startsWith(href)
}

export function AppNav({
  email,
  brand,
}: {
  email: string | undefined
  brand: string
}) {
  const pathname = usePathname()

  return (
    <header className="border-b border-neutral-200 bg-white">
      {/* Wider than the max-w-4xl content column on purpose: seven sections
          plus the sign-out block don't fit 896px, and a header bar spanning
          past its content is ordinary. It still wraps rather than
          overflowing — the same seven links need ~620px, well past a 375px
          phone. min-h-14 keeps the desktop height unchanged. */}
      <div className="mx-auto flex min-h-14 w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-2 px-6 py-3 sm:py-0">
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <Link
            href="/dashboard"
            className="text-[14px] font-medium tracking-tight text-neutral-900"
          >
            {brand}
          </Link>
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'text-[12px] uppercase tracking-[0.1em] transition-colors',
                isActive(pathname, link.href)
                  ? 'text-neutral-900'
                  : 'text-neutral-400 hover:text-neutral-900',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          {email ? (
            <span className="hidden text-[12px] text-neutral-400 lg:inline">
              {email}
            </span>
          ) : null}
          <form action={signOut}>
            <Button
              type="submit"
              variant="ghost"
              size="sm"
              className="h-auto px-0 text-[12px] uppercase tracking-[0.1em] text-neutral-500 hover:bg-transparent hover:text-neutral-900 hover:underline"
            >
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
