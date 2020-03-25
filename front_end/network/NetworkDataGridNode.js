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

import * as Bindings from '../bindings/bindings.js';
import * as Common from '../common/common.js';
import * as Components from '../components/components.js';
import * as DataGrid from '../data_grid/data_grid.js';
import * as Host from '../host/host.js';
import * as PerfUI from '../perf_ui/perf_ui.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';

import {Tabs as NetworkItemViewTabs} from './NetworkItemView.js';
import {NetworkTimeCalculator} from './NetworkTimeCalculator.js';  // eslint-disable-line no-unused-vars

/** @enum {symbol} */
export const Events = {
  RequestSelected: Symbol('RequestSelected'),
  RequestActivated: Symbol('RequestActivated')
};

/**
 * @interface
 * @extends {SDK.SDKModel.SDKModelObserver<!SDK.NetworkManager.NetworkManager>}
 * @extends {Common.EventTarget.EventTarget}
 */
export class NetworkLogViewInterface {
  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static HTTPRequestsFilter(request) {
  }

  /**
   * @param {!File} file
   */
  async onLoadFromFile(file) {
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {?NetworkRequestNode}
   */
  nodeForRequest(request) {
  }

  /**
   * @return {number}
   */
  headerHeight() {
  }

  /**
   * @param {boolean} recording
   */
  setRecording(recording) {
  }

  /**
   * @param {number} start
   * @param {number} end
   */
  setWindow(start, end) {
  }

  resetFocus() {
  }

  columnExtensionResolved() {
  }

  /**
   * @return {?NetworkNode}
   */
  hoveredNode() {
  }

  scheduleRefresh() {
  }

  /**
   * @param {!Array<number>} times
   */
  addFilmStripFrames(times) {
  }

  /**
   * @param {number} time
   */
  selectFilmStripFrame(time) {
  }

  clearFilmStripFrame() {
  }

  /**
   * @return {!NetworkTimeCalculator}
   */
  timeCalculator() {
  }

  /**
   * @return {!NetworkTimeCalculator}
   */
  calculator() {
  }

  /**
   * @param {!NetworkTimeCalculator} x
   */
  setCalculator(x) {
  }

  /**
   * @return {!Array<!NetworkNode>}
   */
  flatNodesList() {
  }

  updateNodeBackground() {
  }

  /**
   * @param {boolean} isSelected
   */
  updateNodeSelectedClass(isSelected) {
  }

  stylesChanged() {
  }

  /**
   * @param {string} filterString
   */
  setTextFilterValue(filterString) {
  }

  /**
   * @return {number}
   */
  rowHeight() {
  }

  /**
   * @param {boolean} gridMode
   */
  switchViewMode(gridMode) {
  }

  /**
   * @param {!UI.ContextMenu.ContextMenu} contextMenu
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  handleContextMenuForRequest(contextMenu, request) {
  }

  async exportAll() {
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  revealAndHighlightRequest(request) {
  }

  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  selectRequest(request) {
  }

  removeAllNodeHighlights() {
  }

  /**
   * @return {string}
   */
  static getDCLEventColor() {
  }

  /**
   * @return {string}
   */
  static getLoadEventColor() {
  }
}

/**
 * @unrestricted
 */
export class NetworkNode extends DataGrid.SortableDataGrid.SortableDataGridNode {
  /**
   * @param {!NetworkLogViewInterface} parentView
   */
  constructor(parentView) {
    super({});
    this._parentView = parentView;
    this._isHovered = false;
    this._showingInitiatorChain = false;
    /** @type {?SDK.NetworkRequest.NetworkRequest} */
    this._requestOrFirstKnownChildRequest = null;
  }

  /**
   * @return {string}
   */
  displayName() {
    return '';
  }

