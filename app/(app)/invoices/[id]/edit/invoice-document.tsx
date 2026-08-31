import { useRef } from 'react'

import { formatPaise } from '@/lib/money'
import type { InvoiceTemplateData } from '@/lib/pdf/types'
import { archivo } from '@/lib/web-fonts'
import { TAX_RATE_OPTIONS, type GstTreatment, type TaxLines } from '@/lib/tax'

/**
 * One editable document, used regardless of which of the three PDF
 * templates the invoice will actually export as (that's the "Template"
 * toolbar select — a separate, later decision about output styling).
 * Editing shouldn't change look depending on that choice; this is its own
 * considered design, not a mirror of any one PDF template, built in the
 * app's own established visual language (neutral palette, sharp corners,
 * underline inputs, uppercase tracked micro-labels — components/invoice/
 * form-field.tsx's language) rather than the templates' dark/bento
 * treatments, with Archivo for the document body to give it its own
 * character against the rest of the app's Geist-based chrome.
 */

export type InitialLineItemLike = {
  description: string
  sacCode: string
  unit: string
  quantity: string
  rate: string
  discount: string
  taxRateBps: number
}

export type EditableLineItem = InitialLineItemLike & { key: string }

export type InvoiceDocumentProps = {
  data: InvoiceTemplateData
  clients: { id: string; name: string }[]
  clientId: string
  onClientChange: (id: string) => void
  issueDate: string
  onIssueDateChange: (v: string) => void
  dueDate: string
  onDueDateChange: (v: string) => void
  currency: string
  gstTreatment: GstTreatment
  items: EditableLineItem[]
  lineSubtotals: number[]
  lineTax: TaxLines[]
  onItemChange: (key: string, patch: Partial<EditableLineItem>) => void
  onItemMove: (key: string, direction: -1 | 1) => void
  onItemRemove: (key: string) => void
  onAddItem: () => void
  services: { id: string; name: string }[]
  onAddFromService: (id: string) => void
  discount: string
  onDiscountChange: (v: string) => void
  onDiscountBlur: (v: string) => void
  notes: string
  onNotesChange: (v: string) => void
  terms: string
  onTermsChange: (v: string) => void
}

// A sentinel, not a real service id — uuids never collide with it, so the
// combined add-item select can tell "start blank" apart from "from the
// rate card" using one <select>'s value alone.
const CUSTOM_ITEM_VALUE = '__custom__'

const microLabel = 'text-[10px] uppercase tracking-[0.14em] text-neutral-400'
const fieldClass =
  'rounded-none border-0 border-b border-neutral-200 bg-transparent p-0 text-inherit outline-none ' +
  'transition-colors placeholder:text-neutral-400 focus-visible:border-neutral-900 ' +
  'disabled:cursor-not-allowed disabled:opacity-50'
// Native number-input spin buttons increment by `step` — visually tiny and
// easy to misclick (this is what put "1.002" in a quantity field: one
// stray click at step=0.001). Quantity still accepts a typed decimal like
// "2.5" for the 2.5-hours case; it just doesn't offer a clicky control
// that makes thousandths look like the expected increment.
const noSpinnerClass =
  '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'

