export function SegmentControl({ value, options, onChange, ariaLabel, fill = false }) {
  return (
    <div
      role="group"
      aria-label={ariaLabel}
      className={`${fill ? 'flex w-full' : 'inline-flex'} h-7 items-center rounded-[3px] border border-black bg-[#050506] p-0.5 shadow-[inset_0_2px_5px_rgba(0,0,0,0.65),0_1px_0_rgba(255,255,255,0.05)]`}
    >
      {options.map((option) => {
        const selected = value === option.value
        return (
          <button
            key={option.value}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(option.value)}
            className={`${fill ? 'flex-1' : ''} h-6 px-2.5 rounded-[3px] font-mono text-[10px] tracking-[0.08em] uppercase transition-colors ${
              selected
                ? 'bg-[#E3FF33] text-black font-bold'
                : 'text-[#7A7A80] hover:text-[#F0F0F2]'
            }`}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
