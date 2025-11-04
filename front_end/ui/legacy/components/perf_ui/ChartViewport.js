// Copyright 2016 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../../../core/common/common.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as RenderCoordinator from '../../../components/render_coordinator/render_coordinator.js';
import * as UI from '../../legacy.js';
import chartViewPortStyles from './chartViewport.css.js';
import { MinimalTimeWindowMs } from './FlameChart.js';
export class ChartViewport extends UI.Widget.VBox {
    delegate;
    viewportElement;
    #alwaysShowVerticalScroll;
    rangeSelectionEnabled;
    vScrollElement;
    vScrollContent;
    selectionOverlay;
    cursorElement;
    #isDragging;
    totalHeight;
    offsetHeight;
    scrollTop;
    rangeSelectionStart;
    rangeSelectionEnd;
    dragStartPointX;
    dragStartPointY;
    dragStartScrollTop;
    visibleLeftTime;
    visibleRightTime;
    offsetWidth;
    targetLeftTime;
    targetRightTime;
    selectionOffsetShiftX;
    selectionStartX;
    lastMouseOffsetX;
    minimumBoundary;
    totalTime;
    isUpdateScheduled;
    cancelWindowTimesAnimation;
    #config;
    constructor(delegate, config) {
        super();
        this.#config = config;
        this.registerRequiredCSS(chartViewPortStyles);
        this.delegate = delegate;
        this.viewportElement = this.contentElement.createChild('div', 'fill');
        this.viewportElement.addEventListener('mousemove', this.updateCursorPosition.bind(this), false);
        this.viewportElement.addEventListener('mouseout', this.onMouseOut.bind(this), false);
        this.viewportElement.addEventListener('wheel', this.onMouseWheel.bind(this), false);
        this.viewportElement.addEventListener('keydown', this.onChartKeyDown.bind(this), false);
        this.viewportElement.addEventListener('keyup', this.onChartKeyUp.bind(this), false);
        UI.UIUtils.installDragHandle(this.viewportElement, this.startDragging.bind(this), this.dragging.bind(this), this.endDragging.bind(this), '-webkit-grabbing', null);
        UI.UIUtils.installDragHandle(this.viewportElement, this.startRangeSelection.bind(this), this.rangeSelectionDragging.bind(this), this.endRangeSelection.bind(this), 'text', null);
        this.#alwaysShowVerticalScroll = false;
        this.rangeSelectionEnabled = true;
        this.vScrollElement = this.contentElement.createChild('div', 'chart-viewport-v-scroll');
        this.vScrollContent = this.vScrollElement.createChild('div');
        this.vScrollElement.addEventListener('scroll', this.onScroll.bind(this), false);
        this.selectionOverlay = this.contentElement.createChild('div', 'chart-viewport-selection-overlay hidden');
        this.cursorElement = this.contentElement.createChild('div', 'chart-cursor-element hidden');
        this.reset();
        this.rangeSelectionStart = null;
        this.rangeSelectionEnd = null;
    }
    alwaysShowVerticalScroll() {
        this.#alwaysShowVerticalScroll = true;
        this.vScrollElement.classList.add('always-show-scrollbar');
    }
    disableRangeSelection() {
        this.rangeSelectionEnabled = false;
        this.rangeSelectionStart = null;
        this.rangeSelectionEnd = null;
    }
    isDragging() {
        return this.#isDragging;
    }
    elementsToRestoreScrollPositionsFor() {
        return [this.vScrollElement];
    }
    verticalScrollBarVisible() {
        return !this.vScrollElement.classList.contains('hidden');
    }
    updateScrollBar() {
        const showScroll = this.#alwaysShowVerticalScroll || this.totalHeight > this.offsetHeight;
        if (this.vScrollElement.classList.contains('hidden') !== showScroll) {
            return;
        }
        this.vScrollElement.classList.toggle('hidden', !showScroll);
        this.updateContentElementSize();
    }
    onResize() {
        this.updateScrollBar();
        this.updateContentElementSize();
        this.scheduleUpdate();
    }
    reset() {
        this.vScrollElement.scrollTop = 0;
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
    updateContentElementSize() {
        let offsetWidth = this.vScrollElement.offsetLeft;
        if (!offsetWidth) {
            offsetWidth = this.contentElement.offsetWidth;
        }
        this.offsetWidth = offsetWidth;
        this.offsetHeight = this.contentElement.offsetHeight;
        this.delegate.setSize(this.offsetWidth, this.offsetHeight);
    }
    setContentHeight(totalHeight) {
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
    /**
     * @param centered If true, scrolls offset to where it is centered on the chart,
     * based on current the this.offsetHeight value.
     */
    setScrollOffset(offset, height, centered) {
        height = height || 0;
        if (centered) {
            // Half of the height for padding.
            const halfPadding = Math.floor(this.offsetHeight / 2);
            if (this.vScrollElement.scrollTop > offset) {
                // Need to scroll up, include height.
                this.vScrollElement.scrollTop = offset - (height + halfPadding);
            }
        }
        else if (this.vScrollElement.scrollTop > offset) {
            this.vScrollElement.scrollTop = offset;
        }
        if (this.vScrollElement.scrollTop < offset - this.offsetHeight + height) {
            this.vScrollElement.scrollTop = offset - this.offsetHeight + height;
        }
    }
    scrollOffset() {
        // Return the cached value, rather than the live value (which typically incurs a forced reflow)
        // In practice, this is true whenever scrollOffset() is called:  `this.scrollTop === this.vScrollElement.scrollTop`
        return this.scrollTop;
    }
    chartHeight() {
        return this.offsetHeight;
    }
    setBoundaries(zeroTime, totalTime) {
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
    onMouseWheel(wheelEvent) {
        const navigation = Common.Settings.Settings.instance().moduleSetting('flamechart-selected-navigation').get();
        // Delta for navigation left, right, up and down.
        // Calculated from horizontal or vertical scroll delta, depending on which one exists.
        const panDelta = (wheelEvent.deltaY || wheelEvent.deltaX) / 53 * this.offsetHeight / 8;
        const zoomDelta = Math.pow(1.2, (wheelEvent.deltaY || wheelEvent.deltaX) * 1 / 53) - 1;
        if (navigation === 'classic') {
            if (wheelEvent.shiftKey) { // Scroll
                this.vScrollElement.scrollTop += panDelta;
            }
            else if (Math.abs(wheelEvent.deltaX) > Math.abs(wheelEvent.deltaY)) { // Pan left/right on trackpad horizontal scroll
                // Horizontal scroll on the trackpad feels smoother when only deltaX is taken into account
                this.handleHorizontalPanGesture(wheelEvent.deltaX, /* animate */ true);
            }
            else { // Zoom
                this.handleZoomGesture(zoomDelta);
            }
        }
        else if (navigation === 'modern') {
            const isCtrlOrCmd = UI.KeyboardShortcut.KeyboardShortcut.eventHasCtrlEquivalentKey(wheelEvent);
            if (wheelEvent.shiftKey) { // Pan left/right
                this.handleHorizontalPanGesture(panDelta, /* animate */ true);
            }
            else if (Math.abs(wheelEvent.deltaX) > Math.abs(wheelEvent.deltaY)) { // Pan left/right on trackpad horizontal scroll
                // Horizontal scroll on the trackpad feels smoother when only deltaX is taken into account
                this.handleHorizontalPanGesture(wheelEvent.deltaX, /* animate */ true);
            }
            else if (isCtrlOrCmd) { // Zoom
                this.handleZoomGesture(zoomDelta);
            }
            else { // Scroll
                this.vScrollElement.scrollTop += panDelta;
            }
        }
        // Block swipe gesture.
        wheelEvent.consume(true);
    }
    startDragging(event) {
        if (event.shiftKey) {
            return false;
        }
        this.#isDragging = true;
        this.dragStartPointX = event.pageX;
        this.dragStartPointY = event.pageY;
        this.dragStartScrollTop = this.vScrollElement.scrollTop;
        this.viewportElement.style.cursor = '';
        return true;
    }
    dragging(event) {
        const pixelShift = this.dragStartPointX - event.pageX;
        this.dragStartPointX = event.pageX;
        this.handleHorizontalPanGesture(pixelShift);
        const pixelScroll = this.dragStartPointY - event.pageY;
        this.vScrollElement.scrollTop = this.dragStartScrollTop + pixelScroll;
    }
    endDragging() {
        this.#isDragging = false;
    }
    startRangeSelection(event) {
        if (!event.shiftKey || !this.rangeSelectionEnabled) {
            return false;
        }
        this.#isDragging = true;
        this.selectionOffsetShiftX = event.offsetX - event.pageX;
        this.selectionStartX = event.offsetX;
        return true;
    }
    endRangeSelection() {
        this.#isDragging = false;
        this.selectionStartX = null;
    }
    hideRangeSelection() {
        this.selectionOverlay.classList.add('hidden');
        this.rangeSelectionStart = null;
        this.rangeSelectionEnd = null;
    }
    /**
     * @param startTime the start time of the selection in MilliSeconds
     * @param endTime the end time of the selection in MilliSeconds
     * TODO(crbug.com/346312365): update the type definitions in ChartViewport.ts
     */
    setRangeSelection(startTime, endTime) {
        if (!this.rangeSelectionEnabled) {
            return;
        }
        this.rangeSelectionStart = Math.min(startTime, endTime);
        this.rangeSelectionEnd = Math.max(startTime, endTime);
        this.delegate.updateRangeSelection(this.rangeSelectionStart, this.rangeSelectionEnd);
    }
    onClick(event) {
        const mouseEvent = event;
        const time = this.pixelToTime(mouseEvent.offsetX);
        if (this.rangeSelectionStart !== null && this.rangeSelectionEnd !== null && time >= this.rangeSelectionStart &&
            time <= this.rangeSelectionEnd) {
            return;
        }
        this.hideRangeSelection();
    }
    rangeSelectionDragging(event) {
        const x = Platform.NumberUtilities.clamp(event.pageX + this.selectionOffsetShiftX, 0, this.offsetWidth);
        const start = this.pixelToTime(this.selectionStartX || 0);
        const end = this.pixelToTime(x);
        this.setRangeSelection(start, end);
    }
    onScroll() {
        this.scrollTop = this.vScrollElement.scrollTop;
        this.scheduleUpdate();
    }
    onMouseOut() {
        this.lastMouseOffsetX = -1;
        this.showCursor(false);
    }
    updateCursorPosition(e) {
        const mouseEvent = e;
        this.lastMouseOffsetX = mouseEvent.offsetX;
        const shouldShowCursor = this.#config.enableCursorElement && mouseEvent.shiftKey && !mouseEvent.metaKey;
        this.showCursor(shouldShowCursor);
        if (shouldShowCursor) {
            this.cursorElement.style.left = mouseEvent.offsetX + 'px';
        }
    }
    pixelToTime(x) {
        return this.pixelToTimeOffset(x) + this.visibleLeftTime;
    }
    pixelToTimeOffset(x) {
        return x * (this.visibleRightTime - this.visibleLeftTime) / this.offsetWidth;
    }
    timeToPosition(time) {
        return Math.floor((time - this.visibleLeftTime) / (this.visibleRightTime - this.visibleLeftTime) * this.offsetWidth);
    }
    timeToPixel() {
        return this.offsetWidth / (this.visibleRightTime - this.visibleLeftTime);
    }
    showCursor(visible) {
        this.cursorElement.classList.toggle('hidden', !visible || this.#isDragging);
    }
    onChartKeyDown(keyboardEvent) {
        this.showCursor(keyboardEvent.shiftKey);
        this.handleZoomPanScrollKeys(keyboardEvent);
    }
    onChartKeyUp(keyboardEvent) {
        this.showCursor(keyboardEvent.shiftKey);
    }
    handleZoomPanScrollKeys(keyboardEvent) {
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
            case 'Equal': // '+' key for zoom in
            case 'KeyW':
                this.handleZoomGesture(-zoomFactor);
                break;
            case 'Minus': // '-' key for zoom out
            case 'KeyS':
                this.handleZoomGesture(zoomFactor);
                break;
            case 'ArrowUp':
                if (keyboardEvent.shiftKey) {
                    this.vScrollElement.scrollTop -= scrollOffset;
                }
                break;
            case 'ArrowDown':
                if (keyboardEvent.shiftKey) {
                    this.vScrollElement.scrollTop += scrollOffset;
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
    handleZoomGesture(zoom) {
        const bounds = { left: this.targetLeftTime, right: this.targetRightTime };
        // If the user has not moved their mouse over the panel (unlikely but
        // possible!), the offsetX will be undefined. In that case, let's just use
        // the minimum time / pixel 0 as their mouse point.
        const cursorTime = this.pixelToTime(this.lastMouseOffsetX || 0);
        bounds.left += (bounds.left - cursorTime) * zoom;
        bounds.right += (bounds.right - cursorTime) * zoom;
        this.requestWindowTimes(bounds, /* animate */ true);
    }
    handleHorizontalPanGesture(offset, animate) {
        const bounds = { left: this.targetLeftTime, right: this.targetRightTime };
        const timeOffset = Platform.NumberUtilities.clamp(this.pixelToTimeOffset(offset), this.minimumBoundary - bounds.left, this.totalTime + this.minimumBoundary - bounds.right);
        bounds.left += timeOffset;
        bounds.right += timeOffset;
        this.requestWindowTimes(bounds, Boolean(animate));
    }
    requestWindowTimes(bounds, animate) {
        const maxBound = this.minimumBoundary + this.totalTime;
        if (bounds.left < this.minimumBoundary) {
            bounds.right = Math.min(bounds.right + this.minimumBoundary - bounds.left, maxBound);
            bounds.left = this.minimumBoundary;
        }
        else if (bounds.right > maxBound) {
            bounds.left = Math.max(bounds.left - bounds.right + maxBound, this.minimumBoundary);
            bounds.right = maxBound;
        }
        if (bounds.right - bounds.left < MinimalTimeWindowMs) {
            return;
        }
        this.delegate.windowChanged(bounds.left, bounds.right, animate);
    }
    scheduleUpdate() {
        if (this.cancelWindowTimesAnimation || this.isUpdateScheduled) {
            return;
        }
        this.isUpdateScheduled = true;
        void RenderCoordinator.write(() => {
            this.isUpdateScheduled = false;
            this.update();
        });
    }
    update() {
        this.delegate.update();
    }
    willHide() {
        super.willHide();
        // Stop animations when the view is hidden (or destroyed).
        // In this case, we also jump the time immediately to the target time, so
        // that if the view is restored, the time shown is correct.
        if (this.cancelWindowTimesAnimation) {
            this.cancelWindowTimesAnimation();
            this.setWindowTimes(this.targetLeftTime, this.targetRightTime, false);
        }
    }
    setWindowTimes(startTime, endTime, animate) {
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
        this.cancelWindowTimesAnimation = UI.UIUtils.animateFunction(this.element.window(), animateWindowTimes.bind(this), [{ from: this.visibleLeftTime, to: startTime }, { from: this.visibleRightTime, to: endTime }], 100, () => {
            this.cancelWindowTimesAnimation = null;
        });
        function animateWindowTimes(startTime, endTime) {
            // We cancel the animation in the willHide method, but as an extra check
            // bail here if we are hidden rather than queue an update.
            if (!this.isShowing()) {
                return;
            }
            this.visibleLeftTime = startTime;
            this.visibleRightTime = endTime;
            this.update();
        }
    }
    windowLeftTime() {
        return this.visibleLeftTime;
    }
    windowRightTime() {
        return this.visibleRightTime;
    }
}
//# sourceMappingURL=ChartViewport.js.map