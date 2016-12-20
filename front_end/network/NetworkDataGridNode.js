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
Network.NetworkNode = class extends UI.SortableDataGridNode {
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
   * @return {?Network.NetworkRequestNode}
   */
  asRequestNode() {
    return null;
  }
};

/**
 * @unrestricted
 */
Network.NetworkRequestNode = class extends Network.NetworkNode {
  /**
   * @param {!Network.NetworkLogView} parentView
   * @param {!SDK.NetworkRequest} request
   */
  constructor(parentView, request) {
    super({});
    this._parentView = parentView;
    this._request = request;
    this._isNavigationRequest = false;
    this.selectable = true;
  }

  /**
   * @param {!Network.NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static NameComparator(a, b) {
    // TODO(allada) Handle this properly for group nodes.
    var aRequest = a.request();
    var bRequest = b.request();
    if (!aRequest || !bRequest)
      return !aRequest ? -1 : 1;

    var aFileName = aRequest.name();
    var bFileName = bRequest.name();
    if (aFileName > bFileName)
      return 1;
    if (bFileName > aFileName)
      return -1;
    return aRequest.indentityCompare(bRequest);
  }

  /**
   * @param {!Network.NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static RemoteAddressComparator(a, b) {
    // TODO(allada) Handle this properly for group nodes.
    var aRequest = a.request();
    var bRequest = b.request();
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
   * @param {!Network.NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static SizeComparator(a, b) {
    // TODO(allada) Handle this properly for group nodes.
    var aRequest = a.request();
    var bRequest = b.request();
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
    var aRequest = a.request();
    var bRequest = b.request();
    if (!aRequest || !bRequest)
      return !aRequest ? -1 : 1;
    var aSimpleType = a.asRequestNode().displayType();
    var bSimpleType = b.asRequestNode().displayType();

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
    var aRequest = a.request();
    var bRequest = b.request();
    if (!aRequest || !bRequest)
      return !aRequest ? -1 : 1;
    var aInitiator = aRequest.initiatorInfo();
    var bInitiator = bRequest.initiatorInfo();

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
    var aRequest = a.request();
    var bRequest = b.request();
    if (!aRequest || !bRequest)
      return !aRequest ? -1 : 1;
    var aScore = aRequest.requestCookies ? aRequest.requestCookies.length : 0;
    var bScore = bRequest.requestCookies ? bRequest.requestCookies.length : 0;
    return (aScore - bScore) || aRequest.indentityCompare(bRequest);
  }

  /**
   * @param {!Network.NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static ResponseCookiesCountComparator(a, b) {
    // TODO(allada) Handle this properly for group nodes.
    var aRequest = a.request();
    var bRequest = b.request();
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
    var aRequest = a.request();
    var bRequest = b.request();
    if (!aRequest || !bRequest)
      return !aRequest ? -1 : 1;
    var priorityMap = Network.NetworkRequestNode._symbolicToNumericPriority;
    if (!priorityMap) {
      Network.NetworkRequestNode._symbolicToNumericPriority = new Map();
      priorityMap = Network.NetworkRequestNode._symbolicToNumericPriority;
      priorityMap.set(Protocol.Network.ResourcePriority.VeryLow, 1);
      priorityMap.set(Protocol.Network.ResourcePriority.Low, 2);
      priorityMap.set(Protocol.Network.ResourcePriority.Medium, 3);
      priorityMap.set(Protocol.Network.ResourcePriority.High, 4);
      priorityMap.set(Protocol.Network.ResourcePriority.VeryHigh, 5);
    }
    var aScore = priorityMap.get(aRequest.initialPriority()) || 0;
    var bScore = priorityMap.get(bRequest.initialPriority()) || 0;

    return aScore - bScore || aRequest.indentityCompare(bRequest);
  }

  /**
   * @param {string} propertyName
   * @param {!Network.NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static RequestPropertyComparator(propertyName, a, b) {
    // TODO(allada) Handle this properly for group nodes.
    var aRequest = a.request();
    var bRequest = b.request();
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
    var aRequest = a.request();
    var bRequest = b.request();
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
    var aRequest = a.request();
    var bRequest = b.request();
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
    var aRequest = a.request();
    var bRequest = b.request();
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
   * @return {!SDK.NetworkRequest}
   */
  request() {
    return this._request;
  }

  /**
   * @override
   * @return {!Network.NetworkRequestNode}
   */
  asRequestNode() {
    return this;
  }

  /**
   * @override
   * @return {boolean}
   */
  isNavigationRequest() {
    return this._isNavigationRequest;
  }

  markAsNavigationRequest() {
    this._isNavigationRequest = true;
    this.refresh();
  }

  /**
   * @override
   * @return {number}
   */
  nodeSelfHeight() {
    return this._parentView.rowHeight();
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
  }

  /**
   * @param {!Element} element
   * @param {string} text
   */
  _setTextAndTitle(element, text) {
    element.textContent = text;
    element.title = text;
  }

  /**
   * @override
   * @param {string} columnIdentifier
   * @return {!Element}
   */
  createCell(columnIdentifier) {
    var cell = this.createTD(columnIdentifier);
    switch (columnIdentifier) {
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
        this._setTextAndTitle(cell, Components.uiLabelForPriority(this._request.initialPriority()));
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
        this._setTextAndTitle(cell, this._request.responseHeaderValue(columnIdentifier) || '');
        break;
    }

    return cell;
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
   * @protected
   */
  willAttach() {
    if (this._initiatorCell && this._request.initiatorInfo().type === SDK.NetworkRequest.InitiatorType.Script)
      this._initiatorCell.insertBefore(this._linkifiedInitiatorAnchor, this._initiatorCell.firstChild);
  }

  /**
   * @override
   */
  wasDetached() {
    if (this._linkifiedInitiatorAnchor)
      this._linkifiedInitiatorAnchor.remove();
  }

  dispose() {
    if (this._linkifiedInitiatorAnchor)
      this._parentView.linkifier.disposeAnchor(this._request.target(), this._linkifiedInitiatorAnchor);
  }

  /**
   * @override
   * @param {boolean=} supressSelectedEvent
   */
  select(supressSelectedEvent) {
    super.select(supressSelectedEvent);
    this._parentView.dispatchEventToListeners(Network.NetworkLogView.Events.RequestSelected, this._request);
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
    InspectorFrontendHost.openInNewTab(this._request.url);
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
    cell.createTextChild(this._request.target().decorateLabel(this._request.name()));
    this._appendSubtitle(cell, this._request.path());
    cell.title = this._request.url;
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
    var initiator = request.initiatorInfo();

    if (request.timing && request.timing.pushStart)
      cell.appendChild(createTextNode(Common.UIString('Push / ')));
    switch (initiator.type) {
      case SDK.NetworkRequest.InitiatorType.Parser:
        cell.title = initiator.url + ':' + (initiator.lineNumber + 1);
        var uiSourceCode = Workspace.workspace.uiSourceCodeForURL(initiator.url);
        cell.appendChild(Components.Linkifier.linkifyURL(
            initiator.url, uiSourceCode ? uiSourceCode.displayName() : undefined, '', initiator.lineNumber,
            initiator.columnNumber));
        this._appendSubtitle(cell, Common.UIString('Parser'));
        break;

      case SDK.NetworkRequest.InitiatorType.Redirect:
        cell.title = initiator.url;
        console.assert(request.redirectSource);
        var redirectSource = /** @type {!SDK.NetworkRequest} */ (request.redirectSource);
        cell.appendChild(Components.Linkifier.linkifyURL(redirectSource.url));
        this._appendSubtitle(cell, Common.UIString('Redirect'));
        break;

      case SDK.NetworkRequest.InitiatorType.Script:
        if (!this._linkifiedInitiatorAnchor) {
          this._linkifiedInitiatorAnchor = this._parentView.linkifier.linkifyScriptLocation(
              request.target(), initiator.scriptId, initiator.url, initiator.lineNumber, initiator.columnNumber);
          this._linkifiedInitiatorAnchor.title = '';
        }
        cell.appendChild(this._linkifiedInitiatorAnchor);
        this._appendSubtitle(cell, Common.UIString('Script'));
        cell.classList.add('network-script-initiated');
        cell.request = request;
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
      this._setTextAndTitle(cell, Common.UIString('(from ServiceWorker)'));
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

/**
 * @unrestricted
 */
Network.NetworkGroupNode = class extends Network.NetworkNode {
  /**
   * @param {!Network.NetworkLogView} parentView
   * @param {string} name
   */
  constructor(parentView, name) {
    super({});
    this._parentView = parentView;
    this._name = name;
  }

  /**
   * @override
   * @return {number}
   */
  nodeSelfHeight() {
    return this._parentView.rowHeight();
  }

  /**
   * @param {!Element} element
   * @param {string} text
   */
  _setTextAndTitle(element, text) {
    element.textContent = text;
    element.title = text;
  }

  /**
   * @override
   * @param {string} columnIdentifier
   * @return {!Element}
   */
  createCell(columnIdentifier) {
    var cell = this.createTD(columnIdentifier);
    if (columnIdentifier === 'name') {
      cell.classList.add('disclosure');
      this._setTextAndTitle(cell, this._name);
    }
    return cell;
  }

  /**
   * @override
   * @return {null}
   */
  request() {
    return null;
  }

  /**
   * @override
   * @return {boolean}
   */
  isNavigationRequest() {
    return false;
  }

  /**
   * @override
   * @return {null}
   */
  asRequestNode() {
    return null;
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
