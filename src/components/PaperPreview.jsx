// PaperPreview: paper.js canvas renderer for the banner preview.
//
// Resting geometry matches the DOM BannerComposition: line boxes sit on the
// measured baseline and rotate around the box center. Selection chrome is the
// text's oriented box, so the rectangle and handles turn with the glyphs. A
// gesture does not rebuild the scene. The dragged items keep their matrices
// and follow the pointer; the document updates on a frame and the scene is
// redrawn from measurement when the pointer goes up.

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import paper from 'paper'
import {
  MIN_GLYPH_HEIGHT,
  MAX_GLYPH_HEIGHT,
  FONT_SIZE_FACTOR,
  cornerLengthIn,
  cutPolygonPoints,
  findLine,
  fontOf,
  isIdSelected,
  lineText,
  nextSelection,
  selectedLineIds,
} from '../lib/composition.js'
import {
  GRID_HALF_IN,
  GRID_PITCH_IN,
  gridLinesIn,
  placeFrameInTrim,
  snapToGrid,
} from '../lib/grid.js'
import {
  ALIGN_COLOR,
  JOIN_ALIGN_RECUT,
  RECUT_COLOR,
  alignRecutOffset,
  coveredSpan,
  crossArm,
  horizontalCutInches,
  joinDuplicates,
  overlapCutSlack,
  resolveLayerHatchIn,
  verticalCutInches,
} from '../lib/layout.js'
import { getEngineFont } from '../lib/typeEngine.js'

const LIME = '#E3FF33'
const INK = '#111111'
const SELECT_BLUE = '#0D2B6B'
const SELECT_HALO = '#FFFFFF'
const BUTTONS = new Set(['snap', 'center-x', 'center-y'])

function color(scope, value, alpha = 1) {
  const next = new scope.Color(value)
  next.alpha = alpha
  return next
}

function paintSelectionStroke(scope, path) {
  path.strokeColor = color(scope, SELECT_BLUE)
  path.strokeWidth = 2
  path.strokeJoin = 'round'
  path.strokeCap = 'round'
  path.shadowColor = color(scope, '#000000', 0.55)
  path.shadowBlur = 6
  path.shadowOffset = new scope.Point(1, 2)
  path.data = { role: 'decor' }
  return path
}

function addSelectionHalo(scope, path) {
  const halo = path.clone()
  halo.strokeColor = color(scope, SELECT_HALO)
  halo.strokeWidth = (path.strokeWidth || 2) + 2
  halo.strokeJoin = path.strokeJoin
  halo.strokeCap = path.strokeCap
  halo.fillColor = null
  halo.shadowColor = null
  halo.shadowBlur = 0
  halo.shadowOffset = new scope.Point(0, 0)
  halo.data = { role: 'decor' }
  halo.insertBelow(path)
  return halo
}

function rowTop(row, rulerH, stride) {
  return rulerH + row * stride
}

function sheetBoardOrigin(sheet, pitchX, rulerH, stride) {
  return {
    x: sheet.col * pitchX,
    y: sheet.row === 0 ? 0 : rowTop(sheet.row, rulerH, stride),
  }
}

function pageBoardOrigin(sheet, pitchX, rulerH, stride) {
  const origin = sheetBoardOrigin(sheet, pitchX, rulerH, stride)
  return {
    x: origin.x,
    y: origin.y + (sheet.row === 0 ? rulerH : 0),
  }
}

// DOM overlapMask keeps incoming left/top margins at 45% so the printer-safe
// hatch reads as the overlap band. Clip those margins and the hatch disappears.
const OVERLAP_FLAP_OPACITY = 0.45

function incomingOverlapInset(stacked, sheet, margins, px) {
  return {
    x: stacked && sheet.col > 0 ? margins.left * px : 0,
    y: stacked && sheet.row > 0 ? margins.top * px : 0,
  }
}

function addIncomingOverlapFlaps(scope, sheetGroup, { page, sheetW, sheetH, insetX, insetY, sheetIndex }) {
  if (!(insetX > 0 || insetY > 0)) return null
  const flapGroup = new scope.Group()
  flapGroup.opacity = OVERLAP_FLAP_OPACITY
  flapGroup.data = { role: 'decor' }
  if (insetX > 0) {
    const leftFlap = new scope.Path.Rectangle(new scope.Rectangle(page.x, page.y, insetX, sheetH))
    leftFlap.fillColor = color(scope, '#FFFFFF')
    leftFlap.data = { role: 'sheet', sheet: sheetIndex }
    flapGroup.addChild(leftFlap)
  }
  if (insetY > 0) {
    const topFlap = new scope.Path.Rectangle(
      new scope.Rectangle(page.x + insetX, page.y, sheetW - insetX, insetY),
    )
    topFlap.fillColor = color(scope, '#FFFFFF')
    topFlap.data = { role: 'sheet', sheet: sheetIndex }
    flapGroup.addChild(topFlap)
  }
  sheetGroup.addChild(flapGroup)
  return flapGroup
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
        if (i < glyphs.length - 1) {
          x += engine.getKerningValue(glyphs[i], glyphs[i + 1]) * scale
          x += tracking
        }
      }
      return xs
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
  return xs
}

// Browser glyphs, placed on the measured advances so the line fills the same
// box the DOM preview measures. PointText's anchor is the alphabetic baseline.
function buildGlyphs(scope, text, font, fontId, fontPx, originX, baseline, trackingEm, fill) {
  const group = new scope.Group()
  const xs = layoutChars(text, font, fontId, fontPx, trackingEm)
  for (let i = 0; i < text.length; i += 1) {
    const letter = new scope.PointText(new scope.Point(originX + (xs[i] ?? 0), baseline))
    letter.content = text[i] === ' ' ? '\u00a0' : text[i]
    letter.fontFamily = `"${font.family}", Impact, sans-serif`
    letter.fontWeight = String(font.weight)
    letter.fontSize = fontPx
    letter.justification = 'left'
    letter.fillColor = fill
    group.addChild(letter)
  }
  return group
}

// Outline used only to clip a hatch. Null when the engine font is not loaded.
function buildClipPath(scope, text, fontId, fontPx, originX, baseline, trackingEm) {
  const engine = getEngineFont(fontId)
  if (!engine) return null
  try {
    const tracking = (Number(trackingEm) || 0) * fontPx
    const unit = fontPx / engine.unitsPerEm
    const glyphs = engine.stringToGlyphs(text)
    const parts = []
    let x = originX
    for (let i = 0; i < glyphs.length; i += 1) {
      const glyph = glyphs[i]
      if (text[i] !== ' ') {
        const data = glyph.getPath(x, baseline, fontPx).toPathData(4)
        if (data) parts.push(data)
      }
      x += glyph.advanceWidth * unit
      if (i < glyphs.length - 1) {
        x += engine.getKerningValue(glyph, glyphs[i + 1]) * unit
        x += tracking
      }
    }
    if (!parts.length) return null
    const path = new scope.CompoundPath(parts.join(' '))
    path.fillRule = 'nonzero'
    path.fillColor = null
    return path
  } catch {
    return null
  }
}

// CSS skewX around the bottom of the line box, then the layer offset.
// x' = x + tan * (y - originY) + dx, y' = y + dy.
function layerMatrix(scope, skewDeg, originY, dx, dy) {
  const tan = Math.tan(((Number(skewDeg) || 0) * Math.PI) / 180)
  return new scope.Matrix(1, 0, tan, 1, dx - tan * originY, dy)
}

