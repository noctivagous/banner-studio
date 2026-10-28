import { snapHalfIn, snapToGrid } from './grid.js'
import {
  DEFAULT_TEXT_LAYER,
  FONTS,
  PX_PER_INCH,
  createLayerId,
  glyphMaxInches,
  measureTextWidthPx,
  normalizeTextLayers,
  transformLines,
} from './layout.js'

export const MAX_COPY_LINES = 8
export const MIN_GLYPH_HEIGHT = 0.5
export const MAX_GLYPH_HEIGHT = 24
export const FONT_SIZE_FACTOR = 0.9
export const ASPECT_PRESETS = [
  { id: '1:1', w: 1, h: 1 },
  { id: '3:2', w: 3, h: 2 },
  { id: '2:1', w: 2, h: 1 },
  { id: '16:9', w: 16, h: 9 },
]

const MAX_PAD = 2
const MAX_GAP = 2
const MAX_CORNER = 0.45
const MAX_ASPECT = 32

export function createNodeId(prefix = 'node') {
  return `${prefix}-${Date.now().toString(36)}-${Math.floor(Math.random() * 0xffffff)
    .toString(36)
    .padStart(4, '0')}`
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function clamp(value, min, max, fallback) {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

function asBool(value, fallback) {
  return typeof value === 'boolean' ? value : fallback
}

function asEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback
}

function asHexColor(value, fallback) {
  if (typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.trim())) {
    return value.trim().toUpperCase()
  }
  return fallback
}

function asName(value, fallback) {
  if (typeof value === 'string' && value.trim() !== '') return value.trim().slice(0, 24)
  return fallback
}

function roundTenth(value) {
  return Math.round(value * 10) / 10
}

function roundHundredth(value) {
  return Math.round(value * 100) / 100
}

function cloneLayers(layers) {
  return normalizeTextLayers(layers).map((layer) => ({ ...layer, id: createLayerId() }))
}

export const DEFAULT_PADDING = { top: 0, right: 0, bottom: 0, left: 0 }

export function normalizePadding(value, fallback = DEFAULT_PADDING) {
  const src = isPlainObject(value) ? value : {}
  return {
    top: clamp(src.top, 0, MAX_PAD, fallback.top),
    right: clamp(src.right, 0, MAX_PAD, fallback.right),
    bottom: clamp(src.bottom, 0, MAX_PAD, fallback.bottom),
    left: clamp(src.left, 0, MAX_PAD, fallback.left),
  }
}

export function normalizeAspect(value) {
  if (value == null || value === false) return null
  if (typeof value === 'string' && value.includes(':')) {
    const [wRaw, hRaw] = value.split(':')
    const w = Number(wRaw)
    const h = Number(hRaw)
    if (w > 0 && h > 0) return { w, h }
    return null
  }
  if (!isPlainObject(value)) return null
  const w = Number(value.w)
  const h = Number(value.h)
  if (!Number.isFinite(w) || !Number.isFinite(h) || w <= 0 || h <= 0) return null
  return {
    w: Math.min(MAX_ASPECT, Math.max(0.1, w)),
    h: Math.min(MAX_ASPECT, Math.max(0.1, h)),
  }
}

export function aspectId(aspect) {
  if (!aspect) return 'off'
  const match = ASPECT_PRESETS.find(
    (preset) => Math.abs(preset.w / preset.h - aspect.w / aspect.h) < 1e-6,
  )
  return match ? match.id : 'custom'
}

const FONT_IDS = FONTS.map((font) => font.id)

export function normalizePlace(value, fallback) {
  const base = isPlainObject(fallback) ? fallback : {}
  const src = isPlainObject(value) ? value : {}
  // Legacy 'auto' no longer exists: everything is freeform, snapped by default.
  const mode = asEnum(src.mode ?? base.mode, ['free', 'snap'], 'snap')
  return {
    mode,
    dxIn: clamp(src.dxIn, -24, 24, base.dxIn ?? 0),
    dyIn: clamp(src.dyIn, -24, 24, base.dyIn ?? 0),
  }
}

