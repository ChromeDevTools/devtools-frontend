// Copyright 2010 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/kit/kit.js';
import '../../ui/legacy/legacy.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as NetworkTimeCalculator from '../../models/network_time_calculator/network_time_calculator.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import type * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, nothing, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as NetworkComponents from './components/components.js';
import {EventSourceMessagesView} from './EventSourceMessagesView.js';
import {RequestCookiesView} from './RequestCookiesView.js';
import {
  RequestDeviceBoundSessionsView,
} from './RequestDeviceBoundSessionsView.js';
import {RequestHeadersView} from './RequestHeadersView.js';
import {RequestInitiatorView} from './RequestInitiatorView.js';
import {RequestPayloadView} from './RequestPayloadView.js';
import {RequestPreviewView} from './RequestPreviewView.js';
import {RequestResponseView} from './RequestResponseView.js';
import {RequestTimingView} from './RequestTimingView.js';
import {
  ResourceDirectSocketChunkView,
} from './ResourceDirectSocketChunkView.js';
import {ResourceWebSocketFrameView} from './ResourceWebSocketFrameView.js';

const {widget, widgetRef} = UI.Widget;

const UIStrings = {
  /**
   * @description Title of a tab in network item view of the Network panel for
   * viewing HTTP request/response headers.
   */
  headers: 'Headers',
  /**
   * @description Title of a tab in network item view of the Network panel for
   * viewing DirectSocket connection info.
   */
  connectionInfo: 'Connection info',
  /**
   * @description Title of a tab in network item view of the Network panel for
   * viewing request payload parameters and form data.
   */
  payload: 'Payload',
  /**
   * @description Title of a tab in network item view of the Network panel for
   * viewing WebSocket or DirectSocket messages.
   */
  messages: 'Messages',
  /**
   * @description Accessible tooltip for the WebSocket messages tab in network
   * item view of the Network panel.
   */
  websocketMessages: 'WebSocket messages',
  /**
   * @description Accessible tooltip for the DirectSocket messages tab in
   * network item view of the Network panel.
   */
  directsocketMessages: 'DirectSocket messages',
  /**
   * @description Title of a tab in network item view of the Network panel for
   * viewing Server-Sent Event (EventStream) messages.
   */
  eventstream: 'EventStream',
  /**
   * @description Title of a tab in network item view of the Network panel for
   * previewing response content.
   */
  preview: 'Preview',
  /**
   * @description Accessible tooltip for the response preview tab in network
   * item view of the Network panel.
   */
  responsePreview: 'Response preview',
  /**
   * @description Tooltip for error icon on preview tab in network item view of
   * the Network panel when signed exchange has errors.
   */
  signedexchangeError: 'SignedExchange error',
  /**
   * @description Title of a tab in network item view of the Network panel for
   * viewing raw response content. A Network response refers to the act of
   * acknowledging a network request. Should not be confused with answer.
   */
  response: 'Response',
  /**
   * @description Accessible tooltip for the raw response data tab in network
   * item view of the Network panel.
   */
  rawResponseData: 'Raw response data',
  /**
   * @description Title of a tab in network item view of the Network panel for
   * viewing request initiator stack trace and chain.
   */
  initiator: 'Initiator',
  /**
   * @description Accessible tooltip for the request initiator tab in network
   * item view of the Network panel. An initiator is a piece of code/entity in
   * the code that initiated/started the network request, i.e. caused the
   * network request. The 'call stack' is the location in the code where the
   * initiation happened.
   */
  requestInitiatorCallStack: 'Request initiator call stack',
  /**
   * @description Title of a tab in network item view of the Network panel for
   * viewing request timing breakdown.
   */
  timing: 'Timing',
  /**
   * @description Accessible tooltip for the request timing tab in network item
   * view of the Network panel.
   */
  requestAndResponseTimeline: 'Request and response timeline',
  /**
   * @description Tooltip text for warning icon on cookies tab in network item
   * view of the Network panel when third-party cookies are blocked.
   */
  thirdPartyPhaseout: 'Cookies blocked due to third-party cookie phaseout',
  /**
   * @description Title of a tab in network item view of the Network panel for
   * viewing Private State Tokens operation details.
   */
  trustTokens: 'Private state tokens',
  /**
   * @description Accessible tooltip for the Private State Tokens tab in network
   * item view of the Network panel.
   */
  trustTokenOperationDetails: 'Private State Token operation details',
  /**
   * @description Title of a tab in network item view of the Network panel for
   * viewing request and response cookies.
   */
  cookies: 'Cookies',
  /**
   * @description Title of the Device Bound Sessions tab in the Network panel. A
   * website may decide to create a session for a user, for example when the
   * user logs in. They can use a protocol to make it a "device bound session".
   * That means that when the session expires, it is only possible for it to be
   * extended on the device it was created on. Thus the session is considered
   * to be bound to that device. For more details on the protocol, see
   * https://github.com/w3c/webappsec-dbsc/blob/main/README.md and
   * https://w3c.github.io/webappsec-dbsc/.
   */
  deviceBoundSessions: 'Device bound sessions',
  /**
   * @description Accessible tooltip for the cookies tab in network item view of
   * the Network panel.
   */
  requestAndResponseCookies: 'Request and response cookies',
  /**
   * @description Tooltip text for status indicator dot on headers tab in
   * network item view of the Network panel when headers are overridden by
   * DevTools.
   */
  containsOverriddenHeaders: 'This response contains headers which are overridden by DevTools',
  /**
   * @description Tooltip text for status indicator dot on response tab in
   * network item view of the Network panel when response content is overridden
   * by DevTools.
   */
  responseIsOverridden: 'This response is overridden by DevTools',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/network/NetworkItemView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  request: SDK.NetworkRequest.NetworkRequest;
  calculator: NetworkTimeCalculator.NetworkTimeCalculator;
  selectedTab: NetworkForward.UIRequestLocation.UIRequestTabs;
  isDirectSocket: boolean;
  isWebSocket: boolean;
  isEventStream: boolean;
  hasPayload: boolean;
  hasTrustTokens: boolean;
  hasUnsuccessfulTrustToken: boolean;
  hasCookies: boolean;
  hasThirdPartyCookiePhaseoutIssue: boolean;
  hasDeviceBoundSessions: boolean;
  hasOverriddenHeaders: boolean;
  hasSignedExchangeErrors: boolean;
  hasOverriddenContent: boolean;
  onTabSelect: (tabId: NetworkForward.UIRequestLocation.UIRequestTabs) => void;
  onClose: () => void;
}