function hatchStripes(scope, source, angleDeg, spacing, lineWidth, fill) {
  if (!(source instanceof scope.PathItem) || !(spacing > 0) || !(lineWidth > 0)) return null
  const bounds = source.bounds
  if (!(bounds.width > 0) || !(bounds.height > 0)) return null
  const axis = (((angleDeg + 90) % 360) + 360) % 360
  const cssAngle = (axis + 90) % 360
  const rad = (cssAngle * Math.PI) / 180
  const ux = Math.sin(rad)
  const uy = -Math.cos(rad)
  const vx = -uy
  const vy = ux
  const corners = [bounds.topLeft, bounds.topRight, bounds.bottomLeft, bounds.bottomRight]
  let min = Infinity
  let max = -Infinity
  for (const corner of corners) {
    const proj = corner.x * ux + corner.y * uy
    min = Math.min(min, proj)
    max = Math.max(max, proj)
  }
  const reach = Math.hypot(bounds.width, bounds.height) + spacing
  const group = new scope.Group()
  const mask = source.clone({ insert: false })
  mask.clipMask = true
  mask.data = { role: 'decor' }
  group.addChild(mask)
  for (let dist = min; dist <= max; dist += spacing) {
    const ox = ux * dist
    const oy = uy * dist
    const wax = vx * reach
    const way = vy * reach
    const thickX = ux * lineWidth
    const thickY = uy * lineWidth
    const stripe = new scope.Path([
      new scope.Point(ox - wax, oy - way),
      new scope.Point(ox + wax, oy + way),
      new scope.Point(ox + wax + thickX, oy + way + thickY),
      new scope.Point(ox - wax + thickX, oy - way + thickY),
    ])
    stripe.closed = true
    stripe.fillColor = fill
    stripe.data = { role: 'decor' }
    group.addChild(stripe)
  }
  group.clipped = true
  return group
}

function diagonalHatch(scope, rect, spacing, lineWidth, fill) {
  const group = new scope.Group()
  const mask = new scope.Path.Rectangle(rect)
  mask.clipMask = true
  mask.data = { role: 'decor' }
  group.addChild(mask)
  const reach = rect.width + rect.height
  const step = spacing * Math.SQRT2
  const thick = lineWidth * Math.SQRT2
  for (let offset = -rect.height; offset < rect.width + rect.height; offset += step) {
    const stripe = new scope.Path([
      new scope.Point(rect.x + offset, rect.y),
      new scope.Point(rect.x + offset + thick, rect.y),
      new scope.Point(rect.x + offset + thick + rect.height, rect.y + rect.height),
      new scope.Point(rect.x + offset + rect.height, rect.y + rect.height),
    ])
    stripe.closed = true
    stripe.fillColor = fill
    stripe.data = { role: 'decor' }
    group.addChild(stripe)
  }
  group.clipped = true
  void reach
  return group
}

function makeFramePath(scope, container, x, y, widthPx, heightPx, px) {
  const widthIn = widthPx / px
  const heightIn = heightPx / px
  const corner = container.decoration?.corner
  const cutPx = cornerLengthIn(container, widthIn, heightIn) * px
  if (corner === 'cut' && cutPx > 0) {
    const path = new scope.Path(
      cutPolygonPoints(widthPx, heightPx, cutPx).map(([px0, py0]) => new scope.Point(x + px0, y + py0)),
    )
    path.closed = true
    return path
  }
  const radius = corner === 'round' ? cutPx : 0
  return new scope.Path.Rectangle(
    new scope.Rectangle(x, y, widthPx, heightPx),
    new scope.Size(radius, radius),
  )
}

function tagged(item) {
  let node = item
  while (node) {
    const role = node.data?.role
    if (role === 'decor' || role === 'guide') return null
    if (
      role === 'handle' ||
      role === 'glyph' ||
      role === 'chrome' ||
      role === 'frame' ||
      role === 'stack' ||
      role === 'sheet'
    ) {
      return node
    }
    node = node.parent
  }
  return null
}

function itemsWith(scope, lineId, role) {
  return scope.project.getItems({
    match: (item) => item.data?.lineId === lineId && item.data?.role === role,
  })
}

function drawRuler(scope, x, y, originIn, widthIn, px) {
  const group = new scope.Group()
  const band = new scope.Path.Rectangle(new scope.Rectangle(x, y, widthIn * px, 28))
  band.fillColor = color(scope, '#26262E')
  band.data = { role: 'decor' }
  group.addChild(band)
  const first = Math.ceil(originIn - 1e-6)
  const last = Math.floor(originIn + widthIn + 1e-6)
  for (let inch = first; inch <= last; inch += 1) {
    const tickX = x + (inch - originIn) * px
    const foot = inch % 12 === 0
    const mid = inch % 6 === 0
    const tick = new scope.Path.Line(
      new scope.Point(tickX, y + (foot ? 12 : 16)),
      new scope.Point(tickX, y + 28),
    )
    tick.strokeColor = color(scope, foot ? '#F0F0F2' : '#5E5E69')
    tick.strokeWidth = 1
    tick.data = { role: 'decor' }
    group.addChild(tick)
    if (mid) {
      const label = new scope.PointText(new scope.Point(tickX + 4, y + 11))
      label.content = `${inch}"`
      label.fontSize = 9
      label.fontFamily = 'ui-monospace, monospace'
      label.fillColor = color(scope, '#7A7A80')
      label.data = { role: 'decor' }
      group.addChild(label)
    }
    if (foot) {
      const feet = new scope.PointText(new scope.Point(tickX + 6, y + 24))
      feet.content = `${Math.floor(inch / 12)}'`
      feet.fontSize = 10
      feet.fontWeight = 'bold'
      feet.fontFamily = 'ui-monospace, monospace'
      feet.fillColor = color(scope, '#F0F0F2')
      feet.data = { role: 'decor' }
      group.addChild(feet)
    }
  }
  return group
}

