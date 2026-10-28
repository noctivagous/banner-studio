const UNAVAILABLE = 'Not available yet'

function ModeButton({ pressed, disabled, onClick, children, title }) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      disabled={disabled}
      title={disabled ? UNAVAILABLE : title}
      onClick={onClick}
      className={`h-5 px-1.5 rounded-[3px] font-mono text-[9px] tracking-[0.08em] uppercase leading-none transition-colors ${
        pressed
          ? 'bg-[#E3FF33] text-black font-bold'
          : disabled
            ? 'text-[#5E5E69] cursor-not-allowed'
            : 'text-[#7A7A80] hover:text-[#F0F0F2]'
      }`}
    >
      {children}
    </button>
  )
}

export function BannerModeControl({ value, onChange }) {
  return (
    <div
      role="group"
      aria-label="Banner layout"
      className="inline-flex h-6 items-center rounded-[3px] border border-black bg-[#050506] pl-1 pr-0.5 py-0.5 gap-0.5 shadow-[inset_0_2px_5px_rgba(0,0,0,0.65),0_1px_0_rgba(255,255,255,0.05)]"
    >
      <span className="hidden lg:inline font-mono text-[8px] tracking-[0.12em] text-[#7A7A80] uppercase px-1">
        1D
      </span>
      <ModeButton
        pressed={value !== 'vert' && value !== 'tile'}
        onClick={() => onChange('horiz')}
        title="Horizontal banner"
      >
        Horiz.
      </ModeButton>
      <span title={UNAVAILABLE} className="inline-flex">
        <ModeButton disabled>Vert</ModeButton>
      </span>
      <span className="w-px h-3.5 bg-black shadow-[1px_0_0_rgba(255,255,255,0.06)] mx-0.5" aria-hidden="true" />
      <ModeButton
        pressed={value === 'tile'}
        onClick={() => onChange('tile')}
        title="Tile the poster across rows and columns"
      >
        Tile: 2D
      </ModeButton>
    </div>
  )
}
