import {
  MIN_GLYPH_HEIGHT,
  findNode,
  fontOf,
  getStack,
  glyphMaxForLine,
  glyphMaxForTileLine,
  withAlignX,
  withContainer,
  withLine,
  withStack,
} from '../lib/composition.js'
import { ASPECT_PRESETS, aspectId } from '../lib/composition.js'
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
import { CustomColorWell } from './GlyphStack.jsx'
import { Toggle } from './Toggle.jsx'
import { FontSelect } from './FontSelect.jsx'
import { GlyphStack } from './GlyphStack.jsx'
import { ParamSection } from './ParamSection.jsx'
import { ZoneHeader } from './SectionChrome.jsx'
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

export function ContainerFields({ container, onPatch, onAlignX }) {
  const aspect = container.size.aspect
  const activeAspect = aspectId(aspect)
  const pad = container.size.padding
  const linkedPad = pad.top === pad.right && pad.right === pad.bottom && pad.bottom === pad.left
  return (
    <div className="pro-divided">
      <p className="font-mono text-[10px] leading-[1.5] text-[#7A7A80]">
        Rectangle hugs the stack. Left, center, and right place that stack across
        the sheets, and line the copy up to the same edge. On sheet places the
        frame in the trim height. Corner size scales with the shorter side.
      </p>
      <ParamSection
        title="Shape"
        sectionId="copy.container.shape"
        defaultOpen={false}
        value={
          <span className="font-tech text-[12px] text-[#F0F0F2] shrink-0">Rectangle</span>
        }
      >
        <div className="h-8 rounded-[4px] border border-[#43434E] bg-[var(--ctl)] font-mono text-[11px] uppercase tracking-[0.08em] text-[#F0F0F2] flex items-center px-2.5">
          Rectangle
        </div>
      </ParamSection>
      <ParamSection
        title="Size"
        sectionId="copy.container.size"
        defaultOpen={false}
        value={<span className="font-tech text-[12px] text-[#F0F0F2] shrink-0">Hug</span>}
      >
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
      </ParamSection>
      <ParamSection
        title="Aspect"
        sectionId="copy.container.aspect"
        defaultOpen={false}
        value={
          <span className="font-tech text-[12px] text-[#F0F0F2] shrink-0">
            {activeAspect === 'off' ? 'Off' : activeAspect}
          </span>
        }
      >
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
      </ParamSection>
      <ParamSection
        title="Padding"
        sectionId="copy.container.padding"
        defaultOpen={false}
        value={
          <span className="font-tech text-[12px] text-[#F0F0F2]">
            {linkedPad ? `${pad.top.toFixed(2)}"` : 'mixed'}
          </span>
        }
      >
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
      </ParamSection>
      <ParamSection
        icon={<AlignIcon />}
        title="Align"
        sectionId="copy.container.align"
        defaultOpen={false}
        value={
          <span className="font-tech text-[12px] text-[#F0F0F2] shrink-0">
            {container.layout.alignX} · {container.layout.alignY}
          </span>
        }
      >
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
      </ParamSection>
      <ParamSection
        title="Corners"
        sectionId="copy.container.corners"
        defaultOpen={false}
        value={
          <span className="font-tech text-[12px] text-[#F0F0F2] shrink-0">
            {container.decoration.corner !== 'square'
              ? `${container.decoration.corner} ${(container.decoration.cornerSize * 100).toFixed(0)}%`
              : 'Square'}
          </span>
        }
      >
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
              <span className="font-tech text-[11px] text-[#F0F0F2]">
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
      </ParamSection>
      <ParamSection
        icon={<CopyIcon />}
        title="Fill"
        sectionId="copy.container.fill"
        defaultOpen={false}
        value={
          <Toggle
            on={container.fillOn}
            onToggle={() => onPatch({ fillOn: !container.fillOn })}
            offKnob="bg-[#7A7A80]"
          />
        }
      >
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
      </ParamSection>
      <ParamSection
        icon={<StrokeIcon />}
        title="Stroke"
        sectionId="copy.container.stroke"
        defaultOpen={false}
        value={
          <Toggle
            on={container.strokeOn}
            onToggle={() => onPatch({ strokeOn: !container.strokeOn })}
            offKnob="bg-[#7A7A80]"
          />
        }
      >
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
      </ParamSection>
    </div>
  )
}

export function StackFields({ stack, onPatch, onAlignX }) {
  return (
    <div className="pro-divided">
      <p className="font-mono text-[10px] leading-[1.5] text-[#7A7A80]">
        Alignment lines for the whole Y-stack. Every display line shares this
        left, center, or right edge.
      </p>
      <ParamSection
        icon={<AlignIcon />}
        title="Align"
        sectionId="copy.stack.align"
        defaultOpen={false}
        value={
          <span className="font-tech text-[12px] text-[#F0F0F2] shrink-0">{stack.align}</span>
        }
      >
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
      </ParamSection>
      <ParamSection
        icon={<LineHeightIcon />}
        title="Gap"
        sectionId="copy.stack.gap"
        defaultOpen={false}
        value={
          <span className="font-tech text-[12px] px-1.5 py-0.5 bg-[var(--ctl)] border border-[#43434E] rounded-[3px] text-[#F0F0F2]">
            {stack.gapIn.toFixed(2)}"
          </span>
        }
      >
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
      </ParamSection>
    </div>
  )
}

