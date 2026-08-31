import type { InvoiceLineRow } from './types'

/**
 * Row-count thresholds a template's page layout can hold, ported unchanged
 * from the design's own `paginate(cap)` function: `alone` is the max rows
 * that fit on a single page with header+footer both present, `first`/`mid`
 * are the max for a page that only carries one of those, and `last` is the
 * minimum reserved for the closing page so totals never land alone.
 */
export type PageCapacity = {
  alone: number
  first: number
  mid: number
  last: number
}

export type InvoicePage = {
  rows: InvoiceLineRow[]
  isFirst: boolean
  isCont: boolean
  isLast: boolean
  continued: boolean
  label: string
  next: string
  carried: string
}

export function paginateRows(
  rows: InvoiceLineRow[],
  cap: PageCapacity,
): InvoicePage[] {
  const count = rows.length
  let chunks: number[]

  if (count <= cap.alone) {
    chunks = [count]
  } else if (count <= cap.first + cap.last) {
    const tail = Math.max(1, Math.round(count * 0.35))
    const head = Math.min(cap.first, count - tail)
    chunks = [head, count - head]
  } else {
    chunks = [cap.first]
    let rem = count - cap.first
    while (rem > cap.last) {
      const c = Math.min(cap.mid, rem - 1)
      chunks.push(c)
      rem -= c
    }
    chunks.push(rem)
  }

  let at = 0
  return chunks.map((c, i) => {
    const pageRows = rows.slice(at, at + c)
    at += c
    const isLast = i === chunks.length - 1
    return {
      rows: pageRows,
      isFirst: i === 0,
      isCont: i > 0,
      isLast,
      continued: !isLast,
      label: `${i + 1} of ${chunks.length}`,
      next: isLast ? '' : `${i + 2} of ${chunks.length}`,
      carried: i > 0 ? `Carried forward from page ${i}` : '',
    }
  })
}
