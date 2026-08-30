'use client'

import { useActionState } from 'react'

import { login, type LoginState } from './actions'

const initialState: LoginState = { error: null }

const fieldClass =
  'w-full border-b border-neutral-300 bg-transparent pb-2 text-[15px] ' +
  'text-neutral-900 outline-none transition-colors placeholder:text-neutral-400 ' +
  'focus:border-neutral-900 disabled:opacity-50'

const labelClass =
  'block text-[11px] uppercase tracking-[0.12em] text-neutral-500'

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
        <p role="alert" className="text-[13px] text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="mt-1 w-full bg-neutral-900 px-4 py-3 text-[13px] uppercase tracking-[0.12em] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  )
}