  /**
   * @override
   * @param {string} columnId
   * @return {!Element}
   */
  createCell(columnId) {
    const cell = this.createTD(columnId);
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
   * @return {boolean}
   */
  _isFailed() {
    return false;
  }

  /**
   * @return {string}
   * @suppressGlobalPropertiesCheck
   */
  backgroundColor() {
    const bgColors = _backgroundColors;
    const hasFocus = document.hasFocus();
    const isSelected = this.dataGrid && this.dataGrid.element === document.activeElement;
    const isFailed = this._isFailed();

    if (this.selected && hasFocus && isSelected && isFailed) {
      return bgColors.FocusSelectedHasError;
    }
    if (this.selected && hasFocus && isSelected) {
      return bgColors.FocusSelected;
    }
    if (this.selected) {
      return bgColors.Selected;
    }
    if (this.hovered()) {
      return bgColors.Hovered;
    }
    if (this.isOnInitiatorPath()) {
      return bgColors.InitiatorPath;
    }
    if (this.isOnInitiatedPath()) {
      return bgColors.InitiatedPath;
    }
    if (this.isStriped()) {
      return bgColors.Stripe;
    }
    return bgColors.Default;
  }

  updateBackgroundColor() {
    const element = this.existingElement();
    if (!element) {
      return;
    }
    element.style.backgroundColor = `var(${this.backgroundColor()})`;
    this._parentView.stylesChanged();
  }

  /**
   * @override
   * @param {boolean} isStriped
   */
  setStriped(isStriped) {
    super.setStriped(isStriped);
    this.updateBackgroundColor();
  }

  /**
   * @override
   * @param {boolean=} supressSelectedEvent
   */
  select(supressSelectedEvent) {
    super.select(supressSelectedEvent);
    this.updateBackgroundColor();
    this._parentView.updateNodeSelectedClass(/* isSelected */ true);
  }

  /**
   * @override
   * @param {boolean=} supressSelectedEvent
   */
  deselect(supressSelectedEvent) {
    super.deselect(supressSelectedEvent);
    this.updateBackgroundColor();
    this._parentView.updateNodeSelectedClass(/* isSelected */ false);
  }

  /**
   * @return {!NetworkLogViewInterface}
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
    if (this._isHovered === hovered && this._showingInitiatorChain === showInitiatorChain) {
      return;
    }
    if (this._isHovered !== hovered) {
      this._isHovered = hovered;
      if (this.attached()) {
        this.element().classList.toggle('hover', hovered);
      }
    }
    if (this._showingInitiatorChain !== showInitiatorChain) {
      this._showingInitiatorChain = showInitiatorChain;
      this.showingInitiatorChainChanged();
    }
    this._parentView.stylesChanged();
    this.updateBackgroundColor();
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
   * @return {?SDK.NetworkRequest.NetworkRequest}
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
   * @return {?SDK.NetworkRequest.NetworkRequest}
   */
  requestOrFirstKnownChildRequest() {
    if (this._requestOrFirstKnownChildRequest) {
      return this._requestOrFirstKnownChildRequest;
    }
    let request = this.request();
    if (request || !this.hasChildren()) {
      this._requestOrFirstKnownChildRequest = request;
      return this._requestOrFirstKnownChildRequest;
    }

    let firstChildRequest = null;
    const flatChildren = this.flatChildren();
    for (let i = 0; i < flatChildren.length; i++) {
      request = flatChildren[i].request();
      if (!firstChildRequest || (request && request.issueTime() < firstChildRequest.issueTime())) {
        firstChildRequest = request;
      }
    }
    this._requestOrFirstKnownChildRequest = firstChildRequest;
    return this._requestOrFirstKnownChildRequest;
  }
}

/** @type {!Object<string, string>} */
export const _backgroundColors = {
  Default: '--network-grid-default-color',
  Stripe: '--network-grid-stripe-color',
  Navigation: '--network-grid-navigation-color',
  Hovered: '--network-grid-hovered-color',
  InitiatorPath: '--network-grid-initiator-path-color',
  InitiatedPath: '--network-grid-initiated-path-color',
  Selected: '--network-grid-selected-color',
  FocusSelected: '--network-grid-focus-selected-color',
  FocusSelectedHasError: '--network-grid-focus-selected-color-has-error',
  FromFrame: '--network-grid-from-frame-color',
};

/**
 * @unrestricted
 */
export class NetworkRequestNode extends NetworkNode {
  /**
   * @param {!NetworkLogViewInterface} parentView
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  constructor(parentView, request) {
    super(parentView);
    /** @type {?Element} */
    this._nameCell = null;
    /** @type {?Element} */
    this._initiatorCell = null;
    this._request = request;
    this._isNavigationRequest = false;
    this.selectable = true;
    this._isOnInitiatorPath = false;
    this._isOnInitiatedPath = false;
  }


