const UNAVAILABLE = 'Not available yet'

function ModeGlyph({ children }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.3"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {children}
    </svg>
  )
}

function OneDIcon() {
  return (
    <ModeGlyph>
      <path d="M1.6 6h8.8" strokeLinecap="round" />
      <path d="M1.6 4.5v3M10.4 4.5v3" strokeLinecap="round" />
    </ModeGlyph>
  )
}

function HorizIcon() {
  return (
    <ModeGlyph>
      <rect x="1.2" y="3.5" width="9.6" height="5" rx="0.7" />
      <path d="M2.8 6h6.4" strokeLinecap="round" />
    </ModeGlyph>
  )
}

function VertIcon() {
  return (
    <ModeGlyph>
      <rect x="3.5" y="1.2" width="5" height="9.6" rx="0.7" />
      <path d="M6 2.8v6.4" strokeLinecap="round" />
    </ModeGlyph>
  )
}

function TileIcon() {
  return (
    <ModeGlyph>
      <rect x="1.3" y="1.3" width="4.1" height="4.1" rx="0.45" />
      <rect x="6.6" y="1.3" width="4.1" height="4.1" rx="0.45" />
      <rect x="1.3" y="6.6" width="4.1" height="4.1" rx="0.45" />
      <rect x="6.6" y="6.6" width="4.1" height="4.1" rx="0.45" />
    </ModeGlyph>
  )
}

function ModeButton({ pressed, disabled, onClick, icon, children, title }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      title={disabled ? UNAVAILABLE : title}
      onClick={onClick}
      className={`h-7 px-2 rounded-[3px] inline-flex items-center gap-1 font-mono text-[11px] tracking-[0.08em] uppercase leading-none transition-colors ${
        pressed
          ? 'bg-[#E3FF33] text-black font-bold'
          : disabled
            ? 'text-[#5E5E69] cursor-not-allowed'
            : 'text-[#7A7A80] hover:text-[#F0F0F2]'
      }`}
    >
      {icon}
      {children}
    </button>
  )
}

export function BannerModeControl({ value, onChange }) {
  return (
    <div
      role="group"
      aria-label="Banner layout"
      className="inline-flex h-8 items-center rounded-[4px] border border-black bg-[#050506] pl-1.5 pr-0.5 gap-0.5 shadow-[inset_0_2px_5px_rgba(0,0,0,0.65),0_1px_0_rgba(255,255,255,0.05)]"
    >
      <span className="hidden lg:inline-flex items-center gap-1 font-mono text-[11px] tracking-[0.12em] text-[#7A7A80] uppercase px-1.5">
        <OneDIcon />
        1D
      </span>
      <ModeButton
        pressed={value !== 'vert' && value !== 'tile'}
        onClick={() => onChange('horiz')}
        title="Horizontal banner"
        icon={<HorizIcon />}
      >
        Horiz.
      </ModeButton>
      <span title={UNAVAILABLE} className="inline-flex">
        <ModeButton disabled icon={<VertIcon />}>
          Vert
        </ModeButton>
      </span>
      <span className="w-px h-4 bg-black shadow-[1px_0_0_rgba(255,255,255,0.06)] mx-0.5" aria-hidden="true" />
      <ModeButton
        pressed={value === 'tile'}
        onClick={() => onChange('tile')}
        title="Tile the poster across rows and columns"
        icon={<TileIcon />}
      >
        Tile: 2D
      </ModeButton>
    </div>
  )
}
