// Copyright 2010 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as PanelCommon from '../../panels/common/common.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import * as Annotations from '../../ui/components/annotations/annotations.js';
import * as LegacyWrapper from '../../ui/components/legacy_wrapper/legacy_wrapper.js';
import { Icon } from '../../ui/kit/kit.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import * as NetworkComponents from './components/components.js';
import { EventSourceMessagesView } from './EventSourceMessagesView.js';
import { RequestCookiesView } from './RequestCookiesView.js';
import { RequestInitiatorView } from './RequestInitiatorView.js';
import { RequestPayloadView } from './RequestPayloadView.js';
import { RequestPreviewView } from './RequestPreviewView.js';
import { RequestResponseView } from './RequestResponseView.js';
import { RequestTimingView } from './RequestTimingView.js';
import { ResourceDirectSocketChunkView } from './ResourceDirectSocketChunkView.js';
import { ResourceWebSocketFrameView } from './ResourceWebSocketFrameView.js';
const UIStrings = {
    /**
     * @description Text for network request headers
     */
    headers: 'Headers',
    /**
     * @description Text for network connection info. In case the request is not made over http.
     */
    connectionInfo: 'Connection Info',
    /**
     * @description Text in Network Item View of the Network panel
     */
    payload: 'Payload',
    /**
     * @description Text in Network Item View of the Network panel
     */
    messages: 'Messages',
    /**
     * @description Text in Network Item View of the Network panel
     */
    websocketMessages: 'WebSocket messages',
    /**
     * @description Text in Network Item View of the Network panel
     */
    directsocketMessages: 'DirectSocket messages',
    /**
     * @description Text in Network Item View of the Network panel
     */
    eventstream: 'EventStream',
    /**
     * @description Text for previewing items
     */
    preview: 'Preview',
    /**
     * @description Text in Network Item View of the Network panel
     */
    responsePreview: 'Response preview',
    /**
     * @description Icon title in Network Item View of the Network panel
     */
    signedexchangeError: 'SignedExchange error',
    /**
     * @description Title of a tab in the Network panel. A Network response refers to the act of acknowledging a
     * network request. Should not be confused with answer.
     */
    response: 'Response',
    /**
     * @description Text in Network Item View of the Network panel
     */
    rawResponseData: 'Raw response data',
    /**
     * @description Text for the initiator of something
     */
    initiator: 'Initiator',
    /**
     * @description Tooltip for initiator view in Network panel. An initiator is a piece of code/entity
     * in the code that initiated/started the network request, i.e. caused the network request. The 'call
     * stack' is the location in the code where the initiation happened.
     */
    requestInitiatorCallStack: 'Request initiator call stack',
    /**
     * @description Title of a tab in Network Item View of the Network panel.
     *The tab displays the duration breakdown of a network request.
     */
    timing: 'Timing',
    /**
     * @description Text in Network Item View of the Network panel
     */
    requestAndResponseTimeline: 'Request and response timeline',
    /**
     * @description Tooltip to explain the warning icon of the Cookies panel
     */
    thirdPartyPhaseout: 'Cookies blocked due to third-party cookie phaseout.',
    /**
     * @description Label of a tab in the network panel. Previously known as 'Trust Tokens'.
     */
    trustTokens: 'Private state tokens',
    /**
     * @description Title of the Private State Token tab in the Network panel. Previously known as 'Trust Token tab'.
     */
    trustTokenOperationDetails: 'Private State Token operation details',
    /**
     * @description Text for web cookies
     */
    cookies: 'Cookies',
    /**
     * @description Text in Network Item View of the Network panel
     */
    requestAndResponseCookies: 'Request and response cookies',
    /**
     * @description Tooltip text explaining that DevTools has overridden the response's headers
     */
    containsOverriddenHeaders: 'This response contains headers which are overridden by DevTools',
    /**
     * @description Tooltip text explaining that DevTools has overridden the response
     */
    responseIsOverridden: 'This response is overridden by DevTools',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/NetworkItemView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const requestToResponseView = new WeakMap();
const requestToPreviewView = new WeakMap();
export class NetworkItemView extends UI.TabbedPane.TabbedPane {
    #request;
    #resourceViewTabSetting;
    #headersViewComponent;
    #payloadView = null;
    #responseView;
    #cookiesView = null;
    #initialTab;
    #firstTab;
    constructor(request, calculator, initialTab) {
        super();
        this.#request = request;
        this.element.classList.add('network-item-view');
        this.headerElement().setAttribute('jslog', `${VisualLogging.toolbar('request-details').track({
            keydown: 'ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space',
        })}`);
        if (request.resourceType() === Common.ResourceType.resourceTypes.DirectSocket) {
            this.#firstTab = "direct-socket-connection" /* NetworkForward.UIRequestLocation.UIRequestTabs.DIRECT_SOCKET_CONNECTION */;
            this.appendTab("direct-socket-connection" /* NetworkForward.UIRequestLocation.UIRequestTabs.DIRECT_SOCKET_CONNECTION */, i18nString(UIStrings.connectionInfo), new NetworkComponents.DirectSocketConnectionView.DirectSocketConnectionView(request), i18nString(UIStrings.headers));
        }
        else {
            this.#firstTab = "headers-component" /* NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT */;
            this.#headersViewComponent = new NetworkComponents.RequestHeadersView.RequestHeadersView(request);
            this.appendTab("headers-component" /* NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT */, i18nString(UIStrings.headers), LegacyWrapper.LegacyWrapper.legacyWrapper(UI.Widget.VBox, this.#headersViewComponent), i18nString(UIStrings.headers));
        }
        this.#resourceViewTabSetting =
            Common.Settings.Settings.instance().createSetting('resource-view-tab', this.#firstTab);
        if (this.#request.hasOverriddenHeaders()) {
            const statusDot = document.createElement('div');
            statusDot.className = 'status-dot';
            statusDot.title = i18nString(UIStrings.containsOverriddenHeaders);
            this.setSuffixElement("headers-component" /* NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT */, statusDot);
        }
        void this.maybeAppendPayloadPanel();
        this.addEventListener(UI.TabbedPane.Events.TabSelected, this.tabSelected, this);
        if (request.resourceType() === Common.ResourceType.resourceTypes.WebSocket) {
            const frameView = new ResourceWebSocketFrameView(request);
            this.appendTab("web-socket-frames" /* NetworkForward.UIRequestLocation.UIRequestTabs.WS_FRAMES */, i18nString(UIStrings.messages), frameView, i18nString(UIStrings.websocketMessages));
        }
        else if (request.resourceType() === Common.ResourceType.resourceTypes.DirectSocket) {
            this.appendTab("direct-socket-chunks" /* NetworkForward.UIRequestLocation.UIRequestTabs.DIRECT_SOCKET_CHUNKS */, i18nString(UIStrings.messages), new ResourceDirectSocketChunkView(request), i18nString(UIStrings.directsocketMessages));
        }
        else if (request.mimeType === "text/event-stream" /* Platform.MimeType.MimeType.EVENTSTREAM */) {
            this.appendTab("eventSource" /* NetworkForward.UIRequestLocation.UIRequestTabs.EVENT_SOURCE */, i18nString(UIStrings.eventstream), new EventSourceMessagesView(request));
            this.#responseView = requestToResponseView.get(request) ?? new RequestResponseView(request);
            requestToResponseView.set(request, this.#responseView);
            this.appendTab("response" /* NetworkForward.UIRequestLocation.UIRequestTabs.RESPONSE */, i18nString(UIStrings.response), this.#responseView, i18nString(UIStrings.rawResponseData));
        }
        else {
            this.#responseView = requestToResponseView.get(request) ?? new RequestResponseView(request);
            requestToResponseView.set(request, this.#responseView);
            const previewView = requestToPreviewView.get(request) ?? new RequestPreviewView(request);
            requestToPreviewView.set(request, previewView);
            this.appendTab("preview" /* NetworkForward.UIRequestLocation.UIRequestTabs.PREVIEW */, i18nString(UIStrings.preview), previewView, i18nString(UIStrings.responsePreview));
            const signedExchangeInfo = request.signedExchangeInfo();
            if (signedExchangeInfo?.errors?.length) {
                const icon = new Icon();
                icon.name = 'cross-circle-filled';
                icon.classList.add('small');
                UI.Tooltip.Tooltip.install(icon, i18nString(UIStrings.signedexchangeError));
                this.setTabIcon("preview" /* NetworkForward.UIRequestLocation.UIRequestTabs.PREVIEW */, icon);
            }
            this.appendTab("response" /* NetworkForward.UIRequestLocation.UIRequestTabs.RESPONSE */, i18nString(UIStrings.response), this.#responseView, i18nString(UIStrings.rawResponseData));
            if (this.#request.hasOverriddenContent) {
                const statusDot = document.createElement('div');
                statusDot.className = 'status-dot';
                statusDot.title = i18nString(UIStrings.responseIsOverridden);
                this.setSuffixElement("response" /* NetworkForward.UIRequestLocation.UIRequestTabs.RESPONSE */, statusDot);
            }
        }
        this.appendTab("initiator" /* NetworkForward.UIRequestLocation.UIRequestTabs.INITIATOR */, i18nString(UIStrings.initiator), new RequestInitiatorView(request), i18nString(UIStrings.requestInitiatorCallStack));
        this.appendTab("timing" /* NetworkForward.UIRequestLocation.UIRequestTabs.TIMING */, i18nString(UIStrings.timing), RequestTimingView.create(request, calculator), i18nString(UIStrings.requestAndResponseTimeline));
        if (request.trustTokenParams()) {
            this.appendTab("trust-tokens" /* NetworkForward.UIRequestLocation.UIRequestTabs.TRUST_TOKENS */, i18nString(UIStrings.trustTokens), LegacyWrapper.LegacyWrapper.legacyWrapper(UI.Widget.VBox, new NetworkComponents.RequestTrustTokensView.RequestTrustTokensView(request)), i18nString(UIStrings.trustTokenOperationDetails));
        }
        this.#initialTab = initialTab || this.#resourceViewTabSetting.get();
        // Selecting tabs should not be handled by the super class.
        this.setAutoSelectFirstItemOnShow(false);
    }
    wasShown() {
        super.wasShown();
        this.#request.addEventListener(SDK.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.requestHeadersChanged, this);
        this.#request.addEventListener(SDK.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED, this.maybeAppendCookiesPanel, this);
        this.#request.addEventListener(SDK.NetworkRequest.Events.TRUST_TOKEN_RESULT_ADDED, this.maybeShowErrorIconInTrustTokenTabHeader, this);
        this.maybeAppendCookiesPanel();
        this.maybeShowErrorIconInTrustTokenTabHeader();
        // Only select the initial tab the first time the view is shown after construction.
        // When the view is re-shown (without re-constructing) users or revealers might have changed
        // the selected tab in the mean time. Show the previously selected tab in that
        // case instead, by simply doing nothing.
        if (this.#initialTab) {
            this.#selectTab(this.#initialTab);
            this.#initialTab = undefined;
        }
        if (Annotations.AnnotationRepository.annotationsEnabled()) {
            PanelCommon.AnnotationManager.instance().initializePlacementForAnnotationType(Annotations.AnnotationType.NETWORK_REQUEST_SUBPANEL_HEADERS, this.resolveInitialState.bind(this), this.element);
            void PanelCommon.AnnotationManager.instance().resolveAnnotationsOfType(Annotations.AnnotationType.NETWORK_REQUEST_SUBPANEL_HEADERS);
        }
    }
    willHide() {
        super.willHide();
        this.#request.removeEventListener(SDK.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.requestHeadersChanged, this);
        this.#request.removeEventListener(SDK.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED, this.maybeAppendCookiesPanel, this);
        this.#request.removeEventListener(SDK.NetworkRequest.Events.TRUST_TOKEN_RESULT_ADDED, this.maybeShowErrorIconInTrustTokenTabHeader, this);
    }
    async requestHeadersChanged() {
        this.maybeAppendCookiesPanel();
        void this.maybeAppendPayloadPanel();
    }
    maybeAppendCookiesPanel() {
        const cookiesPresent = this.#request.hasRequestCookies() || this.#request.responseCookies.length > 0;
        console.assert(cookiesPresent || !this.#cookiesView, 'Cookies were introduced in headers and then removed!');
        if (cookiesPresent && !this.#cookiesView) {
            this.#cookiesView = new RequestCookiesView(this.#request);
            this.appendTab("cookies" /* NetworkForward.UIRequestLocation.UIRequestTabs.COOKIES */, i18nString(UIStrings.cookies), this.#cookiesView, i18nString(UIStrings.requestAndResponseCookies));
        }
        if (this.#request.hasThirdPartyCookiePhaseoutIssue()) {
            const icon = new Icon();
            icon.name = 'warning-filled';
            icon.classList.add('small');
            icon.title = i18nString(UIStrings.thirdPartyPhaseout);
            this.setTrailingTabIcon("cookies" /* NetworkForward.UIRequestLocation.UIRequestTabs.COOKIES */, icon);
        }
    }
    async maybeAppendPayloadPanel() {
        if (this.hasTab('payload')) {
            return;
        }
        if (this.#request.queryParameters || await this.#request.requestFormData()) {
            this.#payloadView = new RequestPayloadView(this.#request);
            this.appendTab("payload" /* NetworkForward.UIRequestLocation.UIRequestTabs.PAYLOAD */, i18nString(UIStrings.payload), this.#payloadView, i18nString(UIStrings.payload), /* userGesture=*/ void 0, 
            /* isCloseable=*/ void 0, /* isPreviewFeature=*/ void 0, /* index=*/ 1);
        }
    }
    maybeShowErrorIconInTrustTokenTabHeader() {
        const trustTokenResult = this.#request.trustTokenOperationDoneEvent();
        if (trustTokenResult &&
            !NetworkComponents.RequestTrustTokensView.statusConsideredSuccess(trustTokenResult.status)) {
            const icon = new Icon();
            icon.name = 'cross-circle-filled';
            icon.classList.add('small');
            this.setTabIcon("trust-tokens" /* NetworkForward.UIRequestLocation.UIRequestTabs.TRUST_TOKENS */, icon);
        }
    }
    #selectTab(tabId) {
        if (!this.selectTab(tabId)) {
            // maybeAppendPayloadPanel might cause payload tab to appear asynchronously, so
            // it makes sense to retry on the next tick
            window.setTimeout(() => {
                if (!this.selectTab(tabId)) {
                    this.selectTab(this.#firstTab);
                }
            }, 0);
        }
    }
    async resolveInitialState(parentElement, reveal, lookupId, anchor) {
        const request = anchor;
        if ((request && request !== this.request()) || (lookupId !== this.request().requestId())) {
            return null;
        }
        if (!this.#headersViewComponent) {
            return null;
        }
        await this.#headersViewComponent.render();
        const element = this.#headersViewComponent.getHeaderElementById('request-url');
        if (!element) {
            return null;
        }
        const targetRect = element.getBoundingClientRect();
        const parentRect = parentElement.getBoundingClientRect();
        // Adjust the anchor position slightly.
        const adjustX = 15;
        const adjustY = -19;
        const relativeX = targetRect.x - parentRect.x + adjustX;
        const relativeY = targetRect.y - parentRect.y + adjustY;
        return { x: relativeX, y: relativeY };
    }
    tabSelected(event) {
        if (!event.data.isUserGesture) {
            return;
        }
        this.#resourceViewTabSetting.set(event.data.tabId);
    }
    request() {
        return this.#request;
    }
    async revealResponseBody(position) {
        this.#selectTab("response" /* NetworkForward.UIRequestLocation.UIRequestTabs.RESPONSE */);
        await this.#responseView?.revealPosition(position);
    }
    revealHeader(section, header) {
        this.#selectTab("headers-component" /* NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT */);
        this.#headersViewComponent?.revealHeader(section, header);
    }
    getHeadersViewComponent() {
        return this.#headersViewComponent;
    }
}
//# sourceMappingURL=NetworkItemView.js.map