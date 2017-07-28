/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2008, 2009 Anthony Ricaud <rik@webkit.org>
 * Copyright (C) 2011 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

/**
 * @unrestricted
 */
Network.NetworkNode = class extends DataGrid.SortableDataGridNode {
  /**
   * @param {!Network.NetworkLogView} parentView
   */
  constructor(parentView) {
    super({});
    this._parentView = parentView;
    this._isHovered = false;
    this._isProduct = false;
    this._showingInitiatorChain = false;
    /** @type {?SDK.NetworkRequest} */
    this._requestOrFirstKnownChildRequest = null;
  }

  /**
   * @return {!Network.NetworkNode._SupportedBackgroundColors}
   */
  static _themedBackgroundColors() {
    if (Network.NetworkNode._themedBackgroundColorsCache)
      return Network.NetworkNode._themedBackgroundColorsCache;
    var themedColors = {};
    for (var name in Network.NetworkNode._backgroundColors) {
      var color = Common.Color.fromRGBA(Network.NetworkNode._backgroundColors[name]);
      themedColors[name] = UI.themeSupport.patchColor(color, UI.ThemeSupport.ColorUsage.Background);
    }
    Network.NetworkNode._themedBackgroundColorsCache =
        /** @type {!Network.NetworkNode._SupportedBackgroundColors} */ (themedColors);
    return Network.NetworkNode._themedBackgroundColorsCache;
  }

  /**
   * @return {string}
   */
  displayName() {
    return '';
  }

  /**
   * @return {boolean}
   */
  isFromFrame() {
    return false;
  }

  /**
   * @override
   * @param {string} columnId
   * @return {!Element}
   */
  createCell(columnId) {
    var cell = this.createTD(columnId);
    this.renderCell(cell, columnId);
    return cell;
  }

  /**
   * @protected
   * @param {!Element} cell
   * @param {string} columnId
   */
  renderCell(cell, columnId) {
  }

  /**
   * @return {string}
   */
  backgroundColor() {
    var bgColors = Network.NetworkNode._themedBackgroundColors();
    if (this.selected)
      return /** @type {string} */ (bgColors.Selected.asString(Common.Color.Format.HEX));
    var color = this.isStriped() ? bgColors.Stripe : bgColors.Default;
    if (this.isNavigationRequest())
      color = color.blendWith(bgColors.Navigation);
    if (this.hovered())
      color = color.blendWith(bgColors.Hovered);
    if (this.isOnInitiatorPath())
      color = color.blendWith(bgColors.InitiatorPath);
    if (this.isOnInitiatedPath())
      color = color.blendWith(bgColors.InitiatedPath);

    return /** @type {string} */ (color.asString(Common.Color.Format.HEX));
  }

  _updateBackgroundColor() {
    var element = this.existingElement();
    if (!element)
      return;
    element.style.backgroundColor = this.backgroundColor();
    this._parentView.stylesChanged();
  }

  /**
   * @override
   * @param {boolean} isStriped
   */
  setStriped(isStriped) {
    super.setStriped(isStriped);
    this._updateBackgroundColor();
  }

  /**
   * @return {!Network.NetworkLogView}
   */
  parentView() {
    return this._parentView;
  }

  /**
   * @return {boolean}
   */
  hovered() {
    return this._isHovered;
  }

  /**
   * @return {boolean}
   */
  showingInitiatorChain() {
    return this._showingInitiatorChain;
  }

  /**
   * @override
   * @return {number}
   */
  nodeSelfHeight() {
    return this._parentView.rowHeight();
  }

  /**
   * @param {boolean} hovered
   * @param {boolean} showInitiatorChain
   */
  setHovered(hovered, showInitiatorChain) {
    if (this._isHovered === hovered && this._showingInitiatorChain === showInitiatorChain)
      return;
    if (this._isHovered !== hovered) {
      this._isHovered = hovered;
      if (this.attached())
        this.element().classList.toggle('hover', hovered);
    }
    if (this._showingInitiatorChain !== showInitiatorChain) {
      this._showingInitiatorChain = showInitiatorChain;
      this.showingInitiatorChainChanged();
    }
    this._parentView.stylesChanged();
    this._updateBackgroundColor();
  }

  /**
   * @protected
   */
  showingInitiatorChainChanged() {
  }

  /**
   * @return {boolean}
   */
  isOnInitiatorPath() {
    return false;
  }

  /**
   * @return {boolean}
   */
  isOnInitiatedPath() {
    return false;
  }

  /**
   * @return {?SDK.NetworkRequest}
   */
  request() {
    return null;
  }

  /**
   * @return {boolean}
   */
  isNavigationRequest() {
    return false;
  }

  /**
   * @override
   */
  clearFlatNodes() {
    super.clearFlatNodes();
    this._requestOrFirstKnownChildRequest = null;
  }

  /**
   * @protected
   * @return {?SDK.NetworkRequest}
   */
  requestOrFirstKnownChildRequest() {
    if (this._requestOrFirstKnownChildRequest)
      return this._requestOrFirstKnownChildRequest;
    var request = this.request();
    if (request || !this.hasChildren()) {
      this._requestOrFirstKnownChildRequest = request;
      return this._requestOrFirstKnownChildRequest;
    }

    var firstChildRequest = null;
    var flatChildren = this.flatChildren();
    for (var i = 0; i < flatChildren.length; i++) {
      request = flatChildren[i].request();
      if (!firstChildRequest || (request && request.issueTime() < firstChildRequest.issueTime()))
        firstChildRequest = request;
    }
    this._requestOrFirstKnownChildRequest = firstChildRequest;
    return this._requestOrFirstKnownChildRequest;
  }
};

