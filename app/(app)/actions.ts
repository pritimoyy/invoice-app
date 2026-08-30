'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export async function signOut() {
  const supabase = await createClient()

  // Server actions can write cookies, so this actually clears the session —
  // the same call from a server component would silently no-op.
  await supabase.auth.signOut()

  revalidatePath('/', 'layout')
  redirect('/login')
}