export interface ViewOutput {
  revealHeader?: (section: NetworkForward.UIRequestLocation.UIHeaderSection, header: string|undefined) => void;
  revealResponseBody?: (position: SourceFrame.SourceFrame.RevealPosition) => Promise<void>;
}

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, output, target) => {
  // clang-format off
  render(html`
    <devtools-tabbed-pane
      class="network-item-view flex-auto vbox"
      .headerJslog=${`${VisualLogging.toolbar('request-details').track({
        keydown: 'ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space',
      })}`}
      @select=${(e: CustomEvent<{tabId: NetworkForward.UIRequestLocation.UIRequestTabs, isUserGesture?: boolean}>) => {
        if (e.detail.isUserGesture) {
          input.onTabSelect(e.detail.tabId);
        }
      }}>
      <devtools-toolbar class="tabbed-pane-left-toolbar" slot="left">
        <dt-close-button style="margin: 0 5px;" @click=${input.onClose}></dt-close-button>
      </devtools-toolbar>
      ${input.isDirectSocket ? html`
        <div
          id=${NetworkForward.UIRequestLocation.UIRequestTabs.DIRECT_SOCKET_CONNECTION}
          class="vbox flex-auto"
          label=${i18nString(UIStrings.connectionInfo)}
          tab-tooltip=${i18nString(UIStrings.connectionInfo)}
          ?selected=${Directives.live(input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.DIRECT_SOCKET_CONNECTION)}>
          ${input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.DIRECT_SOCKET_CONNECTION ?
            widget(NetworkComponents.DirectSocketConnectionView.DirectSocketConnectionView, {request: input.request}) : nothing}
        </div>
      ` : html`
        <div
          id=${NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT}
          class="vbox flex-auto"
          label=${i18nString(UIStrings.headers)}
          tab-tooltip=${i18nString(UIStrings.headers)}
          ?selected=${Directives.live(input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT)}>
          ${input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT ? html`
            <devtools-widget
              ${widget(RequestHeadersView, {request: input.request})}
              ${widgetRef(RequestHeadersView, w => { output.revealHeader = w.revealHeader.bind(w); })}>
            </devtools-widget>
          ` : nothing}
        </div>
        ${input.hasOverriddenHeaders ? html`
          <div slot=${`suffix-${NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT}`} class="status-dot"
               title=${i18nString(UIStrings.containsOverriddenHeaders)}></div>
        ` : nothing}
      `}
      ${input.hasPayload ? html`
        <div
          id=${NetworkForward.UIRequestLocation.UIRequestTabs.PAYLOAD}
          class="vbox flex-auto"
          label=${i18nString(UIStrings.payload)}
          tab-tooltip=${i18nString(UIStrings.payload)}
          ?selected=${Directives.live(input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.PAYLOAD)}>
          ${input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.PAYLOAD ?
            widget(RequestPayloadView, {request: input.request}) : nothing}
        </div>
      ` : nothing}
      ${input.isWebSocket ? html`
        <div
          id=${NetworkForward.UIRequestLocation.UIRequestTabs.WS_FRAMES}
          class="vbox flex-auto"
          label=${i18nString(UIStrings.messages)}
          tab-tooltip=${i18nString(UIStrings.websocketMessages)}
          ?selected=${Directives.live(input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.WS_FRAMES)}>
          ${input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.WS_FRAMES ?
            widget(ResourceWebSocketFrameView, {request: input.request}) : nothing}
        </div>
      ` : input.isDirectSocket ? html`
        <div
          id=${NetworkForward.UIRequestLocation.UIRequestTabs.DIRECT_SOCKET_CHUNKS}
          class="vbox flex-auto"
          label=${i18nString(UIStrings.messages)}
          tab-tooltip=${i18nString(UIStrings.directsocketMessages)}
          ?selected=${Directives.live(input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.DIRECT_SOCKET_CHUNKS)}>
          ${input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.DIRECT_SOCKET_CHUNKS ?
            widget(ResourceDirectSocketChunkView, {request: input.request}) : nothing}
        </div>
      ` : input.isEventStream ? html`
        <div
          id=${NetworkForward.UIRequestLocation.UIRequestTabs.EVENT_SOURCE}
          class="vbox flex-auto"
          label=${i18nString(UIStrings.eventstream)}
          ?selected=${Directives.live(input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.EVENT_SOURCE)}>
          ${input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.EVENT_SOURCE ?
            widget(EventSourceMessagesView, {request: input.request}) : nothing}
        </div>
        <div
          id=${NetworkForward.UIRequestLocation.UIRequestTabs.RESPONSE}
          class="vbox flex-auto"
          label=${i18nString(UIStrings.response)}
          tab-tooltip=${i18nString(UIStrings.rawResponseData)}
          ?selected=${Directives.live(input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.RESPONSE)}>
          ${input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.RESPONSE ? html`
            <devtools-widget
              ${widget(RequestResponseView, {request: input.request})}
              ${widgetRef(RequestResponseView, w => { output.revealResponseBody = w.revealPosition.bind(w); })}>
            </devtools-widget>
          ` : nothing}
        </div>
      ` : html`
        <div
          id=${NetworkForward.UIRequestLocation.UIRequestTabs.PREVIEW}
          class="vbox flex-auto"
          label=${i18nString(UIStrings.preview)}
          tab-tooltip=${i18nString(UIStrings.responsePreview)}
          ?selected=${Directives.live(input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.PREVIEW)}>
          ${input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.PREVIEW ?
            widget(RequestPreviewView, {request: input.request}) : nothing}
        </div>
        ${input.hasSignedExchangeErrors ? html`
          <devtools-icon slot=${`icon-${NetworkForward.UIRequestLocation.UIRequestTabs.PREVIEW}`} class="small" name="cross-circle-filled"
                         title=${i18nString(UIStrings.signedexchangeError)}></devtools-icon>
        ` : nothing}
        <div
          id=${NetworkForward.UIRequestLocation.UIRequestTabs.RESPONSE}
          class="vbox flex-auto"
          label=${i18nString(UIStrings.response)}
          tab-tooltip=${i18nString(UIStrings.rawResponseData)}
          ?selected=${Directives.live(input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.RESPONSE)}>
          ${input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.RESPONSE ? html`
            <devtools-widget
              ${widget(RequestResponseView, {request: input.request})}
              ${widgetRef(RequestResponseView, w => { output.revealResponseBody = w.revealPosition.bind(w); })}>
            </devtools-widget>
          ` : nothing}
        </div>
        ${input.hasOverriddenContent ? html`
          <div slot=${`suffix-${NetworkForward.UIRequestLocation.UIRequestTabs.RESPONSE}`} class="status-dot"
               title=${i18nString(UIStrings.responseIsOverridden)}></div>
        ` : nothing}
      `}
      <div
        id=${NetworkForward.UIRequestLocation.UIRequestTabs.INITIATOR}
        class="vbox flex-auto"
        label=${i18nString(UIStrings.initiator)}
        tab-tooltip=${i18nString(UIStrings.requestInitiatorCallStack)}
        ?selected=${Directives.live(input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.INITIATOR)}>
        ${input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.INITIATOR ?
          widget(RequestInitiatorView, {request: input.request}) : nothing}
      </div>
      <div
        id=${NetworkForward.UIRequestLocation.UIRequestTabs.TIMING}
        class="vbox flex-auto"
        label=${i18nString(UIStrings.timing)}
        tab-tooltip=${i18nString(UIStrings.requestAndResponseTimeline)}
        ?selected=${Directives.live(input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.TIMING)}>
        ${input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.TIMING ?
          widget(RequestTimingView, {request: input.request, calculator: input.calculator}) : nothing}
      </div>
      ${input.hasTrustTokens ? html`
        <div
          id=${NetworkForward.UIRequestLocation.UIRequestTabs.TRUST_TOKENS}
          class="vbox flex-auto"
          label=${i18nString(UIStrings.trustTokens)}
          tab-tooltip=${i18nString(UIStrings.trustTokenOperationDetails)}
          ?selected=${Directives.live(input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.TRUST_TOKENS)}>
          ${input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.TRUST_TOKENS ?
            widget(NetworkComponents.RequestTrustTokensView.RequestTrustTokensView, {request: input.request}) : nothing}
        </div>
        ${input.hasUnsuccessfulTrustToken ? html`
          <devtools-icon slot=${`icon-${NetworkForward.UIRequestLocation.UIRequestTabs.TRUST_TOKENS}`} class="small" name="cross-circle-filled"></devtools-icon>
        ` : nothing}
      ` : nothing}
      ${input.hasCookies ? html`
        <div
          id=${NetworkForward.UIRequestLocation.UIRequestTabs.COOKIES}
          class="vbox flex-auto"
          label=${i18nString(UIStrings.cookies)}
          tab-tooltip=${i18nString(UIStrings.requestAndResponseCookies)}
          ?selected=${Directives.live(input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.COOKIES)}>
          ${input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.COOKIES ?
            widget(RequestCookiesView, {request: input.request}) : nothing}
        </div>
        ${input.hasThirdPartyCookiePhaseoutIssue ? html`
          <devtools-icon slot=${`suffix-${NetworkForward.UIRequestLocation.UIRequestTabs.COOKIES}`} class="small" name="warning-filled"
                         title=${i18nString(UIStrings.thirdPartyPhaseout)}></devtools-icon>
        ` : nothing}
      ` : nothing}
      ${input.hasDeviceBoundSessions ? html`
        <div
          id=${NetworkForward.UIRequestLocation.UIRequestTabs.DEVICE_BOUND_SESSIONS}
          class="vbox flex-auto"
          label=${i18nString(UIStrings.deviceBoundSessions)}
          tab-tooltip=${i18nString(UIStrings.deviceBoundSessions)}
          ?selected=${Directives.live(input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.DEVICE_BOUND_SESSIONS)}>
          ${input.selectedTab === NetworkForward.UIRequestLocation.UIRequestTabs.DEVICE_BOUND_SESSIONS ?
            widget(RequestDeviceBoundSessionsView, {request: input.request}) : nothing}
        </div>
      ` : nothing}
    </devtools-tabbed-pane>
  `, target);
  // clang-format on
  // Synchronously sync tabs with the rendered DOM before slotchange fires.
  target.querySelector<UI.TabbedPane.TabbedPaneElement>('devtools-tabbed-pane')?.tabs;
};

