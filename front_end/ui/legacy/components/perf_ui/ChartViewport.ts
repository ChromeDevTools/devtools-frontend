// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as UI from '../../legacy.js';

import chartViewPortStyles from './chartViewport.css.legacy.js';
import {MinimalTimeWindowMs} from './FlameChart.js';

export interface ChartViewportDelegate {
  windowChanged(startTime: number, endTime: number, animate: boolean): void;
  updateRangeSelection(startTime: number, endTime: number): void;
  setSize(width: number, height: number): void;
  update(): void;
}

export class ChartViewport extends UI.Widget.VBox {
  private readonly delegate: ChartViewportDelegate;
  viewportElement: HTMLElement;
  private alwaysShowVerticalScrollInternal: boolean;
  private rangeSelectionEnabled: boolean;
  private vScrollElement: HTMLElement;
  private vScrollContent: HTMLElement;
  private readonly selectionOverlay: HTMLElement;
  private selectedTimeSpanLabel: HTMLElement;
  private cursorElement: HTMLElement;
  private isDraggingInternal!: boolean;
  private totalHeight!: number;
  private offsetHeight!: number;
  private scrollTop!: number;
  private rangeSelectionStart: number|null;
  private rangeSelectionEnd: number|null;
  private dragStartPointX!: number;
  private dragStartPointY!: number;
  private dragStartScrollTop!: number;
  private visibleLeftTime!: number;
  private visibleRightTime!: number;
  private offsetWidth!: number;
  private targetLeftTime!: number;
  private targetRightTime!: number;
  private selectionOffsetShiftX!: number;
  private selectionOffsetShiftY!: number;
  private selectionStartX!: number|null;
  private lastMouseOffsetX!: number;
  private minimumBoundary!: number;
  private totalTime!: number;
  private updateTimerId?: number;
  private cancelWindowTimesAnimation?: (() => void)|null;

  constructor(delegate: ChartViewportDelegate) {
    super();
    this.registerRequiredCSS(chartViewPortStyles);

    this.delegate = delegate;

    this.viewportElement = this.contentElement.createChild('div', 'fill');
    this.viewportElement.addEventListener('mousemove', this.updateCursorPosition.bind(this), false);
    this.viewportElement.addEventListener('mouseout', this.onMouseOut.bind(this), false);
    this.viewportElement.addEventListener('wheel', this.onMouseWheel.bind(this), false);
    this.viewportElement.addEventListener('keydown', this.onChartKeyDown.bind(this), false);
    this.viewportElement.addEventListener('keyup', this.onChartKeyUp.bind(this), false);

    UI.UIUtils.installDragHandle(
        this.viewportElement, this.startDragging.bind(this), this.dragging.bind(this), this.endDragging.bind(this),
        '-webkit-grabbing', null);
    UI.UIUtils.installDragHandle(
        this.viewportElement, this.startRangeSelection.bind(this), this.rangeSelectionDragging.bind(this),
        this.endRangeSelection.bind(this), 'text', null);

    this.alwaysShowVerticalScrollInternal = false;
    this.rangeSelectionEnabled = true;
    this.vScrollElement = this.contentElement.createChild('div', 'chart-viewport-v-scroll');
    this.vScrollContent = this.vScrollElement.createChild('div');
    this.vScrollElement.addEventListener('scroll', this.onScroll.bind(this), false);

    this.selectionOverlay = this.contentElement.createChild('div', 'chart-viewport-selection-overlay hidden');
    this.selectedTimeSpanLabel = this.selectionOverlay.createChild('div', 'time-span');

    this.cursorElement = this.contentElement.createChild('div', 'chart-cursor-element hidden');

    this.reset();

    this.rangeSelectionStart = null;

    this.rangeSelectionEnd = null;
  }

  alwaysShowVerticalScroll(): void {
    this.alwaysShowVerticalScrollInternal = true;
    this.vScrollElement.classList.add('always-show-scrollbar');
  }

  disableRangeSelection(): void {
    this.rangeSelectionEnabled = false;
    this.rangeSelectionStart = null;
    this.rangeSelectionEnd = null;
    this.updateRangeSelectionOverlay();
  }

  isDragging(): boolean {
    return this.isDraggingInternal;
  }

  elementsToRestoreScrollPositionsFor(): Element[] {
    return [this.vScrollElement];
  }

