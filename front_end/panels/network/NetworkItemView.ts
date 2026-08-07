// Copyright 2010 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable @devtools/no-imperative-dom-api */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import type * as NetworkTimeCalculator from '../../models/network_time_calculator/network_time_calculator.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import {Icon} from '../../ui/kit/kit.js';
import type * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as NetworkComponents from './components/components.js';
import {EventSourceMessagesView} from './EventSourceMessagesView.js';
import {RequestCookiesView} from './RequestCookiesView.js';
import {RequestDeviceBoundSessionsView} from './RequestDeviceBoundSessionsView.js';
import {RequestHeadersView} from './RequestHeadersView.js';
import {RequestInitiatorView} from './RequestInitiatorView.js';
import {RequestPayloadView} from './RequestPayloadView.js';
import {RequestPreviewView} from './RequestPreviewView.js';
import {RequestResponseView} from './RequestResponseView.js';
import {RequestTimingView} from './RequestTimingView.js';
import {ResourceDirectSocketChunkView} from './ResourceDirectSocketChunkView.js';
import {ResourceWebSocketFrameView} from './ResourceWebSocketFrameView.js';

const UIStrings = {
  /**
   * @description Title of a tab in network item view of the Network panel for viewing HTTP request/response headers.
   */
  headers: 'Headers',
  /**
   * @description Title of a tab in network item view of the Network panel for viewing DirectSocket connection info.
   */
  connectionInfo: 'Connection info',
  /**
   * @description Title of a tab in network item view of the Network panel for viewing request payload parameters and form data.
   */
  payload: 'Payload',
  /**
   * @description Title of a tab in network item view of the Network panel for viewing WebSocket or DirectSocket messages.
   */
  messages: 'Messages',
  /**
   * @description Accessible tooltip for the WebSocket messages tab in network item view of the Network panel.
   */
  websocketMessages: 'WebSocket messages',
  /**
   * @description Accessible tooltip for the DirectSocket messages tab in network item view of the Network panel.
   */
  directsocketMessages: 'DirectSocket messages',
  /**
   * @description Title of a tab in network item view of the Network panel for viewing Server-Sent Event (EventStream) messages.
   */
  eventstream: 'EventStream',
  /**
   * @description Title of a tab in network item view of the Network panel for previewing response content.
   */
  preview: 'Preview',
  /**
   * @description Accessible tooltip for the response preview tab in network item view of the Network panel.
   */
  responsePreview: 'Response preview',
  /**
   * @description Tooltip for error icon on preview tab in network item view of the Network panel when signed exchange has errors.
   */
  signedexchangeError: 'SignedExchange error',
  /**
   * @description Title of a tab in network item view of the Network panel for viewing raw response content.
   * A Network response refers to the act of acknowledging a network request. Should not be confused with answer.
   */
  response: 'Response',
  /**
   * @description Accessible tooltip for the raw response data tab in network item view of the Network panel.
   */
  rawResponseData: 'Raw response data',
  /**
   * @description Title of a tab in network item view of the Network panel for viewing request initiator stack trace and chain.
   */
  initiator: 'Initiator',
  /**
   * @description Accessible tooltip for the request initiator tab in network item view of the Network panel.
   * An initiator is a piece of code/entity in the code that initiated/started the network request, i.e. caused
   * the network request. The 'call stack' is the location in the code where the initiation happened.
   */
  requestInitiatorCallStack: 'Request initiator call stack',
  /**
   * @description Title of a tab in network item view of the Network panel for viewing request timing breakdown.
   */
  timing: 'Timing',
  /**
   * @description Accessible tooltip for the request timing tab in network item view of the Network panel.
   */
  requestAndResponseTimeline: 'Request and response timeline',
  /**
   * @description Tooltip text for warning icon on cookies tab in network item view of the Network panel when third-party cookies are blocked.
   */
  thirdPartyPhaseout: 'Cookies blocked due to third-party cookie phaseout.',
  /**
   * @description Title of a tab in network item view of the Network panel for viewing Private State Tokens operation details.
   */
  trustTokens: 'Private state tokens',
  /**
   * @description Accessible tooltip for the Private State Tokens tab in network item view of the Network panel.
   */
  trustTokenOperationDetails: 'Private State Token operation details',
  /**
   * @description Title of a tab in network item view of the Network panel for viewing request and response cookies.
   */
  cookies: 'Cookies',
  /**
   * @description Title of the Device Bound Sessions tab in the Network panel. A
   * website may decide to create a session for a user, for example when the user
   * logs in. They can use a protocol to make it a "device bound session". That
   * means that when the session expires, it is only possible for it to be
   * extended on the device it was created on. Thus the session is considered
   * to be bound to that device. For more details on the protocol, see
   * https://github.com/w3c/webappsec-dbsc/blob/main/README.md and
   * https://w3c.github.io/webappsec-dbsc/.
   */
  deviceBoundSessions: 'Device bound sessions',
  /**
   * @description Accessible tooltip for the cookies tab in network item view of the Network panel.
   */
  requestAndResponseCookies: 'Request and response cookies',
  /**
   * @description Tooltip text for status indicator dot on headers tab in network item view of the Network panel when headers are overridden by DevTools.
   */
  containsOverriddenHeaders: 'This response contains headers which are overridden by DevTools',
  /**
   * @description Tooltip text for status indicator dot on response tab in network item view of the Network panel when response content is overridden by DevTools.
   */
  responseIsOverridden: 'This response is overridden by DevTools',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/network/NetworkItemView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const requestToResponseView = new WeakMap<SDK.NetworkRequest.NetworkRequest, RequestResponseView>();
const requestToPreviewView = new WeakMap<SDK.NetworkRequest.NetworkRequest, RequestPreviewView>();

export class NetworkItemView extends UI.TabbedPane.TabbedPane {
  #request: SDK.NetworkRequest.NetworkRequest;
  readonly #resourceViewTabSetting: Common.Settings.Setting<NetworkForward.UIRequestLocation.UIRequestTabs>;
  readonly #headersViewComponent: RequestHeadersView|undefined;
  #payloadView: RequestPayloadView|null = null;
  readonly #responseView: RequestResponseView|undefined;
  #cookiesView: RequestCookiesView|null = null;
  #deviceBoundSessionsView: RequestDeviceBoundSessionsView|null = null;
  #initialTab?: NetworkForward.UIRequestLocation.UIRequestTabs;
  readonly #firstTab: NetworkForward.UIRequestLocation.UIRequestTabs;

  constructor(
      request: SDK.NetworkRequest.NetworkRequest, calculator: NetworkTimeCalculator.NetworkTimeCalculator,
      initialTab?: NetworkForward.UIRequestLocation.UIRequestTabs) {
    super();
    this.#request = request;
    this.element.classList.add('network-item-view');
    this.headerElement().setAttribute('jslog', `${VisualLogging.toolbar('request-details').track({
                                        keydown: 'ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space',
                                      })}`);

    if (request.resourceType() === Common.ResourceType.resourceTypes.DirectSocket) {
      this.#firstTab = NetworkForward.UIRequestLocation.UIRequestTabs.DIRECT_SOCKET_CONNECTION;
      this.appendTab(
          NetworkForward.UIRequestLocation.UIRequestTabs.DIRECT_SOCKET_CONNECTION, i18nString(UIStrings.connectionInfo),
          new NetworkComponents.DirectSocketConnectionView.DirectSocketConnectionView(request),
          i18nString(UIStrings.headers));
    } else {
      this.#firstTab = NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT;
      this.#headersViewComponent = new RequestHeadersView();
      this.#headersViewComponent.request = request;
      this.appendTab(
          NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT, i18nString(UIStrings.headers),
          this.#headersViewComponent, i18nString(UIStrings.headers));
    }

    this.#resourceViewTabSetting =
        Common.Settings.Settings.instance().createSetting('resource-view-tab', this.#firstTab);

    if (this.#request.hasOverriddenHeaders()) {
      const statusDot = document.createElement('div');
      statusDot.className = 'status-dot';
      statusDot.title = i18nString(UIStrings.containsOverriddenHeaders);
      this.setSuffixElement(NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT, statusDot);
    }

    void this.maybeAppendPayloadPanel();

    this.addEventListener(UI.TabbedPane.Events.TabSelected, this.tabSelected, this);

    if (request.resourceType() === Common.ResourceType.resourceTypes.WebSocket) {
      const frameView = new ResourceWebSocketFrameView(request);
      this.appendTab(
          NetworkForward.UIRequestLocation.UIRequestTabs.WS_FRAMES, i18nString(UIStrings.messages), frameView,
          i18nString(UIStrings.websocketMessages));
    } else if (request.resourceType() === Common.ResourceType.resourceTypes.DirectSocket) {
      this.appendTab(
          NetworkForward.UIRequestLocation.UIRequestTabs.DIRECT_SOCKET_CHUNKS, i18nString(UIStrings.messages),
          new ResourceDirectSocketChunkView(request), i18nString(UIStrings.directsocketMessages));
    } else if (request.mimeType === Platform.MimeType.MimeType.EVENTSTREAM) {
      this.appendTab(
          NetworkForward.UIRequestLocation.UIRequestTabs.EVENT_SOURCE, i18nString(UIStrings.eventstream),
          new EventSourceMessagesView(request));
      this.#responseView = requestToResponseView.get(request) ?? new RequestResponseView(request);
      requestToResponseView.set(request, this.#responseView);
      this.appendTab(
          NetworkForward.UIRequestLocation.UIRequestTabs.RESPONSE, i18nString(UIStrings.response), this.#responseView,
          i18nString(UIStrings.rawResponseData));
    } else {
      this.#responseView = requestToResponseView.get(request) ?? new RequestResponseView(request);
      requestToResponseView.set(request, this.#responseView);
      const previewView = requestToPreviewView.get(request) ?? new RequestPreviewView(request);
      requestToPreviewView.set(request, previewView);
      this.appendTab(
          NetworkForward.UIRequestLocation.UIRequestTabs.PREVIEW, i18nString(UIStrings.preview), previewView,
          i18nString(UIStrings.responsePreview));
      const signedExchangeInfo = request.signedExchangeInfo();
      if (signedExchangeInfo?.errors?.length) {
        const icon = new Icon();
        icon.name = 'cross-circle-filled';
        icon.classList.add('small');
        UI.Tooltip.Tooltip.install(icon, i18nString(UIStrings.signedexchangeError));
        this.setTabIcon(NetworkForward.UIRequestLocation.UIRequestTabs.PREVIEW, icon);
      }
      this.appendTab(
          NetworkForward.UIRequestLocation.UIRequestTabs.RESPONSE, i18nString(UIStrings.response), this.#responseView,
          i18nString(UIStrings.rawResponseData));

      if (this.#request.hasOverriddenContent) {
        const statusDot = document.createElement('div');
        statusDot.className = 'status-dot';
        statusDot.title = i18nString(UIStrings.responseIsOverridden);
        this.setSuffixElement(NetworkForward.UIRequestLocation.UIRequestTabs.RESPONSE, statusDot);
      }
    }

    this.appendTab(
        NetworkForward.UIRequestLocation.UIRequestTabs.INITIATOR, i18nString(UIStrings.initiator),
        new RequestInitiatorView(request), i18nString(UIStrings.requestInitiatorCallStack));

    this.appendTab(
        NetworkForward.UIRequestLocation.UIRequestTabs.TIMING, i18nString(UIStrings.timing),
        RequestTimingView.create(request, calculator), i18nString(UIStrings.requestAndResponseTimeline));

    if (request.trustTokenParams()) {
      const trustTokensView = new NetworkComponents.RequestTrustTokensView.RequestTrustTokensView();
      trustTokensView.request = request;
      this.appendTab(
          NetworkForward.UIRequestLocation.UIRequestTabs.TRUST_TOKENS, i18nString(UIStrings.trustTokens),
          trustTokensView, i18nString(UIStrings.trustTokenOperationDetails));
    }

    this.#initialTab = initialTab || this.#resourceViewTabSetting.get();
    // Selecting tabs should not be handled by the super class.
    this.setAutoSelectFirstItemOnShow(false);
  }

  override wasShown(): void {
    super.wasShown();
    this.#request.addEventListener(SDK.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.requestHeadersChanged, this);
    this.#request.addEventListener(
        SDK.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED, this.maybeAppendCookieResponsePanels, this);
    this.#request.addEventListener(
        SDK.NetworkRequest.Events.TRUST_TOKEN_RESULT_ADDED, this.maybeShowErrorIconInTrustTokenTabHeader, this);
    this.maybeAppendCookieResponsePanels();
    this.maybeShowErrorIconInTrustTokenTabHeader();

    // Only select the initial tab the first time the view is shown after construction.
    // When the view is re-shown (without re-constructing) users or revealers might have changed
    // the selected tab in the mean time. Show the previously selected tab in that
    // case instead, by simply doing nothing.
    if (this.#initialTab) {
      this.#selectTab(this.#initialTab);
      this.#initialTab = undefined;
    }

  }

  override willHide(): void {
    super.willHide();
    this.#request.removeEventListener(
        SDK.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.requestHeadersChanged, this);
    this.#request.removeEventListener(
        SDK.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED, this.maybeAppendCookieResponsePanels, this);
    this.#request.removeEventListener(
        SDK.NetworkRequest.Events.TRUST_TOKEN_RESULT_ADDED, this.maybeShowErrorIconInTrustTokenTabHeader, this);
  }

  private async requestHeadersChanged(): Promise<void> {
    this.maybeAppendCookiesPanel();
    void this.maybeAppendPayloadPanel();
  }

  private maybeAppendCookieResponsePanels(): void {
    this.maybeAppendCookiesPanel();
    this.maybeAppendDeviceBoundSessionsPanel();
  }

  private maybeAppendCookiesPanel(): void {
    const cookiesPresent = this.#request.hasRequestCookies() || this.#request.responseCookies.length > 0;
    console.assert(cookiesPresent || !this.#cookiesView, 'Cookies were introduced in headers and then removed!');
    if (cookiesPresent && !this.#cookiesView) {
      this.#cookiesView = new RequestCookiesView(this.#request);
      this.appendTab(
          NetworkForward.UIRequestLocation.UIRequestTabs.COOKIES, i18nString(UIStrings.cookies), this.#cookiesView,
          i18nString(UIStrings.requestAndResponseCookies));
    }
    if (this.#request.hasThirdPartyCookiePhaseoutIssue()) {
      const icon = new Icon();
      icon.name = 'warning-filled';
      icon.classList.add('small');
      icon.title = i18nString(UIStrings.thirdPartyPhaseout);
      this.setTrailingTabIcon(NetworkForward.UIRequestLocation.UIRequestTabs.COOKIES, icon);
    }
  }

  private maybeAppendDeviceBoundSessionsPanel(): void {
    const deviceBoundSessionsPresent = this.#request.getDeviceBoundSessionUsages().length > 0;
    if (deviceBoundSessionsPresent && !this.#deviceBoundSessionsView) {
      this.#deviceBoundSessionsView = new RequestDeviceBoundSessionsView(this.#request);
      this.appendTab(
          NetworkForward.UIRequestLocation.UIRequestTabs.DEVICE_BOUND_SESSIONS,
          i18nString(UIStrings.deviceBoundSessions), this.#deviceBoundSessionsView,
          i18nString(UIStrings.deviceBoundSessions));
    }
  }

  private async maybeAppendPayloadPanel(): Promise<void> {
    if (this.hasTab('payload')) {
      return;
    }
    if (this.#request.queryParameters || await this.#request.requestFormData()) {
      this.#payloadView = new RequestPayloadView();
      this.#payloadView.request = this.#request;
      this.appendTab(
          NetworkForward.UIRequestLocation.UIRequestTabs.PAYLOAD, i18nString(UIStrings.payload), this.#payloadView,
          i18nString(UIStrings.payload), /* userGesture=*/ void 0,
          /* isCloseable=*/ void 0, /* isPreviewFeature=*/ void 0, /* index=*/ 1);
    }
  }

  private maybeShowErrorIconInTrustTokenTabHeader(): void {
    const trustTokenResult = this.#request.trustTokenOperationDoneEvent();
    if (trustTokenResult &&
        !NetworkComponents.RequestTrustTokensView.statusConsideredSuccess(trustTokenResult.status)) {
      const icon = new Icon();
      icon.name = 'cross-circle-filled';
      icon.classList.add('small');
      this.setTabIcon(NetworkForward.UIRequestLocation.UIRequestTabs.TRUST_TOKENS, icon);
    }
  }

  #selectTab(tabId: NetworkForward.UIRequestLocation.UIRequestTabs): void {
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

  private tabSelected(event: Common.EventTarget.EventTargetEvent<UI.TabbedPane.EventData>): void {
    if (!event.data.isUserGesture) {
      return;
    }
    this.#resourceViewTabSetting.set(event.data.tabId as NetworkForward.UIRequestLocation.UIRequestTabs);
  }

  request(): SDK.NetworkRequest.NetworkRequest {
    return this.#request;
  }

  async revealResponseBody(position: SourceFrame.SourceFrame.RevealPosition): Promise<void> {
    this.#selectTab(NetworkForward.UIRequestLocation.UIRequestTabs.RESPONSE);
    await this.#responseView?.revealPosition(position);
  }

  revealHeader(section: NetworkForward.UIRequestLocation.UIHeaderSection, header: string|undefined): void {
    this.#selectTab(NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT);
    this.#headersViewComponent?.revealHeader(section, header);
  }

  getHeadersViewComponent(): RequestHeadersView|undefined {
    return this.#headersViewComponent;
  }
}
