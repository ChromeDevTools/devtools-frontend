// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/naming-convention */

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as Protocol from '../../generated/protocol.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Logs from '../../models/logs/logs.js';
import * as Workspace from '../../models/workspace/workspace.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';

import {type NetworkTimeCalculator} from './NetworkTimeCalculator.js';

import {imageNameForResourceType} from '../utils/utils.js';

const UIStrings = {
  /**
   *@description Text in Network Data Grid Node of the Network panel
   */
  redirect: 'Redirect',
  /**
   *@description Content of the request method column in the network log view. Some requests require an additional request to check permissions, and this additional request is called 'Preflight Request', see https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request. In the request method column we use, for example, 'POST + Preflight' to indicate that the request method was 'POST' and the request was accompanied by a preflight request. Since the column is short, the translation for Preflight in this context should ideally also be short.
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
   * @description Text in Network Data Grid Node of the Network panel. Indicates a network request has
   * been canceled.
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
  origin: 'origin',
  /**
   *@description Reason in Network Data Grid Node of the Network panel
   */
  devtools: 'devtools',
  /**
   *@description Text in Network Data Grid Node of the Network panel
   *@example {mixed-content} PH1
   */
  blockeds: '(blocked:{PH1})',
  /**
   *@description Text in Network Data Grid Node of the Network panel
   */
  blockedTooltip: 'This request was blocked due to misconfigured response headers, click to view the headers',
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
   * @description Status text in the Network panel that indicates a network request is still loading
   * and has not finished yet (is pending).
   */
  pendingq: '(pending)',
  /**
   * @description Status text in the Network panel that indicates a network request state is not known.
   */
  unknown: '(unknown)',
  /**
   * @description Tooltip providing details on why the request has unknown status.
   */
  unknownExplanation:
      'The request status cannot be shown here because the page that issued it unloaded while the request was in flight. You can use chrome://net-export to capture a network log and see all request details.',
  /**
   * @description Text in Network Data Grid Node of the Network panel. Noun, short for a 'HTTP server
   * push'.
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
   *@description Cell title in Network Data Grid Node of the Network panel. Indicates that the response came from memory cache.
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
   *@description Cell title in Network Data Grid Node of the Network panel
   *@example {4 B} PH1
   */
  servedFromSignedHttpExchange: 'Served from Signed HTTP Exchange, resource size: {PH1}',
  /**
   *@description Cell title in Network Data Grid Node of the Network panel. Indicates that the response came from preloaded web bundle. See https://web.dev/web-bundles/
   *@example {4 B} PH1
   */
  servedFromWebBundle: 'Served from Web Bundle, resource size: {PH1}',
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
  /**
   *@description Text in Network Data Grid Node of the Network panel
   */
  webBundleError: 'Web Bundle error',
  /**
   *@description Alternative text for the web bundle inner request icon in Network Data Grid Node of the Network panel
   * Indicates that the response came from preloaded web bundle. See https://web.dev/web-bundles/
   */
  webBundleInnerRequest: 'Served from Web Bundle',
  /**
   *@description Text in Network Data Grid Node of the Network panel
   */
  webBundle: '(Web Bundle)',
  /**
   *@description Tooltip text for subtitles of Time cells in Network request rows. Latency is the time difference
   * between the time a response to a network request is received and the time the request is started.
   */
  timeSubtitleTooltipText: 'Latency (response received time - start time)',
  /**
   *@description Tooltip text giving the reason why a specific HTTP transport protocol has been used
   */
  alternativeJobWonWithoutRace:
      '`Chrome` used a `HTTP/3` connection induced by an \'`Alt-Svc`\' header without racing against establishing a connection using a different `HTTP` version.',
  /**
   *@description Tooltip text giving the reason why a specific HTTP transport protocol has been used
   */
  alternativeJobWonRace:
      '`Chrome` used a `HTTP/3` connection induced by an \'`Alt-Svc`\' header because it won a race against establishing a connection using a different `HTTP` version.',
  /**
   *@description Tooltip text giving the reason why a specific HTTP transport protocol has been used
   */
  mainJobWonRace: '`Chrome` used this protocol because it won a race against establishing a `HTTP/3` connection.',
  /**
   *@description Tooltip text giving the reason why a specific HTTP transport protocol has been used
   */
  mappingMissing:
      '`Chrome` did not use an alternative `HTTP` version because no alternative protocol information was available when the request was issued, but an \'`Alt-Svc`\' header was present in the response.',
  /**
   *@description Tooltip text giving the reason why a specific HTTP transport protocol has been used
   */
  broken: '`Chrome` did not try to establish a `HTTP/3` connection because it was marked as broken.',
  /**
   *@description Tooltip text giving the reason why a specific HTTP transport protocol has been used
   */
  dnsAlpnH3JobWonWithoutRace:
      '`Chrome` used a `HTTP/3` connection due to the `DNS record` indicating `HTTP/3` support. There was no race against establishing a connection using a different `HTTP` version.',
  /**
   *@description Tooltip text giving the reason why a specific HTTP transport protocol has been used
   */
  dnsAlpnH3JobWonRace:
      '`Chrome` used a `HTTP/3` connection due to the `DNS record` indicating `HTTP/3` support, which won a race against establishing a connection using a different `HTTP` version.',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/NetworkDataGridNode.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// TODO(crbug.com/1167717): Make this a const enum again
// eslint-disable-next-line rulesdir/const_enum
export enum Events {
  // RequestSelected might fire twice for the same "activation"
  RequestSelected = 'RequestSelected',
  RequestActivated = 'RequestActivated',
}

export interface RequestActivatedEvent {
  showPanel: boolean;
  takeFocus?: boolean;
  tab?: NetworkForward.UIRequestLocation.UIRequestTabs;
}

export type EventTypes = {
  [Events.RequestSelected]: SDK.NetworkRequest.NetworkRequest,
  [Events.RequestActivated]: RequestActivatedEvent,
};

export interface NetworkLogViewInterface extends Common.EventTarget.EventTarget<EventTypes> {
  onLoadFromFile(file: File): Promise<void>;
  nodeForRequest(request: SDK.NetworkRequest.NetworkRequest): NetworkRequestNode|null;
  headerHeight(): number;
  setRecording(recording: boolean): void;
  setWindow(start: number, end: number): void;
  resetFocus(): void;
  columnExtensionResolved(): void;
  hoveredNode(): NetworkNode|null;
  scheduleRefresh(): void;
  addFilmStripFrames(times: number[]): void;
  selectFilmStripFrame(time: number): void;
  clearFilmStripFrame(): void;
  timeCalculator(): NetworkTimeCalculator;
  calculator(): NetworkTimeCalculator;
  setCalculator(x: NetworkTimeCalculator): void;
  flatNodesList(): NetworkNode[];
  updateNodeBackground(): void;
  updateNodeSelectedClass(isSelected: boolean): void;
  stylesChanged(): void;
  setTextFilterValue(filterString: string): void;
  rowHeight(): number;
  switchViewMode(gridMode: boolean): void;
  handleContextMenuForRequest(contextMenu: UI.ContextMenu.ContextMenu, request: SDK.NetworkRequest.NetworkRequest):
      void;
  exportAll(): Promise<void>;
  revealAndHighlightRequest(request: SDK.NetworkRequest.NetworkRequest): void;
  selectRequest(request: SDK.NetworkRequest.NetworkRequest): void;
  removeAllNodeHighlights(): void;
  modelAdded(model: SDK.NetworkManager.NetworkManager): void;
  modelRemoved(model: SDK.NetworkManager.NetworkManager): void;
  linkifier(): Components.Linkifier.Linkifier;
}

export class NetworkNode extends DataGrid.SortableDataGrid.SortableDataGridNode<NetworkNode> {
  private readonly parentViewInternal: NetworkLogViewInterface;
  private isHovered: boolean;
  private showingInitiatorChainInternal: boolean;
  private requestOrFirstKnownChildRequestInternal: SDK.NetworkRequest.NetworkRequest|null;

  constructor(parentView: NetworkLogViewInterface) {
    super({});
    this.parentViewInternal = parentView;
    this.isHovered = false;
    this.showingInitiatorChainInternal = false;
    this.requestOrFirstKnownChildRequestInternal = null;
  }

  displayName(): string {
    return '';
  }

  displayType(): string {
    return '';
  }

  createCell(columnId: string): HTMLElement {
    const cell = this.createTD(columnId);
    this.renderCell(cell, columnId);
    return cell;
  }

  renderCell(cell: Element, columnId: string): void {
  }

  isFailed(): boolean {
    return false;
  }

  backgroundColor(): string {
    const bgColors = _backgroundColors;
    const hasFocus = document.hasFocus();
    const isSelected = this.dataGrid &&
        (this.dataGrid.element === document.activeElement || this.dataGrid.element.contains(document.activeElement));
    const isFailed = this.isFailed();

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

  updateBackgroundColor(): void {
    const element = (this.existingElement() as HTMLElement | null);
    if (!element) {
      return;
    }
    element.style.backgroundColor = `var(${this.backgroundColor()})`;
    this.parentViewInternal.stylesChanged();
  }

  setStriped(isStriped: boolean): void {
    super.setStriped(isStriped);
    this.updateBackgroundColor();
  }

  select(supressSelectedEvent?: boolean): void {
    super.select(supressSelectedEvent);
    this.updateBackgroundColor();
    this.parentViewInternal.updateNodeSelectedClass(/* isSelected */ true);
  }

  deselect(supressSelectedEvent?: boolean): void {
    super.deselect(supressSelectedEvent);
    this.updateBackgroundColor();
    this.parentViewInternal.updateNodeSelectedClass(/* isSelected */ false);
  }

  parentView(): NetworkLogViewInterface {
    return this.parentViewInternal;
  }

  hovered(): boolean {
    return this.isHovered;
  }

  showingInitiatorChain(): boolean {
    return this.showingInitiatorChainInternal;
  }

  nodeSelfHeight(): number {
    return this.parentViewInternal.rowHeight();
  }

  setHovered(hovered: boolean, showInitiatorChain: boolean): void {
    if (this.isHovered === hovered && this.showingInitiatorChainInternal === showInitiatorChain) {
      return;
    }
    if (this.isHovered !== hovered) {
      this.isHovered = hovered;
      if (this.attached()) {
        this.element().classList.toggle('hover', hovered);
      }
    }
    if (this.showingInitiatorChainInternal !== showInitiatorChain) {
      this.showingInitiatorChainInternal = showInitiatorChain;
      this.showingInitiatorChainChanged();
    }
    this.parentViewInternal.stylesChanged();
    this.updateBackgroundColor();
  }

  showingInitiatorChainChanged(): void {
  }

  isOnInitiatorPath(): boolean {
    return false;
  }

  isOnInitiatedPath(): boolean {
    return false;
  }

  request(): SDK.NetworkRequest.NetworkRequest|null {
    return null;
  }

  isNavigationRequest(): boolean {
    return false;
  }

  clearFlatNodes(): void {
    super.clearFlatNodes();
    this.requestOrFirstKnownChildRequestInternal = null;
  }

  requestOrFirstKnownChildRequest(): SDK.NetworkRequest.NetworkRequest|null {
    if (this.requestOrFirstKnownChildRequestInternal) {
      return this.requestOrFirstKnownChildRequestInternal;
    }
    let request = this.request();
    if (request || !this.hasChildren()) {
      this.requestOrFirstKnownChildRequestInternal = request;
      return this.requestOrFirstKnownChildRequestInternal;
    }

    let firstChildRequest: (SDK.NetworkRequest.NetworkRequest|null)|null = null;
    const flatChildren = (this.flatChildren() as NetworkNode[]);
    for (let i = 0; i < flatChildren.length; i++) {
      request = flatChildren[i].request();
      if (!firstChildRequest || (request && request.issueTime() < firstChildRequest.issueTime())) {
        firstChildRequest = request;
      }
    }
    this.requestOrFirstKnownChildRequestInternal = firstChildRequest;
    return this.requestOrFirstKnownChildRequestInternal;
  }
}

export const _backgroundColors: {
  [x: string]: string,
} = {
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
  private nameCell: Element|null;
  private initiatorCell: Element|null;
  private requestInternal: SDK.NetworkRequest.NetworkRequest;
  private readonly isNavigationRequestInternal: boolean;
  selectable: boolean;
  private isOnInitiatorPathInternal: boolean;
  private isOnInitiatedPathInternal: boolean;
  private linkifiedInitiatorAnchor?: HTMLElement;
  constructor(parentView: NetworkLogViewInterface, request: SDK.NetworkRequest.NetworkRequest) {
    super(parentView);
    this.nameCell = null;
    this.initiatorCell = null;
    this.requestInternal = request;
    this.isNavigationRequestInternal = false;
    this.selectable = true;
    this.isOnInitiatorPathInternal = false;
    this.isOnInitiatedPathInternal = false;
  }

  static NameComparator(a: NetworkNode, b: NetworkNode): number {
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

  static RemoteAddressComparator(a: NetworkNode, b: NetworkNode): number {
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

  static SizeComparator(a: NetworkNode, b: NetworkNode): number {
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

  static TypeComparator(a: NetworkNode, b: NetworkNode): number {
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

  static InitiatorComparator(a: NetworkNode, b: NetworkNode): number {
    // TODO(allada) Handle this properly for group nodes.
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aHasInitiatorCell = a instanceof NetworkRequestNode && a.initiatorCell;
    const bHasInitiatorCell = b instanceof NetworkRequestNode && b.initiatorCell;
    if (!aHasInitiatorCell || !bHasInitiatorCell) {
      return !aHasInitiatorCell ? -1 : 1;
    }
    // `a` and `b` are guaranteed NetworkRequestNodes with present initiatorCell elements.
    const networkRequestNodeA = (a as NetworkRequestNode);
    const networkRequestNodeB = (b as NetworkRequestNode);

    const aText = networkRequestNodeA.linkifiedInitiatorAnchor ?
        networkRequestNodeA.linkifiedInitiatorAnchor.textContent || '' :
        (networkRequestNodeA.initiatorCell as HTMLElement).title;
    const bText = networkRequestNodeB.linkifiedInitiatorAnchor ?
        networkRequestNodeB.linkifiedInitiatorAnchor.textContent || '' :
        (networkRequestNodeB.initiatorCell as HTMLElement).title;
    return aText.localeCompare(bText);
  }

  static InitiatorAddressSpaceComparator(a: NetworkNode, b: NetworkNode): number {
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

  static RemoteAddressSpaceComparator(a: NetworkNode, b: NetworkNode): number {
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    return aRequest.remoteAddressSpace().localeCompare(bRequest.remoteAddressSpace());
  }

  static RequestCookiesCountComparator(a: NetworkNode, b: NetworkNode): number {
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
  static ResponseCookiesCountComparator(a: NetworkNode, b: NetworkNode): number {
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

  static PriorityComparator(a: NetworkNode, b: NetworkNode): number {
    // TODO(allada) Handle this properly for group nodes.
    const aRequest = a.requestOrFirstKnownChildRequest();
    const bRequest = b.requestOrFirstKnownChildRequest();
    if (!aRequest || !bRequest) {
      return !aRequest ? -1 : 1;
    }
    const aPriority = aRequest.priority();
    let aScore: number = aPriority ? PerfUI.NetworkPriorities.networkPriorityWeight(aPriority) : 0;
    aScore = aScore || 0;
    const bPriority = bRequest.priority();
    let bScore: number = bPriority ? PerfUI.NetworkPriorities.networkPriorityWeight(bPriority) : 0;
    bScore = bScore || 0;

    return aScore - bScore || aRequest.identityCompare(bRequest);
  }

  static RequestPropertyComparator(propertyName: string, a: NetworkNode, b: NetworkNode): number {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const aRequest = (a.requestOrFirstKnownChildRequest() as any);
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const bRequest = (b.requestOrFirstKnownChildRequest() as any);
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

  static RequestURLComparator(a: NetworkNode, b: NetworkNode): number {
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

  static ResponseHeaderStringComparator(propertyName: string, a: NetworkNode, b: NetworkNode): number {
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

  static ResponseHeaderNumberComparator(propertyName: string, a: NetworkNode, b: NetworkNode): number {
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

  static ResponseHeaderDateComparator(propertyName: string, a: NetworkNode, b: NetworkNode): number {
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

  showingInitiatorChainChanged(): void {
    const showInitiatorChain = this.showingInitiatorChain();

    const initiatorGraph = Logs.NetworkLog.NetworkLog.instance().initiatorGraphForRequest(this.requestInternal);
    for (const request of initiatorGraph.initiators) {
      if (request === this.requestInternal) {
        continue;
      }
      const node = this.parentView().nodeForRequest(request);
      if (!node) {
        continue;
      }
      node.setIsOnInitiatorPath(showInitiatorChain);
    }
    for (const request of initiatorGraph.initiated.keys()) {
      if (request === this.requestInternal) {
        continue;
      }
      const node = this.parentView().nodeForRequest(request);
      if (!node) {
        continue;
      }
      node.setIsOnInitiatedPath(showInitiatorChain);
    }
  }

  private setIsOnInitiatorPath(isOnInitiatorPath: boolean): void {
    if (this.isOnInitiatorPathInternal === isOnInitiatorPath || !this.attached()) {
      return;
    }
    this.isOnInitiatorPathInternal = isOnInitiatorPath;
    this.updateBackgroundColor();
  }

  isOnInitiatorPath(): boolean {
    return this.isOnInitiatorPathInternal;
  }

  private setIsOnInitiatedPath(isOnInitiatedPath: boolean): void {
    if (this.isOnInitiatedPathInternal === isOnInitiatedPath || !this.attached()) {
      return;
    }
    this.isOnInitiatedPathInternal = isOnInitiatedPath;
    this.updateBackgroundColor();
  }

  isOnInitiatedPath(): boolean {
    return this.isOnInitiatedPathInternal;
  }

  displayType(): string {
    const mimeType = this.requestInternal.mimeType || this.requestInternal.requestContentType() || '';
    const resourceType = this.requestInternal.resourceType();
    let simpleType = resourceType.name();

    if (resourceType === Common.ResourceType.resourceTypes.Other ||
        resourceType === Common.ResourceType.resourceTypes.Image) {
      simpleType = mimeType.replace(/^(application|image)\//, '');
    }

    if (this.requestInternal.isRedirect()) {
      simpleType += ' / ' + i18nString(UIStrings.redirect);
    }

    return simpleType;
  }

  displayName(): string {
    return this.requestInternal.name();
  }

  request(): SDK.NetworkRequest.NetworkRequest {
    return this.requestInternal;
  }

  isNavigationRequest(): boolean {
    const pageLoad = SDK.PageLoad.PageLoad.forRequest(this.requestInternal);
    return pageLoad ? pageLoad.mainRequest === this.requestInternal : false;
  }

  nodeSelfHeight(): number {
    return this.parentView().rowHeight();
  }

  createCells(element: Element): void {
    this.nameCell = null;
    this.initiatorCell = null;

    element.classList.toggle('network-error-row', this.isFailed());
    element.classList.toggle('network-navigation-row', this.isNavigationRequestInternal);
    super.createCells(element);
    this.updateBackgroundColor();
  }

  private setTextAndTitle(element: HTMLElement, text: string, title?: string): void {
    UI.UIUtils.createTextChild(element, text);
    UI.Tooltip.Tooltip.install(element, title || text);
  }

  private setTextAndTitleAsLink(element: HTMLElement, cellText: string, titleText: string, handler: () => void): void {
    const link = document.createElement('span');
    link.classList.add('devtools-link');
    link.textContent = cellText;
    link.addEventListener('click', handler);
    element.appendChild(link);
    UI.Tooltip.Tooltip.install(element, titleText);
  }

  renderCell(c: Element, columnId: string): void {
    const cell = (c as HTMLElement);
    switch (columnId) {
      case 'name': {
        this.renderPrimaryCell(cell, columnId);
        break;
      }
      case 'path': {
        this.renderPrimaryCell(cell, columnId, this.requestInternal.pathname);
        break;
      }
      case 'url': {
        this.renderPrimaryCell(cell, columnId, this.requestInternal.url());
        break;
      }
      case 'method': {
        const preflightRequest = this.requestInternal.preflightRequest();
        if (preflightRequest) {
          this.setTextAndTitle(
              cell, `${this.requestInternal.requestMethod} + `,
              i18nString(UIStrings.sPreflight, {PH1: this.requestInternal.requestMethod}));
          cell.appendChild(Components.Linkifier.Linkifier.linkifyRevealable(
              preflightRequest, i18nString(UIStrings.preflight), undefined,
              i18nString(UIStrings.selectPreflightRequest)));
        } else {
          this.setTextAndTitle(cell, this.requestInternal.requestMethod);
        }
        break;
      }
      case 'status': {
        this.renderStatusCell(cell);
        break;
      }
      case 'protocol': {
        this.renderProtocolCell(cell);
        break;
      }
      case 'scheme': {
        this.setTextAndTitle(cell, this.requestInternal.scheme);
        break;
      }
      case 'domain': {
        this.setTextAndTitle(cell, this.requestInternal.domain);
        break;
      }
      case 'remoteaddress': {
        this.setTextAndTitle(cell, this.requestInternal.remoteAddress());
        break;
      }
      case 'remoteaddress-space': {
        this.renderAddressSpaceCell(cell, this.requestInternal.remoteAddressSpace());
        break;
      }
      case 'cookies': {
        this.setTextAndTitle(cell, this.arrayLength(this.requestInternal.includedRequestCookies()));
        break;
      }
      case 'setcookies': {
        this.setTextAndTitle(cell, this.arrayLength(this.requestInternal.responseCookies));
        break;
      }
      case 'priority': {
        const priority = this.requestInternal.priority();
        this.setTextAndTitle(cell, priority ? PerfUI.NetworkPriorities.uiLabelForNetworkPriority(priority) : '');
        break;
      }
      case 'connectionid': {
        this.setTextAndTitle(cell, this.requestInternal.connectionId === '0' ? '' : this.requestInternal.connectionId);
        break;
      }
      case 'type': {
        this.setTextAndTitle(cell, this.displayType());
        break;
      }
      case 'initiator': {
        this.renderInitiatorCell(cell);
        break;
      }
      case 'initiator-address-space': {
        const clientSecurityState = this.requestInternal.clientSecurityState();
        this.renderAddressSpaceCell(
            cell,
            clientSecurityState ? clientSecurityState.initiatorIPAddressSpace :
                                  Protocol.Network.IPAddressSpace.Unknown);
        break;
      }
      case 'size': {
        this.renderSizeCell(cell);
        break;
      }
      case 'time': {
        this.renderTimeCell(cell);
        break;
      }
      case 'timeline': {
        this.setTextAndTitle(cell, '');
        break;
      }
      default: {
        this.setTextAndTitle(cell, this.requestInternal.responseHeaderValue(columnId) || '');
        break;
      }
    }
  }

  private arrayLength(array: Array<unknown>|null): string {
    return array ? String(array.length) : '';
  }

  select(supressSelectedEvent?: boolean): void {
    super.select(supressSelectedEvent);
    this.parentView().dispatchEventToListeners(Events.RequestSelected, this.requestInternal);
    const selectedElement = (this.dataGrid?.selectedNode?.elementInternal?.firstElementChild as HTMLElement);
    if (selectedElement) {
      selectedElement.tabIndex = 0;
    }
  }

  deselect(suppressSelectedEvent?: boolean): void {
    super.deselect(suppressSelectedEvent);
    const deselectedElement = (this.elementInternal?.firstElementChild as HTMLElement);
    if (deselectedElement) {
      deselectedElement.tabIndex = -1;
    }
  }

  highlightMatchedSubstring(regexp: RegExp|null): Object[] {
    if (!regexp || !this.nameCell || this.nameCell.textContent === null) {
      return [];
    }
    // Ensure element is created.
    this.element();
    const domChanges: UI.UIUtils.HighlightChange[] = [];
    const matchInfo = this.nameCell.textContent.match(regexp);
    if (matchInfo) {
      UI.UIUtils.highlightSearchResult(this.nameCell, matchInfo.index || 0, matchInfo[0].length, domChanges);
    }
    return domChanges;
  }

  private openInNewTab(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(this.requestInternal.url());
  }

  isFailed(): boolean {
    if (this.requestInternal.failed && !this.requestInternal.statusCode) {
      return true;
    }
    if (this.requestInternal.statusCode >= 400) {
      return true;
    }
    const signedExchangeInfo = this.requestInternal.signedExchangeInfo();
    if (signedExchangeInfo !== null && Boolean(signedExchangeInfo.errors)) {
      return true;
    }
    if (this.requestInternal.webBundleInfo()?.errorMessage ||
        this.requestInternal.webBundleInnerRequestInfo()?.errorMessage) {
      return true;
    }
    if (this.requestInternal.corsErrorStatus()) {
      return true;
    }
    return false;
  }

  private renderPrimaryCell(cell: HTMLElement, columnId: string, text?: string): void {
    const columnIndex = (this.dataGrid as DataGrid.DataGrid.DataGridImpl<unknown>).indexOfVisibleColumn(columnId);
    const isFirstCell = (columnIndex === 0);
    if (isFirstCell) {
      const leftPadding = this.leftPadding ? this.leftPadding + 'px' : '';
      cell.style.setProperty('padding-left', leftPadding);
      this.nameCell = cell;
      cell.addEventListener('dblclick', this.openInNewTab.bind(this), false);
      cell.addEventListener('mousedown', () => {
        // When the request panel isn't visible yet, firing the RequestActivated event
        // doesn't make it visible if no request is selected. So we'll select it first.
        this.select();
        this.parentView().dispatchEventToListeners(Events.RequestActivated, {showPanel: true});
      });
      let iconElement;
      if (this.requestInternal.resourceType() === Common.ResourceType.resourceTypes.Image) {
        const previewImage = document.createElement('img');
        previewImage.classList.add('image-network-icon-preview');
        previewImage.alt = this.requestInternal.resourceType().title();
        void this.requestInternal.populateImageSource((previewImage as HTMLImageElement));

        iconElement = document.createElement('div');
        iconElement.classList.add('image');
        iconElement.appendChild(previewImage);
      } else {
        iconElement = document.createElement('img');
        iconElement.alt = this.requestInternal.resourceType().title();
        iconElement.src =
            new URL(
                `../../Images/${imageNameForResourceType(this.requestInternal.resourceType())}.svg`, import.meta.url)
                .toString();
      }
      iconElement.classList.add('icon');

      cell.appendChild(iconElement);
      cell.tabIndex = this.selected ? 0 : -1;
    }

    if (columnId === 'name') {
      const webBundleInnerRequestInfo = this.requestInternal.webBundleInnerRequestInfo();
      if (webBundleInnerRequestInfo) {
        const secondIconElement = document.createElement('img');
        secondIconElement.classList.add('icon');
        secondIconElement.alt = i18nString(UIStrings.webBundleInnerRequest);
        secondIconElement.src = new URL('../../Images/ic_file_webbundle_inner_request.svg', import.meta.url).toString();

        const networkManager = SDK.NetworkManager.NetworkManager.forRequest(this.requestInternal);
        if (webBundleInnerRequestInfo.bundleRequestId && networkManager) {
          cell.appendChild(Components.Linkifier.Linkifier.linkifyRevealable(
              new NetworkForward.NetworkRequestId.NetworkRequestId(
                  webBundleInnerRequestInfo.bundleRequestId, networkManager),
              secondIconElement));
        } else {
          cell.appendChild(secondIconElement);
        }
      }
      const name = Platform.StringUtilities.trimMiddle(this.requestInternal.name(), 100);
      const networkManager = SDK.NetworkManager.NetworkManager.forRequest(this.requestInternal);
      UI.UIUtils.createTextChild(cell, networkManager ? networkManager.target().decorateLabel(name) : name);
      this.appendSubtitle(cell, this.requestInternal.path());
      if (!this.requestInternal.url().startsWith('data')) {
        // Show the URL as tooltip unless it's a data URL.
        UI.Tooltip.Tooltip.install(cell, this.requestInternal.url());
      }
    } else if (text) {
      UI.UIUtils.createTextChild(cell, text);
    }
  }

  private renderStatusCell(cell: HTMLElement): void {
    cell.classList.toggle(
        'network-dim-cell', !this.isFailed() && (this.requestInternal.cached() || !this.requestInternal.statusCode));

    const corsErrorStatus = this.requestInternal.corsErrorStatus();
    const webBundleErrorMessage = this.requestInternal.webBundleInfo()?.errorMessage ||
        this.requestInternal.webBundleInnerRequestInfo()?.errorMessage;
    if (webBundleErrorMessage) {
      this.setTextAndTitle(cell, i18nString(UIStrings.webBundleError), webBundleErrorMessage);
    } else if (
        this.requestInternal.failed && !this.requestInternal.canceled && !this.requestInternal.wasBlocked() &&
        !corsErrorStatus) {
      const failText = i18nString(UIStrings.failed);
      if (this.requestInternal.localizedFailDescription) {
        UI.UIUtils.createTextChild(cell, failText);
        this.appendSubtitle(cell, this.requestInternal.localizedFailDescription, true);
        UI.Tooltip.Tooltip.install(cell, failText + ' ' + this.requestInternal.localizedFailDescription);
      } else {
        this.setTextAndTitle(cell, failText);
      }
    } else if (this.requestInternal.statusCode && this.requestInternal.statusCode >= 400) {
      UI.UIUtils.createTextChild(cell, String(this.requestInternal.statusCode));
      this.appendSubtitle(cell, this.requestInternal.statusText);
      UI.Tooltip.Tooltip.install(cell, this.requestInternal.statusCode + ' ' + this.requestInternal.statusText);
    } else if (!this.requestInternal.statusCode && this.requestInternal.parsedURL.isDataURL()) {
      this.setTextAndTitle(cell, i18nString(UIStrings.data));
    } else if (!this.requestInternal.statusCode && this.requestInternal.canceled) {
      this.setTextAndTitle(cell, i18nString(UIStrings.canceled));
    } else if (this.requestInternal.wasBlocked()) {
      let reason = i18nString(UIStrings.other);
      let displayShowHeadersLink = false;
      switch (this.requestInternal.blockedReason()) {
        case Protocol.Network.BlockedReason.Other:
          reason = i18nString(UIStrings.other);
          break;
        case Protocol.Network.BlockedReason.Csp:
          reason = i18nString(UIStrings.csp);
          break;
        case Protocol.Network.BlockedReason.MixedContent:
          reason = i18n.i18n.lockedString('mixed-content');
          break;
        case Protocol.Network.BlockedReason.Origin:
          reason = i18nString(UIStrings.origin);
          break;
        case Protocol.Network.BlockedReason.Inspector:
          reason = i18nString(UIStrings.devtools);
          break;
        case Protocol.Network.BlockedReason.SubresourceFilter:
          reason = i18n.i18n.lockedString('subresource-filter');
          break;
        case Protocol.Network.BlockedReason.ContentType:
          reason = i18n.i18n.lockedString('content-type');
          break;
        case Protocol.Network.BlockedReason.CoepFrameResourceNeedsCoepHeader:
          displayShowHeadersLink = true;
          reason = i18n.i18n.lockedString('CoepFrameResourceNeedsCoepHeader');
          break;
        case Protocol.Network.BlockedReason.CoopSandboxedIframeCannotNavigateToCoopPage:
          displayShowHeadersLink = true;
          reason = i18n.i18n.lockedString('CoopSandboxedIframeCannotNavigateToCoopPage');
          break;
        case Protocol.Network.BlockedReason.CorpNotSameOrigin:
          displayShowHeadersLink = true;
          reason = i18n.i18n.lockedString('NotSameOrigin');
          break;
        case Protocol.Network.BlockedReason.CorpNotSameSite:
          displayShowHeadersLink = true;
          reason = i18n.i18n.lockedString('NotSameSite');
          break;
        case Protocol.Network.BlockedReason.CorpNotSameOriginAfterDefaultedToSameOriginByCoep:
          displayShowHeadersLink = true;
          reason = i18n.i18n.lockedString('NotSameOriginAfterDefaultedToSameOriginByCoep');
          break;
      }
      if (displayShowHeadersLink) {
        this.setTextAndTitleAsLink(
            cell, i18nString(UIStrings.blockeds, {PH1: reason}), i18nString(UIStrings.blockedTooltip), () => {
              this.parentView().dispatchEventToListeners(Events.RequestActivated, {
                showPanel: true,
                tab: NetworkForward.UIRequestLocation.UIRequestTabs.Headers,
              });
            });
      } else {
        this.setTextAndTitle(cell, i18nString(UIStrings.blockeds, {PH1: reason}));
      }
    } else if (corsErrorStatus) {
      this.setTextAndTitle(
          cell, i18nString(UIStrings.corsError),
          i18nString(UIStrings.crossoriginResourceSharingErrorS, {PH1: corsErrorStatus.corsError}));
    } else if (this.requestInternal.statusCode) {
      UI.UIUtils.createTextChild(cell, String(this.requestInternal.statusCode));
      this.appendSubtitle(cell, this.requestInternal.statusText);
      UI.Tooltip.Tooltip.install(cell, this.requestInternal.statusCode + ' ' + this.requestInternal.statusText);
    } else if (this.requestInternal.finished) {
      this.setTextAndTitle(cell, i18nString(UIStrings.finished));
    } else if (this.requestInternal.preserved) {
      this.setTextAndTitle(cell, i18nString(UIStrings.unknown), i18nString(UIStrings.unknownExplanation));
    } else {
      this.setTextAndTitle(cell, i18nString(UIStrings.pendingq));
    }
  }

  private renderProtocolCell(cell: HTMLElement): void {
    UI.UIUtils.createTextChild(cell, this.requestInternal.protocol);

    switch (this.requestInternal.alternateProtocolUsage) {
      case Protocol.Network.AlternateProtocolUsage.AlternativeJobWonWithoutRace: {
        UI.Tooltip.Tooltip.install(cell, UIStrings.alternativeJobWonWithoutRace);
        break;
      }

      case Protocol.Network.AlternateProtocolUsage.AlternativeJobWonRace: {
        UI.Tooltip.Tooltip.install(cell, UIStrings.alternativeJobWonRace);
        break;
      }

      case Protocol.Network.AlternateProtocolUsage.MainJobWonRace: {
        UI.Tooltip.Tooltip.install(cell, UIStrings.mainJobWonRace);
        break;
      }

      case Protocol.Network.AlternateProtocolUsage.MappingMissing: {
        UI.Tooltip.Tooltip.install(cell, UIStrings.mappingMissing);
        break;
      }

      case Protocol.Network.AlternateProtocolUsage.Broken: {
        UI.Tooltip.Tooltip.install(cell, UIStrings.broken);
        break;
      }

      case Protocol.Network.AlternateProtocolUsage.DnsAlpnH3JobWonWithoutRace: {
        UI.Tooltip.Tooltip.install(cell, UIStrings.dnsAlpnH3JobWonWithoutRace);
        break;
      }

      case Protocol.Network.AlternateProtocolUsage.DnsAlpnH3JobWonRace: {
        UI.Tooltip.Tooltip.install(cell, UIStrings.dnsAlpnH3JobWonRace);
        break;
      }

      default: {
        UI.Tooltip.Tooltip.install(cell, this.requestInternal.protocol);
        break;
      }
    }
  }

  private renderInitiatorCell(cell: HTMLElement): void {
    this.initiatorCell = cell;
    const request = this.requestInternal;
    const initiator = Logs.NetworkLog.NetworkLog.instance().initiatorInfoForRequest(request);

    const timing = request.timing;
    if (timing && timing.pushStart) {
      cell.appendChild(document.createTextNode(i18nString(UIStrings.push)));
    }
    switch (initiator.type) {
      case SDK.NetworkRequest.InitiatorType.Parser: {
        const uiSourceCode = Workspace.Workspace.WorkspaceImpl.instance().uiSourceCodeForURL(initiator.url);
        cell.appendChild(
            Components.Linkifier.Linkifier.linkifyURL(initiator.url, ({
                                                        text: uiSourceCode ? uiSourceCode.displayName() : undefined,
                                                        lineNumber: initiator.lineNumber,
                                                        columnNumber: initiator.columnNumber,
                                                      } as Components.Linkifier.LinkifyURLOptions)));
        this.appendSubtitle(cell, i18nString(UIStrings.parser));
        break;
      }

      case SDK.NetworkRequest.InitiatorType.Redirect: {
        UI.Tooltip.Tooltip.install(cell, initiator.url);
        const redirectSource = (request.redirectSource() as SDK.NetworkRequest.NetworkRequest);
        console.assert(redirectSource !== null);
        if (this.parentView().nodeForRequest(redirectSource)) {
          cell.appendChild(Components.Linkifier.Linkifier.linkifyRevealable(
              redirectSource, Bindings.ResourceUtils.displayNameForURL(redirectSource.url())));
        } else {
          cell.appendChild(Components.Linkifier.Linkifier.linkifyURL(redirectSource.url()));
        }
        this.appendSubtitle(cell, i18nString(UIStrings.redirect));
        break;
      }

      case SDK.NetworkRequest.InitiatorType.Script: {
        const target = SDK.NetworkManager.NetworkManager.forRequest(request)?.target() || null;
        const linkifier = this.parentView().linkifier();
        if (initiator.stack) {
          this.linkifiedInitiatorAnchor = linkifier.linkifyStackTraceTopFrame(target, initiator.stack);
        } else {
          this.linkifiedInitiatorAnchor = linkifier.linkifyScriptLocation(
              target, initiator.scriptId, initiator.url, initiator.lineNumber,
              {columnNumber: initiator.columnNumber, inlineFrameIndex: 0});
        }
        UI.Tooltip.Tooltip.install((this.linkifiedInitiatorAnchor), '');
        cell.appendChild(this.linkifiedInitiatorAnchor);
        this.appendSubtitle(cell, i18nString(UIStrings.script));
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
        this.appendSubtitle(cell, i18nString(UIStrings.signedexchange));
        break;
      }

      case SDK.NetworkRequest.InitiatorType.Preflight: {
        cell.appendChild(document.createTextNode(i18nString(UIStrings.preflight)));
        if (initiator.initiatorRequest) {
          const icon = UI.Icon.Icon.create('mediumicon-network-panel');
          const link = Components.Linkifier.Linkifier.linkifyRevealable(
              initiator.initiatorRequest, icon, undefined, i18nString(UIStrings.selectTheRequestThatTriggered),
              'trailing-link-icon');
          UI.ARIAUtils.setAccessibleName(link, i18nString(UIStrings.selectTheRequestThatTriggered));
          cell.appendChild(link);
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

  private renderAddressSpaceCell(cell: HTMLElement, ipAddressSpace: Protocol.Network.IPAddressSpace): void {
    if (ipAddressSpace !== Protocol.Network.IPAddressSpace.Unknown) {
      UI.UIUtils.createTextChild(cell, ipAddressSpace);
    }
  }

  private renderSizeCell(cell: HTMLElement): void {
    const resourceSize = Platform.NumberUtilities.bytesToString(this.requestInternal.resourceSize);

    if (this.requestInternal.cachedInMemory()) {
      UI.UIUtils.createTextChild(cell, i18nString(UIStrings.memoryCache));
      UI.Tooltip.Tooltip.install(cell, i18nString(UIStrings.servedFromMemoryCacheResource, {PH1: resourceSize}));
      cell.classList.add('network-dim-cell');
    } else if (this.requestInternal.fetchedViaServiceWorker) {
      UI.UIUtils.createTextChild(cell, i18nString(UIStrings.serviceworker));
      UI.Tooltip.Tooltip.install(cell, i18nString(UIStrings.servedFromServiceworkerResource, {PH1: resourceSize}));
      cell.classList.add('network-dim-cell');
    } else if (this.requestInternal.redirectSourceSignedExchangeInfoHasNoErrors()) {
      UI.UIUtils.createTextChild(cell, i18n.i18n.lockedString('(signed-exchange)'));
      UI.Tooltip.Tooltip.install(cell, i18nString(UIStrings.servedFromSignedHttpExchange, {PH1: resourceSize}));
      cell.classList.add('network-dim-cell');
    } else if (this.requestInternal.webBundleInnerRequestInfo()) {
      UI.UIUtils.createTextChild(cell, i18nString(UIStrings.webBundle));
      UI.Tooltip.Tooltip.install(cell, i18nString(UIStrings.servedFromWebBundle, {PH1: resourceSize}));
      cell.classList.add('network-dim-cell');
    } else if (this.requestInternal.fromPrefetchCache()) {
      UI.UIUtils.createTextChild(cell, i18nString(UIStrings.prefetchCache));
      UI.Tooltip.Tooltip.install(cell, i18nString(UIStrings.servedFromPrefetchCacheResource, {PH1: resourceSize}));
      cell.classList.add('network-dim-cell');
    } else if (this.requestInternal.cached()) {
      UI.UIUtils.createTextChild(cell, i18nString(UIStrings.diskCache));
      UI.Tooltip.Tooltip.install(cell, i18nString(UIStrings.servedFromDiskCacheResourceSizeS, {PH1: resourceSize}));
      cell.classList.add('network-dim-cell');
    } else {
      const transferSize = Platform.NumberUtilities.bytesToString(this.requestInternal.transferSize);
      UI.UIUtils.createTextChild(cell, transferSize);
      UI.Tooltip.Tooltip.install(cell, `${transferSize} transferred over network, resource size: ${resourceSize}`);
    }
    this.appendSubtitle(cell, resourceSize);
  }

  private renderTimeCell(cell: HTMLElement): void {
    if (this.requestInternal.duration > 0) {
      this.setTextAndTitle(cell, i18n.TimeUtilities.secondsToString(this.requestInternal.duration));
      this.appendSubtitle(
          cell, i18n.TimeUtilities.secondsToString(this.requestInternal.latency), false,
          i18nString(UIStrings.timeSubtitleTooltipText));
    } else if (this.requestInternal.preserved) {
      this.setTextAndTitle(cell, i18nString(UIStrings.unknown), i18nString(UIStrings.unknownExplanation));
    } else {
      cell.classList.add('network-dim-cell');
      this.setTextAndTitle(cell, i18nString(UIStrings.pending));
    }
  }

  private appendSubtitle(
      cellElement: Element, subtitleText: string, showInlineWhenSelected: boolean|undefined = false,
      tooltipText: string|undefined = ''): void {
    const subtitleElement = document.createElement('div');
    subtitleElement.classList.add('network-cell-subtitle');
    if (showInlineWhenSelected) {
      subtitleElement.classList.add('network-cell-subtitle-show-inline-when-selected');
    }
    subtitleElement.textContent = subtitleText;
    if (tooltipText) {
      UI.Tooltip.Tooltip.install(subtitleElement, tooltipText);
    }
    cellElement.appendChild(subtitleElement);
  }
}

export class NetworkGroupNode extends NetworkNode {
  createCells(element: Element): void {
    super.createCells(element);
    const primaryColumn = (this.dataGrid as DataGrid.DataGrid.DataGridImpl<unknown>).visibleColumnsArray[0];
    const localizedTitle = `${primaryColumn.title}`;
    const localizedLevel = i18nString(UIStrings.level);
    this.nodeAccessibleText =
        `${localizedLevel} ${localizedTitle}: ${this.cellAccessibleTextMap.get(primaryColumn.id)}`;
  }

  renderCell(c: Element, columnId: string): void {
    const columnIndex = (this.dataGrid as DataGrid.DataGrid.DataGridImpl<unknown>).indexOfVisibleColumn(columnId);
    if (columnIndex === 0) {
      const cell = (c as HTMLElement);
      const leftPadding = this.leftPadding ? this.leftPadding + 'px' : '';
      cell.style.setProperty('padding-left', leftPadding);
      cell.classList.add('disclosure');
      this.setCellAccessibleName(cell.textContent || '', cell, columnId);
    }
  }

  select(supressSelectedEvent?: boolean): void {
    super.select(supressSelectedEvent);
    const firstChildNode = (this.traverseNextNode(false, undefined, true) as NetworkNode);
    const request = firstChildNode?.request();
    if (request) {
      this.parentView().dispatchEventToListeners(Events.RequestSelected, request);
    }
  }
}
