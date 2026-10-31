import { useEffect, useRef, useState } from 'react'
import { MAX_SHEETS } from '../lib/composition.js'

const btn =
  'h-9 min-w-9 px-1 inline-flex items-center justify-center rounded-[3px] border bg-[#26262E] text-[#F0F0F2] border-[#43434E] hover:text-[#E3FF33] hover:border-[#E3FF33] disabled:opacity-30 disabled:hover:text-[#F0F0F2] disabled:hover:border-[#43434E]'

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

function IconButton({ title, disabled, onClick, children }) {
  return (
    <button type="button" className={btn} title={title} aria-label={title} disabled={disabled} onClick={onClick}>
      {children}
    </button>
  )
}

function Mark({ cx, cy, action }) {
  if (action === 'add') {
    return (
      <g fill="currentColor" stroke="none">
        <rect x={cx - 0.7} y={cy - 2.6} width={1.4} height={5.2} rx="0.2" />
        <rect x={cx - 2.6} y={cy - 0.7} width={5.2} height={1.4} rx="0.2" />
      </g>
    )
  }
  return <rect x={cx - 2.6} y={cy - 0.7} width={5.2} height={1.4} rx="0.2" fill="currentColor" stroke="none" />
}

function SheetEdgeIcon({ axis, edge, action }) {
  const horizontal = axis === 'x'
  const cells = [0, 1, 2].map((index) => {
    if (horizontal) {
      const w = 7
      const h = 14
      const gap = 1.4
      return { x: 1.2 + index * (w + gap), y: 2.2, w, h }
    }
    const w = 14
    const h = 7
    const gap = 1.4
    return { x: 2.2, y: 1.2 + index * (h + gap), w, h }
  })
  const target = edge === 'start' ? 0 : 2

  return (
    <svg
      width={horizontal ? 28 : 18}
      height={horizontal ? 18 : 28}
      viewBox={horizontal ? '0 0 28 18' : '0 0 18 28'}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.4"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {cells.map((cell, index) => {
        const acted = index === target
        const adding = acted && action === 'add'
        return (
          <g key={index}>
            <rect
              x={cell.x}
              y={cell.y}
              width={cell.w}
              height={cell.h}
              rx="0.8"
              fill={adding ? 'none' : 'currentColor'}
              fillOpacity={adding ? 0 : acted ? 0.08 : 0.22}
              strokeDasharray={adding ? '1.6 1.05' : undefined}
            />
            {acted ? <Mark cx={cell.x + cell.w / 2} cy={cell.y + cell.h / 2} action={action} /> : null}
          </g>
        )
      })}
    </svg>
  )
}

function AxisGroup({ label, fieldLabel, value, onCommit, before, after, orientation = 'horizontal' }) {
  const vertical = orientation === 'vertical'
  return (
    <div
      role="group"
      aria-label={label}
      className={
        vertical
          ? 'flex flex-col items-center gap-1 rounded-[4px] border border-[#43434E] bg-[#16161c] px-1 py-1.5'
          : 'inline-flex items-center gap-1 rounded-[4px] border border-[#43434E] bg-[#16161c] pl-2 pr-1 py-1'
      }
    >
      <span
        className={`font-mono text-[9px] tracking-[0.12em] text-[#7A7A80] uppercase shrink-0 ${
          vertical ? '' : 'pr-1'
        }`}
      >
        {label}
      </span>
      <div className={vertical ? 'flex flex-col items-center gap-1' : 'contents'}>{before}</div>
      <CountField label={fieldLabel} value={value} onCommit={onCommit} />
      <div className={vertical ? 'flex flex-col items-center gap-1' : 'contents'}>{after}</div>
    </div>
  )
}

