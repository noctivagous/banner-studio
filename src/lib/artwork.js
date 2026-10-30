import { MAX_SHEETS } from './composition.js'
import { coveredSpan } from './layout.js'

export const MAX_ART_PX = 3200
const PDF_DPI = 200

let pdfLibPromise = null

async function loadPdfLib() {
  if (!pdfLibPromise) {
    pdfLibPromise = (async () => {
      const lib = await import('pdfjs-dist')
      const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url')
      lib.GlobalWorkerOptions.workerSrc = worker.default || worker
      return lib
    })()
  }
  return pdfLibPromise
}

export function classifyFile(file) {
  const type = (file?.type || '').toLowerCase()
  const name = (file?.name || '').toLowerCase()
  if (type === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (type === 'image/svg+xml' || name.endsWith('.svg')) return 'svg'
  if (type.startsWith('image/')) return 'raster'
  return null
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Could not decode that image file.'))
    img.src = url
  })
}

async function rasterToPngBlob(bitmap) {
  const scale = Math.min(1, MAX_ART_PX / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(bitmap, 0, 0, width, height)
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('Could not process that image file.')
  return { blob, width, height }
}

async function decodeRaster(file) {
  const bitmap = await createImageBitmap(file).catch(() => null)
  if (bitmap) {
    try {
      const { blob, width, height } = await rasterToPngBlob(bitmap)
      return { blob, kind: 'raster', aspect: width / height, widthPx: width, heightPx: height }
    } finally {
      bitmap.close?.()
    }
  }
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    const aspect = img.naturalWidth / img.naturalHeight
    return { blob: file, kind: 'raster', aspect, widthPx: img.naturalWidth, heightPx: img.naturalHeight }
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function decodeSvg(file) {
  const url = URL.createObjectURL(file)
  try {
    const img = await loadImage(url)
    if (!(img.naturalWidth > 0) || !(img.naturalHeight > 0)) {
      throw new Error('That SVG has no readable size.')
    }
    return {
      blob: file,
      kind: 'svg',
      aspect: img.naturalWidth / img.naturalHeight,
      widthPx: img.naturalWidth,
      heightPx: img.naturalHeight,
    }
  } finally {
    URL.revokeObjectURL(url)
  }
}

export async function pdfPageCount(file) {
  const lib = await loadPdfLib()
  const data = await file.arrayBuffer()
  const task = lib.getDocument({ data })
  const pdf = await task.promise
  const count = pdf.numPages
  await pdf.destroy()
  return count
}

export async function decodePdf(file, page = 1) {
  const lib = await loadPdfLib()
  const data = await file.arrayBuffer()
  const task = lib.getDocument({ data })
  const pdf = await task.promise
  try {
    if (page < 1 || page > pdf.numPages) throw new Error(`That PDF has ${pdf.numPages} pages.`)
    const pdfPage = await pdf.getPage(page)
    const base = pdfPage.getViewport({ scale: 1 })
    const scale = Math.min(PDF_DPI / 72, MAX_ART_PX / Math.max(base.width, base.height))
    const viewport = pdfPage.getViewport({ scale })
    const canvas = document.createElement('canvas')
    canvas.width = Math.floor(viewport.width)
    canvas.height = Math.floor(viewport.height)
    const ctx = canvas.getContext('2d')
    await pdfPage.render({ canvasContext: ctx, viewport }).promise
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'))
    if (!blob) throw new Error('Could not render that PDF page.')
    return {
      blob,
      kind: 'pdf',
      aspect: viewport.width / viewport.height,
      widthPx: canvas.width,
      heightPx: canvas.height,
      pageCount: pdf.numPages,
      page,
    }
  } finally {
    await pdf.destroy()
  }
}

export async function decodeArtwork(file, { pdfPage = 1 } = {}) {
  const kind = classifyFile(file)
  if (!kind) {
    throw new Error('Upload a PNG, JPEG, WebP, GIF, SVG, or PDF file.')
  }
  const name = (file.name || `artwork.${kind === 'pdf' ? 'pdf' : kind}`).slice(0, 48)
  if (kind === 'pdf') return { ...(await decodePdf(file, pdfPage)), name }
  if (kind === 'svg') return { ...(await decodeSvg(file)), name }
  return { ...(await decodeRaster(file)), name }
}

function containWidth(frameW, frameH, aspect) {
  if (!(frameW > 0) || !(frameH > 0) || !(aspect > 0)) return 0
  return Math.min(frameW, frameH * aspect)
}

function coverWidth(frameW, frameH, aspect) {
  if (!(frameW > 0) || !(frameH > 0) || !(aspect > 0)) return 0
  return Math.max(frameW, frameH * aspect)
}

export function pickGridForAspect(aspect, grid) {
  const { trimW, trimH, contentW, contentH, duplicate } = grid
  let best = { cols: grid.cols, rows: grid.rows, score: Infinity }
  const cap = Math.min(MAX_SHEETS, 8)
  for (let cols = 1; cols <= cap; cols += 1) {
    for (let rows = 1; rows <= cap; rows += 1) {
      const spanW = coveredSpan(cols, trimW, contentW, duplicate)
      const spanH = coveredSpan(rows, trimH, contentH, duplicate)
      if (!(spanW > 0) || !(spanH > 0)) continue
      const score = Math.abs(spanW / spanH - aspect) / aspect + 0.02 * (cols + rows)
      if (score < best.score) best = { cols, rows, score }
    }
  }
  return { cols: best.cols, rows: best.rows }
}

export function fitArtworkToGrid({ aspect, fit = 'contain', matchSheets = true, grid, frame }) {
  const sizeInto = (w, h) =>
    fit === 'cover' ? coverWidth(w, h, aspect) : containWidth(w, h, aspect)
  if (matchSheets) {
    const { cols, rows } = pickGridForAspect(aspect, grid)
    const spanW = coveredSpan(cols, grid.trimW, grid.contentW, grid.duplicate)
    const spanH = coveredSpan(rows, grid.trimH, grid.contentH, grid.duplicate)
    return { cols, rows, widthIn: Math.max(0.5, sizeInto(spanW, spanH)) }
  }
  return {
    cols: grid.cols,
    rows: grid.rows,
    widthIn: Math.max(0.5, sizeInto(frame?.w || 0, frame?.h || 0)),
  }
}
