import { useCallback, useEffect, useState } from 'react'
import {
  compositionFromLegacy,
  defaultComposition,
  isLegacyTextSettings,
  normalizeComposition,
} from '../lib/composition.js'
import { normalizeBannerMode } from '../lib/document.js'

export const STORAGE_KEY = 'tile-banner-studio'

export const DEFAULT_SETTINGS = {
  composition: defaultComposition(),
  paperId: 'letter',
  orientation: 'landscape',
  rows: 1,
  bannerMode: 'horiz',
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
      ...rest
    } = parsed
    return {
      ...DEFAULT_SETTINGS,
      ...rest,
      composition,
      bannerMode: normalizeBannerMode(parsed.bannerMode ?? rest.bannerMode),
      margins: { ...DEFAULT_SETTINGS.margins, ...(parsed.margins || {}) },
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

  return [settings, patch]
}
