'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
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
    /* Sticky translucent bar — the header treatment from the references.
       Wider than the content column because seven sections plus the
       account controls don't fit 896px, and it still wraps rather than
       overflowing a phone. */
    <header className="app-glass sticky top-0 z-40">
      {/* Ordered so the shell is deliberate at every width rather than
          wrapping arbitrarily: below lg the nav drops to its own full-width
          row under brand-and-account; at lg it sits between them on one
          line. Seven sections plus the account controls simply don't fit
          one row on a narrow laptop, and stranding "Sign out" at the start
          of row two looked broken. */}
      <div className="mx-auto flex min-h-14 w-full max-w-5xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-2.5 sm:px-6 lg:min-h-16 lg:flex-nowrap lg:py-0">
        <Link
          href="/dashboard"
          className="order-1 text-[15px] font-semibold tracking-[-0.02em] text-foreground"
        >
          {brand}
        </Link>

        <nav className="order-3 -mx-1 flex w-full items-center gap-1 overflow-x-auto pb-0.5 lg:order-2 lg:mx-0 lg:w-auto lg:overflow-visible lg:pb-0">
          {LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={isActive(pathname, link.href) ? 'page' : undefined}
              className={cn(
                'shrink-0 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
                isActive(pathname, link.href)
                  ? 'bg-secondary text-foreground'
                  : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
              )}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="order-2 ml-auto flex items-center gap-3 lg:order-3">
          <ThemeToggle />
          {email ? (
            <span className="hidden text-[13px] text-muted-foreground xl:inline">
              {email}
            </span>
          ) : null}
          <form action={signOut}>
            <Button type="submit" variant="ghost" size="sm" className="text-muted-foreground">
              Sign out
            </Button>
          </form>
        </div>
      </div>
    </header>
  )
}
