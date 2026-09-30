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
  const room = Math.max(0.8, printableHeight - 0.05)
  return Math.max(0.8, Math.floor(room * 10) / 10)
}

export function clampGlyphHeight(height, printableHeight) {
  const max = glyphMaxInches(printableHeight)
  if (height > max) return parseFloat(max.toFixed(1))
  if (height < 0.8) return 0.8
  return height
}

export const TEXT_EFFECT_NONE = 'none'
export const TEXT_EFFECT_OUTLINE_COPY_SHADOW = 'outline-copy-shadow'
export const TEXT_EFFECT_HATCH_SHADOW = 'hatch-shadow'
export const TEXT_EFFECT_FILL_HATCH_SHADOW = 'fill-hatch-shadow'
export const TEXT_EFFECT_FILL_HATCH_SHADOW_0DEG = 'fill-hatch-shadow-0deg'
export const TEXT_EFFECT_CUSTOM = 'custom'

export const SHADOW_FILL_SOLID = 'solid'
export const SHADOW_FILL_HATCH = 'hatch'

export const OVERLAY_TYPE_HATCH = 'hatch'

export const DEFAULT_TEXT_SHADOW = {
  on: false,
  shadowDistance: null,
  shadowAngle: 45,
  fillType: SHADOW_FILL_SOLID,
  color: '#000000',
  hatchAngle: 45,
  hatchSpacingPct: 10,
  hatchLineWidthPct: 2,
}

export const DEFAULT_FILL_OVERLAY = {
  on: false,
  type: OVERLAY_TYPE_HATCH,
  color: '#000000',
  angle: 90,
  spacingPct: 10,
  lineWidthPct: 2,
}

// Hatch texture written by the Hatch + Shadow preset. Kept separate from the
// overlay defaults so tuning the preset values never moves manual defaults.
export const HATCH_SHADOW_OVERLAY = {
  angle: 90,
  spacingPct: 2,
  lineWidthPct: 1,
}

// Shadow hatch texture written by the Fill + Hatch-Shadow preset.
export const FILL_HATCH_SHADOW = {
  hatchAngle: 90,
  hatchSpacingPct: 2,
  hatchLineWidthPct: 1,
}

// Heuristic stem-width fraction of glyph height, keyed by font id.
// Heavy display faces have thick bars; thin/line faces much less.
const BAR_FRACTION_BY_FONT = {
  monoton: 0.08,
  space: 0.11,
  staatliches: 0.12,
  bebas: 0.12,
  oswald: 0.14,
  zillaslab: 0.14,
  arvo: 0.15,
  graduate: 0.15,
  saira: 0.15,
  blackops: 0.16,
  passion: 0.17,
}
const DEFAULT_BAR_FRACTION = 0.16

export function estimateBarWidthInches(glyphHeightIn, fontId) {
  if (!Number.isFinite(glyphHeightIn) || glyphHeightIn <= 0) return 0
  const fraction = BAR_FRACTION_BY_FONT[fontId] ?? DEFAULT_BAR_FRACTION
  return glyphHeightIn * fraction
}

function clampAngle(value, fallback) {
  const angle = Number(value)
  return Number.isFinite(angle) ? Math.min(360, Math.max(0, angle)) : fallback
}

function clampPct(value, fallback, min, max) {
  const pct = Number(value)
  return Number.isFinite(pct) ? Math.min(max, Math.max(min, pct)) : fallback
}

function asHexColor(value, fallback) {
  if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim())) {
    return value.trim().toUpperCase()
  }
  return fallback
}

export function normalizeTextShadow(value, fallback) {
  const base = { ...DEFAULT_TEXT_SHADOW, ...(fallback || {}) }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return base
  const on = typeof value.on === 'boolean' ? value.on : base.on
  let shadowDistance = base.shadowDistance
  if (value.shadowDistance === null || value.shadowDistance === undefined) {
    shadowDistance = null
  } else {
    const distance = Number(value.shadowDistance)
    shadowDistance = Number.isFinite(distance) ? Math.min(2, Math.max(0, distance)) : null
  }
  return {
    on,
    shadowDistance,
    shadowAngle: clampAngle(value.shadowAngle, base.shadowAngle),
    fillType: value.fillType === SHADOW_FILL_HATCH ? SHADOW_FILL_HATCH : SHADOW_FILL_SOLID,
    color: asHexColor(value.color, base.color),
    hatchAngle: clampAngle(value.hatchAngle, base.hatchAngle),
    hatchSpacingPct: clampPct(value.hatchSpacingPct, base.hatchSpacingPct, 2, 50),
    hatchLineWidthPct: clampPct(value.hatchLineWidthPct, base.hatchLineWidthPct, 0.5, 25),
  }
}

