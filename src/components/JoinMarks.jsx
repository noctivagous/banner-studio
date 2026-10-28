import {
  ALIGN_COLOR,
  JOIN_ALIGN_RECUT,
  JOIN_EDGE,
  JOIN_OVERLAP_TAPE,
  RECUT_COLOR,
  alignRecutOffset,
  crossArm,
} from '../lib/layout.js'

const JOIN_OPTIONS = [
  { value: JOIN_OVERLAP_TAPE, label: 'Overlap & tape' },
  { value: JOIN_EDGE, label: 'Edge to edge' },
  { value: JOIN_ALIGN_RECUT, label: 'Align & Recut' },
]

export function JoinSelect({ value, onChange, variant = 'header' }) {
  const header = variant === 'header'
  const current = JOIN_OPTIONS.some((option) => option.value === value)
    ? value
    : JOIN_OVERLAP_TAPE
  return (
    <label className={`relative ${header ? '' : 'block'}`}>
      <span className="sr-only">Join</span>
      <select
        aria-label="Join"
        value={current}
        onChange={(event) => onChange(event.target.value)}
        className={
          header
            ? 'pro-bevel h-6 pl-2 pr-5 rounded-[3px] bg-[#26262E] border border-[#43434E] text-[9px] font-tech tracking-[0.12em] text-[#7A7A80] uppercase appearance-none focus:outline-none focus:border-[#E3FF33]/60'
            : 'w-full bg-[#08080A] border border-[#43434E] rounded-[3px] h-9 px-2.5 font-tech text-[13px] text-[#F0F0F2] focus:outline-none focus:border-[#E3FF33]/60 appearance-none shadow-[inset_0_2px_5px_rgba(0,0,0,0.6)]'
        }
      >
        {JOIN_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <span
        className={`absolute pointer-events-none text-[#7A7A80] ${
          header
            ? 'right-1.5 top-1/2 -translate-y-1/2 text-[8px]'
            : 'right-3 top-1/2 -translate-y-1/2 text-[10px]'
        }`}
      >
        ▼
      </span>
    </label>
  )
}

function lengthOf(inches, unit, scale) {
  if (unit === 'in') return `${inches}in`
  return `${inches * scale}px`
}

function MarkCross({ x, y, arm, color, unit, scale }) {
  if (!(arm > 0)) return null
  const size = arm * 2
  return (
    <div
      data-join-cross=""
      style={{
        position: 'absolute',
        left: lengthOf(x, unit, scale),
        top: lengthOf(y, unit, scale),
        width: lengthOf(size, unit, scale),
        height: lengthOf(size, unit, scale),
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
        zIndex: 6,
      }}
    >
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: 0,
          bottom: 0,
          width: '1px',
          background: color,
          transform: 'translateX(-50%)',
        }}
      />
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: 0,
          right: 0,
          height: '1px',
          background: color,
          transform: 'translateY(-50%)',
        }}
      />
    </div>
  )
}

