import { useEffect, useMemo, useState } from 'react'
import { CopyPanel } from './components/CopyPanel.jsx'
import { Output } from './components/Output.jsx'
import { Preview } from './components/Preview.jsx'
import { PrintArea } from './components/PrintArea.jsx'
import { PrinterSafe } from './components/PrinterSafe.jsx'
import { usePersistedSettings } from './hooks/usePersistedSettings.js'
import {
  FONTS,
  PAGE_H,
  PAGE_W,
  PX_PER_INCH,
  clampGlyphHeight,
  formatLength,
  measureTextWidthPx,
  transformLines,
} from './lib/layout.js'

export default function App() {
  const [settings, patch] = usePersistedSettings()
  const {
    copy,
    fontId,
    glyphHeight,
    lineHeight,
    letterSpacing,
    transform,
    fill,
    strokeOn,
    strokeWidth,
    strokeColor,
    align,
    margins,
    overlap,
    showTrim,
    showSafe,
    showTape,
    showNumbers,
    showCutMarks,
    zoom,
  } = settings

  const font = useMemo(() => FONTS.find((f) => f.id === fontId) || FONTS[0], [fontId])
  const trimW = PAGE_W - margins.left - margins.right
  const trimH = PAGE_H - margins.top - margins.bottom
  const contentW = Math.max(0.1, trimW - overlap)
  const lines = useMemo(() => transformLines(copy, transform), [copy, transform])
  const fontPx = glyphHeight * PX_PER_INCH * 0.9

  const [textWidthPx, setTextWidthPx] = useState(0)

  useEffect(() => {
    patch((prev) => {
      const next = clampGlyphHeight(prev.glyphHeight, trimH)
      if (next === prev.glyphHeight) return prev
      return { ...prev, glyphHeight: next }
    })
  }, [trimH, patch])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (document.fonts?.ready) await document.fonts.ready
      } catch {
        /* fonts.ready is optional */
      }
      if (cancelled) return
      if (copy.trim() === '') {
        setTextWidthPx(0)
        return
      }
      setTextWidthPx(measureTextWidthPx(lines, font, fontPx, letterSpacing))
    })()
    return () => {
      cancelled = true
    }
  }, [lines, font, fontPx, letterSpacing, copy])

  const textWidthIn = textWidthPx / PX_PER_INCH
  const sheetCount = textWidthIn > 0 ? Math.ceil(textWidthIn / contentW) : 0
  const assembledInches =
    sheetCount > 0 ? sheetCount * trimW - (sheetCount - 1) * overlap : 0

  const print = () => window.print()

  return (
    <>
      <div
        id="app-root"
        className="min-h-screen max-w-[100vw] overflow-x-hidden bg-[#08080A] text-[#F0F0F2] flex flex-col selection:bg-[#E3FF33] selection:text-black"
      >
        <header
          className="h-14 bg-[#121214] border-b border-[#43434E] flex items-center justify-between px-4 shrink-0 sticky top-0 z-30"
          style={{ paddingTop: 'var(--safe-area-inset-top)' }}
        >
          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-3">
              <span
                className="font-black tracking-[-0.02em] text-[15px] leading-none"
                style={{ fontFamily: 'Anton, Impact, sans-serif' }}
              >
                TILE<span className="text-[#7A7A80] mx-[5px]">/</span>BANNER STUDIO
              </span>
              <span className="hidden md:inline-flex items-center px-2 py-0.5 rounded-[4px] bg-[#26262E] border border-[#43434E] text-[9px] font-mono tracking-[0.12em] text-[#7A7A80] uppercase">
                Landscape 8.5×11 — Trim & Tape
              </span>
            </div>
            <div className="hidden lg:flex items-center gap-2 ml-2">
              <div className="w-px h-4 bg-[#43434E]" />
              <span className="font-mono text-[10px] tracking-[0.14em] text-[#7A7A80] uppercase">
                No edge-to-edge • Inside safe area
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 pr-1">
              <div className="hidden md:flex items-center gap-3 pr-3 border-r border-[#43434E]">
                <span className="font-mono text-[10px] tracking-[0.12em] text-[#7A7A80] uppercase">
                  {sheetCount} Sheets
                </span>
                <span className="w-px h-3 bg-[#43434E]" />
                <span className="font-mono text-[10px] tracking-[0.12em] text-[#F0F0F2]">
                  {assembledInches > 0 ? formatLength(assembledInches) : '—'}
                </span>
              </div>
              <div className="h-8 px-3 bg-[#26262E] border border-[#43434E] rounded-[4px] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E3FF33] animate-pulse" />
                <span className="font-mono text-[10px] tracking-[0.12em] text-[#F0F0F2] uppercase">
                  {trimW.toFixed(2)}&quot; × {trimH.toFixed(2)}&quot; TRIM
                </span>
              </div>
              <button
                type="button"
                onClick={print}
                disabled={sheetCount === 0}
                className="h-8 px-3 rounded-[4px] bg-[#E3FF33] text-black font-mono text-[11px] font-bold tracking-[0.12em] uppercase disabled:opacity-40 disabled:cursor-not-allowed hover:brightness-110"
              >
                Print
              </button>
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col xl:flex-row overflow-hidden min-h-0 min-w-0">
          <CopyPanel
            copy={copy}
            font={font}
            fontId={fontId}
            glyphHeight={glyphHeight}
            lineHeight={lineHeight}
            letterSpacing={letterSpacing}
            transform={transform}
            fill={fill}
            strokeOn={strokeOn}
            strokeWidth={strokeWidth}
            strokeColor={strokeColor}
            align={align}
            printableHeight={trimH}
            onChange={patch}
          />
          <Preview
            zoom={zoom}
            onZoom={(next) => patch({ zoom: next })}
            sheetCount={sheetCount}
            assembledInches={assembledInches}
            margins={margins}
            overlap={overlap}
            trimW={trimW}
            trimH={trimH}
            contentW={contentW}
            textWidthIn={textWidthIn}
            textWidthPx={textWidthPx}
            fontPx={fontPx}
            lines={lines}
            font={font}
            lineHeight={lineHeight}
            letterSpacing={letterSpacing}
            fill={fill}
            align={align}
            strokeOn={strokeOn}
            strokeWidth={strokeWidth}
            strokeColor={strokeColor}
            showTrim={showTrim}
            showSafe={showSafe}
            showTape={showTape}
            showNumbers={showNumbers}
            showCutMarks={showCutMarks}
          />
          <div className="w-full xl:w-[320px] bg-[#121214] xl:border-l border-t xl:border-t-0 border-[#43434E] overflow-y-auto shrink-0">
            <div className="p-5">
              <PrinterSafe margins={margins} overlap={overlap} onChange={patch} />
              <div aria-hidden="true" className="h-px -mx-5 my-7 bg-[#43434E]/60" />
              <Output
                sheetCount={sheetCount}
                assembledInches={assembledInches}
                trimW={trimW}
                trimH={trimH}
                contentW={contentW}
                showTrim={showTrim}
                showSafe={showSafe}
                showTape={showTape}
                showNumbers={showNumbers}
                showCutMarks={showCutMarks}
                onChange={patch}
                onPrint={print}
              />
            </div>
          </div>
        </div>
      </div>
      <PrintArea
        sheetCount={sheetCount}
        margins={margins}
        contentW={contentW}
        trimW={trimW}
        trimH={trimH}
        textWidthIn={textWidthIn}
        lines={lines}
        font={font}
        glyphHeight={glyphHeight}
        lineHeight={lineHeight}
        letterSpacing={letterSpacing}
        fill={fill}
        align={align}
        strokeOn={strokeOn}
        strokeWidth={strokeWidth}
        strokeColor={strokeColor}
        showTrim={showTrim}
        showNumbers={showNumbers}
        showCutMarks={showCutMarks}
      />
    </>
  )
}
