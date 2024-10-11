/*
 * Copyright (C) 2010 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Platform from '../../core/platform/platform.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as NetworkForward from '../../panels/network/forward/forward.js';
import * as IconButton from '../../ui/components/icon_button/icon_button.js';
import * as LegacyWrapper from '../../ui/components/legacy_wrapper/legacy_wrapper.js';
import type * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import * as NetworkComponents from './components/components.js';
import {EventSourceMessagesView} from './EventSourceMessagesView.js';
import type {NetworkTimeCalculator} from './NetworkTimeCalculator.js';
import {RequestCookiesView} from './RequestCookiesView.js';
import {RequestInitiatorView} from './RequestInitiatorView.js';
import {RequestPayloadView} from './RequestPayloadView.js';
import {RequestPreviewView} from './RequestPreviewView.js';
import {RequestResponseView} from './RequestResponseView.js';
import {RequestTimingView} from './RequestTimingView.js';
import {ResourceWebSocketFrameView} from './ResourceWebSocketFrameView.js';

const UIStrings = {
  /**
   *@description Text for network request headers
   */
  headers: 'Headers',
  /**
   *@description Text in Network Item View of the Network panel
   */
  payload: 'Payload',
  /**
   *@description Text in Network Item View of the Network panel
   */
  messages: 'Messages',
  /**
   *@description Text in Network Item View of the Network panel
   */
  websocketMessages: 'WebSocket messages',
  /**
   *@description Text in Network Item View of the Network panel
   */
  eventstream: 'EventStream',
  /**
   *@description Text for previewing items
   */
  preview: 'Preview',
  /**
   *@description Text in Network Item View of the Network panel
   */
  responsePreview: 'Response preview',
  /**
   *@description Icon title in Network Item View of the Network panel
   */
  signedexchangeError: 'SignedExchange error',
  /**
   *@description Title of a tab in the Network panel. A Network response refers to the act of acknowledging a
  network request. Should not be confused with answer.
   */
  response: 'Response',
  /**
   *@description Text in Network Item View of the Network panel
   */
  rawResponseData: 'Raw response data',
  /**
   *@description Text for the initiator of something
   */
  initiator: 'Initiator',
  /**
   * @description Tooltip for initiator view in Network panel. An initiator is a piece of code/entity
   * in the code that initiated/started the network request, i.e. caused the network request. The 'call
   * stack' is the location in the code where the initiation happened.
   */
  requestInitiatorCallStack: 'Request initiator call stack',
  /**
   *@description Title of a tab in Network Item View of the Network panel.
   *The tab displays the duration breakdown of a network request.
   */
  timing: 'Timing',
  /**
   *@description Text in Network Item View of the Network panel
   */
  requestAndResponseTimeline: 'Request and response timeline',
  /**
   *@description Tooltip to explain the warning icon of the Cookies panel
   */
  thirdPartyPhaseout: 'Cookies blocked due to third-party cookie phaseout.',
  /**
   *@description Label of a tab in the network panel. Previously known as 'Trust Tokens'.
   */
  trustTokens: 'Private state tokens',
  /**
   *@description Title of the Private State Token tab in the Network panel. Previously known as 'Trust Token tab'.
   */
  trustTokenOperationDetails: 'Private State Token operation details',
  /**
   *@description Text for web cookies
   */
  cookies: 'Cookies',
  /**
   *@description Text in Network Item View of the Network panel
   */
  requestAndResponseCookies: 'Request and response cookies',
  /**
   *@description Tooltip text explaining that DevTools has overridden the response's headers
   */
  containsOverriddenHeaders: 'This response contains headers which are overridden by DevTools',
  /**
   *@description Tooltip text explaining that DevTools has overridden the response
   */
  responseIsOverridden: 'This response is overridden by DevTools',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/NetworkItemView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class NetworkItemView extends UI.TabbedPane.TabbedPane {
  private requestInternal: SDK.NetworkRequest.NetworkRequest;
  private readonly resourceViewTabSetting: Common.Settings.Setting<NetworkForward.UIRequestLocation.UIRequestTabs>;
  private readonly headersViewComponent: NetworkComponents.RequestHeadersView.RequestHeadersView;
  private payloadView: RequestPayloadView|null;
  private readonly responseView: RequestResponseView|undefined;
  private cookiesView: RequestCookiesView|null;
  private initialTab?: NetworkForward.UIRequestLocation.UIRequestTabs;

  constructor(
      request: SDK.NetworkRequest.NetworkRequest, calculator: NetworkTimeCalculator,
      initialTab?: NetworkForward.UIRequestLocation.UIRequestTabs) {
    super();
    this.requestInternal = request;
    this.element.classList.add('network-item-view');
    this.headerElement().setAttribute('jslog', `${VisualLogging.toolbar('request-details').track({
                                        keydown: 'ArrowUp|ArrowLeft|ArrowDown|ArrowRight|Enter|Space',
                                      })}`);

    const headersTab = NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT;
    this.resourceViewTabSetting = Common.Settings.Settings.instance().createSetting(
        'resource-view-tab', NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT);

    this.headersViewComponent = new NetworkComponents.RequestHeadersView.RequestHeadersView(request);
    this.appendTab(
        headersTab, i18nString(UIStrings.headers),
        LegacyWrapper.LegacyWrapper.legacyWrapper(UI.Widget.VBox, this.headersViewComponent),
        i18nString(UIStrings.headers));

    if (this.requestInternal.hasOverriddenHeaders()) {
      const icon = new IconButton.Icon.Icon();
      icon.data =
          {iconName: 'small-status-dot', color: 'var(--sys-color-purple-bright)', width: '16px', height: '16px'};
      icon.title = i18nString(UIStrings.containsOverriddenHeaders);
      this.setTabIcon(NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT, icon);
    }

    this.payloadView = null;
    void this.maybeAppendPayloadPanel();

    this.addEventListener(UI.TabbedPane.Events.TabSelected, this.tabSelected, this);

    if (request.resourceType() === Common.ResourceType.resourceTypes.WebSocket) {
      const frameView = new ResourceWebSocketFrameView(request);
      this.appendTab(
          NetworkForward.UIRequestLocation.UIRequestTabs.WS_FRAMES, i18nString(UIStrings.messages), frameView,
          i18nString(UIStrings.websocketMessages));
    } else if (request.mimeType === Platform.MimeType.MimeType.EVENTSTREAM) {
      this.appendTab(
          NetworkForward.UIRequestLocation.UIRequestTabs.EVENT_SOURCE, i18nString(UIStrings.eventstream),
          new EventSourceMessagesView(request));

      this.responseView = new RequestResponseView(request);
      this.appendTab(
          NetworkForward.UIRequestLocation.UIRequestTabs.RESPONSE, i18nString(UIStrings.response), this.responseView,
          i18nString(UIStrings.rawResponseData));
    } else {
      this.responseView = new RequestResponseView(request);
      const previewView = new RequestPreviewView(request);
      this.appendTab(
          NetworkForward.UIRequestLocation.UIRequestTabs.PREVIEW, i18nString(UIStrings.preview), previewView,
          i18nString(UIStrings.responsePreview));
      const signedExchangeInfo = request.signedExchangeInfo();
      if (signedExchangeInfo && signedExchangeInfo.errors && signedExchangeInfo.errors.length) {
        const icon = new IconButton.Icon.Icon();
        icon.data = {iconName: 'cross-circle-filled', color: 'var(--icon-error)', width: '14px', height: '14px'};
        UI.Tooltip.Tooltip.install(icon, i18nString(UIStrings.signedexchangeError));
        this.setTabIcon(NetworkForward.UIRequestLocation.UIRequestTabs.PREVIEW, icon);
      }
      this.appendTab(
          NetworkForward.UIRequestLocation.UIRequestTabs.RESPONSE, i18nString(UIStrings.response), this.responseView,
          i18nString(UIStrings.rawResponseData));

      if (this.requestInternal.hasOverriddenContent) {
        const icon = new IconButton.Icon.Icon();
        icon.title = i18nString(UIStrings.responseIsOverridden);
        icon.data =
            {iconName: 'small-status-dot', color: 'var(--sys-color-purple-bright)', width: '16px', height: '16px'};
        this.setTabIcon(NetworkForward.UIRequestLocation.UIRequestTabs.RESPONSE, icon);
      }
    }

    this.appendTab(
        NetworkForward.UIRequestLocation.UIRequestTabs.INITIATOR, i18nString(UIStrings.initiator),
        new RequestInitiatorView(request), i18nString(UIStrings.requestInitiatorCallStack));

    this.appendTab(
        NetworkForward.UIRequestLocation.UIRequestTabs.TIMING, i18nString(UIStrings.timing),
        new RequestTimingView(request, calculator), i18nString(UIStrings.requestAndResponseTimeline));

    if (request.trustTokenParams()) {
      this.appendTab(
          NetworkForward.UIRequestLocation.UIRequestTabs.TRUST_TOKENS, i18nString(UIStrings.trustTokens),
          LegacyWrapper.LegacyWrapper.legacyWrapper(
              UI.Widget.VBox, new NetworkComponents.RequestTrustTokensView.RequestTrustTokensView(request)),
          i18nString(UIStrings.trustTokenOperationDetails));
    }

    this.cookiesView = null;

    this.initialTab = initialTab || this.resourceViewTabSetting.get();
    // Selecting tabs should not be handled by the super class.
    this.setAutoSelectFirstItemOnShow(false);
  }

  override wasShown(): void {
    super.wasShown();
    this.requestInternal.addEventListener(
        SDK.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.requestHeadersChanged, this);
    this.requestInternal.addEventListener(
        SDK.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED, this.maybeAppendCookiesPanel, this);
    this.requestInternal.addEventListener(
        SDK.NetworkRequest.Events.TRUST_TOKEN_RESULT_ADDED, this.maybeShowErrorIconInTrustTokenTabHeader, this);
    this.maybeAppendCookiesPanel();
    this.maybeShowErrorIconInTrustTokenTabHeader();

    // Only select the initial tab the first time the view is shown after construction.
    // When the view is re-shown (without re-constructing) users or revealers might have changed
    // the selected tab in the mean time. Show the previously selected tab in that
    // case instead, by simply doing nohting.
    if (this.initialTab) {
      this.selectTabInternal(this.initialTab);
      this.initialTab = undefined;
    }
  }

  override willHide(): void {
    this.requestInternal.removeEventListener(
        SDK.NetworkRequest.Events.REQUEST_HEADERS_CHANGED, this.requestHeadersChanged, this);
    this.requestInternal.removeEventListener(
        SDK.NetworkRequest.Events.RESPONSE_HEADERS_CHANGED, this.maybeAppendCookiesPanel, this);
    this.requestInternal.removeEventListener(
        SDK.NetworkRequest.Events.TRUST_TOKEN_RESULT_ADDED, this.maybeShowErrorIconInTrustTokenTabHeader, this);
  }

  private async requestHeadersChanged(): Promise<void> {
    this.maybeAppendCookiesPanel();
    void this.maybeAppendPayloadPanel();
  }

  private maybeAppendCookiesPanel(): void {
    const cookiesPresent = this.requestInternal.hasRequestCookies() || this.requestInternal.responseCookies.length > 0;
    console.assert(cookiesPresent || !this.cookiesView, 'Cookies were introduced in headers and then removed!');
    if (cookiesPresent && !this.cookiesView) {
      this.cookiesView = new RequestCookiesView(this.requestInternal);
      this.appendTab(
          NetworkForward.UIRequestLocation.UIRequestTabs.COOKIES, i18nString(UIStrings.cookies), this.cookiesView,
          i18nString(UIStrings.requestAndResponseCookies));
    }
    if (this.requestInternal.hasThirdPartyCookiePhaseoutIssue()) {
      const icon = new IconButton.Icon.Icon();
      icon.data = {iconName: 'warning-filled', color: 'var(--icon-warning)', width: '14px', height: '14px'};
      icon.title = i18nString(UIStrings.thirdPartyPhaseout);
      this.setTabIcon(NetworkForward.UIRequestLocation.UIRequestTabs.COOKIES, icon);
    }
  }

  private async maybeAppendPayloadPanel(): Promise<void> {
    if (this.hasTab('payload')) {
      return;
    }
    if (this.requestInternal.queryParameters || await this.requestInternal.requestFormData()) {
      this.payloadView = new RequestPayloadView(this.requestInternal);
      this.appendTab(
          NetworkForward.UIRequestLocation.UIRequestTabs.PAYLOAD, i18nString(UIStrings.payload), this.payloadView,
          i18nString(UIStrings.payload), /* userGesture=*/ void 0,
          /* isCloseable=*/ void 0, /* isPreviewFeature=*/ void 0, /* index=*/ 1);
    }
  }

  private maybeShowErrorIconInTrustTokenTabHeader(): void {
    const trustTokenResult = this.requestInternal.trustTokenOperationDoneEvent();
    if (trustTokenResult &&
        !NetworkComponents.RequestTrustTokensView.statusConsideredSuccess(trustTokenResult.status)) {
      const icon = new IconButton.Icon.Icon();
      icon.data = {iconName: 'cross-circle-filled', color: 'var(--icon-error)', width: '14px', height: '14px'};
      this.setTabIcon(NetworkForward.UIRequestLocation.UIRequestTabs.TRUST_TOKENS, icon);
    }
  }

  private selectTabInternal(tabId: NetworkForward.UIRequestLocation.UIRequestTabs): void {
    if (!this.selectTab(tabId)) {
      // maybeAppendPayloadPanel might cause payload tab to appear asynchronously, so
      // it makes sense to retry on the next tick
      window.setTimeout(() => {
        if (!this.selectTab(tabId)) {
          this.selectTab(NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT);
        }
      }, 0);
    }
  }

  private tabSelected(event: Common.EventTarget.EventTargetEvent<UI.TabbedPane.EventData>): void {
    if (!event.data.isUserGesture) {
      return;
    }
    this.resourceViewTabSetting.set(event.data.tabId as NetworkForward.UIRequestLocation.UIRequestTabs);
  }

  request(): SDK.NetworkRequest.NetworkRequest {
    return this.requestInternal;
  }

  async revealResponseBody(position: SourceFrame.SourceFrame.RevealPosition): Promise<void> {
    this.selectTabInternal(NetworkForward.UIRequestLocation.UIRequestTabs.RESPONSE);
    await this.responseView?.revealPosition(position);
  }

  revealHeader(section: NetworkForward.UIRequestLocation.UIHeaderSection, header: string|undefined): void {
    this.selectTabInternal(NetworkForward.UIRequestLocation.UIRequestTabs.HEADERS_COMPONENT);
    this.headersViewComponent.revealHeader(section, header);
  }

  getHeadersViewComponent(): NetworkComponents.RequestHeadersView.RequestHeadersView {
    return this.headersViewComponent;
  }
}
