'use client'

import { useState, useTransition } from 'react'

import { Button } from '@/components/ui/button'
import { formatPaise, parseRupeesToPaise } from '@/lib/money'

import { deletePayment, recordPayment, type PaymentMethod } from './payment-actions'

export type PaymentRow = {
  id: string
  amount_paise: number
  paid_on: string
  method: PaymentMethod
  reference: string | null
  tds_paise: number
}

const METHOD_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'upi', label: 'UPI' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'razorpay', label: 'Razorpay' },
  { value: 'cash', label: 'Cash' },
  { value: 'cheque', label: 'Cheque' },
  { value: 'other', label: 'Other' },
]

const fieldLabel = 'text-[10px] uppercase tracking-[0.1em] text-neutral-400'
const fieldInput =
  'rounded-none border-0 border-b border-neutral-300 bg-transparent py-1.5 text-[13px] ' +
  'text-neutral-900 outline-none transition-colors focus-visible:border-neutral-900'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function PaymentsSection({
  invoiceId,
  currency,
  paidPaise,
  balancePaise,
  isOverdue,
  payments,
}: {
  invoiceId: string
  currency: string
  paidPaise: number
  balancePaise: number
  isOverdue: boolean
  payments: PaymentRow[]
}) {
  const [amount, setAmount] = useState('')
  const [paidOn, setPaidOn] = useState(todayIso)
  const [method, setMethod] = useState<PaymentMethod>('upi')
  const [reference, setReference] = useState('')
  const [tds, setTds] = useState('0.00')
  const [fees, setFees] = useState('0.00')
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()

  function resetForm() {
    setAmount('')
    setPaidOn(todayIso())
    setMethod('upi')
    setReference('')
    setTds('0.00')
    setFees('0.00')
  }

  function handleAdd() {
    setError(null)
    const amountPaise = parseRupeesToPaise(amount)
    const tdsPaise = parseRupeesToPaise(tds)
    const feesPaise = parseRupeesToPaise(fees)
    if (amountPaise === null || amountPaise <= 0) {
      setError('Enter a valid payment amount.')
      return
    }
    if (tdsPaise === null || feesPaise === null) {
      setError('TDS and fees must be valid amounts.')
      return
    }

    startTransition(async () => {
      const result = await recordPayment(invoiceId, {
        amountPaise,
        paidOn,
        method,
        reference,
        tdsPaise,
        feesPaise,
      })
      if (result.error) {
        setError(result.error)
      } else {
        resetForm()
      }
    })
  }

  function handleDelete(paymentId: string) {
    if (!confirm('Delete this payment record?')) return
    startTransition(() => deletePayment(paymentId, invoiceId))
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 border-t border-neutral-200 pt-8">
      <div className="flex flex-wrap items-baseline justify-between gap-4">
        <h2 className="text-[15px] font-medium tracking-tight text-neutral-900">Payments</h2>
        <div className="flex items-baseline gap-6 text-[13px]">
          <span className="text-neutral-500">
            Paid <span className="font-semibold tabular-nums text-neutral-900">{formatPaise(paidPaise, { currency })}</span>
          </span>
          <span className="text-neutral-500">
            Balance{' '}
            <span
              className={`font-semibold tabular-nums ${balancePaise > 0 ? 'text-neutral-900' : 'text-emerald-700'}`}
            >
              {formatPaise(balancePaise, { currency })}
            </span>
          </span>
          {isOverdue ? (
            <span className="text-[11px] uppercase tracking-[0.1em] text-red-700">Overdue</span>
          ) : null}
        </div>
      </div>

      {payments.length > 0 ? (
        <div className="flex flex-col">
          {payments.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-4 border-b border-neutral-100 py-2.5 text-[13px]"
            >
              <span className="w-24 text-neutral-500">{p.paid_on}</span>
              <span className="w-28 font-medium tabular-nums text-neutral-900">
                {formatPaise(p.amount_paise, { currency })}
              </span>
              <span className="w-32 text-neutral-500">
                {METHOD_OPTIONS.find((m) => m.value === p.method)?.label ?? p.method}
              </span>
              <span className="flex-1 text-neutral-500">{p.reference || '—'}</span>
              {p.tds_paise > 0 ? (
                <span className="text-[12px] text-neutral-400">
                  TDS {formatPaise(p.tds_paise, { currency })}
                </span>
              ) : null}
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                disabled={pending}
                className="text-neutral-400 hover:text-red-700 disabled:opacity-30"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-[13px] text-neutral-500">No payments recorded yet.</p>
      )}

      <div className="flex flex-wrap items-end gap-4 border-t border-neutral-200 pt-5">
        <div className="flex flex-col gap-1">
          <label className={fieldLabel}>Amount</label>
          <input
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="0.00"
            className={`${fieldInput} w-28`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={fieldLabel}>Date</label>
          <input
            type="date"
            value={paidOn}
            onChange={(e) => setPaidOn(e.target.value)}
            className={`${fieldInput} w-36`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={fieldLabel}>Method</label>
          <select
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className={`${fieldInput} w-36`}
          >
            {METHOD_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className={fieldLabel}>Reference</label>
          <input
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="UTR / txn id"
            className={`${fieldInput} w-36`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={fieldLabel}>TDS</label>
          <input
            value={tds}
            onChange={(e) => setTds(e.target.value)}
            placeholder="0.00"
            className={`${fieldInput} w-20`}
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className={fieldLabel}>Fees</label>
          <input
            value={fees}
            onChange={(e) => setFees(e.target.value)}
            placeholder="0.00"
            className={`${fieldInput} w-20`}
          />
        </div>
        <Button
          type="button"
          disabled={pending}
          onClick={handleAdd}
          className="h-auto rounded-none bg-neutral-900 px-5 py-2.5 text-[12px] uppercase tracking-[0.1em] text-white hover:bg-neutral-900/90 disabled:opacity-50"
        >
          {pending ? 'Saving…' : 'Add payment'}
        </Button>
      </div>
      {error ? (
        <p role="alert" className="text-[13px] text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  )
}
