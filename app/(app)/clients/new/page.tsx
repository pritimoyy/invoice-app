import type { Metadata } from 'next'

import { ClientForm } from '../client-form'

export const metadata: Metadata = {
  title: 'New client',
}

export default function NewClientPage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-12 text-[22px] font-medium tracking-tight text-neutral-900">
        New client
      </h1>

      <ClientForm />
    </div>
  )
}
