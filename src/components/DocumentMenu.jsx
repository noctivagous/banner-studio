import { useEffect, useRef, useState } from 'react'
import { exportDocument, importDocument } from '../lib/document.js'
import { DEFAULT_SETTINGS } from '../hooks/usePersistedSettings.js'

export function DocumentMenu({ settings, onImport }) {
  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [menuBox, setMenuBox] = useState(null)
  const rootRef = useRef(null)
  const menuRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (event) => {
      if (rootRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return
      setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const toggle = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const width = 220
    setMenuBox({
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
      width,
    })
    setError('')
    setOpen((value) => !value)
  }

  const download = () => {
    const documentJson = exportDocument(settings)
    const blob = new Blob([JSON.stringify(documentJson, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'banner-studio.json'
    link.click()
    URL.revokeObjectURL(url)
    setOpen(false)
  }

  const onFile = async (event) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    try {
      const text = await file.text()
      const next = importDocument(text, DEFAULT_SETTINGS)
      onImport(next)
      setOpen(false)
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not import that file.')
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-label="Document menu"
        aria-expanded={open}
        aria-haspopup="menu"
        className="h-8 w-8 rounded-[4px] border border-[#43434E] bg-[#26262E] text-[#F0F0F2] font-mono text-[14px] tracking-[0.14em] hover:border-[#5E5E69]"
      >
        …
      </button>
      {open && menuBox && (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-50 rounded-[4px] border border-[#43434E] bg-[#121214] p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
          style={{ top: menuBox.top, left: menuBox.left, width: menuBox.width }}
        >
          <button
            type="button"
            role="menuitem"
            onClick={download}
            className="w-full text-left px-2.5 py-2 rounded-[3px] font-mono text-[11px] tracking-[0.08em] text-[#F0F0F2] uppercase hover:bg-[#26262E]"
          >
            Export
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => fileRef.current?.click()}
            className="w-full text-left px-2.5 py-2 rounded-[3px] font-mono text-[11px] tracking-[0.08em] text-[#F0F0F2] uppercase hover:bg-[#26262E]"
          >
            Import
          </button>
          {error && (
            <p className="px-2.5 py-1.5 font-mono text-[10px] leading-[1.4] text-[#E3FF33]">{error}</p>
          )}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={onFile}
      />
    </div>
  )
}
