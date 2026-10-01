import { useCallback, useEffect, useState } from 'react'
import {
  DEFAULT_TEXT_LAYER,
  createLayerId,
  legacyToTextLayers,
  normalizeTextLayers,
} from '../lib/layout.js'

export const STORAGE_KEY = 'tile-banner-studio'

export const DEFAULT_LAYERS = [{ ...DEFAULT_TEXT_LAYER, id: 'layer-face' }]

export const DEFAULT_SETTINGS = {
  copy: 'Open House',
  fontId: 'anton',
  glyphHeight: 4.5,
  lineHeight: 0.85,
  letterSpacing: 0.02,
  transform: 'asIs',
  layers: DEFAULT_LAYERS.map((layer) => ({ ...layer })),
  align: 'center',
  paperId: 'letter',
  orientation: 'landscape',
  rows: 1,
  contentKind: 'text',
  margins: { top: 0.25, bottom: 0.25, left: 0.25, right: 0.25 },
  overlap: 0.5,
  showTrim: true,
  showSafe: true,
  showTape: true,
  showNumbers: true,
  showCutMarks: false,
  printTrim: true,
  printOverlap: true,
  printNumbers: false,
  printCutMarks: false,
  zoom: 1,
  scaleToFit: true,
  extensions: {},
}

function hasLegacyPaint(parsed) {
  return (
    parsed &&
    (parsed.fill !== undefined ||
      parsed.strokeOn !== undefined ||
      parsed.strokeWidth !== undefined ||
      parsed.strokeColor !== undefined ||
      parsed.textShadow !== undefined ||
      parsed.fillOverlay !== undefined)
  )
}

function resolveLayers(parsed) {
  if (Array.isArray(parsed?.layers) && parsed.layers.length > 0) {
    return normalizeTextLayers(parsed.layers, DEFAULT_SETTINGS.layers)
  }
  if (hasLegacyPaint(parsed)) {
    return legacyToTextLayers(parsed, {
      glyphHeightIn: Number(parsed.glyphHeight) || DEFAULT_SETTINGS.glyphHeight,
      fontId: parsed.fontId || DEFAULT_SETTINGS.fontId,
    })
  }
  return normalizeTextLayers(DEFAULT_SETTINGS.layers)
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw)
    const { layers, ...rest } = parsed
    void layers
    const next = {
      ...DEFAULT_SETTINGS,
      ...rest,
      margins: { ...DEFAULT_SETTINGS.margins, ...(parsed.margins || {}) },
      layers: resolveLayers(parsed),
      extensions:
        parsed.extensions && typeof parsed.extensions === 'object' && !Array.isArray(parsed.extensions)
          ? parsed.extensions
          : {},
    }
    // Legacy paint keys are migrated into layers and dropped.
    delete next.fill
    delete next.strokeOn
    delete next.strokeWidth
    delete next.strokeColor
    delete next.textShadow
    delete next.fillOverlay
    if (!Array.isArray(next.layers) || next.layers.length === 0) {
      next.layers = normalizeTextLayers(DEFAULT_SETTINGS.layers)
    }
    return next
  } catch {
    return DEFAULT_SETTINGS
  }
}

// Normalize layers for states that bypass load() (e.g. DocumentMenu import
// of a raw settings object). Legacy paint keys migrate the same way.
export function normalizeSettingsLayers(settings) {
  if (!settings || typeof settings !== 'object') return normalizeTextLayers(DEFAULT_SETTINGS.layers)
  if (Array.isArray(settings.layers) && settings.layers.length > 0) {
    return normalizeTextLayers(settings.layers, DEFAULT_SETTINGS.layers)
  }
  if (hasLegacyPaint(settings)) {
    return legacyToTextLayers(settings, {
      glyphHeightIn: Number(settings.glyphHeight) || DEFAULT_SETTINGS.glyphHeight,
      fontId: settings.fontId || DEFAULT_SETTINGS.fontId,
    })
  }
  return normalizeTextLayers(DEFAULT_SETTINGS.layers)
}

export { createLayerId }

export function usePersistedSettings() {
  const [settings, setSettings] = useState(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      /* ignore quota / private mode */
    }
  }, [settings])

  const patch = useCallback((partial) => {
    setSettings((prev) =>
      typeof partial === 'function' ? partial(prev) : { ...prev, ...partial },
    )
  }, [])

  return [settings, patch]
}
