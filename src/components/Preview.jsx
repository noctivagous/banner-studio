import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { PX_PER_INCH, overlapCutSlack } from '../lib/layout.js'

const PAPER_NOISE = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`

function BannerType({
  lines,
  font,
  fontSize,
  lineHeight,
  letterSpacing,
  fill,
  align,
  strokeOn,
  strokeCss,
}) {
  return lines.map((line, i) => (
    <div
      key={i}
      style={{
        fontFamily: `"${font.family}", Impact, sans-serif`,
        fontWeight: font.weight,
        fontSize,
        letterSpacing: `${letterSpacing}em`,
        color: fill,
        lineHeight,
        textAlign: align,
        width: '100%',
        whiteSpace: 'nowrap',
        ...(strokeOn ? { WebkitTextStroke: strokeCss, paintOrder: 'stroke fill' } : {}),
      }}
    >
      {line || '\u00a0'}
    </div>
  ))
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
  assembledInches,
  margins,
  overlap,
  pageW,
  pageH,
  trimW,
  trimH,
  contentW,
  fontPx,
  lines,
  font,
  lineHeight,
  letterSpacing,
  fill,
  align,
  strokeOn,
  strokeWidth,
  strokeColor,
  printOverlap,
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
  const sliceW = printOverlap && overlap > 0 ? trimW : contentW
  const slicePx = sliceW * px
  const cutSlackPx = overlapCutSlack(overlap, printOverlap) * px
  const printableHpx = trimH * px
  const typePx = fontPx * zoom
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
    const gap = 24
    const labelH = showNumbers ? 28 : 0
    const availW = el.clientWidth - padX
    const availH = el.clientHeight - padY
    if (availW < 40 || availH < 40) return
    const zW = (availW - Math.max(0, sheetCount - 1) * gap) / (sheetCount * pageW * PX_PER_INCH)
    const zH = (availH - rulerH - labelH) / (pageH * PX_PER_INCH)
    const next = Math.max(0.05, Math.min(zW, zH))
    if (!Number.isFinite(next)) return
    const rounded = Math.round(next * 1000) / 1000
    if (Math.abs(rounded - zoom) > 0.0005) onZoom(rounded)
  }, [onZoom, pageH, pageW, sheetCount, showNumbers, zoom])

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
  }, [measureScroll, sheetCount, zoom, pageW, pageH, showNumbers])

  return (
    <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-[#08080A] relative order-first xl:order-none overflow-hidden">
      <div className="h-[46px] bg-[#121214] border-b border-[#43434E] flex items-center justify-between px-3 shrink-0">
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-[#E3FF33] animate-pulse" />
            <span className="font-mono text-[11px] tracking-[0.12em] text-[#F0F0F2] uppercase">
              Preview Canvas
            </span>
          </div>
          <div className="hidden md:flex items-center gap-2 ml-3 pl-3 border-l border-[#43434E]">
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
              className={`h-7 px-2.5 rounded-[4px] border font-mono text-[11px] tracking-[0.08em] transition-colors ${
                !scaleToFit && Math.abs(zoom - level) < 0.001
                  ? 'bg-[#E3FF33] text-black border-[#E3FF33] font-bold'
                  : 'bg-[#26262E] text-[#7A7A80] border-[#43434E] hover:text-[#F0F0F2] hover:border-[#5E5E69]'
              }`}
            >
              {level * 100}%
            </button>
          ))}
          <div className="w-px h-4 bg-[#43434E] mx-1" />
          <button
            type="button"
            onClick={() => onScaleToFit(true)}
            className={`h-7 px-2.5 rounded-[4px] border font-mono text-[11px] tracking-[0.08em] uppercase transition-colors ${
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
        ref={canvasRef}
        className="absolute inset-0 overflow-auto bg-[#08080A] preview-canvas"
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
            <div ref={rowRef} className="flex gap-6" style={{ width: 'max-content' }}>
              {Array.from({ length: sheetCount }).map((_, i) => (
                <div
                  key={i}
                  className="relative shrink-0"
                  style={{ width: sheetW, height: rulerH + sheetH + (showNumbers ? 28 : 0) }}
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
                    <ContentRuler startIn={i * contentW} widthIn={sliceW} px={px} />
                  </div>
                  <div
                    className="absolute left-0 bg-white rounded-[2px] overflow-hidden"
                    style={{
                      top: rulerH,
                      width: sheetW,
                      height: sheetH,
                      boxShadow:
                        '0 1px 0 0 rgba(255,255,255,0.12) inset, 0 12px 40px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.06)',
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
                        height: printableHpx,
                      }}
                    >
                      <div
                        className="h-full flex flex-col justify-center"
                        style={{
                          transform: `translateX(-${i * contentPx}px)`,
                          width: Math.max(sheetCount * contentPx, contentPx) + (printOverlap ? overlap * px : 0),
                        }}
                      >
                        <BannerType
                          lines={lines}
                          font={font}
                          fontSize={typePx}
                          lineHeight={lineHeight}
                          letterSpacing={letterSpacing}
                          fill={fill}
                          align={align}
                          strokeOn={strokeOn}
                          strokeCss={`${strokeWidth * px}px ${strokeColor}`}
                        />
                      </div>
                    </div>
                    {showTape && overlap > 0 && !printOverlap && i < sheetCount - 1 && (
                      <div
                        className="absolute pointer-events-none flex items-center justify-center"
                        style={{
                          left: margins.left * px + contentPx,
                          top: margins.top * px,
                          width: overlap * px,
                          height: printableHpx,
                          borderLeft: '1px dashed rgba(120,120,0,0.5)',
                        }}
                      >
                        <Hatch style={{ inset: 0 }} />
                        <span className="font-mono text-[8px] font-black tracking-[0.24em] text-black/70 rotate-90">
                          TAPE ↕
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
                    {showTrim &&
                      [
                        i > 0 ? margins.left * px : null,
                        i < sheetCount - 1 ? margins.left * px + contentPx + cutSlackPx : null,
                      ]
                        .filter((edge) => edge != null)
                        .map((edge) => (
                          <div
                            key={edge}
                            className="absolute pointer-events-none z-[2]"
                            style={{
                              left: edge,
                              top: margins.top * px,
                              height: trimH * px,
                              borderLeft: '1px dashed #E3FF33',
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
                  {showTrim &&
                    [
                      i > 0 ? margins.left * px : null,
                      i < sheetCount - 1 ? margins.left * px + contentPx : null,
                    ]
                      .filter((edge) => edge != null)
                      .map((edge) => (
                        <div
                          key={edge}
                          className="absolute z-[3] w-5 h-5 rounded-full bg-[#E3FF33] flex items-center justify-center text-[10px] text-black shadow pointer-events-none"
                          style={{
                            left: edge - 10,
                            top: rulerH + margins.top * px + printableHpx / 2 - 10,
                          }}
                        >
                          ✂
                        </div>
                      ))}
                  {showNumbers && (
                    <div
                      className="absolute left-0 font-mono text-[10px] tracking-[0.12em] text-[#7A7A80] uppercase flex items-center gap-2"
                      style={{ top: rulerH + sheetH + 6 }}
                    >
                      <span className="px-1.5 py-0.5 bg-[#26262E] border border-[#43434E] rounded-[3px] text-[#F0F0F2]">
                        SHEET {String(i + 1).padStart(2, '0')} /{' '}
                        {String(sheetCount).padStart(2, '0')}
                      </span>
                      <span className="hidden md:inline">
                        {trimW.toFixed(2)}&quot; × {trimH.toFixed(2)}&quot; TRIM
                      </span>
                    </div>
                  )}
                </div>
              ))}
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

export { BannerType }