/** @type {!Object<string, !Array<number>>} */
Network.NetworkNode._backgroundColors = {
  Default: [255, 255, 255, 1.0],
  Stripe: [245, 245, 245, 1.0],
  Navigation: [221, 238, 255, 1.0],
  Hovered: [235, 242, 252, 0.7],
  InitiatorPath: [58, 217, 58, 0.4],
  InitiatedPath: [217, 58, 58, 0.4],
  Selected: [63, 81, 181, .6],
  FromFrame: [224, 247, 250, .4],
  IsProduct: [255, 252, 225, .6],
};

/** @typedef {!{
  Default: !Common.Color,
  Stripe: !Common.Color,
  Navigation: !Common.Color,
  Hovered: !Common.Color,
  InitiatorPath: !Common.Color,
  InitiatedPath: !Common.Color,
  Selected: !Common.Color,
  FromFrame: !Common.Color,
  IsProduct: !Common.Color
}} */
Network.NetworkNode._SupportedBackgroundColors;

/** @type {!Network.NetworkNode._SupportedBackgroundColors} */
Network.NetworkNode._themedBackgroundColorsCache;

/** @typedef {!{entry: !ProductRegistry.Registry.ProductEntry, matchedURL: !Common.ParsedURL}} */
Network.NetworkNode._ProductEntryInfo;

/**
 * @unrestricted
 */
