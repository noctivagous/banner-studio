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
import { snapHalfIn } from '../lib/grid.js'
import { ContainerFields, StackFields } from './CopyPanel.jsx'
import { FontSelect } from './FontSelect.jsx'
import { GlyphStack } from './GlyphStack.jsx'
import { ParamSection } from './ParamSection.jsx'
import { ZoneHeader } from './SectionChrome.jsx'
import {
  FontIcon,
  GlyphHeightIcon,
  LetterSpacingIcon,
  TransformIcon,
} from './icons.jsx'

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
