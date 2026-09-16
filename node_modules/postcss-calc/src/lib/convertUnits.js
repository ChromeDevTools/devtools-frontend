// Spec: https://www.w3.org/TR/css-values-4/#calc-type-checking

/**
 * @typedef {'length' | 'angle' | 'time' | 'frequency' | 'resolution' | 'flex' | 'percentage'} BaseType
 */

/** @type {Record<string, BaseType>} */
const UNIT_TO_BASE = {
  px: 'length',
  cm: 'length',
  mm: 'length',
  q: 'length',
  in: 'length',
  pt: 'length',
  pc: 'length',
  em: 'length',
  ex: 'length',
  ch: 'length',
  rem: 'length',
  lh: 'length',
  rlh: 'length',
  ic: 'length',
  cap: 'length',
  vw: 'length',
  vh: 'length',
  vmin: 'length',
  vmax: 'length',
  vb: 'length',
  vi: 'length',
  svw: 'length',
  svh: 'length',
  svmin: 'length',
  svmax: 'length',
  svb: 'length',
  svi: 'length',
  lvw: 'length',
  lvh: 'length',
  lvmin: 'length',
  lvmax: 'length',
  lvb: 'length',
  lvi: 'length',
  dvw: 'length',
  dvh: 'length',
  dvmin: 'length',
  dvmax: 'length',
  dvb: 'length',
  dvi: 'length',
  cqw: 'length',
  cqh: 'length',
  cqi: 'length',
  cqb: 'length',
  cqmin: 'length',
  cqmax: 'length',

  deg: 'angle',
  grad: 'angle',
  rad: 'angle',
  turn: 'angle',

  s: 'time',
  ms: 'time',

  hz: 'frequency',
  khz: 'frequency',

  dpi: 'resolution',
  dpcm: 'resolution',
  dppx: 'resolution',
  x: 'resolution',

  fr: 'flex',

  '%': 'percentage',
};

/**
 * @param {string} unit
 * @return {BaseType | null}
 */
function baseOf(unit) {
  return UNIT_TO_BASE[unit.toLowerCase()] ?? null;
}

// Conversion factors to each family's canonical unit. Units NOT listed
// (em, rem, vw, cqw, fr, % …) share a base type with something convertible
// but can't resolve statically — the simplifier preserves them as separate
// summands rather than merging.
/** @type {Record<string, number>} */
const TO_CANONICAL = {
  px: 1,
  cm: 96 / 2.54,
  mm: 96 / 25.4,
  q: 96 / 101.6,
  in: 96,
  pt: 96 / 72,
  pc: 16,
  deg: 1,
  grad: 0.9,
  rad: 180 / Math.PI,
  turn: 360,
  s: 1,
  ms: 0.001,
  hz: 1,
  khz: 1000,
  dppx: 1,
  dpi: 1 / 96,
  dpcm: 2.54 / 96,
  x: 1,
  // flex / percentage: identity — only combinable with the same unit.
  fr: 1,
  '%': 1,
};

/**
 * Convert a value within a single conversion family. Returns null when
 * either unit is missing from the table (em/rem/vw need runtime context)
 * or when the units belong to different base types.
 * @param {number} value
 * @param {string} from
 * @param {string} to
 * @return {number | null}
 */
function convert(value, from, to) {
  const fromKey = from.toLowerCase();
  const toKey = to.toLowerCase();
  if (fromKey === toKey) {
    return value;
  }
  const f = TO_CANONICAL[fromKey];
  const t = TO_CANONICAL[toKey];
  if (f === undefined || t === undefined) {
    return null;
  }
  // Cross-family guard: `px` and `s` both have entry 1, so without this
  // `convert(1, 'px', 's')` would silently return 1.
  if (UNIT_TO_BASE[fromKey] !== UNIT_TO_BASE[toKey]) {
    return null;
  }
  return (value * f) / t;
}

export { baseOf, convert };
