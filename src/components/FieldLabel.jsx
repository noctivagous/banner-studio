export function FieldLabel({ children, value }) {
  return (
    <div className="flex items-center gap-2.5 mb-2">
      <span className="font-mono text-[11px] tracking-[0.1em] text-[#7A7A80] uppercase shrink-0">
        {children}
      </span>
      <span aria-hidden="true" className="flex-1 h-px bg-[#43434E]/50" />
      {value}
    </div>
  )
}