  /**
   * @param {!NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static NameComparator(a, b) {
    const aName = a.displayName().toLowerCase();
    const bName = b.displayName().toLowerCase();
    if (aName === bName) {
      const aRequest = a.requestOrFirstKnownChildRequest();
      const bRequest = b.requestOrFirstKnownChildRequest();
      if (aRequest && bRequest) {
        return aRequest.indentityCompare(bRequest);
      }
      return aRequest ? -1 : 1;
    }
    return aName < bName ? -1 : 1;
  }

  /**
   * @param {!NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static RemoteAddressComparator(a, b) {
    // TODO(allada) Handle this properly for group nodes.
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aRemoteAddress = aRequest.remoteAddress();
    const bRemoteAddress = bRequest.remoteAddress();
    if (aRemoteAddress > bRemoteAddress) {
      return 1;
    }
    if (bRemoteAddress > aRemoteAddress) {
      return -1;
    }
    return aRequest.indentityCompare(bRequest);
  }

  /**
   * @param {!NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static SizeComparator(a, b) {
    // TODO(allada) Handle this properly for group nodes.
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    if (bRequest.cached() && !aRequest.cached()) {
      return 1;
    }
    if (aRequest.cached() && !bRequest.cached()) {
      return -1;
    }
    return (aRequest.transferSize - bRequest.transferSize) || (aRequest.resourceSize - bRequest.resourceSize) ||
        aRequest.indentityCompare(bRequest);
  }

  /**
   * @param {!NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static TypeComparator(a, b) {
    // TODO(allada) Handle this properly for group nodes.
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aSimpleType = a.displayType();
    const bSimpleType = b.displayType();

    if (aSimpleType > bSimpleType) {
      return 1;
    }
    if (bSimpleType > aSimpleType) {
      return -1;
    }
    return aRequest.indentityCompare(bRequest);
  }

  /**
   * @param {!NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static InitiatorComparator(a, b) {
    // TODO(allada) Handle this properly for group nodes.
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    if (!a._initiatorCell || !b._initiatorCell) {
      return !a._initiatorCell ? -1 : 1;
    }
    const aText = a._linkifiedInitiatorAnchor ? a._linkifiedInitiatorAnchor.textContent : a._initiatorCell.title;
    const bText = b._linkifiedInitiatorAnchor ? b._linkifiedInitiatorAnchor.textContent : b._initiatorCell.title;
    return aText.localeCompare(bText);
  }

  /**
   * @param {!NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static RequestCookiesCountComparator(a, b) {
    // TODO(allada) Handle this properly for group nodes.
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aScore = aRequest.requestCookies.length;
    const bScore = bRequest.requestCookies.length;
    return (aScore - bScore) || aRequest.indentityCompare(bRequest);
  }

  // TODO(allada) This function deserves to be in a network-common of some sort.
  /**
   * @param {!NetworkNode} a
   * @param {!NetworkNode} b
   * @return {number}
   */
  static ResponseCookiesCountComparator(a, b) {
    // TODO(allada) Handle this properly for group nodes.
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aScore = aRequest.responseCookies ? aRequest.responseCookies.length : 0;
    const bScore = bRequest.responseCookies ? bRequest.responseCookies.length : 0;
    return (aScore - bScore) || aRequest.indentityCompare(bRequest);
  }

