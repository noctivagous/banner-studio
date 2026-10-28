import { useCallback, useEffect, useMemo, useState } from 'react'
import { AssembleGuide } from './components/AssembleGuide.jsx'
import { BannerModeControl } from './components/BannerModeControl.jsx'
import { CopyPanel } from './components/CopyPanel.jsx'
import { DocumentMenu } from './components/DocumentMenu.jsx'
import { Inspector } from './components/Inspector.jsx'
import { PrintButton } from './components/PrintButton.jsx'
import { SectionSpine } from './components/SectionChrome.jsx'
import { Output } from './components/Output.jsx'
import { Preview } from './components/Preview.jsx'
import { PrintArea } from './components/PrintArea.jsx'
import { PrinterSafe } from './components/PrinterSafe.jsx'
import { usePersistedSettings } from './hooks/usePersistedSettings.js'
import {
  fitCompositionToTrim,
  getStack,
  measureComposition,
  normalizeComposition,
} from './lib/composition.js'
import {
  ALIGN_RECUT_MIN_OVERLAP,
  JOIN_ALIGN_RECUT,
  JOIN_OVERLAP_TAPE,
  assembledSpan,
  axisCount,
  buildSheets,
  formatLength,
  joinDuplicates,
} from './lib/layout.js'
import { sheetSize } from './lib/paper.js'

