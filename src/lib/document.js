import {
  FONTS,
  glyphMaxInches,
  legacyToTextLayers,
  normalizeFillOverlay,
  normalizeTextLayers,
  normalizeTextShadow,
} from './layout.js'
import { PAPERS, sheetSize } from './paper.js'

export const SCHEMA = 'tile-banner-studio'
export const DOCUMENT_VERSION = 2
const UNKNOWN_KEY = 'tile-banner-studio.unknown'

const TEXT_KEYS = [
  'copy',
  'fontId',
  'glyphHeight',
  'lineHeight',
  'letterSpacing',
  'transform',
  'layers',
  'align',
]

// Version 1 paint keys, migrated into layers on import.
const LEGACY_TEXT_KEYS = [
  'fill',
  'strokeOn',
  'strokeWidth',
  'strokeColor',
  'textShadow',
  'fillOverlay',
]

const VIEW_KEYS = [
  'margins',
  'overlap',
  'showTrim',
  'showSafe',
  'showTape',
  'showNumbers',
  'showCutMarks',
  'printTrim',
  'printOverlap',
  'printNumbers',
  'printCutMarks',
  'zoom',
  'scaleToFit',
]

const LAYOUT_KEYS = ['paperId', 'orientation', 'rows']

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function splitKnown(source, keys) {
  const known = {}
  const unknown = {}
  if (!isPlainObject(source)) return { known, unknown }
  for (const [key, value] of Object.entries(source)) {
    if (keys.includes(key)) known[key] = value
    else unknown[key] = value
  }
  return { known, unknown }
}

function clamp(value, min, max, fallback) {
  const number = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(number)) return fallback
  return Math.min(max, Math.max(min, number))
}

function asBool(value, fallback) {
  return typeof value === 'boolean' ? value : fallback
}

function asHex(value, fallback) {
  if (typeof value !== 'string') return fallback
  const match = value.trim().match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/)
  if (!match) return fallback
  if (match[1].length === 3) {
    return `#${match[1]
      .split('')
      .map((ch) => ch + ch)
      .join('')
      .toUpperCase()}`
  }
  return `#${match[1].toUpperCase()}`
}

function asEnum(value, allowed, fallback) {
  return allowed.includes(value) ? value : fallback
}

export function exportDocument(settings) {
  return {
    schema: SCHEMA,
    version: DOCUMENT_VERSION,
    exportedAt: new Date().toISOString(),
    layout: {
      paperId: settings.paperId,
      orientation: settings.orientation,
      rows: settings.rows,
    },
    content: {
      kind: settings.contentKind,
      text: {
        copy: settings.copy,
        fontId: settings.fontId,
        glyphHeight: settings.glyphHeight,
        lineHeight: settings.lineHeight,
        letterSpacing: settings.letterSpacing,
        transform: settings.transform,
        layers: normalizeTextLayers(settings.layers),
        align: settings.align,
      },
    },
    view: {
      margins: { ...settings.margins },
      overlap: settings.overlap,
      showTrim: settings.showTrim,
      showSafe: settings.showSafe,
      showTape: settings.showTape,
      showNumbers: settings.showNumbers,
      showCutMarks: settings.showCutMarks,
      printTrim: settings.printTrim,
      printOverlap: settings.printOverlap,
      printNumbers: settings.printNumbers,
      printCutMarks: settings.printCutMarks,
      zoom: settings.zoom,
      scaleToFit: settings.scaleToFit,
    },
    extensions: isPlainObject(settings.extensions) ? settings.extensions : {},
  }
}

