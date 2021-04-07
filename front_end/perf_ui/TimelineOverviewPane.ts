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

/* eslint-disable rulesdir/no_underscored_properties */

import * as Common from '../core/common/common.js';
import * as SDK from '../core/sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as UI from '../ui/legacy/legacy.js';

import {Events as OverviewGridEvents, OverviewGrid} from './OverviewGrid.js';
import {Calculator} from './TimelineGrid.js';  // eslint-disable-line no-unused-vars

export class TimelineOverviewPane extends UI.Widget.VBox {
  _overviewCalculator: TimelineOverviewCalculator;
  _overviewGrid: OverviewGrid;
  _cursorArea: HTMLElement;
  _cursorElement: HTMLElement;
  _overviewControls: TimelineOverview[];
  _markers: Map<number, Element>;
  _overviewInfo: OverviewInfo;
  _updateThrottler: Common.Throttler.Throttler;
  _cursorEnabled: boolean;
  _cursorPosition: number;
  _lastWidth: number;
  _windowStartTime: number;
  _windowEndTime: number;
  _muteOnWindowChanged: boolean;

  constructor(prefix: string) {
    super();
    this.element.id = prefix + '-overview-pane';

    this._overviewCalculator = new TimelineOverviewCalculator();
    this._overviewGrid = new OverviewGrid(prefix, this._overviewCalculator);
    this.element.appendChild(this._overviewGrid.element);
    this._cursorArea = this._overviewGrid.element.createChild('div', 'overview-grid-cursor-area');
    this._cursorElement = this._overviewGrid.element.createChild('div', 'overview-grid-cursor-position');
    this._cursorArea.addEventListener('mousemove', this._onMouseMove.bind(this), true);
    this._cursorArea.addEventListener('mouseleave', this._hideCursor.bind(this), true);

    this._overviewGrid.setResizeEnabled(false);
    this._overviewGrid.addEventListener(OverviewGridEvents.WindowChanged, this._onWindowChanged, this);
    this._overviewGrid.setClickHandler(this._onClick.bind(this));
    this._overviewControls = [];
    this._markers = new Map();

    this._overviewInfo = new OverviewInfo(this._cursorElement);
    this._updateThrottler = new Common.Throttler.Throttler(100);

    this._cursorEnabled = false;
    this._cursorPosition = 0;
    this._lastWidth = 0;

    this._windowStartTime = 0;
    this._windowEndTime = Infinity;
    this._muteOnWindowChanged = false;
  }

  _onMouseMove(event: Event): void {
    if (!this._cursorEnabled) {
      return;
    }
    const mouseEvent = (event as MouseEvent);
    const target = (event.target as HTMLElement);
    this._cursorPosition = mouseEvent.offsetX + target.offsetLeft;
    this._cursorElement.style.left = this._cursorPosition + 'px';
    this._cursorElement.style.visibility = 'visible';
    this._overviewInfo.setContent(this._buildOverviewInfo());
  }

  async _buildOverviewInfo(): Promise<DocumentFragment> {
    const document = this.element.ownerDocument;
    const x = this._cursorPosition;
    const elements = await Promise.all(this._overviewControls.map(control => control.overviewInfoPromise(x)));
    const fragment = document.createDocumentFragment();
    const nonNullElements = (elements.filter(element => element !== null) as Element[]);
    fragment.append(...nonNullElements);
    return fragment;
  }

  _hideCursor(): void {
    this._cursorElement.style.visibility = 'hidden';
    this._overviewInfo.hide();
  }

  wasShown(): void {
    this._update();
  }

  willHide(): void {
    this._overviewInfo.hide();
  }

  onResize(): void {
    const width = this.element.offsetWidth;
    if (width === this._lastWidth) {
      return;
    }
    this._lastWidth = width;
    this.scheduleUpdate();
  }

  setOverviewControls(overviewControls: TimelineOverview[]): void {
    for (let i = 0; i < this._overviewControls.length; ++i) {
      this._overviewControls[i].dispose();
    }

    for (let i = 0; i < overviewControls.length; ++i) {
      overviewControls[i].setCalculator(this._overviewCalculator);
      overviewControls[i].show(this._overviewGrid.element);
    }
    this._overviewControls = overviewControls;
    this._update();
  }

  setBounds(minimumBoundary: number, maximumBoundary: number): void {
    this._overviewCalculator.setBounds(minimumBoundary, maximumBoundary);
    this._overviewGrid.setResizeEnabled(true);
    this._cursorEnabled = true;
  }

