export const PX_PER_INCH = 90
export const PAGE_W = 11
export const PAGE_H = 8.5

export const FONTS = [
  { id: 'anton', label: 'Anton', family: 'Anton', weight: '400' },
  { id: 'bebas', label: 'Bebas Neue', family: 'Bebas Neue', weight: '400' },
  { id: 'oswald', label: 'Oswald 700', family: 'Oswald', weight: '700' },
  { id: 'impact', label: 'Impact', family: 'Impact', weight: '900' },
  { id: 'archivo', label: 'Archivo Black', family: 'Archivo Black', weight: '400' },
  { id: 'blackops', label: 'Black Ops One', family: 'Black Ops One', weight: '400' },
  { id: 'monoton', label: 'Monoton', family: 'Monoton', weight: '400' },
  { id: 'space', label: 'Space Grotesk Bold', family: 'Space Grotesk', weight: '700' },
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
