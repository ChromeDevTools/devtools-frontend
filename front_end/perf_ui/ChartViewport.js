// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
PerfUI.ChartViewport = class extends UI.VBox {
  constructor() {
    super(true);

    this.viewportElement = this.contentElement.createChild('div', 'fill');
    this.viewportElement.addEventListener('mousewheel', this._onMouseWheel.bind(this), false);
    this.viewportElement.addEventListener('keydown', this._handleZoomPanKeys.bind(this), false);

    UI.installInertialDragHandle(
        this.viewportElement, this._startDragging.bind(this), this._dragging.bind(this), this._endDragging.bind(this),
        '-webkit-grabbing', null);
    UI.installDragHandle(
        this.viewportElement, this._startRangeSelection.bind(this), this._rangeSelectionDragging.bind(this),
        this._endRangeSelection.bind(this), 'text', null);

    this._alwaysShowVerticalScroll = false;
    this._vScrollElement = this.contentElement.createChild('div', 'flame-chart-v-scroll');
    this._vScrollContent = this._vScrollElement.createChild('div');
    this._vScrollElement.addEventListener('scroll', this._onScroll.bind(this), false);

    this._selectionOverlay = this.contentElement.createChild('div', 'flame-chart-selection-overlay hidden');
    this._selectedTimeSpanLabel = this._selectionOverlay.createChild('div', 'time-span');

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

  /**
   * @private
   */
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

  /**
   * @private
   */
  _updateContentElementSize() {
    var offsetWidth = this._vScrollElement.offsetLeft;
    if (!offsetWidth)
      offsetWidth = this.contentElement.offsetWidth;
    this._offsetWidth = offsetWidth;
    this._offsetHeight = this.contentElement.offsetHeight;
  }

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
  getScrollOffset() {
    return this._vScrollElement.scrollTop;
  }

  /**
   * @param {!Event} e
   * @private
   */
  _onMouseWheel(e) {
    if (!this._enabled())
      return;
    // Pan vertically when shift down only.
    var panVertically = e.shiftKey && (e.wheelDeltaY || Math.abs(e.wheelDeltaX) === 120);
    var panHorizontally = Math.abs(e.wheelDeltaX) > Math.abs(e.wheelDeltaY) && !e.shiftKey;
    if (panVertically) {
      this._vScrollElement.scrollTop -= (e.wheelDeltaY || e.wheelDeltaX) / 120 * this._offsetHeight / 8;
    } else if (panHorizontally) {
      var shift = -e.wheelDeltaX * this._pixelToTime;
      this._muteAnimation = true;
      this._handlePanGesture(shift);
      this._muteAnimation = false;
    } else {  // Zoom.
      const mouseWheelZoomSpeed = 1 / 120;
      this._handleZoomGesture(Math.pow(1.2, -(e.wheelDeltaY || e.wheelDeltaX) * mouseWheelZoomSpeed) - 1);
    }

    // Block swipe gesture.
    e.consume(true);
  }

  /**
   * @param {number} x
   * @param {number} y
   * @param {!MouseEvent} event
   * @private
   * @return {boolean}
   */
  _startDragging(x, y, event) {
    if (event.shiftKey)
      return false;
    if (this._windowRight === Infinity)
      return false;
    this._isDragging = true;
    this._initMaxDragOffset(event);
    this._dragStartPointX = x;
    this._dragStartPointY = y;
    this._dragStartScrollTop = this._vScrollElement.scrollTop;
    this.viewportElement.style.cursor = '';
    this.hideHighlight();
    return true;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @private
   */
  _dragging(x, y) {
    var pixelShift = this._dragStartPointX - x;
    this._dragStartPointX = x;
    this._muteAnimation = true;
    this._handlePanGesture(pixelShift * this._pixelToTime);
    this._muteAnimation = false;

    var pixelScroll = this._dragStartPointY - y;
    this._vScrollElement.scrollTop = this._dragStartScrollTop + pixelScroll;
    this._updateMaxDragOffset(x, y);
  }

  /**
   * @private
   */
  _endDragging() {
    this._isDragging = false;
    this._updateHighlight();
  }

  /**
   * @param {!MouseEvent} event
   * @private
   */
  _initMaxDragOffset(event) {
    this._maxDragOffsetSquared = 0;
    this._dragStartX = event.pageX;
    this._dragStartY = event.pageY;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @private
   */
  _updateMaxDragOffset(x, y) {
    var dx = x - this._dragStartX;
    var dy = y - this._dragStartY;
    var dragOffsetSquared = dx * dx + dy * dy;
    this._maxDragOffsetSquared = Math.max(this._maxDragOffsetSquared, dragOffsetSquared);
  }

  /**
   * @return {number}
   */
  maxDragOffset() {
    return Math.sqrt(this._maxDragOffsetSquared);
  }

  /**
   * @param {!MouseEvent} event
   * @private
   * @return {boolean}
   */
  _startRangeSelection(event) {
    if (!event.shiftKey)
      return false;
    this._isDragging = true;
    this._initMaxDragOffset(event);
    this._selectionOffsetShiftX = event.offsetX - event.pageX;
    this._selectionOffsetShiftY = event.offsetY - event.pageY;
    this._selectionStartX = event.offsetX;
    var style = this._selectionOverlay.style;
    style.left = this._selectionStartX + 'px';
    style.width = '1px';
    this._selectedTimeSpanLabel.textContent = '';
    this._selectionOverlay.classList.remove('hidden');
    this.hideHighlight();
    return true;
  }

  /**
   * @private
   */
  _endRangeSelection() {
    this._isDragging = false;
    this._updateHighlight();
  }

  hideRangeSelection() {
    this._selectionOverlay.classList.add('hidden');
  }

  /**
   * @param {!MouseEvent} event
   * @private
   */
  _rangeSelectionDragging(event) {
    this._updateMaxDragOffset(event.pageX, event.pageY);
    var x = Number.constrain(event.pageX + this._selectionOffsetShiftX, 0, this._offsetWidth);
    var start = this._cursorTime(this._selectionStartX);
    var end = this._cursorTime(x);
    this._rangeSelectionStart = Math.min(start, end);
    this._rangeSelectionEnd = Math.max(start, end);
    this._updateRangeSelectionOverlay();
    this._flameChartDelegate.updateRangeSelection(this._rangeSelectionStart, this._rangeSelectionEnd);
  }

  /**
   * @private
   */
  _updateRangeSelectionOverlay() {
    var /** @const */ margin = 100;
    var left = Number.constrain(this._timeToPosition(this._rangeSelectionStart), -margin, this._offsetWidth + margin);
    var right = Number.constrain(this._timeToPosition(this._rangeSelectionEnd), -margin, this._offsetWidth + margin);
    var style = this._selectionOverlay.style;
    style.left = left + 'px';
    style.width = (right - left) + 'px';
    var timeSpan = this._rangeSelectionEnd - this._rangeSelectionStart;
    this._selectedTimeSpanLabel.textContent = Number.preciseMillisToString(timeSpan, 2);
  }

  /**
   * @private
   */
  _onScroll() {
    this._scrollTop = this._vScrollElement.scrollTop;
    this.scheduleUpdate();
  }

  /**
   * @param {!Event} e
   * @private
   */
  _handleZoomPanKeys(e) {
    if (!UI.KeyboardShortcut.hasNoModifiers(e))
      return;
    var zoomMultiplier = e.shiftKey ? 0.8 : 0.3;
    var panMultiplier = e.shiftKey ? 320 : 80;
    if (e.code === 'KeyA') {
      this._handlePanGesture(-panMultiplier * this._pixelToTime);
      e.consume(true);
    } else if (e.code === 'KeyD') {
      this._handlePanGesture(panMultiplier * this._pixelToTime);
      e.consume(true);
    } else if (e.code === 'KeyW') {
      this._handleZoomGesture(-zoomMultiplier);
      e.consume(true);
    } else if (e.code === 'KeyS') {
      this._handleZoomGesture(zoomMultiplier);
      e.consume(true);
    }
  }

  /**
   * @param {number} zoom
   * @private
   */
  _handleZoomGesture(zoom) {
    this._cancelAnimation();
    var bounds = this._windowForGesture();
    var cursorTime = this._cursorTime(this._lastMouseOffsetX);
    bounds.left += (bounds.left - cursorTime) * zoom;
    bounds.right += (bounds.right - cursorTime) * zoom;
    this._requestWindowTimes(bounds);
  }

  /**
   * @param {number} shift
   * @private
   */
  _handlePanGesture(shift) {
    this._cancelAnimation();
    var bounds = this._windowForGesture();
    shift = Number.constrain(
        shift, this._minimumBoundary - bounds.left, this._totalTime + this._minimumBoundary - bounds.right);
    bounds.left += shift;
    bounds.right += shift;
    this._requestWindowTimes(bounds);
  }

  /**
   * @private
   * @return {{left: number, right: number}}
   */
  _windowForGesture() {
    var windowLeft = this._timeWindowLeft ? this._timeWindowLeft : this._dataProvider.minimumBoundary();
    var windowRight = this._timeWindowRight !== Infinity ?
        this._timeWindowRight :
        this._dataProvider.minimumBoundary() + this._dataProvider.totalTime();
    return {left: windowLeft, right: windowRight};
  }

  /**
   * @param {{left: number, right: number}} bounds
   * @private
   */
  _requestWindowTimes(bounds) {
    bounds.left = Number.constrain(bounds.left, this._minimumBoundary, this._totalTime + this._minimumBoundary);
    bounds.right = Number.constrain(bounds.right, this._minimumBoundary, this._totalTime + this._minimumBoundary);
    if (bounds.right - bounds.left < PerfUI.FlameChart.MinimalTimeWindowMs)
      return;
    this._flameChartDelegate.requestWindowTimes(bounds.left, bounds.right);
  }

  /**
   * @param {number} startTime
   * @param {number} endTime
   * @private
   */
  _animateWindowTimes(startTime, endTime) {
    this._timeWindowLeft = startTime;
    this._timeWindowRight = endTime;
    this._updateHighlight();
    this.update();
  }

  /**
   * @private
   */
  _animationCompleted() {
    delete this._cancelWindowTimesAnimation;
    this._updateHighlight();
  }

  /**
   * @private
   */
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
      this.update();
    });
  }

  update() {
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
        this.element.window(), this._animateWindowTimes.bind(this),
        [{from: this._timeWindowLeft, to: startTime}, {from: this._timeWindowRight, to: endTime}], 5,
        this._animationCompleted.bind(this));
    this._pendingAnimationTimeLeft = startTime;
    this._pendingAnimationTimeRight = endTime;
  }
};
