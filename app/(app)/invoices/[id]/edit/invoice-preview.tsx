'use client'

import { useEffect, useSyncExternalStore } from 'react'
import { PDFViewer } from '@react-pdf/renderer'

import { registerClientFonts } from '@/lib/pdf/fonts/register-client'
import { InvoiceBento } from '@/lib/pdf/templates/bento'
import { InvoiceBentoII } from '@/lib/pdf/templates/bento-ii'
import { InvoiceInverted } from '@/lib/pdf/templates/inverted'
import type { InvoiceLineRow, InvoiceTemplateData } from '@/lib/pdf/types'

const noopSubscribe = () => () => {}

/**
 * PDFViewer renders into an <iframe> via pdf.js, which needs the DOM — this
 * has to stay false through SSR and the first client render (Next still
 * server-renders this client component once) and only flip once we're
 * definitely past hydration. useSyncExternalStore is the correct primitive
 * for that split, rather than a useEffect that calls setState purely to
 * derive a value React already knows: no subscription happens, it's just
 * "true on the client, false during the server snapshot."
 */
function useHasMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  )
}

export function InvoicePreview({
  data,
  rows,
  template,
}: {
  data: InvoiceTemplateData
  rows: InvoiceLineRow[]
  template: string
}) {
  const mounted = useHasMounted()

  // A genuine side effect (registering fonts with the module-level Font
  // registry), not state derivation — registerClientFonts is idempotent,
  // so this firing once on mount is exactly what it's for.
  useEffect(() => {
    registerClientFonts()
  }, [])

  if (!mounted) {
    return (
      <div className="flex h-full min-h-[600px] items-center justify-center bg-secondary text-[14px] text-muted-foreground">
        Loading preview…
      </div>
    )
  }

  // Rendered as a direct conditional among the three known templates,
  // rather than resolving a component reference from a function call
  // (lib/pdf/pick-template.ts's pickTemplate, which the server PDF route
  // uses instead) and rendering *that* — the lint rule this avoids is
  // specifically about a live, reconciling component tree, which the
  // route's one-shot render-to-buffer doesn't have but this mounted
  // PDFViewer does. Keep the fallback (bento/bento-ii named, else
  // Inverted) in sync with pickTemplate's — invoices.template still
  // defaults to the pre-recreation 'minimal'.
  if (template === 'bento') {
    return (
      <PDFViewer width="100%" height="100%" showToolbar={false} style={{ border: 'none' }}>
        <InvoiceBento data={data} rows={rows} />
      </PDFViewer>
    )
  }
  if (template === 'bento-ii') {
    return (
      <PDFViewer width="100%" height="100%" showToolbar={false} style={{ border: 'none' }}>
        <InvoiceBentoII data={data} rows={rows} />
      </PDFViewer>
    )
  }
  return (
    <PDFViewer width="100%" height="100%" showToolbar={false} style={{ border: 'none' }}>
      <InvoiceInverted data={data} rows={rows} />
    </PDFViewer>
  )
}
