export const GRID_PITCH_IN = 1
export const GRID_HALF_IN = 0.5

export function snapHalfIn(value, { allowZero = true, min = 0, max = Infinity } = {}) {
  const n = Number(value)
  if (!Number.isFinite(n)) return allowZero ? 0 : GRID_HALF_IN
  let snapped = Math.round(n / GRID_HALF_IN) * GRID_HALF_IN
  if (snapped === 0 && !allowZero) snapped = GRID_HALF_IN
  snapped = Math.min(max, Math.max(min, snapped))
  return Math.round(snapped * 100) / 100
}

export function snapToGrid(value, origin = 0, step = GRID_HALF_IN) {
  const n = Number(value)
  if (!Number.isFinite(n)) return origin
  return origin + Math.round((n - origin) / step) * step
}

export function frameOffsetInTrim(alignY, frameH, trimH) {
  const extra = Math.max(0, (Number(trimH) || 0) - (Number(frameH) || 0))
  if (alignY === 'top') return 0
  if (alignY === 'bottom') return extra
  return extra / 2
}

export function placeFrameInTrim(alignY, frameH, trimH, alignMode) {
  const raw = frameOffsetInTrim(alignY, frameH, trimH)
  if (alignMode !== 'grid') return raw
  const snapped = snapToGrid(raw, 0, GRID_HALF_IN)
  const extra = Math.max(0, (Number(trimH) || 0) - (Number(frameH) || 0))
  return Math.min(extra, Math.max(0, snapped))
}

export function gridLinesIn(start, end, step = GRID_PITCH_IN) {
  const lines = []
  if (!(end > start) || step <= 0) return lines
  const first = Math.ceil((start - 1e-6) / step) * step
  for (let v = first; v <= end + 1e-6; v += step) {
    lines.push(Math.round(v * 1000) / 1000)
  }
  return lines
}
