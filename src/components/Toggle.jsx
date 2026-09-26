export function Toggle({ on, onToggle, offKnob = 'bg-[#7A7A80]' }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={`w-[36px] h-[20px] rounded-[6px] border flex items-center px-0.5 transition-colors ${
        on ? 'bg-[#E3FF33] border-[#E3FF33]' : 'bg-[#26262E] border-[#43434E]'
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
