// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/**
 * @interface
 */
PerfUI.ChartViewportDelegate = function() {};

PerfUI.ChartViewportDelegate.prototype = {
  /**
   * @param {number} startTime
   * @param {number} endTime
   */
  requestWindowTimes(startTime, endTime) {},

  /**
   * @param {number} startTime
   * @param {number} endTime
   */
  updateRangeSelection(startTime, endTime) {},

  /**
   * @param {number} width
   * @param {number} height
   */
  setSize(width, height) {},

  update() {}
};

/**
 * @unrestricted
 */
PerfUI.ChartViewport = class extends UI.VBox {
  /**
   * @param {!PerfUI.ChartViewportDelegate} delegate
   */
  constructor(delegate) {
    super();
    this.registerRequiredCSS('perf_ui/chartViewport.css');

    this._delegate = delegate;

    this.viewportElement = this.contentElement.createChild('div', 'fill');
    this.viewportElement.addEventListener('mousemove', this._updateCursorPosition.bind(this), false);
    this.viewportElement.addEventListener('mouseout', this._onMouseOut.bind(this), false);
    this.viewportElement.addEventListener('mousewheel', this._onMouseWheel.bind(this), false);
    this.viewportElement.addEventListener('keydown', this._onChartKeyDown.bind(this), false);
    this.viewportElement.addEventListener('keyup', this._onChartKeyUp.bind(this), false);

    UI.installDragHandle(
        this.viewportElement, this._startDragging.bind(this), this._dragging.bind(this), this._endDragging.bind(this),
        '-webkit-grabbing', null);
    UI.installDragHandle(
        this.viewportElement, this._startRangeSelection.bind(this), this._rangeSelectionDragging.bind(this),
        this._endRangeSelection.bind(this), 'text', null);

    this._alwaysShowVerticalScroll = false;
    this._vScrollElement = this.contentElement.createChild('div', 'chart-viewport-v-scroll');
    this._vScrollContent = this._vScrollElement.createChild('div');
    this._vScrollElement.addEventListener('scroll', this._onScroll.bind(this), false);

    this._selectionOverlay = this.contentElement.createChild('div', 'chart-viewport-selection-overlay hidden');
    this._selectedTimeSpanLabel = this._selectionOverlay.createChild('div', 'time-span');

    this._cursorElement = this.contentElement.createChild('div', 'chart-cursor-element hidden');

    this.reset();
  }

  alwaysShowVerticalScroll() {
    this._alwaysShowVerticalScroll = true;
    this._vScrollElement.classList.add('always-show-scrollbar');
  }

  /**
   * @return {boolean}
   */
  isDragging() {
    return this._isDragging;
  }

  /**
   * @override
   * @return {!Array<!Element>}
   */
  elementsToRestoreScrollPositionsFor() {
    return [this._vScrollElement];
  }

  _updateScrollBar() {
    const showScroll = this._alwaysShowVerticalScroll || this._totalHeight > this._offsetHeight;
    if (this._vScrollElement.classList.contains('hidden') !== showScroll)
      return;
    this._vScrollElement.classList.toggle('hidden', !showScroll);
    this._updateContentElementSize();
  }

  /**
   * @override
   */
  onResize() {
    this._updateScrollBar();
    this._updateContentElementSize();
    this.scheduleUpdate();
  }

  reset() {
    this._vScrollElement.scrollTop = 0;
    this._scrollTop = 0;
    this._rangeSelectionStart = 0;
    this._rangeSelectionEnd = 0;
    this._isDragging = false;
    this._dragStartPointX = 0;
    this._dragStartPointY = 0;
    this._dragStartScrollTop = 0;
    this._timeWindowLeft = 0;
    this._timeWindowRight = 0;
    this._offsetWidth = 0;
    this._offsetHeight = 0;
    this._totalHeight = 0;
    this._pendingAnimationTimeLeft = 0;
    this._pendingAnimationTimeRight = 0;
    this._updateContentElementSize();
  }

  _updateContentElementSize() {
    var offsetWidth = this._vScrollElement.offsetLeft;
    if (!offsetWidth)
      offsetWidth = this.contentElement.offsetWidth;
    this._offsetWidth = offsetWidth;
    this._offsetHeight = this.contentElement.offsetHeight;
    this._delegate.setSize(this._offsetWidth, this._offsetHeight);
  }

  /**
   * @param {number} totalHeight
   */
  setContentHeight(totalHeight) {
    this._totalHeight = totalHeight;
    this._vScrollContent.style.height = totalHeight + 'px';
    this._updateScrollBar();
    if (this._scrollTop + this._offsetHeight <= totalHeight)
      return;
    this._scrollTop = Math.max(0, totalHeight - this._offsetHeight);
    this._vScrollElement.scrollTop = this._scrollTop;
  }

  /**
   * @param {number} offset
   * @param {number=} height
   */
  setScrollOffset(offset, height) {
    height = height || 0;
    if (this._vScrollElement.scrollTop > offset)
      this._vScrollElement.scrollTop = offset;
    else if (this._vScrollElement.scrollTop < offset - this._offsetHeight + height)
      this._vScrollElement.scrollTop = offset - this._offsetHeight + height;
  }

  /**
   * @return {number}
   */
  scrollOffset() {
    return this._vScrollElement.scrollTop;
  }

  /**
   * @param {number} zeroTime
   * @param {number} totalTime
   */
  setBoundaries(zeroTime, totalTime) {
    this._minimumBoundary = zeroTime;
    this._totalTime = totalTime;
  }

  /**
   * @param {!Event} e
   */
  _onMouseWheel(e) {
    var doZoomInstead = e.shiftKey ^ (Common.moduleSetting('flamechartMouseWheelAction').get() === 'zoom');
    var panVertically = !doZoomInstead && (e.wheelDeltaY || Math.abs(e.wheelDeltaX) === 120);
    var panHorizontally = doZoomInstead && Math.abs(e.wheelDeltaX) > Math.abs(e.wheelDeltaY);
    if (panVertically) {
      this._vScrollElement.scrollTop -= (e.wheelDeltaY || e.wheelDeltaX) / 120 * this._offsetHeight / 8;
    } else if (panHorizontally) {
      this._muteAnimation = true;
      this._handlePanGesture(-e.wheelDeltaX);
      this._muteAnimation = false;
    } else {  // Zoom.
      const mouseWheelZoomSpeed = 1 / 120;
      this._handleZoomGesture(Math.pow(1.2, -(e.wheelDeltaY || e.wheelDeltaX) * mouseWheelZoomSpeed) - 1);
    }

    // Block swipe gesture.
    e.consume(true);
  }

  /**
   * @param {!MouseEvent} event
   * @return {boolean}
   */
  _startDragging(event) {
    if (event.shiftKey)
      return false;
    this._isDragging = true;
    this._dragStartPointX = event.pageX;
    this._dragStartPointY = event.pageY;
    this._dragStartScrollTop = this._vScrollElement.scrollTop;
    this.viewportElement.style.cursor = '';
    return true;
  }

  /**
   * @param {!MouseEvent} event
   */
  _dragging(event) {
    var pixelShift = this._dragStartPointX - event.pageX;
    this._dragStartPointX = event.pageX;
    this._muteAnimation = true;
    this._handlePanGesture(pixelShift);
    this._muteAnimation = false;
    var pixelScroll = this._dragStartPointY - event.pageY;
    this._vScrollElement.scrollTop = this._dragStartScrollTop + pixelScroll;
  }

  _endDragging() {
    this._isDragging = false;
  }

  /**
   * @param {!MouseEvent} event
   * @return {boolean}
   */
  _startRangeSelection(event) {
    if (!event.shiftKey)
      return false;
    this._isDragging = true;
    this._selectionOffsetShiftX = event.offsetX - event.pageX;
    this._selectionOffsetShiftY = event.offsetY - event.pageY;
    this._selectionStartX = event.offsetX;
    var style = this._selectionOverlay.style;
    style.left = this._selectionStartX + 'px';
    style.width = '1px';
    this._selectedTimeSpanLabel.textContent = '';
    this._selectionOverlay.classList.remove('hidden');
    return true;
  }

  _endRangeSelection() {
    this._isDragging = false;
  }

  hideRangeSelection() {
    this._selectionOverlay.classList.add('hidden');
  }

  /**
   * @param {!MouseEvent} event
   */
  _rangeSelectionDragging(event) {
    var x = Number.constrain(event.pageX + this._selectionOffsetShiftX, 0, this._offsetWidth);
    var start = this.pixelToTime(this._selectionStartX);
    var end = this.pixelToTime(x);
    this._rangeSelectionStart = Math.min(start, end);
    this._rangeSelectionEnd = Math.max(start, end);
    this._updateRangeSelectionOverlay();
    this._delegate.updateRangeSelection(this._rangeSelectionStart, this._rangeSelectionEnd);
  }

  _updateRangeSelectionOverlay() {
    var /** @const */ margin = 100;
    var left = Number.constrain(this.timeToPosition(this._rangeSelectionStart), -margin, this._offsetWidth + margin);
    var right = Number.constrain(this.timeToPosition(this._rangeSelectionEnd), -margin, this._offsetWidth + margin);
    var style = this._selectionOverlay.style;
    style.left = left + 'px';
    style.width = (right - left) + 'px';
    var timeSpan = this._rangeSelectionEnd - this._rangeSelectionStart;
    this._selectedTimeSpanLabel.textContent = Number.preciseMillisToString(timeSpan, 2);
  }

  _onScroll() {
    this._scrollTop = this._vScrollElement.scrollTop;
    this.scheduleUpdate();
  }

  _onMouseOut() {
    this._lastMouseOffsetX = -1;
    this._showCursor(false);
  }

  /**
   * @param {!Event} e
   */
  _updateCursorPosition(e) {
    this._showCursor(e.shiftKey);
    this._cursorElement.style.left = e.offsetX + 'px';
    this._lastMouseOffsetX = e.offsetX;
  }

  /**
   * @param {number} x
   * @return {number}
   */
  pixelToTime(x) {
    return this.pixelToTimeOffset(x) + this._timeWindowLeft;
  }

  /**
   * @param {number} x
   * @return {number}
   */
  pixelToTimeOffset(x) {
    return x * (this._timeWindowRight - this._timeWindowLeft) / this._offsetWidth;
  }

  /**
   * @param {number} time
   * @return {number}
   */
  timeToPosition(time) {
    return Math.floor(
        (time - this._timeWindowLeft) / (this._timeWindowRight - this._timeWindowLeft) * this._offsetWidth);
  }

  /**
   * @return {number}
   */
  timeToPixel() {
    return this._offsetWidth / (this._timeWindowRight - this._timeWindowLeft);
  }

  /**
   * @param {boolean} visible
   */
  _showCursor(visible) {
    this._cursorElement.classList.toggle('hidden', !visible || this._isDragging);
  }

  /**
   * @param {!Event} e
   */
  _onChartKeyDown(e) {
    this._showCursor(e.shiftKey);
    this._handleZoomPanKeys(e);
  }

  /**
   * @param {!Event} e
   */
  _onChartKeyUp(e) {
    this._showCursor(e.shiftKey);
  }

  /**
   * @param {!Event} e
   */
  _handleZoomPanKeys(e) {
    if (!UI.KeyboardShortcut.hasNoModifiers(e))
      return;
    var zoomFactor = e.shiftKey ? 0.8 : 0.3;
    var panOffset = e.shiftKey ? 320 : 80;
    switch (e.code) {
      case 'KeyA':
        this._handlePanGesture(-panOffset);
        break;
      case 'KeyD':
        this._handlePanGesture(panOffset);
        break;
      case 'KeyW':
        this._handleZoomGesture(-zoomFactor);
        break;
      case 'KeyS':
        this._handleZoomGesture(zoomFactor);
        break;
      default:
        return;
    }
    e.consume(true);
  }

  /**
   * @param {number} zoom
   */
  _handleZoomGesture(zoom) {
    this._cancelAnimation();
    var bounds = {left: this._timeWindowLeft, right: this._timeWindowRight};
    var cursorTime = this.pixelToTime(this._lastMouseOffsetX);
    bounds.left += (bounds.left - cursorTime) * zoom;
    bounds.right += (bounds.right - cursorTime) * zoom;
    this._requestWindowTimes(bounds);
  }

  /**
   * @param {number} offset
   */
  _handlePanGesture(offset) {
    this._cancelAnimation();
    var bounds = {left: this._timeWindowLeft, right: this._timeWindowRight};
    var timeOffset = Number.constrain(
        this.pixelToTimeOffset(offset), this._minimumBoundary - bounds.left,
        this._totalTime + this._minimumBoundary - bounds.right);
    bounds.left += timeOffset;
    bounds.right += timeOffset;
    this._requestWindowTimes(bounds);
  }

  /**
   * @param {!{left: number, right: number}} bounds
   */
  _requestWindowTimes(bounds) {
    var maxBound = this._minimumBoundary + this._totalTime;
    if (bounds.left < this._minimumBoundary) {
      bounds.right = Math.min(bounds.right + this._minimumBoundary - bounds.left, maxBound);
      bounds.left = this._minimumBoundary;
    } else if (bounds.right > maxBound) {
      bounds.left = Math.max(bounds.left - bounds.right + maxBound, this._minimumBoundary);
      bounds.right = maxBound;
    }
    if (bounds.right - bounds.left < PerfUI.FlameChart.MinimalTimeWindowMs)
      return;
    this._delegate.requestWindowTimes(bounds.left, bounds.right);
  }

  _cancelAnimation() {
    if (!this._cancelWindowTimesAnimation)
      return;
    this._timeWindowLeft = this._pendingAnimationTimeLeft;
    this._timeWindowRight = this._pendingAnimationTimeRight;
    this._cancelWindowTimesAnimation();
    delete this._cancelWindowTimesAnimation;
  }

  scheduleUpdate() {
    if (this._updateTimerId || this._cancelWindowTimesAnimation)
      return;
    this._updateTimerId = this.element.window().requestAnimationFrame(() => {
      this._updateTimerId = 0;
      this._update();
    });
  }

  _update() {
    this._delegate.update();
  }

  /**
   * @param {number} startTime
   * @param {number} endTime
   */
  setWindowTimes(startTime, endTime) {
    this.hideRangeSelection();
    if (this._muteAnimation || this._timeWindowLeft === 0 || this._timeWindowRight === Infinity ||
        (startTime === 0 && endTime === Infinity) || (startTime === Infinity && endTime === Infinity)) {
      // Initial setup.
      this._timeWindowLeft = startTime;
      this._timeWindowRight = endTime;
      this.scheduleUpdate();
      return;
    }
    this._cancelAnimation();
    this._cancelWindowTimesAnimation = UI.animateFunction(
        this.element.window(), animateWindowTimes.bind(this),
        [{from: this._timeWindowLeft, to: startTime}, {from: this._timeWindowRight, to: endTime}], 5,
        () => delete this._cancelWindowTimesAnimation);
    this._pendingAnimationTimeLeft = startTime;
    this._pendingAnimationTimeRight = endTime;

    /**
     * @param {number} startTime
     * @param {number} endTime
     * @this {PerfUI.ChartViewport}
     */
    function animateWindowTimes(startTime, endTime) {
      this._timeWindowLeft = startTime;
      this._timeWindowRight = endTime;
      this._update();
    }
  }
};
