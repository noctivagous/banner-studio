// PaperPreview: paper.js canvas renderer for the banner preview.
//
// Renders the same composition model as the DOM BannerComposition (frame,
// lines, glyph-stack layers) plus the sheet tiling (cards, rulers, trim,
// tape, cut marks), with direct manipulation: drag a line body to move,
// corner handle to resize, top handle to rotate. Single-select contract
// matches the DOM preview (onSelect/onPatchLine/onLivePatch/onLiveCommit).

import { useEffect, useRef } from 'react'
import paper from 'paper'
import {
  MIN_GLYPH_HEIGHT,
  MAX_GLYPH_HEIGHT,
  fontOf,
  lineText,
} from '../lib/composition.js'
import { placeFrameInTrim, snapToGrid } from '../lib/grid.js'
import {
  JOIN_ALIGN_RECUT,
  alignRecutOffset,
  coveredSpan,
  horizontalCutInches,
  joinDuplicates,
  overlapCutSlack,
  verticalCutInches,
} from '../lib/layout.js'
import { getEngineFont } from '../lib/typeEngine.js'

const LIME = '#E3FF33'
const INK = '#111111'

// Per-character x offsets so letter-spacing (tracking) renders exactly and
// matches engineLineWidthPx. Uses opentype advances + kerning when the engine
// font is cached, otherwise canvas per-char measurement.
function layoutChars(text, font, fontId, fontPx, trackingEm) {
  const tracking = (Number(trackingEm) || 0) * fontPx
  const engine = getEngineFont(fontId)
  if (engine) {
    try {
      const scale = fontPx / engine.unitsPerEm
      const glyphs = engine.stringToGlyphs(text)
      const xs = []
      let x = 0
      for (let i = 0; i < glyphs.length; i += 1) {
        xs.push(x)
        x += glyphs[i].advanceWidth * scale
        if (i < glyphs.length - 1) x += engine.getKerningValue(glyphs[i], glyphs[i + 1]) * scale
        if (i < glyphs.length - 1) x += tracking
      }
      return { xs, total: glyphs.length ? x - tracking : 0 }
    } catch {
      // fall through to canvas
    }
  }
  const ctx = document.createElement('canvas').getContext('2d')
  const xs = []
  let x = 0
  if (ctx) {
    ctx.font = `${font.weight} ${fontPx}px "${font.family}", Impact, sans-serif`
    for (let i = 0; i < text.length; i += 1) {
      xs.push(x)
      x += ctx.measureText(text[i]).width
      if (i < text.length - 1) x += tracking
    }
  }
  return { xs, total: text.length ? x - tracking : 0 }
}

function hex(color, alpha = 1) {
  const c = new paper.Color(color)
  c.alpha = alpha
  return c
}