export class NetworkItemView extends UI.Widget.VBox {
  readonly #request: SDK.NetworkRequest.NetworkRequest;
  readonly #calculator: NetworkTimeCalculator.NetworkTimeCalculator;
  readonly #resourceViewTabSetting: Common.Settings.Setting<NetworkForward.UIRequestLocation.UIRequestTabs>;
  readonly #view: View;
  readonly #viewOutput: ViewOutput = {};
  #selectedTab: NetworkForward.UIRequestLocation.UIRequestTabs;
  #hasPayload = false;

  constructor(
      request: SDK.NetworkRequest.NetworkRequest,
      calculator: NetworkTimeCalculator.NetworkTimeCalculator,
      initialTab?: NetworkForward.UIRequestLocation.UIRequestTabs,
      view: View = DEFAULT_VIEW,
  ) {
    super();
    this.#request = request;
    this.#calculator = calculator;
    this.#view = view;
    const firstTab = request.resourceType() === Common.ResourceType.resourceTypes.DirectSocket ?
        NetworkForward.UIRequestLocation.UIRequestTabs.DIRECT_SOCKET_CONNECTION :
        NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT;
    this.#resourceViewTabSetting = Common.Settings.Settings.instance().createSetting('resource-view-tab', firstTab);
    this.#selectedTab = initialTab || this.#resourceViewTabSetting.get();
    this.#hasPayload = Boolean(request.queryParameters);
    void this.#updateHasPayload();
  }

