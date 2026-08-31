'use client'

import { Font } from '@react-pdf/renderer'

/**
 * Browser counterpart to register.ts. That file resolves font files from
 * disk via process.cwd() — correct for the server-rendered PDF route, but
 * meaningless in a browser: there's no filesystem to read, and
 * @react-pdf/font's client-side loader fetches fonts over HTTP. So these
 * are the same five weights, duplicated into public/fonts/ and registered
 * from a URL instead. Kept as a separate module rather than making
 * register.ts environment-aware, so the server path — the one that
 * actually ships invoices — stays untouched by this.
 */
let registered = false

export function registerClientFonts() {
  if (registered) return
  registered = true

  Font.register({
    family: 'Archivo',
    fonts: [
      { src: '/fonts/Archivo-Regular.ttf', fontWeight: 400 },
      { src: '/fonts/Archivo-Medium.ttf', fontWeight: 500 },
      { src: '/fonts/Archivo-SemiBold.ttf', fontWeight: 600 },
      { src: '/fonts/Archivo-Bold.ttf', fontWeight: 700 },
      { src: '/fonts/Archivo-ExtraBold.ttf', fontWeight: 800 },
    ],
  })

  Font.registerHyphenationCallback((word) => [word])
}
