import { Fragment } from 'react'
import { BannerType } from './Preview.jsx'

export function PrintArea({
  sheetCount,
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
  showTrim,
  showNumbers,
  showCutMarks,
}) {
  return (
    <div id="print-area">
      {Array.from({ length: sheetCount }).map((_, i) => (
        <div
          key={i}
          className="print-sheet"
          style={{
            width: '11in',
            height: '8.5in',
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
              width: `${contentW}in`,
              height: `${trimH}in`,
              overflow: 'hidden',
              background: 'white',
            }}
          >
            <div
              style={{
                transform: `translateX(-${i * contentW}in)`,
                width: `${Math.max(sheetCount * contentW, contentW)}in`,
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
              />
            </div>
          </div>
          {showTrim && (
            <div
              style={{
                position: 'absolute',
                left: `${margins.left}in`,
                top: `${margins.top}in`,
                width: `${trimW}in`,
                height: `${trimH}in`,
                border: '1px dashed #000',
                boxSizing: 'border-box',
                opacity: 0.9,
              }}
            />
          )}
          {showCutMarks && (
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
          {showNumbers && (
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
