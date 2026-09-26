import { useEffect, useRef, useState } from 'react'
import { FONTS, FONT_GROUPS } from '../lib/layout.js'

const GROUPS = FONT_GROUPS.map((label) => ({
  label,
  fonts: FONTS.filter((f) => f.group === label),
})).filter((g) => g.fonts.length > 0)

const FLAT = GROUPS.flatMap((g) => g.fonts)
const INDEX_OF = new Map(FLAT.map((f, i) => [f.id, i]))

export function FontSelect({ fontId, onChange }) {
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const rootRef = useRef(null)
  const listRef = useRef(null)
  const current = FONTS.find((f) => f.id === fontId) || FONTS[0]

  useEffect(() => {
    if (!open) return
    setActive(INDEX_OF.get(fontId) ?? 0)
    const onPointer = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    return () => document.removeEventListener('pointerdown', onPointer)
  }, [open, fontId])

  useEffect(() => {
    if (!open || !listRef.current) return
    listRef.current
      .querySelector(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [open, active])

  const choose = (id) => {
    onChange({ fontId: id })
    setOpen(false)
  }

  const onKeyDown = (e) => {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        setOpen(true)
      }
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => (a + 1) % FLAT.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => (a - 1 + FLAT.length) % FLAT.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(FLAT[active].id)
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative" onKeyDown={onKeyDown}>
      <button
        type="button"
        role="combobox"
        aria-expanded={open}
        aria-controls="font-listbox"
        aria-activedescendant={open ? `font-opt-${FLAT[active].id}` : undefined}
        onClick={() => setOpen((o) => !o)}
        className="w-full bg-[#08080A] border border-[#43434E] rounded-[4px] px-3 py-2.5 text-left focus:outline-none focus:border-[#E3FF33]/60 flex items-center justify-between gap-2"
        style={{ fontFamily: `"${current.family}", Impact, sans-serif` }}
      >
        <span className="text-[16px] leading-none text-[#F0F0F2] truncate">
          {current.label}
        </span>
        <span aria-hidden="true" className="text-[#7A7A80] text-[10px] shrink-0">
          ▼
        </span>
      </button>
      {open && (
        <ul
          id="font-listbox"
          ref={listRef}
          role="listbox"
          aria-label="Font family"
          className="absolute z-50 left-0 right-0 top-full mt-1 max-h-64 overflow-y-auto bg-[#08080A] border border-[#43434E] rounded-[4px] p-1 shadow-[0_12px_40px_rgba(0,0,0,0.7)]"
        >
          {GROUPS.map((g) => (
            <li key={g.label} role="presentation">
              <div
                aria-hidden="true"
                className="flex items-center gap-2 px-3 pt-2 pb-1"
              >
                <span className="font-mono text-[9px] tracking-[0.14em] text-[#7A7A80] uppercase shrink-0">
                  {g.label}
                </span>
                <span className="flex-1 h-px bg-[#43434E]/50" />
              </div>
              {g.fonts.map((f) => {
                const i = INDEX_OF.get(f.id)
                return (
                  <button
                    id={`font-opt-${f.id}`}
                    key={f.id}
                    type="button"
                    role="option"
                    data-index={i}
                    aria-selected={f.id === fontId}
                    onClick={() => choose(f.id)}
                    onMouseEnter={() => setActive(i)}
                    className={`w-full text-left px-3 py-2 rounded-[3px] flex items-center justify-between gap-2 transition-colors ${
                      i === active ? 'bg-[#26262E]' : ''
                    }`}
                  >
                    <span
                      className="text-[17px] leading-tight truncate"
                      style={{
                        fontFamily: `"${f.family}", Impact, sans-serif`,
                        fontWeight: f.weight,
                        color: f.id === fontId ? '#E3FF33' : '#F0F0F2',
                      }}
                    >
                      {f.label}
                    </span>
                    {f.id === fontId && (
                      <span aria-hidden="true" className="text-[#E3FF33] text-[12px] shrink-0">
                        ✓
                      </span>
                    )}
                  </button>
                )
              })}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
