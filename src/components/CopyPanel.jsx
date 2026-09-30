import {
  DEFAULT_FILL_OVERLAY,
  DEFAULT_TEXT_SHADOW,
  PX_PER_INCH,
  SHADOW_FILL_HATCH,
  SHADOW_FILL_SOLID,
  TEXT_EFFECT_CUSTOM,
  TEXT_EFFECT_FILL_HATCH_SHADOW,
  TEXT_EFFECT_FILL_HATCH_SHADOW_0DEG,
  TEXT_EFFECT_HATCH_SHADOW,
  TEXT_EFFECT_NONE,
  TEXT_EFFECT_OUTLINE_COPY_SHADOW,
  applyGlyphPreset,
  glyphMaxInches,
  hatchStyle,
  matchGlyphPreset,
  resolveHatchIn,
  resolveShadowOffsetIn,
} from '../lib/layout.js'
import { FieldLabel } from './FieldLabel.jsx'
import { FontSelect } from './FontSelect.jsx'
import { Toggle } from './Toggle.jsx'
import {
  AlignIcon,
  CopyIcon,
  EffectIcon,
  FillIcon,
  FontIcon,
  GlyphHeightIcon,
  LetterSpacingIcon,
  LineHeightIcon,
  StrokeIcon,
  TransformIcon,
} from './icons.jsx'

const ANGLE_ARROWS = ['→', '↘', '↓', '↙', '←', '↖', '↑', '↗']

function PresetPreview({ presetId, font }) {
  const face = {
    fontFamily: `"${font.family}", Impact, sans-serif`,
    fontWeight: font.weight,
    fontSize: 30,
    lineHeight: 1,
  }
  const tile =
    'h-14 rounded-[3px] bg-white flex items-center justify-center overflow-hidden'
  if (presetId === TEXT_EFFECT_NONE) {
    return (
      <div className={tile}>
        <span style={{ ...face, color: '#000000' }}>Aa</span>
      </div>
    )
  }
  if (presetId === TEXT_EFFECT_OUTLINE_COPY_SHADOW) {
    return (
      <div className={tile}>
        <span
          style={{
            ...face,
            color: '#FFFFFF',
            WebkitTextStroke: '1.5px #000000',
            paintOrder: 'stroke fill',
            textShadow: '2px 2px 0 #000000',
          }}
        >
          Aa
        </span>
      </div>
    )
  }
  if (presetId === TEXT_EFFECT_HATCH_SHADOW) {
    return (
      <div className={tile}>
        <span
          style={{
            ...face,
            ...hatchStyle({
              angleDeg: 90,
              spacing: 5,
              lineWidth: 1.5,
              color: '#000000',
              unit: 'px',
            }),
            WebkitTextStroke: '1.5px #000000',
            paintOrder: 'stroke fill',
            textShadow: '2px 2px 0 #000000',
          }}
        >
          Aa
        </span>
      </div>
    )
  }
  const angle = presetId === TEXT_EFFECT_FILL_HATCH_SHADOW_0DEG ? 0 : 90
  return (
    <div className={tile}>
      <span style={{ ...face, position: 'relative', color: '#000000' }}>
        Aa
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            transform: 'translate(2px, 2px)',
            ...hatchStyle({
              angleDeg: angle,
              spacing: 4,
              lineWidth: 1,
              color: '#000000',
              unit: 'px',
            }),
          }}
        >
          Aa
        </span>
      </span>
    </div>
  )
}

