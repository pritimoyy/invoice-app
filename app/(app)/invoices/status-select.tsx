'use client'

import { useTransition, type ChangeEvent } from 'react'

import {
  DISPLAY_STATUS_LABEL,
  displayStatusClassName,
  type DisplayStatus,
} from '@/lib/invoice-status'
import type { InvoiceStatus } from '@/lib/numbering'

import { cancelInvoice, deleteDraftInvoice, sendInvoice } from './actions'
import { markInvoicePaid, type PaymentMethod } from './[id]/edit/payment-actions'

/**
 * The status column, as the place you actually change status from.
 *
 * Only real transitions are selectable. 'overdue' and 'paid late' stay
 * listed but disabled — they're derived from dates at render time (see
 * lib/invoice-status.ts), so picking them by hand would be asserting
 * something the data doesn't support. Marking 'paid' isn't a status write
 * either: it records a payment for the outstanding balance and lets the
 * status fall out of that, which is why it can't be undone from here.
 */

type Action = 'send' | 'cancel' | 'discard'

const ACTION_CONFIRM: Record<Action, string> = {
  send: 'Send this invoice? This assigns the official invoice number and locks it from further edits.',
  cancel:
    'Cancel this invoice? It stops counting toward outstanding or overdue totals, but the record and its number stay.',
  discard: 'Discard this draft invoice? This cannot be undone.',
}

// Marking paid records a real payment, so the channel is chosen rather
// than assumed — one entry per method instead of a single "Paid" that
// quietly files everything under "other".
const PAID_METHODS: { method: PaymentMethod; label: string }[] = [
  { method: 'upi', label: 'Paid — UPI' },
  { method: 'bank_transfer', label: 'Paid — bank transfer' },
  { method: 'cash', label: 'Paid — cash' },
  { method: 'cheque', label: 'Paid — cheque' },
  { method: 'razorpay', label: 'Paid — Razorpay' },
  { method: 'other', label: 'Paid — other' },
]

const PAID_PREFIX = 'paid:'

// Width is pinned rather than fitted: a native select sizes itself to its
// widest *option*, so "Draft" was rendering 172px wide to accommodate
// "Paid late — automatic" sitting invisible in the list. 8.25rem fits the
// longest label actually shown when closed ("Partially paid") and keeps
// the column aligned.
const selectClass =
  'h-7 w-[8.25rem] cursor-pointer appearance-none truncate rounded-full border border-hairline bg-secondary ' +
  'py-0 pl-3 pr-7 text-[13px] font-medium outline-none transition-colors ' +
  'hover:bg-accent focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/40 ' +
  'disabled:cursor-not-allowed disabled:opacity-60'

// A caret drawn as a background image rather than an adjacent element:
// keeps the whole control one hit target the width of the badge, instead
// of a badge plus a separate arrow box.
const caretStyle = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6' fill='none' stroke='%23a3a3a3' stroke-width='1.5'%3E%3Cpath d='M1 1l4 4 4-4'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 9px center',
  backgroundSize: '9px 6px',
}

export function StatusSelect({
  invoiceId,
  status,
  displayStatus,
  // Off on the edit page: sending from here would send the *saved* row,
  // silently dropping whatever is unsaved in the form and locking the
  // invoice for good. The editor's own "Send invoice" button saves first,
  // so that's the only correct path once you're inside the editor.
  allowSend = true,
}: {
  invoiceId: string
  status: InvoiceStatus
  displayStatus: DisplayStatus
  allowSend?: boolean
}) {
  const [pending, startTransition] = useTransition()

  const isDraft = status === 'draft'
  const isOpen = status === 'sent' || status === 'partially_paid'

  // The select stays pinned to the current status: it's controlled by
  // `displayStatus`, which only ever changes when the server data does, so
  // picking an action fires it without the control drifting off the truth.
  function handleChange(event: ChangeEvent<HTMLSelectElement>) {
    const value = event.target.value
    if (!value) return

    if (value.startsWith(PAID_PREFIX)) {
      const method = value.slice(PAID_PREFIX.length) as PaymentMethod
      const label = PAID_METHODS.find((m) => m.method === method)?.label ?? 'Paid'
      if (
        !confirm(
          `${label}? This records a payment for the full outstanding balance, dated today.`,
        )
      ) {
        return
      }
      startTransition(async () => {
        const result = await markInvoicePaid(invoiceId, method)
        if (result.error) alert(result.error)
      })
      return
    }

    const action = value as Action
    if (!confirm(ACTION_CONFIRM[action])) return

    startTransition(async () => {
      if (action === 'discard') {
        // deleteDraftInvoice redirects on success, and redirect() works by
        // throwing — never wrap this in try/catch or the redirect surfaces
        // as a raw NEXT_REDIRECT error instead of navigating.
        await deleteDraftInvoice(invoiceId)
        return
      }
      if (action === 'cancel') {
        try {
          await cancelInvoice(invoiceId)
        } catch (err) {
          alert(err instanceof Error ? err.message : 'Could not cancel this invoice.')
        }
        return
      }
      const result = await sendInvoice(invoiceId)
      if (result.error) alert(result.error)
    })
  }

  return (
    <select
      aria-label="Invoice status"
      value={displayStatus}
      onChange={handleChange}
      disabled={pending}
      style={caretStyle}
      className={`${selectClass} ${displayStatusClassName(displayStatus)}`}
    >
      {/* The current status — always present so the select has something
          valid to display, never selectable as a "change". */}
      <option value={displayStatus} disabled>
        {pending ? 'Working…' : DISPLAY_STATUS_LABEL[displayStatus]}
      </option>

      {displayStatus !== 'draft' && (
        <option value="" disabled>
          Draft — only before sending
        </option>
      )}
      {isDraft &&
        (allowSend ? (
          <option value="send">Sent</option>
        ) : (
          <option value="" disabled>
            Sent — use Send invoice below
          </option>
        ))}
      {displayStatus !== 'overdue' && (
        <option value="" disabled>
          Overdue — automatic
        </option>
      )}
      {isOpen &&
        PAID_METHODS.map((m) => (
          <option key={m.method} value={`${PAID_PREFIX}${m.method}`}>
            {m.label}
          </option>
        ))}
      {displayStatus !== 'paid_late' && (
        <option value="" disabled>
          Paid late — automatic
        </option>
      )}
      {isOpen && <option value="cancel">Cancelled</option>}
      {isDraft && <option value="discard">Discard</option>}
    </select>
  )
}
