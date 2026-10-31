import { useEffect, useRef, useState } from 'react'
import { MAX_GLYPH_HEIGHT, MIN_GLYPH_HEIGHT } from '../lib/composition.js'
import { UNITS, formatMeasure, unitSpec, unitToInches } from '../lib/units.js'

const PRESETS = [
  { id: 'quarter', label: '1/4', fraction: 1 / 4 },
  { id: 'third', label: '1/3', fraction: 1 / 3 },
  { id: 'half', label: '1/2', fraction: 1 / 2 },
  { id: 'full', label: '1', fraction: 1 },
]

function clampHeight(inches) {
  const next = Math.min(MAX_GLYPH_HEIGHT, Math.max(MIN_GLYPH_HEIGHT, inches))
  return Math.round(next * 100) / 100
}

export function FontSizeControl({
  glyphHeight,
  canvasHeightIn,
  pageUnit = 'in',
  disabled = false,
  onChange,
}) {
  const [forcedCustom, setForcedCustom] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [entryUnit, setEntryUnit] = useState(null)
  const rootRef = useRef(null)
  const inputRef = useRef(null)
  const activeUnit = unitSpec(entryUnit || pageUnit).id
  const matched = PRESETS.find(
    (preset) => Math.abs(glyphHeight - canvasHeightIn * preset.fraction) < 0.02,
  )
  const custom = forcedCustom || !matched
  const [text, setText] = useState(() => formatMeasure(glyphHeight || 0, activeUnit))

  useEffect(() => {
    if (inputRef.current === document.activeElement) return
    setText(formatMeasure(glyphHeight || 0, activeUnit))
  }, [glyphHeight, activeUnit])

  useEffect(() => {
    if (!menuOpen) return undefined
    const onPointer = (event) => {
      if (rootRef.current?.contains(event.target)) return
      setMenuOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [menuOpen])

  const applyInches = (inches) => {
    if (disabled) return
    onChange?.(clampHeight(inches))
  }

  const commitText = () => {
    const raw = unitToInches(text, activeUnit)
    if (!Number.isFinite(raw) || raw <= 0) {
      setText(formatMeasure(glyphHeight || 0, activeUnit))
      return
    }
    applyInches(raw)
  }

  const btn = (selected) =>
    `pro-bevel h-7 px-2 rounded-[3px] border font-mono text-[11px] tracking-[0.06em] transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
      selected
        ? 'bg-[#E3FF33] text-black border-[#E3FF33] font-bold'
        : 'bg-[#26262E] text-[#7A7A80] border-[#43434E] hover:text-[#F0F0F2] hover:border-[#5E5E69]'
    }`

  return (
    <div className="flex items-center gap-1 shrink-0">
      {PRESETS.map((preset) => (
        <button
          key={preset.id}
          type="button"
          disabled={disabled || !(canvasHeightIn > 0)}
          aria-pressed={!custom && matched?.id === preset.id}
          title={`Set type to ${preset.label} of the canvas height`}
          onClick={() => {
            setForcedCustom(false)
            setMenuOpen(false)
            applyInches(canvasHeightIn * preset.fraction)
          }}
          className={btn(!custom && matched?.id === preset.id)}
        >
          {preset.label}
        </button>
      ))}
      <div ref={rootRef} className="relative">
        <button
          type="button"
          disabled={disabled}
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-pressed={custom}
          title="Custom type height"
          onClick={() => {
            setForcedCustom(true)
            setMenuOpen((open) => !open)
          }}
          className={`${btn(custom)} inline-flex items-center gap-1`}
        >
          Custom
          <span aria-hidden="true" className="text-[10px]">
            ▼
          </span>
        </button>
        {menuOpen ? (
          <div
            role="menu"
            aria-label="Custom height unit"
            className="absolute left-0 top-[calc(100%+6px)] z-40 w-[220px] rounded-[4px] border border-[#43434E] bg-[#16161c] p-1.5 shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
          >
            <p className="px-1 pb-1 font-mono text-[8px] tracking-[0.14em] text-[#7A7A80] uppercase">
              Unit
            </p>
            <div role="group" aria-label="Custom height unit" className="flex gap-0.5">
              {UNITS.map((entry) => {
                const selected = entry.id === activeUnit
                return (
                  <button
                    key={entry.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setEntryUnit(entry.id)}
                    className={`h-6 flex-1 rounded-[3px] font-mono text-[9px] tracking-[0.04em] uppercase ${
                      selected
                        ? 'bg-[#E3FF33] text-black font-bold'
                        : 'bg-[#08080A] text-[#9A9AA2] hover:text-[#F0F0F2]'
                    }`}
                  >
                    {entry.label}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
      {custom ? (
        <label className="inline-flex h-7 items-center rounded-[3px] border border-[#43434E] bg-[#26262E] focus-within:border-[#E3FF33]">
          <input
            ref={inputRef}
            aria-label="Custom font height"
            inputMode="decimal"
            disabled={disabled}
            value={text}
            onChange={(event) => setText(event.target.value.replace(/[^\d.]/g, ''))}
            onBlur={commitText}
            onKeyDown={(event) => {
              if (event.key !== 'Enter') return
              event.preventDefault()
              event.currentTarget.blur()
            }}
            className="h-full w-14 bg-transparent px-2 text-center font-mono text-[11px] text-[#F0F0F2] focus:outline-none"
          />
          <span className="pr-2 font-mono text-[9px] tracking-[0.08em] text-[#7A7A80] uppercase">
            {unitSpec(activeUnit).label}
          </span>
        </label>
      ) : null}
    </div>
  )
}