export function normalizeLine(value, fallback) {
  const base = fallback && typeof fallback === 'object' ? fallback : {}
  const src = isPlainObject(value) ? value : {}
  const fontId = asEnum(src.fontId, FONT_IDS, base.fontId || 'anton')
  return {
    id: typeof src.id === 'string' && src.id !== '' ? src.id : createNodeId('line'),
    copy: typeof src.copy === 'string' ? src.copy.replace(/\n/g, ' ') : (base.copy ?? ''),
    fontId,
    glyphHeight: clamp(src.glyphHeight, MIN_GLYPH_HEIGHT, MAX_GLYPH_HEIGHT, base.glyphHeight ?? 4.5),
    letterSpacing: clamp(src.letterSpacing, -0.05, 0.3, base.letterSpacing ?? 0.02),
    transform: asEnum(src.transform, ['asIs', 'uppercase', 'lowercase'], base.transform || 'asIs'),
    layers: normalizeTextLayers(src.layers, base.layers || [{ ...DEFAULT_TEXT_LAYER }]),
    place: normalizePlace(src.place, base.place),
    rotationDeg: clamp(src.rotationDeg, -180, 180, base.rotationDeg ?? 0),
  }
}

export function normalizeStack(value, fallback) {
  const base = isPlainObject(fallback) ? fallback : {}
  const src = isPlainObject(value) ? value : {}
  const fallbackLines = Array.isArray(base.lines) && base.lines.length > 0 ? base.lines : null
  const rawLines = Array.isArray(src.lines) ? src.lines : fallbackLines
  const lines = (rawLines && rawLines.length > 0 ? rawLines : [{ copy: '' }])
    .slice(0, MAX_COPY_LINES)
    .map((line) => normalizeLine(line))
  const seen = new Set()
  for (const line of lines) {
    while (seen.has(line.id)) line.id = createNodeId('line')
    seen.add(line.id)
  }
  return {
    id: typeof src.id === 'string' && src.id !== '' ? src.id : createNodeId('stack'),
    type: 'stack',
    align: asEnum(src.align, ['left', 'center', 'right'], base.align || 'center'),
    gapIn: clamp(src.gapIn, 0, MAX_GAP, base.gapIn ?? 0.1),
    lines: lines.length > 0 ? lines : [normalizeLine({ copy: '' })],
  }
}

export function normalizeContainer(value, fallback) {
  const base = isPlainObject(fallback) ? fallback : {}
  const src = isPlainObject(value) ? value : {}
  const baseSize = isPlainObject(base.size) ? base.size : {}
  const srcSize = isPlainObject(src.size) ? src.size : {}
  const baseLayout = isPlainObject(base.layout) ? base.layout : {}
  const srcLayout = isPlainObject(src.layout) ? src.layout : {}
  const baseDeco = isPlainObject(base.decoration) ? base.decoration : {}
  const srcDeco = isPlainObject(src.decoration) ? src.decoration : {}
  const rawChildren = Array.isArray(src.children)
    ? src.children
    : Array.isArray(base.children)
      ? base.children
      : []
  const children = rawChildren
    .map((child) => {
      if (isPlainObject(child) && child.type === 'stack') return normalizeStack(child)
      if (isPlainObject(child) && child.type === 'container') return normalizeContainer(child)
      if (isPlainObject(child) && Array.isArray(child.lines)) return normalizeStack(child)
      return null
    })
    .filter(Boolean)
  return {
    id: typeof src.id === 'string' && src.id !== '' ? src.id : createNodeId('container'),
    name: asName(src.name, base.name || 'Frame'),
    shape: asEnum(src.shape, ['rect'], 'rect'),
    size: {
      mode: asEnum(srcSize.mode, ['hug'], 'hug'),
      aspect: normalizeAspect(srcSize.aspect !== undefined ? srcSize.aspect : baseSize.aspect),
      padding: normalizePadding(srcSize.padding, baseSize.padding),
    },
    layout: {
      alignX: asEnum(srcLayout.alignX, ['left', 'center', 'right'], baseLayout.alignX || 'center'),
      alignY: asEnum(srcLayout.alignY, ['top', 'center', 'bottom'], baseLayout.alignY || 'center'),
    },
    decoration: {
      corner: asEnum(srcDeco.corner, ['square', 'round', 'cut'], baseDeco.corner || 'square'),
      cornerSize: clamp(srcDeco.cornerSize, 0, MAX_CORNER, baseDeco.cornerSize ?? 0.15),
    },
    fillOn: asBool(src.fillOn, base.fillOn ?? false),
    fill: asHexColor(src.fill, base.fill || '#FFFFFF'),
    strokeOn: asBool(src.strokeOn, base.strokeOn ?? false),
    strokeWidthIn: clamp(src.strokeWidthIn, 0, 0.25, base.strokeWidthIn ?? 0.02),
    strokeColor: asHexColor(src.strokeColor, base.strokeColor || '#000000'),
    childRule: asEnum(src.childRule, ['stack', 'split-y', 'split-x'], base.childRule || 'stack'),
    children: children.length > 0 ? children : [normalizeStack({})],
  }
}

