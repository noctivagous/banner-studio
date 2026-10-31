import { JOIN_ALIGN_RECUT, formatLength } from '../lib/layout.js'
import { formatSize } from '../lib/units.js'
import { PrintButton } from './PrintButton.jsx'
import { ParamSection } from './ParamSection.jsx'
import { ZoneHeader } from './SectionChrome.jsx'
import { Toggle } from './Toggle.jsx'
import { OutputIcon } from './icons.jsx'

export function Output({
  sheetCount,
  cols = 0,
  rows = 0,
  tile = false,
  assembledInches,
  assembledHeight = 0,
  trimW,
  trimH,
  contentW,
  contentH = 0,
  showTrim,
  showSafe,
  showTape,
  showNumbers,
  showCutMarks,
  onChange,
  onPrint,
  join = 'trim-tape',
  printMarks,
  pageLabel,
  unit = 'in',
}) {
  const alignRecut = join === JOIN_ALIGN_RECUT
  const toggles = [
    { label: 'Scissor edge guide', key: 'showTrim', value: showTrim, disabled: alignRecut },
    { label: 'Show Safe Area', key: 'showSafe', value: showSafe },
    { label: 'Show Tape Zones', key: 'showTape', value: showTape, disabled: alignRecut },
    { label: 'Show Sheet Numbers', key: 'showNumbers', value: showNumbers },
    { label: 'Show Cut Marks', key: 'showCutMarks', value: showCutMarks },
  ]

  return (
    <div>
      <ZoneHeader index="04" title="Output" icon={<OutputIcon />} />
      <div className="pro-group bg-[var(--ctl)] border rounded-[3px] p-3.5 space-y-2.5">
        <div className="flex justify-between items-center">
          <span className="font-mono text-[10px] tracking-[0.12em] text-[#A8A8B0] uppercase">
            # Sheets
          </span>
          <span className="font-mono text-[13px] font-bold text-[#F0F0F2]">
            {tile && sheetCount > 0 ? `${cols} × ${rows}` : sheetCount}
          </span>
        </div>
        <div className="h-px bg-black shadow-[0_1px_0_rgba(255,255,255,0.05)]" />
        <div className="space-y-1">
          <div className="flex justify-between">
            <span className="font-mono text-[10px] tracking-[0.12em] text-[#A8A8B0] uppercase">
              Assembled Length
            </span>
          </div>
          <div className="font-tech text-[13px] leading-[1.3] text-[#F0F0F2] break-all">
            {assembledInches > 0
              ? tile
                ? `${formatLength(assembledInches, unit)} × ${formatLength(assembledHeight, unit)}`
                : formatLength(assembledInches, unit)
              : '—'}
          </div>
        </div>
        <div className="h-px bg-black shadow-[0_1px_0_rgba(255,255,255,0.05)]" />
        <div className="flex justify-between">
          <span className="font-mono text-[10px] tracking-[0.12em] text-[#A8A8B0] uppercase">
            {tile ? 'Assembled Height' : 'Final Height'}
          </span>
          <span className="font-tech text-[12px] text-[#F0F0F2]">
            {formatLength(tile ? assembledHeight : trimH, unit)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-mono text-[10px] tracking-[0.12em] text-[#A8A8B0] uppercase">
            Trim / Sheet
          </span>
          <span className="font-tech text-[12px] text-[#F0F0F2]">
            {formatSize(trimW, trimH, unit)}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="font-mono text-[10px] tracking-[0.12em] text-[#A8A8B0] uppercase">
            Content / Sheet
          </span>
          <span className="font-mono text-[11px] text-[#A8A8B0]">
            {tile
              ? formatSize(contentW, contentH, unit)
              : `${formatLength(contentW, unit)} wide`}
          </span>
        </div>
      </div>

      <div aria-hidden="true" className="pro-divider mt-4 -mx-4" />
      <div className="mt-4 space-y-2.5">
        {toggles.map((item) => (
          <div key={item.key} className="flex items-center gap-3">
            <span className="font-mono text-[11px] tracking-[0.08em] text-[#7A7A80] uppercase shrink-0">
              {item.label}
            </span>
            <span aria-hidden="true" className="flex-1 h-px bg-black shadow-[0_1px_0_rgba(255,255,255,0.05)]" />
            <Toggle
              on={item.disabled ? false : item.value}
              disabled={item.disabled}
              onToggle={() => onChange({ [item.key]: !item.value })}
            />
          </div>
        ))}
      </div>

      <div className="pro-well mt-5 border rounded-[3px] p-3 flex gap-3 items-center">
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
            <span className="inline-block rotate-[270deg] scale-[1.2]">✂</span>
          </div>
        </div>
        <div>
          <div className="font-mono text-[10px] tracking-[0.12em] text-[#F0F0F2] uppercase">
            How to assemble
          </div>
          <div className="font-mono text-[10px] leading-[1.4] text-[#7A7A80] mt-1">
            {alignRecut ? (
              <>
                Match the blue crosses.
                <br />
                Cut both sheets on red.
              </>
            ) : (
              <>
                Trim on lime dashes.
                <br />
                Overlap the hatch, tape back.
              </>
            )}
            {tile && rows > 1 && (
              <>
                <br />
                Join each row, then stack the rows.
              </>
            )}
          </div>
        </div>
      </div>

      <PrintButton
        fullWidth
        disabled={sheetCount === 0}
        onPrint={onPrint}
        join={join}
        marks={printMarks}
        onChange={onChange}
      />
      <div className="mt-2 font-mono text-[9px] leading-[1.4] tracking-[0.06em] text-[#5A5A60] uppercase">
        {sheetCount} sheets • {pageLabel} • @page margins 0
      </div>
    </div>
  )
}
