import { formatMeasure, unitSpec } from './units.js'

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

export const CUT_LINE_BLEND_H = {
  height: '1px',
  backgroundImage: 'repeating-linear-gradient(to right, #fff 0 4px, transparent 4px 8px)',
  mixBlendMode: 'difference',
  pointerEvents: 'none',
}

export const PREVIEW_CUT_LINE_H = {
  height: '1px',
  backgroundImage: 'repeating-linear-gradient(to right, #E3FF33 0 4px, transparent 4px 8px)',
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

// How many sheets cover `span` along one axis.
// An overlap join duplicates `overlap` inches, so the first sheet holds `trim`
// and every further sheet advances by `advance` (trim minus overlap).
export function axisCount(span, trim, advance, duplicate, overlap) {
  if (!(span > 0) || !(advance > 0)) return 0
  if (duplicate && overlap > 0) {
    if (span <= trim) return 1
    return Math.ceil((span - overlap) / advance)
  }
  return Math.ceil(span / advance)
}

export function assembledSpan(count, trim, overlap) {
  if (!(count > 0)) return 0
  return count * trim - Math.max(0, count - 1) * overlap
}

// Width or height of the sheet grid in banner inches. Duplicate tape keeps
// a full trim window on every sheet and advances by `advance`. A butt joint
// advances and windows by `advance`.
export function coveredSpan(count, trim, advance, duplicate) {
  if (!(count > 0)) return 0
  if (duplicate) return trim + Math.max(0, count - 1) * advance
  return count * advance
}

export function buildSheets(cols, rows, contentW, contentH) {
  const sheets = []
  const safeCols = Math.max(0, cols)
  const safeRows = Math.max(0, rows)
  for (let row = 0; row < safeRows; row += 1) {
    for (let col = 0; col < safeCols; col += 1) {
      sheets.push({
        col,
        row,
        index: row * safeCols + col,
        originX: col * contentW,
        originY: row * contentH,
      })
    }
  }
  return sheets
}

// Page-local scissor positions, in inches. `duplicate` is the tape-overlap
// switch: the following sheet is cut, and the earlier sheet keeps its flap.
export function verticalCutInches({ col, cols, duplicate, overlap, marginLeft, contentW }) {
  const slack = overlapCutSlack(overlap, duplicate)
  const edges = []
  if (col > 0) edges.push(marginLeft + (duplicate ? slack : 0))
  if (!duplicate && col < cols - 1) edges.push(marginLeft + contentW)
  return edges
}

export function horizontalCutInches({ row, rows, duplicate, overlap, marginTop, contentH }) {
  const slack = overlapCutSlack(overlap, duplicate)
  const edges = []
  if (row > 0) edges.push(marginTop + (duplicate ? slack : 0))
  if (!duplicate && row < rows - 1) edges.push(marginTop + contentH)
  return edges
}

// Align & Recut prints two guides in the duplicated band. The blue align
// line runs through crosses in the margin. After the sheets are taped, the
// red line is the cut through both sheets.
export const JOIN_TRIM_TAPE = 'trim-tape'
export const JOIN_OVERLAP_TAPE = 'overlap-tape'
export const JOIN_EDGE = 'edge-to-edge'
export const JOIN_ALIGN_RECUT = 'align-recut'

// Legacy `trim-tape` meant "duplicate when Tape overlap is on, butt joint
// when it is off". Map it onto the explicit three-option join model.
export function normalizeJoin(value, printOverlap = true) {
  if (
    value === JOIN_OVERLAP_TAPE ||
    value === JOIN_EDGE ||
    value === JOIN_ALIGN_RECUT
  ) {
    return value
  }
  if (value === JOIN_TRIM_TAPE) {
    return printOverlap === false ? JOIN_EDGE : JOIN_OVERLAP_TAPE
  }
  return JOIN_OVERLAP_TAPE
}
export const ASSEMBLY_ALIGN_RECUT = 'align-recut'
export const ALIGN_RECUT_MIN_OVERLAP = 0.35
export const ALIGN_RECUT_STUB = 0.1
export const ALIGN_RECUT_CUT_GAP = 0.18
export const ALIGN_COLOR = '#2F6BFF'
export const RECUT_COLOR = '#E10600'
export const ALIGN_CROSS_MAX = 0.16
const ALIGN_CROSS_MIN_MARGIN = 0.08

export function joinDuplicates(join) {
  return join === JOIN_ALIGN_RECUT || join === JOIN_OVERLAP_TAPE
}

// Distances from the outer edge of the overlap band, in inches.
// The align line is the outer guide. The recut line sits toward the kept type.
export function alignRecutMarks(overlap) {
  const band = Number(overlap) || 0
  const alignFromOuter = ALIGN_RECUT_STUB
  const cutFromOuter = ALIGN_RECUT_STUB + ALIGN_RECUT_CUT_GAP
  return {
    alignFromOuter,
    cutFromOuter,
    fits: band + 1e-9 >= ALIGN_RECUT_MIN_OVERLAP,
  }
}

// Page position of the two lines. `side` `end` is the outgoing edge
// (right or bottom). `side` `start` is the incoming edge (left or top).
export function alignRecutOffset(overlap, trim, margin, side) {
  const marks = alignRecutMarks(overlap)
  if (!marks.fits || !(trim > 0)) return null
  if (side === 'end') {
    return {
      align: margin + trim - marks.alignFromOuter,
      cut: margin + trim - marks.cutFromOuter,
    }
  }
  return {
    align: margin + overlap - marks.alignFromOuter,
    cut: margin + overlap - marks.cutFromOuter,
  }
}

// Half-length of one cross arm, in inches. The full cross stays inside the
// margin: its diameter is at most 0.16" and at least 0.04" inside the margin.
export function crossArm(margin) {
  const room = Number(margin) || 0
  if (room < ALIGN_CROSS_MIN_MARGIN) return 0
  const diameter = Math.min(ALIGN_CROSS_MAX, Math.max(0, room - 0.04))
  return diameter / 2
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

export function formatLength(inches, unit = 'in') {
  if (unit !== 'in') {
    const label = unitSpec(unit).label
    if (!(inches > 0)) return `0 ${label}`
    return `${formatMeasure(inches, unit)} ${label}`
  }
  if (inches <= 0) return '0"'
  const feet = Math.floor(inches / 12)
  const rem = inches % 12
  if (feet > 0) return `${feet}' ${rem.toFixed(1)}" • ${inches.toFixed(1)}"`
  return `${inches.toFixed(1)}"`
}

export function detectPreset(margins) {
  const close = (a, b) => Math.abs(a - b) < 0.001
  const all = (value) =>
    close(margins.top, value) &&
    close(margins.bottom, value) &&
    close(margins.left, value) &&
    close(margins.right, value)
  if (all(0.25)) return 'laser'
  if (all(0.5)) return 'inkjet'
  if (all(0.125)) return 'minimal'
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
  const room = Math.max(0.5, printableHeight - 0.05)
  return Math.max(0.5, Math.floor(room * 2) / 2)
}

export function clampGlyphHeight(height, printableHeight) {
  const max = glyphMaxInches(printableHeight)
  if (height > max) return max
  if (height < 0.5) return 0.5
  return height
}

export const TEXT_EFFECT_NONE = 'none'
export const TEXT_EFFECT_OUTLINE_COPY_SHADOW = 'outline-copy-shadow'
export const TEXT_EFFECT_HATCH_SHADOW = 'hatch-shadow'
export const TEXT_EFFECT_FILL_HATCH_SHADOW = 'fill-hatch-shadow'
export const TEXT_EFFECT_FILL_HATCH_SHADOW_0DEG = 'fill-hatch-shadow-0deg'
export const TEXT_EFFECT_SHADE = 'shade'
export const TEXT_EFFECT_KEYLINE = 'keyline'
export const TEXT_EFFECT_BLOCK_SHADE = 'block-shade'
export const TEXT_EFFECT_SIGNAL = 'signal'
export const TEXT_EFFECT_CAST = 'cast'
export const TEXT_EFFECT_CUTOUT = 'cutout'
export const TEXT_EFFECT_CUSTOM = 'custom'

// Shear applied to a glyph copy, in degrees. A sheared offset copy reads as
// a shadow cast on the surface behind the type; zero leaves type upright.
export const MAX_SKEW_DEG = 45
export const CAST_SKEW_DEG = -25

// Default back-copy offset direction: 45deg drops the copy down and to the
// right (0deg east, 90deg south, y down).
export const DEFAULT_SHADOW_ANGLE = 45

// Default hatch line direction for overlays.
export const DEFAULT_HATCH_ANGLE = 90

// Auto copy distance is this multiple of the font's estimated bar width.
export const AUTO_SHADOW_BAR_FACTOR = 0.9

// Hatch texture written by the Hatch + Shadow preset. Preset bundles keep
// their own values so tuning a default never redefines a preset.
export const HATCH_SHADOW_OVERLAY = {
  angle: 90,
  spacingPct: 2,
  lineWidthPct: 1,
}

// Back-copy hatch texture written by the Fill + Hatch-Shadow preset.
export const FILL_HATCH_SHADOW = {
  hatchAngle: 90,
  hatchSpacingPct: 2,
  hatchLineWidthPct: 1,
}

// Back-copy hatch direction for the Fill + Hatch-Shadow 0deg variant.
export const FILL_HATCH_SHADOW_0DEG_ANGLE = 0

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
    angle: clampAngle(angle, DEFAULT_HATCH_ANGLE),
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

// Angle convention: 0deg points east (+x), 90deg points south (+y, down-screen),
// so the default 45deg drops the copy down and to the right.
export function resolveShadowOffsetIn(shadow, glyphHeightIn, fontId) {
  const manual = shadow?.shadowDistance
  const distance =
    typeof manual === 'number' && Number.isFinite(manual)
      ? Math.max(0, manual)
      : AUTO_SHADOW_BAR_FACTOR * estimateBarWidthInches(glyphHeightIn, fontId)
  const rawAngle = Number(shadow?.shadowAngle)
  const angle = Number.isFinite(rawAngle) ? rawAngle : DEFAULT_SHADOW_ANGLE
  const radians = (angle * Math.PI) / 180
  return {
    distance,
    angle,
    dx: distance * Math.cos(radians),
    dy: distance * Math.sin(radians),
  }
}

// ---------------------------------------------------------------------------
// Text-layer stack builder.
//
// A stack is an ordered array of full glyph copies of the same banner text.
// Index 0 is drawn first (back); the last entry is drawn last (front).
// Each layer carries its own paint (solid fill, optional hatch overlay,
// optional stroke) plus an absolute offset in inches. Presets are one-shot
// writers that replace the whole stack; the matcher derives the preset badge
// from visible layers so manual edits still show as Custom.
// ---------------------------------------------------------------------------

export const MAX_TEXT_LAYERS = 5

export const DEFAULT_TEXT_LAYER = {
  name: 'Face',
  visible: true,
  dxIn: 0,
  dyIn: 0,
  skewXDeg: 0,
  fill: '#000000',
  strokeOn: false,
  strokeWidthIn: 0.02,
  strokeColor: '#000000',
  overlayOn: false,
  overlayColor: '#000000',
  overlayAngle: DEFAULT_HATCH_ANGLE,
  overlaySpacingPct: 10,
  overlayLineWidthPct: 2,
}

export function createLayerId() {
  return `layer-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffff)
    .toString(36)
    .padStart(4, '0')}`
}

function clampOffset(value, fallback) {
  const number = Number(value)
  return Number.isFinite(number) ? Math.min(2, Math.max(-2, number)) : fallback
}

function clampSkew(value, fallback) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(MAX_SKEW_DEG, Math.max(-MAX_SKEW_DEG, Math.round(number)))
}

function asLayerName(value, fallback) {
  if (typeof value === 'string' && value.trim() !== '') return value.trim().slice(0, 24)
  return fallback
}

export function normalizeTextLayer(value, fallback) {
  const base = { ...DEFAULT_TEXT_LAYER, ...(fallback || {}) }
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...base, id: typeof value?.id === 'string' ? value.id : createLayerId() }
  }
  return {
    id: typeof value.id === 'string' && value.id !== '' ? value.id : createLayerId(),
    name: asLayerName(value.name, base.name),
    visible: typeof value.visible === 'boolean' ? value.visible : base.visible,
    dxIn: clampOffset(value.dxIn, base.dxIn),
    dyIn: clampOffset(value.dyIn, base.dyIn),
    skewXDeg: clampSkew(value.skewXDeg, base.skewXDeg),
    fill: asHexColor(value.fill, base.fill),
    strokeOn: typeof value.strokeOn === 'boolean' ? value.strokeOn : base.strokeOn,
    strokeWidthIn: clampPct(value.strokeWidthIn ?? base.strokeWidthIn, base.strokeWidthIn, 0, 0.12),
    strokeColor: asHexColor(value.strokeColor, base.strokeColor),
    overlayOn: typeof value.overlayOn === 'boolean' ? value.overlayOn : base.overlayOn,
    overlayColor: asHexColor(value.overlayColor, base.overlayColor),
    overlayAngle: clampAngle(value.overlayAngle, base.overlayAngle),
    overlaySpacingPct: clampPct(value.overlaySpacingPct, base.overlaySpacingPct, 2, 50),
    overlayLineWidthPct: clampPct(value.overlayLineWidthPct, base.overlayLineWidthPct, 0.5, 25),
  }
}

