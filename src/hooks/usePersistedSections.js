import { useCallback, useState } from 'react'

export const SECTIONS_KEY = 'tile-banner-studio:sections'

export function readStored(storage, sectionId, defaultOpen) {
  try {
    const raw = storage.getItem(SECTIONS_KEY)
    if (!raw) return defaultOpen
    const map = JSON.parse(raw)
    return typeof map?.[sectionId] === 'boolean' ? map[sectionId] : defaultOpen
  } catch {
    return defaultOpen
  }
}

export function writeStored(storage, sectionId, value) {
  const raw = storage.getItem(SECTIONS_KEY)
  const parsed = raw ? JSON.parse(raw) : {}
  const map = parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {}
  storage.setItem(SECTIONS_KEY, JSON.stringify({ ...map, [sectionId]: value }))
}

/* Per-accordion open state. With a sectionId the value persists across
   reloads (merged into one stored map so sections never clobber each
   other); without one it stays in memory for the session. */
export function useSectionOpen(sectionId, defaultOpen = true) {
  const [open, setOpenState] = useState(() =>
    sectionId == null ? defaultOpen : readStored(localStorage, sectionId, defaultOpen),
  )

  const setOpen = useCallback(
    (next) => {
      setOpenState((prev) => {
        const value = typeof next === 'function' ? next(prev) : next
        if (sectionId != null) {
          try {
            writeStored(localStorage, sectionId, value)
          } catch {
            /* ignore quota / private mode */
          }
        }
        return value
      })
    },
    [sectionId],
  )

  return [open, setOpen]
}
