import type { Metadata } from 'next'
import { notFound } from 'next/navigation'

import { formatPaise } from '@/lib/money'
import { loadPublicInvoice } from '@/lib/pdf/load-public-invoice'
import { archivo } from '@/lib/web-fonts'

export const metadata: Metadata = {
  title: 'Invoice',
}

const microLabel = 'text-[10px] uppercase tracking-[0.14em] text-neutral-400'

/**
 * Read-only — no inputs, no server actions, nothing that could mutate the
 * invoice from here. Same data (lib/pdf/load-public-invoice.ts) as the
 * "Download PDF" link below, so the on-page numbers and the PDF can never
 * disagree.
 */
export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  const invoice = await loadPublicInvoice(token)
  if (!invoice) {
    notFound()
  }

  const { data, rows } = invoice

  return (
    <div className="min-h-screen bg-neutral-100 px-4 py-10 sm:py-16">
      <div
        className={`${archivo.className} mx-auto flex w-full max-w-3xl flex-col gap-10 border border-neutral-200 bg-white p-8 text-neutral-900 shadow-sm sm:p-14`}
      >
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
            <p className="text-[16px] font-bold tracking-tight">{data.billTo.name}</p>
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
              Issued {data.issuedDate || '—'}
              <br />
              Due {data.dueDate || '—'}
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
            <div className="flex-1">Description</div>
            <div className="w-16 text-right">Qty</div>
            <div className="w-28 text-right">Rate</div>
            <div className="w-32 text-right">Amount</div>
          </div>
          {rows.map((r) => {
            const [headline, ...subLines] = r.desc.split('\n')
            return (
              <div
                key={r.n}
                className="flex items-start gap-3 border-b border-neutral-100 pb-4 text-[14px]"
              >
                <div className="w-6 pt-0.5 tabular-nums text-neutral-400">{r.n}</div>
                <div className="flex-1">
                  <p>{headline}</p>
                  {subLines
                    .filter((line) => line.trim() !== '')
                    .map((line, idx) => (
                      <p key={idx} className="mt-0.5 text-[12px] text-neutral-400">
                        · {line}
                      </p>
                    ))}
                </div>
                <div className="w-16 pt-0.5 text-right tabular-nums">{r.qty}</div>
                <div className="w-28 pt-0.5 text-right tabular-nums">{r.rate}</div>
                <div className="w-32 pt-0.5 text-right font-semibold tabular-nums">{r.amt}</div>
              </div>
            )
          })}
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
            {data.totals.discount !== '—' ? (
              <div className="flex justify-between py-1.5">
                <span className="text-neutral-500">Discount</span>
                <span className="tabular-nums">{data.totals.discount}</span>
              </div>
            ) : null}
            {data.gstTreatment === 'intra_state' && (
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
            {data.gstTreatment === 'inter_state' && (
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
            {/* Only once something has actually been paid — on an untouched
                invoice "Paid ₹0 / Balance ₹X" is noise that just restates
                the total. */}
            {invoice.paidPaise > 0 ? (
              <div className="mt-2.5 border-t border-neutral-200 pt-2.5">
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500">Paid to date</span>
                  <span className="tabular-nums text-emerald-700">
                    {formatPaise(invoice.paidPaise, { currency: invoice.currency })}
                  </span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="font-semibold">Balance due</span>
                  <span className="font-semibold tabular-nums">
                    {formatPaise(invoice.balancePaise, { currency: invoice.currency })}
                  </span>
                </div>
              </div>
            ) : null}
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
            <p className="mt-2 text-[13px] text-neutral-500">
              Terms: {data.payment.termsLabel}
            </p>
            {data.notes !== '' ? (
              <p className="mt-4 whitespace-pre-line text-[13px] leading-relaxed text-neutral-500">
                {data.notes}
              </p>
            ) : null}
          </div>
          <div className="flex flex-col items-start gap-3 sm:items-end">
            {data.payment.upiLink ? (
              <a
                href={data.payment.upiLink}
                className="bg-neutral-900 px-6 py-3 text-[13px] uppercase tracking-[0.12em] text-white hover:bg-neutral-900/90"
              >
                Pay via UPI
              </a>
            ) : null}
            <a
              href={`/i/${token}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="border border-neutral-900 px-6 py-3 text-[13px] uppercase tracking-[0.12em] text-neutral-900 hover:bg-neutral-900 hover:text-white"
            >
              Download PDF
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
