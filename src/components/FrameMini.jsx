import { cutPolygonPoints } from '../lib/composition.js'

function Svg({ viewBox, children, className = '' }) {
  return (
    <svg
      aria-hidden="true"
      viewBox={viewBox}
      className={`shrink-0 ${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  )
}

// True-proportion rect for an aspect preset: w/h are the preset ratio.
export function AspectMini({ w, h }) {
  const scale = Math.min(44 / w, 26 / h)
  const rw = w * scale
  const rh = h * scale
  return (
    <Svg viewBox="0 0 48 32" className="w-11 h-7">
      <rect x={(48 - rw) / 2} y={(32 - rh) / 2} width={rw} height={rh} />
    </Svg>
  )
}

// Dashed freeform frame for aspect "Off".
export function FreeformMini() {
  return (
    <Svg viewBox="0 0 48 32" className="w-11 h-7">
      <rect
        x={7}
        y={5}
        width={34}
        height={22}
        strokeDasharray="3 2.5"
      />
    </Svg>
  )
}

// Frame hugging a three-line text slug for Auto-Sizing.
export function HugMini() {
  return (
    <Svg viewBox="0 0 48 32" className="w-11 h-7">
      <rect x={6} y={5} width={36} height={22} />
      <g stroke="none" fill="currentColor">
        <rect x={11} y={9} width={26} height={3.4} />
        <rect x={11} y={14.5} width={18} height={3.4} />
        <rect x={11} y={20} width={22} height={3.4} />
      </g>
    </Svg>
  )
}

// Corner modes with deliberately exaggerated corner size so cut vs round
// reads at thumbnail scale. Cut geometry reuses cutPolygonPoints.
export function CornerMini({ mode }) {
  if (mode === 'round') {
    return (
      <Svg viewBox="0 0 40 28" className="w-9 h-7">
        <rect x={8} y={4} width={24} height={20} rx={7} />
      </Svg>
    )
  }
  if (mode === 'cut') {
    const points = cutPolygonPoints(24, 20, 7)
      .map(([x, y]) => `${x + 8},${y + 4}`)
      .join(' ')
    return (
      <Svg viewBox="0 0 40 28" className="w-9 h-7">
        <polygon points={points} />
      </Svg>
    )
  }
  return (
    <Svg viewBox="0 0 40 28" className="w-9 h-7">
      <rect x={8} y={4} width={24} height={20} />
    </Svg>
  )
}

// Frame with an alignment marker at the left, center, or right edge.
export function AlignMini({ dir }) {
  const x = dir === 'left' ? 13 : dir === 'right' ? 27 : 20
  return (
    <Svg viewBox="0 0 40 28" className="w-9 h-7">
      <rect x={9} y={4} width={22} height={20} opacity={0.55} />
      <line x1={x} y1={7} x2={x} y2={21} strokeWidth={2.5} />
    </Svg>
  )
}

// Sheet outline with the frame block placed top, center, or bottom.
export function SheetMini({ dir }) {
  const y = dir === 'top' ? 5 : dir === 'bottom' ? 17 : 11
  return (
    <Svg viewBox="0 0 40 28" className="w-9 h-7">
      <rect x={12} y={2} width={16} height={24} opacity={0.55} />
      <rect x={15} y={y} width={10} height={6} stroke="none" fill="currentColor" />
    </Svg>
  )
}

// Frame whose shaded bands thicken with the live padding value (0..1"+ scale).
export function PaddingMini({ value }) {
  const pad = Math.min(1, Math.max(0, Number(value) || 0))
  const t = 1.5 + pad * 4
  return (
    <Svg viewBox="0 0 40 28" className="w-9 h-7">
      <rect x={6} y={3} width={28} height={22} stroke="none" fill="currentColor" opacity={0.18} />
      <rect x={6} y={3} width={28} height={22} />
      <rect x={6 + t} y={3 + t} width={28 - t * 2} height={22 - t * 2} />
    </Svg>
  )
}
