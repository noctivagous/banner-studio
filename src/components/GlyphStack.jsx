import { useEffect, useState } from 'react'
import {
  AUTO_SHADOW_BAR_FACTOR,
  DEFAULT_TEXT_LAYER,
  FILL_HATCH_SHADOW,
  FILL_HATCH_SHADOW_0DEG_ANGLE,
  MAX_TEXT_LAYERS,
  TEXT_EFFECT_BLOCK_SHADE,
  TEXT_EFFECT_CAST,
  TEXT_EFFECT_CUSTOM,
  TEXT_EFFECT_CUTOUT,
  TEXT_EFFECT_FILL_HATCH_SHADOW,
  TEXT_EFFECT_FILL_HATCH_SHADOW_0DEG,
  TEXT_EFFECT_HATCH_SHADOW,
  TEXT_EFFECT_KEYLINE,
  TEXT_EFFECT_NONE,
  TEXT_EFFECT_OUTLINE_COPY_SHADOW,
  TEXT_EFFECT_SHADE,
  TEXT_EFFECT_SIGNAL,
  applyLayerPreset,
  createLayerId,
  estimateBarWidthInches,
  hatchStyle,
  matchLayerPreset,
  resolveLayerHatchIn,
  resolveLayerOffsetIn,
  resolveShadowOffsetIn,
} from '../lib/layout.js'
import { FieldLabel } from './FieldLabel.jsx'
import { Toggle } from './Toggle.jsx'
import { EffectIcon, FillIcon, StrokeIcon } from './icons.jsx'

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
  if (presetId === TEXT_EFFECT_SHADE) {
    return (
      <div className={tile}>
        <span
          style={{
            ...face,
            color: '#FFFFFF',
            textShadow: '2px 2px 0 #000000',
          }}
        >
          Aa
        </span>
      </div>
    )
  }
  if (presetId === TEXT_EFFECT_KEYLINE) {
    return (
      <div className={tile}>
        <span
          style={{
            ...face,
            color: '#FFFFFF',
            WebkitTextStroke: '3px #000000',
            paintOrder: 'stroke fill',
            textShadow: '2px 2px 0 #000000',
          }}
        >
          Aa
        </span>
      </div>
    )
  }
  if (presetId === TEXT_EFFECT_BLOCK_SHADE) {
    return (
      <div className={tile}>
        <span
          style={{
            ...face,
            color: '#FFFFFF',
            textShadow: '2px 2px 0 #000000, 4px 4px 0 #000000',
          }}
        >
          Aa
        </span>
      </div>
    )
  }
  if (presetId === TEXT_EFFECT_SIGNAL) {
    return (
      <div className={tile}>
        <span
          style={{
            ...face,
            color: '#C1272D',
            textShadow: '2px 2px 0 #000000',
          }}
        >
          Aa
        </span>
      </div>
    )
  }
  if (presetId === TEXT_EFFECT_CAST) {
    return (
      <div className={tile}>
        <span style={{ ...face, position: 'relative', color: '#FFFFFF' }}>
          Aa
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              transform: 'translate(3px, 3px) skewX(-25deg)',
              transformOrigin: '50% 100%',
              color: '#000000',
            }}
          >
            Aa
          </span>
        </span>
      </div>
    )
  }
  if (presetId === TEXT_EFFECT_CUTOUT) {
    return (
      <div className={tile}>
        <span
          style={{
            ...face,
            color: '#FFFFFF',
            textShadow:
              '1px 1px 0 #000000, 2px 2px 0 #000000, 3px 3px 0 #000000, 4px 4px 0 #000000',
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
  const angle =
    presetId === TEXT_EFFECT_FILL_HATCH_SHADOW_0DEG
      ? FILL_HATCH_SHADOW_0DEG_ANGLE
      : FILL_HATCH_SHADOW.hatchAngle
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
          <span className="font-mono text-[10px] text-[#7A7A80] uppercase">Hatch angle</span>
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
          <span className="font-mono text-[10px] text-[#7A7A80] uppercase">Line spacing</span>
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
          <span className="font-mono text-[10px] text-[#7A7A80] uppercase">Line width</span>
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

export function CustomColorWell({ value, label, onChange }) {
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

export function GlyphStack({ line, font, onPatchLine }) {
  const stack =
    Array.isArray(line.layers) && line.layers.length > 0
      ? line.layers
      : [{ ...DEFAULT_TEXT_LAYER, id: 'layer-face' }]
  const [selectedId, setSelectedId] = useState(stack[stack.length - 1].id)
  useEffect(() => {
    if (!stack.some((layer) => layer.id === selectedId)) {
      setSelectedId(stack[stack.length - 1].id)
    }
  }, [stack, selectedId])
  const selected = stack.find((layer) => layer.id === selectedId) ?? stack[stack.length - 1]
  const setLayers = (next) => onPatchLine({ layers: next })
  const patchLayer = (id, layerPatch) =>
    setLayers(stack.map((layer) => (layer.id === id ? { ...layer, ...layerPatch } : layer)))
  const setSelected = (layerPatch) => patchLayer(selected.id, layerPatch)
  const matchedPreset = matchLayerPreset(stack)
  const applyPreset = (presetId) => {
    const next = applyLayerPreset(presetId, {
      layers: stack,
      glyphHeightIn: line.glyphHeight,
      fontId: line.fontId,
    })
    onPatchLine(next)
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
  const overlayResolved = resolveLayerHatchIn(selected, line.glyphHeight, line.fontId)
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
      line.glyphHeight,
      line.fontId,
    )
    setSelected({ dxIn: auto.dx, dyIn: auto.dy })
  }
  const autoDistance = AUTO_SHADOW_BAR_FACTOR * estimateBarWidthInches(line.glyphHeight, line.fontId)
  const distanceMax = Math.max(0.3, Math.ceil(autoDistance * 1.5 * 100) / 100)
  const angleArrow = ANGLE_ARROWS[((Math.round(offset.angle / 45) % 8) + 8) % 8]
  const rowButton =
    'w-6 h-6 rounded-[3px] border border-transparent text-[#7A7A80] hover:text-white hover:border-[#43434E] disabled:opacity-25 disabled:hover:text-[#7A7A80] disabled:hover:border-transparent font-mono text-[11px] leading-none flex items-center justify-center'

  return (
    <div className="space-y-4">
      <div>
        <FieldLabel icon={<EffectIcon />}>Glyph stack</FieldLabel>
        <p className="mb-2 font-mono text-[10px] leading-[1.5] text-[#7A7A80]">
          Z axis — top = back, bottom = front. Same glyphs, stacked in depth.
        </p>
        <div role="listbox" aria-label="Glyph layers" className="space-y-1">
          {stack.map((layer, index) => {
            const layerOffset = resolveLayerOffsetIn(layer)
            const layerArrow =
              ANGLE_ARROWS[((Math.round(layerOffset.angle / 45) % 8) + 8) % 8]
            const isSelected = layer.id === selected.id
            return (
              <div
                key={layer.id}
                role="option"
                aria-selected={isSelected}
                onClick={() => setSelectedId(layer.id)}
                className={`flex items-center gap-1.5 px-1.5 py-1.5 rounded-[4px] border cursor-pointer transition-colors ${
                  isSelected
                    ? 'bg-[var(--ctl)] border-[#E3FF33]'
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
                  {index === 0 && <span className="text-[8px] text-[#7A7A80] mr-1">Back</span>}
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
          + Add glyph copy · {stack.length}/{MAX_TEXT_LAYERS}
        </button>
      </div>

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
      </div>

      <div>
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

      <div>
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
                onChange={(e) => setSelected({ strokeWidthIn: parseFloat(e.target.value) })}
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
        <FieldLabel icon={<EffectIcon />}>Offset · {selected.name}</FieldLabel>
        <div className="mb-4 space-y-3 p-3 bg-[#08080A] border border-[#43434E] rounded-[4px]">
          <p className="mb-0 font-mono text-[10px] leading-[1.5] text-[#7A7A80]">
            Position of this copy. The face usually sits at 0.00&quot;; copies behind it
            form the shadow.
          </p>
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="font-mono text-[10px] text-[#7A7A80] uppercase">Distance</span>
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
              onChange={(e) => setOffset({ distance: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between mt-1">
              <span className="font-mono text-[8px] text-[#7A7A80]">0.00"</span>
              <span className="font-mono text-[8px] text-[#7A7A80]">Auto = 0.9 × bar width</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="font-mono text-[10px] text-[#7A7A80] uppercase">Angle</span>
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
              onChange={(e) => setOffset({ angle: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between mt-1">
              <span className="font-mono text-[8px] text-[#7A7A80]">0° →</span>
              <span className="font-mono text-[8px] text-[#7A7A80]">45° ↘ default</span>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1">
              <span className="font-mono text-[10px] text-[#7A7A80] uppercase">Skew</span>
              <span className="font-mono text-[10px] text-[#F0F0F2]">
                {Math.round(Number(selected.skewXDeg) || 0)}°
              </span>
            </div>
            <input
              type="range"
              min={-45}
              max={45}
              step={5}
              value={Math.round(Number(selected.skewXDeg) || 0)}
              onChange={(e) => setSelected({ skewXDeg: parseFloat(e.target.value) })}
              className="w-full"
              aria-label="Layer skew degrees"
            />
            <div className="flex justify-between mt-1">
              <span className="font-mono text-[8px] text-[#7A7A80]">-45° ⁄</span>
              <span className="font-mono text-[8px] text-[#7A7A80]">cast shadow −25°</span>
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
            { id: TEXT_EFFECT_SHADE, label: 'Shade' },
            { id: TEXT_EFFECT_KEYLINE, label: 'Keyline' },
            { id: TEXT_EFFECT_BLOCK_SHADE, label: '3D Block' },
            { id: TEXT_EFFECT_SIGNAL, label: 'Signal' },
            { id: TEXT_EFFECT_CAST, label: 'Cast' },
            { id: TEXT_EFFECT_CUTOUT, label: 'Cutout 3D' },
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
                  : 'bg-[var(--ctl)] text-[#7A7A80] border-[#43434E] hover:border-[#5E5E69] hover:text-[#F0F0F2]'
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
          Presets set up the glyph stack above: fill, stroke, overlay and offsets
          together. Shade is a clean offset block with no outline; Keyline adds
          a heavy outline ring; 3D Block steps the shade twice for an extruded
          look; Signal is a red face on a black shade. Cast shears the shade so it
          falls like a shadow on the surface behind the type; Cutout 3D stacks
          four solid shade steps for a cut-block letterform. Hatch + Shadow uses white
          fill, black hatch at 90°, black stroke, and a solid black copy behind.
          Fill + Hatch-Shadow uses black fill with a hatch copy behind at 90° or 0°.
        </p>
      </div>
    </div>
  )
}