export function PaperPreview(props) {
  const {
    sheets = [],
    cols = 0,
    rows = 0,
    tile = false,
    margins,
    overlap,
    pageW,
    pageH,
    trimW,
    trimH,
    contentW,
    contentH = 0,
    composition,
    measured,
    selection,
    onSelect,
    onPatchLine,
    onLivePatch,
    onLiveCommit,
    join = 'overlap-tape',
    showTrim = true,
    showSafe = true,
    showTape = true,
    showNumbers = true,
    showCutMarks = true,
    px,
    stacked,
    pitchX,
    pageTop,
    boardW,
    boardH,
    sheetW,
    sheetH,
    cardH,
    labelH,
    rulerH,
    editing,
    onEditStart,
    onChangeLine,
    onEditEnd,
    onEditCancel,
  } = props

  const canvasRef = useRef(null)
  const wrapRef = useRef(null)
  const scopeRef = useRef(null)
  const dragRef = useRef(null)
  const stateRef = useRef({})
  stateRef.current = {
    composition,
    measured,
    selection,
    onSelect,
    onPatchLine,
    onLivePatch,
    onLiveCommit,
    onEditStart,
    px,
  }

  const duplicateStrip = joinDuplicates(join) && overlap > 0
  const alignRecut = join === JOIN_ALIGN_RECUT
  const sliceW = duplicateStrip ? trimW : contentW
  const sliceH = tile && !duplicateStrip ? contentH : trimH

  // paper.js scene setup + redraw on every relevant change.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || boardW <= 0 || boardH <= 0) return
    if (!scopeRef.current) {
      scopeRef.current = new paper.PaperScope()
      scopeRef.current.setup(canvas)
      const tool = new scopeRef.current.Tool()
      tool.onMouseDown = (event) => {
        const s = stateRef.current
        const hit = scopeRef.current.project.hitTest(event.point, {
          fill: true,
          stroke: true,
          segments: true,
          tolerance: 6,
        })
        window.__paperHit = hit
          ? { type: hit.type, lineId: hit.item?.data?.lineId ?? null, kind: hit.item?.data?.kind ?? null }
          : null
        let node = hit?.item ?? null
        while (node && !node.data?.lineId && node.data?.kind !== 'frame' && !node.data?.sheet) {
          node = node.parent
        }
        if (!node || node.data?.sheet) {
          // Clicked empty board: select the frame container.
          s.onSelect?.({ kind: 'container', id: s.composition.container.id })
          return
        }
        const lineId = node.data?.lineId
        if (!lineId) {
          if (node.data?.kind === 'frame') s.onSelect?.({ kind: 'container', id: s.composition.container.id })
          return
        }
        const box = (s.measured?.lineBoxes ?? []).find((b) => b.id === lineId)
        if (!box) return
        s.onSelect?.({ kind: 'line', id: lineId })
        const kind = node.data?.handle ?? 'move'
        const place = box.line.place || { mode: 'snap', dxIn: 0, dyIn: 0 }
        let center = null
        let ancestor = node
        while (ancestor) {
          if (ancestor.data?.center) {
            center = ancestor.data.center
            break
          }
          ancestor = ancestor.parent
        }
        const startAng =
          kind === 'rotate' && center
            ? (Math.atan2(event.point.y - center.y, event.point.x - center.x) * 180) / Math.PI
            : null
        dragRef.current = {
          id: lineId,
          kind,
          startX: event.point.x,
          startY: event.point.y,
          center,
          startAng,
          autoX: box.x - (Number(place.dxIn) || 0),
          autoY: box.y - (Number(place.dyIn) || 0),
          baseDx: Number(place.dxIn) || 0,
          baseDy: Number(place.dyIn) || 0,
          baseH: Number(box.line.glyphHeight) || MIN_GLYPH_HEIGHT,
          baseDeg: Number(box.line.rotationDeg) || 0,
          snap: (place.mode || 'snap') !== 'free',
          moved: false,
        }
      }
      tool.onMouseDrag = (event) => {
        const s = stateRef.current
        const drag = dragRef.current
        const apply = s.onLivePatch ?? s.onPatchLine
        if (!drag || typeof apply !== 'function') return
        const dxPx = event.point.x - drag.startX
        const dyPx = event.point.y - drag.startY
        if (Math.abs(dxPx) + Math.abs(dyPx) > 3) drag.moved = true
        if (!drag.moved) return
        const scale = s.px
        const round2 = (n) => Math.round(n * 100) / 100
        if (drag.kind === 'resize') {
          const next = Math.min(
            MAX_GLYPH_HEIGHT,
            Math.max(MIN_GLYPH_HEIGHT, Math.round(((drag.baseH + dyPx / scale) / 0.5)) * 0.5),
          )
          apply(drag.id, { glyphHeight: Math.round(next * 100) / 100 })
          return
        }
        if (drag.kind === 'rotate') {
          const center = drag.center ?? event.point
          const ang = (Math.atan2(event.point.y - center.y, event.point.x - center.x) * 180) / Math.PI
          if (drag.startAng == null) {
            drag.startAng =
              (Math.atan2(drag.startY - center.y, drag.startX - center.x) * 180) / Math.PI
          }
          const next = drag.baseDeg + (ang - drag.startAng)
          const wrapped = ((next + 540) % 360) - 180
          apply(drag.id, { rotationDeg: Math.round(wrapped / 5) * 5 })
          return
        }
        let dx = drag.baseDx + dxPx / scale
        let dy = drag.baseDy + dyPx / scale
        if (drag.snap) {
          dx = snapToGrid(drag.autoX + dx) - drag.autoX
          dy = snapToGrid(drag.autoY + dy) - drag.autoY
        }
        apply(drag.id, {
          place: { mode: drag.snap ? 'snap' : 'free', dxIn: round2(dx), dyIn: round2(dy) },
        })
      }
      tool.onMouseUp = () => {
        const s = stateRef.current
        const drag = dragRef.current
        dragRef.current = null
        if (drag?.moved) s.onLiveCommit?.(drag.id)
      }
      // NOTE: paper.js emulates double-click only on item handlers, not on
      // the tool, so line groups get their own onDoubleClick in drawScene.
      scopeRef.current._tool = tool
      // Debug handle for automated hit-test verification.
      canvas._paperScope = scopeRef.current
    }
    const scope = scopeRef.current
    scope.view.viewSize = new scope.Size(Math.max(1, boardW), Math.max(1, boardH))
    drawScene(scope, { ...props, px, sliceW, sliceH, duplicateStrip, alignRecut })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    canvasRef,
    boardW,
    boardH,
    px,
    sheets,
    composition,
    measured,
    selection,
    join,
    overlap,
    showTrim,
    showSafe,
    showTape,
    showNumbers,
    showCutMarks,
    stacked,
  ])

  // Editing overlay position: anchor the HTML input to the line's board
  // position in the first sheet that shows it.
  const editBox = (() => {
    if (!editing || !measured) return null
    const box = measured.lineBoxes.find((b) => b.id === editing.lineId)
    if (!box || sheets.length === 0) return null
    const sheet = sheets[editing.hostId] ?? sheets[0]
    const pad = frameOffset(
      composition,
      measured,
      coveredSpan(cols, trimW, contentW, duplicateStrip) || sliceW,
      sliceH,
    )
    const left = sheet.col * pitchX + margins.left * px + pad.x * px + (box.x - sheet.originX) * px
    const top =
      (sheet.row === 0 ? rulerH : 0) +
      sheetTopOffset(sheet, pageTop) +
      margins.top * px +
      pad.y * px +
      (box.y - sheet.originY) * px
    return { left, top, width: Math.max(60, box.width * px), height: box.height * px, box }
  })()

  return (
    <div ref={wrapRef} className="relative" style={{ width: boardW, height: boardH }}>
      <canvas ref={canvasRef} style={{ width: boardW, height: boardH, display: 'block' }} />
      {editBox && (
        <input
          // eslint-disable-next-line jsx-a11y/no-autofocus
          autoFocus
          aria-label="Edit line"
          value={editBox.box.line.copy}
          spellCheck={false}
          onChange={(event) => onChangeLine?.(editBox.box.id, event.target.value.replace(/\n/g, ' '))}
          onBlur={() => onEditEnd?.()}
          onKeyDown={(event) => {
            if (event.key === 'Enter') event.currentTarget.blur()
            if (event.key === 'Escape') onEditCancel?.()
          }}
          style={{
            position: 'absolute',
            left: editBox.left,
            top: editBox.top,
            width: editBox.width,
            height: editBox.height,
            fontFamily: `"${fontOf(editBox.box.line).family}", Impact, sans-serif`,
            fontWeight: fontOf(editBox.box.line).weight,
            fontSize: editBox.box.line.glyphHeight * 0.9 * px,
            letterSpacing: `${editBox.box.line.letterSpacing}em`,
            color: INK,
            background: 'rgba(255,255,255,0.9)',
            outline: `2px solid ${LIME}`,
            border: 0,
          }}
        />
      )}
    </div>
  )
}

