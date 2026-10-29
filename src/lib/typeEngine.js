// Type engine: opentype.js glyph measurement with canvas fallback.
//
// paper.js PointText handles on-canvas type rendering with the browser's
// loaded webfonts, so opentype.js is only *required* for measurement.
// When a parseable binary (WOFF via the fontsource CDN) loads, widths come
// from real glyph advances + kerning. Otherwise we fall back to the legacy
// canvas measureText path so the preview never blocks on font fetching.

import * as opentype from 'opentype.js'
import { measureTextWidthPx } from './layout.js'

// fontsource CDN serves WOFF (which opentype.js parses) alongside woff2.
// Slug/weight map covers the bundled FONTS list in layout.js.
const FONT_BIN = {
  anton: { slug: 'anton', weight: 400 },
  bebas: { slug: 'bebas-neue', weight: 400 },
  oswald: { slug: 'oswald', weight: 700 },
  impact: null, // system font, no web binary
  archivo: { slug: 'archivo-black', weight: 400 },
  space: { slug: 'space-grotesk', weight: 700 },
  staatliches: { slug: 'staatliches', weight: 400 },
  alfaslab: { slug: 'alfa-slab-one', weight: 400 },
  ultra: { slug: 'ultra', weight: 400 },
  arvo: { slug: 'arvo', weight: 700 },
  graduate: { slug: 'graduate', weight: 400 },
  zillaslab: { slug: 'zilla-slab', weight: 700 },
  luckiest: { slug: 'luckiest-guy', weight: 400 },
  titan: { slug: 'titan-one', weight: 400 },
  bungee: { slug: 'bungee', weight: 400 },
  passion: { slug: 'passion-one', weight: 900 },
  monoton: { slug: 'monoton', weight: 400 },
  blackops: { slug: 'black-ops-one', weight: 400 },
  saira: { slug: 'saira-stencil-one', weight: 400 },
}

const fontCache = new Map() // fontId -> Font | null (null = failed, use fallback)
const pendingCache = new Map() // fontId -> Promise

function binUrl(fontId) {
  const entry = FONT_BIN[fontId]
  if (!entry) return null
  return `https://cdn.jsdelivr.net/fontsource/fonts/${entry.slug}@latest/latin-${entry.weight}-normal.woff`
}

export function engineStatus(fontId) {
  if (fontCache.has(fontId)) return fontCache.get(fontId) ? 'opentype' : 'fallback'
  if (pendingCache.has(fontId)) return 'loading'
  return 'idle'
}

export function loadEngineFont(fontId) {
  if (fontCache.has(fontId)) return Promise.resolve(fontCache.get(fontId))
  if (pendingCache.has(fontId)) return pendingCache.get(fontId)
  const url = binUrl(fontId)
  if (!url) {
    fontCache.set(fontId, null)
    return Promise.resolve(null)
  }
  const task = fetch(url)
    .then((response) => {
      if (!response.ok) throw new Error(`font fetch ${response.status}`)
      return response.arrayBuffer()
    })
    .then((buffer) => opentype.parse(buffer))
    .then((font) => {
      fontCache.set(fontId, font)
      pendingCache.delete(fontId)
      return font
    })
    .catch(() => {
      fontCache.set(fontId, null)
      pendingCache.delete(fontId)
      return null
    })
  pendingCache.set(fontId, task)
  return task
}

// Warm every family in the background; resolves when all settle.
// Callers bump their measure version after it resolves.
export function warmTypeEngine(fontIds = Object.keys(FONT_BIN)) {
  return Promise.all(fontIds.map((id) => loadEngineFont(id)))
}

// Width of one line in px. Uses opentype advances when the binary is cached,
// otherwise the canvas path. `font` is the FONTS entry {family, weight}.
export function engineLineWidthPx(text, font, fontId, fontPx, letterSpacingEm) {
  const cached = fontCache.get(fontId)
  if (cached) {
    try {
      const scale = fontPx / cached.unitsPerEm
      const glyphs = cached.stringToGlyphs(text)
      let advance = 0
      for (let i = 0; i < glyphs.length; i += 1) {
        const glyph = glyphs[i]
        advance += glyph.advanceWidth * scale
        if (i < glyphs.length - 1) {
          advance += cached.getKerningValue(glyph, glyphs[i + 1]) * scale
        }
      }
      const tracking = Math.max(0, text.length - 1) * (Number(letterSpacingEm) || 0) * fontPx
      return advance + tracking
    } catch {
      // fall through to canvas
    }
  }
  return measureTextWidthPx([text], font, fontPx, letterSpacingEm)
}

// Cached engine font for direct advance/path work (e.g. paper.js canvas).
export function getEngineFont(fontId) {
  return fontCache.get(fontId) ?? null
}

// Outline path for a line (for future transform/export work). Returns an
// opentype Path or null when the engine font is unavailable.
export function engineGlyphPath(text, fontId, fontPx) {
  const cached = fontCache.get(fontId)
  if (!cached) return null
  try {
    return cached.getPath(text, 0, 0, fontPx, { kerning: true })
  } catch {
    return null
  }
}