export function normalizeGrid(value, fallback) {
  const src = isPlainObject(value) ? value : {}
  const base = isPlainObject(fallback) ? fallback : {}
  return {
    pitchIn: 1,
    snapHalf: asBool(src.snapHalf, base.snapHalf ?? true),
  }
}

export function normalizeComposition(value, fallback) {
  const src = isPlainObject(value) ? value : {}
  const base = isPlainObject(fallback) ? fallback : {}
  const container = normalizeContainer(src.container, base.container)
  return {
    alignMode: asEnum(src.alignMode, ['auto', 'grid'], base.alignMode || 'auto'),
    grid: normalizeGrid(src.grid, base.grid),
    container,
  }
}

export function defaultComposition() {
  return normalizeComposition({
    alignMode: 'auto',
    container: {
      id: 'container-root',
      name: 'Frame',
      children: [
        {
          id: 'stack-main',
          type: 'stack',
          align: 'center',
          gapIn: 0.1,
          lines: [
            {
              id: 'line-1',
              copy: 'Open House',
              fontId: 'anton',
              glyphHeight: 4.5,
              letterSpacing: 0.02,
              transform: 'asIs',
              layers: [{ ...DEFAULT_TEXT_LAYER, id: 'layer-face' }],
            },
          ],
        },
      ],
    },
  })
}

export function compositionFromLegacy(settings) {
  const copy = typeof settings?.copy === 'string' ? settings.copy : ''
  const rawLines = copy.split('\n')
  const parts = (rawLines.length > 0 ? rawLines : ['']).slice(0, MAX_COPY_LINES)
  const layers = settings?.layers
  const lines = parts.map((text) =>
    normalizeLine({
      copy: text,
      fontId: settings?.fontId,
      glyphHeight: settings?.glyphHeight,
      letterSpacing: settings?.letterSpacing,
      transform: settings?.transform,
      layers: cloneLayers(layers),
    }),
  )
  return normalizeComposition({
    container: {
      id: 'container-root',
      name: 'Frame',
      children: [
        {
          id: 'stack-main',
          type: 'stack',
          align: asEnum(settings?.align, ['left', 'center', 'right'], 'center'),
          gapIn: 0.1,
          lines,
        },
      ],
    },
  })
}

export function isLegacyTextSettings(value) {
  if (!isPlainObject(value)) return false
  if (isPlainObject(value.composition) && value.composition.container) return false
  return (
    typeof value.copy === 'string' ||
    Array.isArray(value.layers) ||
    typeof value.fontId === 'string'
  )
}

export function getStack(composition) {
  const children = composition?.container?.children
  if (!Array.isArray(children)) return null
  return children.find((child) => child?.type === 'stack') || null
}

export function getLines(composition) {
  return getStack(composition)?.lines ?? []
}

export function findLine(composition, lineId) {
  return getLines(composition).find((line) => line.id === lineId) || null
}

export function findNode(composition, id) {
  const container = composition?.container
  if (!container) return null
  if (container.id === id) return { kind: 'container', node: container }
  const stack = getStack(composition)
  if (stack?.id === id) return { kind: 'stack', node: stack }
  const line = findLine(composition, id)
  if (line) return { kind: 'line', node: line }
  return null
}