function drawLine(scope, box, px, frameX, frameY, selected, editing, sheetIndex, showHandles = true) {
  const line = box.line
  const font = fontOf(line)
  const text = lineText(line) || '\u00a0'
  const fontPx = line.glyphHeight * FONT_SIZE_FACTOR * px
  const left = frameX + box.x * px
  const top = frameY + box.y * px
  const width = Math.max(box.width, 0) * px
  const height = box.height * px
  const baseline = frameY + box.baselineY * px
  const center = new scope.Point(left + width / 2, top + height / 2)
  const topLeft = new scope.Point(left, top)
  const bottom = top + height

  const spin = new scope.Group()
  spin.applyMatrix = false
  const body = new scope.Group()
  body.applyMatrix = false
  const visible = (line.layers || []).filter((layer) => layer?.visible !== false)
  if (!editing) {
    for (const layer of visible) {
      const dx = (Number(layer.dxIn) || 0) * px
      const dy = (Number(layer.dyIn) || 0) * px
      const glyphs = buildGlyphs(
        scope,
        text,
        font,
        line.fontId,
        fontPx,
        left,
        baseline,
        line.letterSpacing,
        color(scope, layer.fill || INK),
      )
      if (layer.strokeOn) {
        glyphs.strokeColor = color(scope, layer.strokeColor || INK)
        glyphs.strokeWidth = (Number(layer.strokeWidthIn) || 0) * px
        glyphs.strokeJoin = 'round'
      }
      const layerGroup = new scope.Group([glyphs])
      layerGroup.applyMatrix = false
      if (layer.overlayOn) {
        const hatch = resolveLayerHatchIn(layer, line.glyphHeight, line.fontId)
        const mask = buildClipPath(scope, text, line.fontId, fontPx, left, baseline, line.letterSpacing)
        const stripes = mask
          ? hatchStripes(
            scope,
            mask,
            hatch.angle,
            hatch.spacingIn * px,
            Math.max(0.5, hatch.lineWidthIn * px),
            color(scope, layer.overlayColor || layer.fill || INK),
          )
          : null
        if (stripes) layerGroup.addChild(stripes)
        else {
          const veil = buildGlyphs(
            scope,
            text,
            font,
            line.fontId,
            fontPx,
            left,
            baseline,
            line.letterSpacing,
            color(scope, layer.overlayColor || layer.fill || INK, 0.55),
          )
          layerGroup.addChild(veil)
        }
        mask?.remove()
      }
      layerGroup.matrix = layerMatrix(scope, layer.skewXDeg, bottom, dx, dy)
      body.addChild(layerGroup)
    }
  }
  spin.addChild(body)
  spin.data = {
    role: 'glyph',
    lineId: box.id,
    sheetIndex,
    center,
    topLeft,
    body,
  }

  const frame = selectionFrame(scope, body, left, top, width, height, px)
  const chrome = new scope.Group()
  chrome.applyMatrix = false
  chrome.data = {
    role: 'chrome',
    lineId: box.id,
    sheetIndex,
    center,
    topLeft,
  }
  const hit = new scope.Path.Rectangle(frame)
  hit.fillColor = color(scope, '#000000', 0.001)
  hit.data = { role: 'handle', handle: 'move', lineId: box.id, sheetIndex, center, topLeft }
  chrome.addChild(hit)
  if (selected && !editing) {
    const outline = new scope.Path.Rectangle(frame.expand(4, 4))
    paintSelectionStroke(scope, outline)
    chrome.addChild(outline)
    addSelectionHalo(scope, outline)
    const guide = new scope.Path.Line(new scope.Point(frame.left, baseline), new scope.Point(frame.right, baseline))
    paintSelectionStroke(scope, guide)
    guide.strokeWidth = 1
    guide.shadowBlur = 4
    chrome.addChild(guide)
    addSelectionHalo(scope, guide)
    if (showHandles) addHandles(scope, chrome, box, frame, center, topLeft, sheetIndex)
  }
  const rotation = Number(line.rotationDeg) || 0
  if (rotation) {
    spin.rotate(rotation, center)
    chrome.rotate(rotation, center)
  }
  return { spin, chrome }
}

function selectionFrame(scope, body, left, top, width, height, px) {
  const fallback = new scope.Rectangle(left, top, Math.max(width, px), Math.max(height, px))
  if (!body?.children.length) return fallback
  const bounds = body.bounds
  if (!(bounds.width > 1) || !(bounds.height > 1)) return fallback
  return bounds
}

function drawFrameResizeHandle(scope, frameX, frameY, frameW, frameH) {
  const size = 16
  const viewW = scope.view.viewSize.width
  const viewH = scope.view.viewSize.height
  const x = Math.max(1, Math.min(frameX + frameW + 4, viewW - size - 1))
  const y = Math.max(1, Math.min(frameY + frameH + 4, viewH - size - 1))
  const origin = new scope.Point(frameX, frameY)
  const tag = { role: 'handle', handle: 'frame-resize', origin }
  const pad = new scope.Path.Rectangle(
    new scope.Rectangle(x, y, size, size),
    new scope.Size(3, 3),
  )
  pad.fillColor = color(scope, LIME)
  pad.strokeColor = color(scope, '#000000')
  pad.strokeWidth = 1
  pad.data = tag
  const mark = new scope.PointText(new scope.Point(x + 8, y + 12))
  mark.content = '⤡'
  mark.justification = 'center'
  mark.fontSize = 11
  mark.fillColor = color(scope, '#000000')
  mark.data = tag
  scope.project.activeLayer.addChild(pad)
  scope.project.activeLayer.addChild(mark)
}

