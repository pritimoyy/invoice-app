import localFont from 'next/font/local'

/**
 * The same five Archivo weights as lib/pdf/fonts/ and public/fonts/,
 * loaded as a proper Next.js web font for the invoice editor's
 * document-styled views — so editing an invoice actually looks like the
 * PDF it produces, not like the app's own Geist-based chrome around it.
 * Scoped to those views via the className/variable below, not applied
 * globally.
 */
export const archivo = localFont({
  src: [
    { path: '../public/fonts/Archivo-Regular.ttf', weight: '400', style: 'normal' },
    { path: '../public/fonts/Archivo-Medium.ttf', weight: '500', style: 'normal' },
    { path: '../public/fonts/Archivo-SemiBold.ttf', weight: '600', style: 'normal' },
    { path: '../public/fonts/Archivo-Bold.ttf', weight: '700', style: 'normal' },
    { path: '../public/fonts/Archivo-ExtraBold.ttf', weight: '800', style: 'normal' },
  ],
  variable: '--font-archivo',
  display: 'swap',
})