export function withContainer(composition, patch) {
  const current = composition.container
  const nextPatch = { ...patch }
  if (isPlainObject(patch.size)) {
    nextPatch.size = {
      ...current.size,
      ...patch.size,
      padding: patch.size.padding
        ? { ...current.size.padding, ...patch.size.padding }
        : current.size.padding,
    }
  }
  if (isPlainObject(patch.layout)) {
    nextPatch.layout = { ...current.layout, ...patch.layout }
  }
  if (isPlainObject(patch.decoration)) {
    nextPatch.decoration = { ...current.decoration, ...patch.decoration }
  }
  return normalizeComposition({
    ...composition,
    container: { ...current, ...nextPatch, children: current.children },
  })
}

export function withStack(composition, patch) {
  const container = composition.container
  const children = container.children.map((child) => {
    if (child.type !== 'stack') return child
    return normalizeStack({ ...child, ...patch, lines: patch.lines ?? child.lines })
  })
  return normalizeComposition({
    ...composition,
    container: { ...container, children },
  })
}

export function withAlignX(composition, alignX) {
  const dir = asEnum(alignX, ['left', 'center', 'right'], 'center')
  return withStack(withContainer(composition, { layout: { alignX: dir } }), { align: dir })
}

export function withAlignMode(composition, alignMode) {
  return normalizeComposition({
    ...composition,
    alignMode: asEnum(alignMode, ['auto', 'grid'], 'auto'),
  })
}

export function withLine(composition, lineId, patch) {
  const stack = getStack(composition)
  if (!stack) return composition
  const lines = stack.lines.map((line) =>
    line.id === lineId ? normalizeLine({ ...line, ...patch }) : line,
  )
  return withStack(composition, { lines })
}

export function addCopyLine(composition, afterId) {
  const stack = getStack(composition)
  if (!stack || stack.lines.length >= MAX_COPY_LINES) {
    return { composition, lineId: afterId }
  }
  const index = Math.max(
    0,
    stack.lines.findIndex((line) => line.id === afterId),
  )
  const source = stack.lines[index] || stack.lines[stack.lines.length - 1]
  const nextLine = normalizeLine({
    ...source,
    id: createNodeId('line'),
    copy: '',
    layers: cloneLayers(source.layers),
  })
  const lines = [...stack.lines]
  lines.splice(index + 1, 0, nextLine)
  return { composition: withStack(composition, { lines: lines.slice(0, MAX_COPY_LINES) }), lineId: nextLine.id }
}

export function duplicateCopyLine(composition, lineId) {
  const stack = getStack(composition)
  if (!stack || stack.lines.length >= MAX_COPY_LINES) return { composition, lineId }
  const index = stack.lines.findIndex((line) => line.id === lineId)
  if (index < 0) return { composition, lineId }
  const source = stack.lines[index]
  const nextLine = normalizeLine({
    ...source,
    id: createNodeId('line'),
    layers: cloneLayers(source.layers),
  })
  const lines = [...stack.lines]
  lines.splice(index + 1, 0, nextLine)
  return { composition: withStack(composition, { lines: lines.slice(0, MAX_COPY_LINES) }), lineId: nextLine.id }
}

export function removeCopyLine(composition, lineId) {
  const stack = getStack(composition)
  if (!stack || stack.lines.length <= 1) return { composition, lineId }
  const lines = stack.lines.filter((line) => line.id !== lineId)
  const nextId = lines[lines.length - 1]?.id
  return { composition: withStack(composition, { lines }), lineId: nextId }
}

export function moveCopyLine(composition, lineId, delta) {
  const stack = getStack(composition)
  if (!stack) return composition
  const index = stack.lines.findIndex((line) => line.id === lineId)
  const target = index + delta
  if (index < 0 || target < 0 || target >= stack.lines.length) return composition
  const lines = [...stack.lines]
  const [line] = lines.splice(index, 1)
  lines.splice(target, 0, line)
  return withStack(composition, { lines })
}

export function fontOf(line) {
  return FONTS.find((font) => font.id === line?.fontId) || FONTS[0]
}

export function lineText(line) {
  const transformed = transformLines(line?.copy ?? '', line?.transform || 'asIs')
  return transformed[0] ?? ''
}

export function measureLineWidthIn(line) {
  const text = lineText(line)
  if (text.trim() === '') return 0
  const font = fontOf(line)
  const fontPx = line.glyphHeight * PX_PER_INCH * FONT_SIZE_FACTOR
  return measureTextWidthPx([text], font, fontPx, line.letterSpacing) / PX_PER_INCH
}