Network.NetworkRequestNode = class extends Network.NetworkNode {
  /**
   * @param {!Network.NetworkLogView} parentView
   * @param {!SDK.NetworkRequest} request
   */
  constructor(parentView, request) {
    super(parentView);
    /** @type {?Element} */
    this._nameCell = null;
    /** @type {?Element} */
    this._nameBadgeElement = null;
    /** @type {?Element} */
    this._initiatorCell = null;
    this._request = request;
    this._isNavigationRequest = false;
    this.selectable = true;
    this._isOnInitiatorPath = false;
    this._isOnInitiatedPath = false;
    this._isFromFrame = false;
    if (!Runtime.experiments.isEnabled('networkGroupingRequests'))
      return;
    var frame = SDK.ResourceTreeModel.frameForRequest(request);
    this._isFromFrame = frame ? !frame.isMainFrame() : false;
  }


  /**
   * @param {!Network.NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static NameComparator(a, b) {
    var aName = a.displayName().toLowerCase();
    var bName = b.displayName().toLowerCase();
    if (aName === bName) {
      var aRequest = a.requestOrFirstKnownChildRequest();
      var bRequest = b.requestOrFirstKnownChildRequest();
      if (aRequest && bRequest)
        return aRequest.indentityCompare(bRequest);
      return aRequest ? -1 : 1;
    }
    return aName < bName ? -1 : 1;
  }

  /**
   * @param {!Network.NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static RemoteAddressComparator(a, b) {
    // TODO(allada) Handle this properly for group nodes.
    var aRequest = a.requestOrFirstKnownChildRequest();
    var bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest)
      return !aRequest ? -1 : 1;
    var aRemoteAddress = aRequest.remoteAddress();
    var bRemoteAddress = bRequest.remoteAddress();
    if (aRemoteAddress > bRemoteAddress)
      return 1;
    if (bRemoteAddress > aRemoteAddress)
      return -1;
    return aRequest.indentityCompare(bRequest);
  }

  /**
   * @param {!ProductRegistry.Registry} productRegistry
   * @param {!Network.NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static ProductComparator(productRegistry, a, b) {
    var aRequest = a.request();
    var bRequest = b.request();
    if (!aRequest || !bRequest)
      return !aRequest ? -1 : 1;
    var aName = productRegistry.nameForUrl(aRequest.parsedURL) || '';
    var bName = productRegistry.nameForUrl(bRequest.parsedURL) || '';
    return aName.localeCompare(bName) || aRequest.indentityCompare(bRequest);
  }

  /**
   * @param {!Network.NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static SizeComparator(a, b) {
    // TODO(allada) Handle this properly for group nodes.
    var aRequest = a.requestOrFirstKnownChildRequest();
    var bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest)
      return !aRequest ? -1 : 1;
    if (bRequest.cached() && !aRequest.cached())
      return 1;
    if (aRequest.cached() && !bRequest.cached())
      return -1;
    return (aRequest.transferSize - bRequest.transferSize) || aRequest.indentityCompare(bRequest);
  }

  /**
   * @param {!Network.NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static TypeComparator(a, b) {
    // TODO(allada) Handle this properly for group nodes.
    var aRequest = a.requestOrFirstKnownChildRequest();
    var bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest)
      return !aRequest ? -1 : 1;
    var aSimpleType = a.displayType();
    var bSimpleType = b.displayType();

    if (aSimpleType > bSimpleType)
      return 1;
    if (bSimpleType > aSimpleType)
      return -1;
    return aRequest.indentityCompare(bRequest);
  }

  /**
   * @param {!Network.NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static InitiatorComparator(a, b) {
    // TODO(allada) Handle this properly for group nodes.
    var aRequest = a.requestOrFirstKnownChildRequest();
    var bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest)
      return !aRequest ? -1 : 1;
    var aInitiator = NetworkLog.networkLog.initiatorInfoForRequest(aRequest);
    var bInitiator = NetworkLog.networkLog.initiatorInfoForRequest(bRequest);

    if (aInitiator.type < bInitiator.type)
      return -1;
    if (aInitiator.type > bInitiator.type)
      return 1;

    if (typeof aInitiator.__source === 'undefined')
      aInitiator.__source = Bindings.displayNameForURL(aInitiator.url);
    if (typeof bInitiator.__source === 'undefined')
      bInitiator.__source = Bindings.displayNameForURL(bInitiator.url);

    if (aInitiator.__source < bInitiator.__source)
      return -1;
    if (aInitiator.__source > bInitiator.__source)
      return 1;

    if (aInitiator.lineNumber < bInitiator.lineNumber)
      return -1;
    if (aInitiator.lineNumber > bInitiator.lineNumber)
      return 1;

    if (aInitiator.columnNumber < bInitiator.columnNumber)
      return -1;
    if (aInitiator.columnNumber > bInitiator.columnNumber)
      return 1;

    return aRequest.indentityCompare(bRequest);
  }

  /**
   * @param {!Network.NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static RequestCookiesCountComparator(a, b) {
    // TODO(allada) Handle this properly for group nodes.
    var aRequest = a.requestOrFirstKnownChildRequest();
    var bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest)
      return !aRequest ? -1 : 1;
    var aScore = aRequest.requestCookies ? aRequest.requestCookies.length : 0;
    var bScore = bRequest.requestCookies ? bRequest.requestCookies.length : 0;
    return (aScore - bScore) || aRequest.indentityCompare(bRequest);
  }

  // TODO(allada) This function deserves to be in a network-common of some sort.
  /**
   * @param {!Network.NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static ResponseCookiesCountComparator(a, b) {
    // TODO(allada) Handle this properly for group nodes.
    var aRequest = a.requestOrFirstKnownChildRequest();
    var bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest)
      return !aRequest ? -1 : 1;
    var aScore = aRequest.responseCookies ? aRequest.responseCookies.length : 0;
    var bScore = bRequest.responseCookies ? bRequest.responseCookies.length : 0;
    return (aScore - bScore) || aRequest.indentityCompare(bRequest);
  }

  /**
   * @param {!Network.NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static InitialPriorityComparator(a, b) {
    // TODO(allada) Handle this properly for group nodes.
    var aRequest = a.requestOrFirstKnownChildRequest();
    var bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest)
      return !aRequest ? -1 : 1;
    var priorityMap = NetworkPriorities.prioritySymbolToNumericMap();
    var aPriority = aRequest.initialPriority();
    var aScore = aPriority ? priorityMap.get(aPriority) : 0;
    aScore = aScore || 0;
    var bPriority = aRequest.initialPriority();
    var bScore = bPriority ? priorityMap.get(bPriority) : 0;
    bScore = bScore || 0;

    return aScore - bScore || aRequest.indentityCompare(bRequest);
  }

  /**
   * @param {string} propertyName
   * @param {!Network.NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static RequestPropertyComparator(propertyName, a, b) {
    var aRequest = a.requestOrFirstKnownChildRequest();
    var bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest)
      return !aRequest ? -1 : 1;
    var aValue = aRequest[propertyName];
    var bValue = bRequest[propertyName];
    if (aValue === bValue)
      return aRequest.indentityCompare(bRequest);
    return aValue > bValue ? 1 : -1;
  }

  /**
   * @param {string} propertyName
   * @param {!Network.NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static ResponseHeaderStringComparator(propertyName, a, b) {
    // TODO(allada) Handle this properly for group nodes.
    var aRequest = a.requestOrFirstKnownChildRequest();
    var bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest)
      return !aRequest ? -1 : 1;
    var aValue = String(aRequest.responseHeaderValue(propertyName) || '');
    var bValue = String(bRequest.responseHeaderValue(propertyName) || '');
    return aValue.localeCompare(bValue) || aRequest.indentityCompare(bRequest);
  }

  /**
   * @param {string} propertyName
   * @param {!Network.NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static ResponseHeaderNumberComparator(propertyName, a, b) {
    // TODO(allada) Handle this properly for group nodes.
    var aRequest = a.requestOrFirstKnownChildRequest();
    var bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest)
      return !aRequest ? -1 : 1;
    var aValue = (aRequest.responseHeaderValue(propertyName) !== undefined) ?
        parseFloat(aRequest.responseHeaderValue(propertyName)) :
        -Infinity;
    var bValue = (bRequest.responseHeaderValue(propertyName) !== undefined) ?
        parseFloat(bRequest.responseHeaderValue(propertyName)) :
        -Infinity;
    if (aValue === bValue)
      return aRequest.indentityCompare(bRequest);
    return aValue > bValue ? 1 : -1;
  }

  /**
   * @param {string} propertyName
   * @param {!Network.NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static ResponseHeaderDateComparator(propertyName, a, b) {
    // TODO(allada) Handle this properly for group nodes.
    var aRequest = a.requestOrFirstKnownChildRequest();
    var bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest)
      return !aRequest ? -1 : 1;
    var aHeader = aRequest.responseHeaderValue(propertyName);
    var bHeader = bRequest.responseHeaderValue(propertyName);
    var aValue = aHeader ? new Date(aHeader).getTime() : -Infinity;
    var bValue = bHeader ? new Date(bHeader).getTime() : -Infinity;
    if (aValue === bValue)
      return aRequest.indentityCompare(bRequest);
    return aValue > bValue ? 1 : -1;
  }

  /**
   * @override
   */
  showingInitiatorChainChanged() {
    var showInitiatorChain = this.showingInitiatorChain();

    var initiatorGraph = NetworkLog.networkLog.initiatorGraphForRequest(this._request);
    for (var request of initiatorGraph.initiators) {
      if (request === this._request)
        continue;
      var node = this.parentView().nodeForRequest(request);
      if (!node)
        continue;
      node._setIsOnInitiatorPath(showInitiatorChain);
    }
    for (var request of initiatorGraph.initiated) {
      if (request === this._request)
        continue;
      var node = this.parentView().nodeForRequest(request);
      if (!node)
        continue;
      node._setIsOnInitiatedPath(showInitiatorChain);
    }
  }

  /**
   * @param {boolean} isOnInitiatorPath
   */
  _setIsOnInitiatorPath(isOnInitiatorPath) {
    if (this._isOnInitiatorPath === isOnInitiatorPath || !this.attached())
      return;
    this._isOnInitiatorPath = isOnInitiatorPath;
    this._updateBackgroundColor();
  }

  /**
   * @override
   * @return {boolean}
   */
  isOnInitiatorPath() {
    return this._isOnInitiatorPath;
  }

  /**
   * @param {boolean} isOnInitiatedPath
   */
  _setIsOnInitiatedPath(isOnInitiatedPath) {
    if (this._isOnInitiatedPath === isOnInitiatedPath || !this.attached())
      return;
    this._isOnInitiatedPath = isOnInitiatedPath;
    this._updateBackgroundColor();
  }

  /**
   * @override
   * @return {boolean}
   */
  isOnInitiatedPath() {
    return this._isOnInitiatedPath;
  }

  /**
   * @override
   * @return {boolean}
   */
  isFromFrame() {
    return this._isFromFrame;
  }

  /**
   * @return {string}
   */
  displayType() {
    var mimeType = this._request.mimeType || this._request.requestContentType() || '';
    var resourceType = this._request.resourceType();
    var simpleType = resourceType.name();

    if (resourceType === Common.resourceTypes.Other || resourceType === Common.resourceTypes.Image)
      simpleType = mimeType.replace(/^(application|image)\//, '');

    return simpleType;
  }

  /**
   * @override
   * @return {string}
   */
  displayName() {
    return this._request.name();
  }

  /**
   * @override
   * @return {!SDK.NetworkRequest}
   */
  request() {
    return this._request;
  }

  /**
   * @override
   * @return {boolean}
   */
  isNavigationRequest() {
    var pageLoad = NetworkLog.PageLoad.forRequest(this._request);
    return pageLoad ? pageLoad.mainRequest === this._request : false;
  }

  /**
   * @override
   * @return {number}
   */
  nodeSelfHeight() {
    return this.parentView().rowHeight();
  }

  /**
   * @override
   * @param {!Element} element
   */
  createCells(element) {
    this._nameCell = null;
    this._initiatorCell = null;

    element.classList.toggle('network-error-row', this._isFailed());
    element.classList.toggle('network-navigation-row', this._isNavigationRequest);
    super.createCells(element);
    this._updateBackgroundColor();
    if (!Runtime.experiments.isEnabled('networkGroupingRequests'))
      return;
    ProductRegistry.instance().then(productRegistry => {
      if (productRegistry.entryForUrl(this._request.parsedURL)) {
        this._isProduct = true;
        this._updateBackgroundColor();
      }
    });
  }

  /**
   * @param {!Element} element
   * @param {string} text
   */
  _setTextAndTitle(element, text) {
    element.createTextChild(text);
    element.title = text;
  }

  /**
   * @override
   * @param {!Element} cell
   * @param {string} columnId
   */
  renderCell(cell, columnId) {
    switch (columnId) {
      case 'name':
        this._renderNameCell(cell);
        break;
      case 'method':
        this._setTextAndTitle(cell, this._request.requestMethod);
        break;
      case 'status':
        this._renderStatusCell(cell);
        break;
      case 'protocol':
        this._setTextAndTitle(cell, this._request.protocol);
        break;
      case 'scheme':
        this._setTextAndTitle(cell, this._request.scheme);
        break;
      case 'domain':
        this._setTextAndTitle(cell, this._request.domain);
        break;
      case 'remoteaddress':
        this._setTextAndTitle(cell, this._request.remoteAddress());
        break;
      case 'cookies':
        this._setTextAndTitle(cell, this._arrayLength(this._request.requestCookies));
        break;
      case 'setcookies':
        this._setTextAndTitle(cell, this._arrayLength(this._request.responseCookies));
        break;
      case 'priority':
        var priority = this._request.initialPriority();
        this._setTextAndTitle(cell, priority ? NetworkPriorities.uiLabelForPriority(priority) : '');
        break;
      case 'connectionid':
        this._setTextAndTitle(cell, this._request.connectionId);
        break;
      case 'type':
        this._setTextAndTitle(cell, this.displayType());
        break;
      case 'initiator':
        this._renderInitiatorCell(cell);
        break;
      case 'size':
        this._renderSizeCell(cell);
        break;
      case 'time':
        this._renderTimeCell(cell);
        break;
      case 'timeline':
        this._setTextAndTitle(cell, '');
        break;
      default:
        this._setTextAndTitle(cell, this._request.responseHeaderValue(columnId) || '');
        break;
    }
  }

  /**
   * @param {?Array} array
   * @return {string}
   */
  _arrayLength(array) {
    return array ? '' + array.length : '';
  }

  /**
   * @override
   * @param {boolean=} supressSelectedEvent
   */
  select(supressSelectedEvent) {
    super.select(supressSelectedEvent);
    this.parentView().dispatchEventToListeners(Network.NetworkLogView.Events.RequestSelected, this._request);
  }

  /**
   * @param {!RegExp=} regexp
   * @return {!Array.<!Object>}
   */
  highlightMatchedSubstring(regexp) {
    // Ensure element is created.
    this.element();
    var domChanges = [];
    var matchInfo = this._nameCell.textContent.match(regexp);
    if (matchInfo)
      UI.highlightSearchResult(this._nameCell, matchInfo.index, matchInfo[0].length, domChanges);
    return domChanges;
  }

  _openInNewTab() {
    InspectorFrontendHost.openInNewTab(this._request.url());
  }

  /**
   * @return {boolean}
   */
  _isFailed() {
    return (this._request.failed && !this._request.statusCode) || (this._request.statusCode >= 400);
  }

  /**
   * @param {!Element} cell
   */
  _renderNameCell(cell) {
    var leftPadding = this.leftPadding ? this.leftPadding + 'px' : '';
    cell.style.setProperty('padding-left', leftPadding);
    this._nameCell = cell;
    cell.addEventListener('dblclick', this._openInNewTab.bind(this), false);
    var iconElement;
    if (this._request.resourceType() === Common.resourceTypes.Image) {
      var previewImage = createElementWithClass('img', 'image-network-icon-preview');
      this._request.populateImageSource(previewImage);

      iconElement = createElementWithClass('div', 'icon');
      iconElement.appendChild(previewImage);
    } else {
      iconElement = createElementWithClass('img', 'icon');
    }
    iconElement.classList.add(this._request.resourceType().name());

    cell.appendChild(iconElement);
    if (!this._nameBadgeElement) {
      this._nameBadgeElement = this.parentView().badgePool.badgeForURL(this._request.parsedURL);
      this._nameBadgeElement.classList.add('network-badge');
    }
    cell.appendChild(this._nameBadgeElement);
    var name = this._request.name().trimMiddle(100);
    var networkManager = SDK.NetworkManager.forRequest(this._request);
    cell.createTextChild(networkManager ? networkManager.target().decorateLabel(name) : name);
    this._appendSubtitle(cell, this._request.path());
    cell.title = this._request.url();
  }

  /**
   * @param {!Element} cell
   */
  _renderStatusCell(cell) {
    cell.classList.toggle(
        'network-dim-cell', !this._isFailed() && (this._request.cached() || !this._request.statusCode));

    if (this._request.failed && !this._request.canceled && !this._request.wasBlocked()) {
      var failText = Common.UIString('(failed)');
      if (this._request.localizedFailDescription) {
        cell.createTextChild(failText);
        this._appendSubtitle(cell, this._request.localizedFailDescription);
        cell.title = failText + ' ' + this._request.localizedFailDescription;
      } else {
        this._setTextAndTitle(cell, failText);
      }
    } else if (this._request.statusCode) {
      cell.createTextChild('' + this._request.statusCode);
      this._appendSubtitle(cell, this._request.statusText);
      cell.title = this._request.statusCode + ' ' + this._request.statusText;
    } else if (this._request.parsedURL.isDataURL()) {
      this._setTextAndTitle(cell, Common.UIString('(data)'));
    } else if (this._request.canceled) {
      this._setTextAndTitle(cell, Common.UIString('(canceled)'));
    } else if (this._request.wasBlocked()) {
      var reason = Common.UIString('other');
      switch (this._request.blockedReason()) {
        case Protocol.Network.BlockedReason.Csp:
          reason = Common.UIString('csp');
          break;
        case Protocol.Network.BlockedReason.MixedContent:
          reason = Common.UIString('mixed-content');
          break;
        case Protocol.Network.BlockedReason.Origin:
          reason = Common.UIString('origin');
          break;
        case Protocol.Network.BlockedReason.Inspector:
          reason = Common.UIString('devtools');
          break;
        case Protocol.Network.BlockedReason.Other:
          reason = Common.UIString('other');
          break;
      }
      this._setTextAndTitle(cell, Common.UIString('(blocked:%s)', reason));
    } else if (this._request.finished) {
      this._setTextAndTitle(cell, Common.UIString('Finished'));
    } else {
      this._setTextAndTitle(cell, Common.UIString('(pending)'));
    }
  }

  /**
   * @param {!Element} cell
   */
  _renderInitiatorCell(cell) {
    this._initiatorCell = cell;
    var request = this._request;
    var initiator = NetworkLog.networkLog.initiatorInfoForRequest(request);

    var timing = request.timing;
    if (timing && timing.pushStart)
      cell.appendChild(createTextNode(Common.UIString('Push / ')));
    switch (initiator.type) {
      case SDK.NetworkRequest.InitiatorType.Parser:
        cell.title = initiator.url + ':' + (initiator.lineNumber + 1);
        var uiSourceCode = Workspace.workspace.uiSourceCodeForURL(initiator.url);
        cell.appendChild(Components.Linkifier.linkifyURL(initiator.url, {
          text: uiSourceCode ? uiSourceCode.displayName() : undefined,
          lineNumber: initiator.lineNumber,
          columnNumber: initiator.columnNumber
        }));
        this._appendSubtitle(cell, Common.UIString('Parser'));
        break;

      case SDK.NetworkRequest.InitiatorType.Redirect:
        cell.title = initiator.url;
        var redirectSource = /** @type {!SDK.NetworkRequest} */ (request.redirectSource());
        console.assert(redirectSource);
        if (this.parentView().nodeForRequest(redirectSource)) {
          cell.appendChild(
              Components.Linkifier.linkifyRevealable(redirectSource, Bindings.displayNameForURL(redirectSource.url())));
        } else {
          cell.appendChild(Components.Linkifier.linkifyURL(redirectSource.url()));
        }
        this._appendSubtitle(cell, Common.UIString('Redirect'));
        break;

      case SDK.NetworkRequest.InitiatorType.Script:
        var networkManager = SDK.NetworkManager.forRequest(request);
        this._linkifiedInitiatorAnchor = this.parentView().linkifier.linkifyScriptLocation(
            networkManager ? networkManager.target() : null, initiator.scriptId, initiator.url, initiator.lineNumber,
            initiator.columnNumber);
        this._linkifiedInitiatorAnchor.title = '';
        cell.appendChild(this._linkifiedInitiatorAnchor);
        this._appendSubtitle(cell, Common.UIString('Script'));
        cell.classList.add('network-script-initiated');
        cell.request = request;
        break;

      case SDK.NetworkRequest.InitiatorType.Preload:
        cell.title = Common.UIString('Preload');
        cell.classList.add('network-dim-cell');
        cell.appendChild(createTextNode(Common.UIString('Preload')));
        break;

      default:
        cell.title = Common.UIString('Other');
        cell.classList.add('network-dim-cell');
        cell.appendChild(createTextNode(Common.UIString('Other')));
    }
  }

  /**
   * @param {!Element} cell
   */
  _renderSizeCell(cell) {
    if (this._request.fetchedViaServiceWorker) {
      this._setTextAndTitle(cell, Common.UIString('(from service worker)'));
      cell.classList.add('network-dim-cell');
    } else if (this._request.cached()) {
      if (this._request.cachedInMemory())
        this._setTextAndTitle(cell, Common.UIString('(from memory cache)'));
      else
        this._setTextAndTitle(cell, Common.UIString('(from disk cache)'));
      cell.classList.add('network-dim-cell');
    } else {
      var resourceSize = Number.bytesToString(this._request.resourceSize);
      var transferSize = Number.bytesToString(this._request.transferSize);
      this._setTextAndTitle(cell, transferSize);
      this._appendSubtitle(cell, resourceSize);
    }
  }

  /**
   * @param {!Element} cell
   */
  _renderTimeCell(cell) {
    if (this._request.duration > 0) {
      this._setTextAndTitle(cell, Number.secondsToString(this._request.duration));
      this._appendSubtitle(cell, Number.secondsToString(this._request.latency));
    } else {
      cell.classList.add('network-dim-cell');
      this._setTextAndTitle(cell, Common.UIString('Pending'));
    }
  }

  /**
   * @param {!Element} cellElement
   * @param {string} subtitleText
   */
  _appendSubtitle(cellElement, subtitleText) {
    var subtitleElement = createElement('div');
    subtitleElement.className = 'network-cell-subtitle';
    subtitleElement.textContent = subtitleText;
    cellElement.appendChild(subtitleElement);
  }
};

Network.NetworkGroupNode = class extends Network.NetworkNode {
  /**
   * @override
   * @param {!Element} cell
   * @param {string} columnId
   */
  renderCell(cell, columnId) {
    if (columnId === 'name') {
      var leftPadding = this.leftPadding ? this.leftPadding + 'px' : '';
      cell.style.setProperty('padding-left', leftPadding);
      cell.classList.add('disclosure');
    }
  }

  /**
   * @override
   * @param {boolean=} supressSelectedEvent
   */
  select(supressSelectedEvent) {
    if (this.expanded) {
      this.collapse();
      return;
    }
    this.expand();
  }
};