  private updateScrollBar(): void {
    const showScroll = this.alwaysShowVerticalScrollInternal || this.totalHeight > this.offsetHeight;
    if (this.vScrollElement.classList.contains('hidden') !== showScroll) {
      return;
    }
    this.vScrollElement.classList.toggle('hidden', !showScroll);
    this.updateContentElementSize();
  }

  onResize(): void {
    this.updateScrollBar();
    this.updateContentElementSize();
    this.scheduleUpdate();
  }

  reset(): void {
    this.vScrollElement.scrollTop = 0;
    this.scrollTop = 0;
    this.rangeSelectionStart = null;
    this.rangeSelectionEnd = null;
    this.isDraggingInternal = false;
    this.dragStartPointX = 0;
    this.dragStartPointY = 0;
    this.dragStartScrollTop = 0;
    this.visibleLeftTime = 0;
    this.visibleRightTime = 0;
    this.offsetWidth = 0;
    this.offsetHeight = 0;
    this.totalHeight = 0;
    this.targetLeftTime = 0;
    this.targetRightTime = 0;
    this.updateContentElementSize();
  }

  private updateContentElementSize(): void {
    let offsetWidth: number = this.vScrollElement.offsetLeft;
    if (!offsetWidth) {
      offsetWidth = this.contentElement.offsetWidth;
    }
    this.offsetWidth = offsetWidth;
    this.offsetHeight = this.contentElement.offsetHeight;
    this.delegate.setSize(this.offsetWidth, this.offsetHeight);
  }

  setContentHeight(totalHeight: number): void {
    this.totalHeight = totalHeight;
    this.vScrollContent.style.height = totalHeight + 'px';
    this.updateScrollBar();
    this.updateContentElementSize();
    if (this.scrollTop + this.offsetHeight <= totalHeight) {
      return;
    }
    this.scrollTop = Math.max(0, totalHeight - this.offsetHeight);
    this.vScrollElement.scrollTop = this.scrollTop;
  }

  setScrollOffset(offset: number, height?: number): void {
    height = height || 0;
    if (this.vScrollElement.scrollTop > offset) {
      this.vScrollElement.scrollTop = offset;
    } else if (this.vScrollElement.scrollTop < offset - this.offsetHeight + height) {
      this.vScrollElement.scrollTop = offset - this.offsetHeight + height;
    }
  }

  scrollOffset(): number {
    return this.vScrollElement.scrollTop;
  }

  chartHeight(): number {
    return this.offsetHeight;
  }

  setBoundaries(zeroTime: number, totalTime: number): void {
    this.minimumBoundary = zeroTime;
    this.totalTime = totalTime;
  }

  private onMouseWheel(e: Event): void {
    const wheelEvent = (e as WheelEvent);
    const doZoomInstead = wheelEvent.shiftKey !==
        (Common.Settings.Settings.instance().moduleSetting('flamechartMouseWheelAction').get() === 'zoom');
    const panVertically = !doZoomInstead && (wheelEvent.deltaY || Math.abs(wheelEvent.deltaX) === 53);
    const panHorizontally = doZoomInstead && Math.abs(wheelEvent.deltaX) > Math.abs(wheelEvent.deltaY);
    if (panVertically) {
      this.vScrollElement.scrollTop += (wheelEvent.deltaY || wheelEvent.deltaX) / 53 * this.offsetHeight / 8;
    } else if (panHorizontally) {
      this.handlePanGesture(wheelEvent.deltaX, /* animate */ true);
    } else {  // Zoom.
      const wheelZoomSpeed = 1 / 53;
      this.handleZoomGesture(Math.pow(1.2, (wheelEvent.deltaY || wheelEvent.deltaX) * wheelZoomSpeed) - 1);
    }

    // Block swipe gesture.
    e.consume(true);
  }

  private startDragging(event: MouseEvent): boolean {
    if (event.shiftKey) {
      return false;
    }
    this.isDraggingInternal = true;
    this.dragStartPointX = event.pageX;
    this.dragStartPointY = event.pageY;
    this.dragStartScrollTop = this.vScrollElement.scrollTop;
    this.viewportElement.style.cursor = '';
    return true;
  }

  private dragging(event: MouseEvent): void {
    const pixelShift = this.dragStartPointX - event.pageX;
    this.dragStartPointX = event.pageX;
    this.handlePanGesture(pixelShift);
    const pixelScroll = this.dragStartPointY - event.pageY;
    this.vScrollElement.scrollTop = this.dragStartScrollTop + pixelScroll;
  }

  private endDragging(): void {
    this.isDraggingInternal = false;
  }

