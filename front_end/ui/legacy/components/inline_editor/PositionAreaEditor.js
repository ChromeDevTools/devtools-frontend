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
export var Mode;
(function (Mode) {
    Mode["PHYSICAL"] = "physical";
    Mode["COORDINATE"] = "coordinate";
    Mode["LOGICAL"] = "logical";
    Mode["AUTO"] = "auto";
})(Mode || (Mode = {}));
export var Axis;
(function (Axis) {
    Axis["BLOCK"] = "block";
    Axis["INLINE"] = "inline";
})(Axis || (Axis = {}));
export var Keyword;
(function (Keyword) {
    Keyword["TOP"] = "top";
    Keyword["BOTTOM"] = "bottom";
    Keyword["LEFT"] = "left";
    Keyword["RIGHT"] = "right";
    Keyword["SPAN_TOP"] = "span-top";
    Keyword["SPAN_BOTTOM"] = "span-bottom";
    Keyword["SPAN_LEFT"] = "span-left";
    Keyword["SPAN_RIGHT"] = "span-right";
    Keyword["Y_START"] = "y-start";
    Keyword["Y_END"] = "y-end";
    Keyword["X_START"] = "x-start";
    Keyword["X_END"] = "x-end";
    Keyword["SPAN_Y_START"] = "span-y-start";
    Keyword["SPAN_Y_END"] = "span-y-end";
    Keyword["SPAN_X_START"] = "span-x-start";
    Keyword["SPAN_X_END"] = "span-x-end";
    Keyword["BLOCK_START"] = "block-start";
    Keyword["BLOCK_END"] = "block-end";
    Keyword["INLINE_START"] = "inline-start";
    Keyword["INLINE_END"] = "inline-end";
    Keyword["SPAN_BLOCK_START"] = "span-block-start";
    Keyword["SPAN_BLOCK_END"] = "span-block-end";
    Keyword["SPAN_INLINE_START"] = "span-inline-start";
    Keyword["SPAN_INLINE_END"] = "span-inline-end";
    Keyword["SELF_BLOCK_START"] = "self-block-start";
    Keyword["SELF_BLOCK_END"] = "self-block-end";
    Keyword["SELF_INLINE_START"] = "self-inline-start";
    Keyword["SELF_INLINE_END"] = "self-inline-end";
    Keyword["SPAN_SELF_BLOCK_START"] = "span-self-block-start";
    Keyword["SPAN_SELF_BLOCK_END"] = "span-self-block-end";
    Keyword["SPAN_SELF_INLINE_START"] = "span-self-inline-start";
    Keyword["SPAN_SELF_INLINE_END"] = "span-self-inline-end";
    Keyword["Y_SELF_START"] = "self-y-start";
    Keyword["Y_SELF_END"] = "self-y-end";
    Keyword["X_SELF_START"] = "self-x-start";
    Keyword["X_SELF_END"] = "self-x-end";
    Keyword["SPAN_Y_SELF_START"] = "span-self-y-start";
    Keyword["SPAN_Y_SELF_END"] = "span-self-y-end";
    Keyword["SPAN_X_SELF_START"] = "span-self-x-start";
    Keyword["SPAN_X_SELF_END"] = "span-self-x-end";
    Keyword["CENTER"] = "center";
    Keyword["SPAN_ALL"] = "span-all";
    Keyword["START"] = "start";
    Keyword["END"] = "end";
    Keyword["SPAN_START"] = "span-start";
    Keyword["SPAN_END"] = "span-end";
    Keyword["SELF_START"] = "self-start";
    Keyword["SELF_END"] = "self-end";
    Keyword["SPAN_SELF_START"] = "span-self-start";
    Keyword["SPAN_SELF_END"] = "span-self-end";
})(Keyword || (Keyword = {}));
const KEYWORD_DEFS = {
    // Physical block
    ["top" /* Keyword.TOP */]: { axis: "block" /* Axis.BLOCK */, start: 0, end: 0, mode: "physical" /* Mode.PHYSICAL */, self: false },
    ["bottom" /* Keyword.BOTTOM */]: { axis: "block" /* Axis.BLOCK */, start: 2, end: 2, mode: "physical" /* Mode.PHYSICAL */, self: false },
    ["span-top" /* Keyword.SPAN_TOP */]: { axis: "block" /* Axis.BLOCK */, start: 0, end: 1, mode: "physical" /* Mode.PHYSICAL */, self: false },
    ["span-bottom" /* Keyword.SPAN_BOTTOM */]: { axis: "block" /* Axis.BLOCK */, start: 1, end: 2, mode: "physical" /* Mode.PHYSICAL */, self: false },
    // Physical inline
    ["left" /* Keyword.LEFT */]: { axis: "inline" /* Axis.INLINE */, start: 0, end: 0, mode: "physical" /* Mode.PHYSICAL */, self: false },
    ["right" /* Keyword.RIGHT */]: { axis: "inline" /* Axis.INLINE */, start: 2, end: 2, mode: "physical" /* Mode.PHYSICAL */, self: false },
    ["span-left" /* Keyword.SPAN_LEFT */]: { axis: "inline" /* Axis.INLINE */, start: 0, end: 1, mode: "physical" /* Mode.PHYSICAL */, self: false },
    ["span-right" /* Keyword.SPAN_RIGHT */]: { axis: "inline" /* Axis.INLINE */, start: 1, end: 2, mode: "physical" /* Mode.PHYSICAL */, self: false },
    // Coordinate block
    ["y-start" /* Keyword.Y_START */]: { axis: "block" /* Axis.BLOCK */, start: 0, end: 0, mode: "coordinate" /* Mode.COORDINATE */, self: false },
    ["y-end" /* Keyword.Y_END */]: { axis: "block" /* Axis.BLOCK */, start: 2, end: 2, mode: "coordinate" /* Mode.COORDINATE */, self: false },
    ["span-y-start" /* Keyword.SPAN_Y_START */]: { axis: "block" /* Axis.BLOCK */, start: 0, end: 1, mode: "coordinate" /* Mode.COORDINATE */, self: false },
    ["span-y-end" /* Keyword.SPAN_Y_END */]: { axis: "block" /* Axis.BLOCK */, start: 1, end: 2, mode: "coordinate" /* Mode.COORDINATE */, self: false },
    ["self-y-start" /* Keyword.Y_SELF_START */]: { axis: "block" /* Axis.BLOCK */, start: 0, end: 0, mode: "coordinate" /* Mode.COORDINATE */, self: true },
    ["self-y-end" /* Keyword.Y_SELF_END */]: { axis: "block" /* Axis.BLOCK */, start: 2, end: 2, mode: "coordinate" /* Mode.COORDINATE */, self: true },
    ["span-self-y-start" /* Keyword.SPAN_Y_SELF_START */]: { axis: "block" /* Axis.BLOCK */, start: 0, end: 1, mode: "coordinate" /* Mode.COORDINATE */, self: true },
    ["span-self-y-end" /* Keyword.SPAN_Y_SELF_END */]: { axis: "block" /* Axis.BLOCK */, start: 1, end: 2, mode: "coordinate" /* Mode.COORDINATE */, self: true },
    // Coordinate inline
    ["x-start" /* Keyword.X_START */]: { axis: "inline" /* Axis.INLINE */, start: 0, end: 0, mode: "coordinate" /* Mode.COORDINATE */, self: false },
    ["x-end" /* Keyword.X_END */]: { axis: "inline" /* Axis.INLINE */, start: 2, end: 2, mode: "coordinate" /* Mode.COORDINATE */, self: false },
    ["span-x-start" /* Keyword.SPAN_X_START */]: { axis: "inline" /* Axis.INLINE */, start: 0, end: 1, mode: "coordinate" /* Mode.COORDINATE */, self: false },
    ["span-x-end" /* Keyword.SPAN_X_END */]: { axis: "inline" /* Axis.INLINE */, start: 1, end: 2, mode: "coordinate" /* Mode.COORDINATE */, self: false },
    ["self-x-start" /* Keyword.X_SELF_START */]: { axis: "inline" /* Axis.INLINE */, start: 0, end: 0, mode: "coordinate" /* Mode.COORDINATE */, self: true },
    ["self-x-end" /* Keyword.X_SELF_END */]: { axis: "inline" /* Axis.INLINE */, start: 2, end: 2, mode: "coordinate" /* Mode.COORDINATE */, self: true },
    ["span-self-x-start" /* Keyword.SPAN_X_SELF_START */]: { axis: "inline" /* Axis.INLINE */, start: 0, end: 1, mode: "coordinate" /* Mode.COORDINATE */, self: true },
    ["span-self-x-end" /* Keyword.SPAN_X_SELF_END */]: { axis: "inline" /* Axis.INLINE */, start: 1, end: 2, mode: "coordinate" /* Mode.COORDINATE */, self: true },
    // Logical block
    ["block-start" /* Keyword.BLOCK_START */]: { axis: "block" /* Axis.BLOCK */, start: 0, end: 0, mode: "logical" /* Mode.LOGICAL */, self: false },
    ["block-end" /* Keyword.BLOCK_END */]: { axis: "block" /* Axis.BLOCK */, start: 2, end: 2, mode: "logical" /* Mode.LOGICAL */, self: false },
    ["span-block-start" /* Keyword.SPAN_BLOCK_START */]: { axis: "block" /* Axis.BLOCK */, start: 0, end: 1, mode: "logical" /* Mode.LOGICAL */, self: false },
    ["span-block-end" /* Keyword.SPAN_BLOCK_END */]: { axis: "block" /* Axis.BLOCK */, start: 1, end: 2, mode: "logical" /* Mode.LOGICAL */, self: false },
    ["self-block-start" /* Keyword.SELF_BLOCK_START */]: { axis: "block" /* Axis.BLOCK */, start: 0, end: 0, mode: "logical" /* Mode.LOGICAL */, self: true },
    ["self-block-end" /* Keyword.SELF_BLOCK_END */]: { axis: "block" /* Axis.BLOCK */, start: 2, end: 2, mode: "logical" /* Mode.LOGICAL */, self: true },
    ["span-self-block-start" /* Keyword.SPAN_SELF_BLOCK_START */]: { axis: "block" /* Axis.BLOCK */, start: 0, end: 1, mode: "logical" /* Mode.LOGICAL */, self: true },
    ["span-self-block-end" /* Keyword.SPAN_SELF_BLOCK_END */]: { axis: "block" /* Axis.BLOCK */, start: 1, end: 2, mode: "logical" /* Mode.LOGICAL */, self: true },
    // Logical inline
    ["inline-start" /* Keyword.INLINE_START */]: { axis: "inline" /* Axis.INLINE */, start: 0, end: 0, mode: "logical" /* Mode.LOGICAL */, self: false },
    ["inline-end" /* Keyword.INLINE_END */]: { axis: "inline" /* Axis.INLINE */, start: 2, end: 2, mode: "logical" /* Mode.LOGICAL */, self: false },
    ["span-inline-start" /* Keyword.SPAN_INLINE_START */]: { axis: "inline" /* Axis.INLINE */, start: 0, end: 1, mode: "logical" /* Mode.LOGICAL */, self: false },
    ["span-inline-end" /* Keyword.SPAN_INLINE_END */]: { axis: "inline" /* Axis.INLINE */, start: 1, end: 2, mode: "logical" /* Mode.LOGICAL */, self: false },
    ["self-inline-start" /* Keyword.SELF_INLINE_START */]: { axis: "inline" /* Axis.INLINE */, start: 0, end: 0, mode: "logical" /* Mode.LOGICAL */, self: true },
    ["self-inline-end" /* Keyword.SELF_INLINE_END */]: { axis: "inline" /* Axis.INLINE */, start: 2, end: 2, mode: "logical" /* Mode.LOGICAL */, self: true },
    ["span-self-inline-start" /* Keyword.SPAN_SELF_INLINE_START */]: { axis: "inline" /* Axis.INLINE */, start: 0, end: 1, mode: "logical" /* Mode.LOGICAL */, self: true },
    ["span-self-inline-end" /* Keyword.SPAN_SELF_INLINE_END */]: { axis: "inline" /* Axis.INLINE */, start: 1, end: 2, mode: "logical" /* Mode.LOGICAL */, self: true },
    // Auto / Ambiguous
    ["center" /* Keyword.CENTER */]: { start: 1, end: 1, mode: "auto" /* Mode.AUTO */, self: false },
    ["span-all" /* Keyword.SPAN_ALL */]: { start: 0, end: 2, mode: "auto" /* Mode.AUTO */, self: false },
    ["start" /* Keyword.START */]: { start: 0, end: 0, mode: "auto" /* Mode.AUTO */, self: false },
    ["end" /* Keyword.END */]: { start: 2, end: 2, mode: "auto" /* Mode.AUTO */, self: false },
    ["span-start" /* Keyword.SPAN_START */]: { start: 0, end: 1, mode: "auto" /* Mode.AUTO */, self: false },
    ["span-end" /* Keyword.SPAN_END */]: { start: 1, end: 2, mode: "auto" /* Mode.AUTO */, self: false },
    ["self-start" /* Keyword.SELF_START */]: { start: 0, end: 0, mode: "auto" /* Mode.AUTO */, self: true },
    ["self-end" /* Keyword.SELF_END */]: { start: 2, end: 2, mode: "auto" /* Mode.AUTO */, self: true },
    ["span-self-start" /* Keyword.SPAN_SELF_START */]: { start: 0, end: 1, mode: "auto" /* Mode.AUTO */, self: true },
    ["span-self-end" /* Keyword.SPAN_SELF_END */]: { start: 1, end: 2, mode: "auto" /* Mode.AUTO */, self: true },
};
const KEYWORD_MAP = new Map(Object.entries(KEYWORD_DEFS));
function isGeneric(axis) {
    return (axis.start === 0 && axis.end === 2) || (axis.start === 1 && axis.end === 1);
}
export function parsePositionArea(text) {
    const tokens = text.trim().split(/\s+/).filter(t => t.length > 0);
    if (tokens.length === 0 || tokens.length > 2) {
        return null;
    }
    const first = KEYWORD_MAP.get(tokens[0]);
    const second = KEYWORD_MAP.get(tokens[1] ?? (tokens[0] === "center" /* Keyword.CENTER */ ? "center" /* Keyword.CENTER */ : "span-all" /* Keyword.SPAN_ALL */));
    if (!first || !second) {
        return null;
    }
    if (first.axis && second.axis && first.axis === second.axis) {
        return null;
    }
    const primaryAxis = first.axis ?? (second.axis === "block" /* Axis.BLOCK */ ? "inline" /* Axis.INLINE */ : "block" /* Axis.BLOCK */);
    const firstMode = isGeneric(first) && !isGeneric(second) ? second.mode : first.mode;
    const secondMode = isGeneric(second) && !isGeneric(first) ? first.mode : second.mode;
    return {
        first: { start: first.start, end: first.end, mode: firstMode, self: first.self },
        second: { start: second.start, end: second.end, mode: secondMode, self: second.self },
        primaryAxis,
    };
}
function axisToKeyword(axis, axisType) {
    if (axis.start === 0 && axis.end === 2) {
        return "span-all" /* Keyword.SPAN_ALL */;
    }
    if (axis.start === 1 && axis.end === 1) {
        return "center" /* Keyword.CENTER */;
    }
    for (const [kw, def] of KEYWORD_MAP) {
        if (def.start === axis.start && def.end === axis.end && def.mode === axis.mode && def.self === axis.self &&
            (def.axis === undefined || def.axis === axisType)) {
            return kw;
        }
    }
    return null;
}
export function stringifyPositionArea(area) {
    const firstAxis = area.primaryAxis;
    const secondAxis = area.primaryAxis === "inline" /* Axis.INLINE */ ? "block" /* Axis.BLOCK */ : "inline" /* Axis.INLINE */;
    const firstKw = axisToKeyword(area.first, firstAxis);
    const secondKw = axisToKeyword(area.second, secondAxis);
    if (!firstKw || !secondKw) {
        return '';
    }
    if (firstKw === "center" /* Keyword.CENTER */ && secondKw === "center" /* Keyword.CENTER */) {
        return "center" /* Keyword.CENTER */;
    }
    if (secondKw === "span-all" /* Keyword.SPAN_ALL */) {
        return firstKw;
    }
    return `${firstKw} ${secondKw}`;
}
//# sourceMappingURL=PositionAreaEditor.js.map