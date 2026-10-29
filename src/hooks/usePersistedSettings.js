import { useCallback, useEffect, useState } from 'react'
import {
  compositionFromLegacy,
  defaultComposition,
  isLegacyTextSettings,
  normalizeComposition,
} from '../lib/composition.js'
import { normalizeBannerMode } from '../lib/document.js'
import { JOIN_OVERLAP_TAPE, normalizeJoin } from '../lib/layout.js'

export const STORAGE_KEY = 'tile-banner-studio'

export const DEFAULT_SETTINGS = {
  composition: defaultComposition(),
  paperId: 'letter',
  orientation: 'landscape',
  cols: 2,
  rows: 1,
  bannerMode: 'horiz',
  contentKind: 'text',
  margins: { top: 0.25, bottom: 0.25, left: 0.25, right: 0.25 },
  overlap: 0.5,
  join: JOIN_OVERLAP_TAPE,
  showTrim: true,
  showSafe: true,
  showTape: true,
  showNumbers: true,
  showCutMarks: false,
  printTrim: true,
  printNumbers: false,
  printCutMarks: false,
  zoom: 1,
  scaleToFit: true,
  extensions: {},
}

export function resetDocumentSettings() {
  return {
    ...DEFAULT_SETTINGS,
    composition: defaultComposition(),
    margins: { ...DEFAULT_SETTINGS.margins },
    extensions: {},
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw)
    const composition = parsed.composition
      ? normalizeComposition(parsed.composition, DEFAULT_SETTINGS.composition)
      : isLegacyTextSettings(parsed)
        ? compositionFromLegacy(parsed)
        : DEFAULT_SETTINGS.composition
    const {
      copy: _copy,
      fontId: _fontId,
      glyphHeight: _glyphHeight,
      lineHeight: _lineHeight,
      letterSpacing: _letterSpacing,
      transform: _transform,
      layers: _layers,
      align: _align,
      printOverlap: _printOverlap,
      ...rest
    } = parsed
    return {
      ...DEFAULT_SETTINGS,
      ...rest,
      composition,
      cols: Number.isInteger(parsed.cols) && parsed.cols >= 1 ? parsed.cols : undefined,
      rows: Number.isInteger(parsed.rows) && parsed.rows >= 1 ? parsed.rows : undefined,
      bannerMode: normalizeBannerMode(parsed.bannerMode ?? rest.bannerMode),
      margins: { ...DEFAULT_SETTINGS.margins, ...(parsed.margins || {}) },
      join: normalizeJoin(rest.join, _printOverlap),
      extensions:
        parsed.extensions && typeof parsed.extensions === 'object' && !Array.isArray(parsed.extensions)
          ? parsed.extensions
          : {},
    }
  } catch {
    return DEFAULT_SETTINGS
  }
}

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

  const reset = useCallback(() => {
    setSettings(resetDocumentSettings())
  }, [])

  return [settings, patch, reset]
}