function addHandles(scope, chrome, box, frame, center, topLeft, sheetIndex) {
  const snap = (box.line.place?.mode || 'snap') !== 'free'
  const buttons = [
    { handle: 'snap', label: snap ? '🧲' : '🔓', fill: snap ? LIME : '#141417', ink: snap ? '#000000' : LIME },
    { handle: 'center-x', label: '↔', fill: '#141417', ink: LIME },
    { handle: 'center-y', label: '↕', fill: '#141417', ink: LIME },
  ]
  buttons.forEach((button, index) => {
    const x = frame.right - (buttons.length - index) * 22 - 1
    const y = frame.top + 1
    const pad = new scope.Path.Rectangle(new scope.Rectangle(x, y, 20, 20), new scope.Size(3, 3))
    pad.fillColor = color(scope, button.fill)
    pad.strokeColor = color(scope, '#000000')
    pad.strokeWidth = 1
    pad.data = { role: 'handle', handle: button.handle, lineId: box.id, sheetIndex, center, topLeft }
    const label = new scope.PointText(new scope.Point(x + 10, y + 14))
    label.content = button.label
    label.justification = 'center'
    label.fontSize = 12
    label.fillColor = color(scope, button.ink)
    label.data = { role: 'decor' }
    chrome.addChild(pad)
    chrome.addChild(label)
  })
  const resize = new scope.Path.Rectangle(
    new scope.Rectangle(frame.right - 8, frame.bottom - 8, 16, 16),
    new scope.Size(3, 3),
  )
  resize.fillColor = color(scope, LIME)
  resize.strokeColor = color(scope, '#000000')
  resize.strokeWidth = 1
  resize.data = { role: 'handle', handle: 'resize', lineId: box.id, sheetIndex, center, topLeft }
  chrome.addChild(resize)
  const rotate = new scope.Path.Circle(frame.topLeft, 8)
  rotate.fillColor = color(scope, LIME)
  rotate.strokeColor = color(scope, '#000000')
  rotate.strokeWidth = 1
  rotate.data = { role: 'handle', handle: 'rotate', lineId: box.id, sheetIndex, center, topLeft }
  chrome.addChild(rotate)
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
    rows,
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
    sheetGap,
    rulerH,
    sheetW,
    sheetH,
    labelH,
    editingLineId,
  } = ctx
  scope.project.activeLayer.removeChildren()
  const frameBoxW = coveredSpan(cols, trimW, contentW, duplicateStrip) || sliceW
  const frameBoxH = sliceH
  const pad = frameOffset(composition, measured, frameBoxW, frameBoxH)
  const stride = stacked ? contentH * px : sheetH + labelH + sheetGap
  const sheetCount = sheets.length
  const cutSlackPx = overlapCutSlack(overlap, duplicateStrip && !alignRecut) * px

  sheets.forEach((sheet) => {
    const board = sheetBoardOrigin(sheet, pitchX, rulerH, stride)
    const page = pageBoardOrigin(sheet, pitchX, rulerH, stride)
    if (sheet.row === 0) {
      scope.project.activeLayer.addChild(
        drawRuler(scope, page.x + margins.left * px, board.y, sheet.originX, sliceW, px),
      )
    }

    const inset = incomingOverlapInset(stacked, sheet, margins, px)
    const clipSheet = new scope.Path.Rectangle(
      new scope.Rectangle(page.x, page.y, sheetW, sheetH),
      new scope.Size(2, 2),
    )
    const sheetGroup = new scope.Group([clipSheet])
    clipSheet.clipMask = true
    sheetGroup.clipped = true

    const flapGroup = addIncomingOverlapFlaps(scope, sheetGroup, {
      page,
      sheetW,
      sheetH,
      insetX: inset.x,
      insetY: inset.y,
      sheetIndex: sheet.index,
    })

    const card = new scope.Path.Rectangle(
      new scope.Rectangle(page.x + inset.x, page.y + inset.y, sheetW - inset.x, sheetH - inset.y),
      inset.x > 0 || inset.y > 0 ? new scope.Size(0, 0) : new scope.Size(2, 2),
    )
    card.fillColor = color(scope, '#FFFFFF')
    card.data = { role: 'sheet', sheet: sheet.index }
    card.shadowColor = color(scope, '#000000', stacked && (sheet.col > 0 || sheet.row > 0) ? 0.55 : 0.45)
    card.shadowBlur = 18
    card.shadowOffset = new scope.Point(sheet.col > 0 && stacked ? -6 : 0, 8)
    sheetGroup.addChild(card)

    if (showSafe) {
      const hatch = color(scope, '#1a1a1a', 0.55)
      const solidBands = []
      const flapBands = []
      if (margins.top > 0) {
        const band = new scope.Rectangle(page.x, page.y, sheetW, margins.top * px)
        if (inset.y > 0) flapBands.push(band)
        else solidBands.push(band)
      }
      if (margins.bottom > 0) {
        solidBands.push(new scope.Rectangle(page.x, page.y + (margins.top + trimH) * px, sheetW, margins.bottom * px))
      }
      if (margins.left > 0) {
        const band = new scope.Rectangle(page.x, page.y + margins.top * px, margins.left * px, trimH * px)
        if (inset.x > 0) flapBands.push(band)
        else solidBands.push(band)
      }
      if (margins.right > 0) {
        solidBands.push(
          new scope.Rectangle(page.x + (margins.left + trimW) * px, page.y + margins.top * px, margins.right * px, trimH * px),
        )
      }
      for (const band of flapBands) {
        const host = flapGroup ?? sheetGroup
        host.addChild(diagonalHatch(scope, band, 7, 2, hatch))
      }
      for (const band of solidBands) sheetGroup.addChild(diagonalHatch(scope, band, 7, 2, hatch))
      const safe = new scope.Path.Rectangle(
        new scope.Rectangle(page.x + margins.left * px, page.y + margins.top * px, trimW * px, trimH * px),
      )
      safe.strokeColor = color(scope, '#000000', 0.18)
      safe.strokeWidth = 1
      safe.dashArray = [1, 3]
      safe.data = { role: 'decor' }
      sheetGroup.addChild(safe)
    }

    const wx = page.x + margins.left * px
    const wy = page.y + margins.top * px
    const ww = sliceW * px
    const wh = sliceH * px
    if (showTape && overlap > 0 && !duplicateStrip && sheet.col < cols - 1) {
      const zone = new scope.Rectangle(wx + contentW * px, wy, overlap * px, wh)
      sheetGroup.addChild(diagonalHatch(scope, zone, 7, 2, color(scope, '#1a1a1a', 0.45)))
    }
    if (showTape && overlap > 0 && !duplicateStrip && tile && sheet.row < rows - 1) {
      const zone = new scope.Rectangle(wx, wy + contentH * px, ww, overlap * px)
      sheetGroup.addChild(diagonalHatch(scope, zone, 7, 2, color(scope, '#1a1a1a', 0.45)))
    }

    if (measured && measured.width > 0) {
      const frameX = wx + pad.x * px - sheet.originX * px
      const frameY = wy + pad.y * px - sheet.originY * px
      const frameW = measured.width * px
      const frameH = measured.height * px
      const windowPath = new scope.Path.Rectangle(new scope.Rectangle(wx, wy, ww, wh))
      const frameShape = makeFramePath(scope, composition.container, frameX, frameY, frameW, frameH, px)
      let clip = windowPath
      try {
        const hit = windowPath.intersect(frameShape)
        if (hit && !hit.isEmpty()) {
          clip = hit
          windowPath.remove()
          frameShape.remove()
        } else {
          frameShape.remove()
          hit?.remove()
        }
      } catch {
        frameShape.remove()
      }
      clip.clipMask = true
      clip.data = { role: 'decor' }
      const comp = new scope.Group([clip])
      comp.clipped = true

      const container = composition.container
      const frame = makeFramePath(scope, container, frameX, frameY, frameW, frameH, px)
      frame.fillColor = container.fillOn ? color(scope, container.fill) : color(scope, '#FFFFFF', 0.001)
      if (container.strokeOn) {
        frame.strokeColor = color(scope, container.strokeColor)
        frame.strokeWidth = (container.strokeWidthIn || 0) * px
        frame.strokeJoin = 'miter'
      }
      frame.data = { role: 'frame' }
      comp.addChild(frame)

      const halves = gridLinesIn(sheet.originY, sheet.originY + sliceH, GRID_HALF_IN).filter(
        (y) => Math.abs(y % GRID_PITCH_IN) > 1e-6,
      )
      const horizontals = gridLinesIn(sheet.originY, sheet.originY + sliceH, GRID_PITCH_IN)
      const verticals = composition.alignMode === 'grid'
        ? gridLinesIn(sheet.originX, sheet.originX + sliceW, GRID_PITCH_IN)
        : []
      for (const y of halves) {
        const line = new scope.Path.Line(
          new scope.Point(wx, wy + (y - sheet.originY) * px),
          new scope.Point(wx + ww, wy + (y - sheet.originY) * px),
        )
        line.strokeColor = color(scope, LIME, 0.12)
        line.strokeWidth = 1
        line.data = { role: 'guide' }
        comp.addChild(line)
      }
      for (const y of horizontals) {
        const line = new scope.Path.Line(
          new scope.Point(wx, wy + (y - sheet.originY) * px),
          new scope.Point(wx + ww, wy + (y - sheet.originY) * px),
        )
        line.strokeColor = color(scope, LIME, 0.28)
        line.strokeWidth = 1
        line.data = { role: 'guide' }
        comp.addChild(line)
      }
      for (const x of verticals) {
        const line = new scope.Path.Line(
          new scope.Point(wx + (x - sheet.originX) * px, wy),
          new scope.Point(wx + (x - sheet.originX) * px, wy + wh),
        )
        line.strokeColor = color(scope, LIME, 0.22)
        line.strokeWidth = 1
        line.data = { role: 'guide' }
        comp.addChild(line)
      }

      const stack = container.children?.find((child) => child.type === 'stack')
      if (stack && measured.stackBox) {
        const stackHit = new scope.Path.Rectangle(
          new scope.Rectangle(
            frameX + measured.stackBox.x * px,
            frameY + measured.stackBox.y * px,
            measured.stackBox.width * px,
            measured.stackBox.height * px,
          ),
        )
        stackHit.fillColor = color(scope, '#000000', 0.001)
        stackHit.data = { role: 'stack', stackId: stack.id }
        comp.addChild(stackHit)
      }
      const guidesOn = isIdSelected(selection, stack?.id) || selectedLineIds(selection).length > 0
      if (guidesOn && stack && measured.stackBox) {
        const box = measured.stackBox
        for (const edge of ['left', 'center', 'right']) {
          const x = edge === 'left' ? box.x : edge === 'right' ? box.x + box.width : box.x + box.width / 2
          const guide = new scope.Path.Line(
            new scope.Point(frameX + x * px, frameY + box.y * px),
            new scope.Point(frameX + x * px, frameY + (box.y + box.height) * px),
          )
          guide.strokeColor = color(scope, LIME, stack.align === edge ? 1 : 0.35)
          guide.strokeWidth = 1
          guide.dashArray = stack.align === edge ? [] : [3, 3]
          guide.data = { role: 'guide' }
          comp.addChild(guide)
        }
      }
      if (isIdSelected(selection, container.id)) {
        const outline = makeFramePath(scope, container, frameX, frameY, frameW, frameH, px)
        paintSelectionStroke(scope, outline)
        outline.strokeWidth = 2
        comp.addChild(outline)
        addSelectionHalo(scope, outline)
      }

      const chromes = []
      for (const box of measured.lineBoxes) {
        const parts = drawLine(
          scope,
          box,
          px,
          frameX,
          frameY,
          isIdSelected(selection, box.id),
          editingLineId === box.id,
          sheet.index,
          selection?.id === box.id,
        )
        comp.addChild(parts.spin)
        chromes.push(parts.chrome)
      }
      sheetGroup.addChild(comp)
      for (const chrome of chromes) sheetGroup.addChild(chrome)
    }

    if (showTrim && !alignRecut) {
      const cuts = [
        ...verticalCutInches({
          col: sheet.col,
          cols,
          duplicate: duplicateStrip,
          overlap,
          marginLeft: margins.left,
          contentW,
        }).map((x) => ({
          from: new scope.Point(page.x + x * px, wy),
          to: new scope.Point(page.x + x * px, wy + wh),
        })),
        ...horizontalCutInches({
          row: sheet.row,
          rows,
          duplicate: duplicateStrip,
          overlap,
          marginTop: margins.top,
          contentH,
        }).map((y) => ({
          from: new scope.Point(wx, page.y + y * px),
          to: new scope.Point(wx + ww, page.y + y * px),
        })),
      ]
      for (const cut of cuts) {
        const line = new scope.Path.Line(cut.from, cut.to)
        line.strokeColor = color(scope, LIME)
        line.strokeWidth = 1
        line.dashArray = [4, 4]
        line.blendMode = 'difference'
        line.data = { role: 'decor' }
        sheetGroup.addChild(line)
      }
    }
    if (showCutMarks) {
      const marks = [
        [wx, wy, 1, 1],
        [wx + trimW * px, wy, -1, 1],
        [wx, wy + trimH * px, 1, -1],
        [wx + trimW * px, wy + trimH * px, -1, -1],
      ]
      for (const [x, y, sx, sy] of marks) {
        const h = new scope.Path.Line(new scope.Point(x + sx * 4, y), new scope.Point(x + sx * 14, y))
        const v = new scope.Path.Line(new scope.Point(x, y + sy * 4), new scope.Point(x, y + sy * 14))
        h.strokeColor = color(scope, '#000000')
        v.strokeColor = color(scope, '#000000')
        h.strokeWidth = 1
        v.strokeWidth = 1
        h.data = { role: 'decor' }
        v.data = { role: 'decor' }
        sheetGroup.addChild(h)
        sheetGroup.addChild(v)
      }
    }
    if (alignRecut) {
      drawJoinMarks(scope, sheetGroup, {
        sheet,
        cols,
        rows,
        overlap,
        margins,
        trimW,
        trimH,
        pageW,
        pageH,
        px,
        page,
      })
    }
    scope.project.activeLayer.addChild(sheetGroup)

    if (showNumbers) {
      const label = new scope.PointText(new scope.Point(page.x + 4, page.y + sheetH + Math.max(14, labelH - 8)))
      const index = String(sheet.index + 1).padStart(2, '0')
      const total = String(sheetCount).padStart(2, '0')
      label.content = tile
        ? `R${String(sheet.row + 1).padStart(2, '0')} C${String(sheet.col + 1).padStart(2, '0')} · ${index} / ${total}`
        : `SHEET ${index} / ${total}  ${trimW.toFixed(2)}" × ${trimH.toFixed(2)}" TRIM`
      label.fontSize = 10
      label.fontFamily = 'ui-monospace, monospace'
      label.fillColor = color(scope, '#F0F0F2')
      label.data = { role: 'decor' }
      scope.project.activeLayer.addChild(label)
    }
  })

  if (showTrim && !alignRecut) {
    sheets.forEach((sheet) => {
      const page = pageBoardOrigin(sheet, pitchX, rulerH, stride)
      const badges = []
      const verticalSeam = duplicateStrip ? sheet.col > 0 : sheet.col < cols - 1
      if (verticalSeam) {
        const seam = duplicateStrip ? sheet.col - 1 : sheet.col
        const cutSheet = duplicateStrip ? seam + 1 : seam
        const onSheet = duplicateStrip ? margins.left * px + cutSlackPx : margins.left * px + contentW * px
        badges.push({
          x: cutSheet * pitchX + onSheet,
          y: page.y + margins.top * px + (sliceH * px) / 2,
        })
      }
      const horizontalSeam = tile && (duplicateStrip ? sheet.row > 0 : sheet.row < rows - 1)
      if (horizontalSeam) {
        const seam = duplicateStrip ? sheet.row - 1 : sheet.row
        const cutSheet = duplicateStrip ? seam + 1 : seam
        const onPage = duplicateStrip ? margins.top * px + cutSlackPx : margins.top * px + contentH * px
        const cutPage = pageBoardOrigin({ col: sheet.col, row: cutSheet }, pitchX, rulerH, stride)
        badges.push({
          x: sheet.col * pitchX + margins.left * px + (sliceW * px) / 2,
          y: cutPage.y + onPage,
        })
      }
      for (const badge of badges) {
        const dot = new scope.Path.Circle(new scope.Point(badge.x, badge.y), 10)
        dot.fillColor = color(scope, LIME)
        dot.data = { role: 'decor' }
        const mark = new scope.PointText(new scope.Point(badge.x, badge.y + 4))
        mark.content = '✂'
        mark.justification = 'center'
        mark.fontSize = 12
        mark.fillColor = color(scope, '#000000')
        mark.data = { role: 'decor' }
        scope.project.activeLayer.addChild(dot)
        scope.project.activeLayer.addChild(mark)
      }
    })
  }
  if (measured && measured.width > 0 && sheets[0]) {
    const sheet0 = sheets[0]
    const page = pageBoardOrigin(sheet0, pitchX, rulerH, stride)
    const frameX = page.x + margins.left * px + pad.x * px - sheet0.originX * px
    const frameY = page.y + margins.top * px + pad.y * px - sheet0.originY * px
    drawFrameResizeHandle(scope, frameX, frameY, measured.width * px, measured.height * px)
  }
  scope.view.update()
}

