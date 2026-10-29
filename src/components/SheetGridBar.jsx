import { useEffect, useState } from 'react'
import { MAX_SHEETS } from '../lib/composition.js'

const btn =
  'h-7 min-w-7 px-1.5 rounded-[3px] border font-mono text-[10px] tracking-[0.06em] leading-none bg-[#26262E] text-[#F0F0F2] border-[#43434E] hover:text-[#E3FF33] hover:border-[#E3FF33] disabled:opacity-30 disabled:hover:text-[#F0F0F2] disabled:hover:border-[#43434E]'

function CountField({ label, value, onCommit }) {
  const [text, setText] = useState(String(value))
  useEffect(() => {
    setText(String(value))
  }, [value])

  const commit = () => {
    const next = Math.min(MAX_SHEETS, Math.max(1, Math.round(Number(text)) || value))
    setText(String(next))
    if (next !== value) onCommit(next)
  }

  return (
    <input
      aria-label={label}
      inputMode="numeric"
      value={text}
      onChange={(event) => setText(event.target.value.replace(/[^\d]/g, ''))}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === 'Enter') event.currentTarget.blur()
      }}
      className="h-7 w-11 rounded-[3px] border border-[#43434E] bg-[#08080A] px-1.5 text-center font-mono text-[11px] tracking-[0.08em] text-[#F0F0F2] focus:outline-none focus:border-[#E3FF33]"
    />
  )
}

function IconButton({ label, title, disabled, onClick }) {
  return (
    <button type="button" className={btn} title={title} aria-label={title} disabled={disabled} onClick={onClick}>
      {label}
    </button>
  )
}

function AxisGroup({ label, fieldLabel, value, onCommit, before, after }) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex items-center gap-1 rounded-[4px] border border-[#43434E] bg-[#16161c] pl-2 pr-1 py-1"
    >
      <span className="font-mono text-[9px] tracking-[0.12em] text-[#7A7A80] uppercase shrink-0 pr-1">
        {label}
      </span>
      {before}
      <CountField label={fieldLabel} value={value} onCommit={onCommit} />
      {after}
    </div>
  )
}

export function SheetGridBar({ cols, rows, onNudge, onSetGrid }) {
  const canAddCol = cols < MAX_SHEETS
  const canAddRow = rows < MAX_SHEETS
  return (
    <div className="pro-bar min-h-[46px] bg-[#101014] flex items-center justify-between gap-3 px-3 shrink-0 border-t border-black">
      <div className="flex items-center gap-2 min-w-0 flex-wrap py-1.5">
        <span className="font-mono text-[10px] tracking-[0.12em] text-[#7A7A80] uppercase shrink-0">
          Pages
        </span>
        <AxisGroup
          label="Cols"
          fieldLabel="Columns"
          value={cols}
          onCommit={(next) => onSetGrid(next, rows)}
          before={
            <>
              <IconButton
                label="−←"
                title="Remove a page from the left"
                disabled={cols <= 1}
                onClick={() => onNudge('x', 'left', -1)}
              />
              <IconButton
                label="+←"
                title="Add a page on the left"
                disabled={!canAddCol}
                onClick={() => onNudge('x', 'left', 1)}
              />
            </>
          }
          after={
            <>
              <IconButton
                label="+→"
                title="Add a page on the right"
                disabled={!canAddCol}
                onClick={() => onNudge('x', 'right', 1)}
              />
              <IconButton
                label="−→"
                title="Remove a page from the right"
                disabled={cols <= 1}
                onClick={() => onNudge('x', 'right', -1)}
              />
            </>
          }
        />
        <AxisGroup
          label="Rows"
          fieldLabel="Rows"
          value={rows}
          onCommit={(next) => onSetGrid(cols, next)}
          before={
            <>
              <IconButton
                label="−↑"
                title="Remove a page from the top"
                disabled={rows <= 1}
                onClick={() => onNudge('y', 'top', -1)}
              />
              <IconButton
                label="+↑"
                title="Add a page on the top"
                disabled={!canAddRow}
                onClick={() => onNudge('y', 'top', 1)}
              />
            </>
          }
          after={
            <>
              <IconButton
                label="+↓"
                title="Add a page on the bottom"
                disabled={!canAddRow}
                onClick={() => onNudge('y', 'bottom', 1)}
              />
              <IconButton
                label="−↓"
                title="Remove a page from the bottom"
                disabled={rows <= 1}
                onClick={() => onNudge('y', 'bottom', -1)}
              />
            </>
          }
        />
      </div>
      <span className="hidden lg:block font-mono text-[10px] tracking-[0.1em] text-[#7A7A80] uppercase shrink-0">
        Frame = printable area
      </span>
    </div>
  )
}