export function measureLineMetrics(line) {
  const font = fontOf(line)
  const fontPx = line.glyphHeight * PX_PER_INCH * FONT_SIZE_FACTOR
  const width = measureLineWidthIn(line)
  const sample = lineText(line) || 'Hgyp'
  const fontSizeIn = line.glyphHeight * FONT_SIZE_FACTOR
  let cssAscentIn = fontSizeIn * 0.8
  let cssDescentIn = fontSizeIn * 0.2
  if (typeof document !== 'undefined') {
    const ctx = document.createElement('canvas').getContext('2d')
    if (ctx) {
      ctx.font = `${font.weight} ${fontPx}px "${font.family}", Impact, sans-serif`
      const metrics = ctx.measureText(sample)
      const actualAscentPx = metrics.actualBoundingBoxAscent ?? fontPx * 0.8
      const cssAscentPx = metrics.fontBoundingBoxAscent ?? actualAscentPx
      const cssDescentPx =
        metrics.fontBoundingBoxDescent ?? metrics.actualBoundingBoxDescent ?? fontPx * 0.2
      cssAscentIn = cssAscentPx / PX_PER_INCH
      cssDescentIn = cssDescentPx / PX_PER_INCH
    }
  }
  // CSS half-leading with line-height = glyph box: alphabetic baseline sits
  // inside the box even when the font's bounding box is taller than the em.
  const fontBox = cssAscentIn + cssDescentIn
  const halfLeading = (line.glyphHeight - fontBox) / 2
  const ascentIn = halfLeading + cssAscentIn
  return {
    width,
    height: line.glyphHeight,
    ascentIn,
    descentIn: line.glyphHeight - ascentIn,
    cssAscentIn,
    cssDescentIn,
    fontSizeIn,
  }
}

function packAlignX(align, boxWidth, stackWidth) {
  if (align === 'center') return (stackWidth - boxWidth) / 2
  if (align === 'right') return stackWidth - boxWidth
  return 0
}

function snapEdgeX(align, x, width, mode) {
  if (mode !== 'grid') return x
  if (align === 'center') {
    const mid = snapToGrid(x + width / 2)
    return mid - width / 2
  }
  if (align === 'right') {
    const right = snapToGrid(x + width)
    return right - width
  }
  return snapToGrid(x)
}

