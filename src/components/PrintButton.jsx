import { useEffect, useRef, useState } from 'react'

const MARKS = [
  { key: 'printOverlap', label: 'Tape overlap' },
  { key: 'printTrim', label: 'Scissor edge guide' },
  { key: 'printNumbers', label: 'Sheet numbers' },
  { key: 'printCutMarks', label: 'Cut marks' },
]

export function PrintButton({
  disabled,
  onPrint,
  marks,
  onChange,
  fullWidth = false,
}) {
  const [open, setOpen] = useState(false)
  const [menuBox, setMenuBox] = useState(null)
  const rootRef = useRef(null)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!open) return
    const close = (event) => {
      const target = event.target
      if (rootRef.current?.contains(target) || menuRef.current?.contains(target)) return
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

  const toggleMenu = (event) => {
    const rect = event.currentTarget.parentElement.getBoundingClientRect()
    const width = Math.max(rect.width, 220)
    setMenuBox({
      top: rect.bottom + 6,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - width - 8)),
      width,
    })
    setOpen((value) => !value)
  }

  const height = fullWidth ? 'h-9' : 'h-8'
  const markCount = MARKS.filter((mark) => marks[mark.key]).length

  return (
    <div ref={rootRef} className={`relative inline-flex ${fullWidth ? 'w-full mt-3' : ''}`}>
      <button
        type="button"
        onClick={onPrint}
        disabled={disabled}
        className={`${height} ${fullWidth ? 'flex-1' : 'px-3'} rounded-l-[4px] bg-[#E3FF33] text-black font-mono text-[11px] font-bold tracking-[0.12em] uppercase disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110`}
      >
        Print{markCount > 0 ? ` + ${markCount}` : ''}
      </button>
      <button
        type="button"
        onClick={toggleMenu}
        disabled={disabled}
        aria-label="Print markings"
        aria-expanded={open}
        aria-haspopup="menu"
        className={`${height} w-8 rounded-r-[4px] bg-[#E3FF33] text-black border-l border-black/20 font-mono text-[12px] disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110`}
      >
        ▾
      </button>
      {open && menuBox && (
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-50 rounded-[4px] border border-[#43434E] bg-[#121214] p-2 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
          style={{ top: menuBox.top, left: menuBox.left, width: menuBox.width }}
        >
          <div className="px-2 py-1 font-mono text-[9px] tracking-[0.12em] text-[#7A7A80] uppercase">
            Printed marks
          </div>
          {MARKS.map((mark) => (
            <label
              key={mark.key}
              className="flex items-center justify-between gap-3 px-2 py-1.5 rounded-[3px] hover:bg-[#26262E] cursor-pointer"
            >
              <span className="font-mono text-[11px] tracking-[0.08em] text-[#F0F0F2] uppercase">
                {mark.label}
              </span>
              <input
                type="checkbox"
                checked={Boolean(marks[mark.key])}
                onChange={() => onChange({ [mark.key]: !marks[mark.key] })}
                className="accent-[#E3FF33]"
              />
            </label>
          ))}
          <p className="px-2 pt-1 pb-1 font-mono text-[9px] leading-[1.4] text-[#5A5A60]">
            Checked marks print as ink. Screen guides stay on the preview only.
          </p>
        </div>
      )}
    </div>
  )
}