  setNavStartTimes(navStartTimes: Map<string, SDK.TracingModel.Event>): void {
    this._overviewCalculator.setNavStartTimes(navStartTimes);
  }

  scheduleUpdate(): void {
    this._updateThrottler.schedule(async () => {
      this._update();
    });
  }

  _update(): void {
    if (!this.isShowing()) {
      return;
    }
    this._overviewCalculator.setDisplayWidth(this._overviewGrid.clientWidth());
    for (let i = 0; i < this._overviewControls.length; ++i) {
      this._overviewControls[i].update();
    }
    this._overviewGrid.updateDividers(this._overviewCalculator);
    this._updateMarkers();
    this._updateWindow();
  }

  setMarkers(markers: Map<number, Element>): void {
    this._markers = markers;
  }

  _updateMarkers(): void {
    const filteredMarkers = new Map<number, Element>();
    for (const time of this._markers.keys()) {
      const marker = this._markers.get(time) as HTMLElement;
      const position = Math.round(this._overviewCalculator.computePosition(time));
      // Limit the number of markers to one per pixel.
      if (filteredMarkers.has(position)) {
        continue;
      }
      filteredMarkers.set(position, marker);
      marker.style.left = position + 'px';
    }
    this._overviewGrid.removeEventDividers();
    this._overviewGrid.addEventDividers([...filteredMarkers.values()]);
  }

  reset(): void {
    this._windowStartTime = 0;
    this._windowEndTime = Infinity;
    this._overviewCalculator.reset();
    this._overviewGrid.reset();
    this._overviewGrid.setResizeEnabled(false);
    this._cursorEnabled = false;
    this._hideCursor();
    this._markers = new Map();
    for (const control of this._overviewControls) {
      control.reset();
    }
    this._overviewInfo.hide();
    this.scheduleUpdate();
  }

  _onClick(event: Event): boolean {
    return this._overviewControls.some(control => control.onClick(event));
  }

  _onWindowChanged(event: Common.EventTarget.EventTargetEvent): void {
    if (this._muteOnWindowChanged) {
      return;
    }
    // Always use first control as a time converter.
    if (!this._overviewControls.length) {
      return;
    }

    this._windowStartTime = event.data.rawStartValue;
    this._windowEndTime = event.data.rawEndValue;
    const windowTimes = {startTime: this._windowStartTime, endTime: this._windowEndTime};

    this.dispatchEventToListeners(Events.WindowChanged, windowTimes);
  }

  setWindowTimes(startTime: number, endTime: number): void {
    if (startTime === this._windowStartTime && endTime === this._windowEndTime) {
      return;
    }
    this._windowStartTime = startTime;
    this._windowEndTime = endTime;
    this._updateWindow();
    this.dispatchEventToListeners(Events.WindowChanged, {startTime: startTime, endTime: endTime});
  }

  _updateWindow(): void {
    if (!this._overviewControls.length) {
      return;
    }
    const absoluteMin = this._overviewCalculator.minimumBoundary();
    const timeSpan = this._overviewCalculator.maximumBoundary() - absoluteMin;
    const haveRecords = absoluteMin > 0;
    const left =
        haveRecords && this._windowStartTime ? Math.min((this._windowStartTime - absoluteMin) / timeSpan, 1) : 0;
    const right = haveRecords && this._windowEndTime < Infinity ? (this._windowEndTime - absoluteMin) / timeSpan : 1;
    this._muteOnWindowChanged = true;
    this._overviewGrid.setWindow(left, right);
    this._muteOnWindowChanged = false;
  }
}

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  WindowChanged = 'WindowChanged',
}


export class TimelineOverviewCalculator implements Calculator {
  _minimumBoundary!: number;
  _maximumBoundary!: number;
  _workingArea!: number;
  _navStartTimes?: Map<string, SDK.TracingModel.Event>;

  constructor() {
    this.reset();
  }

  computePosition(time: number): number {
    return (time - this._minimumBoundary) / this.boundarySpan() * this._workingArea;
  }

  positionToTime(position: number): number {
    return position / this._workingArea * this.boundarySpan() + this._minimumBoundary;
  }

  setBounds(minimumBoundary: number, maximumBoundary: number): void {
    this._minimumBoundary = minimumBoundary;
    this._maximumBoundary = maximumBoundary;
  }