function LineProperties({ line, glyphMax, onPatch }) {
  const font = fontOf(line)
  return (
    <div className="pro-divided">
      <ParamSection
        icon={<FontIcon />}
        title="Font Family"
        defaultOpen
        value={
          <span className="font-tech text-[12px] text-[#F0F0F2] shrink-0">
            {font.label}
          </span>
        }
      >
        <FontSelect fontId={line.fontId} onChange={onPatch} />
      </ParamSection>
      <ParamSection
        icon={<GlyphHeightIcon />}
        title="Glyph Height"
        defaultOpen
        value={
          <span className="font-tech text-[12px] px-1.5 py-0.5 bg-[var(--ctl)] border border-[#43434E] rounded-[3px] text-[#F0F0F2]">
            {line.glyphHeight.toFixed(1)}"
          </span>
        }
      >
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
      </ParamSection>
      <ParamSection
        icon={<LetterSpacingIcon />}
        title="Letter Spacing"
        sectionId="inspector.line.letter-spacing"
        defaultOpen={false}
        value={
          <span className="font-tech text-[12px] text-[#F0F0F2]">
            {line.letterSpacing > 0 ? '+' : ''}
            {line.letterSpacing.toFixed(2)}em
          </span>
        }
      >
        <input
          type="range"
          min={-0.05}
          max={0.3}
          step={0.01}
          value={line.letterSpacing}
          onChange={(e) => onPatch({ letterSpacing: parseFloat(e.target.value) })}
          className="w-full"
        />
      </ParamSection>
      <ParamSection
        icon={<TransformIcon />}
        title="Text Transform"
        sectionId="inspector.line.transform"
        defaultOpen={false}
        value={
          <span className="font-tech text-[12px] text-[#F0F0F2] shrink-0">
            {line.transform === 'asIs' ? 'As Is' : line.transform}
          </span>
        }
      >
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
      </ParamSection>
      <ParamSection
        title="Placement"
        sectionId="inspector.line.placement"
        defaultOpen={false}
        value={
          <span className="font-tech text-[12px] text-[#F0F0F2] shrink-0">
            {(line.place?.mode || 'auto') === 'free' ? 'Freeform' : 'Auto'}
          </span>
        }
      >
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { mode: 'auto', label: 'Auto', hint: 'Placed by the layout' },
            { mode: 'free', label: 'Freeform', hint: 'Drag on the canvas' },
          ].map((option) => {
            const active = (line.place?.mode || 'auto') === option.mode
            return (
              <button
                key={option.mode}
                type="button"
                title={option.hint}
                onClick={() =>
                  onPatch({
                    place: {
                      mode: option.mode,
                      dxIn: option.mode === 'auto' ? 0 : line.place?.dxIn || 0,
                      dyIn: option.mode === 'auto' ? 0 : line.place?.dyIn || 0,
                    },
                  })
                }
                aria-pressed={active}
                className={`h-11 rounded-[4px] border transition-colors flex flex-col items-center justify-center gap-0.5 ${
                  active
                    ? 'bg-[#E3FF33] text-black border-[#E3FF33] font-bold'
                    : 'bg-[var(--ctl)] text-[#7A7A80] border-[#43434E] hover:text-white'
                }`}
              >
                <span className="text-[12px] leading-none">{option.mode === 'auto' ? '🔒' : '🔓'}</span>
                <span className="font-mono text-[8px] leading-none uppercase tracking-[0.08em]">
                  {option.label}
                </span>
              </button>
            )
          })}
        </div>
        {(line.place?.mode || 'auto') === 'free' && (
          <p className="mt-2 font-mono text-[10px] leading-[1.5] text-[#7A7A80]">
            Drag the ⠿ handle on the canvas, or reset by switching back to Auto.
          </p>
        )}
      </ParamSection>
      <GlyphStack line={line} font={font} onPatchLine={onPatch} />
    </div>
  )
}

const KIND_LABEL = { container: 'Frame', stack: 'Stack', line: 'Line' }

export function Inspector({ composition, selection, printableHeight, tile = false, onChange }) {
  const container = composition.container
  const stack = getStack(composition)
  const selected = findNode(composition, selection?.id)
  const kind = selected?.kind || 'line'
  const line = kind === 'line' ? selected.node : null
  const glyphMax = line
    ? tile
      ? glyphMaxForTileLine(composition, line.id)
      : glyphMaxForLine(composition, line.id, printableHeight)
    : 4.5

  const patchContainer = (containerPatch) => onChange(withContainer(composition, containerPatch))
  const patchStack = (stackPatch) => onChange(withStack(composition, stackPatch))
  const patchAlignX = (dir) => onChange(withAlignX(composition, dir))
  const patchThisLine = (linePatch) => {
    if (!line) return
    onChange(withLine(composition, line.id, linePatch), line.id)
  }

  return (
    <div>
      <ZoneHeader
        index="02"
        title="Inspector"
        icon={<FontIcon />}
        meta={
          <span className="inline-flex items-center px-2 py-1 rounded-[4px] bg-[var(--ctl)] border border-[#43434E] font-mono text-[10px] tracking-[0.1em] text-[#F0F0F2] uppercase shrink-0">
            {KIND_LABEL[kind] || 'Line'}
          </span>
        }
      />
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
        <LineProperties line={line} glyphMax={glyphMax} onPatch={patchThisLine} />
      )}
      {!selected && (
        <p className="font-mono text-[10px] leading-[1.5] text-[#7A7A80]">
          Select a line in the Copy stack or the preview to edit its properties.
        </p>
      )}
    </div>
  )
}
