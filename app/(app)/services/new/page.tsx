import type { Metadata } from 'next'

import { ServiceForm } from '../service-form'

export const metadata: Metadata = {
  title: 'New service',
}

export default function NewServicePage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-8 text-[28px] font-semibold tracking-[-0.02em] text-foreground">
        New service
      </h1>

      <ServiceForm />
    </div>
  )
}
