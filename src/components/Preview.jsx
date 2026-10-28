import { Fragment, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { SegmentControl } from './SegmentControl.jsx'
import {
  cornerLengthIn,
  cutPolygonCss,
  cutPolygonPoints,
  findLine,
  fontOf,
  lineText,
  withLine,
} from '../lib/composition.js'
import { GRID_HALF_IN, GRID_PITCH_IN, gridLinesIn, placeFrameInTrim } from '../lib/grid.js'
import {
  JOIN_ALIGN_RECUT,
  PREVIEW_CUT_LINE,
  PREVIEW_CUT_LINE_H,
  PX_PER_INCH,
  coveredSpan,
  hatchStyle,
  horizontalCutInches,
  joinDuplicates,
  overlapCutSlack,
  resolveLayerHatchIn,
  verticalCutInches,
} from '../lib/layout.js'
import { SheetJoinMarks } from './JoinMarks.jsx'

const PAPER_NOISE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

function LineEditor({ line, width, height, hatchUnit, scale, onChange, onCommit, onCancel }) {
  const font = fontOf(line)
  const ref = useRef(null)
  const cancelled = useRef(false)
  const visible = (line.layers || []).filter((layer) => layer?.visible !== false)
  const front = visible[visible.length - 1] ?? line.layers?.[0]
  const transform =
    line.transform === 'uppercase'
      ? 'uppercase'
      : line.transform === 'lowercase'
        ? 'lowercase'
        : 'none'

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus({ preventScroll: true })
    el.select()
  }, [])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.width = '0px'
    const next = Math.max(el.scrollWidth + 2, el.parentElement?.clientWidth || 0)
    el.style.width = `${next}px`
  }, [line.copy, width])

  return (
    <input
      ref={ref}
      aria-label="Edit line"
      value={line.copy}
      spellCheck={false}
      onChange={(event) => onChange(event.target.value.replace(/\n/g, ' '))}
      onBlur={() => {
        if (!cancelled.current) onCommit()
      }}
      onClick={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          cancelled.current = true
          onCancel()
        }
      }}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        margin: 0,
        padding: 0,
        border: 0,
        outline: 'none',
        background: 'transparent',
        caretColor: '#111111',
        fontFamily: `"${font.family}", Impact, sans-serif`,
        fontWeight: font.weight,
        fontSize: `${line.glyphHeight * 0.9 * scale}${hatchUnit}`,
        letterSpacing: `${line.letterSpacing}em`,
        lineHeight: height,
        height,
        minWidth: width,
        whiteSpace: 'nowrap',
        color: front?.overlayOn ? '#111111' : front?.fill || '#111111',
        textTransform: transform,
        textAlign: 'left',
        userSelect: 'text',
      }}
    />
  )
}