export function normalizeFillOverlay(value, fallback) {
  const base = { ...DEFAULT_FILL_OVERLAY, ...(fallback || {}) }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return base
  return {
    on: typeof value.on === 'boolean' ? value.on : base.on,
    type: OVERLAY_TYPE_HATCH,
    color: asHexColor(value.color, base.color),
    angle: clampAngle(value.angle, base.angle),
    spacingPct: clampPct(value.spacingPct, base.spacingPct, 2, 50),
    lineWidthPct: clampPct(value.lineWidthPct, base.lineWidthPct, 0.5, 25),
  }
}

// Heuristic x-height fraction of glyph height. Only the default is established;
// add per-font entries here once measured against real renderings.
const X_HEIGHT_FRACTION_BY_FONT = {}
const DEFAULT_X_HEIGHT_FRACTION = 0.7

export function estimateXHeightInches(glyphHeightIn, fontId) {
  if (!Number.isFinite(glyphHeightIn) || glyphHeightIn <= 0) return 0
  const fraction = X_HEIGHT_FRACTION_BY_FONT[fontId] ?? DEFAULT_X_HEIGHT_FRACTION
  return glyphHeightIn * fraction
}

// Hatch spacing/width are stored as percentages of the x-height so the
// texture scales with the type. Resolves both to absolute inches.
export function resolveHatchIn({ angle, spacingPct, lineWidthPct }, glyphHeightIn, fontId) {
  const xHeight = estimateXHeightInches(glyphHeightIn, fontId)
  return {
    angle: clampAngle(angle, DEFAULT_FILL_OVERLAY.angle),
    spacingIn: (Number(spacingPct) / 100) * xHeight,
    lineWidthIn: (Number(lineWidthPct) / 100) * xHeight,
  }
}

// App angle convention (0deg east, 90deg south, y down) mapped onto the CSS
// gradient axis, which runs perpendicular to the hatch line direction.
export function hatchBackground({ angleDeg, spacing, lineWidth, color, unit }) {
  const axis = (((angleDeg + 90) % 360) + 360) % 360
  const cssAngle = (axis + 90) % 360
  return `repeating-linear-gradient(${cssAngle}deg, ${color} 0 ${lineWidth}${unit}, transparent ${lineWidth}${unit} ${spacing}${unit})`
}

// Full style for a hatch-clipped text layer. The caller supplies the font
// layer underneath; this layer paints only the lines plus an optional stroke.
export function hatchStyle({ angleDeg, spacing, lineWidth, color, unit, strokeCss }) {
  return {
    backgroundImage: hatchBackground({ angleDeg, spacing, lineWidth, color, unit }),
    WebkitBackgroundClip: 'text',
    backgroundClip: 'text',
    color: 'transparent',
    printColorAdjust: 'exact',
    WebkitPrintColorAdjust: 'exact',
    ...(strokeCss ? { WebkitTextStroke: strokeCss, paintOrder: 'stroke fill' } : {}),
  }
}

function isWhite(value) {
  return typeof value === 'string' && value.trim().toUpperCase() === '#FFFFFF'
}

function isBlack(value) {
  return typeof value === 'string' && value.trim().toUpperCase() === '#000000'
}

