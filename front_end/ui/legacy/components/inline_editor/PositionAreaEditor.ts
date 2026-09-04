// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * Valid combinations of (Mode, Self) across axes according to the CSS Anchor Positioning specification
 * (https://drafts.csswg.org/css-anchor-position-1/#typedef-position-area):
 *
 * 1. `center` and `span-all` are universal wildcards present in all categories and can pair with ANY
 *    mode and self setting on the opposite axis (e.g., `top center`, `self-block-start center`).
 *
 * 2. When both axes specify a direction (neither is `center` or `span-all`):
 *    - X/Y branch: Any X-axis keyword (`PHYSICAL`, `COORDINATE`, or `COORDINATE` with `self`) can pair
 *      with any Y-axis keyword (`PHYSICAL`, `COORDINATE`, or `COORDINATE` with `self`), e.g. `top left`,
 *      `top self-x-start`, `y-start self-x-start`, `self-y-start self-x-start`.
 *    - Logical:         (LOGICAL, false)    + (LOGICAL, false)    e.g. `block-start inline-start`
 *    - Logical Self:    (LOGICAL, true)     + (LOGICAL, true)     e.g. `self-block-start self-inline-start`
 *    - Auto:            (AUTO, false)       + (AUTO, false)       e.g. `start start`, `start end`
 *    - Auto Self:       (AUTO, true)        + (AUTO, true)        e.g. `self-start self-end`
 *
 * Key constraints:
 * - For `LOGICAL` and `AUTO`, `self` must match across both axes (`self + self` or `non-self + non-self`).
 * - For `PHYSICAL` and `COORDINATE`, `self` is independent per axis (`PHYSICAL` has no `self` variants).
 * - Cross-system mixing is forbidden (e.g. Physical/Coordinate cannot pair with Logical or non-center Auto).
 */
export const enum Mode {
  PHYSICAL = 'physical',
  COORDINATE = 'coordinate',
  LOGICAL = 'logical',
  AUTO = 'auto',
}

export const enum Axis {
  BLOCK = 'block',
  INLINE = 'inline',
}

export const enum Keyword {
  TOP = 'top',
  BOTTOM = 'bottom',
  LEFT = 'left',
  RIGHT = 'right',
  SPAN_TOP = 'span-top',
  SPAN_BOTTOM = 'span-bottom',
  SPAN_LEFT = 'span-left',
  SPAN_RIGHT = 'span-right',
  Y_START = 'y-start',
  Y_END = 'y-end',
  X_START = 'x-start',
  X_END = 'x-end',
  SPAN_Y_START = 'span-y-start',
  SPAN_Y_END = 'span-y-end',
  SPAN_X_START = 'span-x-start',
  SPAN_X_END = 'span-x-end',
  BLOCK_START = 'block-start',
  BLOCK_END = 'block-end',
  INLINE_START = 'inline-start',
  INLINE_END = 'inline-end',
  SPAN_BLOCK_START = 'span-block-start',
  SPAN_BLOCK_END = 'span-block-end',
  SPAN_INLINE_START = 'span-inline-start',
  SPAN_INLINE_END = 'span-inline-end',
  SELF_BLOCK_START = 'self-block-start',
  SELF_BLOCK_END = 'self-block-end',
  SELF_INLINE_START = 'self-inline-start',
  SELF_INLINE_END = 'self-inline-end',
  SPAN_SELF_BLOCK_START = 'span-self-block-start',
  SPAN_SELF_BLOCK_END = 'span-self-block-end',
  SPAN_SELF_INLINE_START = 'span-self-inline-start',
  SPAN_SELF_INLINE_END = 'span-self-inline-end',
  Y_SELF_START = 'self-y-start',
  Y_SELF_END = 'self-y-end',
  X_SELF_START = 'self-x-start',
  X_SELF_END = 'self-x-end',
  SPAN_Y_SELF_START = 'span-self-y-start',
  SPAN_Y_SELF_END = 'span-self-y-end',
  SPAN_X_SELF_START = 'span-self-x-start',
  SPAN_X_SELF_END = 'span-self-x-end',
  CENTER = 'center',
  SPAN_ALL = 'span-all',
  START = 'start',
  END = 'end',
  SPAN_START = 'span-start',
  SPAN_END = 'span-end',
  SELF_START = 'self-start',
  SELF_END = 'self-end',
  SPAN_SELF_START = 'span-self-start',
  SPAN_SELF_END = 'span-self-end',
}

export interface GridAxis {
  // Start and end are values from 0 to 2, inclusive, marking an interval on the position-area grid axis
  start: number;
  end: number;
  mode: Mode;
  self: boolean;
}

export interface Area {
  first: GridAxis;
  second: GridAxis;
  primaryAxis: Axis;
}

const KEYWORD_DEFS: Record<Keyword, GridAxis&{axis?: Axis}> = {
  // Physical block
  [Keyword.TOP]: {axis: Axis.BLOCK, start: 0, end: 0, mode: Mode.PHYSICAL, self: false},
  [Keyword.BOTTOM]: {axis: Axis.BLOCK, start: 2, end: 2, mode: Mode.PHYSICAL, self: false},
  [Keyword.SPAN_TOP]: {axis: Axis.BLOCK, start: 0, end: 1, mode: Mode.PHYSICAL, self: false},
  [Keyword.SPAN_BOTTOM]: {axis: Axis.BLOCK, start: 1, end: 2, mode: Mode.PHYSICAL, self: false},

  // Physical inline
  [Keyword.LEFT]: {axis: Axis.INLINE, start: 0, end: 0, mode: Mode.PHYSICAL, self: false},
  [Keyword.RIGHT]: {axis: Axis.INLINE, start: 2, end: 2, mode: Mode.PHYSICAL, self: false},
  [Keyword.SPAN_LEFT]: {axis: Axis.INLINE, start: 0, end: 1, mode: Mode.PHYSICAL, self: false},
  [Keyword.SPAN_RIGHT]: {axis: Axis.INLINE, start: 1, end: 2, mode: Mode.PHYSICAL, self: false},

  // Coordinate block
  [Keyword.Y_START]: {axis: Axis.BLOCK, start: 0, end: 0, mode: Mode.COORDINATE, self: false},
  [Keyword.Y_END]: {axis: Axis.BLOCK, start: 2, end: 2, mode: Mode.COORDINATE, self: false},
  [Keyword.SPAN_Y_START]: {axis: Axis.BLOCK, start: 0, end: 1, mode: Mode.COORDINATE, self: false},
  [Keyword.SPAN_Y_END]: {axis: Axis.BLOCK, start: 1, end: 2, mode: Mode.COORDINATE, self: false},
  [Keyword.Y_SELF_START]: {axis: Axis.BLOCK, start: 0, end: 0, mode: Mode.COORDINATE, self: true},
  [Keyword.Y_SELF_END]: {axis: Axis.BLOCK, start: 2, end: 2, mode: Mode.COORDINATE, self: true},
  [Keyword.SPAN_Y_SELF_START]: {axis: Axis.BLOCK, start: 0, end: 1, mode: Mode.COORDINATE, self: true},
  [Keyword.SPAN_Y_SELF_END]: {axis: Axis.BLOCK, start: 1, end: 2, mode: Mode.COORDINATE, self: true},

  // Coordinate inline
  [Keyword.X_START]: {axis: Axis.INLINE, start: 0, end: 0, mode: Mode.COORDINATE, self: false},
  [Keyword.X_END]: {axis: Axis.INLINE, start: 2, end: 2, mode: Mode.COORDINATE, self: false},
  [Keyword.SPAN_X_START]: {axis: Axis.INLINE, start: 0, end: 1, mode: Mode.COORDINATE, self: false},
  [Keyword.SPAN_X_END]: {axis: Axis.INLINE, start: 1, end: 2, mode: Mode.COORDINATE, self: false},
  [Keyword.X_SELF_START]: {axis: Axis.INLINE, start: 0, end: 0, mode: Mode.COORDINATE, self: true},
  [Keyword.X_SELF_END]: {axis: Axis.INLINE, start: 2, end: 2, mode: Mode.COORDINATE, self: true},
  [Keyword.SPAN_X_SELF_START]: {axis: Axis.INLINE, start: 0, end: 1, mode: Mode.COORDINATE, self: true},
  [Keyword.SPAN_X_SELF_END]: {axis: Axis.INLINE, start: 1, end: 2, mode: Mode.COORDINATE, self: true},

  // Logical block
  [Keyword.BLOCK_START]: {axis: Axis.BLOCK, start: 0, end: 0, mode: Mode.LOGICAL, self: false},
  [Keyword.BLOCK_END]: {axis: Axis.BLOCK, start: 2, end: 2, mode: Mode.LOGICAL, self: false},
  [Keyword.SPAN_BLOCK_START]: {axis: Axis.BLOCK, start: 0, end: 1, mode: Mode.LOGICAL, self: false},
  [Keyword.SPAN_BLOCK_END]: {axis: Axis.BLOCK, start: 1, end: 2, mode: Mode.LOGICAL, self: false},
  [Keyword.SELF_BLOCK_START]: {axis: Axis.BLOCK, start: 0, end: 0, mode: Mode.LOGICAL, self: true},
  [Keyword.SELF_BLOCK_END]: {axis: Axis.BLOCK, start: 2, end: 2, mode: Mode.LOGICAL, self: true},
  [Keyword.SPAN_SELF_BLOCK_START]: {axis: Axis.BLOCK, start: 0, end: 1, mode: Mode.LOGICAL, self: true},
  [Keyword.SPAN_SELF_BLOCK_END]: {axis: Axis.BLOCK, start: 1, end: 2, mode: Mode.LOGICAL, self: true},

  // Logical inline
  [Keyword.INLINE_START]: {axis: Axis.INLINE, start: 0, end: 0, mode: Mode.LOGICAL, self: false},
  [Keyword.INLINE_END]: {axis: Axis.INLINE, start: 2, end: 2, mode: Mode.LOGICAL, self: false},
  [Keyword.SPAN_INLINE_START]: {axis: Axis.INLINE, start: 0, end: 1, mode: Mode.LOGICAL, self: false},
  [Keyword.SPAN_INLINE_END]: {axis: Axis.INLINE, start: 1, end: 2, mode: Mode.LOGICAL, self: false},
  [Keyword.SELF_INLINE_START]: {axis: Axis.INLINE, start: 0, end: 0, mode: Mode.LOGICAL, self: true},
  [Keyword.SELF_INLINE_END]: {axis: Axis.INLINE, start: 2, end: 2, mode: Mode.LOGICAL, self: true},
  [Keyword.SPAN_SELF_INLINE_START]: {axis: Axis.INLINE, start: 0, end: 1, mode: Mode.LOGICAL, self: true},
  [Keyword.SPAN_SELF_INLINE_END]: {axis: Axis.INLINE, start: 1, end: 2, mode: Mode.LOGICAL, self: true},

  // Auto / Ambiguous
  [Keyword.CENTER]: {start: 1, end: 1, mode: Mode.AUTO, self: false},
  [Keyword.SPAN_ALL]: {start: 0, end: 2, mode: Mode.AUTO, self: false},
  [Keyword.START]: {start: 0, end: 0, mode: Mode.AUTO, self: false},
  [Keyword.END]: {start: 2, end: 2, mode: Mode.AUTO, self: false},
  [Keyword.SPAN_START]: {start: 0, end: 1, mode: Mode.AUTO, self: false},
  [Keyword.SPAN_END]: {start: 1, end: 2, mode: Mode.AUTO, self: false},
  [Keyword.SELF_START]: {start: 0, end: 0, mode: Mode.AUTO, self: true},
  [Keyword.SELF_END]: {start: 2, end: 2, mode: Mode.AUTO, self: true},
  [Keyword.SPAN_SELF_START]: {start: 0, end: 1, mode: Mode.AUTO, self: true},
  [Keyword.SPAN_SELF_END]: {start: 1, end: 2, mode: Mode.AUTO, self: true},
};

const KEYWORD_MAP = new Map<string, GridAxis&{axis?: Axis}>(Object.entries(KEYWORD_DEFS));

function isGeneric(axis: GridAxis): boolean {
  return (axis.start === 0 && axis.end === 2) || (axis.start === 1 && axis.end === 1);
}

export function parsePositionArea(text: string): Area|null {
  const tokens = text.trim().split(/\s+/).filter(t => t.length > 0);
  if (tokens.length === 0 || tokens.length > 2) {
    return null;
  }

  const first = KEYWORD_MAP.get(tokens[0]);
  const second = KEYWORD_MAP.get(tokens[1] ?? (tokens[0] === Keyword.CENTER ? Keyword.CENTER : Keyword.SPAN_ALL));
  if (!first || !second) {
    return null;
  }

  if (first.axis && second.axis && first.axis === second.axis) {
    return null;
  }

  const primaryAxis = first.axis ?? (second.axis === Axis.BLOCK ? Axis.INLINE : Axis.BLOCK);
  const firstMode = isGeneric(first) && !isGeneric(second) ? second.mode : first.mode;
  const secondMode = isGeneric(second) && !isGeneric(first) ? first.mode : second.mode;

  return {
    first: {start: first.start, end: first.end, mode: firstMode, self: first.self},
    second: {start: second.start, end: second.end, mode: secondMode, self: second.self},
    primaryAxis,
  };
}

function axisToKeyword(axis: GridAxis, axisType: Axis): string|null {
  if (axis.start === 0 && axis.end === 2) {
    return Keyword.SPAN_ALL;
  }
  if (axis.start === 1 && axis.end === 1) {
    return Keyword.CENTER;
  }
  for (const [kw, def] of KEYWORD_MAP) {
    if (def.start === axis.start && def.end === axis.end && def.mode === axis.mode && def.self === axis.self &&
        (def.axis === undefined || def.axis === axisType)) {
      return kw;
    }
  }
  return null;
}

export function stringifyPositionArea(area: Area): string {
  const firstAxis = area.primaryAxis;
  const secondAxis = area.primaryAxis === Axis.INLINE ? Axis.BLOCK : Axis.INLINE;
  const firstKw = axisToKeyword(area.first, firstAxis);
  const secondKw = axisToKeyword(area.second, secondAxis);
  if (!firstKw || !secondKw) {
    return '';
  }
  if (firstKw === Keyword.CENTER && secondKw === Keyword.CENTER) {
    return Keyword.CENTER;
  }
  if (secondKw === Keyword.SPAN_ALL) {
    return firstKw;
  }
  return `${firstKw} ${secondKw}`;
}
