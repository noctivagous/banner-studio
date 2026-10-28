import { Fragment } from 'react'
import { placeFrameInTrim } from '../lib/grid.js'
import {
  CUT_LINE_BLEND,
  CUT_LINE_BLEND_H,
  JOIN_ALIGN_RECUT,
  horizontalCutInches,
  joinDuplicates,
  verticalCutInches,
} from '../lib/layout.js'
import { SheetJoinMarks } from './JoinMarks.jsx'
import { BannerComposition } from './Preview.jsx'

export function PrintArea({
  sheets = [],
  cols = 0,
  rows = 0,
  tile = false,
  pageW,
  pageH,
  margins,
  contentW,
  contentH,
  trimW,
  trimH,
  composition,
  measured,
  printOverlap,
  join = 'trim-tape',
  overlap,
  printTrim,
  printNumbers,
  printCutMarks,
}) {
  const sheetCount = sheets.length
  const alignRecut = join === JOIN_ALIGN_RECUT
  const duplicateStrip = joinDuplicates(join, printOverlap) && overlap > 0
  const windowW = duplicateStrip ? trimW : contentW
  const windowH = tile && !duplicateStrip ? contentH : trimH
  const frameBoxH = windowH

  return (
    <div id="print-area">
      {sheets.map((sheet) => (
        <div
          key={sheet.index}
          className="print-sheet"
          data-sheet-index={sheet.index}
          data-sheet-col={sheet.col}
          data-sheet-row={sheet.row}
          data-origin-x={sheet.originX}
          data-origin-y={sheet.originY}
          style={{
            width: `${pageW}in`,
            height: `${pageH}in`,
            position: 'relative',
            background: 'white',
            overflow: 'hidden',
            pageBreakAfter: sheet.index < sheetCount - 1 ? 'always' : 'auto',
            breakAfter: sheet.index < sheetCount - 1 ? 'page' : 'auto',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: `${margins.left}in`,
              top: `${margins.top}in`,
              width: `${windowW}in`,
              height: `${windowH}in`,
              overflow: 'hidden',
              background: 'white',
            }}
          >
            <div
              style={{
                transform: `translate(-${sheet.originX}in, -${sheet.originY}in)`,
                width: measured && measured.width > 0 ? `${measured.width}in` : `${windowW}in`,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                paddingTop:
                  measured && measured.height > 0
                    ? `${placeFrameInTrim(
                        composition.container.layout.alignY,
                        measured.height,
                        frameBoxH,
                        composition.alignMode,
                      )}in`
                    : 0,
              }}
            >
              {measured && measured.width > 0 && (
                <BannerComposition
                  composition={composition}
                  measured={measured}
                  hatchUnit="in"
                  unitPerInch={1}
                />
              )}
            </div>
          </div>
          {printTrim && !alignRecut &&
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
                style={{
                  ...CUT_LINE_BLEND,
                  position: 'absolute',
                  left: `${edge}in`,
                  top: `${margins.top}in`,
                  height: `${windowH}in`,
                  zIndex: 4,
                }}
              />
            ))}
          {printTrim && !alignRecut &&
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
                style={{
                  ...CUT_LINE_BLEND_H,
                  position: 'absolute',
                  left: `${margins.left}in`,
                  top: `${edge}in`,
                  width: `${windowW}in`,
                  zIndex: 4,
                }}
              />
            ))}
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
              unit="in"
            />
          )}
          {printCutMarks && (
            <Fragment>
              <div
                style={{
                  position: 'absolute',
                  left: `${margins.left}in`,
                  top: `${margins.top}in`,
                  width: '0.18in',
                  height: '0.18in',
                  borderLeft: '0.8px solid black',
                  borderTop: '0.8px solid black',
                  transform: 'translate(-50%, -50%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `${margins.left + trimW}in`,
                  top: `${margins.top}in`,
                  width: '0.18in',
                  height: '0.18in',
                  borderRight: '0.8px solid black',
                  borderTop: '0.8px solid black',
                  transform: 'translate(-50%, -50%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `${margins.left}in`,
                  top: `${margins.top + trimH}in`,
                  width: '0.18in',
                  height: '0.18in',
                  borderLeft: '0.8px solid black',
                  borderBottom: '0.8px solid black',
                  transform: 'translate(-50%, -50%)',
                }}
              />
              <div
                style={{
                  position: 'absolute',
                  left: `${margins.left + trimW}in`,
                  top: `${margins.top + trimH}in`,
                  width: '0.18in',
                  height: '0.18in',
                  borderRight: '0.8px solid black',
                  borderBottom: '0.8px solid black',
                  transform: 'translate(-50%, -50%)',
                }}
              />
            </Fragment>
          )}
          {printNumbers && (
            <div
              style={{
                position: 'absolute',
                left: '0.2in',
                bottom: '0.15in',
                fontFamily: 'monospace',
                fontSize: '8pt',
                color: '#000',
                opacity: 0.6,
              }}
            >
              {tile
                ? `R${String(sheet.row + 1).padStart(2, '0')} C${String(sheet.col + 1).padStart(2, '0')} • `
                : 'SHEET '}
              {String(sheet.index + 1).padStart(2, '0')} / {String(sheetCount).padStart(2, '0')} • TRIM{' '}
              {trimW.toFixed(2)}&quot;×{trimH.toFixed(2)}&quot;
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
