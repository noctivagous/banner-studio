import { useState } from 'react'
import { FieldLabel } from './FieldLabel.jsx'

/* Pro disclosure section: accordion triangle + label header with a
   collapsible body. Each section owns its open state; default open
   preserves the current fully-expanded layout. */
export function ParamSection({ icon, title, value, defaultOpen = true, children }) {
  const [open, setOpen] = useState(defaultOpen)
  const label = typeof title === 'string' ? title : 'section'
  return (
    <div>
      <div className="flex items-start gap-1">
        <button
          type="button"
          aria-expanded={open}
          aria-label={`${open ? 'Collapse' : 'Expand'} ${label}`}
          title={`${open ? 'Collapse' : 'Expand'} ${label}`}
          onClick={() => setOpen((o) => !o)}
          className="w-4 h-4 mt-[3px] shrink-0 rounded-[2px] flex items-center justify-center text-[#7A7A80] hover:text-[#F0F0F2] hover:bg-white/5 focus:outline-none focus-visible:outline focus-visible:outline-1 focus-visible:outline-[#E3FF33]/60"
        >
          <span
            aria-hidden="true"
            className={`text-[8px] leading-none transition-transform duration-100 ${open ? '' : '-rotate-90'}`}
          >
            ▼
          </span>
        </button>
        <div className="flex-1 min-w-0">
          <FieldLabel icon={icon} value={value}>
            {title}
          </FieldLabel>
        </div>
      </div>
      {open ? children : null}
    </div>
  )
}