export function InvoiceDocument(props: InvoiceDocumentProps) {
  const {
    data,
    clients,
    clientId,
    onClientChange,
    issueDate,
    onIssueDateChange,
    dueDate,
    onDueDateChange,
    currency,
    gstTreatment,
    items,
    lineSubtotals,
    lineTax,
    onItemChange,
    onItemMove,
    onItemRemove,
    onAddItem,
    services,
    onAddFromService,
    discount,
    onDiscountChange,
    onDiscountBlur,
    notes,
    onNotesChange,
    terms,
    onTermsChange,
  } = props

  // Enter-to-add-a-line works fine, but nothing in the UI says so once the
  // placeholder's hint has been typed over — this button is the discoverable
  // path. Focuses the new blank line so the next keystroke lands there.
  const descRefs = useRef<Record<string, HTMLTextAreaElement | null>>({})
  function addDescLine(key: string, current: string) {
    onItemChange(key, { description: `${current}\n` })
    requestAnimationFrame(() => {
      const el = descRefs.current[key]
      if (!el) return
      el.focus()
      el.selectionStart = el.selectionEnd = el.value.length
    })
  }

  return (
    <div className={`${archivo.className} flex flex-col gap-10 bg-white p-8 text-neutral-900 sm:p-14`}>
      <div className="flex items-end justify-between gap-4 border-b-2 border-neutral-900 pb-5">
        <h1 className="text-[40px] font-extrabold leading-[0.95] tracking-[-0.03em]">
          Invoice
        </h1>
        <p className="text-right text-[13px] font-semibold tabular-nums text-neutral-500">
          {data.invoiceNumber}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <p className={microLabel}>Billed to</p>
          <select
            value={clientId}
            onChange={(e) => onClientChange(e.target.value)}
            className={`${fieldClass} w-full pb-1.5 text-[16px] font-bold tracking-tight`}
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <p className="text-[14px] leading-relaxed text-neutral-500">
            {data.billTo.addressLines.join(', ') || '—'}
            {data.billTo.gstin ? (
              <>
                <br />
                GSTIN {data.billTo.gstin} · {data.billTo.stateLabel}
              </>
            ) : null}
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <p className={microLabel}>Dates</p>
          <p className="text-[14px] leading-relaxed text-neutral-700">
            Issued{' '}
            <input
              type="date"
              value={issueDate}
              onChange={(e) => onIssueDateChange(e.target.value)}
              className={`${fieldClass} inline w-auto pb-0.5`}
            />
            <br />
            Due{' '}
            <input
              type="date"
              value={dueDate}
              onChange={(e) => onDueDateChange(e.target.value)}
              className={`${fieldClass} inline w-auto pb-0.5`}
            />
          </p>
          {data.placeOfSupply ? (
            <p className="text-[13px] text-neutral-500">
              Place of supply {data.placeOfSupply}
            </p>
          ) : null}
        </div>

        <div className="flex flex-col gap-1.5">
          <p className={microLabel}>From</p>
          <p className="text-[16px] font-bold tracking-tight">{data.supplier.name || '—'}</p>
          <p className="text-[14px] leading-relaxed text-neutral-500">
            {data.supplier.addressLines.join(', ') || '—'}
            {data.supplier.gstin ? (
              <>
                <br />
                GSTIN {data.supplier.gstin}
              </>
            ) : null}
            {data.supplier.pan ? (
              <>
                <br />
                PAN {data.supplier.pan}
              </>
            ) : null}
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-neutral-200 pt-6">
        <div className={`flex gap-3 border-b-2 border-neutral-900 pb-3 ${microLabel}`}>
          <div className="w-6">#</div>
          <div className="flex-1">
            Description
            <span className="ml-2 font-normal normal-case tracking-normal text-neutral-400">
              — Enter for each video title
            </span>
          </div>
          <div className="w-16 text-right">Qty</div>
          <div className="w-28 text-right">Rate</div>
          <div className="w-32 text-right">Amount</div>
          <div className="w-24" />
        </div>
        {items.map((item, i) => {
          const tax = lineTax[i]
          const taxPaise = tax ? tax.cgstPaise + tax.sgstPaise + tax.igstPaise : 0
          const descLineCount = item.description.split('\n').length
          return (
            <div
              key={item.key}
              className="flex items-start gap-3 border-b border-neutral-100 pb-4 text-[14px]"
            >
              <div className="w-6 pt-1 tabular-nums text-neutral-400">
                {String(i + 1).padStart(2, '0')}
              </div>
              <div className="flex flex-1 flex-col gap-1">
                <textarea
                  ref={(el) => {
                    descRefs.current[item.key] = el
                  }}
                  value={item.description}
                  onChange={(e) => onItemChange(item.key, { description: e.target.value })}
                  placeholder={'Long Form Edit\nVideo title one\nVideo title two'}
                  rows={Math.max(1, descLineCount)}
                  className={`${fieldClass} w-full resize-none pb-1 leading-relaxed`}
                />
                <button
                  type="button"
                  onClick={() => addDescLine(item.key, item.description)}
                  className="self-start text-[10px] uppercase tracking-[0.08em] text-neutral-400 hover:text-neutral-900 hover:underline disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:no-underline disabled:hover:text-neutral-400"
                >
                  + Video title
                </button>
              </div>
              <input
                type="number"
                step="1"
                min="0"
                value={item.quantity}
                onChange={(e) => onItemChange(item.key, { quantity: e.target.value })}
                className={`${fieldClass} ${noSpinnerClass} w-16 pb-1 text-right tabular-nums`}
              />
              <input
                value={item.rate}
                onChange={(e) => onItemChange(item.key, { rate: e.target.value })}
                onBlur={(e) => {
                  const n = Number(e.target.value)
                  if (!Number.isNaN(n)) onItemChange(item.key, { rate: n.toFixed(2) })
                }}
                placeholder="0.00"
                className={`${fieldClass} w-28 pb-1 text-right tabular-nums`}
              />
              <div className="w-32 pt-0.5 text-right font-semibold tabular-nums">
                {formatPaise(lineSubtotals[i] ?? 0, { showPaise: false, currency })}
                {taxPaise > 0 ? (
                  <div className="text-[10px] font-normal text-neutral-400">
                    +{formatPaise(taxPaise, { showPaise: false, currency })} tax
                  </div>
                ) : null}
              </div>
              <div className="flex w-24 items-center justify-end gap-1.5 pt-0.5 text-neutral-400">
                <select
                  value={item.taxRateBps}
                  onChange={(e) => onItemChange(item.key, { taxRateBps: Number(e.target.value) })}
                  className={`${fieldClass} w-10 pb-1 text-[10px]`}
                >
                  {TAX_RATE_OPTIONS.map((r) => (
                    <option key={r.bps} value={r.bps}>
                      {r.label}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => onItemMove(item.key, -1)}
                  disabled={i === 0}
                  className="hover:text-neutral-900 disabled:opacity-30"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => onItemMove(item.key, 1)}
                  disabled={i === items.length - 1}
                  className="hover:text-neutral-900 disabled:opacity-30"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => onItemRemove(item.key)}
                  disabled={items.length === 1}
                  className="hover:text-red-700 disabled:opacity-30"
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <select
          value=""
          onChange={(e) => {
            if (!e.target.value) return
            if (e.target.value === CUSTOM_ITEM_VALUE) {
              onAddItem()
            } else {
              onAddFromService(e.target.value)
            }
          }}
          className={`${fieldClass} w-auto max-w-[260px] pb-1 text-[11px] uppercase tracking-[0.1em] text-neutral-500`}
        >
          <option value="">+ Add line item…</option>
          <option value={CUSTOM_ITEM_VALUE}>+ New custom item</option>
          {services.length > 0 ? (
            <optgroup label="From rate card">
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </optgroup>
          ) : null}
        </select>
      </div>

      <div className="flex flex-col gap-5 border-t border-neutral-200 pt-6 sm:flex-row sm:items-end">
        <div className="flex-1">
          <p className={microLabel}>Total in words</p>
          <p className="text-[15px] font-semibold leading-snug">{data.totals.words || '—'}</p>
        </div>
        <div className="w-full text-[14px] sm:w-80">
          <div className="flex justify-between py-1.5">
            <span className="text-neutral-500">Subtotal — {data.totals.items}</span>
            <span className="tabular-nums">{data.totals.subtotal}</span>
          </div>
          <div className="flex items-center justify-between gap-2 py-1.5">
            <label className="text-neutral-500">Discount</label>
            <input
              value={discount}
              onChange={(e) => onDiscountChange(e.target.value)}
              onBlur={(e) => onDiscountBlur(e.target.value)}
              className={`${fieldClass} w-28 pb-0.5 text-right tabular-nums`}
            />
          </div>
          {gstTreatment === 'intra_state' && (
            <>
              <div className="flex justify-between py-1.5">
                <span className="text-neutral-500">CGST</span>
                <span className="tabular-nums">{data.totals.cgst}</span>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-neutral-500">SGST</span>
                <span className="tabular-nums">{data.totals.sgst}</span>
              </div>
            </>
          )}
          {gstTreatment === 'inter_state' && (
            <div className="flex justify-between py-1.5">
              <span className="text-neutral-500">IGST</span>
              <span className="tabular-nums">{data.totals.igst}</span>
            </div>
          )}
          <div className="flex justify-between py-1.5">
            <span className="text-neutral-500">Round off</span>
            <span className="tabular-nums">{data.totals.roundOff}</span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between border-t-2 border-neutral-900 pt-2.5">
            <span className="text-[15px] font-bold">Total</span>
            <span className="text-[22px] font-extrabold tabular-nums">{data.totals.total}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8 border-t border-neutral-200 pt-6 sm:grid-cols-2">
        <div>
          <p className={microLabel}>Payment</p>
          <p className="mt-1.5 text-[14px] leading-relaxed text-neutral-500">
            {data.payment.upiId || '—'}
            {data.payment.bankName ? (
              <>
                <br />
                {data.payment.bankName}
              </>
            ) : null}
            {data.payment.accountNo ? (
              <>
                <br />
                A/C {data.payment.accountNo} · IFSC {data.payment.ifsc}
              </>
            ) : null}
          </p>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className={microLabel} htmlFor="doc-notes">
            Notes
          </label>
          <textarea
            id="doc-notes"
            rows={2}
            value={notes}
            onChange={(e) => onNotesChange(e.target.value)}
            placeholder="—"
            className={`${fieldClass} w-full resize-y pb-1 text-[14px] leading-relaxed text-neutral-700`}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 border-t border-neutral-200 pt-6">
        <label className={microLabel} htmlFor="doc-terms">
          Terms
        </label>
        <textarea
          id="doc-terms"
          rows={2}
          value={terms}
          onChange={(e) => onTermsChange(e.target.value)}
          placeholder={data.payment.termsLabel}
          className={`${fieldClass} w-full resize-y pb-1 text-[14px] leading-relaxed text-neutral-700`}
        />
        <p className="text-[11px] text-neutral-400">
          Printed on the invoice if set, otherwise defaults to your standard terms.
        </p>
      </div>
    </div>
  )
}
