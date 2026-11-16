// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as TraceBounds from '../../../../services/trace_bounds/trace_bounds.js';
import {Directives, html, nothing, render} from '../../../lit/lit.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';
import * as ThemeSupport from '../../theme_support/theme_support.js';

import {Events as OverviewGridEvents, OverviewGrid, type WindowChangedWithPositionEvent} from './OverviewGrid.js';
import {TimelineOverviewCalculator} from './TimelineOverviewCalculator.js';
import timelineOverviewInfoStyles from './timelineOverviewInfo.css.js';

const {ref, styleMap} = Directives;

const BRACKET_TRIANGLE_SIZE = 5;

export interface HighlightRange {
  left: number;
  right: number;
  withBracket: boolean;
}

export interface ViewInput {
  /**
   * Prefix for the element ids and the visual logging context, for example
   * `timeline` or `network`.
   */
  prefix: string;
  /**
   * The `OverviewGrid`, which is the resizer and canvas host of the overview:
   * the grid manages the time grid, the window resizers and the overview
   * control canvases in it. The view places it in the pane and adds the cursor
   * to it.
   */
  overviewGrid: OverviewGrid;
  overviewInfo: OverviewInfo;
  overviewInfoElements: readonly Element[];
  cursorPosition: number;
  cursorVisible: boolean;
  highlight: HighlightRange|null;
  highlightBackgroundColor: string;
  highlightBracketColor: string;
  onPointerDown: () => void;
  onPointerUp: () => void;
  onCursorMove: (position: number) => void;
  onCursorLeave: () => void;
}

export interface ViewOutput {
  /**
   * Returns the left edge of the cursor area in client coordinates.
   */
  cursorAreaLeft?: () => number;
  /**
   * Returns the box of the cursor marker. The overview info is anchored to it.
   */
  cursorAnchorBox?: () => AnchorBox;
}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

function bracketPoints({left, right}: HighlightRange): string {
  const size = BRACKET_TRIANGLE_SIZE;
  return `${left},0 ${left},${size} ${left + size - 1},1 ${right - size - 1},1 ${right},${size} ${right},0`;
}

const renderOverviewGridView: View = (input, output, target) => {
  const onPointerDown = (event: PointerEvent): void => {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }
    event.target.setPointerCapture(event.pointerId);
    input.onPointerDown();
  };
  const onPointerUp = (event: PointerEvent): void => {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }
    // The browser releases the capture before it dispatches `pointercancel`.
    if (event.target.hasPointerCapture(event.pointerId)) {
      event.target.releasePointerCapture(event.pointerId);
    }
    input.onPointerUp();
  };
  const onPointerMove = (event: PointerEvent): void => {
    if (!(event.target instanceof Element) || !(event.currentTarget instanceof Element)) {
      return;
    }
    const offsetLeftRelativeToCursorArea =
        event.target.getBoundingClientRect().left - event.currentTarget.getBoundingClientRect().left;
    input.onCursorMove(event.offsetX + offsetLeftRelativeToCursorArea);
  };
  // clang-format off
  render(html`
    <div
      class="overview-grid-cursor-area"
      @pointerdown=${onPointerDown}
      @pointerup=${onPointerUp}
      @pointercancel=${onPointerUp}
      @pointermove=${onPointerMove}
      @pointerleave=${input.onCursorLeave}
      ${ref(element => {
        output.cursorAreaLeft = element instanceof HTMLElement ?
            () => element.getBoundingClientRect().left : undefined;
      })}></div>
    <div
      class="overview-grid-cursor-position"
      style=${styleMap({
        left: `${input.cursorPosition}px`,
        visibility: input.cursorVisible ? 'visible' : 'hidden',
      })}
      ${ref(element => {
        output.cursorAnchorBox = element instanceof HTMLElement ? () => element.boxInWindow() : undefined;
      })}></div>
  `, target, {
    container: {
      attributes: {
        jslog: `${VisualLogging.timeline(`${input.prefix}-overview`).track({click: true, drag: true, hover: true})}`,
      },
    },
  });
  // clang-format on
};

