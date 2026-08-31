'use client'

import { useActionState } from 'react'

import { Button } from '@/components/ui/button'

import { login, type LoginState } from './actions'

const initialState: LoginState = { error: null }

const fieldClass =
  'h-11 w-full rounded-xl border border-transparent bg-secondary px-3.5 text-[15px] ' +
  'text-foreground outline-none transition-colors placeholder:text-muted-foreground ' +
  'focus-visible:border-ring focus-visible:bg-surface focus-visible:ring-[3px] ' +
  'focus-visible:ring-ring/40 disabled:opacity-50'

const labelClass =
  'block text-[13px] font-medium text-muted-foreground'

export function LoginForm() {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <form action={formAction} className="flex flex-col gap-7">
      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="email">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="username"
          required
          autoFocus
          disabled={pending}
          className={fieldClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className={labelClass} htmlFor="password">
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          disabled={pending}
          className={fieldClass}
        />
      </div>

      {state.error ? (
        <p role="alert" className="text-[13px] text-destructive">
          {state.error}
        </p>
      ) : null}

      <Button type="submit" disabled={pending} size="lg" className="mt-1 w-full">
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </form>
  )
}