function GlyphLine({ line, width, height, hatchUnit, scale }) {
  const font = fontOf(line)
  const text = lineText(line) || '\u00a0'
  const fontSize = `${line.glyphHeight * 0.9 * scale}${hatchUnit}`
  const visible = (line.layers || []).filter((layer) => layer?.visible !== false)
  return (
    <div
      style={{
        fontFamily: `"${font.family}", Impact, sans-serif`,
        fontWeight: font.weight,
        fontSize,
        letterSpacing: `${line.letterSpacing}em`,
        lineHeight: height,
        width,
        height,
        whiteSpace: 'nowrap',
        position: 'relative',
        overflow: 'visible',
      }}
    >
      <span aria-hidden="true" style={{ position: 'relative', visibility: 'hidden' }}>
        {text}
      </span>
      {visible.map((layer) => {
        const hatch = layer.overlayOn
          ? resolveLayerHatchIn(layer, line.glyphHeight, line.fontId)
          : null
        const dx = (Number(layer.dxIn) || 0) * scale
        const dy = (Number(layer.dyIn) || 0) * scale
        const skew = Number(layer.skewXDeg) || 0
        const strokeCss = `${(Number(layer.strokeWidthIn) || 0) * scale}${hatchUnit} ${layer.strokeColor}`
        const hatchProps = hatch
          ? {
              angleDeg: hatch.angle,
              spacing: hatch.spacingIn * scale,
              lineWidth: hatch.lineWidthIn * scale,
              color: layer.overlayColor,
            }
          : null
        return (
          <div
            key={layer.id}
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              transform: `translate(${dx}${hatchUnit}, ${dy}${hatchUnit})${
                skew ? ` skewX(${skew}deg)` : ''
              }`,
              ...(skew ? { transformOrigin: '50% 100%' } : {}),
            }}
          >
            <span
              style={{
                position: 'relative',
                color: layer.fill,
                ...(layer.strokeOn && !hatchProps
                  ? { WebkitTextStroke: strokeCss, paintOrder: 'stroke fill' }
                  : {}),
              }}
            >
              {text}
            </span>
            {hatchProps && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  ...hatchStyle({
                    ...hatchProps,
                    unit: hatchUnit,
                    ...(layer.strokeOn ? { strokeCss } : {}),
                  }),
                }}
              >
                {text}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

function ContainerShape({ container, widthIn, heightIn, scale, unit }) {
  const width = widthIn * scale
  const height = heightIn * scale
  const corner = container.decoration.corner
  const cut = cornerLengthIn(container, widthIn, heightIn) * scale
  const fill = container.fillOn ? container.fill : 'none'
  const stroke = container.strokeOn ? container.strokeColor : 'none'
  const strokeWidth = (container.strokeOn ? container.strokeWidthIn : 0) * scale
  if (corner === 'cut') {
    const points = cutPolygonPoints(width, height, cut)
      .map(([x, y]) => `${x},${y}`)
      .join(' ')
    return (
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${width} ${height}`}
        width={`${width}${unit}`}
        height={`${height}${unit}`}
        style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
      >
        <polygon
          points={points}
          fill={fill}
          stroke={stroke}
          strokeWidth={strokeWidth}
          strokeLinejoin="miter"
        />
      </svg>
    )
  }
  const rx = corner === 'round' ? cut : 0
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${width} ${height}`}
      width={`${width}${unit}`}
      height={`${height}${unit}`}
      style={{ position: 'absolute', inset: 0, overflow: 'visible', pointerEvents: 'none' }}
    >
      <rect
        x={strokeWidth / 2}
        y={strokeWidth / 2}
        width={Math.max(0, width - strokeWidth)}
        height={Math.max(0, height - strokeWidth)}
        rx={rx}
        fill={fill}
        stroke={stroke}
        strokeWidth={strokeWidth}
      />
    </svg>
  )
}

export function BannerComposition({
  composition,
  measured,
  hatchUnit,
  unitPerInch,
  selection,
  showGuides,
  onSelect,
  onChangeLine,
  editingLineId,
  onEditStart,
  onEditEnd,
  onEditCancel,
}) {
  const scale = hatchUnit === 'px' ? unitPerInch : 1
  const container = composition.container
  const w = measured.width
  const h = measured.height
  const widthU = `${w * scale}${hatchUnit}`
  const heightU = `${h * scale}${hatchUnit}`
  const corner = container.decoration.corner
  const cut = cornerLengthIn(container, w, h)
  const clipPath =
    corner === 'cut' ? cutPolygonCss(w * scale, h * scale, cut * scale, hatchUnit) : undefined
  const borderRadius = corner === 'round' ? `${cut * scale}${hatchUnit}` : 0
  const selectedId = selection?.id
  const stack = composition.container.children.find((child) => child.type === 'stack')
  const guidesOn =
    showGuides && (selection?.kind === 'stack' || selection?.kind === 'line') && stack
  const interactive = typeof onSelect === 'function'
  const stackBox = measured.stackBox

  const pick = (event, next) => {
    if (!interactive) return
    event.stopPropagation()
    onSelect(next)
  }

  return (
    <div
      role={interactive ? 'group' : undefined}
      aria-label={interactive ? container.name || 'Frame' : undefined}
      data-preview-node="container"
      data-node-id={container.id}
      onClick={interactive ? (event) => pick(event, { kind: 'container', id: container.id }) : undefined}
      style={{
        position: 'relative',
        width: widthU,
        height: heightU,
        overflow: 'hidden',
        clipPath,
        borderRadius,
        cursor: interactive ? 'pointer' : undefined,
        userSelect: interactive ? 'none' : undefined,
      }}
    >
      <ContainerShape
        container={container}
        widthIn={w}
        heightIn={h}
        scale={scale}
        unit={hatchUnit}
      />
      {interactive && stack && stackBox && (
        <div
          role="button"
          tabIndex={0}
          aria-label="Stack"
          data-preview-node="stack"
          data-node-id={stack.id}
          onClick={(event) => pick(event, { kind: 'stack', id: stack.id })}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              event.stopPropagation()
              onSelect({ kind: 'stack', id: stack.id })
            }
          }}
          style={{
            position: 'absolute',
            left: `${stackBox.x * scale}${hatchUnit}`,
            top: `${stackBox.y * scale}${hatchUnit}`,
            width: `${stackBox.width * scale}${hatchUnit}`,
            height: `${stackBox.height * scale}${hatchUnit}`,
            cursor: 'pointer',
            zIndex: 1,
          }}
        />
      )}
      {guidesOn && (
        <>
          {['left', 'center', 'right'].map((edge) => {
            const box = measured.stackBox
            const x =
              edge === 'left'
                ? box.x
                : edge === 'right'
                  ? box.x + box.width
                  : box.x + box.width / 2
            const active = stack.align === edge
            return (
              <div
                key={edge}
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: `${x * scale}${hatchUnit}`,
                  top: `${box.y * scale}${hatchUnit}`,
                  width: 0,
                  height: `${box.height * scale}${hatchUnit}`,
                  borderLeft: active
                    ? '1px solid #E3FF33'
                    : '1px dashed rgba(227,255,51,0.35)',
                  pointerEvents: 'none',
                  zIndex: 4,
                }}
              />
            )
          })}
        </>
      )}
      {measured.lineBoxes.map((box) => {
        const selected = selectedId === box.id
        const baselineFromTop = (box.baselineY - box.y) * scale
        const editing = editingLineId === box.id
        const hitWidth = Math.max(box.width, interactive ? 1 : 0)
        const boxW = `${box.width * scale}${hatchUnit}`
        const hitW = `${hitWidth * scale}${hatchUnit}`
        const boxH = `${box.height * scale}${hatchUnit}`
        return (
          <div
            key={box.id}
            role={interactive ? 'button' : undefined}
            tabIndex={interactive ? 0 : undefined}
            aria-label={interactive ? lineText(box.line) || 'Line' : undefined}
            data-preview-node="line"
            data-node-id={box.id}
            onClick={interactive ? (event) => pick(event, { kind: 'line', id: box.id }) : undefined}
            onDoubleClick={
              interactive && onEditStart
                ? (event) => {
                    event.preventDefault()
                    event.stopPropagation()
                    onSelect({ kind: 'line', id: box.id })
                    onEditStart(box.id)
                  }
                : undefined
            }
            onKeyDown={
              interactive
                ? (event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      event.stopPropagation()
                      onSelect({ kind: 'line', id: box.id })
                      if (event.key === 'Enter' && onEditStart) onEditStart(box.id)
                    }
                  }
                : undefined
            }
            style={{
              position: 'absolute',
              left: `${box.x * scale}${hatchUnit}`,
              top: `${box.y * scale}${hatchUnit}`,
              width: hitW,
              height: boxH,
              outline: selected && showGuides ? '1px solid #E3FF33' : undefined,
              outlineOffset: 1,
              cursor: interactive ? 'text' : undefined,
              overflow: editing ? 'visible' : undefined,
              zIndex: 2,
            }}
          >
            {editing ? (
              <LineEditor
                line={box.line}
                width={hitW}
                height={boxH}
                hatchUnit={hatchUnit}
                scale={scale}
                onChange={(copy) => onChangeLine?.(box.id, copy)}
                onCommit={() => onEditEnd?.()}
                onCancel={() => onEditCancel?.()}
              />
            ) : (
              <GlyphLine
                line={box.line}
                width={boxW}
                height={boxH}
                hatchUnit={hatchUnit}
                scale={scale}
              />
            )}
            {selected && showGuides && !editing && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: `${baselineFromTop}${hatchUnit}`,
                  borderTop: '1px solid #E3FF33',
                  pointerEvents: 'none',
                }}
              />
            )}
          </div>
        )
      })}
      {showGuides && selectedId === container.id && (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            outline: '1px solid #E3FF33',
            outlineOffset: -1,
            pointerEvents: 'none',
            zIndex: 5,
          }}
        />
      )}
    </div>
  )
}

