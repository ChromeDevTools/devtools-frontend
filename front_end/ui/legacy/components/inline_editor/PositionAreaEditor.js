// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Lit from '../../../../ui/lit/lit.js';
import * as UI from '../../legacy.js';
import positionAreaEditorStyles from './positionAreaEditor.css.js';
const UIStrings = {
    /**
     * @description Accessible description for the position-area grid editor explaining keyboard navigation and range selection.
     */
    positionAreaGridDescription: 'Use arrow keys to navigate, Space or Enter to select, and Shift + arrow keys to select a range.',
    /**
     * @description Accessible label for the position-area grid editor.
     */
    positionAreaGrid: 'position-area grid',
    /**
     * @description Title for the block axis section in the position-area editor.
     */
    block: 'Block',
    /**
     * @description Title for the inline axis section in the position-area editor.
     */
    inline: 'Inline',
    /**
     * @description Accessible label for the block axis mode radio button group.
     */
    blockAxisMode: 'Block axis mode',
    /**
     * @description Accessible label for the inline axis mode radio button group.
     */
    inlineAxisMode: 'Inline axis mode',
    /**
     * @description Label for physical mode radio button in the position-area editor.
     */
    physical: 'Physical',
    /**
     * @description Label for coordinate mode radio button in the position-area editor.
     */
    coordinate: 'Coordinate',
    /**
     * @description Label for logical mode radio button in the position-area editor.
     */
    logical: 'Logical',
    /**
     * @description Label for auto mode radio button in the position-area editor.
     */
    auto: 'Auto',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/inline_editor/PositionAreaEditor.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const { Directives, html, nothing, render } = Lit;
const { repeat } = Directives;
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
    if (!first) {
        return null;
    }
    const second = KEYWORD_MAP.get(tokens[1] ?? (first.axis ? "span-all" /* Keyword.SPAN_ALL */ : tokens[0]));
    if (!second) {
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
    const firstDef = KEYWORD_MAP.get(firstKw);
    if (!firstDef?.axis && firstKw === secondKw) {
        return firstKw;
    }
    if (firstDef?.axis && secondKw === "span-all" /* Keyword.SPAN_ALL */) {
        return firstKw;
    }
    return `${firstKw} ${secondKw}`;
}
export const DEFAULT_VIEW = (input, output, target) => {
    const container = {
        attributes: {
            tabindex: '0',
        },
    };
    if (!input.area) {
        render(nothing, target, { container });
        return;
    }
    const x = input.area.primaryAxis === "inline" /* Axis.INLINE */ ? input.area.first : input.area.second;
    const y = input.area.primaryAxis === "block" /* Axis.BLOCK */ ? input.area.first : input.area.second;
    const grid = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]];
    // Determine which cell receives tabindex="0" for roving focus:
    // use the currently focused cell if any, otherwise default to the selection's start.
    const activeCell = target.querySelector('.position-area-builder > div:focus');
    const focusedX = activeCell ? Number(activeCell.dataset.x) : x.start;
    const focusedY = activeCell ? Number(activeCell.dataset.y) : y.start;
    function getCellCoords(e, container) {
        const root = container.getRootNode();
        const el = root.elementFromPoint(e.clientX, e.clientY);
        const cell = el?.closest('.position-area-builder > div');
        if (!cell || !container.contains(cell)) {
            return null;
        }
        const cellX = Number(cell.dataset.x);
        const cellY = Number(cell.dataset.y);
        return [cellX, cellY];
    }
    function focusCell(cell, container) {
        for (const c of container.querySelectorAll('[data-x]')) {
            c.tabIndex = c === cell ? 0 : -1;
        }
        cell.focus();
    }
    function onPointerDown(e) {
        const container = e.currentTarget;
        const targetCell = e.target.closest('[data-x]');
        if (!targetCell) {
            return;
        }
        const startX = Number(targetCell.dataset.x);
        const startY = Number(targetCell.dataset.y);
        focusCell(targetCell, container);
        container.setPointerCapture(e.pointerId);
        input.onSelectStart(startX, startY);
    }
    function onPointerMove(e) {
        const container = e.currentTarget;
        if (!container.hasPointerCapture(e.pointerId)) {
            return;
        }
        const cell = getCellCoords(e, container);
        if (cell) {
            const targetCell = container.querySelector(`[data-x="${cell[0]}"][data-y="${cell[1]}"]`);
            if (targetCell && targetCell !== document.activeElement) {
                focusCell(targetCell, container);
            }
            input.onSelect(...cell);
        }
    }
    function onPointerUp(e) {
        const container = e.currentTarget;
        if (!container.hasPointerCapture(e.pointerId)) {
            return;
        }
        container.releasePointerCapture(e.pointerId);
        const coords = getCellCoords(e, container);
        if (coords) {
            const targetCell = container.querySelector(`[data-x="${coords[0]}"][data-y="${coords[1]}"]`);
            if (targetCell) {
                focusCell(targetCell, container);
            }
            input.onSelectEnd(...coords);
        }
        else {
            input.onSelectEnd(x.end, y.end);
        }
    }
    function onPointerCancel(e) {
        const container = e.currentTarget;
        if (!container.hasPointerCapture(e.pointerId)) {
            return;
        }
        container.releasePointerCapture(e.pointerId);
        input.onSelectEnd();
    }
    function onCellKeyDown(e) {
        const currentCell = e.currentTarget;
        const cellX = Number(currentCell.dataset.x);
        const cellY = Number(currentCell.dataset.y);
        const builder = currentCell.closest('.position-area-builder');
        if (!builder) {
            return;
        }
        if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            input.onSelectStart(cellX, cellY);
            input.onSelectEnd(cellX, cellY);
            return;
        }
        let dx = 0;
        let dy = 0;
        switch (e.key) {
            case 'ArrowLeft':
                dx = -1;
                break;
            case 'ArrowRight':
                dx = 1;
                break;
            case 'ArrowUp':
                dy = -1;
                break;
            case 'ArrowDown':
                dy = 1;
                break;
            default:
                return;
        }
        const nextX = Math.max(0, Math.min(2, cellX + dx));
        const nextY = Math.max(0, Math.min(2, cellY + dy));
        if (nextX === cellX && nextY === cellY) {
            return;
        }
        e.preventDefault();
        const nextCell = builder.querySelector(`[data-x="${nextX}"][data-y="${nextY}"]`);
        if (!nextCell) {
            return;
        }
        focusCell(nextCell, builder);
        if (e.shiftKey) {
            if (!input.isSelecting) {
                input.onSelectStart(cellX, cellY);
            }
            input.onSelect(nextX, nextY);
        }
    }
    function onKeyUp(e) {
        if (e.key === 'Shift' && input.isSelecting) {
            const activeCell = e.target.closest('[data-x]');
            if (activeCell) {
                const activeX = Number(activeCell.dataset.x);
                const activeY = Number(activeCell.dataset.y);
                input.onSelectEnd(activeX, activeY);
            }
            else {
                input.onSelectEnd();
            }
        }
    }
    function getCellTitle(cellX, cellY) {
        if (!input.area) {
            return '';
        }
        const cellArea = {
            first: input.area.primaryAxis === "inline" /* Axis.INLINE */ ? { ...x, start: cellX, end: cellX } :
                { ...y, start: cellY, end: cellY },
            second: input.area.primaryAxis === "block" /* Axis.BLOCK */ ? { ...x, start: cellX, end: cellX } :
                { ...y, start: cellY, end: cellY },
            primaryAxis: input.area.primaryAxis,
        };
        return stringifyPositionArea(cellArea);
    }
    const propertyValue = stringifyPositionArea(input.area);
    const blockAxis = input.area.primaryAxis === "block" /* Axis.BLOCK */ ? input.area.first : input.area.second;
    const inlineAxis = input.area.primaryAxis === "inline" /* Axis.INLINE */ ? input.area.first : input.area.second;
    function renderModeRadioGroup(axis, currentMode) {
        const modes = [
            { mode: "physical" /* Mode.PHYSICAL */, label: i18nString(UIStrings.physical) },
            { mode: "coordinate" /* Mode.COORDINATE */, label: i18nString(UIStrings.coordinate) },
            { mode: "logical" /* Mode.LOGICAL */, label: i18nString(UIStrings.logical) },
            { mode: "auto" /* Mode.AUTO */, label: i18nString(UIStrings.auto) },
        ];
        const axisModeLabel = axis === "block" /* Axis.BLOCK */ ? i18nString(UIStrings.blockAxisMode) : i18nString(UIStrings.inlineAxisMode);
        return html `
      <fieldset class="chip-radio-group" aria-label=${axisModeLabel}>
        ${modes.map(({ mode, label }) => {
            const id = `${axis}-mode-${mode}`;
            return html `
            <input
              type="radio"
              id=${id}
              name="${axis}-mode"
              value=${mode}
              .checked=${currentMode === mode}
              @change=${() => input.onModeChange(axis, mode)}
            >
            <label for=${id}>${label}</label>
          `;
        })}
      </fieldset>
    `;
    }
    // clang-format off
    render(html `
    <style>${positionAreaEditorStyles}</style>
    <div class=property aria-live="polite" aria-atomic="true">
      <span class=property-name>position-area:</span>
      <span class=property-value>${propertyValue.split(' ').map((keyword, i) => html `${i > 0 ? ' ' : ''}<span class=property-keyword>${keyword}</span>`)}</span>
    </div>
    <div class=position-area-builder
        role="grid"
        aria-label=${i18nString(UIStrings.positionAreaGrid)}
        aria-description=${i18nString(UIStrings.positionAreaGridDescription)}
        aria-multiselectable="true"
        data-x-start=${x.start} data-x-end=${x.end} data-y-start=${y.start} data-y-end=${y.end}
        @pointerdown=${onPointerDown}
        @pointermove=${onPointerMove}
        @pointerup=${onPointerUp}
        @pointercancel=${onPointerCancel}
        @keyup=${onKeyUp}>
      ${repeat(grid, ([cellX, cellY]) => cellX * 10 + cellY, ([cellX, cellY]) => {
        const isFocused = cellX === focusedX && cellY === focusedY;
        const isSelected = cellX >= x.start && cellX <= x.end && cellY >= y.start && cellY <= y.end;
        const cellTitle = getCellTitle(cellX, cellY);
        return html `
         <div
           role="gridcell"
           data-x=${cellX}
           data-y=${cellY}
           title=${cellTitle}
           aria-label=${cellTitle}
           tabindex=${isFocused ? 0 : -1}
           aria-selected=${isSelected ? 'true' : 'false'}
           @keydown=${onCellKeyDown}>
         </div>
        `;
    })}
    </div>
    <div class=position-area-controls>
      <div class=axis-section>
        <div class=axis-header>
          <span class=axis-title>${i18nString(UIStrings.block)}</span>
          <devtools-checkbox
            .checked=${blockAxis.self}
            ?disabled=${isGeneric(blockAxis)}
            @change=${(e) => input.onSelfChange("block" /* Axis.BLOCK */, e.target.checked)}>
            <span class="self-checkbox-label source-code">self</span>
          </devtools-checkbox>
        </div>
        ${renderModeRadioGroup("block" /* Axis.BLOCK */, blockAxis.mode)}
      </div>
      <div class=axis-section>
        <div class=axis-header>
          <span class=axis-title>${i18nString(UIStrings.inline)}</span>
          <devtools-checkbox
            .checked=${inlineAxis.self}
            ?disabled=${isGeneric(inlineAxis)}
            @change=${(e) => input.onSelfChange("inline" /* Axis.INLINE */, e.target.checked)}>
            <span class="self-checkbox-label source-code">self</span>
          </devtools-checkbox>
        </div>
        ${renderModeRadioGroup("inline" /* Axis.INLINE */, inlineAxis.mode)}
      </div>
    </div>
    `, 
    // clang-format on
    target, { container });
};
export var Events;
(function (Events) {
    Events["POSITION_AREA_CHANGED"] = "positionAreaChanged";
})(Events || (Events = {}));
const PositionAreaEditorBase = Common.ObjectWrapper.eventMixin(UI.Widget.VBox);
export class PositionAreaEditor extends PositionAreaEditorBase {
    #view;
    #area;
    #inProgressSelection;
    constructor(element, view = DEFAULT_VIEW) {
        super(element);
        this.setDefaultFocusedElement(this.contentElement);
        this.#view = view;
    }
    wasShown() {
        super.wasShown();
        this.performUpdate();
    }
    get area() {
        return this.#area;
    }
    set area(val) {
        if ((this.#inProgressSelection?.origin ?? this.#area) === val) {
            return;
        }
        this.#area = val;
        this.#inProgressSelection = undefined;
        this.requestUpdate();
    }
    #startSelection(x, y) {
        this.#finishSelection();
        this.#select(x, y);
    }
    #inlineAxis() {
        if (!this.#area) {
            return { start: 0, end: 0, mode: "physical" /* Mode.PHYSICAL */, self: false };
        }
        return this.#area.primaryAxis === "inline" /* Axis.INLINE */ ? this.#area.first : this.#area.second;
    }
    #blockAxis() {
        if (!this.#area) {
            return { start: 0, end: 0, mode: "physical" /* Mode.PHYSICAL */, self: false };
        }
        return this.#area.primaryAxis === "block" /* Axis.BLOCK */ ? this.#area.first : this.#area.second;
    }
    #axis(axis) {
        return axis === "inline" /* Axis.INLINE */ ? this.#inlineAxis() : this.#blockAxis();
    }
    #notifyChange() {
        if (!this.#area) {
            return;
        }
        this.dispatchEventToListeners("positionAreaChanged" /* Events.POSITION_AREA_CHANGED */, this.#area);
    }
    #select(x, y) {
        if (!this.#inProgressSelection) {
            this.#inProgressSelection = { origin: this.#area, start: { x, y }, end: { x, y } };
        }
        this.#inProgressSelection.end = { x, y };
        const { start, end } = this.#inProgressSelection;
        const primaryAxis = this.#area?.primaryAxis ?? "inline" /* Axis.INLINE */;
        // The visual 3x3 grid maps horizontal (x) to the inline axis and vertical (y) to the block axis.
        const inlineAxis = { ...this.#inlineAxis(), start: Math.min(start.x, end.x), end: Math.max(start.x, end.x) };
        const blockAxis = { ...this.#blockAxis(), start: Math.min(start.y, end.y), end: Math.max(start.y, end.y) };
        this.#area = {
            first: primaryAxis === "inline" /* Axis.INLINE */ ? inlineAxis : blockAxis,
            second: primaryAxis === "block" /* Axis.BLOCK */ ? inlineAxis : blockAxis,
            primaryAxis,
        };
        this.requestUpdate();
        this.#notifyChange();
    }
    #finishSelection(x, y) {
        if (!this.#inProgressSelection) {
            return;
        }
        if (x === undefined || y === undefined) {
            this.#area = this.#inProgressSelection.origin ?? this.#area;
            this.#inProgressSelection = undefined;
            this.#notifyChange();
            this.requestUpdate();
            return;
        }
        this.#select(x, y);
        this.#inProgressSelection = undefined;
    }
    #setAxisMode(axis, mode) {
        if (!this.#area) {
            return;
        }
        const otherAxis = axis === "inline" /* Axis.INLINE */ ? "block" /* Axis.BLOCK */ : "inline" /* Axis.INLINE */;
        const current = this.#axis(axis);
        if (mode === current.mode) {
            return;
        }
        const other = this.#axis(otherAxis);
        current.mode = mode;
        if (isGeneric(current) || mode === "physical" /* Mode.PHYSICAL */) {
            // center and span-all and physical axes don't support self
            current.self = false;
        }
        if (!isGeneric(other)) {
            if (mode === "physical" /* Mode.PHYSICAL */ || mode === "coordinate" /* Mode.COORDINATE */) {
                // physical axes may be combined with coordinate
                if (other.mode !== "physical" /* Mode.PHYSICAL */ && other.mode !== "coordinate" /* Mode.COORDINATE */) {
                    other.mode = mode === "coordinate" /* Mode.COORDINATE */ ? "coordinate" /* Mode.COORDINATE */ : (other.self ? "coordinate" /* Mode.COORDINATE */ : "physical" /* Mode.PHYSICAL */);
                }
            }
            else {
                other.mode = mode;
                if (!isGeneric(current)) {
                    other.self = current.self;
                }
            }
        }
        else {
            other.mode = mode;
            other.self = false;
        }
        this.requestUpdate();
        this.#notifyChange();
    }
    #setAxisSelf(axis, self) {
        if (!this.#area) {
            return;
        }
        const current = this.#axis(axis);
        const other = this.#axis(axis === "inline" /* Axis.INLINE */ ? "block" /* Axis.BLOCK */ : "inline" /* Axis.INLINE */);
        if (isGeneric(current)) {
            if (!isGeneric(other)) {
                this.#setAxisSelf(axis === "inline" /* Axis.INLINE */ ? "block" /* Axis.BLOCK */ : "inline" /* Axis.INLINE */, self);
            }
            this.requestUpdate();
            this.#notifyChange();
            return;
        }
        current.self = self;
        if (current.mode === "physical" /* Mode.PHYSICAL */ && self) {
            current.mode = "coordinate" /* Mode.COORDINATE */;
        }
        if (!isGeneric(other) && other.mode !== "physical" /* Mode.PHYSICAL */ && other.mode !== "coordinate" /* Mode.COORDINATE */) {
            other.self = self;
        }
        this.requestUpdate();
        this.#notifyChange();
    }
    performUpdate() {
        const isSelecting = () => this.#inProgressSelection !== undefined;
        this.#view({
            area: this.#area,
            get isSelecting() {
                return isSelecting();
            },
            onSelectStart: this.#startSelection.bind(this),
            onSelect: this.#select.bind(this),
            onSelectEnd: this.#finishSelection.bind(this),
            onModeChange: this.#setAxisMode.bind(this),
            onSelfChange: this.#setAxisSelf.bind(this),
        }, undefined, this.contentElement);
    }
}
//# sourceMappingURL=PositionAreaEditor.js.map