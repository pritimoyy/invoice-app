import { Document, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import { paginateRows, type PageCapacity } from '../paginate'
import type { InvoiceLineRow, InvoiceTemplateData } from '../types'

/**
 * 3b "Bento" — white 2pt-bordered tiles in horizontal flex bands on a
 * light ground, no CSS grid (every band is a flex row with weights).
 * Recreated from the "Turn 3" Claude Design canvas; capacity numbers
 * (6 alone / 16 first / 26 mid / 12 last) are its own `pagesE` config.
 */
const CAPACITY: PageCapacity = { alone: 6, first: 16, mid: 26, last: 12 }

const tnum = { fontFeatureSettings: ['tnum'] }

const styles = StyleSheet.create({
  page: {
    padding: 40,
    flexDirection: 'column',
    gap: 10,
    backgroundColor: '#f3f2f2',
    color: '#201e1d',
    fontFamily: 'Archivo',
    fontSize: 9.5,
    lineHeight: 1.45,
  },
  firstBlock: { flexDirection: 'column', gap: 10 },
  tileRow: { flexDirection: 'row', gap: 10 },
  tile: {
    border: '2pt solid #201e1d',
    padding: 12,
    flexDirection: 'column',
    backgroundColor: '#ffffff',
  },
  label: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.96,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  mastheadTile: { flex: 1.5, justifyContent: 'space-between' },
  masthead: {
    fontSize: 38,
    fontWeight: 800,
    letterSpacing: -1.33,
    lineHeight: 0.95,
    color: '#ec3013',
  },
  numberTile: { flex: 1, gap: 6 },
  numberValue: { fontSize: 14, fontWeight: 800, ...tnum },
  numberDetail: { fontSize: 8.5, lineHeight: 1.6, ...tnum },
  partyTile: { flex: 1, gap: 4 },
  partyName: { fontSize: 11.5, fontWeight: 800, lineHeight: 1.2 },
  partyDetail: { fontSize: 8.5, lineHeight: 1.6 },
  contTile: {
    border: '2pt solid #201e1d',
    padding: '10pt 12pt',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  contTitle: {
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: -0.6,
    color: '#ec3013',
  },
  contMeta: {
    textAlign: 'right',
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  itemsTile: {
    flex: 1,
    border: '2pt solid #201e1d',
    padding: 12,
    flexDirection: 'column',
    backgroundColor: '#ffffff',
  },
  tableHead: {
    flexDirection: 'row',
    paddingBottom: 6,
    borderBottom: '2pt solid #201e1d',
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.72,
    textTransform: 'uppercase',
    opacity: 0.7,
  },
  colN: { width: 18 },
  colItem: { flex: 1, paddingRight: 10 },
  colQty: { width: 50, textAlign: 'right' },
  colRate: { width: 56, textAlign: 'right' },
  colAmt: { width: 62, textAlign: 'right' },
  row: {
    flexDirection: 'row',
    paddingTop: 5,
    paddingBottom: 5,
    borderBottom: '1pt solid rgba(32,30,29,0.18)',
    fontSize: 9,
  },
  rowN: { width: 18, opacity: 0.45, ...tnum },
  rowDesc: { flex: 1, paddingRight: 10 },
  rowDescSub: { fontSize: 7.5, opacity: 0.6, marginTop: 2 },
  rowQty: { width: 50, textAlign: 'right', ...tnum },
  rowRate: { width: 56, textAlign: 'right', ...tnum },
  rowAmt: { width: 62, textAlign: 'right', fontWeight: 500, ...tnum },
  spacer: { flex: 1 },
  continued: {
    paddingTop: 8,
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    color: '#ec3013',
  },
  lastBlock: { flexDirection: 'column', gap: 10 },
  breakdownTile: { flex: 1, gap: 4 },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
  },
  breakdownLabel: { opacity: 0.75 },
  breakdownValue: tnum,
  totalTile: {
    flex: 1,
    border: '2pt solid #201e1d',
    backgroundColor: '#ec3013',
    color: '#ffffff',
    padding: 12,
    flexDirection: 'column',
    justifyContent: 'space-between',
    gap: 8,
  },
  totalLabel: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.96,
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 26,
    fontWeight: 800,
    letterSpacing: -0.52,
    lineHeight: 1,
    ...tnum,
  },
  totalWords: { fontSize: 8.5, fontWeight: 600, lineHeight: 1.4 },
  paymentTile: { flex: 1, gap: 4 },
  paymentDetail: { fontSize: 8.5, lineHeight: 1.7 },
  upiLink: {
    fontSize: 8.5,
    fontWeight: 700,
    color: '#ec3013',
    textDecoration: 'none',
  },
  notes: { marginTop: 6, fontSize: 8, lineHeight: 1.6, opacity: 0.7 },
  declarations: { marginTop: 6, fontSize: 7.5, lineHeight: 1.6, opacity: 0.8 },
  pageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    letterSpacing: 0.48,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  pageFooterRight: tnum,
})

export function InvoiceBento({
  data,
  rows,
}: {
  data: InvoiceTemplateData
  rows: InvoiceLineRow[]
}) {
  const pages = paginateRows(rows, CAPACITY)
  const { totals } = data

  return (
    <Document>
      {pages.map((p) => (
        <Page key={p.label} size="A4" style={styles.page}>
          {p.isFirst && (
            <View style={styles.firstBlock}>
              <View style={styles.tileRow}>
                <View style={[styles.tile, styles.mastheadTile]}>
                  <Text style={styles.label}>Tax invoice</Text>
                  <Text style={styles.masthead}>INVOICE</Text>
                </View>
                <View style={[styles.tile, styles.numberTile]}>
                  <Text style={styles.label}>Number &amp; dates</Text>
                  <Text style={styles.numberValue}>
                    {data.invoiceNumber}
                  </Text>
                  <Text style={styles.numberDetail}>
                    Issued {data.issuedDate}
                    {'\n'}
                    Due {data.dueDate}
                    {'\n'}
                    Place of supply {data.placeOfSupply}
                  </Text>
                </View>
              </View>
              <View style={styles.tileRow}>
                <View style={[styles.tile, styles.partyTile]}>
                  <Text style={styles.label}>Billed to</Text>
                  <Text style={styles.partyName}>{data.billTo.name}</Text>
                  <Text style={styles.partyDetail}>
                    {data.billTo.addressLines.join('\n')}
                    {'\n'}
                    GSTIN {data.billTo.gstin}
                  </Text>
                </View>
                <View style={[styles.tile, styles.partyTile]}>
                  <Text style={styles.label}>From</Text>
                  <Text style={styles.partyName}>{data.supplier.name}</Text>
                  <Text style={styles.partyDetail}>
                    {data.supplier.addressLines.join('\n')}
                    {'\n'}
                    GSTIN {data.supplier.gstin}
                    {'\n'}
                    PAN {data.supplier.pan}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {p.isCont && (
            <View style={styles.contTile}>
              <Text style={styles.contTitle}>INVOICE</Text>
              <Text style={styles.contMeta}>
                {data.invoiceNumber} · {p.carried}
                {'\n'}
                Page {p.label}
              </Text>
            </View>
          )}

          <View style={styles.itemsTile}>
            <View style={styles.tableHead}>
              <Text style={styles.colN}>#</Text>
              <Text style={styles.colItem}>Description</Text>
              <Text style={styles.colQty}>Qty</Text>
              <Text style={styles.colRate}>Rate</Text>
              <Text style={styles.colAmt}>Amount</Text>
            </View>
            {p.rows.map((r) => {
              const [headline, ...subLines] = r.desc.split('\n')
              return (
                <View key={r.n} style={styles.row}>
                  <Text style={styles.rowN}>{r.n}</Text>
                  <View style={styles.rowDesc}>
                    <Text>{headline}</Text>
                    {subLines
                      .filter((line) => line.trim() !== '')
                      .map((line, idx) => (
                        <Text key={idx} style={styles.rowDescSub}>
                          · {line}
                        </Text>
                      ))}
                  </View>
                  <Text style={styles.rowQty}>{r.qty}</Text>
                  <Text style={styles.rowRate}>{r.rate}</Text>
                  <Text style={styles.rowAmt}>{r.amt}</Text>
                </View>
              )
            })}
            <View style={styles.spacer} />
            {p.continued && (
              <Text style={styles.continued}>
                Continued on page {p.next} →
              </Text>
            )}
          </View>

          {p.isLast && (
            <View style={styles.lastBlock}>
              <View style={styles.tileRow}>
                <View style={[styles.tile, styles.breakdownTile]}>
                  <Text style={styles.label}>Tax breakdown</Text>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>
                      Subtotal — {totals.items}
                    </Text>
                    <Text style={styles.breakdownValue}>
                      {totals.subtotal}
                    </Text>
                  </View>
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Discount</Text>
                    <Text style={styles.breakdownValue}>
                      {totals.discount}
                    </Text>
                  </View>
                  {data.gstTreatment === 'intra_state' && (
                    <>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>CGST</Text>
                        <Text style={styles.breakdownValue}>{totals.cgst}</Text>
                      </View>
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>SGST</Text>
                        <Text style={styles.breakdownValue}>{totals.sgst}</Text>
                      </View>
                    </>
                  )}
                  {data.gstTreatment === 'inter_state' && (
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>IGST</Text>
                      <Text style={styles.breakdownValue}>{totals.igst}</Text>
                    </View>
                  )}
                  <View style={styles.breakdownRow}>
                    <Text style={styles.breakdownLabel}>Round off</Text>
                    <Text style={styles.breakdownValue}>
                      {totals.roundOff}
                    </Text>
                  </View>
                </View>
                <View style={styles.totalTile}>
                  <Text style={styles.totalLabel}>Total due</Text>
                  <Text style={styles.totalValue}>{totals.total}</Text>
                  <Text style={styles.totalWords}>{totals.words}</Text>
                </View>
              </View>
              <View style={styles.tileRow}>
                <View style={[styles.tile, styles.paymentTile]}>
                  <Text style={styles.label}>Payment</Text>
                  <Text style={styles.paymentDetail}>
                    UPI {data.payment.upiId}
                    {'\n'}
                    {data.payment.bankName}
                    {'\n'}
                    A/C {data.payment.accountNo} · IFSC {data.payment.ifsc}
                    {'\n'}
                    Terms: {data.payment.termsLabel}
                  </Text>
                  {data.payment.upiLink && (
                    <Link src={data.payment.upiLink} style={styles.upiLink}>
                      Pay via UPI
                    </Link>
                  )}
                  {data.notes !== '' && (
                    <Text style={styles.notes}>{data.notes}</Text>
                  )}
                  {(data.exportDeclaration || data.reverseChargeNote || data.exchangeRateNote) && (
                    <Text style={styles.declarations}>
                      {[data.exportDeclaration, data.reverseChargeNote, data.exchangeRateNote]
                        .filter(Boolean)
                        .join('  ')}
                    </Text>
                  )}
                </View>
              </View>
            </View>
          )}

          <View style={styles.pageFooter}>
            <Text>
              {data.invoiceNumber} · {data.supplier.name}
            </Text>
            <Text style={styles.pageFooterRight}>Page {p.label}</Text>
          </View>
        </Page>
      ))}
    </Document>
  )
}