function sheetTopOffset(sheet, pageTop) {
  return typeof pageTop === 'function' ? pageTop(sheet.row) : 0
}

// Padding that centers the frame inside the sheet window, mirroring the
// DOM preview's placeFrameInTrim usage.
function frameOffset(composition, measured, frameBoxW, frameBoxH) {
  if (!measured || !(measured.width > 0)) return { x: 0, y: 0 }
  return {
    x: placeFrameInTrim(
      composition.container.layout.alignX,
      measured.width,
      frameBoxW,
      composition.alignMode,
    ),
    y: placeFrameInTrim(
      composition.container.layout.alignY,
      measured.height,
      frameBoxH,
      composition.alignMode,
    ),
  }
}

function drawSheetRuler(scope, gx, sliceOriginX, sliceW, px) {
  const group = new scope.Group()
  const first = Math.ceil(sliceOriginX - 1e-6)
  const last = Math.floor(sliceOriginX + sliceW + 1e-6)
  for (let inch = first; inch <= last; inch += 1) {
    const x = gx + (inch - sliceOriginX) * px
    const tick = new scope.Path.Line(new scope.Point(x, 18), new scope.Point(x, 28))
    tick.strokeColor = hex('#5E5E69')
    tick.strokeWidth = 1
    group.addChild(tick)
    if (inch % 6 === 0) {
      const label = new scope.PointText(new scope.Point(x + 3, 12))
      label.content = `${inch}"`
      label.fontSize = 9
      label.fillColor = hex('#7A7A80')
      label.fontFamily = 'monospace'
      group.addChild(label)
    }
  }
  return group
}

