import type { Metadata } from 'next'

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
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-8 text-[28px] font-semibold tracking-[-0.02em] text-foreground">
        Settings
      </h1>

      <SettingsForm profile={profile} logoUrl={logoUrl} />
    </div>
  )
}
