import type { Metadata } from 'next'

import { ClientForm } from '../client-form'

export const metadata: Metadata = {
  title: 'New client',
}

export default function NewClientPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-8 text-[28px] font-semibold tracking-[-0.02em] text-foreground">
        New client
      </h1>

      <ClientForm />
    </div>
  )
}
