'use client'

import { useEffect, useMemo, useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { buildInvoiceData } from '@/lib/pdf/build-invoice-data'
import { TEMPLATE_OPTIONS } from '@/lib/pdf/pick-template'
import {
  computeInvoiceTax,
  type GstTreatment,
  type InvoiceTaxLine,
} from '@/lib/tax'
import {
  computeLineSubtotal,
  computeLineTotal,
  paiseToEditableString,
  parseRupeesToPaise,
  roundToNearestRupee,
} from '@/lib/money'

import type { InvoiceStatus } from '@/lib/numbering'

import { saveDraftInvoice, sendInvoice, type DraftLineItemInput } from '../../actions'
import { InvoiceDocument, type EditableLineItem, type InitialLineItemLike } from './invoice-document'
import { InvoicePreview } from './invoice-preview'

type ClientDetail = {
  id: string
  name: string
  address_line1: string | null
  address_line2: string | null
  city: string | null
  postal_code: string | null
  gstin: string | null
  state: string | null
  state_code: string | null
  country: string
}

type ProfileDetail = {
  legalName: string
  tradeName: string
  addressLine1: string
  addressLine2: string
  city: string
  postalCode: string
  gstin: string
  pan: string
  bankName: string
  bankAccountNo: string
  bankIfsc: string
  upiId: string
  defaultTermsDays: number
  hasLut: boolean
}

type ServiceOption = {
  id: string
  name: string
  unit: string | null
  default_rate_paise: number
  sac_code: string | null
  tax_rate_bps: number
}

const TREATMENT_OPTIONS: { value: GstTreatment; label: string }[] = [
  { value: 'unregistered', label: 'Not registered — no tax' },
  { value: 'intra_state', label: 'Same state — CGST + SGST' },
  { value: 'inter_state', label: 'Different state — IGST' },
  { value: 'export', label: 'Export — zero-rated (LUT)' },
]

const CURRENCY_OPTIONS = ['INR', 'USD', 'EUR', 'GBP']

const PREVIEW_DEBOUNCE_MS = 500

/**
 * An exchange rate is a rate, not money — the one numeric in this app that
 * is legitimately not paise (CLAUDE.md), so it is parsed as a plain float
 * rather than through lib/money.ts. Blank or nonsense means "not recorded"
 * rather than zero, which would read as a real rate of zero.
 */
function parseExchangeRate(input: string): number | null {
  const trimmed = input.trim()
  if (trimmed === '') return null
  const value = Number(trimmed)
  return Number.isFinite(value) && value > 0 ? value : null
}

const toolbarFieldClass =
  'h-10 rounded-xl border border-transparent bg-secondary px-3 text-[14px] ' +
  'text-foreground outline-none transition-colors focus-visible:border-ring ' +
  'focus-visible:ring-[3px] focus-visible:ring-ring/40 ' +
  'disabled:cursor-not-allowed disabled:opacity-50'

const toolbarLabelClass = 'text-[13px] font-medium text-muted-foreground'

function newLineItem(defaultSacCode: string, defaultTaxRateBps: number): EditableLineItem {
  return {
    key: crypto.randomUUID(),
    description: '',
    sacCode: defaultSacCode,
    unit: '',
    quantity: '1',
    rate: '0.00',
    discount: '0.00',
    taxRateBps: defaultTaxRateBps,
  }
}

function lineItemFromService(service: ServiceOption): EditableLineItem {
  return {
    key: crypto.randomUUID(),
    description: service.name,
    sacCode: service.sac_code ?? '',
    unit: service.unit ?? '',
    quantity: '1',
    rate: paiseToEditableString(service.default_rate_paise),
    discount: '0.00',
    taxRateBps: service.tax_rate_bps,
  }
}

export function InvoiceEditor({
  invoiceId,
  clients,
  services,
  profile,
  defaultSacCode,
  initial,
}: {
  invoiceId: string
  clients: ClientDetail[]
  services: ServiceOption[]
  profile: ProfileDetail
  defaultSacCode: string
  initial: {
    invoiceNumber: string
    status: InvoiceStatus
    clientId: string
    issueDate: string
    dueDate: string
    gstTreatment: GstTreatment
    currency: string
    template: string
    discount: string
    notes: string
    terms: string
    reverseCharge: boolean
    exchangeRate: string
    internalMemo: string
    items: InitialLineItemLike[]
  }
}) {
  const [clientId, setClientId] = useState(initial.clientId)
  const [issueDate, setIssueDate] = useState(initial.issueDate)
  const [dueDate, setDueDate] = useState(initial.dueDate)
  const [gstTreatment, setGstTreatment] = useState<GstTreatment>(initial.gstTreatment)
  const [currency, setCurrency] = useState(initial.currency)
  const [template, setTemplate] = useState(initial.template)
  const [discount, setDiscount] = useState(initial.discount)
  const [notes, setNotes] = useState(initial.notes)
  const [terms, setTerms] = useState(initial.terms)
  const [reverseCharge, setReverseCharge] = useState(initial.reverseCharge)
  const [exchangeRate, setExchangeRate] = useState(initial.exchangeRate)
  const [internalMemo, setInternalMemo] = useState(initial.internalMemo)
  const [view, setView] = useState<'edit' | 'pdf'>('edit')
  const [items, setItems] = useState<EditableLineItem[]>(() =>
    initial.items.length > 0
      ? initial.items.map((item) => ({ ...item, key: crypto.randomUUID() }))
      : [newLineItem(defaultSacCode, gstTreatment === 'unregistered' || gstTreatment === 'export' ? 0 : 1800)],
  )

  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [pending, startTransition] = useTransition()
  const [sendPending, startSendTransition] = useTransition()

  // Read directly off the prop, not copied into state: once sendInvoice
  // flips the row server-side, revalidatePath refreshes this prop and the
  // form locks itself without needing a manual refetch.
  const locked = initial.status !== 'draft'

  const defaultRateBps =
    gstTreatment === 'unregistered' || gstTreatment === 'export' ? 0 : 1800

  function handleClientChange(id: string) {
    setClientId(id)
    setSaved(false)
  }

  function handleIssueDateChange(v: string) {
    setIssueDate(v)
    setSaved(false)
  }

  function handleDueDateChange(v: string) {
    setDueDate(v)
    setSaved(false)
  }

  function handleDiscountChange(v: string) {
    setDiscount(v)
    setSaved(false)
  }

  function handleDiscountBlur(v: string) {
    const parsed = parseRupeesToPaise(v)
    if (parsed !== null) setDiscount((parsed / 100).toFixed(2))
  }

  function handleNotesChange(v: string) {
    setNotes(v)
    setSaved(false)
  }

  function handleTermsChange(v: string) {
    setTerms(v)
    setSaved(false)
  }

  function handleReverseChargeChange(v: boolean) {
    setReverseCharge(v)
    setSaved(false)
  }

  function handleExchangeRateChange(v: string) {
    setExchangeRate(v)
    setSaved(false)
  }

  function handleInternalMemoChange(v: string) {
    setInternalMemo(v)
    setSaved(false)
  }

  function updateItem(key: string, patch: Partial<EditableLineItem>) {
    setSaved(false)
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    )
  }

  function addItem() {
    setSaved(false)
    setItems((prev) => [...prev, newLineItem(defaultSacCode, defaultRateBps)])
  }

  function addItemFromService(serviceId: string) {
    const service = services.find((s) => s.id === serviceId)
    if (!service) return
    setSaved(false)
    setItems((prev) => [...prev, lineItemFromService(service)])
  }

  function removeItem(key: string) {
    setSaved(false)
    setItems((prev) => (prev.length > 1 ? prev.filter((i) => i.key !== key) : prev))
  }

  function moveItem(key: string, direction: -1 | 1) {
    setSaved(false)
    setItems((prev) => {
      const index = prev.findIndex((i) => i.key === key)
      const target = index + direction
      if (index === -1 || target < 0 || target >= prev.length) return prev
      const next = [...prev]
      ;[next[index], next[target]] = [next[target], next[index]]
      return next
    })
  }

  // The exact same computation the save action performs server-side —
  // importing the same lib/money.ts and lib/tax.ts functions here means
  // this editor can never drift from what actually gets stored.
  const totals = useMemo(() => {
    const discountPaise = parseRupeesToPaise(discount) ?? 0
    const lineSubtotals = items.map((item) => {
      const quantity = Number(item.quantity) || 0
      const ratePaise = parseRupeesToPaise(item.rate) ?? 0
      const discPaise = parseRupeesToPaise(item.discount) ?? 0
      const subtotal = computeLineSubtotal(quantity, ratePaise)
      return computeLineTotal(subtotal, discPaise)
    })

    const taxLines: InvoiceTaxLine[] = items.map((item, i) => ({
      netPaise: lineSubtotals[i],
      rateBps: item.taxRateBps,
    }))
    const taxResult = computeInvoiceTax(taxLines, discountPaise, gstTreatment)

    const subtotalPaise = lineSubtotals.reduce((s, v) => s + v, 0)
    const preRound =
      subtotalPaise -
      discountPaise +
      taxResult.totals.cgstPaise +
      taxResult.totals.sgstPaise +
      taxResult.totals.igstPaise
    const { totalPaise, roundOffPaise } = roundToNearestRupee(preRound)

    return {
      lineSubtotals,
      lineTax: taxResult.lineTax,
      subtotalPaise,
      discountPaise,
      cgstPaise: taxResult.totals.cgstPaise,
      sgstPaise: taxResult.totals.sgstPaise,
      igstPaise: taxResult.totals.igstPaise,
      roundOffPaise,
      totalPaise,
    }
  }, [items, discount, gstTreatment])

  // Same shared builder the PDF route uses (lib/pdf/build-invoice-data.ts)
  // — the saved PDF, the "Preview PDF" tab, and the editable document's
  // read-only fields (supplier block, totals-as-strings) all format money,
  // dates, and the words line identically because they're the same
  // function, not three copies of the same logic drifting apart.
  const selectedClient = clients.find((c) => c.id === clientId)
  const liveData = useMemo(() => {
    const supplierAddressLines = [
      profile.addressLine1,
      profile.addressLine2,
      [profile.city, profile.postalCode].filter(Boolean).join(' '),
    ].filter(Boolean)

    return buildInvoiceData({
      invoiceNumber: initial.invoiceNumber,
      issueDate: issueDate || null,
      dueDate: dueDate || null,
      placeOfSupply: selectedClient?.state ?? '',
      gstTreatment,
      currency,
      notes,
      hasLut: profile.hasLut,
      reverseCharge,
      exchangeRate: parseExchangeRate(exchangeRate),
      supplier: {
        name: profile.tradeName || profile.legalName,
        addressLines: supplierAddressLines,
        gstin: profile.gstin,
        pan: profile.pan,
      },
      billTo: {
        name: selectedClient?.name ?? '',
        addressLines: selectedClient
          ? [
              selectedClient.address_line1,
              selectedClient.address_line2,
              [selectedClient.city, selectedClient.postal_code]
                .filter(Boolean)
                .join(' '),
            ].filter((l): l is string => Boolean(l))
          : [],
        gstin: selectedClient?.gstin ?? '',
        state: selectedClient?.state ?? '',
        stateCode: selectedClient?.state_code ?? '',
        country: selectedClient?.country ?? 'IN',
      },
      payment: {
        bankName: profile.bankName,
        accountNo: profile.bankAccountNo,
        ifsc: profile.bankIfsc,
        upiId: profile.upiId,
        termsLabel: terms || `${profile.defaultTermsDays} days from issue date`,
      },
      items: items.map((item, i) => ({
        description: item.description || 'Untitled line item',
        sacCode: item.sacCode,
        unit: item.unit,
        quantity: item.quantity,
        unitPricePaise: parseRupeesToPaise(item.rate) ?? 0,
        lineTotalPaise: totals.lineSubtotals[i] ?? 0,
      })),
      totals: {
        subtotalPaise: totals.subtotalPaise,
        discountPaise: totals.discountPaise,
        cgstPaise: totals.cgstPaise,
        sgstPaise: totals.sgstPaise,
        igstPaise: totals.igstPaise,
        roundOffPaise: totals.roundOffPaise,
        totalPaise: totals.totalPaise,
      },
    })
  }, [
    initial.invoiceNumber,
    profile,
    selectedClient,
    gstTreatment,
    currency,
    notes,
    reverseCharge,
    exchangeRate,
    issueDate,
    dueDate,
    terms,
    items,
    totals,
  ])

  // Only the heavy PDFViewer tab needs debouncing — the editable document's
  // own fields bind directly to live state and are cheap to re-render.
  const [debouncedData, setDebouncedData] = useState(liveData)
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedData(liveData), PREVIEW_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [liveData])

  // Shared by Save and Send — Send always saves the current on-screen state
  // first (see handleSend), so both need the exact same validation and
  // payload shape rather than two copies that could drift apart.
  function validate(): { error: string } | { items: DraftLineItemInput[]; discountPaise: number } {
    for (const [i, item] of items.entries()) {
      // Only the first line (the item name) is required — the rest are
      // optional bullet sub-items (video titles), per invoice-document.tsx.
      const headline = item.description.split('\n')[0]?.trim()
      if (!headline) {
        return { error: `Line item ${i + 1} needs a description.` }
      }
      if (parseRupeesToPaise(item.rate) === null) {
        return { error: `Line item ${i + 1} ("${headline}") has an invalid rate.` }
      }
      if (parseRupeesToPaise(item.discount) === null) {
        return { error: `Line item ${i + 1} ("${headline}") has an invalid discount.` }
      }
    }
    const discountPaise = parseRupeesToPaise(discount)
    if (discountPaise === null) {
      return { error: 'The invoice discount is invalid.' }
    }
    if (!clientId) {
      return { error: 'Pick a client.' }
    }
    return {
      discountPaise,
      items: items.map((item) => ({
        description: item.description,
        sacCode: item.sacCode,
        unit: item.unit,
        quantity: Number(item.quantity) || 0,
        unitPricePaise: parseRupeesToPaise(item.rate) ?? 0,
        discountPaise: parseRupeesToPaise(item.discount) ?? 0,
        taxRateBps: item.taxRateBps,
      })),
    }
  }

  function handleSave() {
    setError(null)
    setSaved(false)

    const result = validate()
    if ('error' in result) {
      setError(result.error)
      return
    }

    startTransition(async () => {
      const saveResult = await saveDraftInvoice(invoiceId, {
        clientId,
        issueDate,
        dueDate: dueDate || null,
        gstTreatment,
        currency,
        template,
        discountPaise: result.discountPaise,
        notes,
        terms,
        reverseCharge,
        exchangeRate: parseExchangeRate(exchangeRate),
        internalMemo,
        items: result.items,
      })
      if (saveResult.error) {
        setError(saveResult.error)
      } else {
        setSaved(true)
      }
    })
  }

  // Sending reads the invoice back out of the database, so it must never
  // run against stale data — save the current on-screen state first, and
  // only proceed to sendInvoice if that succeeds.
  function handleSend() {
    setError(null)

    const result = validate()
    if ('error' in result) {
      setError(result.error)
      return
    }
    if (
      !confirm(
        'Send this invoice? This assigns the official invoice number and locks it from further edits.',
      )
    ) {
      return
    }

    startSendTransition(async () => {
      const saveResult = await saveDraftInvoice(invoiceId, {
        clientId,
        issueDate,
        dueDate: dueDate || null,
        gstTreatment,
        currency,
        template,
        discountPaise: result.discountPaise,
        notes,
        terms,
        reverseCharge,
        exchangeRate: parseExchangeRate(exchangeRate),
        internalMemo,
        items: result.items,
      })
      if (saveResult.error) {
        setError(saveResult.error)
        return
      }
      setSaved(true)

      const sendResult = await sendInvoice(invoiceId)
      if (sendResult.error) {
        setError(sendResult.error)
      }
    })
  }

  const documentProps = {
    data: liveData.data,
    clients,
    clientId,
    onClientChange: handleClientChange,
    issueDate,
    onIssueDateChange: handleIssueDateChange,
    dueDate,
    onDueDateChange: handleDueDateChange,
    currency,
    gstTreatment,
    items,
    lineSubtotals: totals.lineSubtotals,
    lineTax: totals.lineTax,
    onItemChange: updateItem,
    onItemMove: moveItem,
    onItemRemove: removeItem,
    onAddItem: addItem,
    services,
    onAddFromService: addItemFromService,
    discount,
    onDiscountChange: handleDiscountChange,
    onDiscountBlur: handleDiscountBlur,
    notes,
    onNotesChange: handleNotesChange,
    terms,
    onTermsChange: handleTermsChange,
    hasLut: profile.hasLut,
    reverseCharge,
    onReverseChargeChange: handleReverseChargeChange,
    exchangeRate,
    onExchangeRateChange: handleExchangeRateChange,
    internalMemo,
    onInternalMemoChange: handleInternalMemoChange,
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="app-card flex flex-wrap items-end justify-between gap-x-8 gap-y-4 p-4 sm:p-5">
        <fieldset disabled={locked} className="contents">
          <div className="flex flex-wrap gap-x-8 gap-y-4">
            <div className="flex flex-col gap-2">
              <label className={toolbarLabelClass} htmlFor="treatment">
                Tax treatment
              </label>
              <select
                id="treatment"
                value={gstTreatment}
                onChange={(e) => {
                  setGstTreatment(e.target.value as GstTreatment)
                  setSaved(false)
                }}
                className={`${toolbarFieldClass} w-56`}
              >
                {TREATMENT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className={toolbarLabelClass} htmlFor="currency">
                Currency
              </label>
              <select
                id="currency"
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value)
                  setSaved(false)
                }}
                className={`${toolbarFieldClass} w-24`}
              >
                {CURRENCY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-2">
              <label className={toolbarLabelClass} htmlFor="template">
                Template
              </label>
              <select
                id="template"
                value={template}
                onChange={(e) => {
                  setTemplate(e.target.value)
                  setSaved(false)
                }}
                className={`${toolbarFieldClass} w-36`}
              >
                {TEMPLATE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </fieldset>

        <div className="flex gap-0.5 rounded-full bg-secondary p-0.5">
          <button
            type="button"
            onClick={() => setView('edit')}
            className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
              view === 'edit'
                ? 'bg-surface text-foreground shadow-[var(--elevation-1)]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => setView('pdf')}
            className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
              view === 'pdf'
                ? 'bg-surface text-foreground shadow-[var(--elevation-1)]'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Preview PDF
          </button>
        </div>
      </div>

      <div className="app-card mx-auto w-full max-w-4xl overflow-hidden">
        {view === 'edit' ? (
          <fieldset disabled={locked} className="contents">
            <InvoiceDocument {...documentProps} />
          </fieldset>
        ) : (
          <div className="aspect-[210/297] w-full bg-secondary">
            <InvoicePreview
              data={debouncedData.data}
              rows={debouncedData.rows}
              template={template}
            />
          </div>
        )}
      </div>

      <div className="mx-auto flex w-full max-w-4xl flex-wrap items-center gap-4">
        {locked ? (
          <p className="text-[13px] text-muted-foreground">
            Sent — this invoice is locked from further edits.
          </p>
        ) : (
          <>
            <Button
              type="button"
              disabled={pending || sendPending}
              onClick={handleSave}
              size="lg"
            >
              {pending ? 'Saving…' : 'Save draft'}
            </Button>
            <Button
              type="button"
              disabled={pending || sendPending}
              onClick={handleSend}
              size="lg" variant="outline"
            >
              {sendPending ? 'Sending…' : 'Send invoice'}
            </Button>
          </>
        )}
        {error ? (
          <p role="alert" className="text-[13px] text-destructive">
            {error}
          </p>
        ) : null}
        {saved && !error && !locked ? (
          <p role="status" className="text-[13px] text-muted-foreground">
            Saved.
          </p>
        ) : null}
      </div>
    </div>
  )
}
