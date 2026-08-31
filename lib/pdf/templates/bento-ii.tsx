import { Document, Link, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import { paginateRows, type PageCapacity } from '../paginate'
import type { InvoiceLineRow, InvoiceTemplateData } from '../types'

/**
 * 3d "Bento II" — the page itself is a flex row: a 140pt rail of stacked
 * tiles against a flex-grow main column holding the items tile, so both
 * columns bottom out together regardless of row count. Total tile is ink,
 * not red — red appears only in the masthead's full stop and the
 * "continued" marker. Recreated from the "Turn 3" Claude Design canvas;
 * capacity numbers (8 alone / 13 first / 16 mid / 10 last) are its own
 * `pagesG` config — the tightest of the three, since its description
 * column is narrower and wraps to two lines more readily.
 */
const CAPACITY: PageCapacity = { alone: 8, first: 13, mid: 16, last: 10 }

const tnum = { fontFeatureSettings: ['tnum'] }

const styles = StyleSheet.create({
  page: {
    padding: 40,
    flexDirection: 'row',
    gap: 10,
    backgroundColor: '#f3f2f2',
    color: '#201e1d',
    fontFamily: 'Archivo',
    fontSize: 9.5,
    lineHeight: 1.45,
  },
  rail: { width: 140, flexDirection: 'column', gap: 10 },
  railGroup: { flexDirection: 'column', gap: 10 },
  tile: {
    border: '2pt solid #201e1d',
    backgroundColor: '#ffffff',
    padding: 12,
    flexDirection: 'column',
  },
  label: {
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.96,
    textTransform: 'uppercase',
    opacity: 0.6,
  },
  invoiceTile: { gap: 5 },
  invoiceValue: { fontSize: 14, fontWeight: 800, ...tnum },
  invoiceDetail: { fontSize: 8.5, lineHeight: 1.6, ...tnum },
  partyTile: { gap: 4 },
  partyName: { fontSize: 11, fontWeight: 800, lineHeight: 1.2 },
  partyDetail: { fontSize: 8.5, lineHeight: 1.6 },
  contDetail: { fontSize: 8.5, lineHeight: 1.6 },
  railSpacer: { flex: 1 },
  paymentTile: { gap: 4, alignItems: 'flex-start' },
  upiLink: {
    fontSize: 8.5,
    fontWeight: 700,
    color: '#ec3013',
    textDecoration: 'none',
  },
  notes: { marginTop: 6, fontSize: 8, lineHeight: 1.6, opacity: 0.7 },
  declarations: { marginTop: 6, fontSize: 7.5, lineHeight: 1.6, opacity: 0.8 },
  main: { flex: 1, flexDirection: 'column', gap: 10 },
  itemsTile: {
    flex: 1,
    border: '2pt solid #201e1d',
    backgroundColor: '#ffffff',
    padding: 12,
    flexDirection: 'column',
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    paddingBottom: 12,
  },
  masthead: {
    fontSize: 36,
    fontWeight: 800,
    letterSpacing: -1.26,
    lineHeight: 0.92,
  },
  mastheadDot: { color: '#ec3013' },
  itemsHeaderRight: {
    textAlign: 'right',
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    opacity: 0.6,
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
  colQty: { width: 42, textAlign: 'right' },
  colRate: { width: 48, textAlign: 'right' },
  colAmt: { width: 56, textAlign: 'right' },
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
  rowQty: { width: 42, textAlign: 'right', ...tnum },
  rowRate: { width: 48, textAlign: 'right', ...tnum },
  rowAmt: { width: 56, textAlign: 'right', fontWeight: 500, ...tnum },
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
  breakdownTile: {
    border: '2pt solid #201e1d',
    backgroundColor: '#ffffff',
    padding: 12,
    flexDirection: 'row',
    gap: 16,
  },
  breakdownCol: { flex: 1, flexDirection: 'column', gap: 2 },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 9,
  },
  breakdownLabel: { opacity: 0.75 },
  breakdownValue: tnum,
  breakdownDivider: { width: 2, backgroundColor: '#201e1d' },
  wordsCol: {
    width: 150,
    flexDirection: 'column',
    gap: 3,
    justifyContent: 'center',
  },
  wordsValue: { fontSize: 8.5, fontWeight: 600, lineHeight: 1.4 },
  totalTile: {
    border: '2pt solid #201e1d',
    backgroundColor: '#201e1d',
    color: '#f3f2f2',
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  totalLabel: {
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  totalValue: {
    fontSize: 26,
    fontWeight: 800,
    letterSpacing: -0.52,
    lineHeight: 1,
    ...tnum,
  },
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

export function InvoiceBentoII({
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
          <View style={styles.rail}>
            {p.isFirst && (
              <View style={styles.railGroup}>
                <View style={[styles.tile, styles.invoiceTile]}>
                  <Text style={styles.label}>Invoice</Text>
                  <Text style={styles.invoiceValue}>
                    {data.invoiceNumber}
                  </Text>
                  <Text style={styles.invoiceDetail}>
                    Issued {data.issuedDate}
                    {'\n'}
                    Due {data.dueDate}
                    {'\n'}
                    Net 15 days
                  </Text>
                </View>
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
                  <Text style={styles.partyDetail}>
                    {data.supplier.name}
                    {'\n'}
                    {data.supplier.addressLines.join('\n')}
                    {'\n'}
                    GSTIN {data.supplier.gstin}
                    {'\n'}
                    PAN {data.supplier.pan}
                    {'\n'}
                    Place of supply {data.placeOfSupply}
                  </Text>
                </View>
              </View>
            )}

            {p.isCont && (
              <View style={[styles.tile, styles.partyTile]}>
                <Text style={styles.label}>Continued</Text>
                <Text style={[styles.partyName, tnum]}>
                  {data.invoiceNumber}
                </Text>
                <Text style={styles.contDetail}>
                  {data.billTo.name}
                  {'\n'}
                  {p.carried}
                </Text>
              </View>
            )}

            <View style={styles.railSpacer} />

            {p.isLast && (
              <View style={[styles.tile, styles.paymentTile]}>
                <Text style={styles.label}>Payment</Text>
                <Text style={styles.partyDetail}>
                  {data.payment.upiId}
                  {'\n'}
                  {data.payment.bankName}
                  {'\n'}
                  A/C {data.payment.accountNo}
                  {'\n'}
                  IFSC {data.payment.ifsc}
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
            )}
          </View>

          <View style={styles.main}>
            <View style={styles.itemsTile}>
              {p.isFirst && (
                <View style={styles.itemsHeader}>
                  <Text style={styles.masthead}>
                    INVOICE
                    <Text style={styles.mastheadDot}>.</Text>
                  </Text>
                  <Text style={styles.itemsHeaderRight}>
                    Tax invoice
                    {'\n'}
                    {totals.items}
                  </Text>
                </View>
              )}
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
                <View style={styles.breakdownTile}>
                  <View style={styles.breakdownCol}>
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Subtotal</Text>
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
                          <Text style={styles.breakdownValue}>
                            {totals.cgst}
                          </Text>
                        </View>
                        <View style={styles.breakdownRow}>
                          <Text style={styles.breakdownLabel}>SGST</Text>
                          <Text style={styles.breakdownValue}>
                            {totals.sgst}
                          </Text>
                        </View>
                      </>
                    )}
                    {data.gstTreatment === 'inter_state' && (
                      <View style={styles.breakdownRow}>
                        <Text style={styles.breakdownLabel}>IGST</Text>
                        <Text style={styles.breakdownValue}>
                          {totals.igst}
                        </Text>
                      </View>
                    )}
                    <View style={styles.breakdownRow}>
                      <Text style={styles.breakdownLabel}>Round off</Text>
                      <Text style={styles.breakdownValue}>
                        {totals.roundOff}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.breakdownDivider} />
                  <View style={styles.wordsCol}>
                    <Text style={styles.label}>In words</Text>
                    <Text style={styles.wordsValue}>{totals.words}</Text>
                  </View>
                </View>
                <View style={styles.totalTile}>
                  <Text style={styles.totalLabel}>Total due</Text>
                  <Text style={styles.totalValue}>{totals.total}</Text>
                </View>
              </View>
            )}

            <View style={styles.pageFooter}>
              <Text>
                {data.invoiceNumber} · GSTIN {data.supplier.gstin}
              </Text>
              <Text style={styles.pageFooterRight}>Page {p.label}</Text>
            </View>
          </View>
        </Page>
      ))}
    </Document>
  )
}
