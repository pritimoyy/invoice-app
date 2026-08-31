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
      <div className="mx-auto flex min-h-16 w-full max-w-5xl flex-wrap items-center justify-between gap-x-6 gap-y-3 px-4 py-3 sm:px-6 sm:py-0">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <Link
            href="/dashboard"
            className="mr-1 text-[15px] font-semibold tracking-[-0.02em] text-foreground"
          >
            {brand}
          </Link>
          <nav className="flex flex-wrap items-center gap-1">
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive(pathname, link.href) ? 'page' : undefined}
                className={cn(
                  'rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
                  isActive(pathname, link.href)
                    ? 'bg-secondary text-foreground'
                    : 'text-muted-foreground hover:bg-secondary/60 hover:text-foreground',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-3">
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
