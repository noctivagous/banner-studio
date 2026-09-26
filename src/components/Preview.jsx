import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { PX_PER_INCH } from '../lib/layout.js'

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

function BannerHScroll({
  left,
  max,
  view,
  onChange,
  className = 'w-full h-3 flex items-center shrink-0 bg-[#121214]',
  ariaLabel = 'Scroll banner preview',
}) {
  const trackRef = useRef(null)
  const dragging = useRef(false)
  const [trackW, setTrackW] = useState(0)
  const overflowing = max > 1

  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const update = () => setTrackW(track.clientWidth)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(track)
    return () => ro.disconnect()
  }, [overflowing])

  const ratio = view > 0 ? view / (view + max) : 1
  const thumb = Math.max(28, ratio * trackW)
  const travel = Math.max(0, trackW - thumb)
  const thumbX = max > 0 ? (left / max) * travel : 0

  const setFromClientX = useCallback(
    (clientX) => {
      const track = trackRef.current
      if (!track || max <= 0) return
      const rect = track.getBoundingClientRect()
      const ratio = view > 0 ? view / (view + max) : 1
      const thumb = Math.max(28, ratio * rect.width)
      const travel = Math.max(1, rect.width - thumb)
      const next = ((clientX - rect.left - thumb / 2) / travel) * max
      onChange(Math.max(0, Math.min(max, next)))
    },
    [max, view, onChange],
  )

  useEffect(() => {
    const onMove = (e) => {
      if (!dragging.current) return
      e.preventDefault()
      setFromClientX(e.clientX)
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
  }, [setFromClientX])

  if (!overflowing) return null

  return (
    <div className={className}>
      <div
        ref={trackRef}
        role="scrollbar"
        aria-label={ariaLabel}
        aria-orientation="horizontal"
        aria-valuemin={0}
        aria-valuemax={Math.round(max)}
        aria-valuenow={Math.round(left)}
        tabIndex={0}
        className="relative w-full h-[5px] bg-[#08080A] border-y border-[#43434E] cursor-pointer"
        onPointerDown={(e) => {
          if (!overflowing) return
          dragging.current = true
          e.currentTarget.setPointerCapture?.(e.pointerId)
          setFromClientX(e.clientX)
        }}
        onKeyDown={(e) => {
          if (!overflowing) return
          const step = Math.max(40, view * 0.25)
          if (e.key === 'ArrowRight') {
            e.preventDefault()
            onChange(Math.min(max, left + step))
          }
          if (e.key === 'ArrowLeft') {
            e.preventDefault()
            onChange(Math.max(0, left - step))
          }
        }}
      >
        <div
          className="absolute top-0 bottom-0 bg-[#5E5E69] hover:bg-[#E3FF33] transition-colors"
          style={{ width: `${thumb}px`, transform: `translateX(${thumbX}px)` }}
        />
      </div>
    </div>
  )
}

