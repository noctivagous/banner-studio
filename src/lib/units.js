export const UNITS = [
  { id: 'in', label: 'in', perInch: 1, digits: 2 },
  { id: 'cm', label: 'cm', perInch: 2.54, digits: 2 },
  { id: 'mm', label: 'mm', perInch: 25.4, digits: 1 },
  { id: 'pt', label: 'pt', perInch: 72, digits: 1 },
  { id: 'pica', label: 'pica', perInch: 6, digits: 2 },
]

const UNIT_IDS = UNITS.map((unit) => unit.id)

export function normalizeUnit(value) {
  return UNIT_IDS.includes(value) ? value : 'in'
}

export function unitSpec(unit) {
  return UNITS.find((entry) => entry.id === normalizeUnit(unit))
}

export function inchesToUnit(inches, unit) {
  return Number(inches) * unitSpec(unit).perInch
}

export function unitToInches(value, unit) {
  return Number(value) / unitSpec(unit).perInch
}

export function formatMeasure(inches, unit) {
  const spec = unitSpec(unit)
  return inchesToUnit(inches, spec.id).toFixed(spec.digits)
}

export function formatSize(widthIn, heightIn, unit) {
  const spec = unitSpec(unit)
  return `${formatMeasure(widthIn, spec.id)}×${formatMeasure(heightIn, spec.id)} ${spec.label}`
}
