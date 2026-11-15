// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-lit-render-outside-of-view */

import * as Common from '../../../../core/common/common.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as RenderCoordinator from '../../../components/render_coordinator/render_coordinator.js';
import {Directives, html, render} from '../../../lit/lit.js';
import * as SettingsUI from '../../../settings/settings.js';
import * as UI from '../../legacy.js';

import chartViewPortStyles from './chartViewport.css.js';
import {MinimalTimeWindowMs} from './FlameChart.js';

const {classMap, ref, styleMap} = Directives;

export interface ChartViewportDelegate {
  windowChanged(startTime: number, endTime: number, animate: boolean): void;
  updateRangeSelection(startTime: number, endTime: number): void;
  setSize(width: number, height: number): void;
  update(): void;
}

export interface Config {
  /**
   * Configures if the Chart should show a vertical line at the position of the
   * mouse cursor when the user holds the `Shift` key.
   * The reason this is configurable is because within the Performance Panel
   * we use our own overlays system for UI like this, so we do not need the
   * ChartViewport to manage it.
   */
  enableCursorElement: boolean;
}

export class ChartViewport extends UI.Widget.VBox {
  readonly delegate: ChartViewportDelegate;
  #alwaysShowVerticalScroll: boolean;
  #verticalScrollVisible = true;
  #cursorVisible = false;
  #cursorPosition: number|null = null;
  private rangeSelectionEnabled: boolean;
  #isDragging!: boolean;
  private totalHeight = 0;
  offsetHeight!: number;
  private scrollTop!: number;
  private rangeSelectionStart: number|null;
  private rangeSelectionEnd: number|null;
  private dragStartPointX!: number;
  private dragStartPointY!: number;
  private dragStartScrollTop!: number;
  private visibleLeftTime!: number;
  private visibleRightTime!: number;
  offsetWidth!: number;
  private targetLeftTime!: number;
  private targetRightTime!: number;
  private selectionOffsetShiftX!: number;
  private selectionStartX!: number|null;
  private lastMouseOffsetX?: number;
  private minimumBoundary!: number;
  private totalTime!: number;
  private isUpdateScheduled?: boolean;
  /**
   * Tracks an in-flight `setWindowTimes` `requestAnimationFrame` loop so high-frequency
   * events (such as trackpad `wheel` zooming and panning) can retarget the animation in
   * place without canceling the pending frame.
   */
  #animState: {
    rafId: number,
    fromLeft: number,
    fromRight: number,
    startClockMs: DOMHighResTimeStamp,
    lastRafClockMs: DOMHighResTimeStamp|null,
    needsRetarget: boolean,
  }|null = null;

  #config: Config;
  #viewportElement?: HTMLElement;
  #vScrollElement?: HTMLElement;

  constructor(delegate: ChartViewportDelegate, config: Config) {
    super();
    this.#config = config;

    this.delegate = delegate;
    this.#alwaysShowVerticalScroll = false;
    this.rangeSelectionEnabled = true;

    // Render synchronously: the FlameChart adds its canvas to `viewportElement`
    // right after construction, and `reset()` below measures the scrollbar.
    this.#renderNow();

    const viewportElement = this.#viewportElement;
    if (viewportElement) {
      viewportElement.addEventListener('wheel', this.onMouseWheel.bind(this), false);
      viewportElement.addEventListener('keydown', this.onChartKeyDown.bind(this), false);
      viewportElement.addEventListener('keyup', this.onChartKeyUp.bind(this), false);
      UI.UIUtils.installDragHandle(viewportElement, this.startDragging.bind(this), this.dragging.bind(this),
                                   this.endDragging.bind(this), '-webkit-grabbing', null);
      UI.UIUtils.installDragHandle(viewportElement, this.startRangeSelection.bind(this),
                                   this.rangeSelectionDragging.bind(this), this.endRangeSelection.bind(this), 'text',
                                   null);
    }

    this.reset();
    this.rangeSelectionStart = null;
    this.rangeSelectionEnd = null;
  }

  /**
   * The canvas host of the chart. Callers add their own content (such as the
   * FlameChart canvas) to it.
   */
  get viewportElement(): HTMLElement {
    const viewportElement = this.#viewportElement;
    if (!viewportElement) {
      throw new Error('The ChartViewport view did not provide a viewport element');
    }
    return viewportElement;
  }

  override performUpdate(): void {
    // clang-format off
    render(html`
      <style>${chartViewPortStyles}</style>
      <div
        class="fill"
        @mousemove=${(e: MouseEvent) => this.#onMouseMove(e)}
        @mouseout=${() => this.#onMouseOut()}
        ${ref(el => { this.#viewportElement = el instanceof HTMLElement ? el : undefined; })}></div>
      <div
        class=${classMap({'chart-viewport-v-scroll': true, 'always-show-scrollbar': this.#alwaysShowVerticalScroll})}
        ?hidden=${!this.#verticalScrollVisible}
        @scroll=${(e: Event) => { if (e.currentTarget instanceof HTMLElement) { this.#onScroll(e.currentTarget.scrollTop); } }}
        ${ref(el => { this.#vScrollElement = el instanceof HTMLElement ? el : undefined; })}>
        <div style=${styleMap({height: `${this.totalHeight}px`})}></div>
      </div>
      <div
        class="chart-cursor-element"
        ?hidden=${!this.#cursorVisible}
        style=${styleMap({left: this.#cursorPosition === null ? undefined : `${this.#cursorPosition}px`})}></div>
    `, this.contentElement);
    // clang-format on
  }

  /**
   * Renders synchronously. This is used instead of `requestUpdate()` when the
   * caller reads the layout right after the change: the scrollbar position in
   * `updateContentElementSize()`, or the scroll range when it sets `scrollTop`.
   */
  #renderNow(): void {
    this.performUpdate();
  }

  #getScrollTop(): number {
    return this.#vScrollElement?.scrollTop ?? 0;
  }

  #setScrollTop(scrollTop: number): void {
    if (this.#vScrollElement) {
      this.#vScrollElement.scrollTop = scrollTop;
    }
  }

  alwaysShowVerticalScroll(): void {
    if (this.#alwaysShowVerticalScroll) {
      return;
    }
    this.#alwaysShowVerticalScroll = true;
    this.updateScrollBar();
    this.requestUpdate();
  }

  disableRangeSelection(): void {
    this.rangeSelectionEnabled = false;
    this.rangeSelectionStart = null;
    this.rangeSelectionEnd = null;
  }

  isDragging(): boolean {
    return this.#isDragging;
  }

  override elementsToRestoreScrollPositionsFor(): Element[] {
    return this.#vScrollElement ? [this.#vScrollElement] : [];
  }

  verticalScrollBarVisible(): boolean {
    return this.#verticalScrollVisible;
  }

  private updateScrollBar(): void {
    const showScroll = this.#alwaysShowVerticalScroll || this.totalHeight > this.offsetHeight;
    if (this.#verticalScrollVisible === showScroll) {
      return;
    }
    this.#verticalScrollVisible = showScroll;
    this.#renderNow();
    this.updateContentElementSize();
  }

  override onResize(): void {
    this.updateScrollBar();
    this.updateContentElementSize();
    this.scheduleUpdate();
  }

  reset(): void {
    this.#setScrollTop(0);
    this.scrollTop = 0;
    this.rangeSelectionStart = null;
    this.rangeSelectionEnd = null;
    this.#isDragging = false;
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
    this.isUpdateScheduled = false;
    this.updateContentElementSize();
  }

  updateContentElementSize(): void {
    let offsetWidth: number = this.#vScrollElement?.offsetLeft ?? 0;
    if (!offsetWidth) {
      offsetWidth = this.contentElement.offsetWidth;
    }
    this.offsetWidth = offsetWidth;
    this.offsetHeight = this.contentElement.offsetHeight;
    this.delegate.setSize(this.offsetWidth, this.offsetHeight);
  }

  setContentHeight(totalHeight: number): void {
    this.totalHeight = totalHeight;
    this.#renderNow();
    this.updateScrollBar();
    this.updateContentElementSize();
    if (this.scrollTop + this.offsetHeight <= totalHeight) {
      return;
    }
    this.scrollTop = Math.max(0, totalHeight - this.offsetHeight);
    this.#setScrollTop(this.scrollTop);
  }

  /**
   * @param centered If true, scrolls offset to where it is centered on the chart,
   * based on current the this.offsetHeight value.
   */
  setScrollOffset(offset: number, height?: number, centered?: boolean): void {
    height = height || 0;
    if (centered) {
      // Half of the height for padding.
      const halfPadding = Math.floor(this.offsetHeight / 2);

      if (this.#getScrollTop() > offset) {
        // Need to scroll up, include height.
        this.#setScrollTop(offset - (height + halfPadding));
      }
    } else if (this.#getScrollTop() > offset) {
      this.#setScrollTop(offset);
    }

    if (this.#getScrollTop() < offset - this.offsetHeight + height) {
      this.#setScrollTop(offset - this.offsetHeight + height);
    }
  }

  scrollOffset(): number {
    // Return the cached value, rather than the live value (which typically incurs a forced reflow)
    // In practice, this is true whenever scrollOffset() is called:  `this.scrollTop === this.#getScrollTop()`
    return this.scrollTop;
  }

  chartHeight(): number {
    return this.offsetHeight;
  }

  setBoundaries(zeroTime: number, totalTime: number): void {
    this.minimumBoundary = zeroTime;
    this.totalTime = totalTime;
  }

  /**
   * The mouse wheel can results in flamechart zoom, scroll and pan actions, depending on the scroll deltas and the selected navigation:
   *
   * Classic navigation:
   * 1. Mouse Wheel --> Zoom
   * 2. Mouse Wheel + Shift --> Scroll
   * 3. Trackpad: Mouse Wheel AND horizontal scroll (deltaX > deltaY): --> Pan left/right
   *
   * Modern navigation:
   * 1. Mouse Wheel -> Scroll
   * 2. Mouse Wheel + Shift -> Pan left/right
   * 3. Mouse Wheel + Ctrl/Cmd -> Zoom
   * 4. Trackpad: Mouse Wheel AND horizontal scroll (deltaX > deltaY): --> Zoom
   */
  private onMouseWheel(wheelEvent: WheelEvent): void {
    const navigation = Common.Settings.Settings.instance()
                           .resolve(SettingsUI.TimelineSettings.flamechartSelectedNavigationSettingDescriptor)
                           .get();
    // Delta for navigation left, right, up and down.
    // Calculated from horizontal or vertical scroll delta, depending on which one exists.
    const panDelta = (wheelEvent.deltaY || wheelEvent.deltaX) / 53 * this.offsetHeight / 8;
    const zoomDelta = Math.pow(1.2, (wheelEvent.deltaY || wheelEvent.deltaX) * 1 / 53) - 1;

    if (navigation === 'classic') {
      if (wheelEvent.shiftKey) {  // Scroll
        this.#setScrollTop(this.#getScrollTop() + panDelta);
      } else if (
          Math.abs(wheelEvent.deltaX) > Math.abs(wheelEvent.deltaY)) {  // Pan left/right on trackpad horizontal scroll
        // Horizontal scroll on the trackpad feels smoother when only deltaX is taken into account
        this.handleHorizontalPanGesture(wheelEvent.deltaX, /* animate */ true);
      } else {  // Zoom
        this.handleZoomGesture(zoomDelta);
      }
    } else if (navigation === 'modern') {
      const isCtrlOrCmd = UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(wheelEvent);
      if (wheelEvent.shiftKey) {  // Pan left/right
        this.handleHorizontalPanGesture(panDelta, /* animate */ true);
      } else if (
          Math.abs(wheelEvent.deltaX) > Math.abs(wheelEvent.deltaY)) {  // Pan left/right on trackpad horizontal scroll
        // Horizontal scroll on the trackpad feels smoother when only deltaX is taken into account
        this.handleHorizontalPanGesture(wheelEvent.deltaX, /* animate */ true);
      } else if (isCtrlOrCmd) {  // Zoom
        this.handleZoomGesture(zoomDelta);
      } else {  // Scroll
        this.#setScrollTop(this.#getScrollTop() + panDelta);
      }
    }

    // Block swipe gesture.
    wheelEvent.consume(true);
  }

  private startDragging(event: MouseEvent): boolean {
    if (event.shiftKey) {
      return false;
    }
    this.#isDragging = true;
    this.dragStartPointX = event.pageX;
    this.dragStartPointY = event.pageY;
    this.dragStartScrollTop = this.#getScrollTop();
    // The FlameChart sets the cursor of the shared canvas host on hover.
    this.viewportElement.style.cursor = '';
    return true;
  }

  private dragging(event: MouseEvent): void {
    const pixelShift = this.dragStartPointX - event.pageX;
    this.dragStartPointX = event.pageX;
    this.handleHorizontalPanGesture(pixelShift);
    const pixelScroll = this.dragStartPointY - event.pageY;
    this.#setScrollTop(this.dragStartScrollTop + pixelScroll);
  }

  private endDragging(): void {
    this.#isDragging = false;
  }

  private startRangeSelection(event: MouseEvent): boolean {
    if (!event.shiftKey || !this.rangeSelectionEnabled) {
      return false;
    }
    this.#isDragging = true;
    this.selectionOffsetShiftX = event.offsetX - event.pageX;
    this.selectionStartX = event.offsetX;
    return true;
  }

  private endRangeSelection(): void {
    this.#isDragging = false;
    this.selectionStartX = null;
  }

  hideRangeSelection(): void {
    this.rangeSelectionStart = null;
    this.rangeSelectionEnd = null;
  }

  /**
   * @param startTime the start time of the selection in MilliSeconds
   * @param endTime the end time of the selection in MilliSeconds
   * TODO(crbug.com/346312365): update the type definitions in ChartViewport.ts
   */
  setRangeSelection(startTime: number, endTime: number): void {
    if (!this.rangeSelectionEnabled) {
      return;
    }
    this.rangeSelectionStart = Math.min(startTime, endTime);
    this.rangeSelectionEnd = Math.max(startTime, endTime);
    this.delegate.updateRangeSelection(this.rangeSelectionStart, this.rangeSelectionEnd);
  }

  onClick(event: MouseEvent): void {
    const mouseEvent = event;
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

  #onScroll(scrollTop: number): void {
    this.scrollTop = scrollTop;
    this.scheduleUpdate();
  }

  #onMouseOut(): void {
    this.lastMouseOffsetX = -1;
    this.#showCursor(false);
  }

  #onMouseMove({offsetX, shiftKey, metaKey}: MouseEvent): void {
    this.lastMouseOffsetX = offsetX;
    const shouldShowCursor = this.#config.enableCursorElement && shiftKey && !metaKey;
    this.#showCursor(shouldShowCursor, shouldShowCursor ? offsetX : this.#cursorPosition);
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

  #showCursor(visible: boolean, position = this.#cursorPosition): void {
    const cursorVisible = this.#config.enableCursorElement && visible && !this.#isDragging;
    if (this.#cursorVisible === cursorVisible && this.#cursorPosition === position) {
      return;
    }
    this.#cursorVisible = cursorVisible;
    this.#cursorPosition = position;
    this.requestUpdate();
  }

  private onChartKeyDown(keyboardEvent: KeyboardEvent): void {
    const position = this.lastMouseOffsetX !== undefined && this.lastMouseOffsetX >= 0 ? this.lastMouseOffsetX :
                                                                                         this.#cursorPosition;
    this.#showCursor(keyboardEvent.shiftKey, position);
    this.handleZoomPanScrollKeys(keyboardEvent);
  }

  private onChartKeyUp(keyboardEvent: KeyboardEvent): void {
    this.#showCursor(keyboardEvent.shiftKey);
  }

  private handleZoomPanScrollKeys(keyboardEvent: KeyboardEvent): void {
    // Do not zoom, pan or scroll if the key combination has any modifiers other than shift key
    if (UI.KeyboardShortcut.KeyboardShortcut.hasAtLeastOneModifier(keyboardEvent) && !keyboardEvent.shiftKey) {
      return;
    }
    const zoomFactor = keyboardEvent.shiftKey ? 0.8 : 0.3;
    const panOffset = 160;
    const scrollOffset = 50;
    switch (keyboardEvent.code) {
      case 'KeyA':
        this.handleHorizontalPanGesture(-panOffset, /* animate */ true);
        break;
      case 'KeyD':
        this.handleHorizontalPanGesture(panOffset, /* animate */ true);
        break;
      case 'Equal':  // '+' key for zoom in
      case 'KeyW':
        this.handleZoomGesture(-zoomFactor);
        break;
      case 'Minus':  // '-' key for zoom out
      case 'KeyS':
        this.handleZoomGesture(zoomFactor);
        break;
      case 'ArrowUp':
        if (keyboardEvent.shiftKey) {
          this.#setScrollTop(this.#getScrollTop() - scrollOffset);
        }
        break;
      case 'ArrowDown':
        if (keyboardEvent.shiftKey) {
          this.#setScrollTop(this.#getScrollTop() + scrollOffset);
        }
        break;
      case 'ArrowLeft':
        if (keyboardEvent.shiftKey) {
          this.handleHorizontalPanGesture(-panOffset, /* animate */ true);
        }
        break;
      case 'ArrowRight':
        if (keyboardEvent.shiftKey) {
          this.handleHorizontalPanGesture(panOffset, /* animate */ true);
        }
        break;
      default:
        return;
    }
    keyboardEvent.consume(true);
  }

  private handleZoomGesture(zoom: number): void {
    const bounds = {left: this.targetLeftTime, right: this.targetRightTime};
    // If the user has not moved their mouse over the panel (unlikely but
    // possible!), the offsetX will be undefined. In that case, let's just use
    // the minimum time / pixel 0 as their mouse point.
    const cursorTime = this.pixelToTime(this.lastMouseOffsetX || 0);
    bounds.left += (bounds.left - cursorTime) * zoom;
    bounds.right += (bounds.right - cursorTime) * zoom;
    this.requestWindowTimes(bounds, /* animate */ true);
  }

  private handleHorizontalPanGesture(offset: number, animate?: boolean): void {
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
    if (this.#animState !== null || this.isUpdateScheduled) {
      return;
    }
    this.isUpdateScheduled = true;
    void RenderCoordinator.write(() => {
      this.isUpdateScheduled = false;
      this.update();
    });
  }

  update(): void {
    this.delegate.update();
  }

  #cancelWindowTimesAnimation(): void {
    if (this.#animState !== null) {
      this.element.window().cancelAnimationFrame(this.#animState.rafId);
      this.#animState = null;
    }
  }

  override willHide(): void {
    super.willHide();
    // Stop animations when the view is hidden (or destroyed).
    // In this case, we also jump the time immediately to the target time, so
    // that if the view is restored, the time shown is correct.
    if (this.#animState !== null) {
      this.#cancelWindowTimesAnimation();
      this.setWindowTimes(this.targetLeftTime, this.targetRightTime, false);
    }
  }

  /**
   * Updates the visible window to `[startTime, endTime]`.
   *
   * ### Why in-place retargeting is needed
   * In Chromium's `BeginMainThreadFrame` pipeline, aligned `wheel` input events are
   * dispatched at the start of the frame (`HandleInputEvent`), immediately before
   * `requestAnimationFrame` callbacks (`FireAnimationFrame`) execute in that same frame.
   *
   * Canceling the active `requestAnimationFrame` and starting a new animation anchored
   * at `performance.now()` on every `wheel` event starves itself:
   * 1. `wheel` runs during `HandleInputEvent` and records `start = performance.now()`.
   * 2. Moments later in the same `BeginMainThreadFrame`, `FireAnimationFrame` runs and
   *    passes the frame's vsync clock (`rafClockMs <= start`), so
   *    `(rafClockMs - start) / duration` clamps to `0` and the visible window does not move.
   * 3. On the next vsync, the next `wheel` event cancels the second frame before it can
   *    run and starts over from `completionRatio = 0`, freezing the viewport until scrolling stops.
   *
   * Instead, if an animation is already in flight (`this.#animState !== null`), we preserve
   * the scheduled frame, update `fromLeft`/`fromRight` to the current visible bounds, and
   * backdate `startClockMs` by one clamped frame delta (`[8ms, 32ms]`, or `16ms` on the
   * initial frame) on the next tick so `completionRatio` advances smoothly on every vsync.
   */
  setWindowTimes(startTime: number, endTime: number, animate?: boolean): void {
    // If already animating to the requested target, let the active animation continue.
    if (animate && this.#animState !== null && this.targetLeftTime === startTime && this.targetRightTime === endTime) {
      return;
    }

    // If already at rest at the target window with no active animation, nothing to do.
    if (this.#animState === null && this.visibleLeftTime === startTime && this.visibleRightTime === endTime) {
      return;
    }

    // Only animate if requested and both current and target bounds are finite, valid ranges.
    // Initial loads (where visibleLeftTime/RightTime are 0 or uninitialized) and sentinel
    // ranges (like Infinity) snap instantly to prevent animation glitches or NaN calculations.
    const hasInitialWindow = Number.isFinite(this.visibleLeftTime) && Number.isFinite(this.visibleRightTime) &&
        this.visibleRightTime > this.visibleLeftTime;
    const isFiniteTarget = Number.isFinite(startTime) && Number.isFinite(endTime) && endTime > startTime;
    const canAnimate = Boolean(animate) && hasInitialWindow && isFiniteTarget;

    this.targetLeftTime = startTime;
    this.targetRightTime = endTime;

    if (!canAnimate) {
      this.#cancelWindowTimesAnimation();
      // Snap instantly.
      this.visibleLeftTime = startTime;
      this.visibleRightTime = endTime;
      this.scheduleUpdate();
      return;
    }

    // If a frame is already scheduled, retarget in place without canceling the pending rAF.
    if (this.#animState !== null) {
      this.#animState.fromLeft = this.visibleLeftTime;
      this.#animState.fromRight = this.visibleRightTime;
      this.#animState.needsRetarget = true;
      return;
    }

    const durationMs = 100;
    const defaultInitialStepMs = 16;
    const state = {
      rafId: 0,
      fromLeft: this.visibleLeftTime,
      fromRight: this.visibleRightTime,
      startClockMs: 0 as DOMHighResTimeStamp,
      lastRafClockMs: null as DOMHighResTimeStamp | null,
      needsRetarget: true,
    };
    this.#animState = state;

    const win = this.element.window();
    const animationStep = (rafClockMs: DOMHighResTimeStamp): void => {
      if (this.#animState !== state || !this.isShowing()) {
        this.#animState = null;
        return;
      }
      if (state.needsRetarget) {
        // Estimate the wall-clock duration of a single frame so that the first step
        // after starting or retargeting advances immediately by one frame's worth of
        // completion rather than evaluating `(rafClockMs - rafClockMs) / durationMs = 0`.
        const frameDeltaMs = state.lastRafClockMs !== null ?
            Platform.NumberUtilities.clamp(rafClockMs - state.lastRafClockMs, 8, 32) :
            defaultInitialStepMs;
        state.startClockMs = rafClockMs - frameDeltaMs;
        state.needsRetarget = false;
      }
      state.lastRafClockMs = rafClockMs;

      // Calculate how far through the 100ms wall-clock transition we are as a [0, 1] ratio
      // (0 = 0% / at fromLeft/fromRight, 1 = 100% / reached targetLeftTime/targetRightTime).
      const completionRatio = Platform.NumberUtilities.clamp((rafClockMs - state.startClockMs) / durationMs, 0, 1);
      this.visibleLeftTime = state.fromLeft + (this.targetLeftTime - state.fromLeft) * completionRatio;
      this.visibleRightTime = state.fromRight + (this.targetRightTime - state.fromRight) * completionRatio;
      this.update();

      if (completionRatio < 1) {
        // Transition has not reached 100% yet; schedule the next animation frame.
        state.rafId = win.requestAnimationFrame(animationStep);
      } else {
        // Reached 100% (targetLeftTime, targetRightTime); clear state.
        this.#animState = null;
      }
    };

    state.rafId = win.requestAnimationFrame(animationStep);
  }

  windowLeftTime(): number {
    return this.visibleLeftTime;
  }

  windowRightTime(): number {
    return this.visibleRightTime;
  }
}
