import { useEffect, useMemo, useState } from 'react'
import { AssembleGuide } from './components/AssembleGuide.jsx'
import { CopyPanel } from './components/CopyPanel.jsx'
import { DocumentMenu } from './components/DocumentMenu.jsx'
import { PrintButton } from './components/PrintButton.jsx'
import { Output } from './components/Output.jsx'
import { Preview } from './components/Preview.jsx'
import { PrintArea } from './components/PrintArea.jsx'
import { PrinterSafe } from './components/PrinterSafe.jsx'
import { usePersistedSettings } from './hooks/usePersistedSettings.js'
import {
  FONTS,
  PX_PER_INCH,
  clampGlyphHeight,
  formatLength,
  measureTextWidthPx,
  transformLines,
} from './lib/layout.js'
import { PAPERS, sheetSize } from './lib/paper.js'

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
    paperId,
    orientation,
    margins,
    overlap,
    showTrim,
    showSafe,
    showTape,
    showNumbers,
    showCutMarks,
    printTrim,
    printOverlap,
    printNumbers,
    printCutMarks,
    zoom,
    scaleToFit,
  } = settings

  const font = useMemo(() => FONTS.find((f) => f.id === fontId) || FONTS[0], [fontId])
  const sheet = sheetSize(paperId, orientation)
  const { pageW, pageH } = sheet
  const trimW = pageW - margins.left - margins.right
  const trimH = pageH - margins.top - margins.bottom
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
  const sheetCount =
    textWidthIn <= 0
      ? 0
      : printOverlap && overlap > 0
        ? textWidthIn <= trimW
          ? 1
          : Math.ceil((textWidthIn - overlap) / contentW)
        : Math.ceil(textWidthIn / contentW)
  const assembledInches =
    sheetCount > 0 ? sheetCount * trimW - (sheetCount - 1) * overlap : 0

  const print = () => window.print()
  const pageLabel = `${sheet.label} ${orientation} ${pageW.toFixed(2)}"×${pageH.toFixed(2)}"`

  useEffect(() => {
    let style = document.getElementById('banner-page-size')
    if (!style) {
      style = document.createElement('style')
      style.id = 'banner-page-size'
      document.head.appendChild(style)
    }
    style.textContent = `@media print { @page { size: ${pageW}in ${pageH}in; margin: 0; } }`
  }, [pageW, pageH])

  return (
    <>
      <div
        id="app-root"
        className="h-full max-h-full overflow-hidden bg-[#08080A] text-[#F0F0F2] flex flex-col selection:bg-[#E3FF33] selection:text-black"
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
              <div className="hidden md:inline-flex items-center gap-1.5">
                <label className="relative">
                  <span className="sr-only">Page size</span>
                  <select
                    aria-label="Page size"
                    value={paperId}
                    onChange={(e) => patch({ paperId: e.target.value })}
                    className="h-6 pl-2 pr-5 rounded-[4px] bg-[#26262E] border border-[#43434E] text-[9px] font-mono tracking-[0.12em] text-[#7A7A80] uppercase appearance-none focus:outline-none focus:border-[#E3FF33]/60"
                  >
                    {PAPERS.map((paper) => (
                      <option key={paper.id} value={paper.id}>
                        {paper.label}
                      </option>
                    ))}
                  </select>
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] text-[#7A7A80]">
                    ▼
                  </span>
                </label>
                <label className="relative">
                  <span className="sr-only">Orientation</span>
                  <select
                    aria-label="Orientation"
                    value={orientation}
                    onChange={(e) => patch({ orientation: e.target.value })}
                    className="h-6 pl-2 pr-5 rounded-[4px] bg-[#26262E] border border-[#43434E] text-[9px] font-mono tracking-[0.12em] text-[#7A7A80] uppercase appearance-none focus:outline-none focus:border-[#E3FF33]/60"
                  >
                    <option value="landscape">Landscape</option>
                    <option value="portrait">Portrait</option>
                  </select>
                  <span className="absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none text-[8px] text-[#7A7A80]">
                    ▼
                  </span>
                </label>
                <span className="inline-flex items-center px-2 py-0.5 rounded-[4px] bg-[#26262E] border border-[#43434E] text-[9px] font-mono tracking-[0.12em] text-[#7A7A80] uppercase">
                  {pageW.toFixed(2)}×{pageH.toFixed(2)} — Trim & Tape
                </span>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-2 ml-2">
              <div className="w-px h-4 bg-[#43434E]" />
              <span className="font-mono text-[10px] tracking-[0.14em] text-[#7A7A80] uppercase">
                No edge-to-edge • Inside safe area
              </span>
              <AssembleGuide asymmetric={printOverlap} overlap={overlap} />
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
              <PrintButton
                disabled={sheetCount === 0}
                onPrint={print}
                marks={{ printOverlap, printTrim, printNumbers, printCutMarks }}
                onChange={patch}
              />
              <DocumentMenu settings={settings} onImport={patch} />
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
            scaleToFit={scaleToFit}
            onZoom={(next) => patch({ zoom: next })}
            onScaleToFit={(next) => patch({ scaleToFit: next })}
            sheetCount={sheetCount}
            assembledInches={assembledInches}
            margins={margins}
            overlap={overlap}
            pageW={pageW}
            pageH={pageH}
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
            printOverlap={printOverlap}
            showTrim={showTrim}
            showSafe={showSafe}
            showTape={showTape}
            showNumbers={showNumbers}
            showCutMarks={showCutMarks}
          />
          <div className="w-full xl:w-[320px] min-h-0 flex-1 xl:flex-none xl:shrink-0 bg-[#121214] xl:border-l border-t xl:border-t-0 border-[#43434E] overflow-y-auto">
            <div className="p-5">
              <PrinterSafe
                margins={margins}
                overlap={overlap}
                paperId={paperId}
                orientation={orientation}
                onChange={patch}
              />
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
                printMarks={{ printOverlap, printTrim, printNumbers, printCutMarks }}
                pageLabel={pageLabel}
              />
            </div>
          </div>
        </div>
        <footer className="h-[10px] shrink-0 bg-[#121214] border-t border-[#43434E]" />
      </div>
      <PrintArea
        sheetCount={sheetCount}
        pageW={pageW}
        pageH={pageH}
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
        printOverlap={printOverlap}
        overlap={overlap}
        printTrim={printTrim}
        printNumbers={printNumbers}
        printCutMarks={printCutMarks}
      />
    </>
  )
}
