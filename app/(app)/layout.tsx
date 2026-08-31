import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import { AppNav } from './nav'

/**
 * Authoritative auth boundary for the signed-in half of the app.
 *
 * The proxy already redirected anyone without a token, but that check is
 * optimistic — it trusts a locally-verified JWT and never asks the Auth
 * server. This one does: getUser() revalidates against Supabase, so a revoked
 * or tampered token fails here even though it satisfied the proxy.
 *
 * Worth being honest about the limits: a layout runs when its subtree is first
 * rendered, not on every client-side navigation between sibling pages under
 * it. It is a gate, not the security boundary. The security boundary is RLS —
 * every query in this app goes out under the anon key with the user's session,
 * so a page that somehow rendered without a valid user still reads nothing.
 *
 * This is also where the shared chrome lives — one nav bar, rendered once,
 * rather than every page hand-rolling its own header and links.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="min-h-dvh bg-white">
      <AppNav email={user.email} />
      <main className="mx-auto w-full max-w-4xl px-6 py-12">{children}</main>
    </div>
  )
}