export function normalizeTextLayers(value, fallback) {
  const base = Array.isArray(fallback) && fallback.length > 0 ? fallback : [{ ...DEFAULT_TEXT_LAYER }]
  if (!Array.isArray(value) || value.length === 0) {
    return base.map((layer) => normalizeTextLayer(layer))
  }
  const seen = new Set()
  const layers = []
  for (const entry of value.slice(0, MAX_TEXT_LAYERS)) {
    const normalized = normalizeTextLayer(entry)
    while (seen.has(normalized.id)) normalized.id = createLayerId()
    seen.add(normalized.id)
    layers.push(normalized)
  }
  return layers.length > 0 ? layers : base.map((layer) => normalizeTextLayer(layer))
}

// Hatch overlay of one layer, resolved to absolute inches.
export function resolveLayerHatchIn(layer, glyphHeightIn, fontId) {
  return resolveHatchIn(
    {
      angle: layer?.overlayAngle,
      spacingPct: layer?.overlaySpacingPct,
      lineWidthPct: layer?.overlayLineWidthPct,
    },
    glyphHeightIn,
    fontId,
  )
}

// Absolute offset of one layer: { distance, angle, dx, dy } in inches.
export function resolveLayerOffsetIn(layer) {
  const dx = Number(layer?.dxIn)
  const dy = Number(layer?.dyIn)
  const x = Number.isFinite(dx) ? dx : 0
  const y = Number.isFinite(dy) ? dy : 0
  const distance = Math.hypot(x, y)
  const angle =
    distance > 0
      ? ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360
      : DEFAULT_SHADOW_ANGLE
  return { distance, angle, dx: x, dy: y }
}

