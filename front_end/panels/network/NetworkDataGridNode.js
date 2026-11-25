// Copyright 2021 The Chromium Authors
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
/* eslint-disable @typescript-eslint/naming-convention */
import '../../ui/components/buttons/buttons.js';
import '../../ui/kit/kit.js';
import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as AiAssistance from '../../models/ai_assistance/ai_assistance.js';
import * as Bindings from '../../models/bindings/bindings.js';
import * as Logs from '../../models/logs/logs.js';
import * as StackTrace from '../../models/stack_trace/stack_trace.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import * as DataGrid from '../../ui/legacy/components/data_grid/data_grid.js';
import * as PerfUI from '../../ui/legacy/components/perf_ui/perf_ui.js';
import * as Components from '../../ui/legacy/components/utils/utils.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, nothing, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { PanelUtils } from '../utils/utils.js';
const { classMap, ifDefined } = Directives;
const UIStrings = {
    /**
     * @description Text in Network Data Grid Node of the Network panel
     */
    redirect: 'Redirect',
    /**
     * @description Content of the request method column in the network log view. Some requests require an additional request to check permissions, and this additional request is called 'Preflight Request', see https://developer.mozilla.org/en-US/docs/Glossary/Preflight_request. In the request method column we use, for example, 'POST + Preflight' to indicate that the request method was 'POST' and the request was accompanied by a preflight request. Since the column is short, the translation for Preflight in this context should ideally also be short.
     * @example {GET} PH1
     */
    sPreflight: '{PH1} + Preflight',
    /**
     * @description Name of a network initiator type
     */
    preflight: 'Preflight',
    /**
     * @description Title for a link element in the network log view
     */
    selectPreflightRequest: 'Select preflight request',
    /**
     * @description Text in Network Data Grid Node of the Network panel
     */
    failed: '(failed)',
    /**
     * @description Text in Network Data Grid Node of the Network panel
     */
    data: '(data)',
    /**
     * @description Text in Network Data Grid Node of the Network panel. Indicates a network request has
     * been canceled.
     */
    canceled: '(canceled)',
    /**
     * @description Reason in Network Data Grid Node of the Network panel
     */
    other: 'other',
    /**
     * @description Reason in Network Data Grid Node of the Network panel
     */
    csp: 'csp',
    /**
     * @description Reason in Network Data Grid Node of the Network panel
     */
    origin: 'origin',
    /**
     * @description Reason why a request was blocked shown in the Network panel
     */
    coepFrameResourceNeedsCoepHeader: 'COEP-framed resource needs COEP header',
    /**
     * @description Reason why a request was blocked shown in the Network panel
     */
    coopSandboxedIframeCannotNavigateToCoopPage: 'Sandboxed iframe’s popup can’t navigate to COOP page',
    /**
     * @description Reason why a request was blocked shown in the Network panel
     */
    corpNotSameOrigin: 'CORP not "same-origin"',
    /**
     * @description Reason why a request was blocked shown in the Network panel
     */
    corpNotSameSite: 'CORP not "same-site"',
    /**
     * @description Reason why a request was blocked shown in the Network panel
     */
    corpNotSameOriginAfterDefaultedToSameOriginByCoep: 'CORP not "same-origin" after defaulted to "same-origin" by COEP',
    /**
     * @description Noun. Shown in a table cell as the reason why a network request failed. "integrity" here refers to the integrity of the network request itself in a cryptographic sense: signature verification might have failed, for instance.
     */
    integrity: 'integrity',
    /**
     * @description Reason in Network Data Grid Node of the Network panel
     */
    devtools: 'devtools',
    /**
     * @description Text in Network Data Grid Node of the Network panel
     * @example {mixed-content} PH1
     */
    blockeds: '(blocked:{PH1})',
    /**
     * @description Text in Network Data Grid Node of the Network panel
     */
    blockedTooltip: 'This request was blocked due to misconfigured response headers, click to view the headers',
    /**
     * @description Text in Network Data Grid Node of the Network panel
     */
    corsError: 'CORS error',
    /**
     * @description Tooltip providing the cors error code
     * @example {PreflightDisallowedRedirect} PH1
     */
    crossoriginResourceSharingErrorS: 'Cross-Origin Resource Sharing error: {PH1}',
    /**
     * @description Text in Network Data Grid Node of the Network panel
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
    unknownExplanation: 'The request status can’t be shown here because the page that issued it unloaded while the request was in flight. You can use chrome://net-export to capture a network log and see all request details.',
    /**
     * @description Text in Network Data Grid Node of the Network panel. Noun, short for a 'HTTP server
     * push'.
     */
    push: 'Push / ',
    /**
     * @description Text in Network Data Grid Node of the Network panel
     */
    parser: 'Parser',
    /**
     * @description Label for a group of JavaScript files
     */
    script: 'Script',
    /**
     * @description Cell title in Network Data Grid Node of the Network panel
     */
    preload: 'Preload',
    /**
     * @description Cell title in Network Data Grid Node of the Network panel
     */
    earlyHints: 'Early-hints',
    /**
     * @description Text in Network Data Grid Node of the Network panel
     */
    signedexchange: 'signed-exchange',
    /**
     * @description Title for a link element in the network log view
     */
    selectTheRequestThatTriggered: 'Select the request that triggered this preflight',
    /**
     * @description Text for other types of items
     */
    otherC: 'Other',
    /**
     * @description Text of a DOM element in Network Data Grid Node of the Network panel
     */
    memoryCache: '(memory cache)',
    /**
     * @description Cell title in Network Data Grid Node of the Network panel. Indicates that the response came from memory cache.
     * @example {50 B} PH1
     */
    servedFromMemoryCacheResource: 'Served from memory cache, resource size: {PH1}',
    /**
     * @description Text of a DOM element in Network Data Grid Node of the Network panel
     */
    serviceWorker: '(`ServiceWorker`)',
    /**
     * @description Cell title in Network Data Grid Node of the Network panel
     * @example {4 B} PH1
     * @example {10 B} PH2
     */
    servedFromNetwork: '{PH1} transferred over network, resource size: {PH2}',
    /**
     * @description Cell title in Network Data Grid Node of the Network panel
     * @example {Fast 4G} PH1
     */
    wasThrottled: 'Request was throttled ({PH1})',
    /**
     * @description Cell title in Network Data Grid Node of the Network panel
     * @example {4 B} PH1
     * @example {10 B} PH2
     */
    servedFromNetworkMissingServiceWorkerRoute: '{PH1} transferred over network, resource size: {PH2}, no matching ServiceWorker routes',
    /**
     * @description Cell title in Network Data Grid Node of the Network panel
     * @example {4 B} PH1
     */
    servedFromServiceWorkerResource: 'Served from `ServiceWorker`, resource size: {PH1}',
    /**
     * @description Cell title in Network Data Grid Node of the Network panel
     * @example {4 B} PH1
     */
    servedFromSignedHttpExchange: 'Served from Signed HTTP Exchange, resource size: {PH1}',
    /**
     * @description Text of a DOM element in Network Data Grid Node of the Network panel
     */
    prefetchCache: '(prefetch cache)',
    /**
     * @description Cell title in Network Data Grid Node of the Network panel
     * @example {4 B} PH1
     */
    servedFromPrefetchCacheResource: 'Served from prefetch cache, resource size: {PH1}',
    /**
     * @description Text of a DOM element in Network Data Grid Node of the Network panel
     */
    diskCache: '(disk cache)',
    /**
     * @description Cell title in Network Data Grid Node of the Network panel
     * @example {10 B} PH1
     */
    servedFromDiskCacheResourceSizeS: 'Served from disk cache, resource size: {PH1}',
    /**
     * @description Cell title in Network Data Grid Node of the Network panel
     * @example {1} PH1
     * @example {4 B} PH2
     */
    matchedToServiceWorkerRouter: 'Matched to `ServiceWorker router`#{PH1}, resource size: {PH2}',
    /**
     * @description Cell title in Network Data Grid Node of the Network panel
     * @example {1} PH1
     * @example {4 B} PH2
     * @example {12 B} PH3
     */
    matchedToServiceWorkerRouterWithNetworkSource: 'Matched to `ServiceWorker router`#{PH1}, {PH2} transferred over network, resource size: {PH3}',
    /**
     * @description Text in Network Data Grid Node of the Network panel
     */
    pending: 'Pending',
    /**
     * @description Text describing the depth of a top level node in the network datagrid
     */
    level: 'level 1',
    /**
     * @description Tooltip text for subtitles of Time cells in Network request rows. Latency is the time difference
     * between the time a response to a network request is received and the time the request is started.
     */
    timeSubtitleTooltipText: 'Latency (response received time - start time)',
    /**
     * @description Tooltip text in the protocol column of the Network log table explaining that Chrome connected over HTTP/3 based on an Alt-Svc header without racing other HTTP versions.
     */
    alternativeJobWonWithoutRace: '`Chrome` used `HTTP/3` (advertised by the \'`Alt-Svc`\' header) without racing other `HTTP` versions',
    /**
     * @description Tooltip text in the protocol column of the Network log table explaining that Chrome connected over HTTP/3 based on an Alt-Svc header because it won the connection race against other HTTP versions.
     */
    alternativeJobWonRace: '`Chrome` used `HTTP/3` (advertised by the \'`Alt-Svc`\' header) because it won the connection race against other `HTTP` versions',
    /**
     * @description Tooltip text in the protocol column of the Network log table explaining that Chrome used this protocol because it won the connection race against HTTP/3.
     */
    mainJobWonRace: '`Chrome` used this protocol because it won the connection race against `HTTP/3`',
    /**
     * @description Tooltip text in the protocol column of the Network log table explaining that no alternative protocol was cached when the request was sent, but an Alt-Svc header was received in the response.
     */
    mappingMissing: '`Chrome` didn’t use an alternative `HTTP` version because none was cached when the request was sent, but an \'`Alt-Svc`\' header was received in the response',
    /**
     * @description Tooltip text in the protocol column of the Network log table explaining that Chrome did not attempt HTTP/3 because HTTP/3 was marked as broken for this host.
     */
    broken: '`Chrome` didn’t attempt an `HTTP/3` connection because `HTTP/3` is marked as broken for this host',
    /**
     * @description Tooltip text in the protocol column of the Network log table explaining that Chrome connected over HTTP/3 based on the DNS record without racing other HTTP versions.
     */
    dnsAlpnH3JobWonWithoutRace: '`Chrome` used `HTTP/3` (advertised by the `DNS record`) without racing other `HTTP` versions',
    /**
     * @description Tooltip text in the protocol column of the Network log table explaining that Chrome connected over HTTP/3 based on the DNS record because it won the connection race against other HTTP versions.
     */
    dnsAlpnH3JobWonRace: '`Chrome` used `HTTP/3` (advertised by the `DNS record`) because it won the connection race against other `HTTP` versions',
    /**
     * @description Tooltip to explain the resource's initial priority
     * @example {High} PH1
     * @example {Low} PH2
     */
    initialPriorityToolTip: '{PH1}, Initial priority: {PH2}',
    /**
     * @description Text in Network Data Grid Node of the Network panel. Noun. Refers to a render-blocking resource.
     */
    blocking: 'Blocking',
    /**
     * @description Text in Network Data Grid Node of the Network panel. Noun. Refers to a resource that blocks the parser from starting to parse the document.
     */
    inBodyParserBlocking: 'In-body parser blocking',
    /**
     * @description Text in Network Data Grid Node of the Network panel. Noun. Refers to a non-blocking resource.
     */
    nonBlocking: 'Non-blocking',
    /**
     * @description Text in Network Data Grid Node of the Network panel. Noun. Refers to a non-blocking resource.
     */
    nonBlockingDynamic: 'Non-blocking dynamic',
    /**
     * @description Text in Network Data Grid Node of the Network panel. Noun. Refers to a potentially blocking resource.
     */
    potentiallyBlocking: 'Potentially blocking',
    /**
     * @description Text indicating a request originated from the DevTools console. Used as a subtitle in the
     * Initiator column.
     */
    console: 'Console',
    /**
     * @description Tooltip for the console icon in the Network panel, indicating a request was initiated
     * from the Console.
     */
    requestOriginatedFromConsole: 'Request originated from Console',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/NetworkDataGridNode.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export var Events;
(function (Events) {
    // RequestSelected might fire twice for the same "activation"
    Events["RequestSelected"] = "RequestSelected";
    Events["RequestActivated"] = "RequestActivated";
})(Events || (Events = {}));
export var RequestPanelBehavior;
(function (RequestPanelBehavior) {
    RequestPanelBehavior["ShowPanel"] = "ShowPanel";
    RequestPanelBehavior["HidePanel"] = "HidePanel";
    RequestPanelBehavior["Unchanged"] = "Unchanged";
})(RequestPanelBehavior || (RequestPanelBehavior = {}));
export class NetworkNode extends DataGrid.SortableDataGrid.SortableDataGridNode {
    #parentViewInternal;
    #isHovered;
    #showingInitiatorChainInternal;
    #requestOrFirstKnownChildRequestInternal;
    constructor(parentView) {
        super({});
        this.#parentViewInternal = parentView;
        this.#isHovered = false;
        this.#showingInitiatorChainInternal = false;
        this.#requestOrFirstKnownChildRequestInternal = null;
    }
    displayName() {
        return '';
    }
    displayType() {
        return '';
    }
    createCell(columnId) {
        const cell = this.createTD(columnId);
        this.renderCell(cell, columnId);
        return cell;
    }
    renderCell(_cell, _columnId) {
    }
    isError() {
        return false;
    }
    isWarning() {
        return false;
    }
    backgroundColor() {
        const bgColors = _backgroundColors;
        const hasFocus = document.hasFocus();
        const isSelected = this.dataGrid && this.dataGrid.element === document.activeElement;
        const isWarning = this.isWarning();
        const isError = this.isError();
        if (this.selected && hasFocus && isSelected && isError) {
            return bgColors.FocusSelectedHasError;
        }
        if (this.selected && hasFocus && isSelected && isWarning) {
            return bgColors.FocusSelectedHasWarning;
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
        const element = (this.existingElement());
        if (!element) {
            return;
        }
        element.style.backgroundColor = `var(${this.backgroundColor()})`;
        this.#parentViewInternal.stylesChanged();
    }
    setStriped(isStriped) {
        super.setStriped(isStriped);
        this.updateBackgroundColor();
    }
    select(suppressSelectedEvent) {
        super.select(suppressSelectedEvent);
        this.updateBackgroundColor();
        this.#parentViewInternal.updateNodeSelectedClass(/* isSelected */ true);
    }
    deselect(suppressSelectedEvent) {
        super.deselect(suppressSelectedEvent);
        this.updateBackgroundColor();
        this.#parentViewInternal.updateNodeSelectedClass(/* isSelected */ false);
    }
    parentView() {
        return this.#parentViewInternal;
    }
    hovered() {
        return this.#isHovered;
    }
    showingInitiatorChain() {
        return this.#showingInitiatorChainInternal;
    }
    nodeSelfHeight() {
        return this.#parentViewInternal.rowHeight();
    }
    setHovered(hovered, showInitiatorChain) {
        if (this.#isHovered === hovered && this.#showingInitiatorChainInternal === showInitiatorChain) {
            return;
        }
        if (this.#isHovered !== hovered) {
            this.#isHovered = hovered;
            if (this.attached()) {
                this.element().classList.toggle('hover', hovered);
            }
        }
        if (this.#showingInitiatorChainInternal !== showInitiatorChain) {
            this.#showingInitiatorChainInternal = showInitiatorChain;
            this.showingInitiatorChainChanged();
        }
        this.#parentViewInternal.stylesChanged();
        this.updateBackgroundColor();
    }
    showingInitiatorChainChanged() {
    }
    isOnInitiatorPath() {
        return false;
    }
    isOnInitiatedPath() {
        return false;
    }
    request() {
        return null;
    }
    isNavigationRequest() {
        return false;
    }
    clearFlatNodes() {
        super.clearFlatNodes();
        this.#requestOrFirstKnownChildRequestInternal = null;
    }
    requestOrFirstKnownChildRequest() {
        if (this.#requestOrFirstKnownChildRequestInternal) {
            return this.#requestOrFirstKnownChildRequestInternal;
        }
        let request = this.request();
        if (request || !this.hasChildren()) {
            this.#requestOrFirstKnownChildRequestInternal = request;
            return this.#requestOrFirstKnownChildRequestInternal;
        }
        let firstChildRequest = null;
        const flatChildren = this.flatChildren();
        for (let i = 0; i < flatChildren.length; i++) {
            request = flatChildren[i].request();
            if (!firstChildRequest || (request && request.issueTime() < firstChildRequest.issueTime())) {
                firstChildRequest = request;
            }
        }
        this.#requestOrFirstKnownChildRequestInternal = firstChildRequest;
        return this.#requestOrFirstKnownChildRequestInternal;
    }
}
export const _backgroundColors = {
    Default: '--color-grid-default',
    Stripe: '--color-grid-stripe',
    Navigation: '--network-grid-navigation-color',
    Hovered: '--color-grid-hovered',
    InitiatorPath: '--network-grid-initiator-path-color',
    InitiatedPath: '--network-grid-initiated-path-color',
    Selected: '--color-grid-selected',
    FocusSelected: '--color-grid-focus-selected',
    FocusSelectedHasError: '--network-grid-focus-selected-color-has-error',
    FocusSelectedHasWarning: '--network-grid-focus-selected-color-has-warning',
    FromFrame: '--network-grid-from-frame-color',
};
// name/path/url are the primary cells that own the request icon, the Ask AI
// button and the row click handlers. The first visible one is decorated, which
// is not necessarily visible index 0 (the pinned request-number column can come
// first).
const PRIMARY_COLUMNS = new Set(['name', 'path', 'url']);
function firstPrimaryColumn(dataGrid) {
    return dataGrid?.visibleColumnsArray.find(column => PRIMARY_COLUMNS.has(column.id));
}
function isFirstPrimaryColumn(dataGrid, columnId) {
    const firstPrimary = firstPrimaryColumn(dataGrid);
    // When the node is not attached to a grid yet there are no visible columns to
    // inspect, so fall back to treating any primary column as the first one.
    if (!firstPrimary) {
        return PRIMARY_COLUMNS.has(columnId);
    }
    return firstPrimary.id === columnId;
}
// Prevents that a click on the AI button opens the request of the row.
const stopPropagationInCapture = {
    handleEvent: (event) => event.stopPropagation(),
    capture: true,
};
function renderCellLink(link) {
    switch (link.kind) {
        case 'url':
            return Components.Linkifier.Linkifier.renderLinkifiedUrl(link.url, link.options);
        case 'reveal': {
            const onClick = (event) => {
                event.consume(true);
                link.onClick();
            };
            // The data grid activates the selected row on Enter and Space. Consume these keys to reveal the linked request.
            const onKeyDown = (event) => {
                if (Platform.KeyboardUtilities.isEnterOrSpaceKey(event)) {
                    onClick(event);
                }
            };
            const classes = `devtools-link text-button link-style ${link.className ?? ''}`;
            // clang-format off
            return html `
        <button class=${classes} tabindex="-1" role="link" title=${ifDefined(link.title)}
                aria-label=${ifDefined(link.iconName ? link.title : undefined)}
                jslog=${VisualLogging.link(link.jslogContext).track({ click: true })}
                @click=${onClick} @keydown=${onKeyDown}>${link.iconName ?
                html `<devtools-icon name=${link.iconName}></devtools-icon>` : link.text}</button>`;
            // clang-format on
        }
        case 'script-location':
            // The linkifier owns the element, because it updates the link text when the live location changes.
            return html `${link.stackTrace ? link.linkifier.linkifyStackTraceTopFrame(link.target, link.stackTrace) :
                link.linkifier.linkifyScriptLocation(link.target, link.scriptId, link.url, link.lineNumber, { columnNumber: link.columnNumber })}`;
    }
}
const CELL_VIEW = (input, _output, target) => {
    const primary = input.primary;
    const onAiButtonClick = {
        handleEvent: (event) => {
            event.stopPropagation();
            primary?.onAiButtonClick();
        },
        capture: true,
    };
    const classes = [];
    if (input.dimmed) {
        classes.push('network-dim-cell');
    }
    if (input.scriptInitiated) {
        classes.push('network-script-initiated');
    }
    if (input.disclosure) {
        classes.push('disclosure');
    }
    const attributes = { title: input.title };
    if (primary) {
        attributes.tabindex = '-1';
    }
    const leftPadding = (primary ?? input.disclosure)?.leftPadding;
    if (leftPadding !== undefined) {
        attributes.style = leftPadding ? `padding-left: ${leftPadding}px` : undefined;
    }
    // clang-format off
    render(html `
    ${primary?.icon ?? nothing}
    ${primary?.isConsoleOriginated ? html `
      <devtools-icon name="terminal" class="network-console-icon"
                     title=${i18nString(UIStrings.requestOriginatedFromConsole)}></devtools-icon>` : nothing}
    ${primary?.aiButton ? html `
      <span class="ai-button-container">
        <devtools-floating-button icon-name=${primary.aiButton.iconName} title=${primary.aiButton.title}
                                  jslogcontext="ask-ai"
                                  @click=${onAiButtonClick}
                                  @dblclick=${stopPropagationInCapture}
                                  @mousedown=${stopPropagationInCapture}></devtools-floating-button>
      </span>` : nothing}
    ${input.throttling ? html `
      <devtools-icon name="watch" title=${input.throttling.title}
                     @click=${input.throttling.onClick}></devtools-icon>` : nothing}
    ${input.onLinkClick ? html `
      <button class="devtools-link text-button link-style" tabindex="-1"
              jslog=${VisualLogging.link(input.linkJslogContext).track({ click: true })}
              @click=${input.onLinkClick}>${input.text}</button>` : input.text}
    ${input.link ? renderCellLink(input.link) : nothing}
    ${input.subtitle !== undefined ? html `
      <div class=${classMap({ 'network-cell-subtitle': true, 'always-visible': Boolean(input.subtitleAlwaysVisible) })}
           title=${ifDefined(input.subtitleTitle)}>${input.subtitle}</div>` : nothing}`, target, {
        container: {
            classes,
            attributes,
            listeners: primary ? {
                dblclick: () => primary.onDoubleClick(),
                mousedown: event => primary.onMouseDown(event.button),
                focus: () => primary.onFocus(),
            } : undefined,
        },
    });
    // clang-format on
};
export class NetworkRequestNode extends NetworkNode {
    #requestInternal;
    #isNavigationRequestInternal;
    selectable;
    #isOnInitiatorPathInternal;
    #isOnInitiatedPathInternal;
    static #requestNumberByRequest = new WeakMap();
    constructor(parentView, request) {
        super(parentView);
        this.#requestInternal = request;
        this.#isNavigationRequestInternal = false;
        this.selectable = true;
        this.#isOnInitiatorPathInternal = false;
        this.#isOnInitiatedPathInternal = false;
    }
    static #requestNumber(request) {
        const cachedRequestNumber = NetworkRequestNode.#requestNumberByRequest.get(request);
        if (cachedRequestNumber !== undefined) {
            return cachedRequestNumber;
        }
        const requestNumber = Logs.NetworkLog.NetworkLog.instance().requests().indexOf(request) + 1;
        if (requestNumber > 0) {
            NetworkRequestNode.#requestNumberByRequest.set(request, requestNumber);
            return requestNumber;
        }
        return 0;
    }
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
    static RemoteAddressComparator(a, b) {
        // TODO(allada) Handle this properly for group nodes.
        const aRequest = a.requestOrFirstKnownChildRequest();
        const bRequest = b.requestOrFirstKnownChildRequest();
        if (!aRequest || !bRequest) {
            return !aRequest ? !bRequest ? 0 : -1 : 1;
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
    static SizeComparator(a, b) {
        // TODO(allada) Handle this properly for group nodes.
        const aRequest = a.requestOrFirstKnownChildRequest();
        const bRequest = b.requestOrFirstKnownChildRequest();
        if (!aRequest || !bRequest) {
            return !aRequest ? !bRequest ? 0 : -1 : 1;
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
    static RequestNumberComparator(a, b) {
        const aRequest = a.requestOrFirstKnownChildRequest();
        const bRequest = b.requestOrFirstKnownChildRequest();
        if (!aRequest || !bRequest) {
            return !aRequest ? !bRequest ? 0 : -1 : 1;
        }
        const aRequestNumber = NetworkRequestNode.#requestNumber(aRequest);
        const bRequestNumber = NetworkRequestNode.#requestNumber(bRequest);
        return (aRequestNumber - bRequestNumber) || aRequest.identityCompare(bRequest);
    }
    static TypeComparator(a, b) {
        // TODO(allada) Handle this properly for group nodes.
        const aRequest = a.requestOrFirstKnownChildRequest();
        const bRequest = b.requestOrFirstKnownChildRequest();
        if (!aRequest || !bRequest) {
            return !aRequest ? !bRequest ? 0 : -1 : 1;
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
    static InitiatorComparator(a, b) {
        // TODO(allada) Handle this properly for group nodes.
        const aRequest = a.requestOrFirstKnownChildRequest();
        const bRequest = b.requestOrFirstKnownChildRequest();
        if (!aRequest || !bRequest) {
            return !aRequest ? !bRequest ? 0 : -1 : 1;
        }
        return NetworkRequestNode.#initiatorSortKey(aRequest).localeCompare(NetworkRequestNode.#initiatorSortKey(bRequest));
    }
    /**
     * Returns the text that the initiator column sorts by. The text comes from
     * the initiator data, so that the sort order does not depend on rendered cells.
     */
    static #initiatorSortKey(request) {
        const initiator = Logs.NetworkLog.NetworkLog.instance().initiatorInfoForRequest(request);
        switch (initiator.type) {
            case "script" /* SDK.NetworkRequest.InitiatorType.SCRIPT */: {
                const name = Bindings.ResourceUtils.displayNameForURL(initiator.url);
                return initiator.lineNumber === undefined ? name : `${name}:${initiator.lineNumber + 1}`;
            }
            case "redirect" /* SDK.NetworkRequest.InitiatorType.REDIRECT */:
                return initiator.url;
            case "preload" /* SDK.NetworkRequest.InitiatorType.PRELOAD */:
                return i18nString(UIStrings.preload);
            case "parser" /* SDK.NetworkRequest.InitiatorType.PARSER */:
            case "signedExchange" /* SDK.NetworkRequest.InitiatorType.SIGNED_EXCHANGE */:
            case "preflight" /* SDK.NetworkRequest.InitiatorType.PREFLIGHT */:
                return '';
            default:
                return request.fromEarlyHints() ? i18nString(UIStrings.earlyHints) : i18nString(UIStrings.otherC);
        }
    }
    static InitiatorAddressSpaceComparator(a, b) {
        const aRequest = a.requestOrFirstKnownChildRequest();
        const bRequest = b.requestOrFirstKnownChildRequest();
        if (!aRequest || !bRequest) {
            return !aRequest ? !bRequest ? 0 : -1 : 1;
        }
        const aClientSecurityState = aRequest.clientSecurityState();
        const bClientSecurityState = bRequest.clientSecurityState();
        if (!aClientSecurityState || !bClientSecurityState) {
            return !aClientSecurityState ? -1 : 1;
        }
        return aClientSecurityState.initiatorIPAddressSpace.localeCompare(bClientSecurityState.initiatorIPAddressSpace);
    }
    static RemoteAddressSpaceComparator(a, b) {
        const aRequest = a.requestOrFirstKnownChildRequest();
        const bRequest = b.requestOrFirstKnownChildRequest();
        if (!aRequest || !bRequest) {
            return !aRequest ? !bRequest ? 0 : -1 : 1;
        }
        return aRequest.remoteAddressSpace().localeCompare(bRequest.remoteAddressSpace());
    }
    static RequestCookiesCountComparator(a, b) {
        // TODO(allada) Handle this properly for group nodes.
        const aRequest = a.requestOrFirstKnownChildRequest();
        const bRequest = b.requestOrFirstKnownChildRequest();
        if (!aRequest || !bRequest) {
            return !aRequest ? !bRequest ? 0 : -1 : 1;
        }
        const aScore = aRequest.includedRequestCookies().length;
        const bScore = bRequest.includedRequestCookies().length;
        return (aScore - bScore) || aRequest.identityCompare(bRequest);
    }
    // TODO(allada) This function deserves to be in a network-common of some sort.
    static ResponseCookiesCountComparator(a, b) {
        // TODO(allada) Handle this properly for group nodes.
        const aRequest = a.requestOrFirstKnownChildRequest();
        const bRequest = b.requestOrFirstKnownChildRequest();
        if (!aRequest || !bRequest) {
            return !aRequest ? !bRequest ? 0 : -1 : 1;
        }
        const aScore = aRequest.responseCookies ? aRequest.responseCookies.length : 0;
        const bScore = bRequest.responseCookies ? bRequest.responseCookies.length : 0;
        return (aScore - bScore) || aRequest.identityCompare(bRequest);
    }
    static PriorityComparator(a, b) {
        // TODO(allada) Handle this properly for group nodes.
        const aRequest = a.requestOrFirstKnownChildRequest();
        const bRequest = b.requestOrFirstKnownChildRequest();
        if (!aRequest || !bRequest) {
            return !aRequest ? !bRequest ? 0 : -1 : 1;
        }
        const aPriority = aRequest.priority();
        let aScore = aPriority ? PerfUI.NetworkPriorities.networkPriorityWeight(aPriority) : 0;
        aScore = aScore || 0;
        const bPriority = bRequest.priority();
        let bScore = bPriority ? PerfUI.NetworkPriorities.networkPriorityWeight(bPriority) : 0;
        bScore = bScore || 0;
        return aScore - bScore || aRequest.identityCompare(bRequest);
    }
    static IsAdRelatedComparator(a, b) {
        // TODO(allada) Handle this properly for group nodes.
        const aRequest = a.requestOrFirstKnownChildRequest();
        const bRequest = b.requestOrFirstKnownChildRequest();
        if (!aRequest || !bRequest) {
            return !aRequest ? !bRequest ? 0 : -1 : 1;
        }
        const aIsAdRelated = aRequest.isAdRelated();
        const bIsAdRelated = bRequest.isAdRelated();
        if (aIsAdRelated > bIsAdRelated) {
            return 1;
        }
        if (bIsAdRelated > aIsAdRelated) {
            return -1;
        }
        return aRequest.identityCompare(bRequest);
    }
    static IsPreloadedComparator(a, b) {
        const aRequest = a.requestOrFirstKnownChildRequest();
        const bRequest = b.requestOrFirstKnownChildRequest();
        if (!aRequest && !bRequest) {
            return 0;
        }
        if (!aRequest || !bRequest) {
            return !aRequest ? -1 : 1;
        }
        const aIsPreloaded = aRequest.isLinkPreload();
        const bIsPreloaded = bRequest.isLinkPreload();
        if (aIsPreloaded === bIsPreloaded) {
            return aRequest.identityCompare(bRequest);
        }
        return aIsPreloaded ? 1 : -1;
    }
    static RenderBlockingComparator(a, b) {
        const aRequest = a.requestOrFirstKnownChildRequest();
        const bRequest = b.requestOrFirstKnownChildRequest();
        if (!aRequest || !bRequest) {
            return !aRequest ? !bRequest ? 0 : -1 : 1;
        }
        const order = [
            "InBodyParserBlocking" /* Protocol.Network.RenderBlockingBehavior.InBodyParserBlocking */,
            "Blocking" /* Protocol.Network.RenderBlockingBehavior.Blocking */,
            "PotentiallyBlocking" /* Protocol.Network.RenderBlockingBehavior.PotentiallyBlocking */,
            "NonBlocking" /* Protocol.Network.RenderBlockingBehavior.NonBlocking */,
            "NonBlockingDynamic" /* Protocol.Network.RenderBlockingBehavior.NonBlockingDynamic */,
            undefined,
        ];
        const aOrder = order.indexOf(aRequest.renderBlockingBehavior());
        const bOrder = order.indexOf(bRequest.renderBlockingBehavior());
        return aOrder - bOrder;
    }
    static ExecutionContextComparator(a, b) {
        const aRequest = a.requestOrFirstKnownChildRequest();
        const bRequest = b.requestOrFirstKnownChildRequest();
        if (!aRequest || !bRequest) {
            return !aRequest ? !bRequest ? 0 : -1 : 1;
        }
        const aContext = NetworkRequestNode.getExecutionContextDescription(aRequest);
        const bContext = NetworkRequestNode.getExecutionContextDescription(bRequest);
        return aContext.localeCompare(bContext);
    }
    static getExecutionContextDescription(request) {
        const requestTarget = SDK.NetworkManager.NetworkManager.forRequest(request)?.target();
        if (requestTarget) {
            const targetType = requestTarget.type();
            if (targetType === SDK.Target.Type.ServiceWorker || targetType === SDK.Target.Type.Worker ||
                targetType === SDK.Target.Type.SHARED_WORKER) {
                const runtimeModel = requestTarget.model(SDK.RuntimeModel.RuntimeModel);
                if (runtimeModel) {
                    const defaultContextLabel = runtimeModel.executionContexts().find(c => c.isDefault)?.label();
                    if (defaultContextLabel) {
                        return defaultContextLabel;
                    }
                }
                return requestTarget.name() || '';
            }
        }
        const frame = SDK.ResourceTreeModel.ResourceTreeModel.frameForRequest(request);
        if (!frame) {
            return '';
        }
        if (requestTarget) {
            const runtimeModel = requestTarget.model(SDK.RuntimeModel.RuntimeModel);
            if (runtimeModel) {
                const frameContextLabel = runtimeModel.executionContexts()
                    .find(context => context.frameId === request.frameId && context.isDefault)
                    ?.label();
                if (frameContextLabel) {
                    return frameContextLabel;
                }
            }
        }
        return frame.displayName();
    }
    static RequestPropertyComparator(propertyName, a, b) {
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const aRequest = a.requestOrFirstKnownChildRequest();
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration)
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const bRequest = b.requestOrFirstKnownChildRequest();
        if (!aRequest || !bRequest) {
            return !aRequest ? !bRequest ? 0 : -1 : 1;
        }
        const aValue = aRequest[propertyName];
        const bValue = bRequest[propertyName];
        if (aValue === bValue) {
            return aRequest.identityCompare(bRequest);
        }
        return aValue > bValue ? 1 : -1;
    }
    static RequestURLComparator(a, b) {
        const aRequest = a.requestOrFirstKnownChildRequest();
        const bRequest = b.requestOrFirstKnownChildRequest();
        if (!aRequest || !bRequest) {
            return !aRequest ? !bRequest ? 0 : -1 : 1;
        }
        const aURL = aRequest.url();
        const bURL = bRequest.url();
        if (aURL === bURL) {
            return aRequest.identityCompare(bRequest);
        }
        return aURL > bURL ? 1 : -1;
    }
    static HeaderStringComparator(getHeaderValue, propertyName, a, b) {
        const aRequest = a.requestOrFirstKnownChildRequest();
        const bRequest = b.requestOrFirstKnownChildRequest();
        if (!aRequest || !bRequest) {
            return !aRequest ? !bRequest ? 0 : -1 : 1;
        }
        // Use the provided callback to get the header value
        const aValue = String(getHeaderValue(aRequest, propertyName) || '');
        const bValue = String(getHeaderValue(bRequest, propertyName) || '');
        return aValue.localeCompare(bValue) || aRequest.identityCompare(bRequest);
    }
    static ResponseHeaderStringComparator = NetworkRequestNode.HeaderStringComparator.bind(null, (req, name) => req.responseHeaderValue(name));
    static RequestHeaderStringComparator = NetworkRequestNode.HeaderStringComparator.bind(null, (req, name) => req.requestHeaderValue(name));
    static ResponseHeaderNumberComparator(propertyName, a, b) {
        // TODO(allada) Handle this properly for group nodes.
        const aRequest = a.requestOrFirstKnownChildRequest();
        const bRequest = b.requestOrFirstKnownChildRequest();
        if (!aRequest || !bRequest) {
            return !aRequest ? !bRequest ? 0 : -1 : 1;
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
    static ResponseHeaderDateComparator(propertyName, a, b) {
        // TODO(allada) Handle this properly for group nodes.
        const aRequest = a.requestOrFirstKnownChildRequest();
        const bRequest = b.requestOrFirstKnownChildRequest();
        if (!aRequest || !bRequest) {
            return !aRequest ? !bRequest ? 0 : -1 : 1;
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
    static OverrideTypesComparator(a, b) {
        const aRequest = a.requestOrFirstKnownChildRequest();
        const bRequest = b.requestOrFirstKnownChildRequest();
        if (!aRequest || !bRequest) {
            return !aRequest ? !bRequest ? 0 : -1 : 1;
        }
        const aValue = aRequest.overrideTypes.join(', ');
        const bValue = bRequest.overrideTypes.join(', ');
        return aValue.localeCompare(bValue) || aRequest.identityCompare(bRequest);
    }
    static isConsoleOriginated(request) {
        const resourceType = request.resourceType();
        if (resourceType !== Common.ResourceType.resourceTypes.Fetch &&
            resourceType !== Common.ResourceType.resourceTypes.XHR) {
            return false;
        }
        const initiator = request.initiator();
        if (!initiator || initiator.type !== "script" /* Protocol.Network.InitiatorType.Script */) {
            return false;
        }
        if (initiator.url) {
            return false;
        }
        if (!initiator.stack) {
            return false;
        }
        return StackTrace.StackTrace.isConsoleOriginated(initiator.stack);
    }
    #isConsoleOriginated() {
        return NetworkRequestNode.isConsoleOriginated(this.#requestInternal);
    }
    showingInitiatorChainChanged() {
        const showInitiatorChain = this.showingInitiatorChain();
        const initiatorGraph = Logs.NetworkLog.NetworkLog.instance().initiatorGraphForRequest(this.#requestInternal);
        for (const request of initiatorGraph.initiators) {
            if (request === this.#requestInternal) {
                continue;
            }
            const node = this.parentView().nodeForRequest(request);
            if (!node) {
                continue;
            }
            node.#setIsOnInitiatorPath(showInitiatorChain);
        }
        for (const request of initiatorGraph.initiated.keys()) {
            if (request === this.#requestInternal) {
                continue;
            }
            const node = this.parentView().nodeForRequest(request);
            if (!node) {
                continue;
            }
            node.#setIsOnInitiatedPath(showInitiatorChain);
        }
    }
    #setIsOnInitiatorPath(isOnInitiatorPath) {
        if (this.#isOnInitiatorPathInternal === isOnInitiatorPath || !this.attached()) {
            return;
        }
        this.#isOnInitiatorPathInternal = isOnInitiatorPath;
        this.updateBackgroundColor();
    }
    isOnInitiatorPath() {
        return this.#isOnInitiatorPathInternal;
    }
    #setIsOnInitiatedPath(isOnInitiatedPath) {
        if (this.#isOnInitiatedPathInternal === isOnInitiatedPath || !this.attached()) {
            return;
        }
        this.#isOnInitiatedPathInternal = isOnInitiatedPath;
        this.updateBackgroundColor();
    }
    isOnInitiatedPath() {
        return this.#isOnInitiatedPathInternal;
    }
    displayType() {
        const mimeType = this.#requestInternal.mimeType || this.#requestInternal.requestContentType() || '';
        const resourceType = this.#requestInternal.resourceType();
        let simpleType = resourceType.name();
        if (resourceType === Common.ResourceType.resourceTypes.Other ||
            resourceType === Common.ResourceType.resourceTypes.Image) {
            simpleType = mimeType.replace(/^(application|image)\//, '');
        }
        if (this.#requestInternal.isRedirect()) {
            simpleType += ' / ' + i18nString(UIStrings.redirect);
        }
        return simpleType;
    }
    displayName() {
        return this.#requestInternal.name();
    }
    request() {
        return this.#requestInternal;
    }
    isNavigationRequest() {
        const pageLoad = SDK.PageLoad.PageLoad.forRequest(this.#requestInternal);
        return pageLoad ? pageLoad.mainRequest === this.#requestInternal : false;
    }
    nodeSelfHeight() {
        return this.parentView().rowHeight();
    }
    #isPrefetch() {
        return this.#requestInternal.resourceType() === Common.ResourceType.resourceTypes.Prefetch;
    }
    #isPreload() {
        return this.#requestInternal.isPreloadRequest();
    }
    throttlingConditions() {
        return SDK.NetworkManager.MultitargetNetworkManager.instance().appliedRequestConditions(this.#requestInternal);
    }
    isWarning() {
        return this.#isFailed() && (this.#isPrefetch() || this.#isPreload());
    }
    isError() {
        return this.#isFailed() && !this.#isPrefetch() && !this.#isPreload();
    }
    createCells(trElement) {
        trElement.setAttribute('data-network-request-id', this.#requestInternal.requestId());
        trElement.classList.toggle('network-throttled-row', Boolean(this.throttlingConditions()?.urlPattern));
        trElement.classList.toggle('network-warning-row', this.isWarning());
        trElement.classList.toggle('network-error-row', this.isError());
        trElement.classList.toggle('network-navigation-row', this.#isNavigationRequestInternal);
        super.createCells(trElement);
        this.updateBackgroundColor();
    }
    #renderTextCell(cell, text, title) {
        CELL_VIEW({ text, title: title || text }, undefined, cell);
    }
    renderCell(c, columnId) {
        const cell = c;
        switch (columnId) {
            case 'name': {
                this.#renderPrimaryCell(cell, columnId);
                break;
            }
            case 'path': {
                this.#renderPrimaryCell(cell, columnId, this.#requestInternal.pathname);
                break;
            }
            case 'url': {
                this.#renderPrimaryCell(cell, columnId, this.#requestInternal.url());
                break;
            }
            case 'request-number': {
                const requestNumber = NetworkRequestNode.#requestNumber(this.#requestInternal);
                this.#renderTextCell(cell, requestNumber ? String(requestNumber) : '');
                break;
            }
            case 'method': {
                const preflightRequest = this.#requestInternal.preflightRequest();
                if (preflightRequest) {
                    CELL_VIEW({
                        text: `${this.#requestInternal.requestMethod} + `,
                        title: i18nString(UIStrings.sPreflight, { PH1: this.#requestInternal.requestMethod }),
                        link: {
                            kind: 'reveal',
                            text: i18nString(UIStrings.preflight),
                            title: i18nString(UIStrings.selectPreflightRequest),
                            jslogContext: 'preflight-request',
                            onClick: () => void Common.Revealer.reveal(preflightRequest),
                        },
                    }, undefined, cell);
                }
                else {
                    this.#renderTextCell(cell, this.#requestInternal.requestMethod);
                }
                break;
            }
            case 'status': {
                this.#renderStatusCell(cell);
                break;
            }
            case 'protocol': {
                this.#renderProtocolCell(cell);
                break;
            }
            case 'scheme': {
                this.#renderTextCell(cell, this.#requestInternal.scheme);
                break;
            }
            case 'domain': {
                this.#renderTextCell(cell, this.#requestInternal.domain);
                break;
            }
            case 'remote-address': {
                this.#renderTextCell(cell, this.#requestInternal.remoteAddress());
                break;
            }
            case 'remote-address-space': {
                this.#renderAddressSpaceCell(cell, this.#requestInternal.remoteAddressSpace());
                break;
            }
            case 'is-ad-related': {
                this.#renderTextCell(cell, this.#requestInternal.isAdRelated().toLocaleString());
                break;
            }
            case 'is-preloaded': {
                this.#renderTextCell(cell, this.#requestInternal.isLinkPreload().toLocaleString());
                break;
            }
            case 'render-blocking': {
                this.#renderRenderBlockingCell(cell);
                break;
            }
            case 'cookies': {
                this.#renderTextCell(cell, this.#arrayLength(this.#requestInternal.includedRequestCookies()));
                break;
            }
            case 'set-cookies': {
                this.#renderTextCell(cell, this.#arrayLength(this.#requestInternal.nonBlockedResponseCookies()));
                break;
            }
            case 'priority': {
                const priority = this.#requestInternal.priority();
                const initialPriority = this.#requestInternal.initialPriority();
                const text = priority ? PerfUI.NetworkPriorities.uiLabelForNetworkPriority(priority) : '';
                const subtitle = initialPriority ? PerfUI.NetworkPriorities.uiLabelForNetworkPriority(initialPriority) : '';
                const title = priority && initialPriority ?
                    i18nString(UIStrings.initialPriorityToolTip, { PH1: text, PH2: subtitle }) :
                    text;
                CELL_VIEW({ text, title, subtitle }, undefined, cell);
                break;
            }
            case 'connection-id': {
                this.#renderTextCell(cell, this.#requestInternal.connectionId === '0' ? '' : this.#requestInternal.connectionId);
                break;
            }
            case 'type': {
                this.#renderTextCell(cell, this.displayType());
                break;
            }
            case 'initiator': {
                this.#renderInitiatorCell(cell);
                break;
            }
            case 'initiator-address-space': {
                const clientSecurityState = this.#requestInternal.clientSecurityState();
                this.#renderAddressSpaceCell(cell, clientSecurityState ? clientSecurityState.initiatorIPAddressSpace : "Unknown" /* Protocol.Network.IPAddressSpace.Unknown */);
                break;
            }
            case 'size': {
                this.#renderSizeCell(cell);
                break;
            }
            case 'time': {
                this.#renderTimeCell(cell);
                break;
            }
            case 'timeline': {
                this.#renderTextCell(cell, '');
                break;
            }
            case 'has-overrides': {
                this.#renderTextCell(cell, this.#requestInternal.overrideTypes.join(', '));
                break;
            }
            case 'execution-context': {
                this.#renderExecutionContextCell(cell);
                break;
            }
            default: {
                const columnConfig = this.dataGrid?.columns[columnId];
                if (columnConfig) {
                    let headerName = '';
                    let headerValue = '';
                    if (columnConfig.id.startsWith('request-header-')) {
                        headerName = columnId.substring('request-header-'.length);
                        headerValue = this.#requestInternal.requestHeaderValue(headerName) || '';
                    }
                    else {
                        headerName = columnId.substring('response-header-'.length);
                        headerValue = this.#requestInternal.responseHeaderValue(headerName) || '';
                    }
                    this.#renderTextCell(cell, headerValue);
                }
                else {
                    this.#renderTextCell(cell, '');
                }
                break;
            }
        }
    }
    #arrayLength(array) {
        return array ? String(array.length) : '';
    }
    select(suppressSelectedEvent) {
        super.select(suppressSelectedEvent);
        this.parentView().dispatchEventToListeners("RequestSelected" /* Events.RequestSelected */, this.#requestInternal);
    }
    #openInNewTab() {
        // Only open URLs with web-safe schemes. Do not open privileged or other non-web-safe
        // schemes (such as `chrome:`, `devtools:`, `file:`, or `blob:devtools:`).
        if (!Common.ParsedURL.hasWebSafeScheme(this.#requestInternal.url())) {
            return;
        }
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(this.#requestInternal.url(), Components.Linkifier.openInNewTabInitiatorId(this.#requestInternal));
    }
    #isFailed() {
        return PanelUtils.isFailedNetworkRequest(this.#requestInternal);
    }
    #renderPrimaryCell(cell, columnId, text = '') {
        const input = { text };
        const dataGrid = this.dataGrid;
        if (isFirstPrimaryColumn(dataGrid, columnId)) {
            const actionRegistry = UI.ActionRegistry.ActionRegistry.instance();
            const aiAction = actionRegistry.hasAction('drjones.network-floating-button') ?
                actionRegistry.getAction('drjones.network-floating-button') :
                undefined;
            input.primary = {
                icon: PanelUtils.getIconForNetworkRequest(this.#requestInternal),
                leftPadding: this.leftPadding,
                isConsoleOriginated: this.#isConsoleOriginated(),
                aiButton: aiAction ? { iconName: AiAssistance.AiUtils.getIconName(), title: aiAction.title() } : undefined,
                onAiButtonClick: () => {
                    this.select();
                    void aiAction?.execute();
                },
                onDoubleClick: () => this.#openInNewTab(),
                onMouseDown: button => {
                    // When the request panel isn't visible yet, firing the RequestActivated event
                    // doesn't make it visible if no request is selected. So we'll select it first.
                    this.select();
                    // Only open panel on mousedown with left mouse button.
                    const showPanel = button ? "Unchanged" /* RequestPanelBehavior.Unchanged */ : "ShowPanel" /* RequestPanelBehavior.ShowPanel */;
                    this.parentView().dispatchEventToListeners("RequestActivated" /* Events.RequestActivated */, { showPanel });
                },
                onFocus: () => this.parentView().resetFocus(),
            };
        }
        if (columnId === 'name') {
            const name = Platform.StringUtilities.trimMiddle(this.#requestInternal.name(), 100);
            const networkManager = SDK.NetworkManager.NetworkManager.forRequest(this.#requestInternal);
            input.text = networkManager ? networkManager.target().decorateLabel(name) : name;
            input.subtitle = this.#requestInternal.path();
            if (!this.#requestInternal.url().startsWith('data')) {
                // Show the URL as tooltip unless it's a data URL.
                input.title = this.#requestInternal.url();
            }
        }
        CELL_VIEW(input, undefined, cell);
    }
    #renderStatusCell(cell) {
        const request = this.#requestInternal;
        const input = {
            text: '',
            dimmed: !this.#isFailed() && (request.cached() || !request.statusCode),
        };
        const setTextAndTitle = (text, title) => {
            input.text = text;
            input.title = title || text;
        };
        const corsErrorStatus = request.corsErrorStatus();
        if (request.failed && !request.canceled && !request.wasBlocked() && !corsErrorStatus) {
            const failText = i18nString(UIStrings.failed);
            if (request.localizedFailDescription) {
                setTextAndTitle(failText, failText + ' ' + request.localizedFailDescription);
                input.subtitle = request.localizedFailDescription;
                input.subtitleAlwaysVisible = true;
            }
            else {
                setTextAndTitle(failText);
            }
        }
        else if (request.statusCode && request.statusCode >= 400) {
            const statusText = request.getInferredStatusText();
            setTextAndTitle(String(request.statusCode), request.statusCode + ' ' + statusText);
            input.subtitle = statusText;
        }
        else if (!request.statusCode && request.parsedURL.isDataURL()) {
            setTextAndTitle(i18nString(UIStrings.data));
        }
        else if (!request.statusCode && request.canceled) {
            setTextAndTitle(i18nString(UIStrings.canceled));
        }
        else if (request.wasBlocked()) {
            let reason = i18nString(UIStrings.other);
            let displayShowHeadersLink = false;
            switch (request.blockedReason()) {
                case "other" /* Protocol.Network.BlockedReason.Other */:
                    reason = i18nString(UIStrings.other);
                    break;
                case "csp" /* Protocol.Network.BlockedReason.Csp */:
                    reason = i18nString(UIStrings.csp);
                    break;
                case "mixed-content" /* Protocol.Network.BlockedReason.MixedContent */:
                    reason = i18n.i18n.lockedString('mixed-content');
                    break;
                case "origin" /* Protocol.Network.BlockedReason.Origin */:
                    reason = i18nString(UIStrings.origin);
                    break;
                case "inspector" /* Protocol.Network.BlockedReason.Inspector */:
                    reason = i18nString(UIStrings.devtools);
                    break;
                case "subresource-filter" /* Protocol.Network.BlockedReason.SubresourceFilter */:
                    reason = i18n.i18n.lockedString('subresource-filter');
                    break;
                case "content-type" /* Protocol.Network.BlockedReason.ContentType */:
                    reason = i18n.i18n.lockedString('content-type');
                    break;
                case "coep-frame-resource-needs-coep-header" /* Protocol.Network.BlockedReason.CoepFrameResourceNeedsCoepHeader */:
                    displayShowHeadersLink = true;
                    reason = i18nString(UIStrings.coepFrameResourceNeedsCoepHeader);
                    break;
                case "coop-sandboxed-iframe-cannot-navigate-to-coop-page" /* Protocol.Network.BlockedReason.CoopSandboxedIframeCannotNavigateToCoopPage */:
                    displayShowHeadersLink = true;
                    reason = i18nString(UIStrings.coopSandboxedIframeCannotNavigateToCoopPage);
                    break;
                case "corp-not-same-origin" /* Protocol.Network.BlockedReason.CorpNotSameOrigin */:
                    displayShowHeadersLink = true;
                    reason = i18nString(UIStrings.corpNotSameOrigin);
                    break;
                case "corp-not-same-site" /* Protocol.Network.BlockedReason.CorpNotSameSite */:
                    displayShowHeadersLink = true;
                    reason = i18nString(UIStrings.corpNotSameSite);
                    break;
                case "corp-not-same-origin-after-defaulted-to-same-origin-by-coep" /* Protocol.Network.BlockedReason.CorpNotSameOriginAfterDefaultedToSameOriginByCoep */:
                    displayShowHeadersLink = true;
                    reason = i18nString(UIStrings.corpNotSameOriginAfterDefaultedToSameOriginByCoep);
                    break;
                case "sri-message-signature-mismatch" /* Protocol.Network.BlockedReason.SriMessageSignatureMismatch */:
                    displayShowHeadersLink = true;
                    reason = i18nString(UIStrings.integrity);
                    break;
            }
            if (displayShowHeadersLink) {
                setTextAndTitle(i18nString(UIStrings.blockeds, { PH1: reason }), i18nString(UIStrings.blockedTooltip));
                input.linkJslogContext = 'headers-component';
                input.onLinkClick = () => {
                    this.parentView().dispatchEventToListeners("RequestActivated" /* Events.RequestActivated */, {
                        showPanel: "ShowPanel" /* RequestPanelBehavior.ShowPanel */,
                        tab: "headers-component" /* NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT */,
                    });
                };
            }
            else {
                setTextAndTitle(i18nString(UIStrings.blockeds, { PH1: reason }));
            }
        }
        else if (corsErrorStatus) {
            setTextAndTitle(i18nString(UIStrings.corsError), i18nString(UIStrings.crossoriginResourceSharingErrorS, { PH1: corsErrorStatus.corsError }));
        }
        else if (request.statusCode) {
            const statusText = request.getInferredStatusText();
            setTextAndTitle(String(request.statusCode), request.statusCode + ' ' + statusText);
            input.subtitle = statusText;
        }
        else if (request.statusText) {
            setTextAndTitle(request.statusText);
        }
        else if (request.finished) {
            setTextAndTitle(i18nString(UIStrings.finished));
        }
        else if (request.preserved) {
            setTextAndTitle(i18nString(UIStrings.unknown), i18nString(UIStrings.unknownExplanation));
        }
        else {
            setTextAndTitle(i18nString(UIStrings.pendingq));
        }
        CELL_VIEW(input, undefined, cell);
    }
    #renderProtocolCell(cell) {
        let title = this.#requestInternal.protocol;
        switch (this.#requestInternal.alternateProtocolUsage) {
            case "alternativeJobWonWithoutRace" /* Protocol.Network.AlternateProtocolUsage.AlternativeJobWonWithoutRace */: {
                title = UIStrings.alternativeJobWonWithoutRace;
                break;
            }
            case "alternativeJobWonRace" /* Protocol.Network.AlternateProtocolUsage.AlternativeJobWonRace */: {
                title = UIStrings.alternativeJobWonRace;
                break;
            }
            case "mainJobWonRace" /* Protocol.Network.AlternateProtocolUsage.MainJobWonRace */: {
                title = UIStrings.mainJobWonRace;
                break;
            }
            case "mappingMissing" /* Protocol.Network.AlternateProtocolUsage.MappingMissing */: {
                title = UIStrings.mappingMissing;
                break;
            }
            case "broken" /* Protocol.Network.AlternateProtocolUsage.Broken */: {
                title = UIStrings.broken;
                break;
            }
            case "dnsAlpnH3JobWonWithoutRace" /* Protocol.Network.AlternateProtocolUsage.DnsAlpnH3JobWonWithoutRace */: {
                title = UIStrings.dnsAlpnH3JobWonWithoutRace;
                break;
            }
            case "dnsAlpnH3JobWonRace" /* Protocol.Network.AlternateProtocolUsage.DnsAlpnH3JobWonRace */: {
                title = UIStrings.dnsAlpnH3JobWonRace;
                break;
            }
        }
        CELL_VIEW({ text: this.#requestInternal.protocol, title }, undefined, cell);
    }
    #renderRenderBlockingCell(cell) {
        let text = '';
        switch (this.#requestInternal.renderBlockingBehavior()) {
            case "Blocking" /* Protocol.Network.RenderBlockingBehavior.Blocking */:
                text = i18nString(UIStrings.blocking);
                break;
            case "InBodyParserBlocking" /* Protocol.Network.RenderBlockingBehavior.InBodyParserBlocking */:
                text = i18nString(UIStrings.inBodyParserBlocking);
                break;
            case "NonBlocking" /* Protocol.Network.RenderBlockingBehavior.NonBlocking */:
                text = i18nString(UIStrings.nonBlocking);
                break;
            case "NonBlockingDynamic" /* Protocol.Network.RenderBlockingBehavior.NonBlockingDynamic */:
                text = i18nString(UIStrings.nonBlockingDynamic);
                break;
            case "PotentiallyBlocking" /* Protocol.Network.RenderBlockingBehavior.PotentiallyBlocking */:
                text = i18nString(UIStrings.potentiallyBlocking);
                break;
        }
        CELL_VIEW({ text }, undefined, cell);
    }
    #getLinkifierMetric() {
        if (this.#requestInternal.resourceType().isStyleSheet()) {
            return Host.UserMetrics.Action.StyleSheetInitiatorLinkClicked;
        }
        return undefined;
    }
    #renderInitiatorCell(cell) {
        const request = this.#requestInternal;
        const initiator = Logs.NetworkLog.NetworkLog.instance().initiatorInfoForRequest(request);
        const input = { text: request.timing?.pushStart ? i18nString(UIStrings.push) : '' };
        switch (initiator.type) {
            case "parser" /* SDK.NetworkRequest.InitiatorType.PARSER */: {
                input.link = {
                    kind: 'url',
                    url: initiator.url,
                    options: {
                        lineNumber: initiator.lineNumber,
                        columnNumber: initiator.columnNumber,
                        userMetric: this.#getLinkifierMetric(),
                    },
                };
                input.subtitle = i18nString(UIStrings.parser);
                break;
            }
            case "redirect" /* SDK.NetworkRequest.InitiatorType.REDIRECT */: {
                input.title = initiator.url;
                const redirectSource = request.redirectSource();
                console.assert(redirectSource !== null);
                if (this.parentView().nodeForRequest(redirectSource)) {
                    input.link = {
                        kind: 'reveal',
                        text: Platform.StringUtilities.trimMiddle(Bindings.ResourceUtils.displayNameForURL(redirectSource.url()), UI.UIUtils.MaxLengthForDisplayedURLs),
                        jslogContext: 'redirect-source-request',
                        onClick: () => void Common.Revealer.reveal(redirectSource),
                    };
                }
                else {
                    input.link = { kind: 'url', url: redirectSource.url(), options: { jslogContext: 'redirect-source-request-url' } };
                }
                input.subtitle = i18nString(UIStrings.redirect);
                break;
            }
            case "script" /* SDK.NetworkRequest.InitiatorType.SCRIPT */: {
                input.link = {
                    kind: 'script-location',
                    linkifier: this.parentView().linkifier(),
                    target: SDK.NetworkManager.NetworkManager.forRequest(request)?.target() || null,
                    stackTrace: initiator.stack?.callFrames.length ? initiator.stack : null,
                    scriptId: initiator.scriptId,
                    url: initiator.url,
                    lineNumber: initiator.lineNumber,
                    columnNumber: initiator.columnNumber,
                };
                input.subtitle = this.#isConsoleOriginated() ? i18nString(UIStrings.console) : i18nString(UIStrings.script);
                input.scriptInitiated = true;
                break;
            }
            case "preload" /* SDK.NetworkRequest.InitiatorType.PRELOAD */: {
                input.title = i18nString(UIStrings.preload);
                input.dimmed = true;
                input.text += i18nString(UIStrings.preload);
                break;
            }
            case "signedExchange" /* SDK.NetworkRequest.InitiatorType.SIGNED_EXCHANGE */: {
                input.link = { kind: 'url', url: initiator.url };
                input.subtitle = i18nString(UIStrings.signedexchange);
                break;
            }
            case "preflight" /* SDK.NetworkRequest.InitiatorType.PREFLIGHT */: {
                input.text += i18nString(UIStrings.preflight);
                const initiatorRequest = initiator.initiatorRequest;
                if (initiatorRequest) {
                    input.link = {
                        kind: 'reveal',
                        iconName: 'arrow-up-down-circle',
                        title: i18nString(UIStrings.selectTheRequestThatTriggered),
                        className: 'trailing-link-icon',
                        jslogContext: 'initator-request',
                        onClick: () => void Common.Revealer.reveal(initiatorRequest),
                    };
                }
                break;
            }
            default: {
                // Early hints are not technically an InitiatorType in Chromium but
                // probably should be (it is in Resource Timing). See:
                // https://chromium-review.googlesource.com/c/chromium/src/+/5348938/comments/7cf39a37_dae12d06
                // But to developers it IS the initiator and more useful to know than
                // the default "other" that otherwise shows for early-hint requests.
                const initiatorText = request.fromEarlyHints() ? i18nString(UIStrings.earlyHints) : i18nString(UIStrings.otherC);
                input.title = initiatorText;
                input.dimmed = true;
                input.text += initiatorText;
            }
        }
        CELL_VIEW(input, undefined, cell);
    }
    #renderAddressSpaceCell(cell, ipAddressSpace) {
        const text = ipAddressSpace !== "Unknown" /* Protocol.Network.IPAddressSpace.Unknown */ ? ipAddressSpace : '';
        CELL_VIEW({ text }, undefined, cell);
    }
    #renderSizeCell(cell) {
        const resourceSize = i18n.ByteUtilities.formatBytesToKb(this.#requestInternal.resourceSize);
        const input = { text: '', subtitle: resourceSize };
        if (this.#requestInternal.cachedInMemory()) {
            input.text = i18nString(UIStrings.memoryCache);
            input.title = i18nString(UIStrings.servedFromMemoryCacheResource, { PH1: resourceSize });
            input.dimmed = true;
        }
        else if (this.#requestInternal.hasMatchingServiceWorkerRouter()) {
            const ruleIdMatched = this.#requestInternal.serviceWorkerRouterInfo?.ruleIdMatched;
            const matchedSourceType = this.#requestInternal.serviceWorkerRouterInfo?.matchedSourceType;
            input.text = i18n.i18n.lockedString('(ServiceWorker router)');
            if (matchedSourceType === "network" /* Protocol.Network.ServiceWorkerRouterSource.Network */) {
                const transferSize = i18n.ByteUtilities.formatBytesToKb(this.#requestInternal.transferSize);
                input.title = i18nString(UIStrings.matchedToServiceWorkerRouterWithNetworkSource, { PH1: ruleIdMatched, PH2: transferSize, PH3: resourceSize });
            }
            else {
                input.title = i18nString(UIStrings.matchedToServiceWorkerRouter, { PH1: ruleIdMatched, PH2: resourceSize });
            }
            input.dimmed = true;
        }
        else if (this.#requestInternal.fetchedViaServiceWorker) {
            // Checked before the no-matching-route fallback below: a request that
            // matches no router rule falls back to the fetch handler, so it can
            // still be fulfilled by the ServiceWorker.
            input.text = i18nString(UIStrings.serviceWorker);
            input.title = i18nString(UIStrings.servedFromServiceWorkerResource, { PH1: resourceSize });
            input.dimmed = true;
        }
        else if (this.#requestInternal.serviceWorkerRouterInfo) {
            // ServiceWorker routers are registered, but the request fell back to the
            // network because no matching router rule was found and the fetch
            // handler did not provide the response.
            const transferSize = i18n.ByteUtilities.formatBytesToKb(this.#requestInternal.transferSize);
            input.text = transferSize;
            input.title =
                i18nString(UIStrings.servedFromNetworkMissingServiceWorkerRoute, { PH1: transferSize, PH2: resourceSize });
        }
        else if (this.#requestInternal.redirectSourceSignedExchangeInfoHasNoErrors()) {
            input.text = i18n.i18n.lockedString('(signed-exchange)');
            input.title = i18nString(UIStrings.servedFromSignedHttpExchange, { PH1: resourceSize });
            input.dimmed = true;
        }
        else if (this.#requestInternal.fromPrefetchCache()) {
            input.text = i18nString(UIStrings.prefetchCache);
            input.title = i18nString(UIStrings.servedFromPrefetchCacheResource, { PH1: resourceSize });
            input.dimmed = true;
        }
        else if (this.#requestInternal.cached()) {
            input.text = i18nString(UIStrings.diskCache);
            input.title = i18nString(UIStrings.servedFromDiskCacheResourceSizeS, { PH1: resourceSize });
            input.dimmed = true;
        }
        else {
            const transferSize = i18n.ByteUtilities.formatBytesToKb(this.#requestInternal.transferSize);
            input.text = transferSize;
            input.title = i18nString(UIStrings.servedFromNetwork, { PH1: transferSize, PH2: resourceSize });
        }
        CELL_VIEW(input, undefined, cell);
    }
    #renderTimeCell(cell) {
        const input = { text: '' };
        const throttlingConditions = this.throttlingConditions();
        if (throttlingConditions?.urlPattern) {
            const throttlingConditionsTitle = typeof throttlingConditions.conditions.title === 'string' ?
                throttlingConditions.conditions.title :
                throttlingConditions.conditions.title();
            input.throttling = {
                title: i18nString(UIStrings.wasThrottled, { PH1: throttlingConditionsTitle }),
                onClick: () => void Common.Revealer.reveal(throttlingConditions),
            };
        }
        if (this.#requestInternal.duration > 0) {
            input.text = i18n.TimeUtilities.secondsToString(this.#requestInternal.duration);
            input.title = input.text;
            input.subtitle = i18n.TimeUtilities.secondsToString(this.#requestInternal.latency);
            input.subtitleTitle = i18nString(UIStrings.timeSubtitleTooltipText);
        }
        else if (this.#requestInternal.preserved) {
            input.text = i18nString(UIStrings.unknown);
            input.title = i18nString(UIStrings.unknownExplanation);
        }
        else {
            input.text = i18nString(UIStrings.pending);
            input.title = input.text;
            input.dimmed = true;
        }
        CELL_VIEW(input, undefined, cell);
    }
    #renderExecutionContextCell(cell) {
        const contextDescription = NetworkRequestNode.getExecutionContextDescription(this.#requestInternal);
        this.#renderTextCell(cell, contextDescription);
    }
}
export class NetworkGroupNode extends NetworkNode {
    createCells(element) {
        super.createCells(element);
        const dataGrid = this.dataGrid;
        const primaryColumn = firstPrimaryColumn(dataGrid) ?? dataGrid.visibleColumnsArray[0];
        const localizedTitle = `${primaryColumn.title}`;
        const localizedLevel = i18nString(UIStrings.level);
        this.nodeAccessibleText =
            `${localizedLevel} ${localizedTitle}: ${this.cellAccessibleTextMap.get(primaryColumn.id)}`;
    }
    renderCell(c, columnId) {
        const dataGrid = this.dataGrid;
        const primaryColumn = firstPrimaryColumn(dataGrid) ?? dataGrid.visibleColumnsArray[0];
        if (primaryColumn.id === columnId) {
            const cell = c;
            CELL_VIEW({ text: '', disclosure: { leftPadding: this.leftPadding } }, undefined, cell);
            this.setCellAccessibleName(cell.textContent || '', cell, columnId);
        }
    }
    select(suppressSelectedEvent) {
        super.select(suppressSelectedEvent);
        const firstChildNode = this.traverseNextNode(false, undefined, true);
        const request = firstChildNode?.request();
        if (request) {
            this.parentView().dispatchEventToListeners("RequestSelected" /* Events.RequestSelected */, request);
        }
    }
}
//# sourceMappingURL=NetworkDataGridNode.js.map