export function importDocument(raw, defaults) {
  let parsed = raw
  if (typeof raw === 'string') {
    try {
      parsed = JSON.parse(raw)
    } catch {
      throw new Error('That file is not JSON.')
    }
  }
  if (!isPlainObject(parsed)) throw new Error('That file is not a banner document.')
  if (parsed.schema !== SCHEMA) throw new Error('That file is not a Tile Banner Studio document.')
  if (!Number.isInteger(parsed.version)) throw new Error('That file has no document version.')
  if (parsed.version > DOCUMENT_VERSION) {
    throw new Error('That file is from a newer version of Tile Banner Studio.')
  }
  if (parsed.version < 1) throw new Error('That file uses an unknown document version.')

  const layoutSplit = splitKnown(parsed.layout, LAYOUT_KEYS)
  const content = isPlainObject(parsed.content) ? parsed.content : {}
  const kind = content.kind
  if (kind === 'vector') {
    throw new Error('This version only opens type banners, not vector artwork.')
  }
  if (kind !== 'text') throw new Error('That file has no type content.')
  const textKeys = [...TEXT_KEYS, ...(parsed.version < 2 ? LEGACY_TEXT_KEYS : [])]
  const textSplit = splitKnown(content.text, textKeys)
  const viewSplit = splitKnown(parsed.view, VIEW_KEYS)

  const rows = layoutSplit.known.rows ?? 1
  if (rows !== 1) {
    throw new Error('This version only prints a single strip, not multiple rows.')
  }

  const paperId = asEnum(
    layoutSplit.known.paperId,
    PAPERS.map((paper) => paper.id),
    null,
  )
  if (!paperId) throw new Error('That file uses an unknown paper size.')
  const orientation = asEnum(layoutSplit.known.orientation, ['landscape', 'portrait'], null)
  if (!orientation) throw new Error('That file has no page orientation.')

  const fontId = asEnum(
    textSplit.known.fontId,
    FONTS.map((font) => font.id),
    null,
  )
  if (!fontId) throw new Error('That file uses an unknown font.')

  const marginsIn = isPlainObject(viewSplit.known.margins) ? viewSplit.known.margins : {}
  const margins = {
    top: clamp(marginsIn.top, 0, 1, defaults.margins.top),
    bottom: clamp(marginsIn.bottom, 0, 1, defaults.margins.bottom),
    left: clamp(marginsIn.left, 0, 1, defaults.margins.left),
    right: clamp(marginsIn.right, 0, 1, defaults.margins.right),
  }

  const zoom = clamp(viewSplit.known.zoom, 0.05, 4, defaults.zoom)

  const extensions = isPlainObject(parsed.extensions) ? { ...parsed.extensions } : {}
  const unknown = {
    ...layoutSplit.unknown,
    ...textSplit.unknown,
    ...viewSplit.unknown,
  }
  if (Object.keys(unknown).length > 0) {
    const prior = isPlainObject(extensions[UNKNOWN_KEY]) ? extensions[UNKNOWN_KEY] : {}
    extensions[UNKNOWN_KEY] = { ...prior, ...unknown }
  }

  const glyphHeight = clamp(
    textSplit.known.glyphHeight,
    0.8,
    glyphMaxInches(sheetSize(paperId, orientation).pageH - margins.top - margins.bottom),
    defaults.glyphHeight,
  )
  const layers = Array.isArray(textSplit.known.layers)
    ? normalizeTextLayers(textSplit.known.layers, defaults.layers)
    : legacyToTextLayers(
        {
          fill:
            typeof textSplit.known.fill === 'string'
              ? asHex(textSplit.known.fill, '#000000')
              : '#000000',
          strokeOn: asBool(textSplit.known.strokeOn, false),
          strokeWidth: clamp(textSplit.known.strokeWidth, 0, 0.12, 0.02),
          strokeColor: asHex(textSplit.known.strokeColor, '#000000'),
          textShadow: normalizeTextShadow(textSplit.known.textShadow),
          fillOverlay: normalizeFillOverlay(textSplit.known.fillOverlay),
        },
        { glyphHeightIn: glyphHeight, fontId },
      )

  return {
    ...defaults,
    paperId,
    orientation,
    rows: 1,
    contentKind: 'text',
    copy: typeof textSplit.known.copy === 'string' ? textSplit.known.copy : defaults.copy,
    fontId,
    glyphHeight,
    lineHeight: clamp(textSplit.known.lineHeight, 0.6, 1.8, defaults.lineHeight),
    letterSpacing: clamp(textSplit.known.letterSpacing, -0.05, 0.3, defaults.letterSpacing),
    transform: asEnum(textSplit.known.transform, ['asIs', 'uppercase', 'lowercase'], defaults.transform),
    layers,
    align: asEnum(textSplit.known.align, ['left', 'center', 'right'], defaults.align),
    margins,
    overlap: clamp(viewSplit.known.overlap, 0, 0.5, defaults.overlap),
    showTrim: asBool(viewSplit.known.showTrim, defaults.showTrim),
    showSafe: asBool(viewSplit.known.showSafe, defaults.showSafe),
    showTape: asBool(viewSplit.known.showTape, defaults.showTape),
    showNumbers: asBool(viewSplit.known.showNumbers, defaults.showNumbers),
    showCutMarks: asBool(viewSplit.known.showCutMarks, defaults.showCutMarks),
    printTrim: asBool(viewSplit.known.printTrim, defaults.printTrim),
    printOverlap: asBool(viewSplit.known.printOverlap, defaults.printOverlap),
    printNumbers: asBool(viewSplit.known.printNumbers, defaults.printNumbers),
    printCutMarks: asBool(viewSplit.known.printCutMarks, defaults.printCutMarks),
    zoom,
    scaleToFit: asBool(viewSplit.known.scaleToFit, defaults.scaleToFit),
    extensions,
  }
}