function drawLineGroup(scope, box, px, selected) {
  const line = box.line
  const font = fontOf(line)
  const text = lineText(line) || ' '
  const fontPx = line.glyphHeight * 0.9 * px
  const { xs } = layoutChars(text, font, line.fontId, fontPx, line.letterSpacing)
  const group = new scope.Group()
  group.data = { lineId: box.id }
  const visible = (line.layers || []).filter((layer) => layer?.visible !== false)
  for (const layer of visible) {
    const layerGroup = new scope.Group()
    const dx = (Number(layer.dxIn) || 0) * px
    const dy = (Number(layer.dyIn) || 0) * px
    for (let i = 0; i < text.length; i += 1) {
      const pt = new scope.PointText(new scope.Point((xs[i] ?? 0) + dx, dy))
      pt.content = text[i] === ' ' ? ' ' : text[i]
      pt.fontFamily = `"${font.family}", Impact, sans-serif`
      pt.fontWeight = font.weight
      pt.fontSize = fontPx
      pt.fillColor = hex(layer.fill || '#000000')
      if (layer.strokeOn) {
        pt.strokeColor = hex(layer.strokeColor || '#000000')
        pt.strokeWidth = (Number(layer.strokeWidthIn) || 0) * px
      }
      // Hatch overlays have no vector equivalent here yet: approximate with
      // a translucent second copy in the overlay color.
      if (layer.overlayOn) {
        pt.fillColor = hex(layer.overlayColor || layer.fill || '#000000', 0.55)
      }
      layerGroup.addChild(pt)
    }
    const skew = Number(layer.skewXDeg) || 0
    if (skew) {
      const tan = Math.tan((skew * Math.PI) / 180)
      layerGroup.transform(new scope.Matrix(1, 0, tan, 1, 0, 0))
    }
    group.addChild(layerGroup)
  }
  // Align the rendered glyph box top to the measured box top.
  const bounds = group.bounds
  group.position = group.position.subtract(new scope.Point(0, bounds.top - box.y * px))
  const rotation = Number(line.rotationDeg) || 0
  if (rotation) group.rotate(rotation, group.bounds.center)
  group.data.center = group.bounds.center.clone()
  if (selected) {
    const outline = new scope.Path.Rectangle(group.bounds.expand(4))
    outline.strokeColor = hex(LIME)
    outline.strokeWidth = 2
    outline.data = { lineId: box.id }
    group.addChild(outline)
    const resize = new scope.Path.Rectangle(
      new scope.Rectangle(group.bounds.bottomRight.subtract(new scope.Point(8, 8)), new scope.Size(16, 16)),
    )
    resize.fillColor = hex(LIME)
    resize.data = { lineId: box.id, handle: 'resize' }
    group.addChild(resize)
    const rotate = new scope.Path.Circle(group.bounds.topLeft, 8)
    rotate.fillColor = hex(LIME)
    rotate.data = { lineId: box.id, handle: 'rotate' }
    group.addChild(rotate)
  }
  return group
}

