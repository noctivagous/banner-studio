import { useEffect, useId, useRef, useState } from 'react'
import {
  CUSTOM_PAPER_ID,
  PAPER_MAX_IN,
  PAPER_MIN_IN,
  PAPERS,
  matchPaper,
  paperFromPage,
  sheetSize,
} from '../lib/paper.js'
import { LandscapeIcon, PortraitIcon } from './icons.jsx'
import { UNITS, formatMeasure, formatSize, unitSpec, unitToInches } from '../lib/units.js'

const ORIENTATIONS = [
  { id: 'landscape', label: 'Landscape', Icon: LandscapeIcon },
  { id: 'portrait', label: 'Portrait', Icon: PortraitIcon },
]

export function PaperSizeMenu({ paperId, orientation, customPaper, unit = 'in', onChange }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const menuId = useId()
  const size = sheetSize(paperId, orientation, customPaper)
  const active = unitSpec(unit)
  const [widthText, setWidthText] = useState(formatMeasure(size.pageW, active.id))
  const [heightText, setHeightText] = useState(formatMeasure(size.pageH, active.id))

  useEffect(() => {
    setWidthText(formatMeasure(size.pageW, active.id))
    setHeightText(formatMeasure(size.pageH, active.id))
  }, [size.pageW, size.pageH, active.id])

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (event) => {
      if (rootRef.current?.contains(event.target)) return
      setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const commitManual = () => {
    const pageW = unitToInches(widthText, active.id)
    const pageH = unitToInches(heightText, active.id)
    if (!Number.isFinite(pageW) || !Number.isFinite(pageH) || pageW <= 0 || pageH <= 0) {
      setWidthText(formatMeasure(size.pageW, active.id))
      setHeightText(formatMeasure(size.pageH, active.id))
      return
    }
    const preset = matchPaper(pageW, pageH, orientation)
    if (preset) {
      onChange({ paperId: preset.id })
      return
    }
    const next = paperFromPage(pageW, pageH, orientation)
    if (!next) return
    onChange({ paperId: CUSTOM_PAPER_ID, customPaper: next })
  }

  return (
    <div className="inline-flex items-stretch">
    <div ref={rootRef} className="relative flex">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={menuId}
        title="Sheet size"
        onClick={() => setOpen((value) => !value)}
        className="group inline-flex items-center gap-1.5 h-8 px-3 rounded-l-[4px] border border-r-0 border-black bg-[#2b2b35] text-[11px] font-mono leading-none tracking-[0.12em] uppercase shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-8px_10px_-8px_rgba(0,0,0,0.7)] hover:border-[#5E5E69]"
      >
        <span className="text-[#5E5E69]">Sheet Size:</span>
        <span className="text-[#C8C8CE] group-hover:text-[#F0F0F2]">
          {formatSize(size.pageW, size.pageH, active.id)}
        </span>
        <span aria-hidden="true" className="text-[10px] leading-none text-[#9A9AA2]">
          ▼
        </span>
      </button>
      {open ? (
        <div
          id={menuId}
          role="dialog"
          aria-label="Paper size"
          className="absolute left-0 top-[calc(100%+6px)] z-40 w-[248px] rounded-[4px] border border-[#43434E] bg-[#16161c] p-1.5 shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
        >
          <div className="px-1.5 pb-1.5">
            <p className="px-0.5 pb-1 font-mono text-[8px] tracking-[0.14em] text-[#7A7A80] uppercase">
              Unit
            </p>
            <div role="group" aria-label="Measurement unit" className="flex gap-0.5">
              {UNITS.map((entry) => {
                const selected = entry.id === active.id
                return (
                  <button
                    key={entry.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => onChange({ unit: entry.id })}
                    className={`h-6 flex-1 rounded-[3px] font-mono text-[9px] tracking-[0.06em] uppercase ${
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
          <div role="listbox" aria-label="Paper sizes" className="flex flex-col">
            {PAPERS.map((paper) => {
              const oriented = sheetSize(paper.id, orientation)
              const selected = paperId === paper.id
              return (
                <button
                  key={paper.id}
                  type="button"
                  role="option"
                  aria-selected={selected}
                  onClick={() => {
                    onChange({ paperId: paper.id })
                    setOpen(false)
                  }}
                  className={`flex items-center justify-between gap-3 h-7 px-2 rounded-[3px] font-mono text-[10px] tracking-[0.08em] uppercase ${
                    selected
                      ? 'bg-[#E3FF33] text-black font-bold'
                      : 'text-[#F0F0F2] hover:bg-[#26262E]'
                  }`}
                >
                  <span>{paper.label}</span>
                  <span className={selected ? 'text-black' : 'text-[#7A7A80]'}>
                    {formatMeasure(oriented.pageW, active.id)}×{formatMeasure(oriented.pageH, active.id)}
                  </span>
                </button>
              )
            })}
          </div>
          <div className="mt-1.5 pt-1.5 border-t border-black">
            <div className="px-2 pb-1 font-mono text-[8px] tracking-[0.14em] text-[#7A7A80] uppercase">
              Custom {active.label}
            </div>
            <form
              className="grid grid-cols-2 gap-1.5 px-1 pb-1"
              onSubmit={(event) => {
                event.preventDefault()
                commitManual()
                setOpen(false)
              }}
            >
              <label className="flex flex-col gap-0.5">
                <span className="px-0.5 font-mono text-[8px] tracking-[0.12em] text-[#7A7A80] uppercase">
                  Width
                </span>
                <input
                  aria-label={`Paper width in ${active.label}`}
                  inputMode="decimal"
                  value={widthText}
                  onChange={(event) => setWidthText(event.target.value.replace(/[^\d.]/g, ''))}
                  onBlur={(event) => {
                    if (rootRef.current?.contains(event.relatedTarget)) return
                    commitManual()
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return
                    event.preventDefault()
                    commitManual()
                    setOpen(false)
                  }}
                  className="h-7 w-full rounded-[3px] border border-[#43434E] bg-[#08080A] px-1.5 text-center font-mono text-[11px] text-[#F0F0F2] focus:outline-none focus:border-[#E3FF33]"
                />
              </label>
              <label className="flex flex-col gap-0.5">
                <span className="px-0.5 font-mono text-[8px] tracking-[0.12em] text-[#7A7A80] uppercase">
                  Height
                </span>
                <input
                  aria-label={`Paper height in ${active.label}`}
                  inputMode="decimal"
                  value={heightText}
                  onChange={(event) => setHeightText(event.target.value.replace(/[^\d.]/g, ''))}
                  onBlur={(event) => {
                    if (rootRef.current?.contains(event.relatedTarget)) return
                    commitManual()
                  }}
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return
                    event.preventDefault()
                    commitManual()
                    setOpen(false)
                  }}
                  className="h-7 w-full rounded-[3px] border border-[#43434E] bg-[#08080A] px-1.5 text-center font-mono text-[11px] text-[#F0F0F2] focus:outline-none focus:border-[#E3FF33]"
                />
              </label>
              <p className="col-span-2 px-0.5 font-mono text-[8px] tracking-[0.06em] text-[#5A5A60]">
                {formatMeasure(PAPER_MIN_IN, active.id)}–{formatMeasure(PAPER_MAX_IN, active.id)} {active.label}. Enter applies.
              </p>
            </form>
          </div>
        </div>
      ) : null}
    </div>
    <div
      role="group"
      aria-label="Sheet orientation"
      className="inline-flex h-8 items-center rounded-r-[4px] rounded-l-none border border-black bg-[#050506] p-0.5 gap-0.5 shadow-[inset_0_2px_5px_rgba(0,0,0,0.65),0_1px_0_rgba(255,255,255,0.05)]"
    >
      {ORIENTATIONS.map(({ id, label, Icon }) => {
        const selected = orientation === id
        return (
          <button
            key={id}
            type="button"
            aria-label={label}
            aria-pressed={selected}
            title={label}
            onClick={() => onChange({ orientation: id })}
            className={`h-7 w-8 inline-flex items-center justify-center rounded-[3px] transition-colors ${
              selected
                ? 'bg-[#E3FF33] text-black'
                : 'text-[#7A7A80] hover:text-[#F0F0F2]'
            }`}
          >
            <Icon size={14} />
          </button>
        )
      })}
    </div>
    </div>
  )
}
