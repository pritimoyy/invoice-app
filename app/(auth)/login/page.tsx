import type { Metadata } from 'next'

import { LoginForm } from './login-form'

export const metadata: Metadata = {
  title: 'Sign in',
}

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-6 py-16">
      <div className="app-card w-full max-w-[24rem] p-8">
        <header className="mb-8">
          <h1 className="text-[28px] font-semibold tracking-[-0.02em] text-foreground">
            Invoices
          </h1>
          <p className="mt-1 text-[14px] text-muted-foreground">
            Sign in to continue.
          </p>
        </header>

        <LoginForm />
      </div>
    </main>
  )
}