function layerIsSolidBlack(layer) {
  return (
    layer && isBlack(layer.fill) && layer.overlayOn !== true && layer.strokeOn !== true
  )
}

function layerIsSolidBlackAnyFill(layer) {
  return layer && isBlack(layer.fill) && layer.overlayOn !== true
}

// Preset badge derived from the visible layers: exact hatch textures and
// paint roles must match; offsets and stroke widths are ignored.
export function matchLayerPreset(layers) {
  const visible = (Array.isArray(layers) ? layers : []).filter((layer) => layer?.visible !== false)
  if (
    visible.length === 1 &&
    isBlack(visible[0].fill) &&
    visible[0].strokeOn !== true &&
    visible[0].overlayOn !== true &&
    Math.hypot(Number(visible[0].dxIn) || 0, Number(visible[0].dyIn) || 0) < 1e-9
  ) {
    return TEXT_EFFECT_NONE
  }
  if (visible.length === 2) {
    const [back, front] = visible
    const backSkew = Number(back.skewXDeg) || 0
    if (backSkew !== 0 && backSkew !== CAST_SKEW_DEG) return TEXT_EFFECT_CUSTOM
    if (Number(front.skewXDeg) || 0) return TEXT_EFFECT_CUSTOM
    if (
      layerIsSolidBlackAnyFill(back) &&
      back.strokeOn !== true &&
      isWhite(front.fill) &&
      front.strokeOn === true &&
      isBlack(front.strokeColor) &&
      front.overlayOn === true &&
      isBlack(front.overlayColor) &&
      front.overlayAngle === HATCH_SHADOW_OVERLAY.angle &&
      Number(front.overlaySpacingPct) === HATCH_SHADOW_OVERLAY.spacingPct &&
      Number(front.overlayLineWidthPct) === HATCH_SHADOW_OVERLAY.lineWidthPct
    ) {
      return TEXT_EFFECT_HATCH_SHADOW
    }
    if (
      layerIsSolidBlackAnyFill(back) &&
      back.strokeOn !== true &&
      isWhite(front.fill) &&
      front.strokeOn === true &&
      front.overlayOn !== true
    ) {
      return TEXT_EFFECT_OUTLINE_COPY_SHADOW
    }
    if (
      layerIsSolidBlackAnyFill(back) &&
      back.strokeOn !== true &&
      !Number(back.skewXDeg) &&
      isWhite(front.fill) &&
      front.strokeOn !== true &&
      front.overlayOn !== true
    ) {
      return TEXT_EFFECT_SHADE
    }
    if (
      layerIsSolidBlackAnyFill(back) &&
      back.strokeOn === true &&
      Math.hypot(Number(back.dxIn) || 0, Number(back.dyIn) || 0) < 1e-9 &&
      isWhite(front.fill) &&
      front.strokeOn !== true &&
      front.overlayOn !== true
    ) {
      return TEXT_EFFECT_KEYLINE
    }
    if (
      layerIsSolidBlackAnyFill(back) &&
      back.strokeOn !== true &&
      front.fill?.trim?.().toUpperCase() === '#C1272D' &&
      front.strokeOn !== true &&
      front.overlayOn !== true
    ) {
      return TEXT_EFFECT_SIGNAL
    }
    if (
      layerIsSolidBlackAnyFill(back) &&
      back.strokeOn !== true &&
      Number(back.skewXDeg) === CAST_SKEW_DEG &&
      Math.hypot(Number(back.dxIn) || 0, Number(back.dyIn) || 0) > 1e-9 &&
      isWhite(front.fill) &&
      front.strokeOn !== true &&
      front.overlayOn !== true
    ) {
      return TEXT_EFFECT_CAST
    }
    if (
      layerIsSolidBlack(front) &&
      back.overlayOn === true &&
      isBlack(back.overlayColor) &&
      Number(back.overlaySpacingPct) === FILL_HATCH_SHADOW.hatchSpacingPct &&
      Number(back.overlayLineWidthPct) === FILL_HATCH_SHADOW.hatchLineWidthPct &&
      (Number(back.overlayAngle) === FILL_HATCH_SHADOW.hatchAngle ||
        Number(back.overlayAngle) === FILL_HATCH_SHADOW_0DEG_ANGLE)
    ) {
      return Number(back.overlayAngle) === FILL_HATCH_SHADOW.hatchAngle
        ? TEXT_EFFECT_FILL_HATCH_SHADOW
        : TEXT_EFFECT_FILL_HATCH_SHADOW_0DEG
    }
  }
  if (visible.length === 5) {
    const [d4, d3, d2, d1, front] = visible
    if ([d1, d2, d3, d4, front].some((layer) => Number(layer.skewXDeg) || 0)) {
      return TEXT_EFFECT_CUSTOM
    }
    const steps = [d1, d2, d3, d4].map((layer) =>
      Math.hypot(Number(layer.dxIn) || 0, Number(layer.dyIn) || 0),
    )
    const angles = [d1, d2, d3, d4].map(
      (layer) => (Math.atan2(Number(layer.dyIn) || 0, Number(layer.dxIn) || 0) * 180) / Math.PI,
    )
    const increasing = steps.every((d, i) => (i === 0 ? d > 1e-9 : d > steps[i - 1]))
    const aligned = angles.every((a) => {
      let spread = Math.abs(a - angles[0]) % 360
      if (spread > 180) spread = 360 - spread
      return spread <= 15
    })
    if (
      [d1, d2, d3, d4].every(layerIsSolidBlack) &&
      isWhite(front.fill) &&
      front.strokeOn !== true &&
      front.overlayOn !== true &&
      increasing &&
      aligned
    ) {
      return TEXT_EFFECT_CUTOUT
    }
  }
  if (visible.length === 3) {
    const [deep, mid, front] = visible
    if ([deep, mid, front].some((layer) => Number(layer.skewXDeg) || 0)) {
      return TEXT_EFFECT_CUSTOM
    }
    const d1 = Math.hypot(Number(mid.dxIn) || 0, Number(mid.dyIn) || 0)
    const d2 = Math.hypot(Number(deep.dxIn) || 0, Number(deep.dyIn) || 0)
    const a1 = (Math.atan2(Number(mid.dyIn) || 0, Number(mid.dxIn) || 0) * 180) / Math.PI
    const a2 = (Math.atan2(Number(deep.dyIn) || 0, Number(deep.dxIn) || 0) * 180) / Math.PI
    let spread = Math.abs(a1 - a2) % 360
    if (spread > 180) spread = 360 - spread
    if (
      layerIsSolidBlack(mid) &&
      layerIsSolidBlack(deep) &&
      isWhite(front.fill) &&
      front.strokeOn !== true &&
      front.overlayOn !== true &&
      d1 > 1e-9 &&
      d2 > d1 &&
      spread <= 15
    ) {
      return TEXT_EFFECT_BLOCK_SHADE
    }
  }
  return TEXT_EFFECT_CUSTOM
}

