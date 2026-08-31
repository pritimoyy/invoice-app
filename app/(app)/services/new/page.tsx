import type { Metadata } from 'next'

import { ServiceForm } from '../service-form'

export const metadata: Metadata = {
  title: 'New service',
}

export default function NewServicePage() {
  return (
    <div className="mx-auto w-full max-w-2xl">
      <h1 className="mb-12 text-[22px] font-medium tracking-tight text-neutral-900">
        New service
      </h1>

      <ServiceForm />
    </div>
  )
}