  override shouldHideOnDetach(): boolean {
    return false;
  }

  override wasShown(): void {
    super.wasShown();
    this.#request.addEventListener(SDK.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.#requestHeadersChanged,
                                   this);
    this.#request.addEventListener(SDK.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED, this.requestUpdate, this);
    this.#request.addEventListener(SDK.NetworkRequest.Events.TRUST_TOKEN_RESULT_ADDED, this.requestUpdate, this);
    this.requestUpdate();
  }

  override willHide(): void {
    super.willHide();
    this.#request.removeEventListener(SDK.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.#requestHeadersChanged,
                                      this);
    this.#request.removeEventListener(SDK.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED, this.requestUpdate, this);
    this.#request.removeEventListener(SDK.NetworkRequest.Events.TRUST_TOKEN_RESULT_ADDED, this.requestUpdate, this);
  }

  override performUpdate(): void {
    const isDirectSocket = this.#request.resourceType() === Common.ResourceType.resourceTypes.DirectSocket;
    const isWebSocket = this.#request.resourceType() === Common.ResourceType.resourceTypes.WebSocket;
    const isEventStream =
        !isDirectSocket && !isWebSocket && this.#request.mimeType === Platform.MimeType.MimeType.EVENTSTREAM;
    const firstTab = isDirectSocket ? NetworkForward.UIRequestLocation.UIRequestTabs.DIRECT_SOCKET_CONNECTION :
                                      NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT;
    const hasTrustTokens = Boolean(this.#request.trustTokenParams());
    const hasCookies = this.#request.hasRequestCookies() || this.#request.responseCookies.length > 0;
    const hasDeviceBoundSessions = this.#request.getDeviceBoundSessionUsages().length > 0;

    const availableTabs = new Set<NetworkForward.UIRequestLocation.UIRequestTabs>([
      firstTab,
      NetworkForward.UIRequestLocation.UIRequestTabs.INITIATOR,
      NetworkForward.UIRequestLocation.UIRequestTabs.TIMING,
    ]);
    if (this.#hasPayload) {
      availableTabs.add(NetworkForward.UIRequestLocation.UIRequestTabs.PAYLOAD);
    }
    if (isWebSocket) {
      availableTabs.add(NetworkForward.UIRequestLocation.UIRequestTabs.WS_FRAMES);
    } else if (isDirectSocket) {
      availableTabs.add(NetworkForward.UIRequestLocation.UIRequestTabs.DIRECT_SOCKET_CHUNKS);
    } else if (isEventStream) {
      availableTabs.add(NetworkForward.UIRequestLocation.UIRequestTabs.EVENT_SOURCE);
      availableTabs.add(NetworkForward.UIRequestLocation.UIRequestTabs.RESPONSE);
    } else {
      availableTabs.add(NetworkForward.UIRequestLocation.UIRequestTabs.PREVIEW);
      availableTabs.add(NetworkForward.UIRequestLocation.UIRequestTabs.RESPONSE);
    }
    if (hasTrustTokens) {
      availableTabs.add(NetworkForward.UIRequestLocation.UIRequestTabs.TRUST_TOKENS);
    }
    if (hasCookies) {
      availableTabs.add(NetworkForward.UIRequestLocation.UIRequestTabs.COOKIES);
    }
    if (hasDeviceBoundSessions) {
      availableTabs.add(NetworkForward.UIRequestLocation.UIRequestTabs.DEVICE_BOUND_SESSIONS);
    }

    const selectedTab = availableTabs.has(this.#selectedTab) ? this.#selectedTab : firstTab;
    const trustTokenResult = this.#request.trustTokenOperationDoneEvent();

    this.#view(
        {
          request: this.#request,
          calculator: this.#calculator,
          selectedTab,
          isDirectSocket,
          isWebSocket,
          isEventStream,
          hasPayload: this.#hasPayload,
          hasTrustTokens,
          hasUnsuccessfulTrustToken:
              Boolean(trustTokenResult &&
                      !NetworkComponents.RequestTrustTokensView.statusConsideredSuccess(trustTokenResult.status)),
          hasCookies,
          hasThirdPartyCookiePhaseoutIssue: this.#request.hasThirdPartyCookiePhaseoutIssue(),
          hasDeviceBoundSessions,
          hasOverriddenHeaders: this.#request.hasOverriddenHeaders(),
          hasSignedExchangeErrors: Boolean(this.#request.signedExchangeInfo()?.errors?.length),
          hasOverriddenContent: this.#request.hasOverriddenContent,
          onTabSelect: tabId => {
            if (this.#selectedTab !== tabId) {
              this.#selectedTab = tabId;
              this.#resourceViewTabSetting.set(tabId);
              this.requestUpdate();
            }
          },
          onClose: () => {
            if (UI.ActionRegistry.ActionRegistry.instance().hasAction('network.hide-request-details')) {
              void UI.ActionRegistry.ActionRegistry.instance().getAction('network.hide-request-details').execute();
            }
          },
        },
        this.#viewOutput,
        this.contentElement,
    );
  }

  #requestHeadersChanged(): void {
    void this.#updateHasPayload();
    this.requestUpdate();
  }

  async #updateHasPayload(): Promise<void> {
    const hasPayload = Boolean(this.#request.queryParameters || await this.#request.requestFormData());
    if (this.#hasPayload !== hasPayload) {
      this.#hasPayload = hasPayload;
      // The view may have been detached while waiting for the form data;
      // `wasShown()` re-renders anyway when it is shown again.
      if (this.isShowing()) {
        this.requestUpdate();
      }
    }
  }

  request(): SDK.NetworkRequest.NetworkRequest {
    return this.#request;
  }

  async revealResponseBody(position: SourceFrame.SourceFrame.RevealPosition): Promise<void> {
    this.#selectedTab = NetworkForward.UIRequestLocation.UIRequestTabs.RESPONSE;
    this.performUpdate();
    await this.#viewOutput.revealResponseBody?.(position);
  }

  revealHeader(section: NetworkForward.UIRequestLocation.UIHeaderSection, header: string|undefined): void {
    this.#selectedTab = NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT;
    this.performUpdate();
    this.#viewOutput.revealHeader?.(section, header);
  }
}
