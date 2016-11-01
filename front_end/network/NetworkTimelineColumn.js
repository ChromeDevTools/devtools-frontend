// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
WebInspector.NetworkTimelineColumn = class extends WebInspector.VBox {
  /**
   * @param {number} rowHeight
   * @param {!WebInspector.NetworkTimeCalculator} calculator
   */
  constructor(rowHeight, calculator) {
    // TODO(allada) Make this a shadowDOM when the NetworkTimelineColumn gets moved into NetworkLogViewColumns.
    super(false);
    this.registerRequiredCSS('network/networkTimelineColumn.css');

    this._canvas = this.contentElement.createChild('canvas');
    this._canvas.tabIndex = 1;
    this.setDefaultFocusedElement(this._canvas);
    this._canvasPosition = this._canvas.getBoundingClientRect();

    /** @const */
    this._leftPadding = 5;
    /** @const */
    this._fontSize = 10;

    this._rightPadding = 0;

    this._rowHeight = rowHeight;
    this._headerHeight = 0;
    this._calculator = calculator;

    this._popoverHelper = new WebInspector.PopoverHelper(this.element);
    this._popoverHelper.initializeCallbacks(this._getPopoverAnchor.bind(this), this._showPopover.bind(this));
    this._popoverHelper.setTimeout(300, 300);

    /** @type {!Array<!WebInspector.NetworkRequest>} */
    this._requestData = [];

    /** @type {?WebInspector.NetworkRequest} */
    this._hoveredRequest = null;
    /** @type {?WebInspector.NetworkRequest.InitiatorGraph} */
    this._initiatorGraph = null;

    /** @type {?WebInspector.NetworkRequest} */
    this._navigationRequest = null;

    /** @type {!Map<string, !Array<number>>} */
    this._eventDividers = new Map();

    var colorUsage = WebInspector.ThemeSupport.ColorUsage;
    this._rowNavigationRequestColor = WebInspector.themeSupport.patchColor('#def', colorUsage.Background);
    this._rowStripeColor = WebInspector.themeSupport.patchColor('#f5f5f5', colorUsage.Background);
    this._rowHoverColor = WebInspector.themeSupport.patchColor(
        '#ebf2fc', /** @type {!WebInspector.ThemeSupport.ColorUsage} */ (colorUsage.Background | colorUsage.Selection));
    this._parentInitiatorColor =
        WebInspector.themeSupport.patchColor('hsla(120, 68%, 54%, 0.2)', colorUsage.Background);
    this._initiatedColor = WebInspector.themeSupport.patchColor('hsla(0, 68%, 54%, 0.2)', colorUsage.Background);

    /** @type {!Map<!WebInspector.ResourceType, string>} */
    this._borderColorsForResourceTypeCache = new Map();
    /** @type {!Map<string, !CanvasGradient>} */
    this._colorsForResourceTypeCache = new Map();
  }

  /**
   * @override
   */
  willHide() {
    this._popoverHelper.hidePopover();
  }

  /**
   * @override
   */
  wasShown() {
    this.update();
  }

  /**
   * @param {!Element} element
   * @param {!Event} event
   * @return {!AnchorBox|undefined}
   */
  _getPopoverAnchor(element, event) {
    if (!this._hoveredRequest)
      return;

    var range = WebInspector.RequestTimingView.calculateRequestTimeRanges(this._hoveredRequest, 0)
                    .find(data => data.name === 'total');
    var start = this._timeToPosition(range.start);
    var end = this._timeToPosition(range.end);

    if (event.clientX < this._canvasPosition.left + start || event.clientX > this._canvasPosition.left + end)
      return;

    var rowIndex = this._requestData.findIndex(request => this._hoveredRequest === request);
    var barHeight = this._getBarHeight(range.name);
    var y = this._headerHeight + (this._rowHeight * rowIndex - this._scrollTop) + ((this._rowHeight - barHeight) / 2);

    if (event.clientY < this._canvasPosition.top + y || event.clientY > this._canvasPosition.top + y + barHeight)
      return;

    var anchorBox = this.element.boxInWindow();
    anchorBox.x += start;
    anchorBox.y += y;
    anchorBox.width = end - start;
    anchorBox.height = barHeight;
    return anchorBox;
  }

  /**
   * @param {!Element|!AnchorBox} anchor
   * @param {!WebInspector.Popover} popover
   */
  _showPopover(anchor, popover) {
    if (!this._hoveredRequest)
      return;
    var content =
        WebInspector.RequestTimingView.createTimingTable(this._hoveredRequest, this._calculator.minimumBoundary());
    popover.showForAnchor(content, anchor);
  }

  /**
   * @param {?WebInspector.NetworkRequest} request
   * @param {boolean} highlightInitiatorChain
   */
  setHoveredRequest(request, highlightInitiatorChain) {
    this._hoveredRequest = request;
    this._initiatorGraph = (highlightInitiatorChain && request) ? request.initiatorGraph() : null;
    this.update();
  }

  /**
   * @param {number} height
   */
  setRowHeight(height) {
    this._rowHeight = height;
  }

  /**
   * @param {number} height
   */
  setHeaderHeight(height) {
    this._headerHeight = height;
  }

  /**
   * @param {number} padding
   */
  setRightPadding(padding) {
    this._rightPadding = padding;
    this._calculateCanvasSize();
  }

  /**
   * @param {!WebInspector.NetworkTimeCalculator} calculator
   */
  setCalculator(calculator) {
    this._calculator = calculator;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @return {?WebInspector.NetworkRequest}
   */
  getRequestFromPoint(x, y) {
    return this._requestData[Math.floor((this._scrollTop + y - this._headerHeight) / this._rowHeight)] || null;
  }

  scheduleDraw() {
    if (this._updateRequestID)
      return;
    this._updateRequestID = this.element.window().requestAnimationFrame(() => this.update());
  }

  /**
   * @param {number=} scrollTop
   * @param {!Map<string, !Array<number>>=} eventDividers
   * @param {!{requests: !Array<!WebInspector.NetworkRequest>, navigationRequest: ?WebInspector.NetworkRequest}=} requestData
   */
  update(scrollTop, eventDividers, requestData) {
    if (scrollTop !== undefined)
      this._scrollTop = scrollTop;
    if (requestData) {
      this._requestData = requestData.requests;
      this._navigationRequest = requestData.navigationRequest;
      this._calculateCanvasSize();
    }
    if (eventDividers !== undefined)
      this._eventDividers = eventDividers;
    this.element.window().cancelAnimationFrame(this._updateRequestID);
    this._updateRequestID = null;

    this._startTime = this._calculator.minimumBoundary();
    this._endTime = this._calculator.maximumBoundary();
    this._resetCanvas();
    this._draw();
  }

  _resetCanvas() {
    var ratio = window.devicePixelRatio;
    this._canvas.width = this._offsetWidth * ratio;
    this._canvas.height = this._offsetHeight * ratio;
    this._canvas.style.width = this._offsetWidth + 'px';
    this._canvas.style.height = this._offsetHeight + 'px';
  }

  /**
   * @override
   */
  onResize() {
    super.onResize();
    this._calculateCanvasSize();
    this.scheduleDraw();
  }

  _calculateCanvasSize() {
    this._offsetWidth = this.contentElement.offsetWidth - this._rightPadding;
    this._offsetHeight = this.contentElement.offsetHeight;
    this._calculator.setDisplayWindow(this._offsetWidth);
    this._canvasPosition = this._canvas.getBoundingClientRect();
  }

  /**
   * @param {!WebInspector.RequestTimeRangeNames} type
   * @return {string}
   */
  _colorForType(type) {
    var types = WebInspector.RequestTimeRangeNames;
    switch (type) {
      case types.Receiving:
      case types.ReceivingPush:
        return '#03A9F4';
      case types.Waiting:
        return '#00C853';
      case types.Connecting:
        return '#FF9800';
      case types.SSL:
        return '#9C27B0';
      case types.DNS:
        return '#009688';
      case types.Proxy:
        return '#A1887F';
      case types.Blocking:
        return '#AAAAAA';
      case types.Push:
        return '#8CDBff';
      case types.Queueing:
        return 'white';
      case types.ServiceWorker:
      case types.ServiceWorkerPreparation:
      default:
        return 'orange';
    }
  }

  /**
   * @param {number} time
   * @return {number}
   */
  _timeToPosition(time) {
    var availableWidth = this._offsetWidth - this._leftPadding;
    var timeToPixel = availableWidth / (this._endTime - this._startTime);
    return Math.floor(this._leftPadding + (time - this._startTime) * timeToPixel);
  }

  _draw() {
    var useTimingBars =
        !WebInspector.moduleSetting('networkColorCodeResourceTypes').get() && !this._calculator.startAtZero;
    var requests = this._requestData;
    var context = this._canvas.getContext('2d');
    context.save();
    context.scale(window.devicePixelRatio, window.devicePixelRatio);
    context.translate(0, this._headerHeight);
    context.rect(0, 0, this._offsetWidth, this._offsetHeight);
    context.clip();
    var firstRequestIndex = Math.floor(this._scrollTop / this._rowHeight);
    var lastRequestIndex =
        Math.min(requests.length, firstRequestIndex + Math.ceil(this._offsetHeight / this._rowHeight));
    for (var i = firstRequestIndex; i < lastRequestIndex; i++) {
      var rowOffset = this._rowHeight * i;
      var request = requests[i];
      this._decorateRow(context, request, i, rowOffset - this._scrollTop);
      if (useTimingBars)
        this._drawTimingBars(context, request, rowOffset - this._scrollTop);
      else
        this._drawSimplifiedBars(context, request, rowOffset - this._scrollTop);
    }
    this._drawEventDividers(context);
    context.restore();

    const freeZoneAtLeft = 75;
    WebInspector.TimelineGrid.drawCanvasGrid(context, this._calculator, this._fontSize, freeZoneAtLeft);
  }

  /**
   * @param {!CanvasRenderingContext2D} context
   */
  _drawEventDividers(context) {
    context.save();
    context.lineWidth = 1;
    for (var color of this._eventDividers.keys()) {
      context.strokeStyle = color;
      for (var time of this._eventDividers.get(color)) {
        context.beginPath();
        var x = this._timeToPosition(time);
        context.moveTo(x, 0);
        context.lineTo(x, this._offsetHeight);
      }
      context.stroke();
    }
    context.restore();
  }

  /**
   * @return {number}
   */
  _timelineDuration() {
    return this._calculator.maximumBoundary() - this._calculator.minimumBoundary();
  }

  /**
   * @param {!WebInspector.RequestTimeRangeNames=} type
   * @return {number}
   */
  _getBarHeight(type) {
    var types = WebInspector.RequestTimeRangeNames;
    switch (type) {
      case types.Connecting:
      case types.SSL:
      case types.DNS:
      case types.Proxy:
      case types.Blocking:
      case types.Push:
      case types.Queueing:
        return 7;
      default:
        return 13;
    }
  }

  /**
   * @param {!WebInspector.NetworkRequest} request
   * @return {string}
   */
  _borderColorForResourceType(request) {
    var resourceType = request.resourceType();
    if (this._borderColorsForResourceTypeCache.has(resourceType))
      return this._borderColorsForResourceTypeCache.get(resourceType);
    var colorsForResourceType = WebInspector.NetworkTimelineColumn._colorsForResourceType;
    var color = colorsForResourceType[resourceType] || colorsForResourceType.Other;
    var parsedColor = WebInspector.Color.parse(color);
    var hsla = parsedColor.hsla();
    hsla[1] /= 2;
    hsla[2] -= Math.min(hsla[2], 0.2);
    var resultColor = /** @type {string} */ (parsedColor.asString(null));
    this._borderColorsForResourceTypeCache.set(resourceType, resultColor);
    return resultColor;
  }

  /**
   * @param {!CanvasRenderingContext2D} context
   * @param {!WebInspector.NetworkRequest} request
   * @return {string|!CanvasGradient}
   */
  _colorForResourceType(context, request) {
    var colorsForResourceType = WebInspector.NetworkTimelineColumn._colorsForResourceType;
    var resourceType = request.resourceType();
    var color = colorsForResourceType[resourceType] || colorsForResourceType.Other;
    if (request.cached())
      return color;

    if (this._colorsForResourceTypeCache.has(color))
      return this._colorsForResourceTypeCache.get(color);
    var parsedColor = WebInspector.Color.parse(color);
    var hsla = parsedColor.hsla();
    hsla[1] -= Math.min(hsla[1], 0.28);
    hsla[2] -= Math.min(hsla[2], 0.15);
    var gradient = context.createLinearGradient(0, 0, 0, this._getBarHeight());
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, /** @type {string} */ (parsedColor.asString(null)));
    this._colorsForResourceTypeCache.set(color, gradient);
    return gradient;
  }

  /**
   * @param {!CanvasRenderingContext2D} context
   * @param {!WebInspector.NetworkRequest} request
   * @param {number} y
   */
  _drawSimplifiedBars(context, request, y) {
    /** @const */
    var borderWidth = 1;

    context.save();
    var percentages = this._calculator.computeBarGraphPercentages(request);
    var drawWidth = this._offsetWidth - this._leftPadding;
    var borderOffset = borderWidth % 2 === 0 ? 0 : .5;
    var start = this._leftPadding + Math.floor((percentages.start / 100) * drawWidth) + borderOffset;
    var mid = this._leftPadding + Math.floor((percentages.middle / 100) * drawWidth) + borderOffset;
    var end = this._leftPadding + Math.floor((percentages.end / 100) * drawWidth) + borderOffset;
    var height = this._getBarHeight();
    y += Math.floor(this._rowHeight / 2 - height / 2 + borderWidth) - borderWidth / 2;

    context.translate(0, y);
    context.fillStyle = this._colorForResourceType(context, request);
    context.strokeStyle = this._borderColorForResourceType(request);
    context.lineWidth = borderWidth;

    context.beginPath();
    context.globalAlpha = .5;
    context.rect(start, 0, mid - start, height - borderWidth);
    context.fill();
    context.stroke();

    var barWidth = Math.max(2, end - mid);
    context.beginPath();
    context.globalAlpha = 1;
    context.rect(mid, 0, barWidth, height - borderWidth);
    context.fill();
    context.stroke();

    if (request === this._hoveredRequest) {
      var labels = this._calculator.computeBarGraphLabels(request);
      this._drawSimplifiedBarDetails(context, labels.left, labels.right, start, mid, mid + barWidth + borderOffset);
    }

    context.restore();
  }

  /**
   * @param {!CanvasRenderingContext2D} context
   * @param {string} leftText
   * @param {string} rightText
   * @param {number} startX
   * @param {number} midX
   * @param {number} endX
   */
  _drawSimplifiedBarDetails(context, leftText, rightText, startX, midX, endX) {
    /** @const */
    var barDotLineLength = 10;

    context.save();
    var height = this._getBarHeight();
    var leftLabelWidth = context.measureText(leftText).width;
    var rightLabelWidth = context.measureText(rightText).width;
    context.fillStyle = '#444';
    context.strokeStyle = '#444';
    if (leftLabelWidth < midX - startX) {
      var midBarX = startX + (midX - startX) / 2 - leftLabelWidth / 2;
      context.fillText(leftText, midBarX, this._fontSize);
    } else if (barDotLineLength + leftLabelWidth + this._leftPadding < startX) {
      context.beginPath();
      context.arc(startX, Math.floor(height / 2), 2, 0, 2 * Math.PI);
      context.fill();
      context.fillText(leftText, startX - leftLabelWidth - barDotLineLength - 1, this._fontSize);
      context.beginPath();
      context.lineWidth = 1;
      context.moveTo(startX - barDotLineLength, Math.floor(height / 2));
      context.lineTo(startX, Math.floor(height / 2));
      context.stroke();
    }

    if (rightLabelWidth < endX - midX) {
      var midBarX = midX + (endX - midX) / 2 - rightLabelWidth / 2;
      context.fillText(rightText, midBarX, this._fontSize);
    } else if (endX + barDotLineLength + rightLabelWidth < this._offsetWidth - this._leftPadding) {
      context.beginPath();
      context.arc(endX, Math.floor(height / 2), 2, 0, 2 * Math.PI);
      context.fill();
      context.fillText(rightText, endX + barDotLineLength + 1, this._fontSize);
      context.beginPath();
      context.lineWidth = 1;
      context.moveTo(endX, Math.floor(height / 2));
      context.lineTo(endX + barDotLineLength, Math.floor(height / 2));
      context.stroke();
    }
    context.restore();
  }

  /**
   * @param {!CanvasRenderingContext2D} context
   * @param {!WebInspector.NetworkRequest} request
   * @param {number} y
   */
  _drawTimingBars(context, request, y) {
    context.save();
    var ranges = WebInspector.RequestTimingView.calculateRequestTimeRanges(request, 0);
    for (var range of ranges) {
      if (range.name === WebInspector.RequestTimeRangeNames.Total ||
          range.name === WebInspector.RequestTimeRangeNames.Sending || range.end - range.start === 0)
        continue;
      context.beginPath();
      var lineWidth = 0;
      var color = this._colorForType(range.name);
      var borderColor = color;
      if (range.name === WebInspector.RequestTimeRangeNames.Queueing) {
        borderColor = 'lightgrey';
        lineWidth = 2;
      }
      if (range.name === WebInspector.RequestTimeRangeNames.Receiving)
        lineWidth = 2;
      context.fillStyle = color;
      var height = this._getBarHeight(range.name);
      var middleBarY = y + Math.floor(this._rowHeight / 2 - height / 2) + lineWidth / 2;
      var start = this._timeToPosition(range.start);
      var end = this._timeToPosition(range.end);
      context.rect(start, middleBarY, end - start, height - lineWidth);
      if (lineWidth) {
        context.lineWidth = lineWidth;
        context.strokeStyle = borderColor;
        context.stroke();
      }
      context.fill();
    }
    context.restore();
  }

  /**
   * @param {!CanvasRenderingContext2D} context
   * @param {!WebInspector.NetworkRequest} request
   * @param {number} rowNumber
   * @param {number} y
   */
  _decorateRow(context, request, rowNumber, y) {
    if (rowNumber % 2 === 1 && this._hoveredRequest !== request && this._navigationRequest !== request &&
        !this._initiatorGraph)
      return;

    var color = getRowColor.call(this);
    if (color === 'transparent')
      return;
    context.save();
    context.beginPath();
    context.fillStyle = color;
    context.rect(0, y, this._offsetWidth, this._rowHeight);
    context.fill();
    context.restore();

    /**
     * @return {string}
     * @this {WebInspector.NetworkTimelineColumn}
     */
    function getRowColor() {
      if (this._hoveredRequest === request)
        return this._rowHoverColor;
      if (this._initiatorGraph) {
        if (this._initiatorGraph.initiators.has(request))
          return this._parentInitiatorColor;
        if (this._initiatorGraph.initiated.has(request))
          return this._initiatedColor;
      }
      if (this._navigationRequest === request)
        return this._rowNavigationRequestColor;
      if (rowNumber % 2 === 1)
        return 'transparent';
      return this._rowStripeColor;
    }
  }
};

WebInspector.NetworkTimelineColumn._colorsForResourceType = {
  document: 'hsl(215, 100%, 80%)',
  font: 'hsl(8, 100%, 80%)',
  media: 'hsl(272, 64%, 80%)',
  image: 'hsl(272, 64%, 80%)',
  script: 'hsl(31, 100%, 80%)',
  stylesheet: 'hsl(90, 50%, 80%)',
  texttrack: 'hsl(8, 100%, 80%)',
  websocket: 'hsl(0, 0%, 95%)',
  xhr: 'hsl(53, 100%, 80%)',
  other: 'hsl(0, 0%, 95%)'
};
