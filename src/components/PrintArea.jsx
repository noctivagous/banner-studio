import { Fragment } from 'react'
import { CUT_LINE_BLEND, SHADOW_FILL_HATCH, overlapCutSlack } from '../lib/layout.js'
import { BannerType } from './Preview.jsx'

export function PrintArea({
  sheetCount,
  pageW,
  pageH,
  margins,
  contentW,
  trimW,
  trimH,
  lines,
  font,
  glyphHeight,
  lineHeight,
  letterSpacing,
  fill,
  align,
  strokeOn,
  strokeWidth,
  strokeColor,
  shadowOn,
  shadowDxIn,
  shadowDyIn,
  shadowFillType,
  shadowHatchAngle,
  shadowHatchSpacingIn,
  shadowHatchLineWidthIn,
  overlayOn,
  overlayAngle,
  overlaySpacingIn,
  overlayLineWidthIn,
  printOverlap,
  overlap,
  printTrim,
  printNumbers,
  printCutMarks,
}) {
  return (
    <div id="print-area">
      {Array.from({ length: sheetCount }).map((_, i) => (
        <div
          key={i}
          className="print-sheet"
          style={{
            width: `${pageW}in`,
            height: `${pageH}in`,
            position: 'relative',
            background: 'white',
            overflow: 'hidden',
            pageBreakAfter: i < sheetCount - 1 ? 'always' : 'auto',
            breakAfter: i < sheetCount - 1 ? 'page' : 'auto',
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: `${margins.left}in`,
              top: `${margins.top}in`,
              width: `${printOverlap && overlap > 0 ? trimW : contentW}in`,
              height: `${trimH}in`,
              overflow: 'hidden',
              background: 'white',
            }}
          >
            <div
              style={{
                transform: `translateX(-${i * contentW}in)`,
                width: `${Math.max(sheetCount * contentW, contentW) + (printOverlap ? overlap : 0)}in`,
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
              }}
            >
              <BannerType
                lines={lines}
                font={font}
                fontSize={`${glyphHeight * 0.9}in`}
                lineHeight={lineHeight}
                letterSpacing={letterSpacing}
                fill={fill}
                align={align}
                strokeOn={strokeOn}
                strokeCss={`${strokeWidth}in ${strokeColor}`}
                shadowOn={shadowOn}
                shadowDx={`${shadowDxIn}in`}
                shadowDy={`${shadowDyIn}in`}
                shadowHatch={
                  shadowFillType === SHADOW_FILL_HATCH
                    ? {
                        angleDeg: shadowHatchAngle,
                        spacing: shadowHatchSpacingIn,
                        lineWidth: shadowHatchLineWidthIn,
                      }
                    : null
                }
                overlayHatch={
                  overlayOn
                    ? {
                        angleDeg: overlayAngle,
                        spacing: overlaySpacingIn,
                        lineWidth: overlayLineWidthIn,
                      }
                    : null
                }
                hatchUnit="in"
              />
            </div>
          </div>
          {printTrim &&
            [
              i > 0
                ? margins.left + (printOverlap ? overlapCutSlack(overlap, printOverlap) : 0)
                : null,
              !printOverlap && i < sheetCount - 1 ? margins.left + contentW : null,
            ]
              .filter((edge) => edge != null)
              .map((edge) => (
                <div
                  key={edge}
                  style={{
                    ...CUT_LINE_BLEND,
                    position: 'absolute',
                    left: `${edge}in`,
                    top: `${margins.top}in`,
                    height: `${trimH}in`,
                    zIndex: 4,
                  }}
                />
              ))}
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
              SHEET {String(i + 1).padStart(2, '0')} / {String(sheetCount).padStart(2, '0')} • TRIM{' '}
              {trimW.toFixed(2)}&quot;×{trimH.toFixed(2)}&quot;
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