// Glyph Effects display is derived from live control values, so any manual
// edit that breaks a preset bundle shows as Custom with no stored flag.
export function matchGlyphPreset({ fill, strokeOn, strokeColor, textShadow, fillOverlay }) {
  const shadow = textShadow ?? DEFAULT_TEXT_SHADOW
  const overlay = fillOverlay ?? DEFAULT_FILL_OVERLAY
  const shadowOn = shadow.on === true
  const overlayOn = overlay.on === true
  const shadowSolid = shadow.fillType !== SHADOW_FILL_HATCH
  if (
    isWhite(fill) &&
    strokeOn &&
    isBlack(strokeColor) &&
    shadowOn &&
    isBlack(shadow.color) &&
    shadowSolid &&
    overlayOn &&
    isBlack(overlay.color) &&
    overlay.angle === HATCH_SHADOW_OVERLAY.angle &&
    overlay.spacingPct === HATCH_SHADOW_OVERLAY.spacingPct &&
    overlay.lineWidthPct === HATCH_SHADOW_OVERLAY.lineWidthPct
  ) {
    return TEXT_EFFECT_HATCH_SHADOW
  }
  if (
    isWhite(fill) &&
    strokeOn &&
    shadowOn &&
    isBlack(shadow.color) &&
    shadowSolid &&
    !overlayOn
  ) {
    return TEXT_EFFECT_OUTLINE_COPY_SHADOW
  }
  if (
    isBlack(fill) &&
    !strokeOn &&
    !overlayOn &&
    shadowOn &&
    shadow.fillType === SHADOW_FILL_HATCH &&
    isBlack(shadow.color) &&
    shadow.hatchSpacingPct === FILL_HATCH_SHADOW.hatchSpacingPct &&
    shadow.hatchLineWidthPct === FILL_HATCH_SHADOW.hatchLineWidthPct &&
    (shadow.hatchAngle === 90 || shadow.hatchAngle === 0)
  ) {
    return shadow.hatchAngle === 90
      ? TEXT_EFFECT_FILL_HATCH_SHADOW
      : TEXT_EFFECT_FILL_HATCH_SHADOW_0DEG
  }
  if (isBlack(fill) && !strokeOn && !shadowOn && !overlayOn) {
    return TEXT_EFFECT_NONE
  }
  return TEXT_EFFECT_CUSTOM
}

// Presets are one-shot writers: they set ordinary control values and keep the
// user's tuned stroke width and shadow tuning where the bundle allows.
export function applyGlyphPreset(presetId, settings) {
  const shadow = settings?.textShadow ?? DEFAULT_TEXT_SHADOW
  const overlay = settings?.fillOverlay ?? DEFAULT_FILL_OVERLAY
  if (presetId === TEXT_EFFECT_HATCH_SHADOW) {
    return {
      fill: '#FFFFFF',
      strokeOn: true,
      strokeColor: '#000000',
      fillOverlay: { ...overlay, ...HATCH_SHADOW_OVERLAY, on: true, color: '#000000' },
      textShadow: {
        ...shadow,
        on: true,
        shadowDistance: null,
        shadowAngle: 45,
        fillType: SHADOW_FILL_SOLID,
        color: '#000000',
      },
    }
  }
  if (
    presetId === TEXT_EFFECT_FILL_HATCH_SHADOW ||
    presetId === TEXT_EFFECT_FILL_HATCH_SHADOW_0DEG
  ) {
    return {
      fill: '#000000',
      strokeOn: false,
      fillOverlay: { ...overlay, on: false },
      textShadow: {
        ...shadow,
        on: true,
        shadowDistance: null,
        shadowAngle: 45,
        fillType: SHADOW_FILL_HATCH,
        color: '#000000',
        ...FILL_HATCH_SHADOW,
        hatchAngle: presetId === TEXT_EFFECT_FILL_HATCH_SHADOW_0DEG ? 0 : 90,
      },
    }
  }
  if (presetId === TEXT_EFFECT_OUTLINE_COPY_SHADOW) {
    return {
      fill: '#FFFFFF',
      strokeOn: true,
      fillOverlay: { ...overlay, on: false },
      textShadow: {
        ...shadow,
        on: true,
        shadowDistance: null,
        shadowAngle: 45,
        fillType: SHADOW_FILL_SOLID,
        color: '#000000',
      },
    }
  }
  return {
    fill: '#000000',
    strokeOn: false,
    fillOverlay: { ...overlay, on: false },
    textShadow: { ...shadow, on: false, fillType: SHADOW_FILL_SOLID },
  }
}

// Angle convention: 0deg points east (+x), 90deg points south (+y, down-screen),
// so the default 45deg drops the copy down and to the right.
export function resolveShadowOffsetIn(shadow, glyphHeightIn, fontId) {
  const manual = shadow?.shadowDistance
  const distance =
    typeof manual === 'number' && Number.isFinite(manual)
      ? Math.max(0, manual)
      : 0.9 * estimateBarWidthInches(glyphHeightIn, fontId)
  const rawAngle = Number(shadow?.shadowAngle)
  const angle = Number.isFinite(rawAngle) ? rawAngle : DEFAULT_TEXT_SHADOW.shadowAngle
  const radians = (angle * Math.PI) / 180
  return {
    distance,
    angle,
    dx: distance * Math.cos(radians),
    dy: distance * Math.sin(radians),
  }
}

// The shadow copy is always solid black; the face always uses the live
// fill and stroke settings, so presets never need to own the outline.