  /**
   * @param {!NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static PriorityComparator(a, b) {
    // TODO(allada) Handle this properly for group nodes.
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aPriority = aRequest.priority();
    let aScore = aPriority ? PerfUI.NetworkPriorities.networkPriorityWeight(aPriority) : 0;
    aScore = aScore || 0;
    const bPriority = bRequest.priority();
    let bScore = bPriority ? PerfUI.NetworkPriorities.networkPriorityWeight(bPriority) : 0;
    bScore = bScore || 0;

    return aScore - bScore || aRequest.indentityCompare(bRequest);
  }

  /**
   * @param {string} propertyName
   * @param {!NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static RequestPropertyComparator(propertyName, a, b) {
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aValue = aRequest[propertyName];
    const bValue = bRequest[propertyName];
    if (aValue === bValue) {
      return aRequest.indentityCompare(bRequest);
    }
    return aValue > bValue ? 1 : -1;
  }

  /**
   * @param {string} propertyName
   * @param {!NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static ResponseHeaderStringComparator(propertyName, a, b) {
    // TODO(allada) Handle this properly for group nodes.
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aValue = String(aRequest.responseHeaderValue(propertyName) || '');
    const bValue = String(bRequest.responseHeaderValue(propertyName) || '');
    return aValue.localeCompare(bValue) || aRequest.indentityCompare(bRequest);
  }

  /**
   * @param {string} propertyName
   * @param {!NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static ResponseHeaderNumberComparator(propertyName, a, b) {
    // TODO(allada) Handle this properly for group nodes.
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aValue = (aRequest.responseHeaderValue(propertyName) !== undefined) ?
        parseFloat(aRequest.responseHeaderValue(propertyName)) :
        -Infinity;
    const bValue = (bRequest.responseHeaderValue(propertyName) !== undefined) ?
        parseFloat(bRequest.responseHeaderValue(propertyName)) :
        -Infinity;
    if (aValue === bValue) {
      return aRequest.indentityCompare(bRequest);
    }
    return aValue > bValue ? 1 : -1;
  }

  /**
   * @param {string} propertyName
   * @param {!NetworkNode} a
   * @param {!Network.NetworkNode} b
   * @return {number}
   */
  static ResponseHeaderDateComparator(propertyName, a, b) {
    // TODO(allada) Handle this properly for group nodes.
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aHeader = aRequest.responseHeaderValue(propertyName);
    const bHeader = bRequest.responseHeaderValue(propertyName);
    const aValue = aHeader ? new Date(aHeader).getTime() : -Infinity;
    const bValue = bHeader ? new Date(bHeader).getTime() : -Infinity;
    if (aValue === bValue) {
      return aRequest.indentityCompare(bRequest);
    }
    return aValue > bValue ? 1 : -1;
  }

  /**
   * @override
   */
  showingInitiatorChainChanged() {
    const showInitiatorChain = this.showingInitiatorChain();

    const initiatorGraph = self.SDK.networkLog.initiatorGraphForRequest(this._request);
    for (const request of initiatorGraph.initiators) {
      if (request === this._request) {
        continue;
      }
      const node = this.parentView().nodeForRequest(request);
      if (!node) {
        continue;
      }
      node._setIsOnInitiatorPath(showInitiatorChain);
    }
    for (const request of initiatorGraph.initiated.keys()) {
      if (request === this._request) {
        continue;
      }
      const node = this.parentView().nodeForRequest(request);
      if (!node) {
        continue;
      }
      node._setIsOnInitiatedPath(showInitiatorChain);
    }
  }

  /**
   * @param {boolean} isOnInitiatorPath
   */
  _setIsOnInitiatorPath(isOnInitiatorPath) {
    if (this._isOnInitiatorPath === isOnInitiatorPath || !this.attached()) {
      return;
    }
    this._isOnInitiatorPath = isOnInitiatorPath;
    this.updateBackgroundColor();
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
    if (this._isOnInitiatedPath === isOnInitiatedPath || !this.attached()) {
      return;
    }
    this._isOnInitiatedPath = isOnInitiatedPath;
    this.updateBackgroundColor();
  }

  /**
   * @override
   * @return {boolean}
   */
  isOnInitiatedPath() {
    return this._isOnInitiatedPath;
  }