export function Preview({
  zoom,
  onZoom,
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
  const printableHpx = trimH * px
  const typePx = fontPx * zoom
  const canvasRef = useRef(null)
  const [hScroll, setHScroll] = useState({ left: 0, max: 0, view: 0 })
  const rulerH = 28

  const measureScroll = useCallback(() => {
    const el = canvasRef.current
    if (!el) return
    const view = el.clientWidth
    const max = Math.max(0, el.scrollWidth - view)
    const left = Math.max(0, Math.min(max, el.scrollLeft))
    if (el.scrollLeft !== left) el.scrollLeft = left
    setHScroll({ left, max, view })
  }, [])

  const applyScroll = useCallback((left) => {
    const el = canvasRef.current
    if (!el) return
    const max = Math.max(0, el.scrollWidth - el.clientWidth)
    const clamped = Math.max(0, Math.min(max, left))
    el.scrollLeft = clamped
    setHScroll({ left: clamped, max, view: el.clientWidth })
  }, [])

  useEffect(() => {
    const el = canvasRef.current
    if (!el) return
    measureScroll()
    const ro = new ResizeObserver(measureScroll)
    ro.observe(el)
    return () => ro.disconnect()
  }, [measureScroll, sheetCount, zoom, assembledInches])

  return (
    <div className="flex-1 flex flex-col min-w-0 bg-[#08080A] relative order-first xl:order-none overflow-hidden">
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
          {[0.25, 0.5, 0.75, 1].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => onZoom(level)}
              className={`h-7 px-2.5 rounded-[4px] border font-mono text-[11px] tracking-[0.08em] transition-colors ${
                zoom === level
                  ? 'bg-[#E3FF33] text-black border-[#E3FF33] font-bold'
                  : 'bg-[#26262E] text-[#7A7A80] border-[#43434E] hover:text-[#F0F0F2] hover:border-[#5E5E69]'
              }`}
            >
              {level * 100}%
            </button>
          ))}
        </div>
      </div>

      <BannerHScroll
        left={hScroll.left}
        max={hScroll.max}
        view={hScroll.view}
        onChange={applyScroll}
        ariaLabel="Scroll banner preview, top"
        className="w-full h-3 flex items-center shrink-0 bg-[#121214] border-b border-[#43434E]"
      />

      <div
        ref={canvasRef}
        className="flex-1 overflow-auto relative bg-[#08080A] preview-canvas"
        onScroll={() => {
          const el = canvasRef.current
          if (!el) return
          setHScroll({
            left: el.scrollLeft,
            max: Math.max(0, el.scrollWidth - el.clientWidth),
            view: el.clientWidth,
          })
        }}
      >
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: 'radial-gradient(#fff 1.2px, transparent 1.2px)',
            backgroundSize: '28px 28px',
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#08080A] via-transparent to-[#08080A]/60 pointer-events-none" />
        <div className="relative p-6 md:p-10">
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
            <div className="flex gap-6" style={{ width: 'max-content' }}>
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
                      width: contentPx,
                      height: rulerH,
                    }}
                  >
                    <ContentRuler startIn={i * contentW} widthIn={contentW} px={px} />
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
                        width: contentPx,
                        height: printableHpx,
                      }}
                    >
                      <div
                        className="h-full flex flex-col justify-center"
                        style={{
                          transform: `translateX(-${i * contentPx}px)`,
                          width: Math.max(sheetCount * contentPx, contentPx),
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
                    {showTape && overlap > 0 && i < sheetCount - 1 && (
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
                    {showTrim && (
                      <div
                        className="absolute border border-dashed pointer-events-none z-[2]"
                        style={{
                          left: margins.left * px,
                          top: margins.top * px,
                          width: trimW * px,
                          height: trimH * px,
                          borderColor: '#E3FF33',
                          borderWidth: '1px',
                        }}
                      />
                    )}
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
                  {showTrim && (
                    <Fragment>
                      <div
                        className="absolute flex items-center gap-1"
                        style={{ left: -2, top: rulerH + margins.top * px + 2 }}
                      >
                        <div className="w-5 h-5 rounded-full bg-[#E3FF33] flex items-center justify-center text-[10px] text-black shadow">
                          ✂
                        </div>
                      </div>
                      <div
                        className="absolute flex items-center gap-1"
                        style={{ left: -2, top: rulerH + margins.top * px + printableHpx - 18 }}
                      >
                        <div className="w-5 h-5 rounded-full bg-[#E3FF33] flex items-center justify-center text-[10px] text-black shadow">
                          ✂
                        </div>
                      </div>
                    </Fragment>
                  )}
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
      <BannerHScroll
        left={hScroll.left}
        max={hScroll.max}
        view={hScroll.view}
        onChange={applyScroll}
        ariaLabel="Scroll banner preview, bottom"
        className="w-full h-3 flex items-center shrink-0 bg-[#121214] border-t border-[#43434E]"
      />
    </div>
  )
}

export { BannerType }
