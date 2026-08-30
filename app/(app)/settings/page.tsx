import type { Metadata } from 'next'
import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'

import { SettingsForm } from './settings-form'

export const metadata: Metadata = {
  title: 'Settings',
}

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // maybeSingle, not single: there is no profiles row until the first save,
  // and a missing row is an empty form rather than an error.
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user!.id)
    .maybeSingle()

  // The branding bucket is private, so the logo is only reachable through a
  // short-lived signed URL minted here on the server.
  let logoUrl: string | null = null
  if (profile?.logo_path) {
    const { data } = await supabase.storage
      .from('branding')
      .createSignedUrl(profile.logo_path, 60 * 60)
    logoUrl = data?.signedUrl ?? null
  }

  return (
    <main className="min-h-dvh bg-white px-6 py-16">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-12 flex items-baseline justify-between gap-4">
          <h1 className="text-[22px] font-medium tracking-tight text-neutral-900">
            Settings
          </h1>
          <Link
            href="/dashboard"
            className="text-[11px] uppercase tracking-[0.12em] text-neutral-500 underline-offset-4 hover:text-neutral-900 hover:underline"
          >
            Dashboard
          </Link>
        </header>

        <SettingsForm profile={profile} logoUrl={logoUrl} />
      </div>
    </main>
  )
}