function drawJoinMarks(scope, parent, ctx) {
  const { sheet, cols, rows, overlap, margins, trimW, trimH, pageW, pageH, px, page: origin } = ctx
  const specs = []
  if (sheet.col > 0) {
    specs.push({ axis: 'vertical', side: 'start', along: margins.left, trim: trimW, cross: margins.top, crossFar: margins.bottom, pageCross: pageH })
  }
  if (sheet.col < cols - 1) {
    specs.push({ axis: 'vertical', side: 'end', along: margins.left, trim: trimW, cross: margins.top, crossFar: margins.bottom, pageCross: pageH })
  }
  if (sheet.row > 0) {
    specs.push({ axis: 'horizontal', side: 'start', along: margins.top, trim: trimH, cross: margins.left, crossFar: margins.right, pageCross: pageW })
  }
  if (sheet.row < rows - 1) {
    specs.push({ axis: 'horizontal', side: 'end', along: margins.top, trim: trimH, cross: margins.left, crossFar: margins.right, pageCross: pageW })
  }
  for (const spec of specs) {
    const marks = alignRecutOffset(overlap, spec.trim, spec.along, spec.side)
    if (!marks) continue
    const vertical = spec.axis === 'vertical'
    const point = (along, cross) => (
      vertical
        ? new scope.Point(origin.x + along * px, origin.y + cross * px)
        : new scope.Point(origin.x + cross * px, origin.y + along * px)
    )
    const paint = (along, ink) => {
      const line = vertical
        ? new scope.Path.Line(
          new scope.Point(origin.x + along * px, origin.y),
          new scope.Point(origin.x + along * px, origin.y + pageH * px),
        )
        : new scope.Path.Line(
          new scope.Point(origin.x, origin.y + along * px),
          new scope.Point(origin.x + pageW * px, origin.y + along * px),
        )
      line.strokeColor = color(scope, ink)
      line.strokeWidth = 1
      line.data = { role: 'decor' }
      parent.addChild(line)
    }
    paint(marks.align, ALIGN_COLOR)
    paint(marks.cut, RECUT_COLOR)
    const armNear = crossArm(spec.cross) * px
    const armFar = crossArm(spec.crossFar) * px
    const nearAt = spec.cross > 0 ? spec.cross / 2 : 0.04
    const farAt = spec.pageCross - (spec.crossFar > 0 ? spec.crossFar / 2 : 0.04)
    for (const [at, arm, ink] of [[nearAt, armNear, ALIGN_COLOR], [farAt, armFar, ALIGN_COLOR]]) {
      if (!(arm > 0)) continue
      const center = point(marks.align, at)
      const h = new scope.Path.Line(center.subtract(new scope.Point(arm, 0)), center.add(new scope.Point(arm, 0)))
      const v = new scope.Path.Line(center.subtract(new scope.Point(0, arm)), center.add(new scope.Point(0, arm)))
      h.strokeColor = color(scope, ink)
      v.strokeColor = color(scope, ink)
      h.strokeWidth = 1
      v.strokeWidth = 1
      h.data = { role: 'decor' }
      v.data = { role: 'decor' }
      parent.addChild(h)
      parent.addChild(v)
    }
    const alignLabel = new scope.PointText(point(marks.align, nearAt))
    alignLabel.content = 'ALIGN'
    alignLabel.fillColor = color(scope, ALIGN_COLOR)
    alignLabel.fontSize = (6 / 72) * px
    alignLabel.fontFamily = 'ui-monospace, monospace'
    alignLabel.data = { role: 'decor' }
    const cutLabel = new scope.PointText(point(marks.cut, nearAt))
    cutLabel.content = 'CUT'
    cutLabel.fillColor = color(scope, RECUT_COLOR)
    cutLabel.fontSize = (6 / 72) * px
    cutLabel.fontFamily = 'ui-monospace, monospace'
    cutLabel.data = { role: 'decor' }
    parent.addChild(alignLabel)
    parent.addChild(cutLabel)
  }
}

