function Base({ children, size = 12 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.3}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

export function CopyIcon() {
  return (
    <Base>
      <path d="M6 1.8v8.4M4.4 1.8h3.2M4.4 10.2h3.2" />
    </Base>
  )
}

export function FontIcon() {
  return (
    <Base>
      <path d="M2.6 9.8 6 2.2l3.4 7.6M3.9 7.4h4.2" />
    </Base>
  )
}

export function GlyphHeightIcon() {
  return (
    <Base>
      <path d="M6 1.6v8.8M4 3.4l2-1.8 2 1.8M4 8.6l2 1.8 2-1.8" />
    </Base>
  )
}

export function LineHeightIcon() {
  return (
    <Base>
      <path d="M1.5 3.4h5M1.5 8.6h5M9.6 1.8v8.4M8.4 3l1.2-1.2L10.8 3M8.4 9l1.2 1.2L10.8 9" />
    </Base>
  )
}

export function LetterSpacingIcon() {
  return (
    <Base>
      <path d="M2.4 3v6M9.6 3v6M4 6h4M4.9 4.9 4 6l.9 1.1M7.1 4.9 8 6l-.9 1.1" />
    </Base>
  )
}

export function TransformIcon() {
  return (
    <Base>
      <path d="M1.8 4h6.4M6.8 2.6 8.2 4 6.8 5.4M10.2 8H3.8M5.2 6.6 3.8 8l1.4 1.4" />
    </Base>
  )
}

export function FillIcon() {
  return (
    <Base>
      <path d="M6 1.6s3.7 4.3 3.7 6.5a3.7 3.7 0 0 1-7.4 0C2.3 5.9 6 1.6 6 1.6Z" />
    </Base>
  )
}

export function AlignIcon() {
  return (
    <Base>
      <path d="M1.5 2.6h9M1.5 6h5.5M1.5 9.4h9" />
    </Base>
  )
}

export function StrokeIcon() {
  return (
    <Base>
      <rect x="2.2" y="2.2" width="7.6" height="7.6" rx="1" strokeWidth={2} />
    </Base>
  )
}

export function PrinterIcon() {
  return (
    <Base>
      <path d="M3.5 4.2V1.6h5v2.6" />
      <rect x="1.5" y="4.2" width="9" height="4.6" rx="1" />
      <path d="M3.5 8.8v1.6h5V8.8" />
      <circle cx="9.2" cy="6" r="0.5" fill="currentColor" stroke="none" />
    </Base>
  )
}

const MARGIN_ANGLES = { top: 0, right: 90, bottom: 180, left: 270 }

export function MarginIcon({ direction = 'top' }) {
  return (
    <Base>
      <g transform={`rotate(${MARGIN_ANGLES[direction] ?? 0} 6 6)`}>
        <path d="M1.5 2.2h9" />
        <path d="M6 10.2V5M4.6 6.4 6 5l1.4 1.4" />
      </g>
    </Base>
  )
}

export function OverlapIcon() {
  return (
    <Base>
      <path d="m6 1.7 4.6 2.3L6 6.3 1.4 4 6 1.7Z" />
      <path d="m1.4 6.4 4.6 2.3 4.6-2.3" />
      <path d="m1.4 8.6 4.6 2.3 4.6-2.3" />
    </Base>
  )
}

export function LandscapeIcon() {
  return (
    <Base>
      <rect x="1.5" y="3" width="9" height="6" rx="1" />
    </Base>
  )
}

export function PortraitIcon() {
  return (
    <Base>
      <rect x="3" y="1.5" width="6" height="9" rx="1" />
    </Base>
  )
}

export function OutputIcon() {
  return (
    <Base>
      <path d="M3 1.5h3.8L9 3.7v6.8H3V1.5Z" />
      <path d="M6.8 1.5v2.2H9" />
      <path d="M4.5 6.4h3M4.5 8.4h3" />
    </Base>
  )
}
