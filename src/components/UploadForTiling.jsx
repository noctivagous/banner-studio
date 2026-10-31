import { useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { decodeArtwork, pdfPageCount } from '../lib/artwork.js'
import { createArtworkId, deleteArtwork, putArtwork } from '../lib/artworkStore.js'

const ACCEPT = 'image/*,.svg,.pdf'

function DialogShell({ onClose, children }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Upload for tiling"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-[4px] border border-[#43434E] bg-[#141417] p-5 space-y-4"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  )
}

const triggerClass =
  'h-6 px-2 rounded-[3px] border border-[#43434E] bg-[var(--ctl)] font-mono text-[9px] tracking-[0.12em] uppercase leading-none text-[#F0F0F2] hover:border-[#E3FF33] hover:text-[#E3FF33] disabled:opacity-40 flex items-center justify-center'

const menuTriggerClass =
  'w-full text-left px-2.5 py-2 rounded-[3px] font-mono text-[11px] tracking-[0.08em] text-[#F0F0F2] uppercase hover:bg-[#26262E] disabled:opacity-40 flex items-center justify-between'

export function UploadForTilingTrigger({ disabled, variant, onClick }) {
  return (
    <button
      type="button"
      role={variant === 'menu' ? 'menuitem' : undefined}
      title={disabled ? 'Line limit reached — remove a line to upload' : 'Upload an image, SVG, or PDF and tile it'}
      aria-label="Upload for tiling"
      disabled={disabled}
      onClick={onClick}
      className={variant === 'menu' ? menuTriggerClass : triggerClass}
    >
      <span>⇪ Upload for Tiling</span>
      {variant === 'menu' && (
        <span aria-hidden="true" className="text-[#7A7A80]">
          ⧉
        </span>
      )}
    </button>
  )
}

