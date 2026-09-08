// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../../core/common/common.js';
import * as Lit from '../../../../ui/lit/lit.js';
import * as UI from '../../legacy.js';

import positionAreaEditorStyles from './positionAreaEditor.css.js';

const {Directives, html, nothing, render} = Lit;
const {repeat} = Directives;

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
  if (!first) {
    return null;
  }
  const second = KEYWORD_MAP.get(tokens[1] ?? (first.axis ? Keyword.SPAN_ALL : tokens[0]));
  if (!second) {
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
  const firstDef = KEYWORD_MAP.get(firstKw);
  if (!firstDef?.axis && firstKw === secondKw) {
    return firstKw;
  }
  if (firstDef?.axis && secondKw === Keyword.SPAN_ALL) {
    return firstKw;
  }
  return `${firstKw} ${secondKw}`;
}

export interface ViewInput {
  area: Area|undefined;
  onSelectStart: (x: number, y: number) => void;
  onSelect: (x: number, y: number) => void;
  onSelectEnd: (x?: number, y?: number) => void;
  onModeChange: (axis: Axis, mode: Mode) => void;
  onSelfChange: (axis: Axis, self: boolean) => void;
}
export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;
export const DEFAULT_VIEW: View = (input, output, target) => {
  if (!input.area) {
    render(nothing, target);
    return;
  }
  const x = input.area.primaryAxis === Axis.INLINE ? input.area.first : input.area.second;
  const y = input.area.primaryAxis === Axis.BLOCK ? input.area.first : input.area.second;
  const grid = [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2], [2, 2]];

  function getCellCoords(e: PointerEvent, container: HTMLElement): [number, number]|null {
    const root = container.getRootNode() as Document | ShadowRoot;
    const el = root.elementFromPoint(e.clientX, e.clientY);
    const cell = el?.closest<HTMLElement>('.position-area-builder > div');
    if (!cell || !container.contains(cell)) {
      return null;
    }
    const cellX = Number(cell.dataset.x);
    const cellY = Number(cell.dataset.y);
    return [cellX, cellY];
  }

  function onPointerDown(e: PointerEvent): void {
    const container = e.currentTarget as HTMLElement;
    const targetCell = (e.target as HTMLElement).closest('[data-x]') as HTMLElement | null;
    if (!targetCell) {
      return;
    }
    const startX = Number(targetCell.dataset.x);
    const startY = Number(targetCell.dataset.y);
    container.setPointerCapture(e.pointerId);
    input.onSelectStart(startX, startY);
  }

  function onPointerMove(e: PointerEvent): void {
    const container = e.currentTarget as HTMLElement;
    if (!container.hasPointerCapture(e.pointerId)) {
      return;
    }
    const cell = getCellCoords(e, container);
    if (cell) {
      input.onSelect(...cell);
    }
  }

  function onPointerUp(e: PointerEvent): void {
    const container = e.currentTarget as HTMLElement;
    if (!container.hasPointerCapture(e.pointerId)) {
      return;
    }
    container.releasePointerCapture(e.pointerId);
    const coords = getCellCoords(e, container);
    if (coords) {
      input.onSelectEnd(...coords);
    } else {
      input.onSelectEnd(x.end, y.end);
    }
  }

  function onPointerCancel(e: PointerEvent): void {
    const container = e.currentTarget as HTMLElement;
    if (!container.hasPointerCapture(e.pointerId)) {
      return;
    }
    container.releasePointerCapture(e.pointerId);
    input.onSelectEnd();
  }

  const propertyValue = stringifyPositionArea(input.area);

  const blockAxis = input.area.primaryAxis === Axis.BLOCK ? input.area.first : input.area.second;
  const inlineAxis = input.area.primaryAxis === Axis.INLINE ? input.area.first : input.area.second;

  function renderModeRadioGroup(axis: Axis, currentMode: Mode): Lit.TemplateResult {
    const modes = [
      {mode: Mode.PHYSICAL, label: 'Physical'},
      {mode: Mode.COORDINATE, label: 'Coordinate'},
      {mode: Mode.LOGICAL, label: 'Logical'},
      {mode: Mode.AUTO, label: 'Auto'},
    ];

    return html`
      <fieldset class="chip-radio-group" aria-label="${axis} axis mode">
        ${modes.map(({mode, label}) => {
      const id = `${axis}-mode-${mode}`;
      return html`
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
  render(html`
    <style>${positionAreaEditorStyles}</style>
    <div class=property>
      <span class=property-name>position-area:</span>
      <span class=property-value>${
             propertyValue.split(' ').map(
                 (keyword, i) => html`${i > 0 ? ' ' : ''}<span class=property-keyword>${keyword}</span>`)}</span>
    </div>
    <div class=position-area-builder
        data-x-start=${x.start} data-x-end=${x.end} data-y-start=${y.start} data-y-end=${y.end}
        @pointerdown=${onPointerDown}
        @pointermove=${onPointerMove}
        @pointerup=${onPointerUp}
        @pointercancel=${onPointerCancel}>
      ${repeat(grid, ([x, y]) => x * 10 + y, ([x, y]) => html`
         <div data-x=${x} data-y=${y}>
         </div>
        `)}
    </div>
    <div class=position-area-controls>
      <div class=axis-section>
        <div class=axis-header>
          <span class=axis-title>Block</span>
          <devtools-checkbox
            .checked=${blockAxis.self}
            ?disabled=${isGeneric(blockAxis)}
            @change=${(e: Event) => input.onSelfChange(Axis.BLOCK, (e.target as UI.UIUtils.CheckboxLabel).checked)}>
            <span class=self-checkbox-label>self</span>
          </devtools-checkbox>
        </div>
        ${renderModeRadioGroup(Axis.BLOCK, blockAxis.mode)}
      </div>
      <div class=axis-section>
        <div class=axis-header>
          <span class=axis-title>Inline</span>
          <devtools-checkbox
            .checked=${inlineAxis.self}
            ?disabled=${isGeneric(inlineAxis)}
            @change=${(e: Event) => input.onSelfChange(Axis.INLINE, (e.target as UI.UIUtils.CheckboxLabel).checked)}>
            <span class=self-checkbox-label>self</span>
          </devtools-checkbox>
        </div>
        ${renderModeRadioGroup(Axis.INLINE, inlineAxis.mode)}
      </div>
    </div>
    `,
         target);
};