function SheetGrid({ originX, originY, trimW, trimH, px, showSquare }) {
  const horizontals = gridLinesIn(originY, originY + trimH, GRID_PITCH_IN)
  const halves = gridLinesIn(originY, originY + trimH, GRID_HALF_IN).filter(
    (y) => Math.abs(y % GRID_PITCH_IN) > 1e-6,
  )
  const verticals = showSquare ? gridLinesIn(originX, originX + trimW, GRID_PITCH_IN) : []
  return (
    <div className="absolute inset-0 pointer-events-none z-[2]" aria-hidden="true">
      {halves.map((y) => (
        <div
          key={`h2-${y}`}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: (y - originY) * px,
            borderTop: '1px solid rgba(227,255,51,0.12)',
          }}
        />
      ))}
      {horizontals.map((y) => (
        <div
          key={`h-${y}`}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: (y - originY) * px,
            borderTop: '1px solid rgba(227,255,51,0.28)',
          }}
        />
      ))}
      {verticals.map((x) => (
        <div
          key={`v-${x}`}
          style={{
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: (x - originX) * px,
            borderLeft: '1px solid rgba(227,255,51,0.22)',
          }}
        />
      ))}
    </div>
  )
}

function overlapMask(stacked, col, row, margins, px) {
  if (!stacked || (col === 0 && row === 0)) return undefined
  const layers = []
  if (col > 0 && margins.left > 0) {
    const edge = margins.left * px
    layers.push(
      `linear-gradient(to right, rgba(0,0,0,0.45) 0, rgba(0,0,0,0.45) ${edge}px, black ${edge}px)`,
    )
  }
  if (row > 0 && margins.top > 0) {
    const edge = margins.top * px
    layers.push(
      `linear-gradient(to bottom, rgba(0,0,0,0.45) 0, rgba(0,0,0,0.45) ${edge}px, black ${edge}px)`,
    )
  }
  if (layers.length === 0) return undefined
  return {
    WebkitMaskImage: layers.join(', '),
    maskImage: layers.join(', '),
    WebkitMaskComposite: layers.length > 1 ? 'source-in' : undefined,
    maskComposite: layers.length > 1 ? 'intersect' : undefined,
  }
}

function ContentRuler({ startIn, widthIn, px }) {
  const endIn = startIn + widthIn
  const first = Math.ceil(startIn - 1e-6)
  const last = Math.floor(endIn + 1e-6)
  const ticks = []
  for (let inch = first; inch <= last; inch += 1) ticks.push(inch)

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#26262E] rounded-t-[2px]">
      <div className="absolute left-0 right-0 bottom-0 h-px bg-[#43434E]" />
      <div className="absolute bottom-0 left-0 w-px h-3 bg-[#5E5E69]" />
      <div className="absolute bottom-0 right-0 w-px h-3 bg-[#5E5E69]" />
      {ticks.map((inch) => {
        const x = (inch - startIn) * px
        const foot = inch % 12 === 0
        const mid = inch % 6 === 0
        return (
          <div key={inch} className="absolute top-0 bottom-0" style={{ left: x }}>
            <div
              className={`absolute bottom-0 left-0 w-px ${foot ? 'h-4 bg-[#F0F0F2]' : 'h-2.5 bg-[#5E5E69]'}`}
            />
            {mid && (
              <span className="absolute top-0 left-1 font-mono text-[9px] text-[#7A7A80] whitespace-nowrap">
                {inch}&quot;
              </span>
            )}
            {foot && (
              <span className="absolute bottom-1 left-1.5 font-mono text-[10px] font-bold text-[#F0F0F2] whitespace-nowrap">
                {Math.floor(inch / 12)}&apos;
              </span>
            )}
          </div>
        )
      })}
    </div>
  )
}