function captureParts(scope, lineId) {
  const spins = itemsWith(scope, lineId, 'glyph')
  const chromes = itemsWith(scope, lineId, 'chrome')
  return spins.map((spin) => {
    const chrome = chromes.find((item) => item.data.sheetIndex === spin.data.sheetIndex) ?? null
    return {
      spin,
      spinMatrix: spin.matrix.clone(),
      body: spin.data.body,
      bodyMatrix: spin.data.body.matrix.clone(),
      chrome,
      chromeMatrix: chrome ? chrome.matrix.clone() : null,
      center: spin.data.center.clone(),
      topLeft: spin.data.topLeft.clone(),
    }
  })
}

function applyGesture(drag, point, shift) {
  const dxPx = point.x - drag.startX
  const dyPx = point.y - drag.startY
  if (drag.kind === 'resize') {
    let next = drag.baseH + dyPx / drag.px
    if (shift) next = Math.round(next / 0.5) * 0.5
    next = Math.min(MAX_GLYPH_HEIGHT, Math.max(MIN_GLYPH_HEIGHT, next))
    next = Math.round(next * 100) / 100
    const scale = drag.baseH > 0 ? next / drag.baseH : 1
    for (const part of drag.parts) {
      part.body.matrix = part.bodyMatrix.clone()
      if (scale !== 1) part.body.scale(scale, part.topLeft)
      if (part.chrome && part.chromeMatrix) {
        part.chrome.matrix = part.chromeMatrix.clone()
        if (scale !== 1) part.chrome.scale(scale, part.topLeft)
      }
    }
    return { glyphHeight: next }
  }
  if (drag.kind === 'rotate') {
    const center = drag.center
    const ang = (Math.atan2(point.y - center.y, point.x - center.x) * 180) / Math.PI
    let next = drag.baseDeg + (ang - drag.startAng)
    if (shift) next = Math.round(next / 5) * 5
    next = ((next + 540) % 360) - 180
    next = Math.round(next * 100) / 100
    const delta = next - drag.baseDeg
    for (const part of drag.parts) {
      part.spin.matrix = part.spinMatrix.clone()
      if (delta) part.spin.rotate(delta, part.center)
      if (part.chrome && part.chromeMatrix) {
        part.chrome.matrix = part.chromeMatrix.clone()
        if (delta) part.chrome.rotate(delta, part.center)
      }
    }
    return { rotationDeg: next }
  }
  let dx = drag.baseDx + dxPx / drag.px
  let dy = drag.baseDy + dyPx / drag.px
  if (drag.snap) {
    dx = snapToGrid(drag.autoX + dx) - drag.autoX
    dy = snapToGrid(drag.autoY + dy) - drag.autoY
  }
  const round2 = (n) => Math.round(n * 100) / 100
  dx = round2(dx)
  dy = round2(dy)
  const ddx = (dx - drag.baseDx) * drag.px
  const ddy = (dy - drag.baseDy) * drag.px
  for (const part of drag.parts) {
    part.spin.matrix = part.spinMatrix.clone()
    if (ddx || ddy) part.spin.translate(ddx, ddy)
    if (part.chrome && part.chromeMatrix) {
      part.chrome.matrix = part.chromeMatrix.clone()
      if (ddx || ddy) part.chrome.translate(ddx, ddy)
    }
  }
  return {
    place: { mode: drag.snap ? 'snap' : 'free', dxIn: dx, dyIn: dy },
  }
}