  private startRangeSelection(event: MouseEvent): boolean {
    if (!event.shiftKey || !this.rangeSelectionEnabled) {
      return false;
    }
    this.isDraggingInternal = true;
    this.selectionOffsetShiftX = event.offsetX - event.pageX;
    this.selectionOffsetShiftY = event.offsetY - event.pageY;
    this.selectionStartX = event.offsetX;
    const style = this.selectionOverlay.style;
    style.left = this.selectionStartX + 'px';
    style.width = '1px';
    this.selectedTimeSpanLabel.textContent = '';
    this.selectionOverlay.classList.remove('hidden');
    return true;
  }

  private endRangeSelection(): void {
    this.isDraggingInternal = false;
    this.selectionStartX = null;
  }

  hideRangeSelection(): void {
    this.selectionOverlay.classList.add('hidden');
    this.rangeSelectionStart = null;
    this.rangeSelectionEnd = null;
  }

  setRangeSelection(startTime: number, endTime: number): void {
    if (!this.rangeSelectionEnabled) {
      return;
    }
    this.rangeSelectionStart = Math.min(startTime, endTime);
    this.rangeSelectionEnd = Math.max(startTime, endTime);
    this.updateRangeSelectionOverlay();
    this.delegate.updateRangeSelection(this.rangeSelectionStart, this.rangeSelectionEnd);
  }

  onClick(event: Event): void {
    const mouseEvent = (event as MouseEvent);
    const time = this.pixelToTime(mouseEvent.offsetX);
    if (this.rangeSelectionStart !== null && this.rangeSelectionEnd !== null && time >= this.rangeSelectionStart &&
        time <= this.rangeSelectionEnd) {
      return;
    }
    this.hideRangeSelection();
  }

  private rangeSelectionDragging(event: MouseEvent): void {
    const x = Platform.NumberUtilities.clamp(event.pageX + this.selectionOffsetShiftX, 0, this.offsetWidth);
    const start = this.pixelToTime(this.selectionStartX || 0);
    const end = this.pixelToTime(x);
    this.setRangeSelection(start, end);
  }

  private updateRangeSelectionOverlay(): void {
    const rangeSelectionStart = this.rangeSelectionStart || 0;
    const rangeSelectionEnd = this.rangeSelectionEnd || 0;
    const margin = 100;
    const left =
        Platform.NumberUtilities.clamp(this.timeToPosition(rangeSelectionStart), -margin, this.offsetWidth + margin);
    const right =
        Platform.NumberUtilities.clamp(this.timeToPosition(rangeSelectionEnd), -margin, this.offsetWidth + margin);
    const style = this.selectionOverlay.style;
    style.left = left + 'px';
    style.width = (right - left) + 'px';
    const timeSpan = rangeSelectionEnd - rangeSelectionStart;
    this.selectedTimeSpanLabel.textContent = i18n.TimeUtilities.preciseMillisToString(timeSpan, 2);
  }

  private onScroll(): void {
    this.scrollTop = this.vScrollElement.scrollTop;
    this.scheduleUpdate();
  }

  private onMouseOut(): void {
    this.lastMouseOffsetX = -1;
    this.showCursor(false);
  }

  private updateCursorPosition(e: Event): void {
    const mouseEvent = (e as MouseEvent);
    this.showCursor(mouseEvent.shiftKey);
    this.cursorElement.style.left = mouseEvent.offsetX + 'px';
    this.lastMouseOffsetX = mouseEvent.offsetX;
  }

  pixelToTime(x: number): number {
    return this.pixelToTimeOffset(x) + this.visibleLeftTime;
  }

  pixelToTimeOffset(x: number): number {
    return x * (this.visibleRightTime - this.visibleLeftTime) / this.offsetWidth;
  }

  timeToPosition(time: number): number {
    return Math.floor(
        (time - this.visibleLeftTime) / (this.visibleRightTime - this.visibleLeftTime) * this.offsetWidth);
  }

  timeToPixel(): number {
    return this.offsetWidth / (this.visibleRightTime - this.visibleLeftTime);
  }

  private showCursor(visible: boolean): void {
    this.cursorElement.classList.toggle('hidden', !visible || this.isDraggingInternal);
  }

  private onChartKeyDown(e: Event): void {
    const mouseEvent = (e as MouseEvent);
    this.showCursor(mouseEvent.shiftKey);
    this.handleZoomPanKeys(e);
  }

  private onChartKeyUp(e: Event): void {
    const mouseEvent = (e as MouseEvent);
    this.showCursor(mouseEvent.shiftKey);
  }

