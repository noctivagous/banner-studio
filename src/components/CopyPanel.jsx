import { useEffect } from 'react'
import {
  addCopyLine,
  canAddCopyLine,
  duplicateCopyLine,
  findNode,
  fontOf,
  getStack,
  lineText,
  moveCopyLine,
  removeCopyLine,
  withAlignMode,
  withLine,
} from '../lib/composition.js'
import { ParamSection } from './ParamSection.jsx'
import { SectionSpine, ZoneHeader } from './SectionChrome.jsx'
import { SegmentControl } from './SegmentControl.jsx'
import { CopyIcon } from './icons.jsx'

const rowBtn =
  'w-6 h-6 rounded-[3px] border border-transparent text-[#7A7A80] hover:text-white hover:border-[#43434E] disabled:opacity-25 disabled:hover:text-[#7A7A80] disabled:hover:border-transparent font-mono text-[11px] leading-none flex items-center justify-center'

const TREE_TINT = {
  container: 'bg-[#2e2e3a]',
  stack: 'bg-[#26262f]',
  line: 'bg-[#1e1e27]',
}

function TreeRow({ selected, indent = 0, onClick, label, hint, kind = 'line', media, badge, children }) {
  return (
    <div
      role="option"
      aria-label={label}
      aria-selected={selected}
      onClick={onClick}
      className={`flex items-center gap-1.5 px-1.5 py-1.5 rounded-[3px] border cursor-pointer transition-colors ${
        selected
          ? 'bg-[var(--ctl)] border-[#E3FF33]'
          : `${TREE_TINT[kind] || TREE_TINT.line} border-black shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] hover:border-[#5E5E69]`
      }`}
      style={{ marginLeft: indent }}
    >
      {media}
      <span className="flex-1 min-w-0 font-mono text-[11px] tracking-[0.04em] text-[#F0F0F2] truncate uppercase">
        {label}
      </span>
      {selected && badge && (
        <span
          data-inspector-kind={kind}
          className="px-1.5 py-0.5 rounded-[3px] bg-[#E3FF33] text-black font-mono text-[8px] font-bold tracking-[0.1em] uppercase shrink-0"
        >
          {badge}
        </span>
      )}
      {hint && (
        <span className="font-mono text-[9px] text-[#7A7A80] uppercase shrink-0">{hint}</span>
      )}
      {children}
    </div>
  )
}

function editorInkIsLight(hex) {
  if (typeof hex !== 'string') return true
  const match = hex.trim().match(/^#([0-9a-fA-F]{6})$/)
  if (!match) return true
  const value = parseInt(match[1], 16)
  const r = (value >> 16) & 0xff
  const g = (value >> 8) & 0xff
  const b = value & 0xff
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255 > 0.55
}

function StackLineInput({ line, index, align, selected, onSelect, onPatch }) {
  const font = fontOf(line)
  const visible = (line.layers || []).filter((layer) => layer.visible !== false)
  const front = visible[visible.length - 1] ?? line.layers?.[0]
  const ink = front?.overlayOn ? '#F0F0F2' : front?.fill || '#FFFFFF'
  const paper = editorInkIsLight(ink) ? '#08080A' : '#FFFFFF'
  return (
    <div
      onClick={() => onSelect({ kind: 'line', id: line.id })}
      className={`relative rounded-[4px] border transition-colors cursor-text ${
        selected ? 'border-[#E3FF33]' : 'border-[#43434E] hover:border-[#5E5E69]'
      }`}
    >
      <input
        value={line.copy}
        onFocus={() => onSelect({ kind: 'line', id: line.id })}
        onChange={(e) => onPatch(line.id, { copy: e.target.value.replace(/\n/g, ' ') })}
        placeholder={`LINE ${index + 1}`}
        spellCheck={false}
        aria-label={lineText(line) || `Line ${index + 1}`}
        className="w-full rounded-[4px] px-3 py-2.5 text-[20px] leading-[1] tracking-[-0.01em] placeholder:text-[#5A5A60] focus:outline-none min-h-[48px]"
        style={{
          fontFamily: `"${font.family}", Impact, sans-serif`,
          fontWeight: font.weight,
          textAlign: align || 'center',
          backgroundColor: paper,
          color: ink,
          caretColor: ink,
          ...(front?.strokeOn
            ? {
                WebkitTextStroke: `1px ${front.strokeColor}`,
                paintOrder: 'stroke fill',
              }
            : {}),
        }}
      />
      <div className="absolute bottom-1 right-1 px-1 py-px bg-[var(--ctl)] border border-[#43434E] rounded-[3px] font-mono text-[8px] tracking-[0.1em] text-[#7A7A80] uppercase pointer-events-none">
        {font.label}
      </div>
    </div>
  )
}

export function CopyPanel({
  composition,
  selection,
  onSelect,
  printableHeight,
  tile = false,
  onChange,
}) {
  const container = composition.container
  const stack = getStack(composition)
  const lines = stack?.lines ?? []
  const selected = findNode(composition, selection?.id)

  useEffect(() => {
    if (selected) return
    const fallback = lines[0]
    if (fallback) onSelect({ kind: 'line', id: fallback.id })
    else onSelect({ kind: 'container', id: container.id })
  }, [selected, lines, container.id, onSelect])

  const kind = selected?.kind || 'line'
  const line = kind === 'line' ? selected.node : null
  const canAdd = canAddCopyLine(composition, printableHeight, { tile })
  const charCount = lines.reduce((sum, entry) => sum + (entry.copy?.length || 0), 0)

  const patchThisLine = (lineId, linePatch) => {
    onChange(withLine(composition, lineId, linePatch), lineId)
  }

  const afterId = line?.id || lines[lines.length - 1]?.id
  const addLine = () => {
    const next = addCopyLine(composition, afterId)
    onChange(next.composition, next.lineId)
    onSelect({ kind: 'line', id: next.lineId })
  }
  const dupLine = (id) => {
    const next = duplicateCopyLine(composition, id)
    onChange(next.composition, next.lineId)
    onSelect({ kind: 'line', id: next.lineId })
  }
  const delLine = (id) => {
    const next = removeCopyLine(composition, id)
    onChange(next.composition)
    onSelect({ kind: 'line', id: next.lineId })
  }

  return (
    <div className="zone-copy w-full xl:w-[340px] min-h-0 flex-1 xl:flex-none xl:shrink-0 bg-[#14141c] xl:border-r border-b xl:border-b-0 border-black shadow-[inset_-1px_0_0_rgba(255,255,255,0.05)] flex flex-row overflow-hidden">
      <SectionSpine label="Copy Deck" sub="01" />
      <div className="flex-1 min-w-0 overflow-y-auto flex flex-col">
      <div className="p-5 space-y-7">
        <div>
          <ZoneHeader
            index="01"
            title="Copy"
            icon={<CopyIcon />}
            meta={
              <span className="flex items-center gap-1.5 shrink-0">
                <span className="font-mono text-[9px] tracking-[0.12em] text-[#7A7A80] uppercase">
                  {charCount} chars · {lines.length} lines
                </span>
                <button
                  type="button"
                  title="Add line"
                  aria-label="Add line"
                  disabled={!canAdd}
                  onClick={addLine}
                  className="w-6 h-6 rounded-[3px] border border-[#43434E] bg-[var(--ctl)] font-mono text-[13px] leading-none text-[#F0F0F2] hover:border-[#E3FF33] hover:text-[#E3FF33] disabled:opacity-40 flex items-center justify-center"
                >
                  +
                </button>
                <button
                  type="button"
                  title="Remove selected line"
                  aria-label="Remove selected line"
                  disabled={lines.length <= 1}
                  onClick={() => delLine(line?.id || lines[lines.length - 1]?.id)}
                  className="w-6 h-6 rounded-[3px] border border-[#43434E] bg-[var(--ctl)] font-mono text-[13px] leading-none text-[#F0F0F2] hover:border-[#E3FF33] hover:text-[#E3FF33] disabled:opacity-40 flex items-center justify-center"
                >
                  −
                </button>
              </span>
            }
          />
          <div className="space-y-2">
            {lines.map((entry, index) => (
              <StackLineInput
                key={entry.id}
                line={entry}
                index={index}
                align={stack?.align}
                selected={kind === 'line' && selection?.id === entry.id}
                onSelect={onSelect}
                onPatch={patchThisLine}
              />
            ))}
          </div>
        </div>
        <div className="space-y-7">
          <ParamSection
            title="Structure"
            defaultOpen
            value={
              <span className="font-tech text-[12px] text-[#F0F0F2] shrink-0">
                {lines.length} {lines.length === 1 ? 'line' : 'lines'} ·{' '}
                {composition.alignMode || 'auto'}
              </span>
            }
          >
          <div className="mb-2">
            <SegmentControl
              fill
              ariaLabel="Alignment mode"
              value={composition.alignMode || 'auto'}
              onChange={(mode) => onChange(withAlignMode(composition, mode))}
              options={[
                { value: 'auto', label: 'Auto' },
                { value: 'grid', label: 'Grid' },
              ]}
            />
          </div>
          <div role="tree" aria-label="Structure" className="space-y-1 mb-2">
            <TreeRow
              selected={kind === 'container'}
              onClick={() => onSelect({ kind: 'container', id: container.id })}
              label={container.name}
              hint="rect"
              badge="Frame"
              kind="container"
              media={
                <span
                  aria-hidden="true"
                  className="w-4 h-4 rounded-[2px] border-[1.5px] border-[#E3FF33]/70 shrink-0"
                />
              }
            />
            {stack && (
              <TreeRow
                selected={kind === 'stack'}
                indent={12}
                onClick={() => onSelect({ kind: 'stack', id: stack.id })}
                label="Stack"
                hint={stack.align}
                badge="Stack"
                kind="stack"
                media={
                  <span aria-hidden="true" className="text-[11px] leading-none text-[#7A7A80] shrink-0 w-4 text-center">
                    {stack.align === 'left' ? '◧' : stack.align === 'center' ? '⬌' : '◨'}
                  </span>
                }
              />
            )}
            {lines.map((entry, index) => {
              const font = fontOf(entry)
              const preview = lineText(entry) || `Line ${index + 1}`
              return (
                <TreeRow
                  key={entry.id}
                  selected={kind === 'line' && selection?.id === entry.id}
                  indent={24}
                  onClick={() => onSelect({ kind: 'line', id: entry.id })}
                  label={preview}
                  hint={font.label}
                  badge="Line"
                  kind="line"
                  media={
                    <span
                      aria-hidden="true"
                      className="text-[14px] leading-none text-[#F0F0F2] shrink-0 w-6 text-center"
                      style={{ fontFamily: `"${font.family}", Impact, sans-serif` }}
                    >
                      Ag
                    </span>
                  }
                >
                  <button
                    type="button"
                    title="Move up"
                    disabled={index === 0}
                    onClick={(event) => {
                      event.stopPropagation()
                      onChange(moveCopyLine(composition, entry.id, -1))
                    }}
                    className={rowBtn}
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    title="Move down"
                    disabled={index === lines.length - 1}
                    onClick={(event) => {
                      event.stopPropagation()
                      onChange(moveCopyLine(composition, entry.id, 1))
                    }}
                    className={rowBtn}
                  >
                    ▼
                  </button>
                  <button
                    type="button"
                    title="Duplicate line"
                    disabled={!canAdd}
                    onClick={(event) => {
                      event.stopPropagation()
                      dupLine(entry.id)
                    }}
                    className={rowBtn}
                  >
                    ⧉
                  </button>
                </TreeRow>
              )
            })}
          </div>
          <p className="mt-2 font-mono text-[10px] leading-[1.5] text-[#7A7A80]">
            Click a line here or in the preview; double-click preview text to edit it.
          </p>
          </ParamSection>

        </div>
      </div>
      <div className="mt-auto p-5 pt-4 border-t border-[#43434E] bg-black/30">
        <p className="font-mono text-[10px] leading-[1.5] tracking-[0.02em] text-[#5A5A60]">
          Built for real printers. No edge-to-edge assumptions. Trim on lime, tape the hatch.
        </p>
      </div>
      </div>
    </div>
  )
}