export const DEFAULT_VIEW: View = (input, output, target) => {
  const {highlight} = input;
  const overviewGridElement = input.overviewGrid.element;
  // clang-format off
  render(html`
    ${overviewGridElement}
    <svg class="timeline-minimap-dim-highlight-svg" ?hidden=${!highlight}>
      <defs>
        <mask id="${input.prefix}-dim-highlight-cutouts">
          <rect width="100%" height="100%" fill="hsl(0deg 0% 95%)"></rect>
          <rect class="punch" x=${highlight?.left ?? nothing} y="0"
              width=${highlight ? highlight.right - highlight.left : nothing} height="100%" fill="black"></rect>
        </mask>
      </defs>
      <rect class="background" width="100%" height="100%" fill=${input.highlightBackgroundColor}
          mask="url(#${input.prefix}-dim-highlight-cutouts)" style="mix-blend-mode: saturation"></rect>
      <polygon ?hidden=${!highlight?.withBracket} fill=${input.highlightBracketColor}
          points=${highlight?.withBracket ? bracketPoints(highlight) : nothing}></polygon>
    </svg>
  `, target, {
    container: {
      attributes: {id: `${input.prefix}-overview-pane`},
    },
  });
  // clang-format on
  renderOverviewGridView(input, output, overviewGridElement);
  renderOverviewInfoView(input, output, input.overviewInfo.contentRoot);
};

const renderOverviewInfoView = (input: ViewInput, _output: ViewOutput, target: DocumentFragment): void => {
  render(html`<div class="overview-info">${input.overviewInfoElements}</div>`, target);
};

const TimelineOverviewPaneBase: Common.ObjectWrapper.EventMixin<EventTypes, typeof UI.Widget.VBox> =
    Common.ObjectWrapper.eventMixin(
        UI.Widget.VBox,
    );

export class TimelineOverviewPane extends TimelineOverviewPaneBase {
  readonly overviewCalculator: TimelineOverviewCalculator;
  private readonly overviewGrid: OverviewGrid;
  private overviewControls: TimelineOverview[] = [];
  private markers = new Map<number, HTMLDivElement>();
  private readonly overviewInfo: OverviewInfo;
  private readonly updateThrottler = new Common.Throttler.Throttler(100);
  private cursorEnabled = false;
  private cursorPosition = 0;
  private lastWidth = 0;
  private windowStartTime = Trace.Types.Timing.Milli(0);
  private windowEndTime = Trace.Types.Timing.Milli(Infinity);
  private muteOnWindowChanged = false;
  private hasPointer = false;
  readonly #prefix: string;
  readonly #view: View;
  readonly #viewOutput: ViewOutput = {};
  #cursorVisible = false;
  #overviewInfoVisible = false;
  #overviewInfoElements: readonly Element[] = [];
  #highlight: HighlightRange|null = null;
  readonly #boundOnThemeChanged = this.#onThemeChanged.bind(this);
  readonly #onPointerDownBound = this.#onPointerDown.bind(this);
  readonly #onPointerUpBound = this.#onPointerUp.bind(this);
  readonly #onCursorMoveBound = this.#onCursorMove.bind(this);
  readonly #onCursorLeaveBound = this.hideCursor.bind(this);