function EditField({ line, width, height, px, onChange, onCommit, onCancel }) {
  const font = fontOf(line)
  const ref = useRef(null)
  const cancelled = useRef(false)
  const visible = (line.layers || []).filter((layer) => layer?.visible !== false)
  const front = visible[visible.length - 1] ?? line.layers?.[0]
  const transform = line.transform === 'uppercase' ? 'uppercase' : line.transform === 'lowercase' ? 'lowercase' : 'none'

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.focus({ preventScroll: true })
    el.select()
  }, [])

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    el.style.width = '0px'
    const next = Math.max(el.scrollWidth + 2, width)
    el.style.width = `${next}px`
  }, [line.copy, width])

  return (
    <input
      ref={ref}
      aria-label="Edit line"
      value={line.copy}
      spellCheck={false}
      onChange={(event) => onChange(event.target.value.replace(/\n/g, ' '))}
      onBlur={() => {
        if (!cancelled.current) onCommit()
      }}
      onPointerDown={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          event.currentTarget.blur()
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          cancelled.current = true
          onCancel()
        }
      }}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        margin: 0,
        padding: 0,
        border: 0,
        outline: 'none',
        background: 'transparent',
        caretColor: INK,
        fontFamily: `"${font.family}", Impact, sans-serif`,
        fontWeight: font.weight,
        fontSize: line.glyphHeight * FONT_SIZE_FACTOR * px,
        letterSpacing: `${line.letterSpacing}em`,
        lineHeight: `${height}px`,
        height,
        minWidth: width,
        whiteSpace: 'nowrap',
        color: front?.overlayOn ? INK : front?.fill || INK,
        textTransform: transform,
      }}
    />
  )
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
    onObjectContextMenu,
    onPatchLine,
    onLivePatch,
    onLivePatchFrame,
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
    sheetGap = 0,
    boardW,
    boardH,
    sheetW,
    sheetH,
    labelH,
    rulerH,
    editing,
    onEditStart,
    onChangeLine,
    onEditEnd,
    onEditCancel,
  } = props

  const canvasRef = useRef(null)
  const scopeRef = useRef(null)
  const dragRef = useRef(null)
  const pendingRef = useRef({ raf: 0, patch: null })
  const lastClickRef = useRef({ time: 0, id: null })
  const [sceneTick, setSceneTick] = useState(0)
  const stateRef = useRef({})
  stateRef.current = {
    composition,
    measured,
    selection,
    onSelect,
    onObjectContextMenu,
    onPatchLine,
    onLivePatch,
    onLivePatchFrame,
    onLiveCommit,
    onEditStart,
    editing,
    px,
    tile,
    trimW,
    trimH,
    contentW,
    contentH,
    overlap,
    duplicateStrip: joinDuplicates(join) && overlap > 0,
  }

  const duplicateStrip = joinDuplicates(join) && overlap > 0
  const alignRecut = join === JOIN_ALIGN_RECUT
  const sliceW = duplicateStrip ? trimW : contentW
  const sliceH = tile && !duplicateStrip ? contentH : trimH

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || scopeRef.current) return undefined
    const scope = new paper.PaperScope()
    scope.setup(canvas)
    scopeRef.current = scope
    canvas._paperScope = scope
    const tool = new scope.Tool()

    const pick = (point) => {
      const hit = scope.project.hitTest(point, {
        fill: true,
        stroke: true,
        tolerance: 6,
        match: (result) => Boolean(tagged(result.item)),
      })
      return hit ? tagged(hit.item) : null
    }

    const flushPending = (next) => {
      if (!next) return
      const s = stateRef.current
      if (next.kind === 'frame') {
        s.onLivePatchFrame?.(next.widthIn, next.heightIn)
        return
      }
      const apply = s.onLivePatch ?? s.onPatchLine
      apply?.(next.id, next.patch)
    }

    const queuePatch = (next) => {
      pendingRef.current.patch = next
      if (pendingRef.current.raf) return
      pendingRef.current.raf = requestAnimationFrame(() => {
        pendingRef.current.raf = 0
        const queued = pendingRef.current.patch
        pendingRef.current.patch = null
        flushPending(queued)
      })
    }

    const schedulePatch = (id, patch) => queuePatch({ kind: 'line', id, patch })
    const scheduleFrame = (widthIn, heightIn) => queuePatch({ kind: 'frame', widthIn, heightIn })

    const flushPatch = () => {
      if (pendingRef.current.raf) cancelAnimationFrame(pendingRef.current.raf)
      pendingRef.current.raf = 0
      const next = pendingRef.current.patch
      pendingRef.current.patch = null
      flushPending(next)
    }

    const runButton = (kind, lineId) => {
      const s = stateRef.current
      const box = s.measured?.lineBoxes?.find((entry) => entry.id === lineId)
      if (!box || typeof s.onPatchLine !== 'function') return
      const place = box.line.place || { mode: 'snap', dxIn: 0, dyIn: 0 }
      if (kind === 'snap') {
        const snapping = (place.mode || 'snap') !== 'free'
        s.onPatchLine(lineId, { place: { ...place, mode: snapping ? 'free' : 'snap' } })
        return
      }
      const autoX = box.x - (Number(place.dxIn) || 0)
      const autoY = box.y - (Number(place.dyIn) || 0)
      const patch = kind === 'center-x'
        ? { dxIn: Math.round(((s.measured.width - box.width) / 2 - autoX) * 100) / 100 }
        : { dyIn: Math.round(((s.measured.height - box.height) / 2 - autoY) * 100) / 100 }
      s.onPatchLine(lineId, { place: { ...place, mode: 'snap', ...patch } })
    }

    const selectTarget = (target, additive) => {
      const s = stateRef.current
      s.onSelect?.(nextSelection(s.selection, target, additive))
    }

    const finish = (event) => {
      const drag = dragRef.current
      if (!drag) return
      dragRef.current = null
      const s = stateRef.current
      const shift = Boolean(event?.modifiers?.shift)
      canvas.style.cursor = 'default'
      if (drag.kind === 'empty' || drag.kind === 'frame') {
        if (!shift) selectTarget({ kind: 'container', id: s.composition.container.id }, false)
        return
      }
      if (drag.kind === 'frame-resize') {
        if (drag.moved) {
          flushPatch()
          s.onLiveCommit?.()
          setSceneTick((tick) => tick + 1)
        }
        selectTarget({ kind: 'container', id: s.composition.container.id }, shift)
        return
      }
      if (drag.kind === 'stack') {
        selectTarget({ kind: 'stack', id: drag.stackId }, shift)
        return
      }
      if (!drag.id) return
      if (BUTTONS.has(drag.kind)) {
        selectTarget({ kind: 'line', id: drag.id }, shift)
        runButton(drag.kind, drag.id)
        return
      }
      if (drag.moved) {
        flushPatch()
        s.onLiveCommit?.(drag.id)
        setSceneTick((tick) => tick + 1)
        return
      }
      if (drag.pendingEdit) {
        selectTarget({ kind: 'line', id: drag.id }, false)
        s.onEditStart?.(drag.id, drag.sheetIndex ?? 0)
        return
      }
      selectTarget({ kind: 'line', id: drag.id }, shift)
      lastClickRef.current = { time: performance.now(), id: drag.id }
    }

    tool.onMouseDown = (event) => {
      const button = event.event?.button
      if (button === 1 || button === 2) return
      const s = stateRef.current
      if (s.editing) return
      const node = pick(event.point)
      if (!node) {
        dragRef.current = { kind: 'empty' }
        return
      }
      if (node.data.role === 'sheet' || node.data.role === 'frame') {
        dragRef.current = { kind: 'frame' }
        return
      }
      if (node.data.role === 'stack') {
        dragRef.current = { kind: 'stack', stackId: node.data.stackId }
        return
      }
      const handle = node.data.role === 'handle' ? node.data.handle : 'move'
      if (handle === 'frame-resize') {
        const origin = node.data.origin
        dragRef.current = {
          id: s.composition.container.id,
          kind: 'frame-resize',
          origin,
          hugHeight: s.measured?.contentHeight ?? s.measured?.height ?? 0,
          startX: event.point.x,
          startY: event.point.y,
          px: s.px,
          moved: false,
        }
        selectTarget({ kind: 'container', id: s.composition.container.id }, Boolean(event.modifiers?.shift))
        return
      }
      const lineId = node.data.lineId
      const now = performance.now()
      const pendingEdit = handle === 'move'
        && !event.modifiers?.shift
        && lastClickRef.current.id === lineId
        && now - lastClickRef.current.time < 350
      if (pendingEdit) lastClickRef.current = { time: 0, id: null }
      const box = s.measured?.lineBoxes?.find((entry) => entry.id === lineId)
      if (!box) return
      const place = box.line.place || { mode: 'snap', dxIn: 0, dyIn: 0 }
      const center = node.data.center
      dragRef.current = {
        id: lineId,
        kind: handle,
        sheetIndex: node.data.sheetIndex ?? 0,
        pendingEdit,
        startX: event.point.x,
        startY: event.point.y,
        center,
        startAng: center
          ? (Math.atan2(event.point.y - center.y, event.point.x - center.x) * 180) / Math.PI
          : 0,
        autoX: box.x - (Number(place.dxIn) || 0),
        autoY: box.y - (Number(place.dyIn) || 0),
        baseDx: Number(place.dxIn) || 0,
        baseDy: Number(place.dyIn) || 0,
        baseH: Number(box.line.glyphHeight) || MIN_GLYPH_HEIGHT,
        baseDeg: Number(box.line.rotationDeg) || 0,
        snap: (place.mode || 'snap') !== 'free',
        px: s.px,
        moved: false,
        parts: null,
      }
    }

    tool.onMouseDrag = (event) => {
      const drag = dragRef.current
      if (!drag?.id || BUTTONS.has(drag.kind)) return
      const dxPx = event.point.x - drag.startX
      const dyPx = event.point.y - drag.startY
      if (drag.kind === 'frame-resize') {
        if (!drag.moved) {
          if (Math.abs(dxPx) + Math.abs(dyPx) <= 3) return
          drag.moved = true
          canvas.style.cursor = 'nwse-resize'
        }
        const s = stateRef.current
        const origin = drag.origin
        const widthIn = (event.point.x - origin.x) / drag.px
        const heightIn = (event.point.y - origin.y) / drag.px
        scheduleFrame(widthIn, heightIn)
        return
      }
      if (!drag.moved) {
        if (Math.abs(dxPx) + Math.abs(dyPx) <= 3) return
        drag.moved = true
        drag.pendingEdit = false
        drag.parts = captureParts(scope, drag.id)
        if (!drag.parts.length) return
        selectTarget({ kind: 'line', id: drag.id }, false)
        canvas.style.cursor = 'grabbing'
      }
      if (!drag.parts?.length) return
      const patch = applyGesture(drag, event.point, Boolean(event.modifiers?.shift))
      schedulePatch(drag.id, patch)
    }

    tool.onMouseUp = (event) => finish(event)
    tool.onMouseMove = (event) => {
      if (dragRef.current?.moved) return
      const node = pick(event.point)
      const handle = node?.data?.role === 'handle' ? node.data.handle : node?.data?.lineId ? 'move' : null
      const cursor = handle === 'resize' || handle === 'frame-resize'
        ? 'nwse-resize'
        : handle === 'rotate'
          ? 'grab'
          : handle === 'move'
            ? 'grab'
            : BUTTONS.has(handle)
              ? 'pointer'
              : 'default'
      canvas.style.cursor = cursor
    }

    const onWindowUp = (event) => finish({ modifiers: { shift: Boolean(event.shiftKey) } })
    const onContextMenu = (event) => {
      event.preventDefault()
      const s = stateRef.current
      if (!s.onObjectContextMenu) return
      const rect = canvas.getBoundingClientRect()
      const point = scope.view.viewToProject(
        new scope.Point(event.clientX - rect.left, event.clientY - rect.top),
      )
      const node = pick(point)
      let target = { kind: 'container', id: s.composition.container.id }
      if (node?.data?.role === 'stack') target = { kind: 'stack', id: node.data.stackId }
      else if (node?.data?.lineId) target = { kind: 'line', id: node.data.lineId }
      s.onObjectContextMenu({
        x: event.clientX,
        y: event.clientY,
        target,
        shift: event.shiftKey,
      })
    }
    window.addEventListener('mouseup', onWindowUp)
    canvas.addEventListener('contextmenu', onContextMenu)
    return () => {
      window.removeEventListener('mouseup', onWindowUp)
      canvas.removeEventListener('contextmenu', onContextMenu)
      tool.remove()
      scope.remove()
      scopeRef.current = null
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const scope = scopeRef.current
    if (!canvas || !scope || boardW <= 0 || boardH <= 0) return
    if (dragRef.current?.moved && dragRef.current.kind !== 'frame-resize') return
    scope.activate()
    scope.view.viewSize = new scope.Size(Math.max(1, boardW), Math.max(1, boardH))
    drawScene(scope, {
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
      rows,
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
      sheetGap,
      rulerH,
      sheetW,
      sheetH,
      labelH,
      editingLineId: editing?.lineId ?? null,
    })
  }, [
    sceneTick,
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
    editing,
    cols,
    rows,
    tile,
    margins,
    pageW,
    pageH,
    trimW,
    trimH,
    contentW,
    contentH,
    pitchX,
    sheetGap,
    rulerH,
    sheetW,
    sheetH,
    labelH,
    duplicateStrip,
    alignRecut,
    sliceW,
    sliceH,
  ])

  const editBox = (() => {
    if (!editing || !measured) return null
    const box = measured.lineBoxes.find((entry) => entry.id === editing.lineId)
    const line = findLine(composition, editing.lineId)
    const sheet = sheets.find((entry) => entry.index === editing.hostId) ?? sheets[0]
    if (!box || !line || !sheet) return null
    const stride = stacked ? contentH * px : sheetH + labelH + sheetGap
    const page = pageBoardOrigin(sheet, pitchX, rulerH, stride)
    const pad = frameOffset(
      composition,
      measured,
      coveredSpan(cols, trimW, contentW, duplicateStrip) || sliceW,
      sliceH,
    )
    const left = page.x + margins.left * px + pad.x * px + (box.x - sheet.originX) * px
    const top = page.y + margins.top * px + pad.y * px + (box.y - sheet.originY) * px
    return {
      left,
      top,
      width: Math.max(px, box.width * px),
      height: box.height * px,
      line,
    }
  })()

  return (
    <div className="relative" style={{ width: boardW, height: boardH }}>
      <canvas
        ref={canvasRef}
        aria-label="Banner preview"
        onContextMenu={(event) => event.preventDefault()}
        style={{ width: boardW, height: boardH, display: 'block', touchAction: 'none' }}
      />
      {editBox && (
        <div
          style={{
            position: 'absolute',
            left: editBox.left,
            top: editBox.top,
            width: editBox.width,
            height: editBox.height,
            overflow: 'visible',
            zIndex: 5,
          }}
        >
          <EditField
            line={editBox.line}
            width={editBox.width}
            height={editBox.height}
            px={px}
            onChange={(copy) => onChangeLine?.(editBox.line.id, copy)}
            onCommit={() => onEditEnd?.()}
            onCancel={() => onEditCancel?.()}
          />
        </div>
      )}
    </div>
  )
}
