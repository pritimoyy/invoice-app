import path from 'node:path'

import { Font } from '@react-pdf/renderer'

/**
 * The only face these templates use — Archivo (Google Fonts), fetched as
 * static per-weight .ttf files. Verified against each file's cmap table that
 * ₹ (U+20B9) is present in every weight before committing these; some
 * display faces silently omit it.
 *
 * Registered once at module load, per project convention — importing this
 * module is what makes "Archivo" resolvable by name in a template's
 * StyleSheet.
 */
let registered = false

export function registerFonts() {
  if (registered) return
  registered = true

  // cwd, not __dirname or import.meta.url: fontkit reads these files via fs
  // at request time, not import(), so Vercel's serverless file tracer can't
  // see the reference and won't bundle them unless the path is one it can
  // resolve statically off the project root (see next.config's
  // outputFileTracingIncludes). __dirname also doesn't exist once this runs
  // as ESM, and import.meta.url breaks the moment a bundler flattens this
  // module into another file.
  const dir = path.join(process.cwd(), 'lib/pdf/fonts')

  Font.register({
    family: 'Archivo',
    fonts: [
      { src: path.join(dir, 'Archivo-Regular.ttf'), fontWeight: 400 },
      { src: path.join(dir, 'Archivo-Medium.ttf'), fontWeight: 500 },
      { src: path.join(dir, 'Archivo-SemiBold.ttf'), fontWeight: 600 },
      { src: path.join(dir, 'Archivo-Bold.ttf'), fontWeight: 700 },
      { src: path.join(dir, 'Archivo-ExtraBold.ttf'), fontWeight: 800 },
    ],
  })

  // react-pdf hyphenates long words to fit a line by default, which the
  // design's flush-right numeric columns and tight labels never anticipate.
  Font.registerHyphenationCallback((word) => [word])
}

registerFonts()