  constructor(prefixOrElement: string|HTMLElement = 'timeline', view: View = DEFAULT_VIEW) {
    super(prefixOrElement instanceof HTMLElement ? prefixOrElement : undefined);
    this.#prefix = typeof prefixOrElement === 'string' ? prefixOrElement : 'timeline';
    this.#view = view;

    this.overviewCalculator = new TimelineOverviewCalculator();
    this.overviewGrid = new OverviewGrid(this.#prefix, this.overviewCalculator);

    this.overviewGrid.setResizeEnabled(false);
    this.overviewGrid.addEventListener(OverviewGridEvents.WINDOW_CHANGED_WITH_POSITION, this.onWindowChanged, this);
    this.overviewGrid.addEventListener(OverviewGridEvents.BREADCRUMB_ADDED, this.onBreadcrumbAdded, this);
    this.overviewGrid.setClickHandler(this.onClick.bind(this));

    this.overviewInfo = new OverviewInfo();

    // Render synchronously, so that the overview grid is attached before
    // `update()` measures it in `wasShown()`, and before subclasses and callers
    // show the overview controls in it.
    this.#render();
  }

  override performUpdate(): void {
    this.#render();
  }

  #render(): void {
    const themeSupport = ThemeSupport.ThemeSupport.instance();
    this.#view({
      prefix: this.#prefix,
      overviewGrid: this.overviewGrid,
      overviewInfo: this.overviewInfo,
      overviewInfoElements: this.#overviewInfoElements,
      cursorPosition: this.cursorPosition,
      cursorVisible: this.#cursorVisible,
      highlight: this.#highlight,
      highlightBackgroundColor: themeSupport.getComputedValue('--color-background'),
      highlightBracketColor: themeSupport.getComputedValue('--sys-color-state-on-header-hover'),
      onPointerDown: this.#onPointerDownBound,
      onPointerUp: this.#onPointerUpBound,
      onCursorMove: this.#onCursorMoveBound,
      onCursorLeave: this.#onCursorLeaveBound,
    },
               this.#viewOutput, this.contentElement);
  }

  enableCreateBreadcrumbsButton(): void {
    const breadcrumbsElement = this.overviewGrid.enableCreateBreadcrumbsButton();
    breadcrumbsElement.addEventListener('pointerdown', this.onMouseDown.bind(this), true);
    breadcrumbsElement.addEventListener('pointerup', this.onMouseCancel.bind(this), true);
    breadcrumbsElement.addEventListener('pointercancel', this.onMouseCancel.bind(this), true);
    breadcrumbsElement.addEventListener('pointermove', this.onMouseMove.bind(this), true);
    breadcrumbsElement.addEventListener('pointerleave', this.hideCursor.bind(this), true);
  }

  private onMouseDown(event: PointerEvent): void {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }

    event.target.setPointerCapture(event.pointerId);
    this.#onPointerDown();
  }

  private onMouseCancel(event: PointerEvent): void {
    if (!(event.target instanceof HTMLElement)) {
      return;
    }

    if (event.target.hasPointerCapture(event.pointerId)) {
      event.target.releasePointerCapture(event.pointerId);
    }
    this.#onPointerUp();
  }

  private onMouseMove(event: MouseEvent): void {
    if (!(event.target instanceof Element)) {
      return;
    }
    const cursorAreaLeft = this.#viewOutput.cursorAreaLeft?.() ?? 0;
    const offsetLeftRelativeToCursorArea = event.target.getBoundingClientRect().left - cursorAreaLeft;
    this.#onCursorMove(event.offsetX + offsetLeftRelativeToCursorArea);
  }

  #onPointerDown(): void {
    this.#overviewInfoVisible = false;
    this.overviewInfo.hide();
    this.hasPointer = true;
  }

  #onPointerUp(): void {
    this.#overviewInfoVisible = true;
    this.overviewInfo.show(this.#viewOutput.cursorAnchorBox?.() ?? null);
    this.hasPointer = false;
  }

  #onCursorMove(position: number): void {
    if (!this.cursorEnabled) {
      return;
    }
    this.cursorPosition = position;
    this.#cursorVisible = true;
    this.requestUpdate();

    // Dispatch an event to notify the flame chart to show a timestamp marker for the current timestamp if it's visible
    // in the flame chart.
    const timeInMilliSeconds = this.overviewCalculator.positionToTime(this.cursorPosition);
    const timeWindow = this.overviewGrid.calculateWindowValue();
    if (Trace.Types.Timing.Milli(timeWindow.rawStartValue) <= timeInMilliSeconds &&
        timeInMilliSeconds <= Trace.Types.Timing.Milli(timeWindow.rawEndValue)) {
      const timeInMicroSeconds = Trace.Helpers.Timing.milliToMicro(timeInMilliSeconds);
      this.dispatchEventToListeners(Events.OVERVIEW_PANE_MOUSE_MOVE, {timeInMicroSeconds});
    } else {
      this.dispatchEventToListeners(Events.OVERVIEW_PANE_MOUSE_LEAVE);
    }

    if (!this.hasPointer) {
      void this.updateOverviewInfo();
    }
  }

  private async updateOverviewInfo(): Promise<void> {
    this.#overviewInfoVisible = true;
    const x = this.cursorPosition;
    const elements = await Promise.all(this.overviewControls.map(control => control.overviewInfoPromise(x)));
    if (!this.#overviewInfoVisible) {
      return;
    }
    this.#overviewInfoElements = elements.filter(element => element !== null);
    this.requestUpdate();
    // The overview info is anchored to the cursor marker, so wait until it is
    // rendered at the new position.
    await this.updateComplete;
    if (!this.#overviewInfoVisible) {
      return;
    }
    this.overviewInfo.show(this.#viewOutput.cursorAnchorBox?.() ?? null);
  }

  private hideCursor(): void {
    this.#cursorVisible = false;
    this.#overviewInfoVisible = false;
    this.#overviewInfoElements = [];
    this.requestUpdate();
    this.dispatchEventToListeners(Events.OVERVIEW_PANE_MOUSE_LEAVE);
    this.overviewInfo.hide();
  }

  #onThemeChanged(): void {
    this.scheduleUpdate();
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    const start = TraceBounds.TraceBounds.BoundsManager.instance().state()?.milli.minimapTraceBounds.min;
    const end = TraceBounds.TraceBounds.BoundsManager.instance().state()?.milli.minimapTraceBounds.max;
    this.update(start, end);
    ThemeSupport.ThemeSupport.instance().addEventListener(ThemeSupport.ThemeChangeEvent.eventName,
                                                          this.#boundOnThemeChanged);
    this.requestUpdate();
  }

  override willHide(): void {
    ThemeSupport.ThemeSupport.instance().removeEventListener(ThemeSupport.ThemeChangeEvent.eventName,
                                                             this.#boundOnThemeChanged);
    this.#overviewInfoVisible = false;
    this.overviewInfo.hide();
    super.willHide();
  }

  override onResize(): void {
    const width = this.element.offsetWidth;
    if (width === this.lastWidth) {
      return;
    }
    this.lastWidth = width;
    this.scheduleUpdate();
  }

  setOverviewControls(overviewControls: TimelineOverview[]): void {
    for (let i = 0; i < this.overviewControls.length; ++i) {
      this.overviewControls[i].dispose();
    }

    for (let i = 0; i < overviewControls.length; ++i) {
      overviewControls[i].setCalculator(this.overviewCalculator);
      overviewControls[i].show(this.overviewGrid.element);
    }
    this.overviewControls = overviewControls;
    this.update();
  }

  set showingScreenshots(isShowing: boolean) {
    this.overviewGrid.showingScreenshots = isShowing;
  }

  setBounds(minimumBoundary: Trace.Types.Timing.Milli, maximumBoundary: Trace.Types.Timing.Milli): void {
    if (minimumBoundary === this.overviewCalculator.minimumBoundary() &&
        maximumBoundary === this.overviewCalculator.maximumBoundary()) {
      return;
    }
    this.overviewCalculator.setBounds(minimumBoundary, maximumBoundary);
    this.overviewGrid.setResizeEnabled(true);
    this.cursorEnabled = true;
    this.scheduleUpdate(minimumBoundary, maximumBoundary);
  }

  setNavStartTimes(navStartTimes: readonly Trace.Types.Events.NavigationStart[]): void {
    this.overviewCalculator.setNavStartTimes(navStartTimes);
  }

  scheduleUpdate(start?: Trace.Types.Timing.Milli, end?: Trace.Types.Timing.Milli): void {
    void this.updateThrottler.schedule(async () => {
      this.update(start, end);
    });
  }

  update(start?: Trace.Types.Timing.Milli, end?: Trace.Types.Timing.Milli): void {
    if (!this.isShowing()) {
      return;
    }
    this.overviewCalculator.setDisplayWidth(this.overviewGrid.clientWidth());
    for (let i = 0; i < this.overviewControls.length; ++i) {
      this.overviewControls[i].update(start, end);
    }
    this.overviewGrid.updateDividers(this.overviewCalculator);
    this.updateMarkers();
    this.updateWindow();
  }

  setMarkers(markers: Map<number, HTMLDivElement>): void {
    this.markers = markers;
  }

  /**
   * Dim the time marker outside the highlight time bounds.
   *
   * @param highlightBounds the time bounds to highlight, if it is empty, it means to highlight everything.
   */
  #dimMarkers(highlightBounds?: Trace.Types.Timing.TraceWindowMicro): void {
    for (const time of this.markers.keys()) {
      const marker = this.markers.get(time);
      if (!marker) {
        continue;
      }
      const timeInMicroSeconds = Trace.Helpers.Timing.milliToMicro(Trace.Types.Timing.Milli(time));
      const dim = highlightBounds && !Trace.Helpers.Timing.timestampIsInBounds(highlightBounds, timeInMicroSeconds);

      // `filter: grayscale(1)`  will make the element fully completely grayscale.
      marker.style.filter = `grayscale(${dim ? 1 : 0})`;
    }
  }

  private updateMarkers(): void {
    const filteredMarkers = new Map<number, Element>();
    for (const time of this.markers.keys()) {
      const marker = this.markers.get(time) as HTMLElement;
      const position = Math.round(this.overviewCalculator.computePosition(Trace.Types.Timing.Milli(time)));
      // Limit the number of markers to one per pixel.
      if (filteredMarkers.has(position)) {
        continue;
      }
      filteredMarkers.set(position, marker);
      marker.style.left = position + 'px';
    }
    this.overviewGrid.removeEventDividers();
    this.overviewGrid.addEventDividers([...filteredMarkers.values()]);
  }

  reset(): void {
    this.windowStartTime = Trace.Types.Timing.Milli(0);
    this.windowEndTime = Trace.Types.Timing.Milli(Infinity);
    this.overviewCalculator.reset();
    this.overviewGrid.reset();
    this.overviewGrid.setResizeEnabled(false);
    this.cursorEnabled = false;
    this.hideCursor();
    this.markers = new Map();
    for (const control of this.overviewControls) {
      control.reset();
    }
    this.#overviewInfoVisible = false;
    this.#overviewInfoElements = [];
    this.overviewInfo.hide();
    this.scheduleUpdate();
  }

  private onClick(event: Event): boolean {
    return this.overviewControls.some(control => control.onClick(event));
  }

  private onBreadcrumbAdded(): void {
    this.dispatchEventToListeners(Events.OVERVIEW_PANE_BREADCRUMB_ADDED, {
      startTime: Trace.Types.Timing.Milli(this.windowStartTime),
      endTime: Trace.Types.Timing.Milli(this.windowEndTime),
    });
  }

  private onWindowChanged(event: Common.EventTarget.EventTargetEvent<WindowChangedWithPositionEvent>): void {
    if (this.muteOnWindowChanged) {
      return;
    }
    // Always use first control as a time converter.
    if (!this.overviewControls.length) {
      return;
    }

    this.windowStartTime = Trace.Types.Timing.Milli(
        event.data.rawStartValue === this.overviewCalculator.minimumBoundary() ? 0 : event.data.rawStartValue);
    this.windowEndTime = Trace.Types.Timing.Milli(
        event.data.rawEndValue === this.overviewCalculator.maximumBoundary() ? Infinity : event.data.rawEndValue);

    const windowTimes = {
      startTime: Trace.Types.Timing.Milli(this.windowStartTime),
      endTime: Trace.Types.Timing.Milli(this.windowEndTime),
    };

    this.dispatchEventToListeners(Events.OVERVIEW_PANE_WINDOW_CHANGED, windowTimes);
  }

  setWindowTimes(startTime: Trace.Types.Timing.Milli, endTime: Trace.Types.Timing.Milli): void {
    if (startTime === this.windowStartTime && endTime === this.windowEndTime) {
      return;
    }
    this.windowStartTime = startTime;
    this.windowEndTime = endTime;
    this.updateWindow();
  }

  private updateWindow(): void {
    if (!this.overviewControls.length) {
      return;
    }
    const absoluteMin = this.overviewCalculator.minimumBoundary();
    const timeSpan = this.overviewCalculator.maximumBoundary() - absoluteMin;
    const haveRecords = absoluteMin > 0;
    const left = haveRecords && this.windowStartTime ? Math.min((this.windowStartTime - absoluteMin) / timeSpan, 1) : 0;
    const right = haveRecords && this.windowEndTime < Infinity ? (this.windowEndTime - absoluteMin) / timeSpan : 1;
    this.muteOnWindowChanged = true;
    this.overviewGrid.setWindowRatio(left, right);
    this.muteOnWindowChanged = false;
  }

  /**
   * Desaturates the overview outside of the given time bounds.
   *
   * @param bounds the time bounds to keep saturated.
   * @param withBracket whether to draw a bracket above the time bounds.
   */
  highlightBounds(bounds: Trace.Types.Timing.TraceWindowMicro, withBracket: boolean): void {
    this.#dimMarkers(bounds);
    this.#highlight = {
      left: this.overviewCalculator.computePosition(Trace.Helpers.Timing.microToMilli(bounds.min)),
      right: this.overviewCalculator.computePosition(Trace.Helpers.Timing.microToMilli(bounds.max)),
      withBracket,
    };
    this.requestUpdate();
  }

  clearBoundsHighlight(): void {
    this.#dimMarkers();
    this.#highlight = null;
    this.requestUpdate();
  }
}

