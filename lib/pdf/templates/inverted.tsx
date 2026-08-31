import { Document, Page, StyleSheet, Text, View } from '@react-pdf/renderer'

import { paginateRows, type PageCapacity } from '../paginate'
import type { InvoiceLineRow, InvoiceTemplateData } from '../types'

/**
 * 3a "Inverted" — dark ground, paper-white type, the accent (#ec3013) held
 * to three marks: the masthead rule, the "continued" flag, and the balance
 * figure. Recreated from the "Turn 3" Claude Design canvas, capacity numbers
 * (13 rows alone / 28 first / 33 mid / 19 last) taken from its own
 * `pagesB` pagination config.
 */
const CAPACITY: PageCapacity = { alone: 13, first: 28, mid: 33, last: 19 }

const tnum = { fontFeatureSettings: ['tnum'] }

const styles = StyleSheet.create({
  page: {
    padding: 40,
    flexDirection: 'column',
    backgroundColor: '#201e1d',
    color: '#f3f2f2',
    fontFamily: 'Archivo',
    fontSize: 9,
    lineHeight: 1.45,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: 16,
    paddingBottom: 12,
    borderBottom: '2pt solid #ec3013',
  },
  masthead: {
    fontSize: 40,
    fontWeight: 800,
    letterSpacing: -1.2,
    lineHeight: 0.95,
  },
  headerRight: {
    fontSize: 14,
    fontWeight: 800,
    letterSpacing: 0.84,
    lineHeight: 1.4,
    textAlign: 'right',
    ...tnum,
  },
  headerRightSub: {
    fontSize: 9,
    fontWeight: 700,
    letterSpacing: 0.9,
    opacity: 0.7,
  },
  partyRow: {
    flexDirection: 'row',
    borderBottom: '2pt solid #f3f2f2',
    paddingTop: 14,
    paddingBottom: 14,
  },
  partyCol: {
    flexDirection: 'column',
    gap: 3,
  },
  billedTo: {
    flex: 1,
    paddingRight: 16,
  },
  divider: {
    width: 2,
    backgroundColor: 'rgba(243,242,242,0.35)',
  },
  invoiceCol: {
    width: 150,
    paddingLeft: 16,
  },
  fromCol: {
    width: 150,
    paddingLeft: 16,
  },
  label: {
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: 0.96,
    textTransform: 'uppercase',
    opacity: 0.55,
  },
  partyName: {
    fontSize: 13,
    fontWeight: 800,
    letterSpacing: -0.13,
    lineHeight: 1.15,
  },
  partyDetail: {
    fontSize: 8.5,
    lineHeight: 1.55,
    opacity: 0.85,
  },
  contRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 8,
    borderBottom: '2pt solid #ec3013',
  },
  contTitle: {
    fontSize: 20,
    fontWeight: 800,
    letterSpacing: -0.4,
  },
  contMeta: {
    textAlign: 'right',
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.8,
    textTransform: 'uppercase',
  },
  tableHead: {
    flexDirection: 'row',
    paddingTop: 14,
    paddingBottom: 6,
    fontSize: 8.5,
    fontWeight: 800,
    letterSpacing: 0.85,
    textTransform: 'uppercase',
    borderBottom: '2pt solid #f3f2f2',
  },
  colN: { width: 20 },
  colItem: { flex: 1, paddingRight: 12 },
  colQty: { width: 52, textAlign: 'right' },
  colRate: { width: 60, textAlign: 'right' },
  colAmt: { width: 68, textAlign: 'right' },
  row: {
    flexDirection: 'row',
    paddingTop: 4.5,
    paddingBottom: 4.5,
    borderBottom: '1pt solid rgba(243,242,242,0.22)',
    fontSize: 9,
  },
  rowN: { width: 20, opacity: 0.5, ...tnum },
  rowDesc: { flex: 1, paddingRight: 12 },
  rowDescSub: { fontSize: 7.5, opacity: 0.55, marginTop: 2 },
  rowQty: { width: 52, textAlign: 'right', ...tnum },
  rowRate: { width: 60, textAlign: 'right', ...tnum },
  rowAmt: { width: 68, textAlign: 'right', fontWeight: 600, ...tnum },
  continued: {
    alignSelf: 'flex-start',
    marginTop: 10,
    fontSize: 8,
    fontWeight: 800,
    letterSpacing: 0.96,
    textTransform: 'uppercase',
    color: '#ec3013',
  },
  spacer: { flex: 1 },
  footerBlock: { flexDirection: 'column', gap: 14 },
  wordsRow: { flexDirection: 'row', gap: 20, alignItems: 'flex-end' },
  wordsCol: { flex: 1, flexDirection: 'column', gap: 3 },
  wordsValue: { fontSize: 12.5, fontWeight: 600, lineHeight: 1.3 },
  totalsList: { width: 250, flexDirection: 'column' },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 2.5,
    paddingBottom: 2.5,
    fontSize: 9,
  },
  totalsLabel: { opacity: 0.7 },
  totalsValue: tnum,
  balanceRow: {
    flexDirection: 'row',
    borderTop: '2pt solid #ec3013',
    paddingTop: 10,
    justifyContent: 'space-between',
    alignItems: 'baseline',
  },
  balanceLabel: {
    fontSize: 10,
    fontWeight: 800,
    letterSpacing: 1.4,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  balanceValue: {
    fontSize: 34,
    fontWeight: 800,
    letterSpacing: -0.85,
    lineHeight: 0.95,
    color: '#f3f2f2',
    ...tnum,
  },
  paymentRow: {
    flexDirection: 'row',
    gap: 24,
    borderTop: '2pt solid rgba(243,242,242,0.4)',
    paddingTop: 12,
  },
  paymentCol: {
    flex: 1,
    flexDirection: 'column',
    gap: 8,
    alignItems: 'flex-start',
    textAlign: 'left',
  },
  paymentTitle: {
    fontSize: 15,
    fontWeight: 800,
    letterSpacing: 2.1,
    lineHeight: 1,
  },
  paymentSub: {
    fontSize: 8,
    fontWeight: 600,
    letterSpacing: 0.96,
    opacity: 0.6,
  },
  paymentDetails: {
    flexDirection: 'column',
    gap: 3,
    fontSize: 10.5,
    lineHeight: 1.4,
    ...tnum,
  },
  paymentLine: { flexDirection: 'row', gap: 10 },
  paymentLineLabel: {
    width: 62,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 0.72,
  },
  paymentLineValue: { fontWeight: 400 },
  paymentTerms: {
    fontSize: 8,
    fontWeight: 600,
    letterSpacing: 0.96,
    opacity: 0.65,
  },
  dueCol: {
    width: 158,
    height: 127,
    flexDirection: 'column',
    gap: 3,
    alignItems: 'flex-start',
    textAlign: 'left',
    fontSize: 10.5,
    lineHeight: 1.4,
    ...tnum,
  },
  dueLineLabel: {
    width: 56,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: 0.72,
  },
  pageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 7,
    borderTop: '2pt solid rgba(243,242,242,0.35)',
    fontSize: 8,
    fontWeight: 700,
    letterSpacing: 0.64,
    textTransform: 'uppercase',
    opacity: 0.8,
  },
  pageFooterRight: tnum,
})