function drawScene(scope, ctx) {
  const {
    sheets,
    composition,
    measured,
    selection,
    margins,
    overlap,
    pageW,
    pageH,
    trimW,
    trimH,
    contentW,
    contentH,
    cols,
    tile,
    px,
    sliceW,
    sliceH,
    duplicateStrip,
    alignRecut,
    showTrim,
    showSafe,
    showTape,
    showNumbers,
    showCutMarks,
    stacked,
    pitchX,
    pageTop,
    rulerH,
    sheetW,
    sheetH,
    labelH,
  } = ctx
  scope.project.activeLayer.removeChildren()
  const root = new scope.Group()
  const frameBoxW = coveredSpan(cols, trimW, contentW, duplicateStrip) || sliceW
  const frameBoxH = sliceH
  const pad = frameOffset(composition, measured, frameBoxW, frameBoxH)

  sheets.forEach((sheet) => {
    const gx = sheet.col * pitchX
    const cardTop = sheetTopOffset(sheet, pageTop)
    const sy = cardTop + (sheet.row === 0 ? rulerH : 0)
    if (sheet.row === 0) {
      const ruler = drawSheetRuler(scope, gx + margins.left * px, sheet.originX, sliceW, px)
      ruler.position = ruler.position.add(new scope.Point(0, cardTop))
      root.addChild(ruler)
    }
    const card = new scope.Path.Rectangle(
      new scope.Rectangle(gx, sy, sheetW, sheetH),
      new scope.Size(2, 2),
    )
    card.fillColor = hex('#FFFFFF')
    card.data = { sheet: sheet.index }
    root.addChild(card)
    if (showSafe) {
      const safe = hex('#000000', 0.08)
      const top = new scope.Path.Rectangle(new scope.Rectangle(gx, sy, sheetW, margins.top * px))
      top.fillColor = safe
      const bottom = new scope.Path.Rectangle(
        new scope.Rectangle(gx, sy + (margins.top + trimH) * px, sheetW, margins.bottom * px),
      )
      bottom.fillColor = safe
      const left = new scope.Path.Rectangle(
        new scope.Rectangle(gx, sy + margins.top * px, margins.left * px, trimH * px),
      )
      left.fillColor = safe
      const right = new scope.Path.Rectangle(
        new scope.Rectangle(
          gx + (margins.left + trimW) * px,
          sy + margins.top * px,
          margins.right * px,
          trimH * px,
        ),
      )
      right.fillColor = safe
      root.addChild(top, bottom, left, right)
    }
    const wx = gx + margins.left * px
    const wy = sy + margins.top * px
    const ww = sliceW * px
    const wh = sliceH * px
    if (showTape && duplicateStrip && overlap > 0) {
      const tape = hex('#E3FF33', 0.35)
      if (sheet.col < cols - 1 || cols <= 1) {
        const zone = new scope.Path.Rectangle(
          new scope.Rectangle(wx + ww - overlap * px, wy, overlap * px, wh),
        )
        zone.fillColor = tape
        root.addChild(zone)
      }
      if (tile && sheet.row < (ctx.rows ?? 0) - 1) {
        const zone = new scope.Path.Rectangle(
          new scope.Rectangle(wx, wy + wh - overlap * px, ww, overlap * px),
        )
        zone.fillColor = tape
        root.addChild(zone)
      }
    }
    // Composition, clipped to the sheet window.
    if (measured && measured.width > 0) {
      const clip = new scope.Path.Rectangle(new scope.Rectangle(wx, wy, ww, wh))
      clip.clipMask = true
      const comp = new scope.Group([clip])
      comp.clipped = true
      const ox = wx + pad.x * px - sheet.originX * px
      const oy = wy + pad.y * px - sheet.originY * px
      const container = composition.container
      if (container.fillOn || container.strokeOn) {
        const frame = new scope.Path.Rectangle(
          new scope.Rectangle(ox, oy, measured.width * px, measured.height * px),
        )
        frame.fillColor = container.fillOn ? hex(container.fill) : null
        if (container.strokeOn) {
          frame.strokeColor = hex(container.strokeColor)
          frame.strokeWidth = (container.strokeWidthIn || 0) * px
        }
        frame.data = { kind: 'frame' }
        comp.addChild(frame)
      }
      if (composition.alignMode === 'grid') {
        for (let y = Math.ceil(sheet.originY); y <= sheet.originY + sliceH; y += 1) {
          const line = new scope.Path.Line(
            new scope.Point(wx, wy + (y - sheet.originY) * px),
            new scope.Point(wx + ww, wy + (y - sheet.originY) * px),
          )
          line.strokeColor = hex('#4d7c0f', 0.35)
          line.strokeWidth = 1
          comp.addChild(line)
        }
      }
      for (const box of measured.lineBoxes) {
        const g = drawLineGroup(scope, box, px, selection?.id === box.id)
        g.position = g.position.add(new scope.Point(ox, oy))
        g.onDoubleClick = () => {
          ctx.onSelect?.({ kind: 'line', id: box.id })
          ctx.onEditStart?.(box.id)
        }
        comp.addChild(g)
        if (showTrim && selection?.id === box.id) {
          const base = new scope.Path.Line(
            new scope.Point(ox + box.x * px, oy + box.baselineY * px),
            new scope.Point(ox + (box.x + box.width) * px, oy + box.baselineY * px),
          )
          base.strokeColor = hex(LIME)
          base.strokeWidth = 1
          comp.addChild(base)
        }
      }
      root.addChild(comp)
    }
    if (showTrim) {
      const trim = new scope.Path.Rectangle(new scope.Rectangle(wx, wy, ww, wh))
      trim.strokeColor = hex('#4d7c0f')
      trim.strokeWidth = 1.5
      root.addChild(trim)
    }
    if (showCutMarks) {
      const cuts = [
        ...verticalCutInches({
          col: sheet.col,
          cols,
          duplicate: duplicateStrip && !alignRecut,
          overlap,
          marginLeft: margins.left,
          contentW,
        }).map((x) => ({
          from: new scope.Point(gx + x * px, sy),
          to: new scope.Point(gx + x * px, sy + sheetH),
        })),
        ...horizontalCutInches({
          row: sheet.row,
          rows: ctx.rows ?? 0,
          duplicate: duplicateStrip && !alignRecut,
          overlap,
          marginTop: margins.top,
          contentH,
        }).map((y) => ({
          from: new scope.Point(gx, sy + y * px),
          to: new scope.Point(gx + sheetW, sy + y * px),
        })),
      ]
      for (const cut of cuts) {
        const line = new scope.Path.Line(cut.from, cut.to)
        line.strokeColor = showTrim ? hex('#365314') : hex('#FFFFFF')
        line.strokeWidth = 1
        line.dashArray = [4, 4]
        root.addChild(line)
      }
      if (alignRecut) {
        const marks = (side, vertical) => {
          const m = alignRecutOffset(overlap, vertical ? trimW : trimH, 0, side)
          return m
        }
        void marks
      }
    }
    if (showNumbers) {
      const label = new scope.PointText(new scope.Point(gx + 4, sy + sheetH + (labelH ? 18 : 0)))
      label.content = `S${sheet.index + 1}`
      label.fontSize = 11
      label.fontFamily = 'monospace'
      label.fillColor = hex('#7A7A80')
      root.addChild(label)
    }
  })
  scope.view.update()
  void pageW
  void pageH
  void stacked
  void overlapCutSlack
}
