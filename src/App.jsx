import { useCallback, useEffect, useMemo, useState } from 'react'
import { AssembleGuide } from './components/AssembleGuide.jsx'
import { BannerModeControl } from './components/BannerModeControl.jsx'
import { CopyPanel } from './components/CopyPanel.jsx'
import { DocumentMenu } from './components/DocumentMenu.jsx'
import { Inspector } from './components/Inspector.jsx'
import { PrintButton } from './components/PrintButton.jsx'
import { RailSection } from './components/SectionChrome.jsx'
import { useSectionOpen } from './hooks/usePersistedSections.js'
import { Output } from './components/Output.jsx'
import { Preview } from './components/Preview.jsx'
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
  formatLength,
  joinDuplicates,
} from './lib/layout.js'
import { sheetSize } from './lib/paper.js'

export default function App() {
  const [settings, patch, reset] = usePersistedSettings()
  const {
    composition,
    paperId,
    orientation,
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

  const sheet = sheetSize(paperId, orientation)
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
        const sheet = sheetSize(prev.paperId, prev.orientation)
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

  const [inspectorOpen, setInspectorOpen] = useSectionOpen('sidebar.inspector', false)
  const [safeOpen, setSafeOpen] = useSectionOpen('sidebar.safe', false)
  const [outputOpen, setOutputOpen] = useSectionOpen('sidebar.output', false)
  const rightOpen = inspectorOpen || safeOpen || outputOpen
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
  const sheets = useMemo(
    () => buildSheets(cols, rows, contentW, contentH),
    [cols, rows, contentW, contentH],
  )
  const sheetCount = sheets.length
  const assembledInches = assembledSpan(cols, trimW, overlap)
  const assembledHeight = assembledSpan(rows, trimH, overlap)

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
                  onChange={(mode) => {
                    if (mode === 'horiz') applyGrid(cols, 1)
                    patch((prev) => (prev.bannerMode === mode ? prev : { ...prev, bannerMode: mode }))
                  }}
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
                  {sheetCount > 0 ? `${cols}×${rows}` : sheetCount} Sheets
                </span>
                <span className="w-px h-3 bg-black shadow-[1px_0_0_rgba(255,255,255,0.06)]" />
                <span className="font-mono text-[10px] tracking-[0.12em] text-[#F0F0F2]">
                  {assembledInches > 0
                    ? `${formatLength(assembledInches)} × ${formatLength(assembledHeight)}`
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
              <DocumentMenu
                settings={settings}
                onImport={importDocument}
                onReset={resetDocument}
                onPlaceArtwork={placeArtwork}
                uploadDisabled={getLines(normalized).length >= MAX_COPY_LINES}
              />
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
            onLivePatch={patchCompositionLive}
            onLiveCommit={commitComposition}
            onSheetGrid={applyGrid}
            join={join}
            showTrim={showTrim}
            showSafe={showSafe}
            showTape={showTape}
            showNumbers={showNumbers}
            showCutMarks={showCutMarks}
          />
          <div
            className={`min-h-0 bg-[#101014] border-black shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] flex flex-col overflow-hidden shrink-0 ${
              rightOpen
                ? 'w-full xl:w-[320px] max-h-[46vh] xl:max-h-none border-t xl:border-t-0 xl:border-l overflow-y-auto'
                : 'w-[22px] border-l'
            }`}
          >
              <RailSection
                sectionId="sidebar.inspector"
                label="Inspector"
                sub="02"
                defaultOpen={false}
                collapsedFill={!rightOpen}
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
                collapsedFill={!rightOpen}
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
                collapsedFill={!rightOpen}
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
              />
                </div>
              </RailSection>
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