  private handleZoomPanKeys(e: Event): void {
    if (!UI.KeyboardShortcut.KeyboardShortcut.hasNoModifiers(e)) {
      return;
    }
    const keyboardEvent = (e as KeyboardEvent);
    const zoomFactor = keyboardEvent.shiftKey ? 0.8 : 0.3;
    const panOffset = keyboardEvent.shiftKey ? 320 : 160;
    switch (keyboardEvent.code) {
      case 'KeyA':
        this.handlePanGesture(-panOffset, /* animate */ true);
        break;
      case 'KeyD':
        this.handlePanGesture(panOffset, /* animate */ true);
        break;
      case 'KeyW':
        this.handleZoomGesture(-zoomFactor);
        break;
      case 'KeyS':
        this.handleZoomGesture(zoomFactor);
        break;
      default:
        return;
    }
    e.consume(true);
  }

  private handleZoomGesture(zoom: number): void {
    const bounds = {left: this.targetLeftTime, right: this.targetRightTime};
    const cursorTime = this.pixelToTime(this.lastMouseOffsetX);
    bounds.left += (bounds.left - cursorTime) * zoom;
    bounds.right += (bounds.right - cursorTime) * zoom;
    this.requestWindowTimes(bounds, /* animate */ true);
  }

  private handlePanGesture(offset: number, animate?: boolean): void {
    const bounds = {left: this.targetLeftTime, right: this.targetRightTime};
    const timeOffset = Platform.NumberUtilities.clamp(
        this.pixelToTimeOffset(offset), this.minimumBoundary - bounds.left,
        this.totalTime + this.minimumBoundary - bounds.right);
    bounds.left += timeOffset;
    bounds.right += timeOffset;
    this.requestWindowTimes(bounds, Boolean(animate));
  }

  private requestWindowTimes(
      bounds: {
        left: number,
        right: number,
      },
      animate: boolean): void {
    const maxBound = this.minimumBoundary + this.totalTime;
    if (bounds.left < this.minimumBoundary) {
      bounds.right = Math.min(bounds.right + this.minimumBoundary - bounds.left, maxBound);
      bounds.left = this.minimumBoundary;
    } else if (bounds.right > maxBound) {
      bounds.left = Math.max(bounds.left - bounds.right + maxBound, this.minimumBoundary);
      bounds.right = maxBound;
    }
    if (bounds.right - bounds.left < MinimalTimeWindowMs) {
      return;
    }
    this.delegate.windowChanged(bounds.left, bounds.right, animate);
  }

  scheduleUpdate(): void {
    if (this.updateTimerId || this.cancelWindowTimesAnimation) {
      return;
    }
    this.updateTimerId = this.element.window().requestAnimationFrame(() => {
      this.updateTimerId = 0;
      this.update();
    });
  }

  private update(): void {
    this.updateRangeSelectionOverlay();
    this.delegate.update();
  }

  setWindowTimes(startTime: number, endTime: number, animate?: boolean): void {
    if (startTime === this.targetLeftTime && endTime === this.targetRightTime) {
      return;
    }
    if (!animate || this.visibleLeftTime === 0 || this.visibleRightTime === Infinity ||
        (startTime === 0 && endTime === Infinity) || (startTime === Infinity && endTime === Infinity)) {
      // Skip animation, move instantly.
      this.targetLeftTime = startTime;
      this.targetRightTime = endTime;
      this.visibleLeftTime = startTime;
      this.visibleRightTime = endTime;
      this.scheduleUpdate();
      return;
    }
    if (this.cancelWindowTimesAnimation) {
      this.cancelWindowTimesAnimation();
      this.visibleLeftTime = this.targetLeftTime;
      this.visibleRightTime = this.targetRightTime;
    }
    this.targetLeftTime = startTime;
    this.targetRightTime = endTime;
    this.cancelWindowTimesAnimation = UI.UIUtils.animateFunction(
        this.element.window(), animateWindowTimes.bind(this),
        [{from: this.visibleLeftTime, to: startTime}, {from: this.visibleRightTime, to: endTime}], 100, () => {
          this.cancelWindowTimesAnimation = null;
        });

    function animateWindowTimes(this: ChartViewport, startTime: number, endTime: number): void {
      this.visibleLeftTime = startTime;
      this.visibleRightTime = endTime;
      this.update();
    }
  }

  windowLeftTime(): number {
    return this.visibleLeftTime;
  }

  windowRightTime(): number {
    return this.visibleRightTime;
  }
}