export const enum Events {
  OVERVIEW_PANE_WINDOW_CHANGED = 'OverviewPaneWindowChanged',
  OVERVIEW_PANE_BREADCRUMB_ADDED = 'OverviewPaneBreadcrumbAdded',
  OVERVIEW_PANE_MOUSE_MOVE = 'OverviewPaneMouseMove',
  OVERVIEW_PANE_MOUSE_LEAVE = 'OverviewPaneMouseLeave',
}

export interface OverviewPaneWindowChangedEvent {
  startTime: Trace.Types.Timing.Milli;
  endTime: Trace.Types.Timing.Milli;
}

export interface OverviewPaneBreadcrumbAddedEvent {
  startTime: Trace.Types.Timing.Milli;
  endTime: Trace.Types.Timing.Milli;
}

export interface OverviewPaneMouseMoveEvent {
  timeInMicroSeconds: Trace.Types.Timing.Micro;
}

export interface EventTypes {
  [Events.OVERVIEW_PANE_WINDOW_CHANGED]: OverviewPaneWindowChangedEvent;
  [Events.OVERVIEW_PANE_BREADCRUMB_ADDED]: OverviewPaneBreadcrumbAddedEvent;
  [Events.OVERVIEW_PANE_MOUSE_MOVE]: OverviewPaneMouseMoveEvent;
  [Events.OVERVIEW_PANE_MOUSE_LEAVE]: void;
}