export function measureComposition(composition, options = {}) {
  const normalized = normalizeComposition(composition)
  const container = normalized.container
  const stack = getStack(normalized)
  const pad = container.size.padding
  const maxHeight = Number(options.maxHeight)
  const mode = normalized.alignMode || 'auto'
  const align = stack?.align || container.layout.alignX || 'center'
  const lines = stack?.lines ?? []
  const gap = stack?.gapIn ?? 0
  const metrics = lines.map((line) => ({
    id: line.id,
    line,
    ...measureLineMetrics(line),
  }))
  const stackWidth = metrics.reduce((max, box) => Math.max(max, box.width), 0)

  const placed = []
  let y = 0
  for (const box of metrics) {
    let baseline = y + box.ascentIn
    if (mode === 'grid') {
      let snapped = snapToGrid(baseline)
      if (snapped - box.ascentIn < y - 1e-6) snapped += 0.5
      baseline = snapped
    }
    const top = baseline - box.ascentIn
    let x = packAlignX(align, box.width, stackWidth)
    placed.push({
      ...box,
      x,
      y: top,
      baselineY: baseline,
      height: box.height,
    })
    y = Math.max(top + box.height, baseline + box.descentIn) + gap
  }

  const stackTop = placed.reduce((min, box) => Math.min(min, box.y), 0)
  const stackBottom = placed.reduce(
    (max, box) => Math.max(max, box.y + box.height, box.baselineY + box.descentIn),
    0,
  )
  const stackHeight = Math.max(0, stackBottom - stackTop)
  const shifted = placed.map((box) => ({
    ...box,
    y: box.y - stackTop,
    baselineY: box.baselineY - stackTop,
  }))

  let width = stackWidth + pad.left + pad.right
  let height = stackHeight + pad.top + pad.bottom
  const aspect = container.size.aspect
  if (aspect && width > 0 && height > 0) {
    const ratio = aspect.w / aspect.h
    const current = width / height
    if (current < ratio) width = height * ratio
    else if (current > ratio) {
      const grown = width / ratio
      height =
        Number.isFinite(maxHeight) && maxHeight > 0 ? Math.min(grown, maxHeight) : grown
    }
  }

  const innerW = Math.max(0, width - pad.left - pad.right)
  const innerH = Math.max(0, height - pad.top - pad.bottom)
  let stackX = pad.left
  let stackY = pad.top
  if (container.layout.alignX === 'center') stackX = pad.left + (innerW - stackWidth) / 2
  else if (container.layout.alignX === 'right') stackX = pad.left + innerW - stackWidth
  if (container.layout.alignY === 'center') stackY = pad.top + (innerH - stackHeight) / 2
  else if (container.layout.alignY === 'bottom') stackY = pad.top + innerH - stackHeight
  if (mode === 'grid') {
    stackX = snapToGrid(stackX)
    stackY = snapToGrid(stackY)
  }

  const lineBoxes = shifted.map((box) => {
    const x = snapEdgeX(align, stackX + box.x, box.width, mode)
    return {
      ...box,
      x,
      y: stackY + box.y,
      baselineY: stackY + box.baselineY,
    }
  })

  // Freeform lines ride on top of their auto position by their stored offset.
  // The frame grows to contain them so sheet count covers the whole union.
  // Fit calculations pass ignoreFree so dragging never shrinks the type.
  const offsetBoxes = options.ignoreFree
    ? lineBoxes
    : lineBoxes.map((box) => {
    const place = box.line.place
    const dx = Number(place?.dxIn) || 0
    const dy = Number(place?.dyIn) || 0
    if (!dx && !dy) return box
    return { ...box, x: box.x + dx, y: box.y + dy, baselineY: box.baselineY + dy }
  })
  let minX = 0
  let minY = 0
  let maxX = width
  let maxY = height
  for (const box of offsetBoxes) {
    const deg = (Number(box.line.rotationDeg) || 0) * (Math.PI / 180)
    const cx = box.x + box.width / 2
    const cy = box.y + box.height / 2
    const ex = (Math.abs(box.width * Math.cos(deg)) + Math.abs(box.height * Math.sin(deg))) / 2
    const ey = (Math.abs(box.width * Math.sin(deg)) + Math.abs(box.height * Math.cos(deg))) / 2
    minX = Math.min(minX, cx - ex)
    minY = Math.min(minY, cy - ey)
    maxX = Math.max(maxX, cx + ex)
    maxY = Math.max(maxY, cy + ey, box.baselineY + box.descentIn)
  }
  const grownBoxes =
    minX < 0 || minY < 0
      ? offsetBoxes.map((box) => ({
        ...box,
        x: box.x - minX,
        y: box.y - minY,
        baselineY: box.baselineY - minY,
      }))
      : offsetBoxes

  const grownWidth = maxX - minX
  const grownHeight = maxY - minY
  return {
    width: grownWidth,
    height: grownHeight,
    containerBox: { x: 0, y: 0, width: grownWidth, height: grownHeight },
    stackBox: { x: stackX - minX, y: stackY - minY, width: stackWidth, height: stackHeight },
    lineBoxes: grownBoxes,
    composition: normalized,
  }
}

export function cornerLengthIn(container, width, height) {
  const minSide = Math.min(width, height)
  if (minSide <= 0) return 0
  const size = Number(container?.decoration?.cornerSize) || 0
  return Math.min(minSide / 2, size * minSide)
}

export function cutPolygonPoints(width, height, cut) {
  const c = Math.min(cut, width / 2, height / 2)
  if (c <= 0) {
    return [
      [0, 0],
      [width, 0],
      [width, height],
      [0, height],
    ]
  }
  return [
    [c, 0],
    [width - c, 0],
    [width, c],
    [width, height - c],
    [width - c, height],
    [c, height],
    [0, height - c],
    [0, c],
  ]
}

export function cutPolygonCss(width, height, cut, unit) {
  return `polygon(${cutPolygonPoints(width, height, cut)
    .map(([x, y]) => `${x}${unit} ${y}${unit}`)
    .join(', ')})`
}

