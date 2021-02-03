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
import * as i18n from '../i18n/i18n.js';
import * as PerfUI from '../perf_ui/perf_ui.js';
import * as Platform from '../platform/platform.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';
import * as Workspace from '../workspace/workspace.js';

import {Tabs as NetworkItemViewTabs} from './NetworkItemView.js';
import {NetworkTimeCalculator} from './NetworkTimeCalculator.js';  // eslint-disable-line no-unused-vars

export const UIStrings = {
  /**
  *@description Text in Network Data Grid Node of the Network panel
  */
  redirect: 'Redirect',
  /**
  *@description Content of the request method column in the network log view
  *@example {GET} PH1
  */
  sPreflight: '{PH1} + Preflight',
  /**
  *@description Name of a network initiator type
  */
  preflight: 'Preflight',
  /**
  *@description Title for a link element in the network log view
  */
  selectPreflightRequest: 'Select preflight request',
  /**
  *@description Text in Network Data Grid Node of the Network panel
  */
  failed: '(failed)',
  /**
  *@description Text in Network Data Grid Node of the Network panel
  */
  data: '(data)',
  /**
  *@description Text in Network Data Grid Node of the Network panel
  */
  canceled: '(canceled)',
  /**
  *@description Reason in Network Data Grid Node of the Network panel
  */
  other: 'other',
  /**
  *@description Reason in Network Data Grid Node of the Network panel
  */
  csp: 'csp',
  /**
  *@description Reason in Network Data Grid Node of the Network panel
  */
  mixedcontent: 'mixed-content',
  /**
  *@description Reason in Network Data Grid Node of the Network panel
  */
  origin: 'origin',
  /**
  *@description Reason in Network Data Grid Node of the Network panel
  */
  devtools: 'devtools',
  /**
  *@description Reason in Network Data Grid Node of the Network panel
  */
  subresourcefilter: 'subresource-filter',
  /**
  *@description Reason in Network Data Grid Node of the Network panel
  */
  contenttype: 'content-type',
  /**
  *@description Reason in Network Data Grid Node of the Network panel
  */
  extension: 'extension',
  /**
  *@description Text in Network Data Grid Node of the Network panel
  */
  coepframeresourceneedscoepheader: 'CoepFrameResourceNeedsCoepHeader',
  /**
  *@description Text in Network Data Grid Node of the Network panel
  */
  CoopSandboxedIframeCannot: 'CoopSandboxedIframeCannotNavigateToCoopPage',
  /**
  *@description Text in Network Data Grid Node of the Network panel
  */
  notsameorigin: 'NotSameOrigin',
  /**
  *@description Text in Network Data Grid Node of the Network panel
  */
  notsamesite: 'NotSameSite',
  /**
  *@description Text in Network Data Grid Node of the Network panel
  */
  notsameoriginafterdefaultedtosameoriginbycoep: 'NotSameOriginAfterDefaultedToSameOriginByCoep',
  /**
  *@description Text in Network Data Grid Node of the Network panel
  *@example {mixed-content} PH1
  */
  blockeds: '(blocked:{PH1})',
  /**
  *@description Text in Network Data Grid Node of the Network panel
  */
  corsError: 'CORS error',
  /**
  *@description Tooltip providing the cors error code
  *@example {PreflightDisallowedRedirect} PH1
  */
  crossoriginResourceSharingErrorS: 'Cross-Origin Resource Sharing error: {PH1}',
  /**
  *@description Text in Network Data Grid Node of the Network panel
  */
  finished: 'Finished',
  /**
  *@description Text in Network Data Grid Node of the Network panel
  */
  pendingq: '(pending)',
  /**
  *@description Text in Network Data Grid Node of the Network panel
  */
  push: 'Push / ',
  /**
  *@description Text in Network Data Grid Node of the Network panel
  */
  parser: 'Parser',
  /**
  *@description Label for a group of JavaScript files
  */
  script: 'Script',
  /**
  *@description Cell title in Network Data Grid Node of the Network panel
  */
  preload: 'Preload',
  /**
  *@description Text in Network Data Grid Node of the Network panel
  */
  signedexchange: 'signed-exchange',
  /**
  *@description Title for a link element in the network log view
  */
  selectTheRequestThatTriggered: 'Select the request that triggered this preflight',
  /**
  *@description Text for other types of items
  */
  otherC: 'Other',
  /**
  *@description Text of a DOM element in Network Data Grid Node of the Network panel
  */
  memoryCache: '(memory cache)',
  /**
  *@description Cell title in Network Data Grid Node of the Network panel
  *@example {50 B} PH1
  */
  servedFromMemoryCacheResource: 'Served from memory cache, resource size: {PH1}',
  /**
  *@description Text of a DOM element in Network Data Grid Node of the Network panel
  */
  serviceworker: '(`ServiceWorker`)',
  /**
  *@description Cell title in Network Data Grid Node of the Network panel
  *@example {4 B} PH1
  */
  servedFromServiceworkerResource: 'Served from `ServiceWorker`, resource size: {PH1}',
  /**
  *@description Text of a DOM element in Network Data Grid Node of the Network panel
  */
  signedexchangeq: '(signed-exchange)',
  /**
  *@description Cell title in Network Data Grid Node of the Network panel
  *@example {4 B} PH1
  */
  servedFromSignedHttpExchange: 'Served from Signed HTTP Exchange, resource size: {PH1}',
  /**
  *@description Text of a DOM element in Network Data Grid Node of the Network panel
  */
  prefetchCache: '(prefetch cache)',
  /**
  *@description Cell title in Network Data Grid Node of the Network panel
  *@example {4 B} PH1
  */
  servedFromPrefetchCacheResource: 'Served from prefetch cache, resource size: {PH1}',
  /**
  *@description Text of a DOM element in Network Data Grid Node of the Network panel
  */
  diskCache: '(disk cache)',
  /**
  *@description Cell title in Network Data Grid Node of the Network panel
  *@example {10 B} PH1
  */
  servedFromDiskCacheResourceSizeS: 'Served from disk cache, resource size: {PH1}',
  /**
  *@description Text in Network Data Grid Node of the Network panel
  */
  pending: 'Pending',
  /**
  *@description Text describing the depth of a top level node in the network datagrid
  */
  level: 'level 1',
};
const str_ = i18n.i18n.registerUIStrings('network/NetworkDataGridNode.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
/** @enum {symbol} */
export const Events = {
  RequestSelected: Symbol('RequestSelected'),
  RequestActivated: Symbol('RequestActivated')
};

/**
 * @interface
 * @extends {Common.EventTarget.EventTarget}
 */
export class NetworkLogViewInterface {
  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   * @return {boolean}
   */
  static HTTPRequestsFilter(request) {
    throw new Error('not implemented');
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
    throw new Error('not implemented');
  }

  /**
   * @return {number}
   */
  headerHeight() {
    throw new Error('not implemented');
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
    throw new Error('not implemented');
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
    throw new Error('not implemented');
  }

  /**
   * @return {!NetworkTimeCalculator}
   */
  calculator() {
    throw new Error('not implemented');
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
    throw new Error('not implemented');
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
    throw new Error('not implemented');
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
    throw new Error('not implemented');
  }

  /**
   * @return {string}
   */
  static getLoadEventColor() {
    throw new Error('not implemented');
  }

  /**
   * @param {!SDK.NetworkManager.NetworkManager} model
   */
  modelAdded(model) {
  }

  /**
   * @param {!SDK.NetworkManager.NetworkManager} model
   */
  modelRemoved(model) {
  }

  /** @return {!Components.Linkifier.Linkifier} */
  linkifier() {
    throw new Error('not implemented');
  }
}

/**
 * @extends {DataGrid.SortableDataGrid.SortableDataGridNode<NetworkNode>}
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
   * @return {string}
   */
  displayType() {
    return '';
  }

  /**
   * @override
   * @param {string} columnId
   * @return {!HTMLElement}
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
    const element = /** @type {?HTMLElement} */ (this.existingElement());
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
    const flatChildren = /** @type {!Array<!NetworkNode>} */ (this.flatChildren());
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
   * @param {!NetworkNode} b
   * @return {number}
   */
  static NameComparator(a, b) {
    const aName = a.displayName().toLowerCase();
    const bName = b.displayName().toLowerCase();
    if (aName === bName) {
      const aRequest = a.requestOrFirstKnownChildRequest();
      const bRequest = b.requestOrFirstKnownChildRequest();
      if (aRequest && bRequest) {
        return aRequest.identityCompare(bRequest);
      }
      return aRequest ? -1 : 1;
    }
    return aName < bName ? -1 : 1;
  }

  /**
   * @param {!NetworkNode} a
   * @param {!NetworkNode} b
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
    return aRequest.identityCompare(bRequest);
  }

  /**
   * @param {!NetworkNode} a
   * @param {!NetworkNode} b
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
        aRequest.identityCompare(bRequest);
  }

  /**
   * @param {!NetworkNode} a
   * @param {!NetworkNode} b
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
    return aRequest.identityCompare(bRequest);
  }

  /**
   * @param {!NetworkNode} a
   * @param {!NetworkNode} b
   * @return {number}
   */
  static InitiatorComparator(a, b) {
    // TODO(allada) Handle this properly for group nodes.
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aHasInitiatorCell = a instanceof NetworkRequestNode && a._initiatorCell;
    const bHasInitiatorCell = b instanceof NetworkRequestNode && b._initiatorCell;
    if (!aHasInitiatorCell || !bHasInitiatorCell) {
      return !aHasInitiatorCell ? -1 : 1;
    }
    // `a` and `b` are guaranteed NetworkRequestNodes with present initiatorCell elements.
    const networkRequestNodeA = /** @type {!NetworkRequestNode} */ (a);
    const networkRequestNodeB = /** @type {!NetworkRequestNode} */ (b);

    const aText = networkRequestNodeA._linkifiedInitiatorAnchor ?
        networkRequestNodeA._linkifiedInitiatorAnchor.textContent || '' :
        /** @type {!HTMLElement} */ (networkRequestNodeA._initiatorCell).title;
    const bText = networkRequestNodeB._linkifiedInitiatorAnchor ?
        networkRequestNodeB._linkifiedInitiatorAnchor.textContent || '' :
        /** @type {!HTMLElement} */ (networkRequestNodeB._initiatorCell).title;
    return aText.localeCompare(bText);
  }

  /**
   * @param {!NetworkNode} a
   * @param {!NetworkNode} b
   * @return {number}
   */
  static InitiatorAddressSpaceComparator(a, b) {
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aClientSecurityState = aRequest.clientSecurityState();
    const bClientSecurityState = bRequest.clientSecurityState();
    if (!aClientSecurityState || !bClientSecurityState) {
      return !aClientSecurityState ? -1 : 1;
    }
    return aClientSecurityState.initiatorIPAddressSpace.localeCompare(bClientSecurityState.initiatorIPAddressSpace);
  }

  /**
   * @param {!NetworkNode} a
   * @param {!NetworkNode} b
   * @return {number}
   */
  static RequestCookiesCountComparator(a, b) {
    // TODO(allada) Handle this properly for group nodes.
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aScore = aRequest.includedRequestCookies().length;
    const bScore = bRequest.includedRequestCookies().length;
    return (aScore - bScore) || aRequest.identityCompare(bRequest);
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
    return (aScore - bScore) || aRequest.identityCompare(bRequest);
  }

  /**
   * @param {!NetworkNode} a
   * @param {!NetworkNode} b
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

    return aScore - bScore || aRequest.identityCompare(bRequest);
  }

  /**
   * @param {string} propertyName
   * @param {!NetworkNode} a
   * @param {!NetworkNode} b
   * @return {number}
   */
  static RequestPropertyComparator(propertyName, a, b) {
    const aRequest = /** @type {*} */ (a.requestOrFirstKnownChildRequest());
    const bRequest = /** @type {*} */ (b.requestOrFirstKnownChildRequest());
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aValue = aRequest[propertyName];
    const bValue = bRequest[propertyName];
    if (aValue === bValue) {
      return aRequest.identityCompare(bRequest);
    }
    return aValue > bValue ? 1 : -1;
  }

  /**
   * @param {!NetworkNode} a
   * @param {!NetworkNode} b
   * @return {number}
   */
  static RequestURLComparator(a, b) {
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aURL = aRequest.url();
    const bURL = bRequest.url();
    if (aURL === bURL) {
      return aRequest.identityCompare(bRequest);
    }
    return aURL > bURL ? 1 : -1;
  }

  /**
   * @param {string} propertyName
   * @param {!NetworkNode} a
   * @param {!NetworkNode} b
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
    return aValue.localeCompare(bValue) || aRequest.identityCompare(bRequest);
  }

  /**
   * @param {string} propertyName
   * @param {!NetworkNode} a
   * @param {!NetworkNode} b
   * @return {number}
   */
  static ResponseHeaderNumberComparator(propertyName, a, b) {
    // TODO(allada) Handle this properly for group nodes.
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aRawValue = aRequest.responseHeaderValue(propertyName);
    const aValue = (aRawValue !== undefined) ? parseFloat(aRawValue) : -Infinity;
    const bRawValue = bRequest.responseHeaderValue(propertyName);
    const bValue = (bRawValue !== undefined) ? parseFloat(bRawValue) : -Infinity;
    if (aValue === bValue) {
      return aRequest.identityCompare(bRequest);
    }
    return aValue > bValue ? 1 : -1;
  }

  /**
   * @param {string} propertyName
   * @param {!NetworkNode} a
   * @param {!NetworkNode} b
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
      return aRequest.identityCompare(bRequest);
    }
    return aValue > bValue ? 1 : -1;
  }

  /**
   * @override
   */
  showingInitiatorChainChanged() {
    const showInitiatorChain = this.showingInitiatorChain();

    const initiatorGraph = SDK.NetworkLog.NetworkLog.instance().initiatorGraphForRequest(this._request);
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
   * @override
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

    if (this._request.isRedirect()) {
      simpleType += ' / ' + i18nString(UIStrings.redirect);
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
   * @param {!HTMLElement} element
   * @param {string} text
   * @param {string=} title
   */
  _setTextAndTitle(element, text, title) {
    UI.UIUtils.createTextChild(element, text);
    UI.Tooltip.Tooltip.install(element, title || text);
  }

  /**
   * @param {!HTMLElement} element
   * @param {string} cellText
   * @param {string} linkText
   * @param {function():void} handler
   */
  _setTextAndTitleAndLink(element, cellText, linkText, handler) {
    UI.UIUtils.createTextChild(element, cellText);
    element.createChild('span', 'separator-in-cell');
    const link = document.createElement('span');
    link.classList.add('devtools-link');
    link.textContent = linkText;
    link.addEventListener('click', handler);
    element.appendChild(link);
    UI.Tooltip.Tooltip.install(element, cellText);
  }

  /**
   * @override
   * @param {!Element} c
   * @param {string} columnId
   */
  renderCell(c, columnId) {
    const cell = /** @type {!HTMLElement} */ (c);
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
        const preflightRequest = this._request.preflightRequest();
        if (preflightRequest) {
          this._setTextAndTitle(
              cell,
              `${this._request.requestMethod} + `,
              i18nString(UIStrings.sPreflight, {PH1: this._request.requestMethod}),
          );
          cell.appendChild(Components.Linkifier.Linkifier.linkifyRevealable(
              preflightRequest, i18nString(UIStrings.preflight), undefined,
              i18nString(UIStrings.selectPreflightRequest)));
        } else {
          this._setTextAndTitle(cell, this._request.requestMethod);
        }
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
        this._setTextAndTitle(cell, this._arrayLength(this._request.includedRequestCookies()));
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
        this._setTextAndTitle(cell, this._request.connectionId === '0' ? '' : this._request.connectionId);
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
      case 'initiator-address-space': {
        this._renderInitiatorAddressSpaceCell(cell);
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
   * @param {?Array<?>} array
   * @return {string}
   */
  _arrayLength(array) {
    return array ? String(array.length) : '';
  }

  /**
   * @override
   * @param {boolean=} supressSelectedEvent
   */
  select(supressSelectedEvent) {
    super.select(supressSelectedEvent);
    /** @type {!Common.EventTarget.EventTarget} */ (/** @type {*} */ (this.parentView()))
        .dispatchEventToListeners(Events.RequestSelected, this._request);
  }

  /**
   * @param {?RegExp} regexp
   * @return {!Array.<!Object>}
   */
  highlightMatchedSubstring(regexp) {
    if (!regexp || !this._nameCell || this._nameCell.textContent === null) {
      return [];
    }
    // Ensure element is created.
    this.element();
    /** @type {!Array<!Object>} */
    const domChanges = [];
    const matchInfo = this._nameCell.textContent.match(regexp);
    if (matchInfo) {
      UI.UIUtils.highlightSearchResult(this._nameCell, matchInfo.index || 0, matchInfo[0].length, domChanges);
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
    const signedExchangeInfo = this._request.signedExchangeInfo();
    return (this._request.failed && !this._request.statusCode) || (this._request.statusCode >= 400) ||
        (signedExchangeInfo !== null && Boolean(signedExchangeInfo.errors));
  }

  /**
   * @param {!HTMLElement} cell
   * @param {string} columnId
   * @param {string=} text
   */
  _renderPrimaryCell(cell, columnId, text) {
    const columnIndex =
        /** @type {!DataGrid.DataGrid.DataGridImpl<?>} */ (this.dataGrid).indexOfVisibleColumn(columnId);
    const isFirstCell = (columnIndex === 0);
    if (isFirstCell) {
      const leftPadding = this.leftPadding ? this.leftPadding + 'px' : '';
      cell.style.setProperty('padding-left', leftPadding);
      this._nameCell = cell;
      cell.addEventListener('dblclick', this._openInNewTab.bind(this), false);
      cell.addEventListener('click', () => {
        /** @type {!Common.EventTarget.EventTarget} */ (/** @type {*} */ (this.parentView()))
            .dispatchEventToListeners(Events.RequestActivated, {showPanel: true});
      });
      let iconElement;
      if (this._request.resourceType() === Common.ResourceType.resourceTypes.Image) {
        const previewImage = document.createElement('img');
        previewImage.classList.add('image-network-icon-preview');
        previewImage.alt = this._request.resourceType().title();
        this._request.populateImageSource(/** @type {!HTMLImageElement} */ (previewImage));

        iconElement = document.createElement('div');
        iconElement.classList.add('icon');
        iconElement.appendChild(previewImage);
      } else {
        iconElement = document.createElement('img');
        iconElement.classList.add('icon');
        iconElement.alt = this._request.resourceType().title();
      }
      iconElement.classList.add(this._request.resourceType().name());

      cell.appendChild(iconElement);
    }

    if (columnId === 'name') {
      const name = Platform.StringUtilities.trimMiddle(this._request.name(), 100);
      const networkManager = SDK.NetworkManager.NetworkManager.forRequest(this._request);
      UI.UIUtils.createTextChild(cell, networkManager ? networkManager.target().decorateLabel(name) : name);
      this._appendSubtitle(cell, this._request.path());
      UI.Tooltip.Tooltip.install(cell, this._request.url());
    } else if (text) {
      UI.UIUtils.createTextChild(cell, text);
      UI.Tooltip.Tooltip.install(cell, text);
    }
  }

  /**
   * @param {!HTMLElement} cell
   */
  _renderStatusCell(cell) {
    cell.classList.toggle(
        'network-dim-cell', !this._isFailed() && (this._request.cached() || !this._request.statusCode));

    const corsErrorStatus = this._request.corsErrorStatus();
    if (this._request.failed && !this._request.canceled && !this._request.wasBlocked() && !corsErrorStatus) {
      const failText = i18nString(UIStrings.failed);
      if (this._request.localizedFailDescription) {
        UI.UIUtils.createTextChild(cell, failText);
        this._appendSubtitle(cell, this._request.localizedFailDescription, true);
        UI.Tooltip.Tooltip.install(cell, failText + ' ' + this._request.localizedFailDescription);
      } else {
        this._setTextAndTitle(cell, failText);
      }
    } else if (this._request.statusCode) {
      UI.UIUtils.createTextChild(cell, String(this._request.statusCode));
      this._appendSubtitle(cell, this._request.statusText);
      UI.Tooltip.Tooltip.install(cell, this._request.statusCode + ' ' + this._request.statusText);
    } else if (this._request.parsedURL.isDataURL()) {
      this._setTextAndTitle(cell, i18nString(UIStrings.data));
    } else if (this._request.canceled) {
      this._setTextAndTitle(cell, i18nString(UIStrings.canceled));
    } else if (this._request.wasBlocked()) {
      let reason = i18nString(UIStrings.other);
      let displayShowHeadersLink = false;
      switch (this._request.blockedReason()) {
        case Protocol.Network.BlockedReason.Other:
          reason = i18nString(UIStrings.other);
          break;
        case Protocol.Network.BlockedReason.Csp:
          reason = i18nString(UIStrings.csp);
          break;
        case Protocol.Network.BlockedReason.MixedContent:
          reason = i18nString(UIStrings.mixedcontent);
          break;
        case Protocol.Network.BlockedReason.Origin:
          reason = i18nString(UIStrings.origin);
          break;
        case Protocol.Network.BlockedReason.Inspector:
          reason = i18nString(UIStrings.devtools);
          break;
        case Protocol.Network.BlockedReason.SubresourceFilter:
          reason = i18nString(UIStrings.subresourcefilter);
          break;
        case Protocol.Network.BlockedReason.ContentType:
          reason = i18nString(UIStrings.contenttype);
          break;
        case Protocol.Network.BlockedReason.CollapsedByClient:
          reason = i18nString(UIStrings.extension);
          break;
        case Protocol.Network.BlockedReason.CoepFrameResourceNeedsCoepHeader:
          displayShowHeadersLink = true;
          reason = i18nString(UIStrings.coepframeresourceneedscoepheader);
          break;
        case Protocol.Network.BlockedReason.CoopSandboxedIframeCannotNavigateToCoopPage:
          displayShowHeadersLink = true;
          reason = i18nString(UIStrings.CoopSandboxedIframeCannot);
          break;
        case Protocol.Network.BlockedReason.CorpNotSameOrigin:
          displayShowHeadersLink = true;
          reason = i18nString(UIStrings.notsameorigin);
          break;
        case Protocol.Network.BlockedReason.CorpNotSameSite:
          displayShowHeadersLink = true;
          reason = i18nString(UIStrings.notsamesite);
          break;
        case Protocol.Network.BlockedReason.CorpNotSameOriginAfterDefaultedToSameOriginByCoep:
          displayShowHeadersLink = true;
          reason = i18nString(UIStrings.notsameoriginafterdefaultedtosameoriginbycoep);
          break;
      }
      if (displayShowHeadersLink) {
        this._setTextAndTitleAndLink(cell, i18nString(UIStrings.blockeds, {PH1: reason}), 'View Headers', () => {
          /** @type {!Common.EventTarget.EventTarget} */ (/** @type {*} */ (this.parentView()))
              .dispatchEventToListeners(Events.RequestActivated, {showPanel: true, tab: NetworkItemViewTabs.Headers});
        });
      } else {
        this._setTextAndTitle(cell, i18nString(UIStrings.blockeds, {PH1: reason}));
      }
    } else if (corsErrorStatus) {
      this._setTextAndTitle(
          cell, i18nString(UIStrings.corsError),
          i18nString(UIStrings.crossoriginResourceSharingErrorS, {PH1: corsErrorStatus.corsError}));
    } else if (this._request.finished) {
      this._setTextAndTitle(cell, i18nString(UIStrings.finished));
    } else {
      this._setTextAndTitle(cell, i18nString(UIStrings.pendingq));
    }
  }

  /**
   * @param {!HTMLElement} cell
   */
  _renderInitiatorCell(cell) {
    this._initiatorCell = cell;
    const request = this._request;
    const initiator = SDK.NetworkLog.NetworkLog.instance().initiatorInfoForRequest(request);

    const timing = request.timing;
    if (timing && timing.pushStart) {
      cell.appendChild(document.createTextNode(i18nString(UIStrings.push)));
    }
    switch (initiator.type) {
      case SDK.NetworkRequest.InitiatorType.Parser: {
        UI.Tooltip.Tooltip.install(cell, initiator.url + ':' + (initiator.lineNumber + 1));
        const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(initiator.url);
        cell.appendChild(Components.Linkifier.Linkifier.linkifyURL(
            initiator.url, /** @type {!Components.Linkifier.LinkifyURLOptions} */ ({
              text: uiSourceCode ? uiSourceCode.displayName() : undefined,
              lineNumber: initiator.lineNumber,
              columnNumber: initiator.columnNumber
            })));
        this._appendSubtitle(cell, i18nString(UIStrings.parser));
        break;
      }

      case SDK.NetworkRequest.InitiatorType.Redirect: {
        UI.Tooltip.Tooltip.install(cell, initiator.url);
        const redirectSource = /** @type {!SDK.NetworkRequest.NetworkRequest} */ (request.redirectSource());
        console.assert(redirectSource !== null);
        if (this.parentView().nodeForRequest(redirectSource)) {
          cell.appendChild(Components.Linkifier.Linkifier.linkifyRevealable(
              redirectSource, Bindings.ResourceUtils.displayNameForURL(redirectSource.url())));
        } else {
          cell.appendChild(Components.Linkifier.Linkifier.linkifyURL(redirectSource.url()));
        }
        this._appendSubtitle(cell, i18nString(UIStrings.redirect));
        break;
      }

      case SDK.NetworkRequest.InitiatorType.Script: {
        const networkManager = SDK.NetworkManager.NetworkManager.forRequest(request);
        if (!networkManager) {
          return;
        }

        const linkifier = this.parentView().linkifier();
        if (initiator.stack) {
          this._linkifiedInitiatorAnchor =
              linkifier.linkifyStackTraceTopFrame(networkManager.target(), initiator.stack);
        } else {
          this._linkifiedInitiatorAnchor = linkifier.linkifyScriptLocation(
              networkManager.target(), initiator.scriptId, initiator.url, initiator.lineNumber,
              {columnNumber: initiator.columnNumber, className: undefined, tabStop: undefined});
        }
        /** @type {!HTMLElement} */ UI.Tooltip.Tooltip.install((this._linkifiedInitiatorAnchor), '');
        cell.appendChild(this._linkifiedInitiatorAnchor);
        this._appendSubtitle(cell, i18nString(UIStrings.script));
        cell.classList.add('network-script-initiated');
        break;
      }

      case SDK.NetworkRequest.InitiatorType.Preload: {
        UI.Tooltip.Tooltip.install(cell, i18nString(UIStrings.preload));
        cell.classList.add('network-dim-cell');
        cell.appendChild(document.createTextNode(i18nString(UIStrings.preload)));
        break;
      }

      case SDK.NetworkRequest.InitiatorType.SignedExchange: {
        cell.appendChild(Components.Linkifier.Linkifier.linkifyURL(initiator.url));
        this._appendSubtitle(cell, i18nString(UIStrings.signedexchange));
        break;
      }

      case SDK.NetworkRequest.InitiatorType.Preflight: {
        cell.appendChild(document.createTextNode(i18nString(UIStrings.preflight)));
        if (initiator.initiatorRequest) {
          const icon = UI.Icon.Icon.create('mediumicon-network-panel');
          cell.appendChild(Components.Linkifier.Linkifier.linkifyRevealable(
              initiator.initiatorRequest, icon, undefined, i18nString(UIStrings.selectTheRequestThatTriggered),
              'trailing-link-icon'));
        }
        break;
      }

      default: {
        UI.Tooltip.Tooltip.install(cell, i18nString(UIStrings.otherC));
        cell.classList.add('network-dim-cell');
        cell.appendChild(document.createTextNode(i18nString(UIStrings.otherC)));
      }
    }
  }

  /**
   * @param {!HTMLElement} cell
   */
  _renderInitiatorAddressSpaceCell(cell) {
    const clientSecurityState = this._request.clientSecurityState();
    if (clientSecurityState) {
      UI.UIUtils.createTextChild(cell, clientSecurityState.initiatorIPAddressSpace);
    }
  }

  /**
   * @param {!HTMLElement} cell
   */
  _renderSizeCell(cell) {
    const resourceSize = Platform.NumberUtilities.bytesToString(this._request.resourceSize);

    if (this._request.cachedInMemory()) {
      UI.UIUtils.createTextChild(cell, i18nString(UIStrings.memoryCache));
      UI.Tooltip.Tooltip.install(cell, i18nString(UIStrings.servedFromMemoryCacheResource, {PH1: resourceSize}));
      cell.classList.add('network-dim-cell');
    } else if (this._request.fetchedViaServiceWorker) {
      UI.UIUtils.createTextChild(cell, i18nString(UIStrings.serviceworker));
      UI.Tooltip.Tooltip.install(cell, i18nString(UIStrings.servedFromServiceworkerResource, {PH1: resourceSize}));
      cell.classList.add('network-dim-cell');
    } else if (this._request.redirectSourceSignedExchangeInfoHasNoErrors()) {
      UI.UIUtils.createTextChild(cell, i18nString(UIStrings.signedexchangeq));
      UI.Tooltip.Tooltip.install(cell, i18nString(UIStrings.servedFromSignedHttpExchange, {PH1: resourceSize}));
      cell.classList.add('network-dim-cell');
    } else if (this._request.fromPrefetchCache()) {
      UI.UIUtils.createTextChild(cell, i18nString(UIStrings.prefetchCache));
      UI.Tooltip.Tooltip.install(cell, i18nString(UIStrings.servedFromPrefetchCacheResource, {PH1: resourceSize}));
      cell.classList.add('network-dim-cell');
    } else if (this._request.cached()) {
      UI.UIUtils.createTextChild(cell, i18nString(UIStrings.diskCache));
      UI.Tooltip.Tooltip.install(cell, i18nString(UIStrings.servedFromDiskCacheResourceSizeS, {PH1: resourceSize}));
      cell.classList.add('network-dim-cell');
    } else {
      const transferSize = Platform.NumberUtilities.bytesToString(this._request.transferSize);
      UI.UIUtils.createTextChild(cell, transferSize);
      UI.Tooltip.Tooltip.install(cell, `${transferSize} transferred over network, resource size: ${resourceSize}`);
    }
    this._appendSubtitle(cell, resourceSize);
  }

  /**
   * @param {!HTMLElement} cell
   */
  _renderTimeCell(cell) {
    if (this._request.duration > 0) {
      this._setTextAndTitle(cell, Number.secondsToString(this._request.duration));
      this._appendSubtitle(cell, Number.secondsToString(this._request.latency));
    } else {
      cell.classList.add('network-dim-cell');
      this._setTextAndTitle(cell, i18nString(UIStrings.pending));
    }
  }

  /**
   * @param {!Element} cellElement
   * @param {string} subtitleText
   * @param {boolean=} showInlineWhenSelected
   */
  _appendSubtitle(cellElement, subtitleText, showInlineWhenSelected = false) {
    const subtitleElement = document.createElement('div');
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
    const primaryColumn = /** @type {!DataGrid.DataGrid.DataGridImpl<?>} */ (this.dataGrid).visibleColumnsArray[0];
    const localizedTitle = `${primaryColumn.title}`;
    const localizedLevel = i18nString(UIStrings.level);
    this.nodeAccessibleText =
        `${localizedLevel} ${localizedTitle}: ${this.cellAccessibleTextMap.get(primaryColumn.id)}`;
  }

  /**
   * @override
   * @param {!Element} c
   * @param {string} columnId
   */
  renderCell(c, columnId) {
    const columnIndex =
        /** @type {!DataGrid.DataGrid.DataGridImpl<?>} */ (this.dataGrid).indexOfVisibleColumn(columnId);
    if (columnIndex === 0) {
      const cell = /** @type {!HTMLElement} */ (c);
      const leftPadding = this.leftPadding ? this.leftPadding + 'px' : '';
      cell.style.setProperty('padding-left', leftPadding);
      cell.classList.add('disclosure');
      this.setCellAccessibleName(cell.textContent || '', cell, columnId);
    }
  }

  /**
   * @override
   * @param {boolean=} supressSelectedEvent
   */
  select(supressSelectedEvent) {
    super.select(supressSelectedEvent);
    const firstChildNode = /** @type {!NetworkNode} */ (this.traverseNextNode(false, undefined, true));
    if (firstChildNode && firstChildNode.request()) {
      /** @type {!Common.EventTarget.EventTarget} */ (/** @type {*} */ (this.parentView()))
          .dispatchEventToListeners(Events.RequestSelected, firstChildNode.request());
    }
  }
}
