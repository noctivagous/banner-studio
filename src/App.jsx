import { useCallback, useEffect, useMemo, useState } from 'react'
import { BannerModeControl } from './components/BannerModeControl.jsx'
import { Logo } from './components/Logo.jsx'
import { CopyPanel } from './components/CopyPanel.jsx'
import { DocumentMenu } from './components/DocumentMenu.jsx'
import { Inspector } from './components/Inspector.jsx'
import { PaperSizeMenu } from './components/PaperSizeMenu.jsx'
import { PrintButton } from './components/PrintButton.jsx'
import { RailSection } from './components/SectionChrome.jsx'
import { useSectionOpen } from './hooks/usePersistedSections.js'
import { Output } from './components/Output.jsx'
import { Preview } from './components/Preview.jsx'
import { SheetCountMenu } from './components/SheetGridBar.jsx'
import { PrintArea } from './components/PrintArea.jsx'
import { PrinterSafe } from './components/PrinterSafe.jsx'
import { DEFAULT_SETTINGS, usePersistedSettings } from './hooks/usePersistedSettings.js'
import {
  MAX_COPY_LINES,
  MAX_SHEETS,
  appendArtLine,
  applySheetGrid,
  defaultSelection,
  getLines,
  inferSheetCount,
  measureComposition,
  normalizeComposition,
} from './lib/composition.js'
import { fitArtworkToGrid } from './lib/artwork.js'
import {
  ALIGN_RECUT_MIN_OVERLAP,
  JOIN_ALIGN_RECUT,
  JOIN_OVERLAP_TAPE,
  assembledSpan,
  buildSheets,
  joinDuplicates,
} from './lib/layout.js'
import { sheetSize } from './lib/paper.js'
import { formatSize } from './lib/units.js'

