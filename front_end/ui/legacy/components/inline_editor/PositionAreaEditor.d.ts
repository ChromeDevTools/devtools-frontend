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
export declare const enum Mode {
    PHYSICAL = "physical",
    COORDINATE = "coordinate",
    LOGICAL = "logical",
    AUTO = "auto"
}
export declare const enum Axis {
    BLOCK = "block",
    INLINE = "inline"
}
export declare const enum Keyword {
    TOP = "top",
    BOTTOM = "bottom",
    LEFT = "left",
    RIGHT = "right",
    SPAN_TOP = "span-top",
    SPAN_BOTTOM = "span-bottom",
    SPAN_LEFT = "span-left",
    SPAN_RIGHT = "span-right",
    Y_START = "y-start",
    Y_END = "y-end",
    X_START = "x-start",
    X_END = "x-end",
    SPAN_Y_START = "span-y-start",
    SPAN_Y_END = "span-y-end",
    SPAN_X_START = "span-x-start",
    SPAN_X_END = "span-x-end",
    BLOCK_START = "block-start",
    BLOCK_END = "block-end",
    INLINE_START = "inline-start",
    INLINE_END = "inline-end",
    SPAN_BLOCK_START = "span-block-start",
    SPAN_BLOCK_END = "span-block-end",
    SPAN_INLINE_START = "span-inline-start",
    SPAN_INLINE_END = "span-inline-end",
    SELF_BLOCK_START = "self-block-start",
    SELF_BLOCK_END = "self-block-end",
    SELF_INLINE_START = "self-inline-start",
    SELF_INLINE_END = "self-inline-end",
    SPAN_SELF_BLOCK_START = "span-self-block-start",
    SPAN_SELF_BLOCK_END = "span-self-block-end",
    SPAN_SELF_INLINE_START = "span-self-inline-start",
    SPAN_SELF_INLINE_END = "span-self-inline-end",
    Y_SELF_START = "self-y-start",
    Y_SELF_END = "self-y-end",
    X_SELF_START = "self-x-start",
    X_SELF_END = "self-x-end",
    SPAN_Y_SELF_START = "span-self-y-start",
    SPAN_Y_SELF_END = "span-self-y-end",
    SPAN_X_SELF_START = "span-self-x-start",
    SPAN_X_SELF_END = "span-self-x-end",
    CENTER = "center",
    SPAN_ALL = "span-all",
    START = "start",
    END = "end",
    SPAN_START = "span-start",
    SPAN_END = "span-end",
    SELF_START = "self-start",
    SELF_END = "self-end",
    SPAN_SELF_START = "span-self-start",
    SPAN_SELF_END = "span-self-end"
}
export interface GridAxis {
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
export declare function parsePositionArea(text: string): Area | null;
export declare function stringifyPositionArea(area: Area): string;