export interface TimelineOverview {
  show(parentElement: Element, insertBefore?: Element|null): void;
  // if start and end are specified, data will be filtered and only data within those bound will be displayed
  update(start?: Trace.Types.Timing.Milli, end?: Trace.Types.Timing.Milli): void;
  dispose(): void;
  reset(): void;
  overviewInfoPromise(x: number): Promise<Element|null>;
  onClick(event: Event): boolean;
  setCalculator(calculator: TimelineOverviewCalculator): void;
}

export class TimelineOverviewBase extends UI.Widget.VBox implements TimelineOverview {
  #calculator: TimelineOverviewCalculator|null;
  private canvas: HTMLCanvasElement;
  #context: CanvasRenderingContext2D|null;

  constructor(options?: UI.Widget.WidgetOptions);
  constructor(element?: HTMLElement, options?: UI.Widget.WidgetOptions);
  constructor(elementOrOptions?: HTMLElement|UI.Widget.WidgetOptions, options?: UI.Widget.WidgetOptions) {
    if (elementOrOptions instanceof HTMLElement) {
      super(elementOrOptions, options);
    } else {
      super(elementOrOptions ?? options);
    }
    this.#calculator = null;
    // Subclasses (such as `TimelineEventOverview`) render their own Lit content
    // into `this.element`, so the base class cannot render the canvas with Lit.
    // eslint-disable-next-line @devtools/no-imperative-dom-api
    this.canvas = this.element.createChild('canvas', 'fill');
    this.#context = this.canvas.getContext('2d');
  }

