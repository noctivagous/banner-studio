import { useCallback, useEffect, useState } from 'react'

export const STORAGE_KEY = 'tile-banner-studio'

export const DEFAULT_SETTINGS = {
  copy: 'Open House',
  fontId: 'anton',
  glyphHeight: 4.5,
  lineHeight: 0.85,
  letterSpacing: 0.02,
  transform: 'asIs',
  fill: '#000000',
  strokeOn: false,
  strokeWidth: 0.02,
  strokeColor: '#000000',
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

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_SETTINGS
    const parsed = JSON.parse(raw)
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
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