function Hatch({ style }) {
  return (
    <div
      aria-hidden="true"
      className="absolute pointer-events-none"
      style={{
        backgroundImage:
          'repeating-linear-gradient(45deg, rgba(255,255,255,0.85) 0 2px, transparent 2px 7px)',
        mixBlendMode: 'difference',
        ...style,
      }}
    />
  )
}

function OverlayScroll({ axis, value, max, view, onChange, ariaLabel }) {
  const trackRef = useRef(null)
  const dragging = useRef(false)
  const [trackSize, setTrackSize] = useState(0)
  const vertical = axis === 'y'

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const update = () => setTrackSize(vertical ? track.clientHeight : track.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(track)
    return () => ro.disconnect()
  }, [vertical, max])

  const ratio = view > 0 ? view / (view + max) : 1
  const thumb = Math.max(28, ratio * trackSize)
  const travel = Math.max(0, trackSize - thumb)
  const offset = max > 0 ? (value / max) * travel : 0

  const setFromPointer = useCallback(
    (client) => {
      const track = trackRef.current
      if (!track || max <= 0) return
      const rect = track.getBoundingClientRect()
      const size = vertical ? rect.height : rect.width
      const origin = vertical ? rect.top : rect.left
      const thumbSize = Math.max(28, (view > 0 ? view / (view + max) : 1) * size)
      const span = Math.max(1, size - thumbSize)
      const next = ((client - origin - thumbSize / 2) / span) * max
      onChange(Math.max(0, Math.min(max, next)))
    },
    [max, view, onChange, vertical],
  )

  useEffect(() => {
    const onMove = (event) => {
      if (!dragging.current) return
      event.preventDefault()
      setFromPointer(vertical ? event.clientY : event.clientX)
    }
    const onUp = () => {
      dragging.current = false
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
    }
  }, [setFromPointer, vertical])

  return (
    <div
      ref={trackRef}
      role="scrollbar"
      aria-label={ariaLabel}
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(value)}
      tabIndex={0}
      className={`relative bg-[#08080A]/90 border border-[#43434E] cursor-pointer ${
        vertical ? 'h-full w-[7px]' : 'w-full h-[7px]'
      }`}
      onPointerDown={(event) => {
        dragging.current = true
        event.currentTarget.setPointerCapture?.(event.pointerId)
        setFromPointer(vertical ? event.clientY : event.clientX)
      }}
      onKeyDown={(event) => {
        const step = Math.max(40, view * 0.25)
        const prev = vertical ? 'ArrowUp' : 'ArrowLeft'
        const nextKey = vertical ? 'ArrowDown' : 'ArrowRight'
        if (event.key === nextKey) {
          event.preventDefault()
          onChange(Math.min(max, value + step))
        }
        if (event.key === prev) {
          event.preventDefault()
          onChange(Math.max(0, value - step))
        }
      }}
    >
      <div
        className="absolute bg-[#5E5E69] hover:bg-[#E3FF33]"
        style={
          vertical
            ? { left: 0, right: 0, height: thumb, transform: `translateY(${offset}px)` }
            : { top: 0, bottom: 0, width: thumb, transform: `translateX(${offset}px)` }
        }
      />
    </div>
  )
}

