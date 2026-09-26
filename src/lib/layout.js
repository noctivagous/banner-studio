export const PX_PER_INCH = 90

// Inset the top sheet's left cut this far into the duplicated tape.
// The sheet underneath keeps the full strip and its guide is not drawn.
export const OVERLAP_CUT_SLACK = 0.05

// White dashes blended with difference stay visible on white paper and on black type.
export const CUT_LINE_BLEND = {
  width: '1px',
  backgroundImage: 'repeating-linear-gradient(to bottom, #fff 0 4px, transparent 4px 8px)',
  mixBlendMode: 'difference',
  pointerEvents: 'none',
}

// Lime dashes for the preview canvas only, matching the scissors badge.
// Print keeps CUT_LINE_BLEND so it stays legible on paper.
export const PREVIEW_CUT_LINE = {
  width: '1px',
  backgroundImage: 'repeating-linear-gradient(to bottom, #E3FF33 0 4px, transparent 4px 8px)',
  mixBlendMode: 'difference',
  pointerEvents: 'none',
}

// printOverlap on is asymmetric trim: cut the following sheet's left edge
// and lay it over the previous sheet's uncut right flap.
// printOverlap off is an edge-to-edge butt joint: cut both sides of the seam.
export const ASSEMBLY_ASYMMETRIC_TRIM = 'asymmetric-trim'
export const ASSEMBLY_EDGE_TO_EDGE = 'edge-to-edge'

export function overlapCutSlack(overlap, duplicate) {
  if (!duplicate || overlap <= 0) return 0
  return Math.min(OVERLAP_CUT_SLACK, overlap / 2)
}
export const PAGE_W = 11
export const PAGE_H = 8.5

export const FONT_GROUPS = ['Sans Serif', 'Slab Serif', 'Display', 'Stencil']

export const FONTS = [
  { id: 'anton', label: 'Anton', family: 'Anton', weight: '400', group: 'Sans Serif' },
  { id: 'bebas', label: 'Bebas Neue', family: 'Bebas Neue', weight: '400', group: 'Sans Serif' },
  { id: 'oswald', label: 'Oswald 700', family: 'Oswald', weight: '700', group: 'Sans Serif' },
  { id: 'impact', label: 'Impact', family: 'Impact', weight: '900', group: 'Sans Serif' },
  { id: 'archivo', label: 'Archivo Black', family: 'Archivo Black', weight: '400', group: 'Sans Serif' },
  { id: 'space', label: 'Space Grotesk Bold', family: 'Space Grotesk', weight: '700', group: 'Sans Serif' },
  { id: 'staatliches', label: 'Staatliches', family: 'Staatliches', weight: '400', group: 'Sans Serif' },
  { id: 'alfaslab', label: 'Alfa Slab One', family: 'Alfa Slab One', weight: '400', group: 'Slab Serif' },
  { id: 'ultra', label: 'Ultra Slab', family: 'Ultra', weight: '400', group: 'Slab Serif' },
  { id: 'arvo', label: 'Arvo Bold', family: 'Arvo', weight: '700', group: 'Slab Serif' },
  { id: 'graduate', label: 'Graduate', family: 'Graduate', weight: '400', group: 'Slab Serif' },
  { id: 'zillaslab', label: 'Zilla Slab Bold', family: 'Zilla Slab', weight: '700', group: 'Slab Serif' },
  { id: 'luckiest', label: 'Luckiest Guy', family: 'Luckiest Guy', weight: '400', group: 'Display' },
  { id: 'titan', label: 'Titan One', family: 'Titan One', weight: '400', group: 'Display' },
  { id: 'bungee', label: 'Bungee', family: 'Bungee', weight: '400', group: 'Display' },
  { id: 'passion', label: 'Passion One 900', family: 'Passion One', weight: '900', group: 'Display' },
  { id: 'monoton', label: 'Monoton', family: 'Monoton', weight: '400', group: 'Display' },
  { id: 'blackops', label: 'Black Ops One', family: 'Black Ops One', weight: '400', group: 'Stencil' },
  { id: 'saira', label: 'Saira Stencil One', family: 'Saira Stencil One', weight: '400', group: 'Stencil' },
]

export const MARGIN_PRESETS = {
  laser: { top: 0.25, bottom: 0.25, left: 0.25, right: 0.25 },
  inkjet: { top: 0.5, bottom: 0.5, left: 0.5, right: 0.5 },
  minimal: { top: 0.125, bottom: 0.125, left: 0.125, right: 0.125 },
  custom: { top: 0.2, bottom: 0.2, left: 0.3, right: 0.3 },
}

export function formatLength(inches) {
  if (inches <= 0) return '0"'
  const feet = Math.floor(inches / 12)
  const rem = inches % 12
  if (feet > 0) return `${feet}' ${rem.toFixed(1)}" • ${inches.toFixed(1)}"`
  return `${inches.toFixed(1)}"`
}

export function detectPreset(margins) {
  const close = (a, b) => Math.abs(a - b) < 0.001
  if (close(margins.top, 0.25) && close(margins.left, 0.25)) return 'laser'
  if (close(margins.top, 0.5) && close(margins.left, 0.5)) return 'inkjet'
  if (close(margins.top, 0.125)) return 'minimal'
  return 'custom'
}

export function transformLines(text, transform) {
  return text.split('\n').map((line) => {
    if (transform === 'uppercase') return line.toUpperCase()
    if (transform === 'lowercase') return line.toLowerCase()
    return line
  })
}

export function measureTextWidthPx(lines, font, fontPx, letterSpacingEm) {
  const ctx = document.createElement('canvas').getContext('2d')
  if (!ctx) return 0
  ctx.font = `${font.weight} ${fontPx}px "${font.family}", Impact, sans-serif`
  let widest = 0
  for (const line of lines) {
    if (!line) continue
    let width
    try {
      if ('letterSpacing' in ctx) {
        ctx.letterSpacing = `${letterSpacingEm}em`
        width = ctx.measureText(line).width
      } else {
        width =
          ctx.measureText(line).width +
          Math.max(0, line.length - 1) * letterSpacingEm * fontPx
      }
    } catch {
      width =
        ctx.measureText(line).width +
        Math.max(0, line.length - 1) * letterSpacingEm * fontPx
    }
    if (width > widest) widest = width
  }
  return widest
}

export function glyphMaxInches(printableHeight) {
  return Math.min(7, Math.max(0.8, printableHeight - 0.05))
}

export function clampGlyphHeight(height, printableHeight) {
  const max = glyphMaxInches(printableHeight)
  if (height > max) return parseFloat(max.toFixed(1))
  if (height < 0.8) return 0.8
  return height
}