export function SheetCountMenu({ cols, rows, sheetCount, onSetGrid }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

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

  const label = sheetCount > 0 ? `${cols}×${rows}` : String(sheetCount)

  return (
    <div ref={rootRef} className="relative hidden md:flex">
      <button
        type="button"
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Edit columns and rows"
        onClick={() => setOpen((value) => !value)}
        className="h-8 inline-flex items-center gap-2 rounded-l-[4px] border border-r-0 border-black bg-[#101014] px-2.5 shadow-[inset_0_2px_6px_rgba(0,0,0,0.55)] hover:bg-[#16161a]"
      >
        <span className="font-mono text-[9px] tracking-[0.14em] text-[#5E5E69] uppercase">Sheets</span>
        <span className="font-mono text-[11px] font-bold tracking-[0.08em] text-[#C8C8CE]">{label}</span>
        <span aria-hidden="true" className="font-mono text-[10px] leading-none text-[#5E5E69]">
          ▼
        </span>
      </button>
      {open ? (
        <div
          role="dialog"
          aria-label="Sheet grid"
          className="absolute left-0 top-[calc(100%+6px)] z-40 w-[168px] rounded-[4px] border border-[#43434E] bg-[#16161c] p-2 shadow-[0_12px_28px_rgba(0,0,0,0.45)]"
        >
          <div className="flex flex-col gap-1.5">
            {[
              { name: 'Columns', value: cols, commit: (next) => onSetGrid(next, rows) },
              { name: 'Rows', value: rows, commit: (next) => onSetGrid(cols, next) },
            ].map((field) => (
              <label key={field.name} className="flex items-center justify-between gap-2">
                <span className="font-mono text-[9px] tracking-[0.14em] text-[#7A7A80] uppercase">
                  {field.name}
                </span>
                <CountField label={field.name} value={field.value} onCommit={field.commit} />
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}

export function SheetColsControl({ cols, rows, onNudge, onSetGrid }) {
  const canAddCol = cols < MAX_SHEETS
  return (
    <AxisGroup
      label="Cols"
      fieldLabel="Columns"
      value={cols}
      orientation="vertical"
      onCommit={(next) => onSetGrid(next, rows)}
      before={
        <>
          <IconButton
            title="Remove a page from the left"
            disabled={cols <= 1}
            onClick={() => onNudge('x', 'left', -1)}
          >
            <SheetEdgeIcon axis="x" edge="start" action="remove" />
          </IconButton>
          <IconButton
            title="Add a page on the left"
            disabled={!canAddCol}
            onClick={() => onNudge('x', 'left', 1)}
          >
            <SheetEdgeIcon axis="x" edge="start" action="add" />
          </IconButton>
        </>
      }
      after={
        <>
          <IconButton
            title="Add a page on the right"
            disabled={!canAddCol}
            onClick={() => onNudge('x', 'right', 1)}
          >
            <SheetEdgeIcon axis="x" edge="end" action="add" />
          </IconButton>
          <IconButton
            title="Remove a page from the right"
            disabled={cols <= 1}
            onClick={() => onNudge('x', 'right', -1)}
          >
            <SheetEdgeIcon axis="x" edge="end" action="remove" />
          </IconButton>
        </>
      }
    />
  )
}

export function SheetRowsControl({ cols, rows, onNudge, onSetGrid }) {
  const canAddRow = rows < MAX_SHEETS
  return (
    <AxisGroup
      label="Rows"
      fieldLabel="Rows"
      value={rows}
      onCommit={(next) => onSetGrid(cols, next)}
      before={
        <>
          <IconButton
            title="Remove a page from the top"
            disabled={rows <= 1}
            onClick={() => onNudge('y', 'top', -1)}
          >
            <SheetEdgeIcon axis="y" edge="start" action="remove" />
          </IconButton>
          <IconButton
            title="Add a page on the top"
            disabled={!canAddRow}
            onClick={() => onNudge('y', 'top', 1)}
          >
            <SheetEdgeIcon axis="y" edge="start" action="add" />
          </IconButton>
        </>
      }
      after={
        <>
          <IconButton
            title="Add a page on the bottom"
            disabled={!canAddRow}
            onClick={() => onNudge('y', 'bottom', 1)}
          >
            <SheetEdgeIcon axis="y" edge="end" action="add" />
          </IconButton>
          <IconButton
            title="Remove a page from the bottom"
            disabled={rows <= 1}
            onClick={() => onNudge('y', 'bottom', -1)}
          >
            <SheetEdgeIcon axis="y" edge="end" action="remove" />
          </IconButton>
        </>
      }
    />
  )
}
