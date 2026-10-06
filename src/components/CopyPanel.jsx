import { useEffect } from 'react'
import {
  ASPECT_PRESETS,
  MAX_COPY_LINES,
  MIN_GLYPH_HEIGHT,
  addCopyLine,
  aspectId,
  canAddCopyLine,
  duplicateCopyLine,
  findNode,
  fontOf,
  getStack,
  glyphMaxForLine,
  lineText,
  moveCopyLine,
  removeCopyLine,
  withAlignMode,
  withAlignX,
  withContainer,
  withLine,
  withStack,
} from '../lib/composition.js'
import { snapHalfIn } from '../lib/grid.js'
import { FieldLabel } from './FieldLabel.jsx'
import {
  AlignMini,
  AspectMini,
  CornerMini,
  FreeformMini,
  HugMini,
  PaddingMini,
  SheetMini,
} from './FrameMini.jsx'
import { FontSelect } from './FontSelect.jsx'
import { CustomColorWell, GlyphStack } from './GlyphStack.jsx'
import { SectionSpine, ZoneHeader } from './SectionChrome.jsx'
import { SegmentControl } from './SegmentControl.jsx'
import { Toggle } from './Toggle.jsx'
import {
  AlignIcon,
  CopyIcon,
  FontIcon,
  GlyphHeightIcon,
  LetterSpacingIcon,
  LineHeightIcon,
  StrokeIcon,
  TransformIcon,
} from './icons.jsx'

const rowBtn =
  'w-6 h-6 rounded-[3px] border border-transparent text-[#7A7A80] hover:text-white hover:border-[#43434E] disabled:opacity-25 disabled:hover:text-[#7A7A80] disabled:hover:border-transparent font-mono text-[11px] leading-none flex items-center justify-center'

const TREE_TINT = {
  container: 'bg-[#23232E]',
  stack: 'bg-[#1A1A22]',
  line: 'bg-[#0F0F15]',
}

