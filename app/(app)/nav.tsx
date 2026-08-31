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
  { href: '/invoices', label: 'Invoices' },
  { href: '/settings', label: 'Settings' },
]

function isActive(pathname: string, href: string) {
  return href === '/dashboard' ? pathname === href : pathname.startsWith(href)
}

export function AppNav({ email }: { email: string | undefined }) {
  const pathname = usePathname()

  return (
    <header className="border-b border-neutral-200 bg-white">
      <div className="mx-auto flex h-14 w-full max-w-4xl items-center justify-between gap-6 px-6">
        <nav className="flex items-center gap-6">
          <Link
            href="/dashboard"
            className="text-[14px] font-medium tracking-tight text-neutral-900"
          >
            Invoices
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
            <span className="hidden text-[12px] text-neutral-400 sm:inline">
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
