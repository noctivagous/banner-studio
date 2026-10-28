export function Toggle({ on, onToggle, offKnob = 'bg-[#7A7A80]' }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-[36px] h-[20px] rounded-[6px] border flex items-center px-0.5 transition-colors ${
        on
          ? 'bg-[#E3FF33] border-[#E3FF33]'
          : 'bg-[#3a3a44] border-black shadow-[inset_0_1px_3px_rgba(0,0,0,0.6),0_1px_0_rgba(255,255,255,0.06)]'
      }`}
      aria-pressed={on}
    >
      <div
        className={`w-3 h-3 rounded-[3px] transition-all ${
          on ? 'translate-x-[16px] bg-black' : `translate-x-0 ${offKnob}`
        }`}
      />
    </button>
  )
}
