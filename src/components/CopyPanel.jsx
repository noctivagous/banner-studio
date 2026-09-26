import { FONTS, glyphMaxInches } from '../lib/layout.js'
import { FieldLabel } from './FieldLabel.jsx'
import { Toggle } from './Toggle.jsx'

export function CopyPanel({
  copy,
  font,
  fontId,
  glyphHeight,
  lineHeight,
  letterSpacing,
  transform,
  fill,
  strokeOn,
  strokeWidth,
  strokeColor,
  align,
  printableHeight,
  onChange,
}) {
  const glyphMax = glyphMaxInches(printableHeight)

  return (
    <div className="w-full xl:w-[340px] bg-[#121214] xl:border-r border-b xl:border-b-0 border-[#43434E] overflow-y-auto shrink-0 flex flex-col">
      <div className="p-5 space-y-7">
        <div>
          <div className="flex items-center justify-between mb-3">
            <span className="font-mono text-[11px] tracking-[0.14em] text-[#E3FF33] uppercase">
              01 / Copy
            </span>
            <span className="font-mono text-[9px] tracking-[0.12em] text-[#7A7A80] uppercase">
              {copy.length} chars
            </span>
          </div>
          <div className="relative group">
            <textarea
              value={copy}
              onChange={(e) => onChange({ copy: e.target.value })}
              placeholder="TYPE BANNER TEXT"
              spellCheck={false}
              className="w-full bg-[#08080A] border border-[#43434E] rounded-[4px] p-4 pr-3 text-[28px] leading-[0.9] tracking-[-0.01em] text-white placeholder:text-[#5A5A60] resize-none focus:outline-none focus:border-[#E3FF33]/60 min-h-[132px] transition-colors"
              style={{ fontFamily: `"${font.family}", Impact, sans-serif`, fontWeight: font.weight }}
            />
            <div className="absolute bottom-2 right-2 px-1.5 py-0.5 bg-[#26262E] border border-[#43434E] rounded-[3px] font-mono text-[8px] tracking-[0.1em] text-[#7A7A80] uppercase pointer-events-none">
              Live
            </div>
          </div>

          <div className="mt-4 space-y-4">
            <div>
              <FieldLabel>Font Family</FieldLabel>
              <div className="relative">
                <select
                  value={fontId}
                  onChange={(e) => onChange({ fontId: e.target.value })}
                  className="w-full bg-[#08080A] border border-[#43434E] rounded-[4px] px-3 py-2.5 text-[13px] text-[#F0F0F2] focus:outline-none focus:border-[#E3FF33]/60 appearance-none"
                  style={{ fontFamily: `"${font.family}", Impact, sans-serif` }}
                >
                  {FONTS.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.label}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-[#7A7A80] text-[10px]">
                  ▼
                </div>
              </div>
            </div>

            <div>
              <FieldLabel
                value={
                  <span className="font-mono text-[11px] px-1.5 py-0.5 bg-[#26262E] border border-[#43434E] rounded-[3px] text-[#F0F0F2]">
                    {glyphHeight.toFixed(1)}"
                  </span>
                }
              >
                Glyph Height
              </FieldLabel>
              <input
                type="range"
                min={0.8}
                max={glyphMax}
                step={0.1}
                value={glyphHeight}
                onChange={(e) => onChange({ glyphHeight: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between mt-1">
                <span className="font-mono text-[8px] text-[#7A7A80]">0.8"</span>
                <span className="font-mono text-[8px] text-[#7A7A80]">
                  {Math.min(7, printableHeight).toFixed(1)}" max
                </span>
              </div>
            </div>

            <div>
              <FieldLabel
                value={
                  <span className="font-mono text-[11px] px-1.5 py-0.5 bg-[#26262E] border border-[#43434E] rounded-[3px] text-[#F0F0F2]">
                    {lineHeight.toFixed(2)}
                  </span>
                }
              >
                Line Height
              </FieldLabel>
              <input
                type="range"
                min={0.6}
                max={1.8}
                step={0.05}
                value={lineHeight}
                onChange={(e) => onChange({ lineHeight: parseFloat(e.target.value) })}
                className="w-full"
              />
              <div className="flex justify-between mt-1">
                <span className="font-mono text-[8px] text-[#7A7A80]">0.60</span>
                <span className="font-mono text-[8px] text-[#7A7A80]">1.80</span>
              </div>
            </div>

            <div>
              <FieldLabel
                value={
                  <span className="font-mono text-[11px] text-[#F0F0F2]">
                    {letterSpacing > 0 ? '+' : ''}
                    {letterSpacing.toFixed(2)}em
                  </span>
                }
              >
                Letter Spacing
              </FieldLabel>
              <input
                type="range"
                min={-0.05}
                max={0.3}
                step={0.01}
                value={letterSpacing}
                onChange={(e) => onChange({ letterSpacing: parseFloat(e.target.value) })}
                className="w-full"
              />
            </div>

            <div>
              <FieldLabel>Transform</FieldLabel>
              <div className="grid grid-cols-3 gap-1.5">
                {['uppercase', 'lowercase', 'asIs'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => onChange({ transform: mode })}
                    className={`h-8 rounded-[4px] border text-[11px] font-mono uppercase tracking-[0.08em] transition-all ${
                      transform === mode
                        ? 'bg-[#E3FF33] text-black border-[#E3FF33] font-bold'
                        : 'bg-[#26262E] text-[#7A7A80] border-[#43434E] hover:border-[#5E5E69] hover:text-[#F0F0F2]'
                    }`}
                  >
                    {mode === 'asIs' ? 'As Is' : mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <FieldLabel>Fill</FieldLabel>
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8 rounded-[4px] overflow-hidden border border-[#43434E] shrink-0">
                    <input
                      type="color"
                      value={fill}
                      onChange={(e) => onChange({ fill: e.target.value })}
                      className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                    />
                  </div>
                  <div className="flex gap-1">
                    {['#000000', '#FFFFFF'].map((swatch) => (
                      <button
                        key={swatch}
                        type="button"
                        onClick={() => onChange({ fill: swatch })}
                        className={`w-8 h-8 rounded-[4px] border text-[10px] font-mono ${
                          fill === swatch ? 'border-[#E3FF33]' : 'border-[#43434E]'
                        }`}
                        style={{
                          background: swatch,
                          color: swatch === '#000000' ? '#fff' : '#000',
                        }}
                      >
                        {swatch === '#000000' ? 'K' : 'W'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <FieldLabel>Align</FieldLabel>
                <div className="grid grid-cols-3 gap-1">
                  {['left', 'center', 'right'].map((dir) => (
                    <button
                      key={dir}
                      type="button"
                      onClick={() => onChange({ align: dir })}
                      className={`h-8 rounded-[4px] border text-[12px] transition-colors ${
                        align === dir
                          ? 'bg-[#F0F0F2] text-black border-[#F0F0F2]'
                          : 'bg-[#26262E] text-[#7A7A80] border-[#43434E] hover:text-white'
                      }`}
                    >
                      {dir === 'left' ? '◧' : dir === 'center' ? '⬌' : '◨'}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="pt-1">
              <FieldLabel
                value={
                  <Toggle
                    on={strokeOn}
                    onToggle={() => onChange({ strokeOn: !strokeOn })}
                    offKnob="bg-[#7A7A80]"
                  />
                }
              >
                Stroke
              </FieldLabel>
              {strokeOn && (
                <div className="space-y-3 p-3 bg-[#08080A] border border-[#43434E] rounded-[4px]">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span className="font-mono text-[10px] text-[#7A7A80] uppercase">Width</span>
                      <span className="font-mono text-[10px] text-[#F0F0F2]">
                        {strokeWidth.toFixed(2)}"
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={0.12}
                      step={0.01}
                      value={strokeWidth}
                      onChange={(e) => onChange({ strokeWidth: parseFloat(e.target.value) })}
                      className="w-full"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-[#7A7A80] uppercase">Color</span>
                    <div className="relative w-6 h-6 rounded-[3px] overflow-hidden border border-[#43434E]">
                      <input
                        type="color"
                        value={strokeColor}
                        onChange={(e) => onChange({ strokeColor: e.target.value })}
                        className="absolute inset-0 w-[200%] h-[200%] -translate-x-1/4 -translate-y-1/4 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="mt-auto p-5 pt-4 border-t border-[#43434E] bg-[#08080A]/50">
        <p className="font-mono text-[10px] leading-[1.5] tracking-[0.02em] text-[#5A5A60]">
          Built for real printers. No edge-to-edge assumptions. Trim on lime, tape on yellow.
        </p>
      </div>
    </div>
  )
}