  setNavStartTimes(navStartTimes: Map<string, SDK.TracingModel.Event>): void {
    this._navStartTimes = navStartTimes;
  }

  setDisplayWidth(clientWidth: number): void {
    this._workingArea = clientWidth;
  }

  reset(): void {
    this.setBounds(0, 100);
  }

  formatValue(value: number, precision?: number): string {
    // If there are nav start times the value needs to be remapped.
    if (this._navStartTimes) {
      // Find the latest possible nav start time which is considered earlier
      // than the value passed through.
      const navStartTimes = Array.from(this._navStartTimes.values());
      for (let i = navStartTimes.length - 1; i >= 0; i--) {
        if (value > navStartTimes[i].startTime) {
          value -= (navStartTimes[i].startTime - this.zeroTime());
          break;
        }
      }
    }

    return Number.preciseMillisToString(value - this.zeroTime(), precision);
  }

  maximumBoundary(): number {
    return this._maximumBoundary;
  }

  minimumBoundary(): number {
    return this._minimumBoundary;
  }

  zeroTime(): number {
    return this._minimumBoundary;
  }

  boundarySpan(): number {
    return this._maximumBoundary - this._minimumBoundary;
  }
}

export interface TimelineOverview {
  show(parentElement: Element, insertBefore?: Element|null): void;
  update(): void;
  dispose(): void;
  reset(): void;
  overviewInfoPromise(x: number): Promise<Element|null>;
  onClick(event: Event): boolean;
  setCalculator(calculator: TimelineOverviewCalculator): void;
}

export class TimelineOverviewBase extends UI.Widget.VBox implements TimelineOverview {
  _calculator: TimelineOverviewCalculator|null;
  _canvas: HTMLCanvasElement;
  _context: CanvasRenderingContext2D|null;

  constructor() {
    super();
    this._calculator = null;
    this._canvas = (this.element.createChild('canvas', 'fill') as HTMLCanvasElement);
    this._context = this._canvas.getContext('2d');
  }

  width(): number {
    return this._canvas.width;
  }

  height(): number {
    return this._canvas.height;
  }

  context(): CanvasRenderingContext2D {
    if (!this._context) {
      throw new Error('Unable to retrieve canvas context');
    }
    return this._context as CanvasRenderingContext2D;
  }

  calculator(): TimelineOverviewCalculator|null {
    return this._calculator;
  }

  update(): void {
    this.resetCanvas();
  }

  dispose(): void {
    this.detach();
  }

  reset(): void {
  }

  overviewInfoPromise(_x: number): Promise<Element|null> {
    return Promise.resolve((null as Element | null));
  }

  setCalculator(calculator: TimelineOverviewCalculator): void {
    this._calculator = calculator;
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
    this._canvas.width = width * window.devicePixelRatio;
    this._canvas.height = height * window.devicePixelRatio;
  }
}

export class OverviewInfo {
  _anchorElement: Element;
  _glassPane: UI.GlassPane.GlassPane;
  _visible: boolean;
  _element: Element;

  constructor(anchor: Element) {
    this._anchorElement = anchor;
    this._glassPane = new UI.GlassPane.GlassPane();
    this._glassPane.setPointerEventsBehavior(UI.GlassPane.PointerEventsBehavior.PierceContents);
    this._glassPane.setMarginBehavior(UI.GlassPane.MarginBehavior.Arrow);
    this._glassPane.setSizeBehavior(UI.GlassPane.SizeBehavior.MeasureContent);
    this._visible = false;
    this._element =
        UI.Utils
            .createShadowRootWithCoreStyles(
                this._glassPane.contentElement,
                {cssFile: 'perf_ui/timelineOverviewInfo.css', enableLegacyPatching: false, delegatesFocus: undefined})
            .createChild('div', 'overview-info');
  }

  async setContent(contentPromise: Promise<DocumentFragment>): Promise<void> {
    this._visible = true;
    const content = await contentPromise;
    if (!this._visible) {
      return;
    }
    this._element.removeChildren();
    this._element.appendChild(content);
    this._glassPane.setContentAnchorBox(this._anchorElement.boxInWindow());
    if (!this._glassPane.isShowing()) {
      this._glassPane.show((this._anchorElement.ownerDocument as Document));
    }
  }

  hide(): void {
    this._visible = false;
    this._glassPane.hide();
  }
}