// One-shot preset writer: replaces the whole stack. The front layer keeps the
// user's stroke width and stroke color where the bundle allows; back-copy
// offsets reset to the Auto distance at the default angle for the type size.
export function applyLayerPreset(presetId, context) {
  const layers = Array.isArray(context?.layers) ? context.layers : []
  const front = layers.length > 0 ? layers[layers.length - 1] : null
  const keepWidth = Number(front?.strokeWidthIn)
  const strokeWidthIn = Number.isFinite(keepWidth)
    ? Math.min(0.12, Math.max(0, keepWidth))
    : DEFAULT_TEXT_LAYER.strokeWidthIn
  const keepColor = asHexColor(front?.strokeColor, DEFAULT_TEXT_LAYER.strokeColor)
  const auto = resolveShadowOffsetIn(
    { shadowDistance: null, shadowAngle: DEFAULT_SHADOW_ANGLE },
    context?.glyphHeightIn,
    context?.fontId,
  )
  const back = (name, paint) =>
    normalizeTextLayer({
      id: createLayerId(),
      name,
      visible: true,
      dxIn: auto.dx,
      dyIn: auto.dy,
      ...paint,
    })
  const face = (name, paint) =>
    normalizeTextLayer({
      id: createLayerId(),
      name,
      visible: true,
      dxIn: 0,
      dyIn: 0,
      ...paint,
    })
  const solidBlackBack = () =>
    back('Shadow', {
      fill: '#000000',
      strokeOn: false,
      strokeColor: '#000000',
      overlayOn: false,
    })
  if (presetId === TEXT_EFFECT_HATCH_SHADOW) {
    return {
      layers: [
        solidBlackBack(),
        face('Face', {
          fill: '#FFFFFF',
          strokeOn: true,
          strokeWidthIn,
          strokeColor: '#000000',
          overlayOn: true,
          overlayColor: '#000000',
          overlayAngle: HATCH_SHADOW_OVERLAY.angle,
          overlaySpacingPct: HATCH_SHADOW_OVERLAY.spacingPct,
          overlayLineWidthPct: HATCH_SHADOW_OVERLAY.lineWidthPct,
        }),
      ],
    }
  }
  if (
    presetId === TEXT_EFFECT_FILL_HATCH_SHADOW ||
    presetId === TEXT_EFFECT_FILL_HATCH_SHADOW_0DEG
  ) {
    return {
      layers: [
        back('Shadow', {
          fill: '#000000',
          strokeOn: false,
          strokeColor: '#000000',
          overlayOn: true,
          overlayColor: '#000000',
          overlayAngle:
            presetId === TEXT_EFFECT_FILL_HATCH_SHADOW_0DEG
              ? FILL_HATCH_SHADOW_0DEG_ANGLE
              : FILL_HATCH_SHADOW.hatchAngle,
          overlaySpacingPct: FILL_HATCH_SHADOW.hatchSpacingPct,
          overlayLineWidthPct: FILL_HATCH_SHADOW.hatchLineWidthPct,
        }),
        face('Face', { fill: '#000000' }),
      ],
    }
  }
  if (presetId === TEXT_EFFECT_OUTLINE_COPY_SHADOW) {
    return {
      layers: [
        solidBlackBack(),
        face('Face', { fill: '#FFFFFF', strokeOn: true, strokeWidthIn, strokeColor: keepColor }),
      ],
    }
  }
  if (presetId === TEXT_EFFECT_SHADE) {
    return {
      layers: [solidBlackBack(), face('Face', { fill: '#FFFFFF' })],
    }
  }
  if (presetId === TEXT_EFFECT_KEYLINE) {
    return {
      layers: [
        normalizeTextLayer({
          id: createLayerId(),
          name: 'Keyline',
          visible: true,
          dxIn: 0,
          dyIn: 0,
          fill: '#000000',
          strokeOn: true,
          strokeWidthIn: Math.max(strokeWidthIn, 0.06),
          strokeColor: '#000000',
          overlayOn: false,
        }),
        face('Face', { fill: '#FFFFFF' }),
      ],
    }
  }
  if (presetId === TEXT_EFFECT_BLOCK_SHADE) {
    return {
      layers: [
        back('Shade Deep', { fill: '#000000', strokeOn: false, strokeColor: '#000000', overlayOn: false, dxIn: auto.dx * 2, dyIn: auto.dy * 2 }),
        back('Shade', { fill: '#000000', strokeOn: false, strokeColor: '#000000', overlayOn: false }),
        face('Face', { fill: '#FFFFFF' }),
      ],
    }
  }
  if (presetId === TEXT_EFFECT_SIGNAL) {
    return {
      layers: [solidBlackBack(), face('Face', { fill: '#C1272D' })],
    }
  }
  if (presetId === TEXT_EFFECT_CAST) {
    return {
      layers: [
        back('Cast Shadow', {
          fill: '#000000',
          strokeOn: false,
          strokeColor: '#000000',
          overlayOn: false,
          skewXDeg: CAST_SKEW_DEG,
        }),
        face('Face', { fill: '#FFFFFF' }),
      ],
    }
  }
  if (presetId === TEXT_EFFECT_CUTOUT) {
    const step = (n) =>
      back(`Cutout ${n}`, {
        fill: '#000000',
        strokeOn: false,
        strokeColor: '#000000',
        overlayOn: false,
        skewXDeg: 0,
        dxIn: auto.dx * n,
        dyIn: auto.dy * n,
      })
    return {
      layers: [step(4), step(3), step(2), step(1), face('Face', { fill: '#FFFFFF' })],
    }
  }
  return { layers: [face('Face', { fill: '#000000' })] }
}