export function InvoiceInverted({
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
            <View>
              <View style={styles.headerRow}>
                <Text style={styles.masthead}>INVOICE</Text>
                <Text style={styles.headerRight}>
                  {data.invoiceNumber}
                  {'\n'}
                  <Text style={styles.headerRightSub}>
                    ISSUED {data.issuedDate.toUpperCase()}
                  </Text>
                </Text>
              </View>
              <View style={styles.partyRow}>
                <View style={[styles.partyCol, styles.billedTo]}>
                  <Text style={styles.label}>Billed to</Text>
                  <Text style={styles.partyName}>{data.billTo.name}</Text>
                  <Text style={styles.partyDetail}>
                    {data.billTo.addressLines.join('\n')}
                    {'\n'}
                    GSTIN {data.billTo.gstin} · {data.billTo.stateLabel}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={[styles.partyCol, styles.invoiceCol]}>
                  <Text style={styles.label}>Invoice</Text>
                  <Text style={[styles.partyName, tnum]}>
                    {data.invoiceNumber}
                  </Text>
                  <Text style={styles.partyDetail}>
                    Issued {data.issuedDate}
                    {'\n'}
                    Due {data.dueDate}
                  </Text>
                </View>
                <View style={styles.divider} />
                <View style={[styles.partyCol, styles.fromCol]}>
                  <Text style={styles.label}>From</Text>
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
            <View style={styles.contRow}>
              <Text style={styles.contTitle}>INVOICE</Text>
              <Text style={styles.contMeta}>
                {data.invoiceNumber} · {p.carried}
                {'\n'}
                Page {p.label}
              </Text>
            </View>
          )}

          <View style={styles.tableHead}>
            <Text style={styles.colN}>#</Text>
            <Text style={styles.colItem}>Item</Text>
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
          {p.continued && (
            <Text style={styles.continued}>Continued — page {p.next}</Text>
          )}

          <View style={styles.spacer} />

          {p.isLast && (
            <View style={styles.footerBlock}>
              <View style={styles.wordsRow}>
                <View style={styles.wordsCol}>
                  <Text style={styles.label}>Total in words</Text>
                  <Text style={styles.wordsValue}>{totals.words}</Text>
                </View>
                <View style={styles.totalsList}>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>
                      Subtotal — {totals.items}
                    </Text>
                    <Text style={styles.totalsValue}>{totals.subtotal}</Text>
                  </View>
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>Discount</Text>
                    <Text style={styles.totalsValue}>{totals.discount}</Text>
                  </View>
                  {data.gstTreatment === 'intra_state' && (
                    <>
                      <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>CGST</Text>
                        <Text style={styles.totalsValue}>{totals.cgst}</Text>
                      </View>
                      <View style={styles.totalsRow}>
                        <Text style={styles.totalsLabel}>SGST</Text>
                        <Text style={styles.totalsValue}>{totals.sgst}</Text>
                      </View>
                    </>
                  )}
                  {data.gstTreatment === 'inter_state' && (
                    <View style={styles.totalsRow}>
                      <Text style={styles.totalsLabel}>IGST</Text>
                      <Text style={styles.totalsValue}>{totals.igst}</Text>
                    </View>
                  )}
                  <View style={styles.totalsRow}>
                    <Text style={styles.totalsLabel}>Round off</Text>
                    <Text style={styles.totalsValue}>{totals.roundOff}</Text>
                  </View>
                </View>
              </View>
              <View style={styles.balanceRow}>
                <Text style={styles.balanceLabel}>Balance due</Text>
                <Text style={styles.balanceValue}>{totals.total}</Text>
              </View>
              <View style={styles.paymentRow}>
                <View style={styles.paymentCol}>
                  <Text style={styles.paymentTitle}>PAYMENT</Text>
                  <Text style={styles.paymentSub}>BANK TRANSFER OR UPI</Text>
                  <View style={styles.paymentDetails}>
                    <View style={styles.paymentLine}>
                      <Text style={styles.paymentLineLabel}>BANK</Text>
                      <Text style={styles.paymentLineValue}>
                        {data.payment.bankName}
                      </Text>
                    </View>
                    <View style={styles.paymentLine}>
                      <Text style={styles.paymentLineLabel}>ACC NO.</Text>
                      <Text style={styles.paymentLineValue}>
                        {data.payment.accountNo}
                      </Text>
                    </View>
                    <View style={styles.paymentLine}>
                      <Text style={styles.paymentLineLabel}>IFSC</Text>
                      <Text style={styles.paymentLineValue}>
                        {data.payment.ifsc}
                      </Text>
                    </View>
                    <View style={styles.paymentLine}>
                      <Text style={styles.paymentLineLabel}>UPI</Text>
                      <Text style={styles.paymentLineValue}>
                        {data.payment.upiId}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.paymentTerms}>
                    TERMS: {data.payment.termsLabel.toUpperCase()}
                  </Text>
                </View>
                <View style={styles.dueCol}>
                  <View style={styles.paymentLine}>
                    <Text style={styles.dueLineLabel}>DUE</Text>
                    <Text style={styles.paymentLineValue}>
                      {data.dueDate}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          )}

          <View style={styles.pageFooter}>
            <Text>
              {data.supplier.name} · {data.supplier.addressLines[0]} · GSTIN{' '}
              {data.supplier.gstin}
            </Text>
            <Text style={styles.pageFooterRight}>Page {p.label}</Text>
          </View>
        </Page>
      ))}
    </Document>
  )
}
