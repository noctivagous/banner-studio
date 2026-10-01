import { useEffect, useState } from 'react'
import {
  DEFAULT_TEXT_LAYER,
  MAX_TEXT_LAYERS,
  PX_PER_INCH,
  TEXT_EFFECT_CUSTOM,
  TEXT_EFFECT_FILL_HATCH_SHADOW,
  TEXT_EFFECT_FILL_HATCH_SHADOW_0DEG,
  TEXT_EFFECT_HATCH_SHADOW,
  TEXT_EFFECT_NONE,
  TEXT_EFFECT_OUTLINE_COPY_SHADOW,
  applyLayerPreset,
  createLayerId,
  estimateBarWidthInches,
  glyphMaxInches,
  hatchStyle,
  matchLayerPreset,
  resolveLayerHatchIn,
  resolveLayerOffsetIn,
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
    fontSize: 42,
    lineHeight: 1,
  }
  const tile =
    'h-20 rounded-[3px] bg-white flex items-center justify-center overflow-hidden'
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
  layers,
  align,
  printableHeight,
  onChange,
}) {
  const glyphMax = glyphMaxInches(printableHeight)
  const stack =
    Array.isArray(layers) && layers.length > 0
      ? layers
      : [{ ...DEFAULT_TEXT_LAYER, id: 'layer-face' }]
  const [selectedId, setSelectedId] = useState(stack[stack.length - 1].id)
  useEffect(() => {
    if (!stack.some((layer) => layer.id === selectedId)) {
      setSelectedId(stack[stack.length - 1].id)
    }
  }, [stack, selectedId])
  const selected = stack.find((layer) => layer.id === selectedId) ?? stack[stack.length - 1]
  const setLayers = (next) => onChange({ layers: next })
  const patchLayer = (id, patch) =>
    setLayers(stack.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)))
  const setSelected = (patch) => patchLayer(selected.id, patch)
  const matchedPreset = matchLayerPreset(stack)
  const applyPreset = (presetId) => {
    const next = applyLayerPreset(presetId, {
      layers: stack,
      glyphHeightIn: glyphHeight,
      fontId,
    })
    onChange(next)
    setSelectedId(next.layers[next.layers.length - 1].id)
  }
  const moveLayer = (id, delta) => {
    const index = stack.findIndex((layer) => layer.id === id)
    const target = index + delta
    if (index < 0 || target < 0 || target >= stack.length) return
    const next = [...stack]
    const [layer] = next.splice(index, 1)
    next.splice(target, 0, layer)
    setLayers(next)
  }
  const duplicateLayer = (id) => {
    if (stack.length >= MAX_TEXT_LAYERS) return
    const index = stack.findIndex((layer) => layer.id === id)
    if (index < 0) return
    const source = stack[index]
    const next = [...stack]
    const copyLayer = {
      ...source,
      id: createLayerId(),
      name: `${source.name} copy`.slice(0, 24),
    }
    next.splice(index + 1, 0, copyLayer)
    setLayers(next.slice(0, MAX_TEXT_LAYERS))
    setSelectedId(copyLayer.id)
  }
  const removeLayer = (id) => {
    if (stack.length <= 1) return
    const next = stack.filter((layer) => layer.id !== id)
    setLayers(next)
    if (id === selectedId) setSelectedId(next[next.length - 1].id)
  }
  const overlayResolved = resolveLayerHatchIn(selected, glyphHeight, fontId)
  const offset = resolveLayerOffsetIn(selected)
  const setOffset = (next) => {
    const distance = Math.max(0, next.distance ?? offset.distance)
    const angle = next.angle ?? offset.angle
    const radians = (angle * Math.PI) / 180
    setSelected({
      dxIn: distance * Math.cos(radians),
      dyIn: distance * Math.sin(radians),
    })
  }
  const snapToAuto = () => {
    const auto = resolveShadowOffsetIn(
      { shadowDistance: null, shadowAngle: offset.angle },
      glyphHeight,
      fontId,
    )
    setSelected({ dxIn: auto.dx, dyIn: auto.dy })
  }
  const autoDistance = 0.9 * estimateBarWidthInches(glyphHeight, fontId)
  const distanceMax = Math.max(0.3, Math.ceil(autoDistance * 1.5 * 100) / 100)
  const angleArrow = ANGLE_ARROWS[((Math.round(offset.angle / 45) % 8) + 8) % 8]
  const previewScale = 28 / Math.max(1, glyphHeight * PX_PER_INCH * 0.9)
  const previewHatchPx = (resolved) => ({
    spacing: Math.max(2, resolved.spacingIn * PX_PER_INCH * previewScale),
    lineWidth: Math.max(1, resolved.lineWidthIn * PX_PER_INCH * previewScale),
  })
  // The textarea previews the front visible copy; the backmost offset copy
  // becomes a single CSS shadow so the stack reads at a glance.
  const visibleStack = stack.filter((layer) => layer.visible !== false)
  const frontLayer = visibleStack[visibleStack.length - 1] ?? selected
  const frontHatchPx = previewHatchPx(resolveLayerHatchIn(frontLayer, glyphHeight, fontId))
  const backOffset = visibleStack.find(
    (layer) => Math.hypot(Number(layer.dxIn) || 0, Number(layer.dyIn) || 0) > 1e-9,
  )
  const backRadians = backOffset
    ? Math.atan2(Number(backOffset.dyIn) || 0, Number(backOffset.dxIn) || 0)
    : 0
  const textareaShadowDx = Math.round(2 * Math.cos(backRadians))
  const textareaShadowDy = Math.round(2 * Math.sin(backRadians))

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
                color: frontLayer.overlayOn ? undefined : frontLayer.fill,
                ...(frontLayer.strokeOn
                  ? {
                      WebkitTextStroke: `1px ${frontLayer.strokeColor}`,
                      paintOrder: 'stroke fill',
                    }
                  : {}),
                ...(backOffset
                  ? {
                      textShadow: `${textareaShadowDx}px ${textareaShadowDy}px 0 ${backOffset.fill}`,
                    }
                  : {}),
                ...(frontLayer.overlayOn
                  ? hatchStyle({
                      angleDeg: frontLayer.overlayAngle,
                      spacing: frontHatchPx.spacing,
                      lineWidth: frontHatchPx.lineWidth,
                      color: frontLayer.overlayColor,
                      unit: 'px',
                    })
                  : {}),
              }}
            />
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-[#26262E] border border-[#43434E] rounded-[3px] font-mono text-[8px] tracking-[0.1em] text-[#7A7A80] uppercase pointer-events-none">
              Live
            </div>
          </div>

          <div className="mt-4">
            <FieldLabel icon={<EffectIcon />}>Text stack</FieldLabel>
            <p className="mb-2 font-mono text-[10px] leading-[1.5] text-[#7A7A80]">
              Top = back, bottom = front. Drawn in order — select a row to edit
              its paint.
            </p>
            <div role="listbox" aria-label="Text layers" className="space-y-1">
              {stack.map((layer, index) => {
                const layerOffset = resolveLayerOffsetIn(layer)
                const layerArrow =
                  ANGLE_ARROWS[((Math.round(layerOffset.angle / 45) % 8) + 8) % 8]
                const isSelected = layer.id === selected.id
                const rowButton =
                  'w-6 h-6 rounded-[3px] border border-transparent text-[#7A7A80] hover:text-white hover:border-[#43434E] disabled:opacity-25 disabled:hover:text-[#7A7A80] disabled:hover:border-transparent font-mono text-[11px] leading-none flex items-center justify-center'
                return (
                  <div
                    key={layer.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => setSelectedId(layer.id)}
                    className={`flex items-center gap-1.5 px-1.5 py-1.5 rounded-[4px] border cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-[#26262E] border-[#E3FF33]'
                        : 'bg-[#08080A] border-[#43434E] hover:border-[#5E5E69]'
                    } ${layer.visible === false ? 'opacity-50' : ''}`}
                  >
                    <button
                      type="button"
                      title={layer.visible === false ? 'Show layer' : 'Hide layer'}
                      aria-label={`${layer.visible === false ? 'Show' : 'Hide'} ${layer.name}`}
                      aria-pressed={layer.visible !== false}
                      onClick={(event) => {
                        event.stopPropagation()
                        patchLayer(layer.id, { visible: !(layer.visible !== false) })
                      }}
                      className={rowButton}
                    >
                      {layer.visible === false ? '○' : '◉'}
                    </button>
                    <span
                      aria-hidden="true"
                      title={`Fill ${layer.fill}`}
                      className="w-4 h-4 rounded-full border border-[#43434E] shrink-0"
                      style={{ background: layer.fill }}
                    />
                    <span className="flex-1 min-w-0 font-mono text-[11px] tracking-[0.04em] text-[#F0F0F2] truncate uppercase">
                      {index === 0 && (
                        <span className="text-[8px] text-[#7A7A80] mr-1">Back</span>
                      )}
                      {layer.name}
                      {index === stack.length - 1 && (
                        <span className="text-[8px] text-[#E3FF33] ml-1">Front</span>
                      )}
                    </span>
                    <span
                      title={`Offset dx ${layerOffset.dx.toFixed(2)}" dy ${layerOffset.dy.toFixed(2)}"`}
                      className="font-mono text-[10px] text-[#7A7A80] shrink-0"
                    >
                      {layerOffset.distance.toFixed(2)}&quot; {layerArrow}
                    </span>
                    <button
                      type="button"
                      title="Move toward back"
                      aria-label={`Move ${layer.name} toward back`}
                      disabled={index === 0}
                      onClick={(event) => {
                        event.stopPropagation()
                        moveLayer(layer.id, -1)
                      }}
                      className={rowButton}
                    >
                      ▲
                    </button>
                    <button
                      type="button"
                      title="Move toward front"
                      aria-label={`Move ${layer.name} toward front`}
                      disabled={index === stack.length - 1}
                      onClick={(event) => {
                        event.stopPropagation()
                        moveLayer(layer.id, 1)
                      }}
                      className={rowButton}
                    >
                      ▼
                    </button>
                    <button
                      type="button"
                      title="Duplicate layer"
                      aria-label={`Duplicate ${layer.name}`}
                      disabled={stack.length >= MAX_TEXT_LAYERS}
                      onClick={(event) => {
                        event.stopPropagation()
                        duplicateLayer(layer.id)
                      }}
                      className={rowButton}
                    >
                      ⧉
                    </button>
                    <button
                      type="button"
                      title="Delete layer"
                      aria-label={`Delete ${layer.name}`}
                      disabled={stack.length <= 1}
                      onClick={(event) => {
                        event.stopPropagation()
                        removeLayer(layer.id)
                      }}
                      className={rowButton}
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
            <button
              type="button"
              onClick={() => duplicateLayer(selected.id)}
              disabled={stack.length >= MAX_TEXT_LAYERS}
              className="mt-1.5 w-full h-8 rounded-[4px] border border-dashed border-[#43434E] font-mono text-[10px] tracking-[0.1em] text-[#7A7A80] uppercase hover:text-[#F0F0F2] hover:border-[#5E5E69] disabled:opacity-40"
            >
              + Add copy · {stack.length}/{MAX_TEXT_LAYERS}
            </button>
          </div>

          <div className="mt-4 space-y-4">
            <div className="font-mono text-[10px] tracking-[0.1em] text-[#E3FF33] uppercase">
              Editing · {selected.name}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel icon={<FillIcon />}>Fill (Base)</FieldLabel>
                <div className="flex items-center gap-2">
                  <CustomColorWell
                    value={selected.fill}
                    label="Custom fill color"
                    onChange={(next) => setSelected({ fill: next })}
                  />
                  <div className="flex gap-1">
                    {['#000000', '#FFFFFF'].map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        title={swatch === '#000000' ? 'Black fill' : 'White fill'}
                        aria-label={swatch === '#000000' ? 'Black fill' : 'White fill'}
                        onClick={() => setSelected({ fill: swatch })}
                        className={`w-8 h-11 rounded-[4px] border font-mono transition-colors flex flex-col items-center justify-center gap-0.5 ${
                          selected.fill.toUpperCase() === swatch
                            ? 'border-[#E3FF33]'
                            : 'border-[#43434E]'
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
                  {selected.fill}
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
                    on={selected.overlayOn}
                    onToggle={() => setSelected({ overlayOn: !selected.overlayOn })}
                    offKnob="bg-[#7A7A80]"
                  />
                }
              >
                Fill (Overlay)
              </FieldLabel>
              {selected.overlayOn && (
                <div className="space-y-3 p-3 bg-[#08080A] border border-[#43434E] rounded-[4px]">
                  <p className="font-mono text-[10px] leading-[1.5] text-[#7A7A80]">
                    Hatch lines over the base fill, clipped to the glyph.
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#7A7A80] uppercase">Color</span>
                    <CustomColorWell
                      value={selected.overlayColor}
                      label="Custom overlay color"
                      onChange={(next) => setSelected({ overlayColor: next })}
                    />
                  </div>
                  <HatchFields
                    values={{
                      angle: selected.overlayAngle,
                      spacingPct: selected.overlaySpacingPct,
                      lineWidthPct: selected.overlayLineWidthPct,
                    }}
                    resolved={overlayResolved}
                    onPatch={setSelected}
                    keys={{
                      angle: 'overlayAngle',
                      spacingPct: 'overlaySpacingPct',
                      lineWidthPct: 'overlayLineWidthPct',
                    }}
                  />
                </div>
              )}
            </div>

            <div className="pt-1">
              <FieldLabel
                icon={<StrokeIcon />}
                value={
                  <Toggle
                    on={selected.strokeOn}
                    onToggle={() => setSelected({ strokeOn: !selected.strokeOn })}
                    offKnob="bg-[#7A7A80]"
                  />
                }
              >
                Stroke
              </FieldLabel>
              {selected.strokeOn && (
                <div className="space-y-3 p-3 bg-[#08080A] border border-[#43434E] rounded-[4px]">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-[10px] text-[#7A7A80] uppercase">Width</span>
                      <span className="font-mono text-[10px] text-[#F0F0F2]">
                        {Number(selected.strokeWidthIn).toFixed(2)}"
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={0.12}
                      step={0.01}
                      value={selected.strokeWidthIn}
                      onChange={(e) =>
                        setSelected({ strokeWidthIn: parseFloat(e.target.value) })
                      }
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#7A7A80] uppercase">Color</span>
                    <CustomColorWell
                      value={selected.strokeColor}
                      label="Custom stroke color"
                      onChange={(next) => setSelected({ strokeColor: next })}
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
              <FieldLabel icon={<EffectIcon />}>Offset · {selected.name}</FieldLabel>
              <div className="mb-4 space-y-3 p-3 bg-[#08080A] border border-[#43434E] rounded-[4px]">
                  <p className="font-mono text-[10px] leading-[1.5] text-[#7A7A80]">
                    Position of this copy. The face usually sits at 0.00&quot;;
                    copies behind it form the shadow.
                  </p>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-mono text-[10px] text-[#7A7A80] uppercase">
                        Distance
                      </span>
                      <span className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] text-[#F0F0F2]">
                          {offset.distance.toFixed(2)}&quot;
                        </span>
                        <button
                          type="button"
                          onClick={snapToAuto}
                          title={`Snap to auto ${autoDistance.toFixed(2)}" at the current angle`}
                          className="font-mono text-[9px] tracking-[0.08em] uppercase text-[#E3FF33] hover:underline"
                        >
                          Auto
                        </button>
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={distanceMax}
                      step={0.01}
                      value={Math.min(offset.distance, distanceMax)}
                      onChange={(e) =>
                        setOffset({ distance: parseFloat(e.target.value) })
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
                        Angle
                      </span>
                      <span className="font-mono text-[10px] text-[#F0F0F2]">
                        {Math.round(offset.angle)}° {angleArrow}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={5}
                      value={Math.round(offset.angle)}
                      onChange={(e) =>
                        setOffset({ angle: parseFloat(e.target.value) })
                      }
                      className="w-full"
                    />
                    <div className="flex justify-between mt-1">
                      <span className="font-mono text-[8px] text-[#7A7A80]">0° →</span>
                      <span className="font-mono text-[8px] text-[#7A7A80]">45° ↘ default</span>
                    </div>
                  </div>
                  <div className="font-mono text-[10px] text-[#7A7A80]">
                    dx {offset.dx.toFixed(2)}&quot; · dy {offset.dy.toFixed(2)}&quot;
                  </div>
                </div>
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
                Presets set up the stack above: fill, stroke, overlay and
                offsets together. Hatch + Shadow uses white fill, black hatch
                at 90°, black stroke, and a solid black copy behind. Fill +
                Hatch-Shadow uses black fill with a hatch copy behind at 90°
                or 0°.
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