  /**
   * @return {string}
   */
  displayType() {
    const mimeType = this._request.mimeType || this._request.requestContentType() || '';
    const resourceType = this._request.resourceType();
    let simpleType = resourceType.name();

    if (resourceType === Common.ResourceType.resourceTypes.Other ||
        resourceType === Common.ResourceType.resourceTypes.Image) {
      simpleType = mimeType.replace(/^(application|image)\//, '');
    }

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
   * @return {!SDK.NetworkRequest.NetworkRequest}
   */
  request() {
    return this._request;
  }

  /**
   * @override
   * @return {boolean}
   */
  isNavigationRequest() {
    const pageLoad = SDK.NetworkLog.PageLoad.forRequest(this._request);
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
    this.updateBackgroundColor();
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
   * @param {!Element} element
   * @param {string} cellText
   * @param {string} linkText
   * @param {function()} handler
   */
  _setTextAndTitleAndLink(element, cellText, linkText, handler) {
    element.createTextChild(cellText);
    element.createChild('span', 'separator-in-cell');
    const link = createElementWithClass('span', 'devtools-link');
    link.textContent = linkText;
    link.addEventListener('click', handler);
    element.appendChild(link);
    element.title = cellText;
  }

  /**
   * @override
   * @param {!Element} cell
   * @param {string} columnId
   */
  renderCell(cell, columnId) {
    switch (columnId) {
      case 'name': {
        this._renderPrimaryCell(cell, columnId);
        break;
      }
      case 'path': {
        this._renderPrimaryCell(cell, columnId, this._request.pathname);
        break;
      }
      case 'url': {
        this._renderPrimaryCell(cell, columnId, this._request.url());
        break;
      }
      case 'method': {
        this._setTextAndTitle(cell, this._request.requestMethod);
        break;
      }
      case 'status': {
        this._renderStatusCell(cell);
        break;
      }
      case 'protocol': {
        this._setTextAndTitle(cell, this._request.protocol);
        break;
      }
      case 'scheme': {
        this._setTextAndTitle(cell, this._request.scheme);
        break;
      }
      case 'domain': {
        this._setTextAndTitle(cell, this._request.domain);
        break;
      }
      case 'remoteaddress': {
        this._setTextAndTitle(cell, this._request.remoteAddress());
        break;
      }
      case 'cookies': {
        this._setTextAndTitle(cell, this._arrayLength(this._request.requestCookies));
        break;
      }
      case 'setcookies': {
        this._setTextAndTitle(cell, this._arrayLength(this._request.responseCookies));
        break;
      }
      case 'priority': {
        const priority = this._request.priority();
        this._setTextAndTitle(cell, priority ? PerfUI.NetworkPriorities.uiLabelForNetworkPriority(priority) : '');
        break;
      }
      case 'connectionid': {
        this._setTextAndTitle(cell, this._request.connectionId);
        break;
      }
      case 'type': {
        this._setTextAndTitle(cell, this.displayType());
        break;
      }
      case 'initiator': {
        this._renderInitiatorCell(cell);
        break;
      }
      case 'size': {
        this._renderSizeCell(cell);
        break;
      }
      case 'time': {
        this._renderTimeCell(cell);
        break;
      }
      case 'timeline': {
        this._setTextAndTitle(cell, '');
        break;
      }
      default: {
        this._setTextAndTitle(cell, this._request.responseHeaderValue(columnId) || '');
        break;
      }
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
    this.parentView().dispatchEventToListeners(Events.RequestSelected, this._request);
  }

  /**
   * @param {?RegExp} regexp
   * @return {!Array.<!Object>}
   */
  highlightMatchedSubstring(regexp) {
    if (!regexp) {
      return [];
    }
    // Ensure element is created.
    this.element();
    const domChanges = [];
    const matchInfo = this._nameCell.textContent.match(regexp);
    if (matchInfo) {
      UI.UIUtils.highlightSearchResult(this._nameCell, matchInfo.index, matchInfo[0].length, domChanges);
    }
    return domChanges;
  }

  _openInNewTab() {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(this._request.url());
  }

  /**
   * @override
   * @return {boolean}
   */
  _isFailed() {
    return (this._request.failed && !this._request.statusCode) || (this._request.statusCode >= 400) ||
        (!!this._request.signedExchangeInfo() && !!this._request.signedExchangeInfo().errors);
  }

  /**
   * @param {!Element} cell
   * @param {string} columnId
   * @param {string=} text
   */
  _renderPrimaryCell(cell, columnId, text) {
    const columnIndex = this.dataGrid.indexOfVisibleColumn(columnId);
    const isFirstCell = (columnIndex === 0);
    if (isFirstCell) {
      const leftPadding = this.leftPadding ? this.leftPadding + 'px' : '';
      cell.style.setProperty('padding-left', leftPadding);
      this._nameCell = cell;
      cell.addEventListener('dblclick', this._openInNewTab.bind(this), false);
      cell.addEventListener('click', () => {
        this.parentView().dispatchEventToListeners(Events.RequestActivated, {showPanel: true});
      });
      let iconElement;
      if (this._request.resourceType() === Common.ResourceType.resourceTypes.Image) {
        const previewImage = createElementWithClass('img', 'image-network-icon-preview');
        previewImage.alt = this._request.resourceType().title();
        this._request.populateImageSource(previewImage);

        iconElement = createElementWithClass('div', 'icon');
        iconElement.appendChild(previewImage);
      } else {
        iconElement = createElementWithClass('img', 'icon');
        iconElement.alt = this._request.resourceType().title();
      }
      iconElement.classList.add(this._request.resourceType().name());

      cell.appendChild(iconElement);
    }

    if (columnId === 'name') {
      const name = this._request.name().trimMiddle(100);
      const networkManager = SDK.NetworkManager.NetworkManager.forRequest(this._request);
      cell.createTextChild(networkManager ? networkManager.target().decorateLabel(name) : name);
      this._appendSubtitle(cell, this._request.path());
      cell.title = this._request.url();
    } else if (text) {
      cell.createTextChild(text);
      cell.title = text;
    }
  }

  /**
   * @param {!Element} cell
   */
  _renderStatusCell(cell) {
    cell.classList.toggle(
        'network-dim-cell', !this._isFailed() && (this._request.cached() || !this._request.statusCode));

    if (this._request.failed && !this._request.canceled && !this._request.wasBlocked()) {
      const failText = Common.UIString.UIString('(failed)');
      if (this._request.localizedFailDescription) {
        cell.createTextChild(failText);
        this._appendSubtitle(cell, this._request.localizedFailDescription, true);
        cell.title = failText + ' ' + this._request.localizedFailDescription;
      } else {
        this._setTextAndTitle(cell, failText);
      }
    } else if (this._request.statusCode) {
      cell.createTextChild('' + this._request.statusCode);
      this._appendSubtitle(cell, this._request.statusText);
      cell.title = this._request.statusCode + ' ' + this._request.statusText;
    } else if (this._request.parsedURL.isDataURL()) {
      this._setTextAndTitle(cell, Common.UIString.UIString('(data)'));
    } else if (this._request.canceled) {
      this._setTextAndTitle(cell, Common.UIString.UIString('(canceled)'));
    } else if (this._request.wasBlocked()) {
      let reason = Common.UIString.UIString('other');
      let displayShowHeadersLink = false;
      switch (this._request.blockedReason()) {
        case Protocol.Network.BlockedReason.Other:
          reason = Common.UIString.UIString('other');
          break;
        case Protocol.Network.BlockedReason.Csp:
          reason = Common.UIString.UIString('csp');
          break;
        case Protocol.Network.BlockedReason.MixedContent:
          reason = Common.UIString.UIString('mixed-content');
          break;
        case Protocol.Network.BlockedReason.Origin:
          reason = Common.UIString.UIString('origin');
          break;
        case Protocol.Network.BlockedReason.Inspector:
          reason = Common.UIString.UIString('devtools');
          break;
        case Protocol.Network.BlockedReason.SubresourceFilter:
          reason = Common.UIString.UIString('subresource-filter');
          break;
        case Protocol.Network.BlockedReason.ContentType:
          reason = Common.UIString.UIString('content-type');
          break;
        case Protocol.Network.BlockedReason.CollapsedByClient:
          reason = Common.UIString.UIString('extension');
          break;
        case Protocol.Network.BlockedReason.CoepFrameResourceNeedsCoepHeader:
          displayShowHeadersLink = true;
          reason = Common.UIString.UIString('CoepFrameResourceNeedsCoepHeader');
          break;
        case Protocol.Network.BlockedReason.CoopSandboxedIframeCannotNavigateToCoopPage:
          displayShowHeadersLink = true;
          reason = Common.UIString.UIString('CoopSandboxedIframeCannotNavigateToCoopPage');
          break;
        case Protocol.Network.BlockedReason.CorpNotSameOrigin:
          displayShowHeadersLink = true;
          reason = Common.UIString.UIString('NotSameOrigin');
          break;
        case Protocol.Network.BlockedReason.CorpNotSameSite:
          displayShowHeadersLink = true;
          reason = Common.UIString.UIString('NotSameSite');
          break;
        case Protocol.Network.BlockedReason.CorpNotSameOriginAfterDefaultedToSameOriginByCoep:
          displayShowHeadersLink = true;
          reason = Common.UIString.UIString('NotSameOriginAfterDefaultedToSameOriginByCoep');
          break;
      }
      if (displayShowHeadersLink) {
        this._setTextAndTitleAndLink(cell, Common.UIString.UIString('(blocked:%s)', reason), 'View Headers', () => {
          this.parentView().dispatchEventToListeners(
              Events.RequestActivated, {showPanel: true, tab: NetworkItemViewTabs.Headers});
        });
      } else {
        this._setTextAndTitle(cell, Common.UIString.UIString('(blocked:%s)', reason));
      }
    } else if (this._request.finished) {
      this._setTextAndTitle(cell, Common.UIString.UIString('Finished'));
    } else {
      this._setTextAndTitle(cell, Common.UIString.UIString('(pending)'));
    }
  }

  /**
   * @param {!Element} cell
   */
  _renderInitiatorCell(cell) {
    this._initiatorCell = cell;
    const request = this._request;
    const initiator = self.SDK.networkLog.initiatorInfoForRequest(request);

    const timing = request.timing;
    if (timing && timing.pushStart) {
      cell.appendChild(createTextNode(Common.UIString.UIString('Push / ')));
    }
    switch (initiator.type) {
      case SDK.NetworkRequest.InitiatorType.Parser: {
        cell.title = initiator.url + ':' + (initiator.lineNumber + 1);
        const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(initiator.url);
        cell.appendChild(Components.Linkifier.Linkifier.linkifyURL(initiator.url, {
          text: uiSourceCode ? uiSourceCode.displayName() : undefined,
          lineNumber: initiator.lineNumber,
          columnNumber: initiator.columnNumber
        }));
        this._appendSubtitle(cell, Common.UIString.UIString('Parser'));
        break;
      }

      case SDK.NetworkRequest.InitiatorType.Redirect: {
        cell.title = initiator.url;
        const redirectSource = /** @type {!SDK.NetworkRequest.NetworkRequest} */ (request.redirectSource());
        console.assert(redirectSource);
        if (this.parentView().nodeForRequest(redirectSource)) {
          cell.appendChild(Components.Linkifier.Linkifier.linkifyRevealable(
              redirectSource, Bindings.ResourceUtils.displayNameForURL(redirectSource.url())));
        } else {
          cell.appendChild(Components.Linkifier.Linkifier.linkifyURL(redirectSource.url()));
        }
        this._appendSubtitle(cell, Common.UIString.UIString('Redirect'));
        break;
      }

      case SDK.NetworkRequest.InitiatorType.Script: {
        const networkManager = SDK.NetworkManager.NetworkManager.forRequest(request);
        /**
         * @type {!Components.Linkifier.Linkifier}
         * @suppress {checkTypes}
         */
        const linkifier = this.parentView().linkifier;
        if (initiator.stack) {
          this._linkifiedInitiatorAnchor =
              linkifier.linkifyStackTraceTopFrame(networkManager.target(), initiator.stack);
        } else {
          this._linkifiedInitiatorAnchor = linkifier.linkifyScriptLocation(
              networkManager.target(), initiator.scriptId, initiator.url, initiator.lineNumber,
              {columnNumber: initiator.columnNumber});
        }
        this._linkifiedInitiatorAnchor.title = '';
        cell.appendChild(this._linkifiedInitiatorAnchor);
        this._appendSubtitle(cell, Common.UIString.UIString('Script'));
        cell.classList.add('network-script-initiated');
        cell.request = request;
        break;
      }

      case SDK.NetworkRequest.InitiatorType.Preload: {
        cell.title = Common.UIString.UIString('Preload');
        cell.classList.add('network-dim-cell');
        cell.appendChild(createTextNode(Common.UIString.UIString('Preload')));
        break;
      }

      case SDK.NetworkRequest.InitiatorType.SignedExchange: {
        cell.appendChild(Components.Linkifier.Linkifier.linkifyURL(initiator.url));
        this._appendSubtitle(cell, Common.UIString.UIString('signed-exchange'));
        break;
      }

      default: {
        cell.title = Common.UIString.UIString('Other');
        cell.classList.add('network-dim-cell');
        cell.appendChild(createTextNode(Common.UIString.UIString('Other')));
      }
    }
  }

  /**
   * @param {!Element} cell
   */
  _renderSizeCell(cell) {
    const resourceSize = Number.bytesToString(this._request.resourceSize);

    if (this._request.cachedInMemory()) {
      cell.createTextChild(ls`(memory cache)`);
      cell.title = ls`Served from memory cache, resource size: ${resourceSize}`;
      cell.classList.add('network-dim-cell');
    } else if (this._request.fetchedViaServiceWorker) {
      cell.createTextChild(ls`(ServiceWorker)`);
      cell.title = ls`Served from ServiceWorker, resource size: ${resourceSize}`;
      cell.classList.add('network-dim-cell');
    } else if (
        this._request.redirectSource() && this._request.redirectSource().signedExchangeInfo() &&
        !this._request.redirectSource().signedExchangeInfo().errors) {
      cell.createTextChild(ls`(signed-exchange)`);
      cell.title = ls`Served from Signed HTTP Exchange, resource size: ${resourceSize}`;
      cell.classList.add('network-dim-cell');
    } else if (this._request.fromPrefetchCache()) {
      cell.createTextChild(ls`(prefetch cache)`);
      cell.title = ls`Served from prefetch cache, resource size: ${resourceSize}`;
      cell.classList.add('network-dim-cell');
    } else if (this._request.cached()) {
      cell.createTextChild(ls`(disk cache)`);
      cell.title = ls`Served from disk cache, resource size: ${resourceSize}`;
      cell.classList.add('network-dim-cell');
    } else {
      const transferSize = Number.bytesToString(this._request.transferSize);
      cell.createTextChild(transferSize);
      cell.title = `${transferSize} transferred over network, resource size: ${resourceSize}`;
    }
    this._appendSubtitle(cell, resourceSize);
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
      this._setTextAndTitle(cell, Common.UIString.UIString('Pending'));
    }
  }

  /**
   * @param {!Element} cellElement
   * @param {string} subtitleText
   * @param {boolean=} showInlineWhenSelected
   */
  _appendSubtitle(cellElement, subtitleText, showInlineWhenSelected = false) {
    const subtitleElement = createElement('div');
    subtitleElement.classList.add('network-cell-subtitle');
    if (showInlineWhenSelected) {
      subtitleElement.classList.add('network-cell-subtitle-show-inline-when-selected');
    }
    subtitleElement.textContent = subtitleText;
    cellElement.appendChild(subtitleElement);
  }
}

export class NetworkGroupNode extends NetworkNode {
  /**
   * @override
   * @param {!Element} element
   * @protected
   */
  createCells(element) {
    super.createCells(element);
    const primaryColumn = this.dataGrid.visibleColumnsArray[0];
    const localizedTitle = ls`${primaryColumn.title}`;
    const localizedLevel = ls`level 1`;
    this.nodeAccessibleText =
        `${localizedLevel} ${localizedTitle}: ${this.cellAccessibleTextMap.get(primaryColumn.id)}`;
  }

  /**
   * @override
   * @param {!Element} cell
   * @param {string} columnId
   */
  renderCell(cell, columnId) {
    const columnIndex = this.dataGrid.indexOfVisibleColumn(columnId);
    if (columnIndex === 0) {
      const leftPadding = this.leftPadding ? this.leftPadding + 'px' : '';
      cell.style.setProperty('padding-left', leftPadding);
      cell.classList.add('disclosure');
      this.setCellAccessibleName(cell.textContent, cell, columnId);
    }
  }

  /**
   * @override
   * @param {boolean=} supressSelectedEvent
   */
  select(supressSelectedEvent) {
    super.select(supressSelectedEvent);
    const firstChildNode = this.traverseNextNode(false, true);
    if (firstChildNode && firstChildNode.request()) {
      this.parentView().dispatchEventToListeners(Events.RequestSelected, firstChildNode.request());
    }
  }
}