export default function App() {
  const [settings, patch, reset] = usePersistedSettings()
  const {
    composition,
    paperId,
    customPaper,
    orientation,
    unit,
    bannerMode,
    cols: storedCols,
    rows: storedRows,
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

  const sheet = sheetSize(paperId, orientation, customPaper)
  const { pageW, pageH } = sheet
  const trimW = pageW - margins.left - margins.right
  const trimH = pageH - margins.top - margins.bottom
  const contentW = Math.max(0.1, trimW - overlap)
  const contentH = Math.max(0.1, trimH - overlap)
  const duplicate = joinDuplicates(join) && overlap > 0
  const normalized = useMemo(() => normalizeComposition(composition), [composition])
  const inferredCols = inferSheetCount(
    Number(normalized.container?.size?.width) || 0,
    trimW,
    contentW,
    duplicate,
    overlap,
  )
  const inferredRows = inferSheetCount(
    Number(normalized.container?.size?.height) || 0,
    trimH,
    contentH,
    duplicate,
    overlap,
  )
  const cols = Math.min(MAX_SHEETS, Math.max(1, storedCols ?? inferredCols))
  const rows = Math.min(MAX_SHEETS, Math.max(1, storedRows ?? inferredRows))
  const tile = bannerMode === 'tile' || rows > 1
  const [selection, setSelection] = useState(() => defaultSelection(normalized))

  const [fontsVersion, setFontsVersion] = useState(0)

  const resetDocument = useCallback(() => {
    reset()
    setSelection(defaultSelection(DEFAULT_SETTINGS.composition))
  }, [reset])

  const importDocument = useCallback(
    (next) => {
      patch(next)
      setSelection(defaultSelection(next?.composition))
    },
    [patch],
  )

  const applyGrid = useCallback(
    (nextCols, nextRows, edges) => {
      patch((prev) => {
        const sheet = sheetSize(prev.paperId, prev.orientation, prev.customPaper)
        const nextTrimW = sheet.pageW - prev.margins.left - prev.margins.right
        const nextTrimH = sheet.pageH - prev.margins.top - prev.margins.bottom
        const nextOverlap = prev.overlap
        const nextDuplicate = joinDuplicates(prev.join) && nextOverlap > 0
        const ctx = {
          trimW: nextTrimW,
          trimH: nextTrimH,
          contentW: Math.max(0.1, nextTrimW - nextOverlap),
          contentH: Math.max(0.1, nextTrimH - nextOverlap),
          duplicate: nextDuplicate,
          overlap: nextOverlap,
        }
        const applied = applySheetGrid(prev.composition, nextCols, nextRows, ctx, edges)
        const nextMode = applied.rows > 1 ? 'tile' : prev.bannerMode
        if (
          !applied.changed &&
          applied.cols === prev.cols &&
          applied.rows === prev.rows &&
          nextMode === prev.bannerMode
        ) {
          return prev
        }
        return {
          ...prev,
          cols: applied.cols,
          rows: applied.rows,
          bannerMode: nextMode,
          composition: applied.composition,
        }
      })
    },
    [patch],
  )

  const setComposition = useCallback(
    (next) => {
      patch((prev) => {
        const incoming = normalizeComposition(
          typeof next === 'function' ? next(prev.composition) : next,
        )
        return { ...prev, composition: incoming }
      })
    },
    [patch],
  )

  const patchCompositionLive = useCallback(
    (next) => {
      patch((prev) => {
        const incoming = typeof next === 'function' ? next(prev.composition) : next
        return { ...prev, composition: normalizeComposition(incoming) }
      })
    },
    [patch],
  )

  const commitComposition = useCallback(() => {}, [])

  useEffect(() => {
    applyGrid(cols, rows)
  }, [applyGrid, cols, rows, trimW, trimH, contentW, contentH, duplicate, overlap])

  // Measure synchronously so the preview never renders one frame with stale
  // geometry during a drag (the old async effect resolved after paint, making
  // every pointermove flicker). fonts.ready only bumps a version key to
  // re-measure once webfonts arrive. The opentype engine warms in parallel
  // and bumps the same key so kerned advances take over when ready.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        if (document.fonts?.ready) await document.fonts.ready
      } catch {
        /* fonts.ready is optional */
      }
      if (!cancelled) setFontsVersion((v) => v + 1)
      try {
        const { warmTypeEngine } = await import('./lib/typeEngine.js')
        await warmTypeEngine()
      } catch {
        /* engine warmup is optional; canvas fallback stays */
      }
      if (!cancelled) setFontsVersion((v) => v + 1)
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const measured = useMemo(
    () => measureComposition(normalized),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [normalized, fontsVersion],
  )

  const [pendingArtSelect, setPendingArtSelect] = useState(null)

  useEffect(() => {
    if (!pendingArtSelect) return
    const line = getLines(normalized).find((entry) => entry.art?.blobId === pendingArtSelect)
    if (line) {
      setSelection({ kind: 'line', id: line.id })
      setPendingArtSelect(null)
    }
  }, [normalized, pendingArtSelect])

  const placeArtwork = useCallback(
    (artMeta, options = {}) => {
      const fit = options.fit === 'cover' ? 'cover' : 'contain'
      const matchSheets = options.matchSheets !== false
      const grid = { trimW, trimH, contentW, contentH, duplicate, overlap, cols, rows }
      const fitted = fitArtworkToGrid({
        aspect: artMeta.aspect,
        fit,
        matchSheets,
        grid,
        frame: { w: measured?.width || 0, h: measured?.height || 0 },
      })
      if (!(fitted.widthIn > 0)) return
      const art = { ...artMeta, fit, widthIn: Math.round(fitted.widthIn * 100) / 100 }
      patch((prev) => {
        const next = appendArtLine(prev.composition, art)
        if (!next.added) return prev
        if (fitted.cols !== prev.cols || fitted.rows !== prev.rows) {
          return {
            ...prev,
            composition: next.composition,
            cols: fitted.cols,
            rows: fitted.rows,
            bannerMode: fitted.rows > 1 ? 'tile' : prev.bannerMode,
          }
        }
        return { ...prev, composition: next.composition }
      })
      setPendingArtSelect(artMeta.blobId)
    },
    [trimW, trimH, contentW, contentH, duplicate, overlap, cols, rows, measured],
  )

  const [copyOpen, setCopyOpen] = useSectionOpen('sidebar.copy', false)
  const [inspectorOpen, setInspectorOpen] = useSectionOpen('sidebar.inspector', false)
  const [safeOpen, setSafeOpen] = useSectionOpen('sidebar.safe', false)
  const [outputOpen, setOutputOpen] = useSectionOpen('sidebar.output', false)
  const rightOpen = inspectorOpen || safeOpen || outputOpen
  const [joinBump, setJoinBump] = useState(false)
  const [renderer, setRenderer] = useState('paper')
  const [arrangement, setArrangement] = useState('overlap')
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
  const sheets = useMemo(
    () => buildSheets(cols, rows, contentW, contentH),
    [cols, rows, contentW, contentH],
  )
  const sheetCount = sheets.length
  const assembledInches = assembledSpan(cols, trimW, overlap)
  const assembledHeight = assembledSpan(rows, trimH, overlap)

  const print = () => window.print()
  const pageLabel = `${sheet.label} ${orientation} ${formatSize(pageW, pageH, unit)}`

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
            <div className="flex items-center gap-3">
              <Logo />
              <div className="hidden md:inline-flex items-center gap-1.5">
                <BannerModeControl
                  value={bannerMode}
                  onChange={(mode) => {
                    if (mode === 'horiz') applyGrid(cols, 1)
                    patch((prev) => (prev.bannerMode === mode ? prev : { ...prev, bannerMode: mode }))
                  }}
                />
                <PaperSizeMenu
                  paperId={paperId}
                  orientation={orientation}
                  customPaper={customPaper}
                  unit={unit}
                  onChange={patch}
                />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 pr-1">
              <div className="inline-flex items-stretch">
                <SheetCountMenu
                  cols={cols}
                  rows={rows}
                  sheetCount={sheetCount}
                  onSetGrid={(nextCols, nextRows) => applyGrid(nextCols, nextRows, { x: 'right', y: 'bottom' })}
                />
                <PrintButton
                  flushLeft
                  disabled={sheetCount === 0}
                  onPrint={print}
                  join={join}
                  marks={{ printTrim, printNumbers, printCutMarks }}
                  onChange={patch}
                />
              </div>
              <DocumentMenu
                settings={settings}
                onImport={importDocument}
                onReset={resetDocument}
                onPlaceArtwork={placeArtwork}
                uploadDisabled={getLines(normalized).length >= MAX_COPY_LINES}
                renderer={renderer}
                onRendererChange={setRenderer}
                arrangement={arrangement}
                onArrangementChange={setArrangement}
                join={join}
                asymmetric={join === JOIN_OVERLAP_TAPE}
                overlap={overlap}
                multiRow={tile && rows > 1}
              />
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-row overflow-hidden min-h-0 min-w-0">
          <div className="order-2 flex w-max max-w-[46vw] shrink-0 flex-col overflow-x-hidden overflow-y-auto border-l border-black min-h-0 xl:contents">
          <CopyPanel
            composition={normalized}
            selection={selection}
            onSelect={setSelection}
            printableHeight={trimH}
            tile={tile}
            onChange={setComposition}
            open={copyOpen}
            onOpenChange={setCopyOpen}
            fill={!copyOpen && !rightOpen}
          />
          <div
            className={`contents xl:order-3 xl:flex xl:min-h-0 xl:flex-none xl:flex-col xl:overflow-hidden xl:border-l xl:border-black ${
              rightOpen ? 'xl:w-[320px] xl:overflow-y-auto' : 'xl:w-[22px]'
            }`}
          >
              <RailSection
                sectionId="sidebar.inspector"
                label="Inspector"
                sub="02"
                defaultOpen={false}
                collapsedFill={!copyOpen && !rightOpen}
                zoneClass="zone-inspector bg-[#14141c] border-b border-black"
                open={inspectorOpen}
                onOpenChange={setInspectorOpen}
              >
                <div className="flex-1 min-w-0 p-4 overflow-y-auto">
                  <Inspector
                    composition={normalized}
                    selection={selection}
                    printableHeight={trimH}
                    tile={tile}
                    onChange={setComposition}
                  />
                </div>
              </RailSection>
              <RailSection
                sectionId="sidebar.safe"
                label="Paper & Margins"
                sub="03"
                defaultOpen={false}
                collapsedFill={!copyOpen && !rightOpen}
                zoneClass="zone-safe bg-[#2d2314] border-b border-black"
                open={safeOpen}
                onOpenChange={setSafeOpen}
              >
                <div className="flex-1 min-w-0 p-4 overflow-y-auto">
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
              </RailSection>
              <RailSection
                sectionId="sidebar.output"
                label="Output"
                sub="04"
                defaultOpen={false}
                collapsedFill={!copyOpen && !rightOpen}
                zoneClass="zone-output bg-[#111a0b]"
                open={outputOpen}
                onOpenChange={setOutputOpen}
              >
                <div className="flex-1 min-w-0 p-4 overflow-y-auto">
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
                unit={unit}
              />
                </div>
              </RailSection>
          </div>
          </div>
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
            onLivePatch={patchCompositionLive}
            onLiveCommit={commitComposition}
            onSheetGrid={applyGrid}
            renderer={renderer}
            arrangement={arrangement}
            unit={unit}
            join={join}
            showTrim={showTrim}
            showSafe={showSafe}
            showTape={showTape}
            showNumbers={showNumbers}
            showCutMarks={showCutMarks}
          />
        </div>
        <footer className="pro-rail-t h-11 shrink-0 bg-[#0c0c0e] flex items-center justify-end gap-1.5 px-3">
          <span className="hidden md:block font-mono text-[10px] tracking-[0.1em] text-[#7A7A80] uppercase mr-1">
            Zoom
          </span>
          {[0.25, 0.5, 0.75, 1].map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => patch({ scaleToFit: false, zoom: level })}
              className={`hidden lg:inline-flex pro-bevel h-7 px-2.5 rounded-[3px] border font-mono text-[11px] tracking-[0.08em] transition-colors ${
                !scaleToFit && Math.abs(zoom - level) < 0.001
                  ? 'bg-[#E3FF33] text-black border-[#E3FF33] font-bold'
                  : 'bg-[#26262E] text-[#7A7A80] border-[#43434E] hover:text-[#F0F0F2] hover:border-[#5E5E69]'
              }`}
            >
              {level * 100}%
            </button>
          ))}
          <button
            type="button"
            onClick={() => patch({ scaleToFit: true })}
            className={`pro-bevel h-7 px-2.5 rounded-[3px] border font-mono text-[11px] tracking-[0.08em] uppercase transition-colors ${
              scaleToFit
                ? 'bg-[#E3FF33] text-black border-[#E3FF33] font-bold'
                : 'bg-[#26262E] text-[#7A7A80] border-[#43434E] hover:text-[#F0F0F2] hover:border-[#5E5E69]'
            }`}
          >
            Scale
          </button>
        </footer>
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
