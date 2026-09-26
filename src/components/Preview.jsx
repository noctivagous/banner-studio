import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { PAGE_H, PAGE_W, PX_PER_INCH } from '../lib/layout.js'

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
        whiteSpace: 'nowrap',
        ...(strokeOn ? { WebkitTextStroke: strokeCss, paintOrder: 'stroke fill' } : {}),
      }}
    >
      {line || '\u00a0'}
    </div>
  ))
}

function BannerHScroll({ left, max, view, onChange }) {
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
    <div className="w-full h-3 flex items-center border-t border-[#43434E]">
      <div
        ref={trackRef}
        role="scrollbar"
        aria-label="Scroll banner preview"
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
  trimW,
  trimH,
  contentW,
  textWidthIn,
  textWidthPx,
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
  const sheetW = PAGE_W * px
  const sheetH = PAGE_H * px
  const contentPx = contentW * px
  const printableHpx = trimH * px
  const typePx = fontPx * zoom
  const stripPx = textWidthPx * zoom
  const canvasRef = useRef(null)
  const rulerRef = useRef(null)
  const [hScroll, setHScroll] = useState({ left: 0, max: 0, view: 0 })

  const measureScroll = useCallback(() => {
    const el = canvasRef.current
    if (!el) return
    const view = el.clientWidth
    const max = Math.max(0, el.scrollWidth - view)
    const left = Math.max(0, Math.min(max, el.scrollLeft))
    if (el.scrollLeft !== left) el.scrollLeft = left
    if (rulerRef.current) rulerRef.current.scrollLeft = left
    setHScroll({ left, max, view })
  }, [])

  const applyScroll = useCallback((left) => {
    const el = canvasRef.current
    if (!el) return
    const max = Math.max(0, el.scrollWidth - el.clientWidth)
    const clamped = Math.max(0, Math.min(max, left))
    el.scrollLeft = clamped
    if (rulerRef.current) rulerRef.current.scrollLeft = clamped
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

      <div className="shrink-0 bg-[#121214] border-b border-[#43434E]">
        <div className="h-8 overflow-hidden relative flex items-center">
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />
        <div
          ref={rulerRef}
          className="relative w-full h-full overflow-x-auto scrollbar-none flex items-center"
        >
          <div
            className="flex items-end h-full"
            style={{
              width: `${Math.max(800, sheetCount * (sheetW + 24))}px`,
              minWidth: '100%',
            }}
          >
            {sheetCount > 0 ? (
              Array.from({ length: Math.ceil(assembledInches) + 1 }).map((_, inch) => (
                <div key={inch} className="relative shrink-0" style={{ width: `${px}px` }}>
                  <div className="absolute bottom-0 left-0 w-px h-2.5 bg-[#2A2A2E]" />
                  {inch % 12 === 0 && (
                    <div className="absolute bottom-0 left-0 w-px h-4 bg-[#5E5E69]" />
                  )}
                  {inch % 6 === 0 && (
                    <span className="absolute -top-0 left-1 font-mono text-[9px] text-[#5A5A60]">
                      {inch}&quot;
                    </span>
                  )}
                  {inch % 12 === 0 && (
                    <span className="absolute bottom-1 left-1.5 font-mono text-[10px] font-bold text-[#F0F0F2]">
                      {Math.floor(inch / 12)}'
                    </span>
                  )}
                </div>
              ))
            ) : (
              <span className="font-mono text-[10px] tracking-[0.1em] text-[#5A5A60] uppercase px-4">
                Type to see ruler
              </span>
            )}
          </div>
        </div>
        </div>
        <BannerHScroll
          left={hScroll.left}
          max={hScroll.max}
          view={hScroll.view}
          onChange={applyScroll}
        />
      </div>

      <div
        ref={canvasRef}
        className="flex-1 overflow-auto relative bg-[#08080A] preview-canvas"
        onScroll={() => {
          const el = canvasRef.current
          if (!el) return
          if (rulerRef.current) rulerRef.current.scrollLeft = el.scrollLeft
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
                  Your banner text will be sliced into landscape 8.5×11 sheets. We keep type
                  inside your printer&apos;s safe area so nothing gets cropped. Trim on the{' '}
                  <span className="text-[#E3FF33]">lime dashed line</span>, overlap the yellow
                  tape zone.
                </p>
                <div className="mt-6 flex justify-center gap-2">
                  <div className="h-8 px-3 rounded-[4px] bg-[#26262E] border border-[#43434E] flex items-center font-mono text-[10px] tracking-[0.1em] text-[#7A7A80] uppercase">
                    11&quot; × 8.5&quot; landscape • {PX_PER_INCH}px/in @100%
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
                  style={{ width: sheetW, height: sheetH + (showNumbers ? 28 : 0) }}
                >
                  <div
                    className="absolute top-0 left-0 bg-white rounded-[2px] overflow-hidden"
                    style={{
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
                      <div
                        className="absolute border border-dotted pointer-events-none"
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
                        className="absolute border border-dashed pointer-events-none"
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
                          width: stripPx,
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
                          background:
                            'repeating-linear-gradient(45deg, rgba(227,255,51,0.22) 0 8px, rgba(227,255,51,0.08) 8px 16px)',
                          borderLeft: '1px dashed rgba(120,120,0,0.5)',
                        }}
                      >
                        <span className="font-mono text-[8px] font-black tracking-[0.24em] text-black/70 rotate-90">
                          TAPE ↕
                        </span>
                      </div>
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
                        style={{ left: -2, top: margins.top * px + 2 }}
                      >
                        <div className="w-5 h-5 rounded-full bg-[#E3FF33] flex items-center justify-center text-[10px] text-black shadow">
                          ✂
                        </div>
                      </div>
                      <div
                        className="absolute flex items-center gap-1"
                        style={{ left: -2, top: margins.top * px + printableHpx - 18 }}
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
                      style={{ top: sheetH + 6 }}
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
    </div>
  )
}

export { BannerType }
