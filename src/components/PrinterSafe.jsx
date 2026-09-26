import { MARGIN_PRESETS, detectPreset } from '../lib/layout.js'
import { FieldLabel } from './FieldLabel.jsx'
import { MarginIcon, OverlapIcon, PrinterIcon } from './icons.jsx'

const PRESET_BUTTONS = [
  { id: 'laser', label: 'Laser', sub: '.25"' },
  { id: 'inkjet', label: 'Inkjet', sub: '.50"' },
  { id: 'minimal', label: 'Minimal', sub: '.125"' },
  { id: 'custom', label: 'Custom', sub: 'Edit' },
]

export function PrinterSafe({ margins, overlap, onChange }) {
  const active = detectPreset(margins)

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[11px] tracking-[0.14em] text-[#E3FF33] uppercase flex items-center gap-1.5">
          <PrinterIcon />
          02 / Printer Safe
        </span>
        <span className="w-6 h-px bg-[#E3FF33]/50" />
      </div>
      <div className="bg-[#08080A] border border-[#43434E] rounded-[4px] p-3 mb-4">
        <p className="font-mono text-[11px] leading-[1.5] text-[#7A7A80]">
          Printers can&apos;t print to the edge. This tool lays out type{' '}
          <span className="text-[#F0F0F2]">INSIDE</span> your printable area, not to the paper
          edge. You trim on the dashed line and tape sheets edge-to-edge.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-1.5 mb-4">
        {PRESET_BUTTONS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => onChange({ margins: { ...MARGIN_PRESETS[preset.id] } })}
            className={`h-[44px] rounded-[4px] border px-3 text-left transition-colors ${
              active === preset.id
                ? 'bg-[#E3FF33] border-[#E3FF33] text-black'
                : 'bg-[#26262E] border-[#43434E] text-[#7A7A80] hover:border-[#5E5E69] hover:text-[#F0F0F2]'
            }`}
          >
            <div className="font-mono text-[11px] font-bold tracking-[0.08em] uppercase leading-none">
              {preset.label}
            </div>
            <div
              className={`font-mono text-[10px] tracking-[0.06em] mt-0.5 ${
                active === preset.id ? 'text-black/70' : 'text-[#5A5A60]'
              }`}
            >
              {preset.sub}
            </div>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {['top', 'bottom', 'left', 'right'].map((side) => (
          <div key={side} className="space-y-1.5">
            <FieldLabel icon={<MarginIcon direction={side} />}>{side}</FieldLabel>
            <div className="relative">
              <input
                type="number"
                min={0}
                max={1}
                step={0.05}
                value={margins[side]}
                onChange={(e) => {
                  const next = Math.min(1, Math.max(0, parseFloat(e.target.value) || 0))
                  onChange({ margins: { ...margins, [side]: next } })
                }}
                className="w-full bg-[#08080A] border border-[#43434E] rounded-[4px] h-9 px-2.5 pr-7 font-mono text-[12px] text-[#F0F0F2] focus:outline-none focus:border-[#E3FF33]/60"
              />
              <span className="absolute right-2 top-1/2 -translate-y-1/2 font-mono text-[10px] text-[#5A5A60]">
                &quot;
              </span>
            </div>
          </div>
        ))}
      </div>
      <div className="mt-5">
        <FieldLabel
          icon={<OverlapIcon />}
          value={
            <span className="font-mono text-[11px] px-1.5 py-0.5 bg-[#E3FF33] text-black rounded-[3px] font-bold">
              {overlap.toFixed(2)}"
            </span>
          }
        >
          Overlap for Tape
        </FieldLabel>
        <input
          type="range"
          min={0}
          max={0.5}
          step={0.05}
          value={overlap}
          onChange={(e) => onChange({ overlap: parseFloat(e.target.value) })}
          className="w-full"
        />
        <div className="flex justify-between mt-1 font-mono text-[8px] text-[#5A5A60]">
          <span>0&quot; no overlap</span>
          <span>0.5&quot; max</span>
        </div>
      </div>
    </div>
  )
}
