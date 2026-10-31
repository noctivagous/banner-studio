import { useEffect, useId, useRef, useState } from 'react'
import {
  ASSEMBLY_ALIGN_RECUT,
  ASSEMBLY_ASYMMETRIC_TRIM,
  ASSEMBLY_EDGE_TO_EDGE,
  JOIN_ALIGN_RECUT,
  OVERLAP_CUT_SLACK,
} from '../lib/layout.js'

export function AssembleGuide({
  join = 'trim-tape',
  asymmetric,
  overlap,
  multiRow = false,
  hideButton = false,
  open: openProp,
  onOpenChange,
  anchorRef,
}) {
  const [storedOpen, setStoredOpen] = useState(false)
  const open = openProp ?? storedOpen
  const setOpen = onOpenChange ?? setStoredOpen
  const [box, setBox] = useState(null)
  const buttonRef = useRef(null)
  const panelRef = useRef(null)
  const titleId = useId()

  useEffect(() => {
    if (!open) return
    const close = (event) => {
      const target = event.target
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
    }
    const onKey = (event) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', close)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', close)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const anchor = anchorRef?.current || buttonRef.current
    if (!anchor) return
    const rect = anchor.getBoundingClientRect()
    const width = 340
    setBox({
      top: rect.bottom + 8,
      left: Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8)),
      width,
    })
  }, [open, anchorRef])

  const toggle = () => setOpen((value) => !value)

  return (
    <>
      {hideButton ? null : (
        <button
          ref={buttonRef}
          type="button"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={titleId}
          className="h-6 px-2 rounded-[4px] border border-[#43434E] bg-[#26262E] font-mono text-[10px] tracking-[0.12em] text-[#E3FF33] uppercase hover:border-[#5E5E69]"
        >
          How to assemble
        </button>
      )}
      {open && box && (
        <div
          ref={panelRef}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          data-assembly={
            join === JOIN_ALIGN_RECUT
              ? ASSEMBLY_ALIGN_RECUT
              : asymmetric
                ? ASSEMBLY_ASYMMETRIC_TRIM
                : ASSEMBLY_EDGE_TO_EDGE
          }
          className="fixed z-50 rounded-[4px] border border-[#43434E] bg-[#121214] p-4 shadow-[0_16px_48px_rgba(0,0,0,0.6)]"
          style={{ top: box.top, left: box.left, width: box.width }}
        >
          <div className="font-mono text-[10px] tracking-[0.14em] text-[#7A7A80] uppercase">
            How to assemble
          </div>
          <h2 id={titleId} className="mt-1 font-mono text-[13px] tracking-[0.08em] text-[#F0F0F2] uppercase">
            {join === JOIN_ALIGN_RECUT ? 'Align & Recut' : asymmetric ? 'Asymmetric trim' : 'Edge to edge'}
          </h2>
          {join === JOIN_ALIGN_RECUT ? (
            <div className="mt-3 space-y-2 font-mono text-[11px] leading-[1.5] text-[#A0A0A6]">
              <p>
                Align & Recut prints the same {overlap.toFixed(2)}&quot; of type on both sides of the seam, with a blue line through the crosses and a red line beside them.
              </p>
              <p>
                Cut the left sheet on the blue line through the centers of the crosses. That removes the extra margin.
              </p>
              <p>
                Lay that edge on the next sheet, match the crosses, and tape from the back. Then cut through both sheets on the red line, to the left of the crosses.
              </p>
              <p>
                Tape the seam from the back. The join is a single edge.
              </p>
              {multiRow && (
                <p>
                  Do each vertical seam across a row, then each horizontal seam between rows. On a horizontal seam the blue line is the first cut on the upper sheet, and the red line above the crosses is the cut through both.
                </p>
              )}
            </div>
          ) : asymmetric ? (
            <div className="mt-3 space-y-2 font-mono text-[11px] leading-[1.5] text-[#A0A0A6]">
              <p>
                Tape overlap is an asymmetric trim. The earlier sheet keeps its right edge. That flap prints the same {overlap.toFixed(2)}&quot; of type as the start of the next sheet.
              </p>
              <p>
                Cut only the next sheet, on the scissor line {OVERLAP_CUT_SLACK.toFixed(2)}&quot; inside that shared strip. The earlier sheet has no cut guide, because the next sheet covers it.
              </p>
              <p>
                Lay the cut sheet on the flap and match the letters. Tape from the back. A cut that wanders a little still lands on type printed on both sheets.
              </p>
              {multiRow && (
                <p>
                  Join each row from left to right, then join the rows from top to bottom. Cut the following sheet on its top as well as its left. The overlap is {overlap.toFixed(2)}&quot; on both axes.
                </p>
              )}
            </div>
          ) : (
            <div className="mt-3 space-y-2 font-mono text-[11px] leading-[1.5] text-[#A0A0A6]">
              <p>
                Edge to edge is a butt joint. There is no duplicated type. The tape strip is blank.
              </p>
              <p>
                Cut both sides of the seam so the sheets meet with no overlap. Tape the seam from the back. The cut has to be exact.
              </p>
              {multiRow && (
                <p>
                  Cut both sides of each horizontal seam too. Join each row from left to right, then join the rows from top to bottom.
                </p>
              )}
            </div>
          )}
        </div>
      )}
    </>
  )
}
