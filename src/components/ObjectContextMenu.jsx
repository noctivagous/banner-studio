import { useEffect, useLayoutEffect, useRef, useState } from 'react'

const itemClass =
  'w-full text-left px-2.5 py-2 rounded-[3px] font-mono text-[11px] tracking-[0.08em] text-[#F0F0F2] uppercase hover:bg-[#26262E] disabled:opacity-35 disabled:hover:bg-transparent'

export function ObjectContextMenu({ x, y, actions, onClose }) {
  const ref = useRef(null)
  const [box, setBox] = useState({ top: y, left: x })

  useLayoutEffect(() => {
    const node = ref.current
    if (!node) return
    const width = node.offsetWidth
    const height = node.offsetHeight
    const pad = 8
    setBox({
      top: Math.min(y, window.innerHeight - height - pad),
      left: Math.min(x, window.innerWidth - width - pad),
    })
  }, [x, y, actions])

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.()
    }
    const onDown = (event) => {
      if (ref.current?.contains(event.target)) return
      onClose?.()
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [onClose])

  if (!actions?.length) return null

  return (
    <div
      ref={ref}
      role="menu"
      aria-label="Object actions"
      className="fixed z-[80] min-w-[200px] rounded-[4px] border border-[#43434E] bg-[#121214] p-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)]"
      style={{ top: box.top, left: box.left }}
    >
      {actions.map((action) =>
        action.separator ? (
          <div key={action.id} aria-hidden="true" className="h-px bg-[#43434E] my-1" />
        ) : (
          <button
            key={action.id}
            type="button"
            role="menuitem"
            disabled={action.disabled}
            onClick={() => {
              action.run?.()
              onClose?.()
            }}
            className={itemClass}
          >
            {action.label}
          </button>
        ),
      )}
    </div>
  )
}
