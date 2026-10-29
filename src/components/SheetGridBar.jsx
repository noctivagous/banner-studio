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
      className="h-7 w-11 rounded-[3px] border border-[#43434E] bg-[#050506] px-1.5 text-center font-mono text-[11px] tracking-[0.08em] text-[#F0F0F2] focus:outline-none focus:border-[#E3FF33]"
    />
  )
}

function EdgeButtons({ addLabel, removeLabel, addTitle, removeTitle, onAdd, onRemove, canAdd, canRemove }) {
  return (
    <div className="inline-flex items-center gap-0.5">
      <button type="button" className={btn} title={removeTitle} aria-label={removeLabel} disabled={!canRemove} onClick={onRemove}>
        {removeLabel}
      </button>
      <button type="button" className={btn} title={addTitle} aria-label={addLabel} disabled={!canAdd} onClick={onAdd}>
        {addLabel}
      </button>
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
        <EdgeButtons
          removeLabel="−←"
          addLabel="+←"
          removeTitle="Remove a page from the left"
          addTitle="Add a page on the left"
          canRemove={cols > 1}
          canAdd={canAddCol}
          onRemove={() => onNudge('x', 'left', -1)}
          onAdd={() => onNudge('x', 'left', 1)}
        />
        <EdgeButtons
          removeLabel="−↑"
          addLabel="+↑"
          removeTitle="Remove a page from the top"
          addTitle="Add a page on the top"
          canRemove={rows > 1}
          canAdd={canAddRow}
          onRemove={() => onNudge('y', 'top', -1)}
          onAdd={() => onNudge('y', 'top', 1)}
        />
        <div className="inline-flex items-center gap-1.5">
          <CountField label="Rows" value={rows} onCommit={(next) => onSetGrid(cols, next)} />
          <span className="font-mono text-[11px] text-[#7A7A80]">×</span>
          <CountField label="Columns" value={cols} onCommit={(next) => onSetGrid(next, rows)} />
        </div>
        <EdgeButtons
          removeLabel="−↓"
          addLabel="+↓"
          removeTitle="Remove a page from the bottom"
          addTitle="Add a page on the bottom"
          canRemove={rows > 1}
          canAdd={canAddRow}
          onRemove={() => onNudge('y', 'bottom', -1)}
          onAdd={() => onNudge('y', 'bottom', 1)}
        />
        <EdgeButtons
          removeLabel="−→"
          addLabel="+→"
          removeTitle="Remove a page from the right"
          addTitle="Add a page on the right"
          canRemove={cols > 1}
          canAdd={canAddCol}
          onRemove={() => onNudge('x', 'right', -1)}
          onAdd={() => onNudge('x', 'right', 1)}
        />
      </div>
      <span className="hidden lg:block font-mono text-[10px] tracking-[0.1em] text-[#7A7A80] uppercase shrink-0">
        Frame = printable area
      </span>
    </div>
  )
}
