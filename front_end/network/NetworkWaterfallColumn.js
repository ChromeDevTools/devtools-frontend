// Copyright 2016 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/**
 * @unrestricted
 */
Network.NetworkWaterfallColumn = class extends UI.VBox {
  /**
   * @param {number} rowHeight
   * @param {!Network.NetworkTimeCalculator} calculator
   */
  constructor(rowHeight, calculator) {
    // TODO(allada) Make this a shadowDOM when the NetworkWaterfallColumn gets moved into NetworkLogViewColumns.
    super(false);
    this.registerRequiredCSS('network/networkWaterfallColumn.css');

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

    this._offsetWidth = 0;
    this._offsetHeight = 0;
    this._startTime = this._calculator.minimumBoundary();
    this._endTime = this._calculator.maximumBoundary();

    this._popoverHelper = new UI.PopoverHelper(this.element);
    this._popoverHelper.initializeCallbacks(this._getPopoverAnchor.bind(this), this._showPopover.bind(this));
    this._popoverHelper.setTimeout(300, 300);

    /** @type {!Array<!Network.NetworkNode>} */
    this._nodes = [];

    /** @type {?Network.NetworkNode} */
    this._hoveredNode = null;

    /** @type {!Map<string, !Array<number>>} */
    this._eventDividers = new Map();

    var colorUsage = UI.ThemeSupport.ColorUsage;
    this._rowNavigationRequestColor = UI.themeSupport.patchColor('#def', colorUsage.Background);
    this._rowStripeColor = UI.themeSupport.patchColor('#f5f5f5', colorUsage.Background);
    this._rowHoverColor = UI.themeSupport.patchColor(
        '#ebf2fc', /** @type {!UI.ThemeSupport.ColorUsage} */ (colorUsage.Background | colorUsage.Selection));
    this._parentInitiatorColor = UI.themeSupport.patchColor('hsla(120, 68%, 54%, 0.2)', colorUsage.Background);
    this._initiatedColor = UI.themeSupport.patchColor('hsla(0, 68%, 54%, 0.2)', colorUsage.Background);

    /** @type {!Map<!Common.ResourceType, string>} */
    this._borderColorsForResourceTypeCache = new Map();
    /** @type {!Map<string, !CanvasGradient>} */
    this._colorsForResourceTypeCache = new Map();

    this.element.addEventListener('mousemove', this._onMouseMove.bind(this), true);
    this.element.addEventListener('mouseleave', event => this._setHoveredNode(null, false), true);
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
   * @param {!Event} event
   */
  _onMouseMove(event) {
    this._setHoveredNode(this.getNodeFromPoint(event.offsetX, event.offsetY), event.shiftKey);
  }

  /**
   * @param {!Element} element
   * @param {!Event} event
   * @return {!AnchorBox|undefined}
   */
  _getPopoverAnchor(element, event) {
    if (!this._hoveredNode)
      return;
    var request = this._hoveredNode.request();
    if (!request)
      return;
    var useTimingBars = !Common.moduleSetting('networkColorCodeResourceTypes').get() && !this._calculator.startAtZero;
    if (useTimingBars) {
      var range = Network.RequestTimingView.calculateRequestTimeRanges(request, 0)
                      .find(data => data.name === Network.RequestTimeRangeNames.Total);
      var start = this._timeToPosition(range.start);
      var end = this._timeToPosition(range.end);
    } else {
      var range = this._getSimplifiedBarRange(request, 0);
      var start = range.start;
      var end = range.end;
    }

    if (end - start < 50) {
      var halfWidth = (end - start) / 2;
      start = start + halfWidth - 25;
      end = end - halfWidth + 25;
    }

    if (event.clientX < this._canvasPosition.left + start || event.clientX > this._canvasPosition.left + end)
      return;

    var rowIndex = this._nodes.findIndex(node => node.hovered());
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
   * @param {!UI.Popover} popover
   */
  _showPopover(anchor, popover) {
    if (!this._hoveredNode)
      return;
    var request = this._hoveredNode.request();
    if (!request)
      return;
    var content = Network.RequestTimingView.createTimingTable(request, this._calculator);
    popover.showForAnchor(content, anchor);
  }

  /**
   * @param {?Network.NetworkNode} node
   * @param {boolean} highlightInitiatorChain
   */
  _setHoveredNode(node, highlightInitiatorChain) {
    if (this._hoveredNode)
      this._hoveredNode.setHovered(false, false);
    this._hoveredNode = node;
    if (this._hoveredNode)
      this._hoveredNode.setHovered(true, highlightInitiatorChain);
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
   * @param {!Network.NetworkTimeCalculator} calculator
   */
  setCalculator(calculator) {
    this._calculator = calculator;
  }

  /**
   * @param {number} x
   * @param {number} y
   * @return {?Network.NetworkNode}
   */
  getNodeFromPoint(x, y) {
    return this._nodes[Math.floor((this._scrollTop + y - this._headerHeight) / this._rowHeight)];
  }

  scheduleDraw() {
    if (this._updateRequestID)
      return;
    this._updateRequestID = this.element.window().requestAnimationFrame(() => this.update());
  }

  /**
   * @param {number=} scrollTop
   * @param {!Map<string, !Array<number>>=} eventDividers
   * @param {!Array<!Network.NetworkNode>=} nodes
   */
  update(scrollTop, eventDividers, nodes) {
    if (scrollTop !== undefined && this._scrollTop !== scrollTop) {
      this._popoverHelper.hidePopover();
      this._scrollTop = scrollTop;
    }
    if (nodes) {
      this._nodes = nodes;
      this._calculateCanvasSize();
    }
    if (eventDividers !== undefined)
      this._eventDividers = eventDividers;
    if (this._updateRequestID) {
      this.element.window().cancelAnimationFrame(this._updateRequestID);
      delete this._updateRequestID;
    }

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
    this._calculator.setDisplayWidth(this._offsetWidth);
    this._canvasPosition = this._canvas.getBoundingClientRect();
  }

  /**
   * @param {!Network.RequestTimeRangeNames} type
   * @return {string}
   */
  _colorForType(type) {
    var types = Network.RequestTimeRangeNames;
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

  _didDrawForTest() {
  }

  _draw() {
    var useTimingBars = !Common.moduleSetting('networkColorCodeResourceTypes').get() && !this._calculator.startAtZero;
    var nodes = this._nodes;
    var context = this._canvas.getContext('2d');
    context.save();
    context.scale(window.devicePixelRatio, window.devicePixelRatio);
    context.translate(0, this._headerHeight);
    context.rect(0, 0, this._offsetWidth, this._offsetHeight);
    context.clip();
    var firstRequestIndex = Math.floor(this._scrollTop / this._rowHeight);
    var lastRequestIndex = Math.min(nodes.length, firstRequestIndex + Math.ceil(this._offsetHeight / this._rowHeight));
    for (var i = firstRequestIndex; i < lastRequestIndex; i++) {
      var rowOffset = this._rowHeight * i;
      var node = nodes[i];
      this._decorateRow(context, node, rowOffset - this._scrollTop);
      var drawNodes = [];
      if (node.hasChildren() && !node.expanded)
        drawNodes = /** @type {!Array<!Network.NetworkNode>} */ (node.flatChildren());
      drawNodes.push(node);
      for (var drawNode of drawNodes) {
        if (useTimingBars)
          this._drawTimingBars(context, drawNode, rowOffset - this._scrollTop);
        else
          this._drawSimplifiedBars(context, drawNode, rowOffset - this._scrollTop);
      }
    }
    this._drawEventDividers(context);
    context.restore();

    const freeZoneAtLeft = 75;
    const freeZoneAtRight = 18;
    PerfUI.TimelineGrid.drawCanvasGrid(context, this._calculator, this._fontSize, this._headerHeight, freeZoneAtLeft);
    context.clearRect(this._offsetWidth - freeZoneAtRight, 0, freeZoneAtRight, this._headerHeight);
    this._didDrawForTest();
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
  _waterfallDuration() {
    return this._calculator.maximumBoundary() - this._calculator.minimumBoundary();
  }

  /**
   * @param {!Network.RequestTimeRangeNames=} type
   * @return {number}
   */
  _getBarHeight(type) {
    var types = Network.RequestTimeRangeNames;
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
   * @param {!SDK.NetworkRequest} request
   * @return {string}
   */
  _borderColorForResourceType(request) {
    var resourceType = request.resourceType();
    if (this._borderColorsForResourceTypeCache.has(resourceType))
      return this._borderColorsForResourceTypeCache.get(resourceType);
    var colorsForResourceType = Network.NetworkWaterfallColumn._colorsForResourceType;
    var color = colorsForResourceType[resourceType] || colorsForResourceType.other;
    var parsedColor = Common.Color.parse(color);
    var hsla = parsedColor.hsla();
    hsla[1] /= 2;
    hsla[2] -= Math.min(hsla[2], 0.2);
    var resultColor = /** @type {string} */ (parsedColor.asString(null));
    this._borderColorsForResourceTypeCache.set(resourceType, resultColor);
    return resultColor;
  }

  /**
   * @param {!CanvasRenderingContext2D} context
   * @param {!SDK.NetworkRequest} request
   * @return {string|!CanvasGradient}
   */
  _colorForResourceType(context, request) {
    var colorsForResourceType = Network.NetworkWaterfallColumn._colorsForResourceType;
    var resourceType = request.resourceType();
    var color = colorsForResourceType[resourceType] || colorsForResourceType.other;
    if (request.cached())
      return color;

    if (this._colorsForResourceTypeCache.has(color))
      return this._colorsForResourceTypeCache.get(color);
    var parsedColor = Common.Color.parse(color);
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
   * @param {!SDK.NetworkRequest} request
   * @param {number} borderOffset
   * @return {!{start: number, mid: number, end: number}}
   */
  _getSimplifiedBarRange(request, borderOffset) {
    var drawWidth = this._offsetWidth - this._leftPadding;
    var percentages = this._calculator.computeBarGraphPercentages(request);
    return {
      start: this._leftPadding + Math.floor((percentages.start / 100) * drawWidth) + borderOffset,
      mid: this._leftPadding + Math.floor((percentages.middle / 100) * drawWidth) + borderOffset,
      end: this._leftPadding + Math.floor((percentages.end / 100) * drawWidth) + borderOffset
    };
  }

  /**
   * @param {!CanvasRenderingContext2D} context
   * @param {!Network.NetworkNode} node
   * @param {number} y
   */
  _drawSimplifiedBars(context, node, y) {
    var request = node.request();
    if (!request)
      return;
    const borderWidth = 1;
    var borderOffset = borderWidth % 2 === 0 ? 0 : 0.5;

    context.save();
    var ranges = this._getSimplifiedBarRange(request, borderOffset);
    var height = this._getBarHeight();
    y += Math.floor(this._rowHeight / 2 - height / 2 + borderWidth) - borderWidth / 2;

    context.translate(0, y);
    context.fillStyle = this._colorForResourceType(context, request);
    context.strokeStyle = this._borderColorForResourceType(request);
    context.lineWidth = borderWidth;

    context.beginPath();
    context.globalAlpha = 0.5;
    context.rect(ranges.start, 0, ranges.mid - ranges.start, height - borderWidth);
    context.fill();
    context.stroke();

    var barWidth = Math.max(2, ranges.end - ranges.mid);
    context.beginPath();
    context.globalAlpha = 1;
    context.rect(ranges.mid, 0, barWidth, height - borderWidth);
    context.fill();
    context.stroke();

    /** @type {?{left: string, right: string, tooltip: (string|undefined)}} */
    var labels = null;
    if (node.hovered()) {
      labels = this._calculator.computeBarGraphLabels(request);
      this._drawSimplifiedBarDetails(
          context, labels.left, labels.right, ranges.start, ranges.mid, ranges.mid + barWidth + borderOffset);
    }

    if (!this._calculator.startAtZero) {
      var queueingRange = Network.RequestTimingView.calculateRequestTimeRanges(request, 0)
                              .find(data => data.name === Network.RequestTimeRangeNames.Total);
      var leftLabelWidth = labels ? context.measureText(labels.left).width : 0;
      var leftTextPlacedInBar = leftLabelWidth < ranges.mid - ranges.start;
      const wiskerTextPadding = 13;
      var textOffset = (labels && !leftTextPlacedInBar) ? leftLabelWidth + wiskerTextPadding : 0;
      var queueingStart = this._timeToPosition(queueingRange.start);
      if (ranges.start - textOffset > queueingStart) {
        context.beginPath();
        context.globalAlpha = 1;
        context.strokeStyle = UI.themeSupport.patchColor('#a5a5a5', UI.ThemeSupport.ColorUsage.Foreground);
        context.moveTo(queueingStart, Math.floor(height / 2));
        context.lineTo(ranges.start - textOffset, Math.floor(height / 2));

        const wiskerHeight = height / 2;
        context.moveTo(queueingStart + borderOffset, wiskerHeight / 2);
        context.lineTo(queueingStart + borderOffset, height - wiskerHeight / 2 - 1);
        context.stroke();
      }
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
    context.fillStyle = UI.themeSupport.patchColor('#444', UI.ThemeSupport.ColorUsage.Foreground);
    context.strokeStyle = UI.themeSupport.patchColor('#444', UI.ThemeSupport.ColorUsage.Foreground);
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
   * @param {!Network.NetworkNode} node
   * @param {number} y
   */
  _drawTimingBars(context, node, y) {
    var request = node.request();
    if (!request)
      return;
    context.save();
    var ranges = Network.RequestTimingView.calculateRequestTimeRanges(request, 0);
    for (var range of ranges) {
      if (range.name === Network.RequestTimeRangeNames.Total || range.name === Network.RequestTimeRangeNames.Sending ||
          range.end - range.start === 0)
        continue;
      context.beginPath();
      var lineWidth = 0;
      var color = this._colorForType(range.name);
      var borderColor = color;
      if (range.name === Network.RequestTimeRangeNames.Queueing) {
        borderColor = 'lightgrey';
        lineWidth = 2;
      }
      if (range.name === Network.RequestTimeRangeNames.Receiving)
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
   * @param {!Network.NetworkNode} node
   * @param {number} y
   */
  _decorateRow(context, node, y) {
    var isStriped = node.isStriped();
    if (!isStriped && !node.hovered() && !node.isNavigationRequest() && !node.isOnInitiatorPath() &&
        !node.isOnInitiatedPath())
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
     * @this {Network.NetworkWaterfallColumn}
     */
    function getRowColor() {
      if (node.hovered())
        return this._rowHoverColor;
      if (node.isOnInitiatorPath())
        return this._parentInitiatorColor;
      if (node.isOnInitiatedPath())
        return this._initiatedColor;
      if (node.isNavigationRequest())
        return this._rowNavigationRequestColor;
      if (!isStriped)
        return 'transparent';
      return this._rowStripeColor;
    }
  }
};

/** @enum {string} */
Network.NetworkWaterfallColumn._colorsForResourceType = {
  document: 'hsl(215, 100%, 80%)',
  font: 'hsl(8, 100%, 80%)',
  media: 'hsl(90, 50%, 80%)',
  image: 'hsl(90, 50%, 80%)',
  script: 'hsl(31, 100%, 80%)',
  stylesheet: 'hsl(272, 64%, 80%)',
  texttrack: 'hsl(8, 100%, 80%)',
  websocket: 'hsl(0, 0%, 95%)',
  xhr: 'hsl(53, 100%, 80%)',
  other: 'hsl(0, 0%, 95%)'
};