export function UploadForTiling({ disabled, onPlace, variant, onOpen, hideTrigger, open, onOpenChange }) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const isControlled = open !== undefined
  const dialogOpen = isControlled ? open : uncontrolledOpen
  const setDialogOpen = (next) => {
    if (isControlled) onOpenChange?.(next)
    else setUncontrolledOpen(next)
  }
  const [phase, setPhase] = useState('idle')
  const [file, setFile] = useState(null)
  const [pageCount, setPageCount] = useState(0)
  const [page, setPage] = useState(1)
  const [fit, setFit] = useState('contain')
  const [matchSheets, setMatchSheets] = useState(true)
  const [error, setError] = useState('')
  const [staged, setStaged] = useState(null)
  const inputRef = useRef(null)

  const reset = () => {
    setPhase('idle')
    setFile(null)
    setPageCount(0)
    setPage(1)
    setError('')
    setStaged(null)
  }

  const close = async () => {
    if (staged && !staged.placed) {
      try {
        await deleteArtwork(staged.art.blobId)
      } catch {
        /* orphaned blob is harmless */
      }
    }
    reset()
    setDialogOpen(false)
  }

  const launch = () => {
    reset()
    setDialogOpen(true)
    onOpen?.()
  }

  const pick = async (nextFile) => {
    if (!nextFile) return
    setError('')
    setStaged(null)
    setFile(nextFile)
    const lower = (nextFile.name || '').toLowerCase()
    const isPdf = nextFile.type === 'application/pdf' || lower.endsWith('.pdf')
    if (isPdf) {
      setPhase('probing')
      try {
        const count = await pdfPageCount(nextFile)
        setPageCount(count)
        setPage(1)
        setPhase('pdf-page')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not read that PDF.')
        setPhase('idle')
      }
      return
    }
    await decodePicked(nextFile, 1)
  }

  const decodePicked = async (target, pdfPage) => {
    setPhase('decoding')
    setError('')
    try {
      const decoded = await decodeArtwork(target, { pdfPage })
      const id = createArtworkId()
      await putArtwork({ id, blob: decoded.blob, name: decoded.name, kind: decoded.kind })
      setStaged({
        art: { blobId: id, name: decoded.name, kind: decoded.kind, aspect: decoded.aspect },
        widthPx: decoded.widthPx,
        heightPx: decoded.heightPx,
      })
      setPhase('ready')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not read that file.')
      setPhase(target === file && pageCount > 0 ? 'pdf-page' : 'idle')
    }
  }

  const place = () => {
    if (!staged) return
    onPlace(
      { ...staged.art, fit },
      { fit, matchSheets },
    )
    setStaged({ ...staged, placed: true })
    reset()
    setDialogOpen(false)
  }

  return (
    <>
      {!hideTrigger && (
        <UploadForTilingTrigger disabled={disabled} variant={variant} onClick={launch} />
      )}
      {dialogOpen &&
        createPortal(
          <DialogShell onClose={close}>
          <div className="flex items-center justify-between">
            <h2 className="font-mono text-[12px] tracking-[0.12em] uppercase text-[#F0F0F2]">
              Upload for Tiling
            </h2>
            <button
              type="button"
              aria-label="Close upload dialog"
              onClick={close}
              className="w-6 h-6 rounded-[3px] border border-[#43434E] text-[#7A7A80] hover:text-white hover:border-[#5E5E69] font-mono text-[11px] leading-none"
            >
              ✕
            </button>
          </div>

          {(phase === 'idle' || phase === 'probing') && (
            <div
              role="button"
              tabIndex={0}
              aria-label="Choose a file to upload"
              onClick={() => inputRef.current?.click()}
              onKeyDown={(event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault()
                  inputRef.current?.click()
                }
              }}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault()
                pick(event.dataTransfer?.files?.[0])
              }}
              className="rounded-[4px] border border-dashed border-[#5E5E69] hover:border-[#E3FF33] px-4 py-8 text-center cursor-pointer transition-colors"
            >
              <p className="font-mono text-[11px] text-[#F0F0F2]">
                {phase === 'probing' ? 'Reading PDF…' : 'Drop a file here or click to browse'}
              </p>
              <p className="mt-1 font-mono text-[9px] tracking-[0.08em] text-[#7A7A80] uppercase">
                PNG · JPEG · WebP · GIF · SVG · PDF
              </p>
            </div>
          )}

          {phase === 'pdf-page' && file && (
            <div className="space-y-3">
              <p className="font-mono text-[11px] text-[#F0F0F2] truncate">{file.name}</p>
              <p className="font-mono text-[10px] text-[#7A7A80]">
                {pageCount > 1 ? `This PDF has ${pageCount} pages. Pick one to tile.` : 'Rendering page 1.'}
              </p>
              {pageCount > 1 && (
                <label className="flex items-center gap-2 font-mono text-[11px] text-[#F0F0F2]">
                  Page
                  <input
                    type="number"
                    min={1}
                    max={pageCount}
                    value={page}
                    onChange={(event) =>
                      setPage(
                        Math.min(pageCount, Math.max(1, Math.round(Number(event.target.value) || 1))),
                      )
                    }
                    className="w-16 rounded-[3px] border border-[#43434E] bg-black px-2 py-1 text-[#F0F0F2] focus:outline-none focus:border-[#E3FF33]"
                  />
                  <span className="text-[#7A7A80]">of {pageCount}</span>
                </label>
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => decodePicked(file, page)}
                  className="flex-1 h-9 rounded-[3px] bg-[#E3FF33] text-black font-mono text-[11px] font-bold tracking-[0.1em] uppercase hover:brightness-110"
                >
                  Render page
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null)
                    setPhase('idle')
                  }}
                  className="h-9 px-3 rounded-[3px] border border-[#43434E] text-[#7A7A80] hover:text-white font-mono text-[11px] uppercase"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {phase === 'decoding' && (
            <p className="font-mono text-[11px] text-[#F0F0F2] animate-pulse">
              Processing {file?.name || 'file'}…
            </p>
          )}

          {phase === 'ready' && staged && (
            <div className="space-y-3">
              <p className="font-mono text-[11px] text-[#F0F0F2] truncate">{staged.art.name}</p>
              <p className="font-mono text-[10px] text-[#7A7A80]">
                {staged.widthPx} × {staged.heightPx}px · placed on top of the stack
              </p>
              <div>
                <p className="font-mono text-[9px] tracking-[0.12em] uppercase text-[#7A7A80] mb-1.5">
                  Fit
                </p>
                <div className="grid grid-cols-2 gap-1.5">
                  {[
                    { id: 'contain', label: 'Contain', hint: 'Whole image visible' },
                    { id: 'cover', label: 'Cover', hint: 'Fill the frame, crop excess' },
                  ].map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      title={option.hint}
                      aria-pressed={fit === option.id}
                      onClick={() => setFit(option.id)}
                      className={`h-10 rounded-[4px] border font-mono text-[11px] uppercase tracking-[0.08em] transition-colors ${
                        fit === option.id
                          ? 'bg-[#E3FF33] text-black border-[#E3FF33] font-bold'
                          : 'bg-[var(--ctl)] text-[#7A7A80] border-[#43434E] hover:text-white'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={matchSheets}
                  onChange={(event) => setMatchSheets(event.target.checked)}
                  className="mt-0.5 accent-[#E3FF33]"
                />
                <span className="font-mono text-[10px] leading-[1.5] text-[#A8A8B0]">
                  Match sheets to image — resize the sheet grid to the image’s shape.
                  Off keeps the current grid and fits the image inside it.
                </span>
              </label>
              <button
                type="button"
                onClick={place}
                className="w-full h-9 rounded-[3px] bg-[#E3FF33] text-black font-mono text-[11px] font-bold tracking-[0.1em] uppercase hover:brightness-110"
              >
                Place on top
              </button>
            </div>
          )}

          {error && (
            <p role="alert" className="font-mono text-[10px] leading-[1.5] text-[#FF6B6B]">
              {error}
            </p>
          )}

          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="hidden"
            aria-hidden="true"
            tabIndex={-1}
            onChange={(event) => {
              pick(event.target.files?.[0])
              event.target.value = ''
            }}
          />
          </DialogShell>,
          document.body,
        )}
    </>
  )
}