function TreeRow({ selected, indent = 0, onClick, label, hint, kind = 'line', media, children }) {
  return (
    <div
      role="option"
      aria-label={label}
      aria-selected={selected}
      onClick={onClick}
      className={`flex items-center gap-1.5 px-1.5 py-1.5 rounded-[4px] border cursor-pointer transition-colors ${
        selected
          ? 'bg-[var(--ctl)] border-[#E3FF33]'
          : `${TREE_TINT[kind] || TREE_TINT.line} border-[#43434E] hover:border-[#5E5E69]`
      }`}
      style={{ marginLeft: indent }}
    >
      {media}
      <span className="flex-1 min-w-0 font-mono text-[11px] tracking-[0.04em] text-[#F0F0F2] truncate uppercase">
        {label}
      </span>
      {hint && (
        <span className="font-mono text-[9px] text-[#7A7A80] uppercase shrink-0">{hint}</span>
      )}
      {children}
    </div>
  )
}

function ContainerFields({ container, onPatch, onAlignX }) {
  const aspect = container.size.aspect
  const activeAspect = aspectId(aspect)
  const pad = container.size.padding
  const linkedPad = pad.top === pad.right && pad.right === pad.bottom && pad.bottom === pad.left
  return (
    <div className="space-y-4">
      <p className="font-mono text-[10px] leading-[1.5] text-[#7A7A80]">
        Rectangle hugs the stack. Align cascades to the Y-stack and the lines.
        On sheet places the frame in the trim. Corner size scales with the shorter side.
      </p>
      <div>
        <FieldLabel>Shape</FieldLabel>
        <div className="h-8 rounded-[4px] border border-[#43434E] bg-[var(--ctl)] font-mono text-[11px] uppercase tracking-[0.08em] text-[#F0F0F2] flex items-center px-2.5">
          Rectangle
        </div>
      </div>
      <div>
        <FieldLabel>Size</FieldLabel>
        <div
          role="status"
          aria-label="Size: hug content"
          className="h-[52px] rounded-[4px] border border-[#E3FF33] bg-[#E3FF33] text-black font-bold flex flex-col items-center justify-center gap-1"
        >
          <HugMini />
          <span className="font-mono text-[9px] uppercase tracking-[0.08em] leading-none">
            Hug content
          </span>
        </div>
      </div>
      <div>
        <FieldLabel>Aspect</FieldLabel>
        <div className="grid grid-cols-5 gap-1">
          <button
            type="button"
            onClick={() => onPatch({ size: { aspect: null } })}
            aria-pressed={activeAspect === 'off'}
            aria-label="Aspect off"
            className={`h-[52px] rounded-[4px] border flex flex-col items-center justify-center gap-1 ${
              activeAspect === 'off'
                ? 'bg-[#E3FF33] text-black border-[#E3FF33] font-bold'
                : 'bg-[var(--ctl)] text-[#7A7A80] border-[#43434E]'
            }`}
          >
            <FreeformMini />
            <span className="font-mono text-[9px] uppercase leading-none">Off</span>
          </button>
          {ASPECT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => onPatch({ size: { aspect: { w: preset.w, h: preset.h } } })}
              aria-pressed={activeAspect === preset.id}
              aria-label={`Aspect ${preset.id}`}
              className={`h-[52px] rounded-[4px] border flex flex-col items-center justify-center gap-1 ${
                activeAspect === preset.id
                  ? 'bg-[#E3FF33] text-black border-[#E3FF33] font-bold'
                  : 'bg-[var(--ctl)] text-[#7A7A80] border-[#43434E]'
              }`}
            >
              <AspectMini w={preset.w} h={preset.h} />
              <span className="font-mono text-[9px] uppercase leading-none">{preset.id}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel
          value={
            <span className="font-mono text-[11px] text-[#F0F0F2]">
              {linkedPad ? `${pad.top.toFixed(2)}"` : 'mixed'}
            </span>
          }
        >
          Padding
        </FieldLabel>
        <div className="flex items-center gap-3">
          <PaddingMini value={Math.max(pad.top, pad.right, pad.bottom, pad.left)} />
          <input
            type="range"
            min={0}
            max={1}
            step={0.5}
            value={Math.max(pad.top, pad.right, pad.bottom, pad.left)}
            onChange={(e) => {
              const n = snapHalfIn(parseFloat(e.target.value), { allowZero: true, max: 1 })
              onPatch({ size: { padding: { top: n, right: n, bottom: n, left: n } } })
            }}
            className="flex-1"
            aria-label="Padding inches"
          />
        </div>
      </div>
      <div>
        <FieldLabel icon={<AlignIcon />}>Align</FieldLabel>
        <div className="grid grid-cols-3 gap-1 mb-3">
          {['left', 'center', 'right'].map((dir) => (
            <button
              key={dir}
              type="button"
              onClick={() => onAlignX(dir)}
              aria-pressed={container.layout.alignX === dir}
              aria-label={`Align ${dir}`}
              className={`h-[52px] rounded-[4px] border flex flex-col items-center justify-center gap-1 ${
                container.layout.alignX === dir
                  ? 'bg-[#E3FF33] text-black border-[#E3FF33] font-bold'
                  : 'bg-[var(--ctl)] text-[#7A7A80] border-[#43434E]'
              }`}
            >
              <AlignMini dir={dir} />
              <span className="font-mono text-[9px] uppercase leading-none">{dir}</span>
            </button>
          ))}
        </div>
        <FieldLabel>On sheet</FieldLabel>
        <div className="grid grid-cols-3 gap-1">
          {['top', 'center', 'bottom'].map((dir) => (
            <button
              key={dir}
              type="button"
              onClick={() => onPatch({ layout: { alignY: dir } })}
              aria-pressed={container.layout.alignY === dir}
              aria-label={`Place on sheet ${dir}`}
              className={`h-[52px] rounded-[4px] border flex flex-col items-center justify-center gap-1 ${
                container.layout.alignY === dir
                  ? 'bg-[#E3FF33] text-black border-[#E3FF33] font-bold'
                  : 'bg-[var(--ctl)] text-[#7A7A80] border-[#43434E]'
              }`}
            >
              <SheetMini dir={dir} />
              <span className="font-mono text-[9px] uppercase leading-none">{dir}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Corners</FieldLabel>
        <div className="grid grid-cols-3 gap-1 mb-2">
          {['square', 'round', 'cut'].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onPatch({ decoration: { corner: mode } })}
              aria-pressed={container.decoration.corner === mode}
              aria-label={`Corners ${mode}`}
              className={`h-[52px] rounded-[4px] border flex flex-col items-center justify-center gap-1 ${
                container.decoration.corner === mode
                  ? 'bg-[#E3FF33] text-black border-[#E3FF33] font-bold'
                  : 'bg-[var(--ctl)] text-[#7A7A80] border-[#43434E]'
              }`}
            >
              <CornerMini mode={mode} />
              <span className="font-mono text-[9px] uppercase leading-none">{mode}</span>
            </button>
          ))}
        </div>
        {container.decoration.corner !== 'square' && (
          <>
            <div className="flex justify-between mb-1">
              <span className="font-mono text-[10px] text-[#7A7A80] uppercase">Size</span>
              <span className="font-mono text-[10px] text-[#F0F0F2]">
                {(container.decoration.cornerSize * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={0.45}
              step={0.01}
              value={container.decoration.cornerSize}
              onChange={(e) =>
                onPatch({ decoration: { cornerSize: parseFloat(e.target.value) } })
              }
              className="w-full"
            />
          </>
        )}
      </div>
      <div>
        <FieldLabel
          icon={<CopyIcon />}
          value={
            <Toggle
              on={container.fillOn}
              onToggle={() => onPatch({ fillOn: !container.fillOn })}
              offKnob="bg-[#7A7A80]"
            />
          }
        >
          Fill
        </FieldLabel>
        {container.fillOn && (
          <div className="flex items-center gap-2">
            <CustomColorWell
              value={container.fill}
              label="Container fill"
              onChange={(fill) => onPatch({ fill })}
            />
            <span className="font-mono text-[10px] text-[#7A7A80] uppercase">{container.fill}</span>
          </div>
        )}
      </div>
      <div>
        <FieldLabel
          icon={<StrokeIcon />}
          value={
            <Toggle
              on={container.strokeOn}
              onToggle={() => onPatch({ strokeOn: !container.strokeOn })}
              offKnob="bg-[#7A7A80]"
            />
          }
        >
          Stroke
        </FieldLabel>
        {container.strokeOn && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <CustomColorWell
                value={container.strokeColor}
                label="Container stroke"
                onChange={(strokeColor) => onPatch({ strokeColor })}
              />
              <span className="font-mono text-[10px] text-[#7A7A80] uppercase">
                {container.strokeWidthIn.toFixed(2)}"
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={0.12}
              step={0.01}
              value={container.strokeWidthIn}
              onChange={(e) => onPatch({ strokeWidthIn: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        )}
      </div>
    </div>
  )
}

function StackFields({ stack, onPatch, onAlignX }) {
  return (
    <div className="space-y-4">
      <p className="font-mono text-[10px] leading-[1.5] text-[#7A7A80]">
        Alignment lines for the whole Y-stack. Every display line shares this
        left, center, or right edge.
      </p>
      <div>
        <FieldLabel icon={<AlignIcon />}>Align</FieldLabel>
        <div className="grid grid-cols-3 gap-1">
          {['left', 'center', 'right'].map((dir) => (
            <button
              key={dir}
              type="button"
              onClick={() => onAlignX(dir)}
              title={`Align ${dir}`}
              aria-pressed={stack.align === dir}
              className={`h-11 rounded-[4px] border transition-colors flex flex-col items-center justify-center gap-0.5 ${
                stack.align === dir
                  ? 'bg-[#E3FF33] text-black border-[#E3FF33] font-bold'
                  : 'bg-[var(--ctl)] text-[#7A7A80] border-[#43434E] hover:text-white'
              }`}
            >
              <span className="text-[12px] leading-none">
                {dir === 'left' ? '◧' : dir === 'center' ? '⬌' : '◨'}
              </span>
              <span className="font-mono text-[8px] leading-none uppercase tracking-[0.08em]">
                {dir}
              </span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel
          icon={<LineHeightIcon />}
          value={
            <span className="font-mono text-[11px] px-1.5 py-0.5 bg-[var(--ctl)] border border-[#43434E] rounded-[3px] text-[#F0F0F2]">
              {stack.gapIn.toFixed(2)}"
            </span>
          }
        >
          Gap
        </FieldLabel>
        <input
          type="range"
          min={0}
          max={1}
          step={0.5}
          value={stack.gapIn}
          onChange={(e) =>
            onPatch({ gapIn: snapHalfIn(parseFloat(e.target.value), { allowZero: true, max: 1 }) })
          }
          className="w-full"
        />
      </div>
    </div>
  )
}

function LineFields({ line, glyphMax, onPatch, align }) {
  const font = fontOf(line)
  const visible = (line.layers || []).filter((layer) => layer.visible !== false)
  const front = visible[visible.length - 1] ?? line.layers?.[0]
  return (
    <div className="space-y-4">
      <div>
        <FieldLabel icon={<FontIcon />}>Font Family</FieldLabel>
        <FontSelect fontId={line.fontId} onChange={onPatch} />
      </div>
      <div className="relative">
        <input
          value={line.copy}
          onChange={(e) => onPatch({ copy: e.target.value.replace(/\n/g, ' ') })}
          placeholder="TYPE THIS LINE"
          spellCheck={false}
          className="w-full bg-[#08080A] border border-[#43434E] rounded-[4px] p-4 text-[28px] leading-[0.9] tracking-[-0.01em] text-white placeholder:text-[#5A5A60] focus:outline-none focus:border-[#E3FF33]/60 min-h-[72px]"
          style={{
            fontFamily: `"${font.family}", Impact, sans-serif`,
            fontWeight: font.weight,
            textAlign: align || 'center',
            color: front?.overlayOn ? undefined : front?.fill,
            ...(front?.strokeOn
              ? {
                  WebkitTextStroke: `1px ${front.strokeColor}`,
                  paintOrder: 'stroke fill',
                }
              : {}),
          }}
        />
        <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-[var(--ctl)] border border-[#43434E] rounded-[3px] font-mono text-[8px] tracking-[0.1em] text-[#7A7A80] uppercase pointer-events-none">
          Line
        </div>
      </div>
      <div>
        <FieldLabel
          icon={<GlyphHeightIcon />}
          value={
            <span className="font-mono text-[11px] px-1.5 py-0.5 bg-[var(--ctl)] border border-[#43434E] rounded-[3px] text-[#F0F0F2]">
              {line.glyphHeight.toFixed(1)}"
            </span>
          }
        >
          Glyph Height
        </FieldLabel>
        <input
          type="range"
          min={MIN_GLYPH_HEIGHT}
          max={Math.max(MIN_GLYPH_HEIGHT, glyphMax)}
          step={0.5}
          value={Math.min(line.glyphHeight, glyphMax)}
          onChange={(e) =>
            onPatch({
              glyphHeight: snapHalfIn(parseFloat(e.target.value), {
                allowZero: false,
                min: MIN_GLYPH_HEIGHT,
                max: Math.max(MIN_GLYPH_HEIGHT, glyphMax),
              }),
            })
          }
          className="w-full"
        />
        <div className="flex justify-between mt-1">
          <span className="font-mono text-[8px] text-[#7A7A80]">{MIN_GLYPH_HEIGHT}"</span>
          <span className="font-mono text-[8px] text-[#7A7A80]">{glyphMax.toFixed(1)}" max</span>
        </div>
      </div>
      <div>
        <FieldLabel
          icon={<LetterSpacingIcon />}
          value={
            <span className="font-mono text-[11px] text-[#F0F0F2]">
              {line.letterSpacing > 0 ? '+' : ''}
              {line.letterSpacing.toFixed(2)}em
            </span>
          }
        >
          Letter Spacing
        </FieldLabel>
        <input
          type="range"
          min={-0.05}
          max={0.3}
          step={0.01}
          value={line.letterSpacing}
          onChange={(e) => onPatch({ letterSpacing: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>
      <div>
        <FieldLabel icon={<TransformIcon />}>Text Transform</FieldLabel>
        <div className="grid grid-cols-3 gap-1.5">
          {['uppercase', 'lowercase', 'asIs'].map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => onPatch({ transform: mode })}
              className={`h-8 rounded-[4px] border text-[11px] font-mono uppercase tracking-[0.08em] transition-all ${
                line.transform === mode
                  ? 'bg-[#E3FF33] text-black border-[#E3FF33] font-bold'
                  : 'bg-[var(--ctl)] text-[#7A7A80] border-[#43434E] hover:border-[#5E5E69] hover:text-[#F0F0F2]'
              }`}
            >
              {mode === 'asIs' ? 'As Is' : mode}
            </button>
          ))}
        </div>
      </div>
      <GlyphStack line={line} font={font} onPatchLine={onPatch} />
    </div>
  )
}

export function CopyPanel({
  composition,
  selection,
  onSelect,
  printableHeight,
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
  const glyphMax = line ? glyphMaxForLine(composition, line.id, printableHeight) : 4.5
  const canAdd = canAddCopyLine(composition, printableHeight)
  const charCount = lines.reduce((sum, entry) => sum + (entry.copy?.length || 0), 0)

  const patchContainer = (containerPatch) => onChange(withContainer(composition, containerPatch))
  const patchStack = (stackPatch) => onChange(withStack(composition, stackPatch))
  const patchAlignX = (dir) => onChange(withAlignX(composition, dir))
  const patchThisLine = (linePatch) => {
    if (!line) return
    onChange(withLine(composition, line.id, linePatch), line.id)
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
    <div className="zone-copy w-full xl:w-[340px] min-h-0 flex-1 xl:flex-none xl:shrink-0 bg-[#16161E] xl:border-r border-b xl:border-b-0 border-[#43434E] flex flex-row overflow-hidden">
      <SectionSpine label="Copy Deck" sub="01" />
      <div className="flex-1 min-w-0 overflow-y-auto flex flex-col">
      <div className="p-5 space-y-7">
        <div>
          <ZoneHeader
            index="01"
            title="Copy"
            icon={<CopyIcon />}
            meta={
              <span className="font-mono text-[9px] tracking-[0.12em] text-[#7A7A80] uppercase shrink-0">
                {charCount} chars · {lines.length} lines
              </span>
            }
          />

          <FieldLabel>Composition</FieldLabel>
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
          <div role="tree" aria-label="Composition" className="space-y-1 mb-2">
            <TreeRow
              selected={kind === 'container'}
              onClick={() => onSelect({ kind: 'container', id: container.id })}
              label={container.name}
              hint="rect"
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
                  <button
                    type="button"
                    title="Delete line"
                    disabled={lines.length <= 1}
                    onClick={(event) => {
                      event.stopPropagation()
                      delLine(entry.id)
                    }}
                    className={rowBtn}
                  >
                    ×
                  </button>
                </TreeRow>
              )
            })}
          </div>
          <button
            type="button"
            onClick={addLine}
            disabled={!canAdd}
            className="w-full h-8 rounded-[4px] border border-dashed border-[#43434E] font-mono text-[10px] tracking-[0.1em] text-[#7A7A80] uppercase hover:text-[#F0F0F2] hover:border-[#5E5E69] disabled:opacity-40"
          >
            + Add line · {lines.length}/{MAX_COPY_LINES}
          </button>
        </div>

        <div>
          <div className="mb-3">
            <span
              data-inspector-kind={kind}
              className="inline-flex items-center px-2 py-1 rounded-[4px] bg-[var(--ctl)] border border-[#43434E] font-mono text-[10px] tracking-[0.1em] text-[#F0F0F2] uppercase"
            >
              {kind === 'container' && 'Frame'}
              {kind === 'stack' && 'Y-stack'}
              {kind === 'line' && 'Display line'}
            </span>
          </div>
          {kind === 'container' && (
            <ContainerFields
              container={container}
              onPatch={patchContainer}
              onAlignX={patchAlignX}
            />
          )}
          {kind === 'stack' && stack && (
            <StackFields stack={stack} onPatch={patchStack} onAlignX={patchAlignX} />
          )}
          {kind === 'line' && line && (
            <LineFields
              line={line}
              glyphMax={glyphMax}
              onPatch={patchThisLine}
              align={stack?.align}
            />
          )}
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
