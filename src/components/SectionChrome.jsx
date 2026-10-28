export function SectionSpine({ label, sub, className = '' }) {
  return (
    <div
      aria-hidden="true"
      className={`flex-none w-[22px] self-stretch flex flex-col items-center justify-between py-3 border-r border-black bg-black/40 shadow-[inset_-1px_0_0_rgba(255,255,255,0.05)] ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-[#E3FF33]" />
      <span
        className="font-stencil text-[10px] tracking-[0.28em] text-[#9A9AA2] uppercase whitespace-nowrap"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
      >
        {label}
      </span>
      <span className="font-mono text-[8px] tracking-[0.2em] text-[#5A5A60] uppercase whitespace-nowrap"
        style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
      >
        {sub}
      </span>
    </div>
  )
}

export function ZoneHeader({ index, title, icon, meta }) {
  return (
    <div className="flex items-center gap-2.5 mb-3">
      <span className="inline-flex items-center gap-1.5 shrink-0 pl-1.5 pr-2 py-1 rounded-[4px] bg-[#E3FF33] text-black">
        {icon}
        <span className="font-stencil text-[11px] tracking-[0.12em] uppercase leading-none">
          {index}
        </span>
      </span>
      <span className="font-stencil text-[12px] tracking-[0.14em] text-[#F0F0F2] uppercase">
        {title}
      </span>
      <span aria-hidden="true" className="flex-1 h-px bg-black shadow-[0_1px_0_rgba(255,255,255,0.05)]" />
      {meta}
    </div>
  )
}
