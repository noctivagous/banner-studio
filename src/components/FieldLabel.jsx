export function FieldLabel({ children, value, icon }) {
  return (
    <div className="flex items-center gap-2.5 mb-2">
      <span className="flex items-center gap-1.5 shrink-0 text-[#7A7A80]">
        {icon}
        <span className="font-mono text-[11px] tracking-[0.1em] uppercase">{children}</span>
      </span>
      <span aria-hidden="true" className="flex-1 h-px bg-[#43434E]/50" />
      {value}
    </div>
  )
}