function MarkLabel({ x, y, text, color, unit, scale, axis, role }) {
  const shift =
    axis === 'horizontal'
      ? role === 'cut'
        ? 'translate(-50%, calc(-100% - 2px))'
        : 'translate(-50%, 2px)'
      : role === 'cut'
        ? 'translate(calc(-100% - 3px), -50%)'
        : 'translate(3px, -50%)'
  return (
    <div
      style={{
        position: 'absolute',
        left: lengthOf(x, unit, scale),
        top: lengthOf(y, unit, scale),
        transform: shift,
        fontFamily: 'ui-monospace, monospace',
        fontSize: unit === 'in' ? '6pt' : `${(6 / 72) * scale}px`,
        letterSpacing: '0.08em',
        lineHeight: 1,
        color,
        zIndex: 6,
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  )
}

export function SheetJoinMarks({
  col,
  row,
  cols,
  rows,
  overlap,
  margins,
  trimW,
  trimH,
  pageW,
  pageH,
  scale = 1,
  unit = 'px',
}) {
  const shared = { overlap, scale, unit }
  return (
    <>
      {col > 0 && (
        <JoinMarks
          {...shared}
          axis="vertical"
          side="start"
          marginAlong={margins.left}
          trimAlong={trimW}
          marginCross={margins.top}
          marginCrossFar={margins.bottom}
          pageCross={pageH}
        />
      )}
      {col < cols - 1 && (
        <JoinMarks
          {...shared}
          axis="vertical"
          side="end"
          marginAlong={margins.left}
          trimAlong={trimW}
          marginCross={margins.top}
          marginCrossFar={margins.bottom}
          pageCross={pageH}
        />
      )}
      {row > 0 && (
        <JoinMarks
          {...shared}
          axis="horizontal"
          side="start"
          marginAlong={margins.top}
          trimAlong={trimH}
          marginCross={margins.left}
          marginCrossFar={margins.right}
          pageCross={pageW}
        />
      )}
      {row < rows - 1 && (
        <JoinMarks
          {...shared}
          axis="horizontal"
          side="end"
          marginAlong={margins.top}
          trimAlong={trimH}
          marginCross={margins.left}
          marginCrossFar={margins.right}
          pageCross={pageW}
        />
      )}
    </>
  )
}

// One seam on one sheet. `axis` `vertical` is a left/right join.
// `side` `end` is the outgoing edge (right or bottom of this sheet).
export function JoinMarks({
  axis = 'vertical',
  side = 'end',
  overlap,
  marginAlong,
  trimAlong,
  marginCross,
  marginCrossFar,
  pageCross,
  scale = 1,
  unit = 'px',
}) {
  const marks = alignRecutOffset(overlap, trimAlong, marginAlong, side)
  if (!marks) return null
  const vertical = axis === 'vertical'
  const armNear = crossArm(marginCross)
  const armFar = crossArm(marginCrossFar)
  const labelAt = marginCross > 0 ? marginCross / 2 : 0.04
  const farAt = pageCross - (marginCrossFar > 0 ? marginCrossFar / 2 : 0.04)
  const lineStyle = (along) =>
    vertical
      ? {
          position: 'absolute',
          left: lengthOf(along, unit, scale),
          top: 0,
          width: '1px',
          height: '100%',
          pointerEvents: 'none',
          zIndex: 5,
        }
      : {
          position: 'absolute',
          top: lengthOf(along, unit, scale),
          left: 0,
          height: '1px',
          width: '100%',
          pointerEvents: 'none',
          zIndex: 5,
        }

  const crossPoint = (along, cross) => (vertical ? { x: along, y: cross } : { x: cross, y: along })
  const near = crossPoint(marks.align, labelAt)
  const far = crossPoint(marks.align, farAt)
  const alignLabel = crossPoint(marks.align, labelAt)
  const cutLabel = crossPoint(marks.cut, labelAt)

  return (
    <>
      <div
        data-join-mark="align"
        data-join-axis={axis}
        data-join-side={side}
        title="Align on this line, then cut away the extra margin"
        style={{ ...lineStyle(marks.align), background: ALIGN_COLOR }}
      />
      <div
        data-join-mark="cut"
        data-join-axis={axis}
        data-join-side={side}
        title="Cut both sheets on this line"
        style={{ ...lineStyle(marks.cut), background: RECUT_COLOR }}
      />
      <MarkCross {...near} arm={armNear} color={ALIGN_COLOR} unit={unit} scale={scale} />
      <MarkCross {...far} arm={armFar} color={ALIGN_COLOR} unit={unit} scale={scale} />
      <MarkLabel
        {...alignLabel}
        text="ALIGN"
        color={ALIGN_COLOR}
        unit={unit}
        scale={scale}
        axis={axis}
        role="align"
      />
      <MarkLabel
        {...cutLabel}
        text="CUT"
        color={RECUT_COLOR}
        unit={unit}
        scale={scale}
        axis={axis}
        role="cut"
      />
    </>
  )
}
