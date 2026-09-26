import { formatLength } from '../lib/layout.js'
import { PrintButton } from './PrintButton.jsx'
import { Toggle } from './Toggle.jsx'
import { OutputIcon } from './icons.jsx'

export function Output({
  sheetCount,
  assembledInches,
  trimW,
  trimH,
  contentW,
  showTrim,
  showSafe,
  showTape,
  showNumbers,
  showCutMarks,
  onChange,
  onPrint,
  printMarks,
  pageLabel,
}) {
  const toggles = [
    { label: 'Show Trim Lines', key: 'showTrim', value: showTrim },
    { label: 'Show Safe Area', key: 'showSafe', value: showSafe },
    { label: 'Show Tape Zones', key: 'showTape', value: showTape },
    { label: 'Show Sheet Numbers', key: 'showNumbers', value: showNumbers },
    { label: 'Show Cut Marks', key: 'showCutMarks', value: showCutMarks },
  ]

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <span className="font-mono text-[11px] tracking-[0.14em] text-[#E3FF33] uppercase flex items-center gap-1.5">
          <OutputIcon />
          03 / Output
        </span>
      </div>
      <div className="bg-[#26262E] border border-[#43434E] rounded-[4px] p-3.5 space-y-2.5">
        <div className="flex justify-between items-center">
          <span className="font-mono text-[10px] tracking-[0.12em] text-[#7A7A80] uppercase">
            # Sheets
          </span>
          <span className="font-mono text-[13px] font-bold text-[#F0F0F2]">{sheetCount}</span>
        </div>
        <div className="h-px bg-[#43434E]" />
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="font-mono text-[10px] tracking-[0.12em] text-[#7A7A80] uppercase">
              Assembled Length
            </span>
          </div>
          <div className="font-mono text-[12px] leading-[1.3] text-[#F0F0F2] break-all">
            {assembledInches > 0 ? formatLength(assembledInches) : '—'}
          </div>
        </div>
        <div className="h-px bg-[#43434E]" />
        <div className="flex justify-between">
          <span className="font-mono text-[10px] tracking-[0.12em] text-[#7A7A80] uppercase">
            Final Height
          </span>
          <span className="font-mono text-[11px] text-[#F0F0F2]">{trimH.toFixed(2)}&quot;</span>
        </div>
        <div className="flex justify-between">
          <span className="font-mono text-[10px] tracking-[0.12em] text-[#7A7A80] uppercase">
            Trim / Sheet
          </span>
          <span className="font-mono text-[11px] text-[#F0F0F2]">
            {trimW.toFixed(2)}&quot; × {trimH.toFixed(2)}&quot;
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-mono text-[10px] tracking-[0.12em] text-[#7A7A80] uppercase">
            Content / Sheet
          </span>
          <span className="font-mono text-[11px] text-[#7A7A80]">{contentW.toFixed(2)}&quot; wide</span>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {toggles.map((item) => (
          <div key={item.key} className="flex items-center gap-3">
            <span className="font-mono text-[11px] tracking-[0.08em] text-[#7A7A80] uppercase shrink-0">
              {item.label}
            </span>
            <span aria-hidden="true" className="flex-1 h-px bg-[#43434E]/50" />
            <Toggle on={item.value} onToggle={() => onChange({ [item.key]: !item.value })} />
          </div>
        ))}
      </div>

      <div className="mt-5 bg-[#08080A] border border-[#43434E] rounded-[4px] p-3 flex gap-3 items-center">
        <div className="shrink-0 w-[72px] h-[48px] bg-white rounded-[2px] relative overflow-hidden border border-black/10">
          <div className="absolute inset-[6px] border border-dashed border-[#E3FF33]" />
          <div
            className="absolute right-[10px] top-[6px] bottom-[6px] w-[10px] border-l border-dashed border-black/40"
            style={{
              backgroundImage:
                'repeating-linear-gradient(45deg, rgba(0,0,0,0.3) 0 2px, transparent 2px 5px)',
            }}
          />
          <div className="absolute -left-1 top-1/2 -translate-y-1/2 w-4 h-4 bg-[#E3FF33] rounded-full flex items-center justify-center text-[9px]">
            ✂
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] tracking-[0.12em] text-[#F0F0F2] uppercase">
            How to assemble
          </div>
          <div className="font-mono text-[10px] leading-[1.4] text-[#7A7A80] mt-1">
            Trim on lime dashes.
            <br />
            Overlap the hatch, tape back.
          </div>
        </div>
      </div>

      <div className="mt-5 w-full rounded-[4px] border border-[#43434E] bg-[#08080A] p-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[10px] tracking-[0.12em] text-[#7A7A80] uppercase">
            Ready to print
          </span>
          <span className="font-mono text-[10px] tracking-[0.08em] text-[#E3FF33] uppercase">
            {sheetCount} sheets • {assembledInches > 0 ? formatLength(assembledInches) : '—'}
          </span>
        </div>
        <div className="mt-2 h-px bg-[#43434E]" />
        <PrintButton
          fullWidth
          disabled={sheetCount === 0}
          onPrint={onPrint}
          marks={printMarks}
          onChange={onChange}
        />
        <div className="mt-2 font-mono text-[9px] leading-[1.4] tracking-[0.06em] text-[#5A5A60] uppercase">
          Default is type only • {pageLabel} • @page margins 0
        </div>
      </div>
    </div>
  )
}