export const enum Events {
  POSITION_AREA_CHANGED = 'positionAreaChanged',
}

export interface EventTypes {
  [Events.POSITION_AREA_CHANGED]: Area;
}

const PositionAreaEditorBase: Common.ObjectWrapper.EventMixin<EventTypes, typeof UI.Widget.VBox> =
    Common.ObjectWrapper.eventMixin(
        UI.Widget.VBox,
    );

export class PositionAreaEditor extends PositionAreaEditorBase {
  #view: View;
  #area?: Area;
  #inProgressSelection?: {
    start: {x: number, y: number},
    end: {x: number, y: number},
    origin?: Area,
  };

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element);
    this.setDefaultFocusedElement(this.contentElement);
    this.#view = view;
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  get area(): Area|undefined {
    return this.#area;
  }

  set area(val: Area|undefined) {
    if ((this.#inProgressSelection?.origin ?? this.#area) === val) {
      return;
    }
    this.#area = val;
    this.#inProgressSelection = undefined;
    this.requestUpdate();
  }

  #startSelection(x: number, y: number): void {
    this.#finishSelection();
    this.#select(x, y);
  }

  #inlineAxis(): GridAxis {
    if (!this.#area) {
      return {start: 0, end: 0, mode: Mode.PHYSICAL, self: false};
    }
    return this.#area.primaryAxis === Axis.INLINE ? this.#area.first : this.#area.second;
  }

  #blockAxis(): GridAxis {
    if (!this.#area) {
      return {start: 0, end: 0, mode: Mode.PHYSICAL, self: false};
    }
    return this.#area.primaryAxis === Axis.BLOCK ? this.#area.first : this.#area.second;
  }

  #axis(axis: Axis): GridAxis {
    return axis === Axis.INLINE ? this.#inlineAxis() : this.#blockAxis();
  }

  #notifyChange(): void {
    if (!this.#area) {
      return;
    }
    this.dispatchEventToListeners(Events.POSITION_AREA_CHANGED, this.#area);
  }

  #select(x: number, y: number): void {
    if (!this.#inProgressSelection) {
      this.#inProgressSelection = {origin: this.#area, start: {x, y}, end: {x, y}};
    }
    this.#inProgressSelection.end = {x, y};

    const {start, end} = this.#inProgressSelection;

    const primaryAxis = this.#area?.primaryAxis ?? Axis.INLINE;

    // The visual 3x3 grid maps horizontal (x) to the inline axis and vertical (y) to the block axis.
    const inlineAxis = {...this.#inlineAxis(), start: Math.min(start.x, end.x), end: Math.max(start.x, end.x)};
    const blockAxis = {...this.#blockAxis(), start: Math.min(start.y, end.y), end: Math.max(start.y, end.y)};
    this.#area = {
      first: primaryAxis === Axis.INLINE ? inlineAxis : blockAxis,
      second: primaryAxis === Axis.BLOCK ? inlineAxis : blockAxis,
      primaryAxis,
    };
    this.requestUpdate();
    this.#notifyChange();
  }

  #finishSelection(x?: number, y?: number): void {
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

  #setAxisMode(axis: Axis, mode: Mode): void {
    if (!this.#area) {
      return;
    }
    const otherAxis = axis === Axis.INLINE ? Axis.BLOCK : Axis.INLINE;
    const current = this.#axis(axis);

    if (mode === current.mode) {
      return;
    }

    const other = this.#axis(otherAxis);

    current.mode = mode;
    if (isGeneric(current) || mode === Mode.PHYSICAL) {
      // center and span-all and physical axes don't support self
      current.self = false;
    }

    if (!isGeneric(other)) {
      if (mode === Mode.PHYSICAL || mode === Mode.COORDINATE) {
        // physical axes may be combined with coordinate
        if (other.mode !== Mode.PHYSICAL && other.mode !== Mode.COORDINATE) {
          other.mode = mode === Mode.COORDINATE ? Mode.COORDINATE : (other.self ? Mode.COORDINATE : Mode.PHYSICAL);
        }
      } else {
        other.mode = mode;
        if (!isGeneric(current)) {
          other.self = current.self;
        }
      }
    } else {
      other.mode = mode;
      other.self = false;
    }

    this.requestUpdate();
    this.#notifyChange();
  }

  #setAxisSelf(axis: Axis, self: boolean): void {
    if (!this.#area) {
      return;
    }
    const current = this.#axis(axis);
    const other = this.#axis(axis === Axis.INLINE ? Axis.BLOCK : Axis.INLINE);

    if (isGeneric(current)) {
      if (!isGeneric(other)) {
        this.#setAxisSelf(axis === Axis.INLINE ? Axis.BLOCK : Axis.INLINE, self);
      }
      this.requestUpdate();
      this.#notifyChange();
      return;
    }

    current.self = self;

    if (current.mode === Mode.PHYSICAL && self) {
      current.mode = Mode.COORDINATE;
    }

    if (!isGeneric(other) && other.mode !== Mode.PHYSICAL && other.mode !== Mode.COORDINATE) {
      other.self = self;
    }

    this.requestUpdate();
    this.#notifyChange();
  }

  override performUpdate(): void {
    this.#view({
      area: this.#area,
      onSelectStart: this.#startSelection.bind(this),
      onSelect: this.#select.bind(this),
      onSelectEnd: this.#finishSelection.bind(this),
      onModeChange: this.#setAxisMode.bind(this),
      onSelfChange: this.#setAxisSelf.bind(this),
    },
               undefined, this.contentElement);
  }
}
