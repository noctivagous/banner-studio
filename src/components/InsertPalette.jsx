import { useEffect, useRef, useState } from 'react'

const SHAPES = [
  {
    id: 'rect',
    label: 'Rectangle',
    path: <rect x="2" y="3.5" width="12" height="9" rx="0.6" />,
  },
  {
    id: 'round-rect',
    label: 'Rounded rectangle',
    path: <rect x="2" y="3.5" width="12" height="9" rx="2.4" />,
  },
  {
    id: 'ellipse',
    label: 'Ellipse',
    path: <ellipse cx="8" cy="8" rx="6" ry="4.2" />,
  },
  {
    id: 'triangle',
    label: 'Triangle',
    path: <path d="M8 2.4 14.2 13.6H1.8Z" />,
  },
  {
    id: 'diamond',
    label: 'Diamond',
    path: <path d="M8 1.8 14.2 8 8 14.2 1.8 8Z" />,
  },
  {
    id: 'star',
    label: 'Star',
    path: (
      <path d="M8 1.6 9.7 6.1h4.7L10.6 8.9l1.6 4.5L8 10.4 3.8 13.4l1.6-4.5L1.6 6.1h4.7Z" />
    ),
  },
  {
    id: 'hexagon',
    label: 'Hexagon',
    path: <path d="M5 2.2h6L14.2 8 11 13.8H5L1.8 8Z" />,
  },
  {
    id: 'line',
    label: 'Line',
    path: <path d="M2.2 13.2 13.8 2.8" strokeLinecap="round" />,
  },
]

function ShapeGlyph({ shape, size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {shape.path}
    </svg>
  )
}

function TextGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.3" aria-hidden="true">
      <path d="M2.2 3.2h9.6M7 3.2v8" strokeLinecap="round" />
    </svg>
  )
}

export function InsertPalette({ onInsertText, textDisabled = false }) {
  const [open, setOpen] = useState(false)
  const [shapeId, setShapeId] = useState(SHAPES[0].id)
  const rootRef = useRef(null)
  const shape = SHAPES.find((entry) => entry.id === shapeId) || SHAPES[0]

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

  return (
    <div className="ml-auto flex items-center gap-1.5 shrink-0">
      <div ref={rootRef} className="relative">
        <button
          type="button"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label="Insert shape"
          title="Shape"
          onClick={() => setOpen((value) => !value)}
          className="pro-bevel h-7 pl-2 pr-1.5 inline-flex items-center gap-1.5 rounded-[3px] border border-[#43434E] bg-[#26262E] font-mono text-[11px] tracking-[0.08em] uppercase text-[#F0F0F2] hover:border-[#5E5E69]"
        >
          <ShapeGlyph shape={shape} />
          Shape
          <span aria-hidden="true" className="text-[10px] text-[#7A7A80]">
            ▼
          </span>
        </button>
        {open ? (
          <div
            role="menu"
            aria-label="Shapes"
            className="absolute right-0 top-[calc(100%+6px)] z-40 w-[188px] rounded-[4px] border border-[#43434E] bg-[#16161c] p-1.5 shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
          >
            <div className="grid grid-cols-4 gap-1">
              {SHAPES.map((entry) => {
                const selected = entry.id === shapeId
                return (
                  <button
                    key={entry.id}
                    type="button"
                    role="menuitem"
                    aria-label={entry.label}
                    title={entry.label}
                    aria-pressed={selected}
                    onClick={() => {
                      setShapeId(entry.id)
                      setOpen(false)
                    }}
                    className={`h-10 w-10 inline-flex items-center justify-center rounded-[3px] border ${
                      selected
                        ? 'bg-[#E3FF33] text-black border-[#E3FF33]'
                        : 'bg-[#08080A] text-[#F0F0F2] border-[#43434E] hover:border-[#5E5E69]'
                    }`}
                  >
                    <ShapeGlyph shape={entry} size={18} />
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
      <button
        type="button"
        aria-label="Insert text"
        title="Text"
        disabled={textDisabled}
        onClick={onInsertText}
        className="pro-bevel h-7 px-2 inline-flex items-center gap-1.5 rounded-[3px] border border-[#43434E] bg-[#26262E] font-mono text-[11px] tracking-[0.08em] uppercase text-[#F0F0F2] hover:border-[#5E5E69] disabled:opacity-40 disabled:cursor-not-allowed"
      >
        <TextGlyph />
        Text
      </button>
    </div>
  )
}
