export const PAPERS = [
  { id: 'letter', label: 'Letter', width: 8.5, height: 11 },
  { id: 'legal', label: 'Legal', width: 8.5, height: 14 },
  { id: 'tabloid', label: 'Tabloid', width: 11, height: 17 },
  { id: 'a5', label: 'A5', width: 5.83, height: 8.27 },
  { id: 'a4', label: 'A4', width: 8.27, height: 11.69 },
  { id: 'a3', label: 'A3', width: 11.69, height: 16.54 },
]

export const CUSTOM_PAPER_ID = 'custom'
export const PAPER_MIN_IN = 2
export const PAPER_MAX_IN = 48

export function paperById(id) {
  return PAPERS.find((paper) => paper.id === id) || null
}

export function normalizeCustomPaper(value) {
  if (!value || typeof value !== 'object') return null
  const width = Number(value.width)
  const height = Number(value.height)
  if (!Number.isFinite(width) || !Number.isFinite(height)) return null
  const clamp = (n) => Math.min(PAPER_MAX_IN, Math.max(PAPER_MIN_IN, Math.round(n * 100) / 100))
  return { width: clamp(width), height: clamp(height) }
}

export function sheetSize(paperId, orientation, customPaper) {
  const landscape = orientation === 'landscape'
  const custom = paperId === CUSTOM_PAPER_ID ? normalizeCustomPaper(customPaper) : null
  const paper = custom || paperById(paperId) || PAPERS[0]
  return {
    pageW: landscape ? paper.height : paper.width,
    pageH: landscape ? paper.width : paper.height,
    label: custom ? 'Custom' : paper.label,
  }
}

export function paperFromPage(pageW, pageH, orientation) {
  const landscape = orientation === 'landscape'
  return normalizeCustomPaper({
    width: landscape ? pageH : pageW,
    height: landscape ? pageW : pageH,
  })
}

export function matchPaper(pageW, pageH, orientation) {
  return (
    PAPERS.find((paper) => {
      const size = sheetSize(paper.id, orientation)
      return Math.abs(size.pageW - pageW) < 0.011 && Math.abs(size.pageH - pageH) < 0.011
    }) || null
  )
}
