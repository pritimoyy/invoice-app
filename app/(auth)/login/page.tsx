import type { Metadata } from 'next'

import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-white px-6 py-16">
      <div className="w-full max-w-[22rem]">
        <header className="mb-12">
          <h1 className="text-[22px] font-medium tracking-tight text-neutral-900">
            Invoices
          </h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            Sign in to continue.
          </p>
        </header>

        <LoginForm />
      </div>
    </main>
  )
}