export function Preview({
  zoom,
  scaleToFit,
  onZoom,
  onScaleToFit,
  sheetCount,
  sheets = [],
  cols = 0,
  rows = 0,
  tile = false,
  assembledInches,
  margins,
  overlap,
  pageW,
  pageH,
  trimW,
  trimH,
  contentW,
  contentH = 0,
  composition,
  measured,
  selection,
  onSelect,
  onChange,
  printOverlap,
  join = 'trim-tape',
  showTrim,
  showSafe,
  showTape,
  showNumbers,
  showCutMarks,
}) {
  const px = PX_PER_INCH * zoom
  const sheetW = pageW * px
  const sheetH = pageH * px
  const contentPx = contentW * px
  const contentHpx = contentH * px
  const alignRecut = join === JOIN_ALIGN_RECUT
  const duplicateStrip = joinDuplicates(join, printOverlap) && overlap > 0
  const sliceW = duplicateStrip ? trimW : contentW
  const sliceH = tile && !duplicateStrip ? contentH : trimH
  const slicePx = sliceW * px
  const sliceHpx = sliceH * px
  const frameBoxH = sliceH
  const frameBoxW = coveredSpan(cols, trimW, contentW, duplicateStrip) || sliceW
  const cutSlackPx = overlapCutSlack(overlap, printOverlap && !alignRecut) * px
  const canvasRef = useRef(null)
  const padRef = useRef(null)
  const rowRef = useRef(null)
  const [scroll, setScroll] = useState({
    left: 0,
    hMax: 0,
    hView: 0,
    top: 0,
    vMax: 0,
    vView: 0,
    hTop: 0,
  })
  const rulerH = 28
  const zoomPresets = [0.25, 0.5, 0.75, 1]
  const [arrangement, setArrangement] = useState('overlap')
  const [editing, setEditing] = useState(null)
  const stacked = arrangement === 'overlap' && duplicateStrip
  const sheetGap = arrangement === 'separate' ? 24 : stacked ? 0 : 8
  const labelH = showNumbers ? 28 : 0
  const cardH = rulerH + sheetH + labelH
  const pitchX = stacked ? contentPx : sheetW + sheetGap
  const pitchY = stacked ? contentHpx : cardH + sheetGap
  const boardW = cols > 0 ? (cols - 1) * pitchX + sheetW : 0
  const boardH = rows > 0 ? (rows - 1) * pitchY + cardH : 0

  const measureScroll = useCallback(() => {
    const el = canvasRef.current
    if (!el) return
    const hView = el.clientWidth
    const vView = el.clientHeight
    const hMax = Math.max(0, el.scrollWidth - hView)
    const vMax = Math.max(0, el.scrollHeight - vView)
    const left = Math.max(0, Math.min(hMax, el.scrollLeft))
    const top = Math.max(0, Math.min(vMax, el.scrollTop))
    if (el.scrollLeft !== left) el.scrollLeft = left
    if (el.scrollTop !== top) el.scrollTop = top
    let hTop = vView - 14
    const row = rowRef.current
    if (row) {
      const rowBottom = row.getBoundingClientRect().bottom
      const canvasTop = el.getBoundingClientRect().top
      const underLabels = rowBottom - canvasTop + 6
      if (underLabels + 8 < vView) hTop = Math.max(4, underLabels)
    }
    setScroll({ left, hMax, hView, top, vMax, vView, hTop })
  }, [])

  useEffect(() => {
    if (!editing) return
    if (!findLine(composition, editing.lineId)) setEditing(null)
  }, [composition, editing])

  const applyScroll = useCallback((axis, next) => {
    const el = canvasRef.current
    if (!el) return
    if (axis === 'x') el.scrollLeft = next
    else el.scrollTop = next
    measureScroll()
  }, [measureScroll])

  const fitSequence = useCallback(() => {
    const el = canvasRef.current
    const pad = padRef.current
    if (!el || sheetCount === 0) return
    const padStyle = pad ? getComputedStyle(pad) : null
    const padX = padStyle ? parseFloat(padStyle.paddingLeft) + parseFloat(padStyle.paddingRight) : 48
    const padY = padStyle ? parseFloat(padStyle.paddingTop) + parseFloat(padStyle.paddingBottom) : 48
    const labelH = showNumbers ? 28 : 0
    const availW = el.clientWidth - padX
    const availH = el.clientHeight - padY
    if (availW < 40 || availH < 40 || cols < 1 || rows < 1) return
    const spanWIn = stacked ? pageW + (cols - 1) * contentW : cols * pageW
    const spanHIn = stacked ? pageH + (rows - 1) * contentH : rows * pageH
    const extraX = stacked ? 0 : Math.max(0, cols - 1) * sheetGap
    const extraY = stacked
      ? rulerH + labelH
      : rows * (rulerH + labelH) + Math.max(0, rows - 1) * sheetGap
    const zW = (availW - extraX) / (spanWIn * PX_PER_INCH)
    const zH = (availH - extraY) / (spanHIn * PX_PER_INCH)
    const next = Math.max(0.05, Math.min(zW, zH))
    if (!Number.isFinite(next)) return
    const rounded = Math.round(next * 1000) / 1000
    if (Math.abs(rounded - zoom) > 0.0005) onZoom(rounded)
  }, [onZoom, pageH, pageW, cols, rows, showNumbers, zoom, stacked, sheetGap, contentW, contentH])

  useEffect(() => {
    if (!scaleToFit || sheetCount === 0) return
    const el = canvasRef.current
    if (!el) return
    fitSequence()
    const ro = new ResizeObserver(() => fitSequence())
    ro.observe(el)
    return () => ro.disconnect()
  }, [scaleToFit, sheetCount, fitSequence])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    measureScroll()
    const ro = new ResizeObserver(measureScroll)
    ro.observe(el)
    if (rowRef.current) ro.observe(rowRef.current)
    return () => ro.disconnect()
  }, [measureScroll, sheetCount, cols, rows, zoom, pageW, pageH, showNumbers, arrangement, printOverlap, join])

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-[#08080A] relative order-first xl:order-none overflow-hidden">
      <div className="pro-bar h-[46px] bg-[#141417] flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#E3FF33] animate-pulse" />
            <span className="font-mono text-[11px] tracking-[0.12em] text-[#F0F0F2] uppercase">
              Preview Canvas
            </span>
            <SegmentControl
              ariaLabel="Sheet arrangement"
              value={arrangement}
              onChange={setArrangement}
              options={[
                { value: 'separate', label: 'Separate' },
                { value: 'overlap', label: 'Overlap' },
              ]}
            />
          </div>
          <div className="hidden md:flex items-center gap-2 ml-3 pl-3 border-l border-black shadow-[inset_1px_0_0_rgba(255,255,255,0.05)]">
            <span className="font-mono text-[10px] tracking-[0.1em] text-[#7A7A80] uppercase">
              Scale 1&quot; = {PX_PER_INCH * zoom}px
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="hidden md:block font-mono text-[10px] tracking-[0.1em] text-[#7A7A80] uppercase mr-2">
            Zoom
          </span>
          {zoomPresets.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => {
                onScaleToFit(false)
                onZoom(level)
              }}
              className={`pro-bevel h-7 px-2.5 rounded-[3px] border font-mono text-[11px] tracking-[0.08em] transition-colors ${
                !scaleToFit && Math.abs(zoom - level) < 0.001
                  ? 'bg-[#E3FF33] text-black border-[#E3FF33] font-bold'
                  : 'bg-[#26262E] text-[#7A7A80] border-[#43434E] hover:text-[#F0F0F2] hover:border-[#5E5E69]'
              }`}
            >
              {level * 100}%
            </button>
          ))}
          <div className="w-px h-4 bg-black shadow-[1px_0_0_rgba(255,255,255,0.06)] mx-1" />
          <button
            type="button"
            onClick={() => onScaleToFit(true)}
            className={`pro-bevel h-7 px-2.5 rounded-[3px] border font-mono text-[11px] tracking-[0.08em] uppercase transition-colors ${
              scaleToFit
                ? 'bg-[#E3FF33] text-black border-[#E3FF33] font-bold'
                : 'bg-[#26262E] text-[#7A7A80] border-[#43434E] hover:text-[#F0F0F2] hover:border-[#5E5E69]'
            }`}
          >
            Scale
          </button>
        </div>
      </div>

      <div className="flex-1 relative min-h-0 min-w-0">
      <div
        aria-hidden="true"
        className="absolute left-0 top-1/2 -translate-y-1/2 z-10 pointer-events-none flex flex-col items-center gap-2 py-3 px-[4px] rounded-r-[3px] bg-[#141417]/90 border border-l-0 border-black"
      >
        <span className="w-1 h-1 rounded-full bg-[#E3FF33]" />
        <span
          className="font-stencil text-[9px] tracking-[0.3em] text-[#7A7A80] uppercase whitespace-nowrap"
          style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
        >
          Preview
        </span>
      </div>
      <div
        ref={canvasRef}
        className="absolute inset-0 overflow-auto bg-[#050506] preview-canvas shadow-[inset_0_2px_12px_rgba(0,0,0,0.75)]"
        onScroll={measureScroll}
      >
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(#fff 1.2px, transparent 1.2px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#08080A] via-transparent to-[#08080A]/60 pointer-events-none" />
        <div ref={padRef} className="relative p-6 md:p-10">
          {sheetCount === 0 ? (
            <div className="min-h-[420px] flex items-center justify-center">
              <div className="w-full max-w-[520px] border border-dashed border-[#43434E] rounded-[4px] bg-[#121214]/60 backdrop-blur p-8 text-center">
                <div className="inline-flex px-2.5 py-1 rounded-[4px] bg-[#26262E] border border-[#43434E] font-mono text-[10px] tracking-[0.14em] text-[#E3FF33] uppercase mb-4">
                  Empty Strip
                </div>
                <h3
                  className="font-black text-[24px] tracking-[-0.02em] leading-[0.9] mb-3"
                  style={{ fontFamily: 'Anton, sans-serif' }}
                >
                  TYPE SOMETHING
                  <br />
                  BIG
                </h3>
                <p className="font-mono text-[11px] leading-[1.6] text-[#7A7A80] max-w-[36ch] mx-auto">
                  Your banner text will be sliced into {pageW.toFixed(2)}&quot; × {pageH.toFixed(2)}&quot; sheets. We keep type
                  inside your printer&apos;s safe area so nothing gets cropped. Trim on the{' '}
                  <span className="text-[#E3FF33]">lime dashed line</span>, overlap the
                  hatched tape zone.
                </p>
                <div className="mt-6 flex justify-center gap-2">
                  <div className="h-8 px-3 rounded-[4px] bg-[#26262E] border border-[#43434E] flex items-center font-mono text-[10px] tracking-[0.1em] text-[#7A7A80] uppercase">
                    {pageW.toFixed(2)}&quot; × {pageH.toFixed(2)}&quot; • {PX_PER_INCH}px/in @100%
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              ref={rowRef}
              className="relative"
              style={{ width: boardW, height: boardH }}
            >
              {sheets.map((sheet) => (
                <div
                  key={sheet.index}
                  data-sheet-index={sheet.index}
                  data-sheet-col={sheet.col}
                  data-sheet-row={sheet.row}
                  className="absolute"
                  style={{
                    left: sheet.col * pitchX,
                    top: sheet.row * pitchY,
                    width: sheetW,
                    height: cardH,
                    zIndex: stacked ? sheet.index + 1 : 1,
                  }}
                >
                  <div
                    className="absolute overflow-hidden"
                    style={{
                      left: margins.left * px,
                      top: 0,
                      width: slicePx,
                      height: rulerH,
                    }}
                  >
                    <ContentRuler startIn={sheet.originX} widthIn={sliceW} px={px} />
                  </div>
                  <div
                    className="absolute left-0 bg-white rounded-[2px] overflow-hidden"
                    style={{
                      top: rulerH,
                      width: sheetW,
                      height: sheetH,
                      boxShadow: stacked && (sheet.col > 0 || sheet.row > 0)
                        ? [
                            sheet.col > 0 ? '-10px 0 18px rgba(0,0,0,0.55)' : null,
                            sheet.row > 0 ? '0 -10px 18px rgba(0,0,0,0.55)' : null,
                            '0 12px 40px rgba(0,0,0,0.7)',
                            '0 0 0 1px rgba(255,255,255,0.06)',
                          ]
                            .filter(Boolean)
                            .join(', ')
                        : '0 1px 0 0 rgba(255,255,255,0.12) inset, 0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)',
                      ...overlapMask(stacked, sheet.col, sheet.row, margins, px),
                    }}
                  >
                    <div
                      className="absolute inset-0 opacity-[0.025] mix-blend-multiply pointer-events-none"
                      style={{ backgroundImage: PAPER_NOISE }}
                    />
                    {showSafe && (
                      <Fragment>
                        {margins.top > 0 && (
                          <Hatch
                            style={{ left: 0, top: 0, width: sheetW, height: margins.top * px }}
                          />
                        )}
                        {margins.bottom > 0 && (
                          <Hatch
                            style={{
                              left: 0,
                              top: (margins.top + trimH) * px,
                              width: sheetW,
                              height: margins.bottom * px,
                            }}
                          />
                        )}
                        {margins.left > 0 && (
                          <Hatch
                            style={{
                              left: 0,
                              top: margins.top * px,
                              width: margins.left * px,
                              height: trimH * px,
                            }}
                          />
                        )}
                        {margins.right > 0 && (
                          <Hatch
                            style={{
                              left: (margins.left + trimW) * px,
                              top: margins.top * px,
                              width: margins.right * px,
                              height: trimH * px,
                            }}
                          />
                        )}
                      </Fragment>
                    )}
                    <div
                      className="absolute bg-white overflow-hidden"
                      style={{
                        left: margins.left * px,
                        top: margins.top * px,
                        width: slicePx,
                        height: sliceHpx,
                      }}
                    >
                      <div
                        className="flex flex-col"
                        onClick={
                          onSelect
                            ? (event) => {
                                if (event.target !== event.currentTarget) return
                                onSelect({ kind: 'container', id: composition.container.id })
                              }
                            : undefined
                        }
                        style={{
                          transform: `translate(${-sheet.originX * px}px, ${-sheet.originY * px}px)`,
                          width: Math.max(measured?.width ?? 0, sliceW) * px,
                          justifyContent: 'flex-start',
                          paddingTop:
                            measured && measured.height > 0
                              ? placeFrameInTrim(
                                  composition.container.layout.alignY,
                                  measured.height,
                                  frameBoxH,
                                  composition.alignMode,
                                ) * px
                              : 0,
                          paddingLeft:
                            measured && measured.width > 0
                              ? placeFrameInTrim(
                                  composition.container.layout.alignX,
                                  measured.width,
                                  frameBoxW,
                                  composition.alignMode,
                                ) * px
                              : 0,
                        }}
                      >
                        {measured && measured.width > 0 && (
                          <BannerComposition
                            composition={composition}
                            measured={measured}
                            hatchUnit="px"
                            unitPerInch={px}
                            selection={selection}
                            showGuides
                            onSelect={onSelect}
                            onChangeLine={(lineId, copy) => {
                              if (!onChange) return
                              onChange(withLine(composition, lineId, { copy }), lineId)
                            }}
                            editingLineId={editing?.hostId === sheet.index ? editing.lineId : null}
                            onEditStart={(lineId) => {
                              const line = findLine(composition, lineId)
                              onSelect?.({ kind: 'line', id: lineId })
                              setEditing({ lineId, hostId: sheet.index, snapshot: line?.copy ?? '' })
                            }}
                            onEditEnd={() => setEditing(null)}
                            onEditCancel={() => {
                              if (editing && onChange) {
                                onChange(
                                  withLine(composition, editing.lineId, { copy: editing.snapshot }),
                                  editing.lineId,
                                )
                              }
                              setEditing(null)
                            }}
                          />
                        )}
                      </div>
                      <SheetGrid
                        originX={sheet.originX}
                        originY={sheet.originY}
                        trimW={sliceW}
                        trimH={sliceH}
                        px={px}
                        showSquare={composition.alignMode === 'grid'}
                      />
                    </div>
                    {showTape && overlap > 0 && !duplicateStrip && sheet.col < cols - 1 && (
                      <div
                        className="absolute pointer-events-none flex items-center justify-center"
                        style={{
                          left: margins.left * px + contentPx,
                          top: margins.top * px,
                          width: overlap * px,
                          height: sliceHpx,
                          borderLeft: '1px dashed rgba(120,120,0,0.5)',
                        }}
                      >
                        <Hatch style={{ inset: 0 }} />
                        <span className="font-mono text-[8px] font-black tracking-[0.24em] text-black/70 rotate-90">
                          TAPE ↕
                        </span>
                      </div>
                    )}
                    {showTape && overlap > 0 && !duplicateStrip && tile && sheet.row < rows - 1 && (
                      <div
                        className="absolute pointer-events-none flex items-center justify-center"
                        style={{
                          left: margins.left * px,
                          top: margins.top * px + contentHpx,
                          width: slicePx,
                          height: overlap * px,
                          borderTop: '1px dashed rgba(120,120,0,0.5)',
                        }}
                      >
                        <Hatch style={{ inset: 0 }} />
                        <span className="font-mono text-[8px] font-black tracking-[0.24em] text-black/70">
                          TAPE ↔
                        </span>
                      </div>
                    )}
                    {showSafe && (
                      <div
                        className="absolute border border-dotted pointer-events-none z-[1]"
                        style={{
                          left: margins.left * px,
                          top: margins.top * px,
                          width: trimW * px,
                          height: trimH * px,
                          borderColor: 'rgba(0,0,0,0.18)',
                        }}
                      />
                    )}
                    {alignRecut && (
                      <SheetJoinMarks
                        col={sheet.col}
                        row={sheet.row}
                        cols={cols}
                        rows={rows}
                        overlap={overlap}
                        margins={margins}
                        trimW={trimW}
                        trimH={trimH}
                        pageW={pageW}
                        pageH={pageH}
                        scale={px}
                        unit="px"
                      />
                    )}
                    {showTrim && !alignRecut &&
                      verticalCutInches({
                        col: sheet.col,
                        cols,
                        duplicate: printOverlap,
                        overlap,
                        marginLeft: margins.left,
                        contentW,
                      }).map((edge) => (
                        <div
                          key={`v-${edge}`}
                          className="absolute pointer-events-none"
                          style={{
                            ...PREVIEW_CUT_LINE,
                            left: edge * px,
                            top: margins.top * px,
                            height: sliceHpx,
                            zIndex: 4,
                          }}
                        />
                      ))}
                    {showTrim && !alignRecut &&
                      horizontalCutInches({
                        row: sheet.row,
                        rows,
                        duplicate: printOverlap,
                        overlap,
                        marginTop: margins.top,
                        contentH,
                      }).map((edge) => (
                        <div
                          key={`h-${edge}`}
                          className="absolute pointer-events-none"
                          style={{
                            ...PREVIEW_CUT_LINE_H,
                            left: margins.left * px,
                            top: edge * px,
                            width: slicePx,
                            zIndex: 4,
                          }}
                        />
                      ))}
                    {showCutMarks && (
                      <Fragment>
                        <div
                          className="absolute w-3 h-3 border-l border-t border-black"
                          style={{
                            left: margins.left * px - 7,
                            top: margins.top * px - 7,
                          }}
                        />
                        <div
                          className="absolute w-3 h-3 border-r border-t border-black"
                          style={{
                            left: margins.left * px + trimW * px + 4,
                            top: margins.top * px - 7,
                          }}
                        />
                        <div
                          className="absolute w-3 h-3 border-l border-b border-black"
                          style={{
                            left: margins.left * px - 7,
                            top: margins.top * px + trimH * px + 4,
                          }}
                        />
                        <div
                          className="absolute w-3 h-3 border-r border-b border-black"
                          style={{
                            left: margins.left * px + trimW * px + 4,
                            top: margins.top * px + trimH * px + 4,
                          }}
                        />
                      </Fragment>
                    )}
                  </div>

                  {showNumbers && (
                    <div
                      className="absolute left-0 font-mono text-[10px] tracking-[0.12em] text-[#7A7A80] uppercase flex items-center gap-2"
                      style={{ top: rulerH + sheetH + 6 }}
                    >
                      <span className="px-1.5 py-0.5 bg-[#26262E] border border-[#43434E] rounded-[3px] text-[#F0F0F2]">
                        {tile
                          ? `R${String(sheet.row + 1).padStart(2, '0')} C${String(sheet.col + 1).padStart(2, '0')} · `
                          : 'SHEET '}
                        {String(sheet.index + 1).padStart(2, '0')} / {String(sheetCount).padStart(2, '0')}
                      </span>
                      <span className="hidden md:inline">
                        {trimW.toFixed(2)}&quot; × {trimH.toFixed(2)}&quot; TRIM
                      </span>
                    </div>
                  )}
                </div>
              ))}
              {showTrim && !alignRecut &&
                sheets.flatMap((sheet) => {
                  const badges = []
                  const verticalSeam = printOverlap ? sheet.col > 0 : sheet.col < cols - 1
                  if (verticalSeam) {
                    const seam = printOverlap ? sheet.col - 1 : sheet.col
                    const cutSheet = printOverlap ? seam + 1 : seam
                    const onSheet = printOverlap
                      ? margins.left * px + cutSlackPx
                      : margins.left * px + contentPx
                    badges.push({
                      key: `vx-${sheet.row}-${seam}`,
                      left: cutSheet * pitchX + onSheet - 10,
                      top: sheet.row * pitchY + rulerH + margins.top * px + sliceHpx / 2 - 10,
                      rotate: 'rotate-[270deg]',
                    })
                  }
                  const horizontalSeam = tile && (printOverlap ? sheet.row > 0 : sheet.row < rows - 1)
                  if (horizontalSeam) {
                    const seam = printOverlap ? sheet.row - 1 : sheet.row
                    const cutSheet = printOverlap ? seam + 1 : seam
                    const onSheet = printOverlap
                      ? rulerH + margins.top * px + cutSlackPx
                      : rulerH + margins.top * px + contentHpx
                    badges.push({
                      key: `hy-${sheet.col}-${seam}`,
                      left: sheet.col * pitchX + margins.left * px + slicePx / 2 - 10,
                      top: cutSheet * pitchY + onSheet - 10,
                      rotate: 'rotate-180',
                    })
                  }
                  return badges.map((badge) => (
                    <div
                      key={badge.key}
                      className="absolute z-30 w-5 h-5 rounded-full bg-[#E3FF33] flex items-center justify-center text-[10px] text-black shadow pointer-events-none"
                      style={{ left: badge.left, top: badge.top }}
                      title={printOverlap ? 'Cut the top sheet inside the overlap' : 'Cut this edge'}
                    >
                      <span className={`inline-block ${badge.rotate} scale-[1.2]`}>✂</span>
                    </div>
                  ))
                })}
            </div>
          )}
        </div>
      </div>
      {scroll.hMax > 1 && (
        <div
          className="absolute z-20 pointer-events-auto"
          style={{
            left: 8,
            right: scroll.vMax > 1 ? 18 : 8,
            top: scroll.hTop,
            height: 7,
          }}
        >
          <OverlayScroll
            axis="x"
            value={scroll.left}
            max={scroll.hMax}
            view={scroll.hView}
            onChange={(next) => applyScroll('x', next)}
            ariaLabel="Scroll banner horizontally"
          />
        </div>
      )}
      {scroll.vMax > 1 && (
        <div
          className="absolute z-20 right-1 w-[7px]"
          style={{ top: 6, bottom: scroll.hMax > 1 ? 16 : 6 }}
        >
          <OverlayScroll
            axis="y"
            value={scroll.top}
            max={scroll.vMax}
            view={scroll.vView}
            onChange={(next) => applyScroll('y', next)}
            ariaLabel="Scroll banner vertically"
          />
        </div>
      )}
      </div>
    </div>
  )
}
