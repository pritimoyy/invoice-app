'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

export type LoginState = {
  error: string | null
}

export async function login(
  _prevState: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const email = String(formData.get('email') ?? '').trim()
  const password = String(formData.get('password') ?? '')

  if (!email || !password) {
    return { error: 'Enter your email and password.' }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    // Deliberately vague: never confirm whether an address has an account.
    return { error: 'That email and password did not match.' }
  }

  // The layout renders per-session data, so drop the cached anonymous version.
  revalidatePath('/', 'layout')

  // redirect() throws internally — it must stay outside any try/catch.
  redirect('/dashboard')
}