function HatchFields({ values, resolved, onPatch, keys }) {
  const k = keys || { angle: 'angle', spacingPct: 'spacingPct', lineWidthPct: 'lineWidthPct' }
  return (
    <>
      <div>
        <div className="flex justify-between mb-1">
          <span className="font-mono text-[10px] text-[#7A7A80] uppercase">
            Hatch angle
          </span>
          <span className="font-mono text-[10px] text-[#F0F0F2]">{values.angle}°</span>
        </div>
        <input
          type="range"
          min={0}
          max={360}
          step={5}
          value={values.angle}
          onChange={(e) => onPatch({ [k.angle]: parseFloat(e.target.value) })}
          className="w-full"
        />
      </div>
      <div>
        <div className="flex justify-between mb-1">
          <span className="font-mono text-[10px] text-[#7A7A80] uppercase">
            Line spacing
          </span>
          <span className="font-mono text-[10px] text-[#F0F0F2]">
            {values.spacingPct}% · {resolved.spacingIn.toFixed(2)}"
          </span>
        </div>
        <input
          type="range"
          min={2}
          max={50}
          step={1}
          value={values.spacingPct}
          onChange={(e) => onPatch({ [k.spacingPct]: parseFloat(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between mt-1">
          <span className="font-mono text-[8px] text-[#7A7A80]">% of x-height</span>
        </div>
      </div>
      <div>
        <div className="flex justify-between mb-1">
          <span className="font-mono text-[10px] text-[#7A7A80] uppercase">
            Line width
          </span>
          <span className="font-mono text-[10px] text-[#F0F0F2]">
            {values.lineWidthPct}% · {resolved.lineWidthIn.toFixed(2)}"
          </span>
        </div>
        <input
          type="range"
          min={0.5}
          max={25}
          step={0.5}
          value={values.lineWidthPct}
          onChange={(e) => onPatch({ [k.lineWidthPct]: parseFloat(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between mt-1">
          <span className="font-mono text-[8px] text-[#7A7A80]">% of x-height</span>
        </div>
      </div>
    </>
  )
}

function CustomColorWell({ value, label, onChange }) {
  return (
    <div title={label} className="relative w-8 h-8 shrink-0">
      <span
        aria-hidden="true"
        className="absolute inset-0 translate-x-[3px] translate-y-[3px] rounded-full"
        style={{
          background:
            'conic-gradient(from 45deg, #f44336, #ff9800, #ffeb3b, #4caf50, #2196f3, #9c27b0, #f44336)',
        }}
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 rounded-full border border-[#43434E]"
        style={{ background: value }}
      />
      <input
        type="color"
        value={value}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        className="absolute -inset-1 opacity-0 cursor-pointer"
      />
    </div>
  )
}

export function CopyPanel({
  copy,
  font,
  fontId,
  glyphHeight,
  lineHeight,
  letterSpacing,
  transform,
  fill,
  strokeOn,
  strokeWidth,
  strokeColor,
  textShadow,
  fillOverlay,
  align,
  printableHeight,
  onChange,
}) {
  const glyphMax = glyphMaxInches(printableHeight)
  const shadow = textShadow || { ...DEFAULT_TEXT_SHADOW }
  const setShadow = (patch) => onChange({ textShadow: { ...shadow, ...patch } })
  const overlay = fillOverlay || { ...DEFAULT_FILL_OVERLAY }
  const setOverlay = (patch) => onChange({ fillOverlay: { ...overlay, ...patch } })
  const matchedPreset = matchGlyphPreset({
    fill,
    strokeOn,
    strokeColor,
    textShadow: shadow,
    fillOverlay: overlay,
  })
  const applyPreset = (presetId) =>
    onChange(applyGlyphPreset(presetId, { textShadow: shadow, fillOverlay: overlay }))
  const overlayResolved = resolveHatchIn(
    {
      angle: overlay.angle,
      spacingPct: overlay.spacingPct,
      lineWidthPct: overlay.lineWidthPct,
    },
    glyphHeight,
    fontId,
  )
  const shadowHatchResolved = resolveHatchIn(
    {
      angle: shadow.hatchAngle,
      spacingPct: shadow.hatchSpacingPct,
      lineWidthPct: shadow.hatchLineWidthPct,
    },
    glyphHeight,
    fontId,
  )
  const previewScale = 28 / Math.max(1, glyphHeight * PX_PER_INCH * 0.9)
  const previewHatchPx = (resolved) => ({
    spacing: Math.max(2, resolved.spacingIn * PX_PER_INCH * previewScale),
    lineWidth: Math.max(1, resolved.lineWidthIn * PX_PER_INCH * previewScale),
  })
  const autoDistance = resolveShadowOffsetIn(
    { ...shadow, shadowDistance: null },
    glyphHeight,
    fontId,
  ).distance
  const distanceMax = Math.max(0.3, Math.ceil(autoDistance * 1.5 * 100) / 100)
  const angleArrow =
    ANGLE_ARROWS[((Math.round(shadow.shadowAngle / 45) % 8) + 8) % 8]
  const shadowRadians = (shadow.shadowAngle * Math.PI) / 180
  const textareaShadowDx = Math.round(2 * Math.cos(shadowRadians))
  const textareaShadowDy = Math.round(2 * Math.sin(shadowRadians))

  return (
    <div className="w-full xl:w-[340px] min-h-0 flex-1 xl:flex-none xl:shrink-0 bg-[#121214] xl:border-r border-b xl:border-b-0 border-[#43434E] overflow-y-auto flex flex-col">
      <div className="p-5 space-y-7">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[11px] tracking-[0.14em] text-[#E3FF33] uppercase flex items-center gap-1.5">
              <CopyIcon />
              01 / Copy
            </span>
            <span className="font-mono text-[9px] tracking-[0.12em] text-[#7A7A80] uppercase">
              {copy.length} chars
            </span>
          </div>
          <div className="mb-4">
            <FieldLabel icon={<FontIcon />}>Font Family</FieldLabel>
            <FontSelect fontId={fontId} onChange={onChange} />
          </div>
          <div className="relative group">
            <textarea
              value={copy}
              onChange={(e) => onChange({ copy: e.target.value })}
              placeholder="TYPE BANNER TEXT"
              spellCheck={false}
              className="w-full bg-[#08080A] border border-[#43434E] rounded-[4px] p-4 pr-3 text-[28px] leading-[0.9] tracking-[-0.01em] text-white placeholder:text-[#5A5A60] resize-none focus:outline-none focus:border-[#E3FF33]/60 min-h-[132px] transition-colors"
              style={{
                fontFamily: `"${font.family}", Impact, sans-serif`,
                fontWeight: font.weight,
                textAlign: align,
                ...(strokeOn
                  ? {
                      WebkitTextStroke: '1px #000000',
                      paintOrder: 'stroke fill',
                    }
                  : {}),
                ...(shadow.on
                  ? {
                      textShadow: `${textareaShadowDx}px ${textareaShadowDy}px 0 ${shadow.color}`,
                    }
                  : {}),
                ...(overlay.on
                  ? (() => {
                      const px = previewHatchPx(overlayResolved)
                      return hatchStyle({
                        angleDeg: overlay.angle,
                        spacing: px.spacing,
                        lineWidth: px.lineWidth,
                        color: overlay.color,
                        unit: 'px',
                      })
                    })()
                  : {}),
              }}
            />
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-[#26262E] border border-[#43434E] rounded-[3px] font-mono text-[8px] tracking-[0.1em] text-[#7A7A80] uppercase pointer-events-none">
              Live
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel icon={<FillIcon />}>Fill (Base)</FieldLabel>
                <div className="flex items-center gap-2">
                  <CustomColorWell
                    value={fill}
                    label="Custom fill color"
                    onChange={(next) => onChange({ fill: next })}
                  />
                  <div className="flex gap-1">
                    {['#000000', '#FFFFFF'].map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        title={swatch === '#000000' ? 'Black fill' : 'White fill'}
                        aria-label={swatch === '#000000' ? 'Black fill' : 'White fill'}
                        onClick={() => onChange({ fill: swatch })}
                        className={`w-8 h-11 rounded-[4px] border font-mono transition-colors flex flex-col items-center justify-center gap-0.5 ${
                          fill === swatch ? 'border-[#E3FF33]' : 'border-[#43434E]'
                        }`}
                        style={{
                          background: swatch,
                          color: swatch === '#000000' ? '#fff' : '#000',
                        }}
                      >
                        <span className="text-[10px] leading-none">
                          {swatch === '#000000' ? 'K' : 'W'}
                        </span>
                        <span className="text-[8px] leading-none uppercase tracking-[0.06em]">
                          {swatch === '#000000' ? 'Black' : 'White'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
                <div
                  className="mt-1.5 font-mono text-[10px] tracking-[0.06em] text-[#7A7A80] uppercase"
                  title="Current fill color"
                >
                  {fill}
                </div>
              </div>
              <div>
                <FieldLabel icon={<AlignIcon />}>Align</FieldLabel>
                <div className="grid grid-cols-3 gap-1">
                  {['left', 'center', 'right'].map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => onChange({ align: dir })}
                      title={`Align ${dir}`}
                      aria-label={`Align ${dir}`}
                      aria-pressed={align === dir}
                      className={`h-11 rounded-[4px] border transition-colors flex flex-col items-center justify-center gap-0.5 ${
                        align === dir
                          ? 'bg-[#E3FF33] text-black border-[#E3FF33] font-bold'
                          : 'bg-[#26262E] text-[#7A7A80] border-[#43434E] hover:text-white'
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
            </div>

            <div className="pt-1">
              <FieldLabel
                icon={<FillIcon />}
                value={
                  <Toggle
                    on={overlay.on}
                    onToggle={() => setOverlay({ on: !overlay.on })}
                    offKnob="bg-[#7A7A80]"
                  />
                }
              >
                Fill (Overlay)
              </FieldLabel>
              {overlay.on && (
                <div className="space-y-3 p-3 bg-[#08080A] border border-[#43434E] rounded-[4px]">
                  <p className="font-mono text-[10px] leading-[1.5] text-[#7A7A80]">
                    Hatch lines over the base fill, clipped to the glyph.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#7A7A80] uppercase">Color</span>
                    <CustomColorWell
                      value={overlay.color}
                      label="Custom overlay color"
                      onChange={(next) => setOverlay({ color: next })}
                    />
                  </div>
                  <HatchFields
                    values={overlay}
                    resolved={overlayResolved}
                    onPatch={setOverlay}
                  />
                </div>
              )}
            </div>

            <div className="pt-1">
              <FieldLabel
                icon={<StrokeIcon />}
                value={
                  <Toggle
                    on={strokeOn}
                    onToggle={() => onChange({ strokeOn: !strokeOn })}
                    offKnob="bg-[#7A7A80]"
                  />
                }
              >
                Stroke
              </FieldLabel>
              {strokeOn && (
                <div className="space-y-3 p-3 bg-[#08080A] border border-[#43434E] rounded-[4px]">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-[10px] text-[#7A7A80] uppercase">Width</span>
                      <span className="font-mono text-[10px] text-[#F0F0F2]">
                        {strokeWidth.toFixed(2)}"
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={0.12}
                      step={0.01}
                      value={strokeWidth}
                      onChange={(e) => onChange({ strokeWidth: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#7A7A80] uppercase">Color</span>
                    <CustomColorWell
                      value={strokeColor}
                      label="Custom stroke color"
                      onChange={(next) => onChange({ strokeColor: next })}
                    />
                  </div>
                </div>
              )}
            </div>

            <div>
              <FieldLabel
                icon={<GlyphHeightIcon />}
                value={
                  <span className="font-mono text-[11px] px-1.5 py-0.5 bg-[#26262E] border border-[#43434E] rounded-[3px] text-[#F0F0F2]">
                    {glyphHeight.toFixed(1)}"
                  </span>
                }
              >
                Glyph Height
              </FieldLabel>
              <input
                type="range"
                min={0.8}
                max={glyphMax}
                step={0.1}
                value={glyphHeight}
                onChange={(e) => onChange({ glyphHeight: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between mt-1">
                <span className="font-mono text-[8px] text-[#7A7A80]">0.8"</span>
                <span className="font-mono text-[8px] text-[#7A7A80]">
                  {glyphMax.toFixed(1)}" max
                </span>
              </div>
            </div>

            <div>
              <FieldLabel
                icon={<LineHeightIcon />}
                value={
                  <span className="font-mono text-[11px] px-1.5 py-0.5 bg-[#26262E] border border-[#43434E] rounded-[3px] text-[#F0F0F2]">
                    {lineHeight.toFixed(2)}
                  </span>
                }
              >
                Line Height
              </FieldLabel>
              <input
                type="range"
                min={0.6}
                max={1.8}
                step={0.05}
                value={lineHeight}
                onChange={(e) => onChange({ lineHeight: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between mt-1">
                <span className="font-mono text-[8px] text-[#7A7A80]">0.60</span>
                <span className="font-mono text-[8px] text-[#7A7A80]">1.80</span>
              </div>
            </div>

            <div>
              <FieldLabel
                icon={<LetterSpacingIcon />}
                value={
                  <span className="font-mono text-[11px] text-[#F0F0F2]">
                    {letterSpacing > 0 ? '+' : ''}
                    {letterSpacing.toFixed(2)}em
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
                value={letterSpacing}
                onChange={(e) => onChange({ letterSpacing: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <FieldLabel icon={<EffectIcon />}>Text Effects</FieldLabel>
              <div className="mb-2 font-mono text-[10px] tracking-[0.1em] text-[#7A7A80] uppercase">
                Text Shadow
              </div>
              <div className="flex items-center justify-between mb-2 px-3 py-2 bg-[#08080A] border border-[#43434E] rounded-[4px]">
                <span className="font-mono text-[10px] text-[#7A7A80] uppercase">
                  Black copy behind
                </span>
                <Toggle
                  on={shadow.on}
                  onToggle={() => setShadow({ on: !shadow.on })}
                  offKnob="bg-[#7A7A80]"
                />
              </div>
              {shadow.on && (
                <div className="mb-4 space-y-3 p-3 bg-[#08080A] border border-[#43434E] rounded-[4px]">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-[10px] text-[#7A7A80] uppercase">
                        Shadow fill
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { id: SHADOW_FILL_SOLID, label: 'Solid' },
                        { id: SHADOW_FILL_HATCH, label: 'Hatch' },
                      ].map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setShadow({ fillType: option.id })}
                          aria-pressed={shadow.fillType === option.id}
                          className={`h-8 rounded-[4px] border text-[11px] font-mono uppercase tracking-[0.08em] transition-all ${
                            shadow.fillType === option.id
                              ? 'bg-[#E3FF33] text-black border-[#E3FF33] font-bold'
                              : 'bg-[#26262E] text-[#7A7A80] border-[#43434E] hover:border-[#5E5E69] hover:text-[#F0F0F2]'
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#7A7A80] uppercase">Color</span>
                    <CustomColorWell
                      value={shadow.color}
                      label="Custom shadow color"
                      onChange={(next) => setShadow({ color: next })}
                    />
                  </div>
                  {shadow.fillType === SHADOW_FILL_HATCH && (
                    <HatchFields
                      values={{
                        angle: shadow.hatchAngle,
                        spacingPct: shadow.hatchSpacingPct,
                        lineWidthPct: shadow.hatchLineWidthPct,
                      }}
                      resolved={shadowHatchResolved}
                      onPatch={setShadow}
                      keys={{
                        angle: 'hatchAngle',
                        spacingPct: 'hatchSpacingPct',
                        lineWidthPct: 'hatchLineWidthPct',
                      }}
                    />
                  )}
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono text-[10px] text-[#7A7A80] uppercase">
                        Shadow distance
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-[#F0F0F2]">
                          {shadow.shadowDistance == null
                            ? `Auto ${autoDistance.toFixed(2)}"`
                            : `${shadow.shadowDistance.toFixed(2)}"`}
                        </span>
                        {shadow.shadowDistance != null && (
                          <button
                            type="button"
                            onClick={() => setShadow({ shadowDistance: null })}
                            className="font-mono text-[9px] tracking-[0.08em] uppercase text-[#E3FF33] hover:underline"
                          >
                            Auto
                          </button>
                        )}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={distanceMax}
                      step={0.01}
                      value={Math.min(shadow.shadowDistance ?? autoDistance, distanceMax)}
                      onChange={(e) =>
                        setShadow({ shadowDistance: parseFloat(e.target.value) })
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="font-mono text-[8px] text-[#7A7A80]">0.00"</span>
                      <span className="font-mono text-[8px] text-[#7A7A80]">
                        Auto = 0.9 × bar width
                      </span>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-[10px] text-[#7A7A80] uppercase">
                        Shadow angle
                      </span>
                      <span className="font-mono text-[10px] text-[#F0F0F2]">
                        {shadow.shadowAngle}° {angleArrow}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={5}
                      value={shadow.shadowAngle}
                      onChange={(e) =>
                        setShadow({ shadowAngle: parseFloat(e.target.value) })
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="font-mono text-[8px] text-[#7A7A80]">0° →</span>
                      <span className="font-mono text-[8px] text-[#7A7A80]">45° ↘ default</span>
                    </div>
                  </div>
                </div>
              )}
              <div className="mb-2 font-mono text-[10px] tracking-[0.1em] text-[#7A7A80] uppercase">
                Glyph Effects
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {[
                  { id: TEXT_EFFECT_NONE, label: 'None' },
                  { id: TEXT_EFFECT_OUTLINE_COPY_SHADOW, label: 'Outline + Shadow' },
                  { id: TEXT_EFFECT_HATCH_SHADOW, label: 'Hatch + Shadow' },
                  { id: TEXT_EFFECT_FILL_HATCH_SHADOW, label: 'Fill + Hatch-Shadow 90deg' },
                  { id: TEXT_EFFECT_FILL_HATCH_SHADOW_0DEG, label: 'Fill + Hatch-Shadow 0deg' },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => applyPreset(option.id)}
                    aria-pressed={matchedPreset === option.id}
                    className={`px-2 py-1.5 rounded-[4px] border transition-all flex flex-col gap-1.5 ${
                      matchedPreset === option.id
                        ? 'bg-[#E3FF33] text-black border-[#E3FF33]'
                        : 'bg-[#26262E] text-[#7A7A80] border-[#43434E] hover:border-[#5E5E69] hover:text-[#F0F0F2]'
                    }`}
                  >
                    <PresetPreview presetId={option.id} font={font} />
                    <span
                      className={`text-[11px] font-mono uppercase tracking-[0.06em] ${
                        matchedPreset === option.id ? 'font-bold' : ''
                      }`}
                    >
                      {option.label}
                    </span>
                  </button>
                ))}
              </div>
              <div
                aria-live="polite"
                className={`mt-1.5 px-2 py-1.5 rounded-[4px] border border-dashed text-center text-[11px] font-mono uppercase tracking-[0.06em] ${
                  matchedPreset === TEXT_EFFECT_CUSTOM
                    ? 'border-[#E3FF33] text-[#E3FF33]'
                    : 'border-[#43434E] text-[#5A5A60]'
                }`}
              >
                Custom
                {matchedPreset === TEXT_EFFECT_CUSTOM ? ' — your mix' : ' — off preset'}
              </div>
              <p className="mt-2 font-mono text-[10px] leading-[1.5] text-[#7A7A80]">
                Presets set fill, stroke, overlay and shadow together.
                Hatch + Shadow uses white fill, black hatch at 90°, black
                stroke, and a solid black shadow. Fill + Hatch-Shadow uses
                black fill with a hatch shadow at 90° or 0°.
              </p>
            </div>

            <div>
              <FieldLabel icon={<TransformIcon />}>Text Transform</FieldLabel>
              <div className="grid grid-cols-3 gap-1.5">
                {['uppercase', 'lowercase', 'asIs'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onChange({ transform: mode })}
                    className={`h-8 rounded-[4px] border text-[11px] font-mono uppercase tracking-[0.08em] transition-all ${
                      transform === mode
                        ? 'bg-[#E3FF33] text-black border-[#E3FF33] font-bold'
                        : 'bg-[#26262E] text-[#7A7A80] border-[#43434E] hover:border-[#5E5E69] hover:text-[#F0F0F2]'
                    }`}
                  >
                    {mode === 'asIs' ? 'As Is' : mode}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-auto p-5 pt-4 border-t border-[#43434E] bg-[#08080A]/50">
        <p className="font-mono text-[10px] leading-[1.5] tracking-[0.02em] text-[#5A5A60]">
          Built for real printers. No edge-to-edge assumptions. Trim on lime, tape the hatch.
        </p>
      </div>
    </div>
  )
}
