/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../../../core/common/common.js';
import * as Trace from '../../../../models/trace/trace.js';
import * as VisualLoggging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';
import * as ThemeSupport from '../../theme_support/theme_support.js';

import {Events as OverviewGridEvents, OverviewGrid, type WindowChangedWithPositionEvent} from './OverviewGrid.js';
import {TimelineOverviewCalculator} from './TimelineOverviewCalculator.js';
import timelineOverviewInfoStyles from './timelineOverviewInfo.css.js';

export class TimelineOverviewPane extends Common.ObjectWrapper.eventMixin<EventTypes, typeof UI.Widget.VBox>(
    UI.Widget.VBox) {
  readonly overviewCalculator: TimelineOverviewCalculator;
  private readonly overviewGrid: OverviewGrid;
  private readonly cursorArea: HTMLElement;
  private cursorElement: HTMLElement;
  private overviewControls: TimelineOverview[];
  private markers: Map<number, Element>;
  private readonly overviewInfo: OverviewInfo;
  private readonly updateThrottler: Common.Throttler.Throttler;
  private cursorEnabled: boolean;
  private cursorPosition: number;
  private lastWidth: number;
  private windowStartTime: number;
  private windowEndTime: number;
  private muteOnWindowChanged: boolean;
  #dimHighlightSVG: Element;

  constructor(prefix: string) {
    super();
    this.element.id = prefix + '-overview-pane';

    this.overviewCalculator = new TimelineOverviewCalculator();
    this.overviewGrid = new OverviewGrid(prefix, this.overviewCalculator);
    this.overviewGrid.element.setAttribute(
        'jslog', `${VisualLoggging.timeline(`${prefix}-overview`).track({click: true, drag: true, hover: true})}`);
    this.element.appendChild(this.overviewGrid.element);
    this.cursorArea = this.overviewGrid.element.createChild('div', 'overview-grid-cursor-area');
    this.cursorElement = this.overviewGrid.element.createChild('div', 'overview-grid-cursor-position');
    this.cursorArea.addEventListener('mousemove', this.onMouseMove.bind(this), true);
    this.cursorArea.addEventListener('mouseleave', this.hideCursor.bind(this), true);

    this.overviewGrid.setResizeEnabled(false);
    this.overviewGrid.addEventListener(OverviewGridEvents.WINDOW_CHANGED_WITH_POSITION, this.onWindowChanged, this);
    this.overviewGrid.addEventListener(OverviewGridEvents.BREADCRUMB_ADDED, this.onBreadcrumbAdded, this);
    this.overviewGrid.setClickHandler(this.onClick.bind(this));
    this.overviewControls = [];
    this.markers = new Map();

    this.overviewInfo = new OverviewInfo(this.cursorElement);
    this.updateThrottler = new Common.Throttler.Throttler(100);

    this.cursorEnabled = false;
    this.cursorPosition = 0;
    this.lastWidth = 0;

    this.windowStartTime = 0;
    this.windowEndTime = Infinity;
    this.muteOnWindowChanged = false;

    this.#dimHighlightSVG = UI.UIUtils.createSVGChild(this.element, 'svg', 'timeline-minimap-dim-highlight-svg hidden');
    this.#initializeDimHighlightSVG();
  }

  enableCreateBreadcrumbsButton(): void {
    const breadcrumbsElement = this.overviewGrid.enableCreateBreadcrumbsButton();
    breadcrumbsElement.addEventListener('mousemove', this.onMouseMove.bind(this), true);
    breadcrumbsElement.addEventListener('mouseleave', this.hideCursor.bind(this), true);
  }

  private onMouseMove(event: Event): void {
    if (!this.cursorEnabled) {
      return;
    }
    const mouseEvent = (event as MouseEvent);
    const target = (event.target as HTMLElement);
    const offsetLeftRelativeToCursorArea =
        target.getBoundingClientRect().left - this.cursorArea.getBoundingClientRect().left;
    this.cursorPosition = mouseEvent.offsetX + offsetLeftRelativeToCursorArea;
    this.cursorElement.style.left = this.cursorPosition + 'px';
    this.cursorElement.style.visibility = 'visible';

    // Dispatch an event to notify the flame chart to show a timestamp marker for the current timestamp if it's visible
    // in the flame chart.
    const timeInMilliSeconds = this.overviewCalculator.positionToTime(this.cursorPosition);
    const timeWindow = this.overviewGrid.calculateWindowValue();
    if (Trace.Types.Timing.MilliSeconds(timeWindow.rawStartValue) <= timeInMilliSeconds &&
        timeInMilliSeconds <= Trace.Types.Timing.MilliSeconds(timeWindow.rawEndValue)) {
      const timeInMicroSeconds = Trace.Helpers.Timing.millisecondsToMicroseconds(timeInMilliSeconds);
      this.dispatchEventToListeners(Events.OVERVIEW_PANE_MOUSE_MOVE, {timeInMicroSeconds});
    } else {
      this.dispatchEventToListeners(Events.OVERVIEW_PANE_MOUSE_LEAVE);
    }

    void this.overviewInfo.setContent(this.buildOverviewInfo());
  }

  private async buildOverviewInfo(): Promise<DocumentFragment> {
    const document = this.element.ownerDocument;
    const x = this.cursorPosition;
    const elements = await Promise.all(this.overviewControls.map(control => control.overviewInfoPromise(x)));
    const fragment = document.createDocumentFragment();
    const nonNullElements = (elements.filter(element => element !== null) as Element[]);
    fragment.append(...nonNullElements);
    return fragment;
  }

  private hideCursor(): void {
    this.cursorElement.style.visibility = 'hidden';
    this.dispatchEventToListeners(Events.OVERVIEW_PANE_MOUSE_LEAVE);
    this.overviewInfo.hide();
  }

  override wasShown(): void {
    this.update();
  }

  override willHide(): void {
    this.overviewInfo.hide();
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

  setBounds(minimumBoundary: Trace.Types.Timing.MilliSeconds, maximumBoundary: Trace.Types.Timing.MilliSeconds): void {
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

  scheduleUpdate(start?: Trace.Types.Timing.MilliSeconds, end?: Trace.Types.Timing.MilliSeconds): void {
    void this.updateThrottler.schedule(async () => {
      this.update(start, end);
    });
  }

  private update(start?: Trace.Types.Timing.MilliSeconds, end?: Trace.Types.Timing.MilliSeconds): void {
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

  setMarkers(markers: Map<number, Element>): void {
    this.markers = markers;
  }

  getMarkers(): Map<number, Element> {
    return this.markers;
  }

  private updateMarkers(): void {
    const filteredMarkers = new Map<number, Element>();
    for (const time of this.markers.keys()) {
      const marker = this.markers.get(time) as HTMLElement;
      const position = Math.round(this.overviewCalculator.computePosition(Trace.Types.Timing.MilliSeconds(time)));
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
    this.windowStartTime = 0;
    this.windowEndTime = Infinity;
    this.overviewCalculator.reset();
    this.overviewGrid.reset();
    this.overviewGrid.setResizeEnabled(false);
    this.cursorEnabled = false;
    this.hideCursor();
    this.markers = new Map();
    for (const control of this.overviewControls) {
      control.reset();
    }
    this.overviewInfo.hide();
    this.scheduleUpdate();
  }

  private onClick(event: Event): boolean {
    return this.overviewControls.some(control => control.onClick(event));
  }

  private onBreadcrumbAdded(): void {
    this.dispatchEventToListeners(Events.OVERVIEW_PANE_BREADCRUMB_ADDED, {
      startTime: Trace.Types.Timing.MilliSeconds(this.windowStartTime),
      endTime: Trace.Types.Timing.MilliSeconds(this.windowEndTime),
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

    this.windowStartTime =
        event.data.rawStartValue === this.overviewCalculator.minimumBoundary() ? 0 : event.data.rawStartValue;
    this.windowEndTime =
        event.data.rawEndValue === this.overviewCalculator.maximumBoundary() ? Infinity : event.data.rawEndValue;

    const windowTimes = {
      startTime: Trace.Types.Timing.MilliSeconds(this.windowStartTime),
      endTime: Trace.Types.Timing.MilliSeconds(this.windowEndTime),
    };

    this.dispatchEventToListeners(Events.OVERVIEW_PANE_WINDOW_CHANGED, windowTimes);
  }

  setWindowTimes(startTime: number, endTime: number): void {
    if (startTime === this.windowStartTime && endTime === this.windowEndTime) {
      return;
    }
    this.windowStartTime = startTime;
    this.windowEndTime = endTime;
    this.updateWindow();
    this.dispatchEventToListeners(Events.OVERVIEW_PANE_WINDOW_CHANGED, {
      startTime: Trace.Types.Timing.MilliSeconds(startTime),
      endTime: Trace.Types.Timing.MilliSeconds(endTime),
    });
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
   * This function will create three rectangles and a polygon, which will be use to highlight the time range.
   */
  #initializeDimHighlightSVG(): void {
    // Set up the desaturation mask
    const defs = UI.UIUtils.createSVGChild(this.#dimHighlightSVG, 'defs');
    const mask = UI.UIUtils.createSVGChild(defs, 'mask') as SVGMaskElement;
    mask.id = 'dim-highlight-cutouts';
    /* Within the mask...
        - black fill = punch, fully transparently, through to the next thing. these are the cutouts to the color.
        - white fill = be 100% desaturated
        - grey fill  = show at the Lightness level of grayscale/desaturation
    */

    // This a rectangle covers the entire SVG and has a light gray fill. This sets the base desaturation level for the
    // masked area.
    // The colour here should be fixed because the colour's brightness changes the desaturation level.
    const showAllRect = UI.UIUtils.createSVGChild(mask, 'rect');
    showAllRect.setAttribute('width', '100%');
    showAllRect.setAttribute('height', '100%');
    showAllRect.setAttribute('fill', 'hsl(0deg 0% 95%)');

    // This rectangle also covers the entire SVG and has a fill with the current background. It is linked to the
    // `mask` element.
    // The `mixBlendMode` is set to 'saturation', so this rectangle will completely desaturate the area it covers
    // within the mask.
    const desaturateRect = UI.UIUtils.createSVGChild(this.#dimHighlightSVG, 'rect', 'background') as SVGRectElement;
    desaturateRect.setAttribute('width', '100%');
    desaturateRect.setAttribute('height', '100%');
    desaturateRect.setAttribute('fill', ThemeSupport.ThemeSupport.instance().getComputedValue('--color-background'));
    desaturateRect.setAttribute('mask', `url(#${mask.id})`);
    desaturateRect.style.mixBlendMode = 'saturation';

    // This rectangle is positioned at the top of the not-to-desaturate time range, with full height and a black fill.
    // It will be used to "punch" through the desaturation, revealing the original colours beneath.
    // The *black* fill on the "punch-out" rectangle is crucial because black is fully transparent in a mask.
    const punchRect = UI.UIUtils.createSVGChild(mask, 'rect', 'punch');
    punchRect.setAttribute('y', '0');
    punchRect.setAttribute('height', '100%');
    punchRect.setAttribute('fill', 'black');

    // This polygon is for the bracket beyond the not desaturated area.
    const bracketColor = ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-state-on-header-hover');
    const bracket = UI.UIUtils.createSVGChild(this.#dimHighlightSVG, 'polygon') as SVGRectElement;
    bracket.setAttribute('fill', bracketColor);

    ThemeSupport.ThemeSupport.instance().addEventListener(ThemeSupport.ThemeChangeEvent.eventName, () => {
      const desaturateRect = this.#dimHighlightSVG.querySelector('rect.background');
      desaturateRect?.setAttribute('fill', ThemeSupport.ThemeSupport.instance().getComputedValue('--color-background'));

      const bracket = this.#dimHighlightSVG.querySelector('polygon');
      bracket?.setAttribute(
          'fill', ThemeSupport.ThemeSupport.instance().getComputedValue('--sys-color-state-on-header-hover'));
    });
  }

  #addBracket(left: number, right: number): void {
    const TRIANGLE_SIZE = 5;  // px size of triangles
    const bracket = this.#dimHighlightSVG.querySelector('polygon');
    bracket?.setAttribute(
        'points',
        `${left},0 ${left},${TRIANGLE_SIZE} ${left + TRIANGLE_SIZE - 1},1 ${right - TRIANGLE_SIZE - 1},1 ${right},${
            TRIANGLE_SIZE} ${right},0`);
    bracket?.classList.remove('hidden');
  }

  #hideBracket(): void {
    const bracket = this.#dimHighlightSVG.querySelector('polygon');
    bracket?.classList.add('hidden');
  }

  highlightBounds(bounds: Trace.Types.Timing.TraceWindowMicroSeconds, withBracket: boolean): void {
    const left = this.overviewCalculator.computePosition(Trace.Helpers.Timing.microSecondsToMilliseconds(bounds.min));
    const right = this.overviewCalculator.computePosition(Trace.Helpers.Timing.microSecondsToMilliseconds(bounds.max));

    // Update the punch out rectangle to the not-to-desaturate time range.
    const punchRect = this.#dimHighlightSVG.querySelector('rect.punch');
    punchRect?.setAttribute('x', left.toString());
    punchRect?.setAttribute('width', (right - left).toString());

    if (withBracket) {
      this.#addBracket(left, right);
    } else {
      this.#hideBracket();
    }

    this.#dimHighlightSVG.classList.remove('hidden');
  }

  clearBoundsHighlight(): void {
    this.#dimHighlightSVG.classList.add('hidden');
  }
}

export const enum Events {
  OVERVIEW_PANE_WINDOW_CHANGED = 'OverviewPaneWindowChanged',
  OVERVIEW_PANE_BREADCRUMB_ADDED = 'OverviewPaneBreadcrumbAdded',
  OVERVIEW_PANE_MOUSE_MOVE = 'OverviewPaneMouseMove',
  OVERVIEW_PANE_MOUSE_LEAVE = 'OverviewPaneMouseLeave',
}

export interface OverviewPaneWindowChangedEvent {
  startTime: Trace.Types.Timing.MilliSeconds;
  endTime: Trace.Types.Timing.MilliSeconds;
}

export interface OverviewPaneBreadcrumbAddedEvent {
  startTime: Trace.Types.Timing.MilliSeconds;
  endTime: Trace.Types.Timing.MilliSeconds;
}

export interface OverviewPaneMouseMoveEvent {
  timeInMicroSeconds: Trace.Types.Timing.MicroSeconds;
}

export type EventTypes = {
  [Events.OVERVIEW_PANE_WINDOW_CHANGED]: OverviewPaneWindowChangedEvent,
  [Events.OVERVIEW_PANE_BREADCRUMB_ADDED]: OverviewPaneBreadcrumbAddedEvent,
  [Events.OVERVIEW_PANE_MOUSE_MOVE]: OverviewPaneMouseMoveEvent,
  [Events.OVERVIEW_PANE_MOUSE_LEAVE]: void,
};

export interface TimelineOverview {
  show(parentElement: Element, insertBefore?: Element|null): void;
  // if start and end are specified, data will be filtered and only data within those bound will be displayed
  update(start?: Trace.Types.Timing.MilliSeconds, end?: Trace.Types.Timing.MilliSeconds): void;
  dispose(): void;
  reset(): void;
  overviewInfoPromise(x: number): Promise<Element|null>;
  onClick(event: Event): boolean;
  setCalculator(calculator: TimelineOverviewCalculator): void;
}

export class TimelineOverviewBase extends UI.Widget.VBox implements TimelineOverview {
  private calculatorInternal: TimelineOverviewCalculator|null;
  private canvas: HTMLCanvasElement;
  private contextInternal: CanvasRenderingContext2D|null;

  constructor() {
    super();
    this.calculatorInternal = null;
    this.canvas = (this.element.createChild('canvas', 'fill') as HTMLCanvasElement);
    this.contextInternal = this.canvas.getContext('2d');
  }

  width(): number {
    return this.canvas.width;
  }

  height(): number {
    return this.canvas.height;
  }

  context(): CanvasRenderingContext2D {
    if (!this.contextInternal) {
      throw new Error('Unable to retrieve canvas context');
    }
    return this.contextInternal as CanvasRenderingContext2D;
  }

  calculator(): TimelineOverviewCalculator|null {
    return this.calculatorInternal;
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
    this.calculatorInternal = calculator;
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
  private readonly anchorElement: Element;
  private glassPane: UI.GlassPane.GlassPane;
  private visible: boolean;
  private readonly element: Element;

  constructor(anchor: Element) {
    this.anchorElement = anchor;
    this.glassPane = new UI.GlassPane.GlassPane();
    this.glassPane.setPointerEventsBehavior(UI.GlassPane.PointerEventsBehavior.PIERCE_CONTENTS);
    this.glassPane.setMarginBehavior(UI.GlassPane.MarginBehavior.ARROW);
    this.glassPane.setSizeBehavior(UI.GlassPane.SizeBehavior.MEASURE_CONTENT);
    this.visible = false;
    this.element = UI.UIUtils
                       .createShadowRootWithCoreStyles(this.glassPane.contentElement, {
                         cssFile: [timelineOverviewInfoStyles],
                         delegatesFocus: undefined,
                       })
                       .createChild('div', 'overview-info');
  }

  async setContent(contentPromise: Promise<DocumentFragment>): Promise<void> {
    this.visible = true;
    const content = await contentPromise;
    if (!this.visible) {
      return;
    }
    this.element.removeChildren();
    this.element.appendChild(content);
    this.glassPane.setContentAnchorBox(this.anchorElement.boxInWindow());
    if (!this.glassPane.isShowing()) {
      this.glassPane.show((this.anchorElement.ownerDocument as Document));
    }
  }

  hide(): void {
    this.visible = false;
    this.glassPane.hide();
  }
}