export function glyphMaxForLine(composition, lineId, trimH) {
  const measured = measureComposition(composition, { maxHeight: trimH, ignoreFree: true })
  const box = measured.lineBoxes.find((entry) => entry.id === lineId)
  const hardMax = glyphMaxInches(trimH)
  if (!box) return hardMax
  const others = measured.height - box.height
  const room = trimH - others
  return Math.max(MIN_GLYPH_HEIGHT, Math.min(hardMax, Math.floor(room * 2) / 2))
}

// Tile mode is not clamped to one sheet. The slider still stops at the 24"
// line cap, after the other lines, the gap, and the frame padding.
export function glyphMaxForTileLine(composition, lineId) {
  const measured = measureComposition(composition, { ignoreFree: true })
  const box = measured.lineBoxes.find((entry) => entry.id === lineId)
  if (!box) return MAX_GLYPH_HEIGHT
  const others = measured.height - box.height
  const room = MAX_GLYPH_HEIGHT - others
  return Math.max(MIN_GLYPH_HEIGHT, Math.min(MAX_GLYPH_HEIGHT, Math.floor(Math.max(0, room) * 2) / 2))
}

function scaleGlyphsToBudget(composition, trimH) {
  const measured = measureComposition(composition, { maxHeight: trimH, ignoreFree: true })
  if (measured.height <= trimH + 1e-6) return composition
  const lines = getLines(composition)
  const glyphSum = lines.reduce((sum, line) => sum + line.glyphHeight, 0)
  const fixed = measured.height - glyphSum
  const budget = trimH - fixed
  if (glyphSum <= 0 || budget <= 0) return composition
  const scale = budget / glyphSum
  return withStack(composition, {
    lines: lines.map((line) => ({
      ...line,
      glyphHeight: Math.max(
        MIN_GLYPH_HEIGHT,
        snapHalfIn(line.glyphHeight * scale, { allowZero: false, min: MIN_GLYPH_HEIGHT }),
      ),
    })),
  })
}

export function fitCompositionToTrim(composition, trimH, preferLineId) {
  let next = normalizeComposition(composition)
  let measured = measureComposition(next, { maxHeight: trimH, ignoreFree: true })
  if (measured.height <= trimH + 1e-6) return next

  if (preferLineId) {
    const line = findLine(next, preferLineId)
    if (line) {
      const max = glyphMaxForLine(next, preferLineId, trimH)
      if (line.glyphHeight > max) {
        next = withLine(next, preferLineId, {
          glyphHeight: snapHalfIn(max, { allowZero: false, min: MIN_GLYPH_HEIGHT }),
        })
        measured = measureComposition(next, { maxHeight: trimH, ignoreFree: true })
      }
    }
  }

  for (let i = 0; i < 6 && measured.height > trimH + 1e-6; i += 1) {
    next = scaleGlyphsToBudget(next, trimH)
    measured = measureComposition(next, { maxHeight: trimH, ignoreFree: true })
  }

  if (measured.height <= trimH + 1e-6) return next

  const stack = getStack(next)
  if (stack && stack.gapIn > 0 && stack.lines.length > 1) {
    const overflow = measured.height - trimH
    const gaps = stack.lines.length - 1
    const nextGap = Math.max(0, roundHundredth(stack.gapIn - overflow / gaps))
    next = withStack(next, { gapIn: nextGap })
    measured = measureComposition(next, { maxHeight: trimH, ignoreFree: true })
  }
  if (measured.height <= trimH + 1e-6) return next

  const pad = next.container.size.padding
  const padTotal = pad.top + pad.bottom
  if (padTotal > 0) {
    const overflow = measured.height - trimH
    const scale = Math.max(0, (padTotal - overflow) / padTotal)
    next = withContainer(next, {
      size: {
        padding: {
          top: roundHundredth(pad.top * scale),
          bottom: roundHundredth(pad.bottom * scale),
          left: pad.left,
          right: pad.right,
        },
      },
    })
  }
  return next
}

export function canAddCopyLine(composition, trimH, { tile = false } = {}) {
  const stack = getStack(composition)
  if (!stack || stack.lines.length >= MAX_COPY_LINES) return false
  if (tile) return true
  const added = addCopyLine(composition, stack.lines[stack.lines.length - 1].id)
  const fitted = fitCompositionToTrim(added.composition, trimH)
  return measureComposition(fitted, { maxHeight: trimH }).height <= trimH + 1e-6
}