  width(): number {
    return this.canvas.width;
  }

  height(): number {
    return this.canvas.height;
  }

  context(): CanvasRenderingContext2D {
    if (!this.#context) {
      throw new Error('Unable to retrieve canvas context');
    }
    return this.#context;
  }

  calculator(): TimelineOverviewCalculator|null {
    return this.#calculator;
  }

  update(): void {
    throw new Error('Not implemented');
  }

  dispose(): void {
    this.detach();
  }

  reset(): void {
  }

  async overviewInfoPromise(_x: number): Promise<Element|null> {
    return null;
  }

  setCalculator(calculator: TimelineOverviewCalculator): void {
    this.#calculator = calculator;
  }

  onClick(_event: Event): boolean {
    return false;
  }

  resetCanvas(): void {
    if (this.element.clientWidth) {
      this.setCanvasSize(this.element.clientWidth, this.element.clientHeight);
    }
  }

  setCanvasSize(width: number, height: number): void {
    this.canvas.width = width * window.devicePixelRatio;
    this.canvas.height = height * window.devicePixelRatio;
  }
}

export class OverviewInfo {
  readonly #glassPane: UI.GlassPane.GlassPane;
  readonly contentRoot: ShadowRoot;

  constructor() {
    this.#glassPane = new UI.GlassPane.GlassPane();
    this.#glassPane.setPointerEventsBehavior(UI.GlassPane.PointerEventsBehavior.PIERCE_CONTENTS);
    this.#glassPane.setMarginBehavior(UI.GlassPane.MarginBehavior.DEFAULT_MARGIN);
    this.#glassPane.setSizeBehavior(UI.GlassPane.SizeBehavior.MEASURE_CONTENT);
    this.contentRoot = UI.UIUtils.createShadowRootWithCoreStyles(this.#glassPane.contentElement,
                                                                 {cssFile: timelineOverviewInfoStyles});
  }

  show(anchorBox: AnchorBox|null): void {
    this.#glassPane.setContentAnchorBox(anchorBox);
    if (!this.#glassPane.isShowing()) {
      this.#glassPane.show(window.document);
    }
  }

  hide(): void {
    this.#glassPane.hide();
  }
}