export default function App() {
  const [settings, patch] = usePersistedSettings()
  const {
    composition,
    paperId,
    orientation,
    bannerMode,
    margins,
    overlap,
    join,
    showTrim,
    showSafe,
    showTape,
    showNumbers,
    showCutMarks,
    printTrim,
    printNumbers,
    printCutMarks,
    zoom,
    scaleToFit,
  } = settings

  const sheet = sheetSize(paperId, orientation)
  const { pageW, pageH } = sheet
  const trimW = pageW - margins.left - margins.right
  const trimH = pageH - margins.top - margins.bottom
  const contentW = Math.max(0.1, trimW - overlap)
  const contentH = Math.max(0.1, trimH - overlap)
  const tile = bannerMode === 'tile'
  const normalized = useMemo(() => normalizeComposition(composition), [composition])
  const [selection, setSelection] = useState(() => {
    const stack = getStack(normalized)
    return { kind: 'line', id: stack?.lines?.[0]?.id }
  })

  const [measured, setMeasured] = useState(null)

  const setComposition = useCallback(
    (next, preferLineId) => {
      patch((prev) => {
        const incoming = typeof next === 'function' ? next(prev.composition) : next
        const nextTile = prev.bannerMode === 'tile'
        return {
          ...prev,
          composition: nextTile
            ? normalizeComposition(incoming)
            : fitCompositionToTrim(incoming, trimH, preferLineId),
        }
      })
    },
    [patch, trimH],
  )

  useEffect(() => {
    patch((prev) => {
      if (prev.bannerMode === 'tile') return prev
      const current = measureComposition(prev.composition, { maxHeight: trimH })
      if (current.height <= trimH + 1e-6) return prev
      return { ...prev, composition: fitCompositionToTrim(prev.composition, trimH) }
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
      setMeasured(measureComposition(normalized, tile ? {} : { maxHeight: trimH }))
    })()
    return () => {
      cancelled = true
    }
  }, [normalized, trimH, tile])

  const textWidthIn = measured?.width ?? 0
  const textHeightIn = measured?.height ?? 0
  const duplicate = joinDuplicates(join) && overlap > 0
  const [joinBump, setJoinBump] = useState(false)
  const setJoin = (next) => {
    patch((prev) => {
      if (next === prev.join) return prev
      if (next === JOIN_ALIGN_RECUT && prev.overlap < ALIGN_RECUT_MIN_OVERLAP) {
        setJoinBump(true)
        return { ...prev, join: next, overlap: ALIGN_RECUT_MIN_OVERLAP }
      }
      setJoinBump(false)
      return { ...prev, join: next }
    })
  }
  const cols = axisCount(textWidthIn, trimW, contentW, duplicate, overlap)
  const rows = tile && textWidthIn > 0
    ? axisCount(textHeightIn, trimH, contentH, duplicate, overlap)
    : cols > 0
      ? 1
      : 0
  const sheets = useMemo(
    () => buildSheets(cols, rows, contentW, contentH),
    [cols, rows, contentW, contentH],
  )
  const sheetCount = sheets.length
  const assembledInches = assembledSpan(cols, trimW, overlap)
  const assembledHeight = tile ? assembledSpan(rows, trimH, overlap) : trimH
  const derivedRows = rows > 0 ? rows : 1

  useEffect(() => {
    patch((prev) => (prev.rows === derivedRows ? prev : { ...prev, rows: derivedRows }))
  }, [derivedRows, patch])

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
        <header className="pro-bar h-14 bg-[#141417] flex items-center justify-between px-4 shrink-0 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <div className="flex items-baseline gap-3">
              <span
                className="font-black tracking-[-0.02em] text-[15px] leading-none"
                style={{ fontFamily: 'Anton, Impact, sans-serif' }}
              >
                TILE<span className="text-[#7A7A80] mx-[5px]">/</span>BANNER STUDIO
              </span>
              <div className="hidden md:inline-flex items-center gap-1.5">
                <BannerModeControl
                  value={bannerMode}
                  onChange={(mode) =>
                    patch((prev) => {
                      if (mode === prev.bannerMode) return prev
                      if (mode === 'horiz') {
                        return {
                          ...prev,
                          bannerMode: mode,
                          composition: fitCompositionToTrim(prev.composition, trimH),
                        }
                      }
                      return { ...prev, bannerMode: mode }
                    })
                  }
                />
                <span className="pro-seg inline-flex items-center gap-1.5 px-2 py-0.5 rounded-[3px] bg-[#2b2b35] border text-[9px] font-mono tracking-[0.12em] text-[#9A9AA2] uppercase">
                  {pageW.toFixed(2)}×{pageH.toFixed(2)}
                </span>
              </div>
            </div>
            <div className="hidden lg:flex items-center gap-2 ml-2">
              <div className="w-px h-4 bg-black shadow-[1px_0_0_rgba(255,255,255,0.06)]" />
              <span className="font-mono text-[10px] tracking-[0.14em] text-[#7A7A80] uppercase">
                No edge-to-edge • Inside safe area
              </span>
              <AssembleGuide
                join={join}
                asymmetric={join === JOIN_OVERLAP_TAPE}
                overlap={overlap}
                multiRow={tile && rows > 1}
              />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 pr-1">
              <div className="hidden md:flex items-center gap-3 pr-3 border-r border-black shadow-[inset_-1px_0_0_rgba(255,255,255,0.05)]">
                <span className="font-mono text-[10px] tracking-[0.12em] text-[#7A7A80] uppercase">
                  {tile && sheetCount > 0 ? `${cols}×${rows}` : sheetCount} Sheets
                </span>
                <span className="w-px h-3 bg-black shadow-[1px_0_0_rgba(255,255,255,0.06)]" />
                <span className="font-mono text-[10px] tracking-[0.12em] text-[#F0F0F2]">
                  {assembledInches > 0
                    ? tile
                      ? `${formatLength(assembledInches)} × ${formatLength(assembledHeight)}`
                      : formatLength(assembledInches)
                    : '—'}
                </span>
              </div>
              <div className="pro-seg h-8 px-3 bg-[#2b2b35] border rounded-[3px] flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#E3FF33] animate-pulse" />
                <span className="font-mono text-[10px] tracking-[0.12em] text-[#F0F0F2] uppercase">
                  {trimW.toFixed(2)}&quot; × {trimH.toFixed(2)}&quot; TRIM
                </span>
              </div>
              <PrintButton
                disabled={sheetCount === 0}
                onPrint={print}
                join={join}
                marks={{ printTrim, printNumbers, printCutMarks }}
                onChange={patch}
              />
              <DocumentMenu settings={settings} onImport={patch} />
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col xl:flex-row overflow-hidden min-h-0 min-w-0">
          <CopyPanel
            composition={normalized}
            selection={selection}
            onSelect={setSelection}
            printableHeight={trimH}
            tile={tile}
            onChange={setComposition}
          />
          <Preview
            zoom={zoom}
            scaleToFit={scaleToFit}
            onZoom={(next) => patch({ zoom: next })}
            onScaleToFit={(next) => patch({ scaleToFit: next })}
            sheetCount={sheetCount}
            sheets={sheets}
            cols={cols}
            rows={rows}
            tile={tile}
            assembledInches={assembledInches}
            margins={margins}
            overlap={overlap}
            pageW={pageW}
            pageH={pageH}
            trimW={trimW}
            trimH={trimH}
            contentW={contentW}
            contentH={contentH}
            composition={normalized}
            measured={measured}
            selection={selection}
            onSelect={setSelection}
            onChange={setComposition}
            join={join}
            showTrim={showTrim}
            showSafe={showSafe}
            showTape={showTape}
            showNumbers={showNumbers}
            showCutMarks={showCutMarks}
          />
          <div className="w-full xl:w-[320px] min-h-0 flex-1 xl:flex-none xl:shrink-0 bg-[#101014] border-t xl:border-t-0 xl:border-l border-black shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] overflow-y-auto">
            <div className="p-5 space-y-5">
              <section className="zone-inspector pro-group flex flex-row rounded-[3px] bg-[#14141c] border overflow-hidden">
                <SectionSpine label="Inspector" sub="02" />
                <div className="flex-1 min-w-0 p-4">
                  <Inspector
                    composition={normalized}
                    selection={selection}
                    printableHeight={trimH}
                    tile={tile}
                    onChange={setComposition}
                  />
                </div>
              </section>
              <section className="zone-safe pro-group flex flex-row rounded-[3px] bg-[#2d2314] border overflow-hidden">
                <SectionSpine label="Paper & Margins" sub="03" />
                <div className="flex-1 min-w-0 p-4">
                  <PrinterSafe
                    margins={margins}
                    overlap={overlap}
                    join={join}
                    onJoin={setJoin}
                    joinBump={joinBump}
                    paperId={paperId}
                    orientation={orientation}
                    onChange={(partial) => {
                      if (partial && typeof partial === 'object' && 'overlap' in partial) {
                        setJoinBump(false)
                      }
                      patch(partial)
                    }}
                  />
                </div>
              </section>
              <div aria-hidden="true" className="flex items-center gap-3 -mx-5">
                <span className="flex-1 h-px bg-black shadow-[0_1px_0_rgba(255,255,255,0.05)]" />
                <span className="font-mono text-[9px] tracking-[0.2em] text-[#5A5A60] uppercase">
                  Output below
                </span>
                <span className="flex-1 h-px bg-black shadow-[0_1px_0_rgba(255,255,255,0.05)]" />
              </div>
              <section className="zone-output pro-group flex flex-row rounded-[3px] bg-[#111a0b] border overflow-hidden">
                <SectionSpine label="Output" sub="04" />
                <div className="flex-1 min-w-0 p-4">
                  <Output
                sheetCount={sheetCount}
                cols={cols}
                rows={rows}
                tile={tile}
                assembledInches={assembledInches}
                assembledHeight={assembledHeight}
                trimW={trimW}
                trimH={trimH}
                contentW={contentW}
                contentH={contentH}
                showTrim={showTrim}
                showSafe={showSafe}
                showTape={showTape}
                showNumbers={showNumbers}
                showCutMarks={showCutMarks}
                onChange={patch}
                onPrint={print}
                join={join}
                printMarks={{ printTrim, printNumbers, printCutMarks }}
                pageLabel={pageLabel}
              />
                </div>
              </section>
            </div>
          </div>
        </div>
        <footer className="pro-rail-t h-[10px] shrink-0 bg-[#0c0c0e]" />
      </div>
      <PrintArea
        sheets={sheets}
        cols={cols}
        rows={rows}
        tile={tile}
        pageW={pageW}
        pageH={pageH}
        margins={margins}
        contentW={contentW}
        contentH={contentH}
        trimW={trimW}
        trimH={trimH}
        composition={normalized}
        measured={measured}
        join={join}
        overlap={overlap}
        printTrim={printTrim}
        printNumbers={printNumbers}
        printCutMarks={printCutMarks}
      />
    </>
  )
}
