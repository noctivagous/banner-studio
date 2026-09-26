export const PAPERS = [
  { id: 'letter', label: 'Letter', width: 8.5, height: 11 },
  { id: 'legal', label: 'Legal', width: 8.5, height: 14 },
  { id: 'a4', label: 'A4', width: 8.27, height: 11.69 },
]

export function paperById(id) {
  return PAPERS.find((paper) => paper.id === id) || PAPERS[0]
}

export function sheetSize(paperId, orientation) {
  const paper = paperById(paperId)
  const landscape = orientation === 'landscape'
  return {
    pageW: landscape ? paper.height : paper.width,
    pageH: landscape ? paper.width : paper.height,
    label: paper.label,
  }
}
