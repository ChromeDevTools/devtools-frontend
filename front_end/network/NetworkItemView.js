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

export default class NetworkItemView extends UI.TabbedPane {
  /**
   * @param {!SDK.NetworkRequest} request
   * @param {!Network.NetworkTimeCalculator} calculator
   */
  constructor(request, calculator) {
    super();
    this._request = request;
    this.element.classList.add('network-item-view');

    this._resourceViewTabSetting = Common.settings.createSetting('resourceViewTab', 'preview');

    this._headersView = new Network.RequestHeadersView(request);
    this.appendTab(
        Tabs.Headers, Common.UIString('Headers'), this._headersView, Common.UIString('Headers and request body'));

    this.addEventListener(UI.TabbedPane.Events.TabSelected, this._tabSelected, this);

    if (request.resourceType() === Common.resourceTypes.WebSocket) {
      const frameView = new Network.ResourceWebSocketFrameView(request);
      this.appendTab(Tabs.WsFrames, Common.UIString('Messages'), frameView, Common.UIString('WebSocket messages'));
    } else if (request.mimeType === 'text/event-stream') {
      this.appendTab(Tabs.EventSource, Common.UIString('EventStream'), new Network.EventSourceMessagesView(request));
    } else {
      this._responseView = new Network.RequestResponseView(request);
      const previewView = new Network.RequestPreviewView(request);
      this.appendTab(Tabs.Preview, Common.UIString('Preview'), previewView, Common.UIString('Response preview'));
      if (request.signedExchangeInfo() && request.signedExchangeInfo().errors &&
          request.signedExchangeInfo().errors.length) {
        const icon = UI.Icon.create('smallicon-error');
        icon.title = Common.UIString('SignedExchange error');
        this.setTabIcon(Tabs.Preview, icon);
      }
      this.appendTab(
          Tabs.Response, Common.UIString('Response'), this._responseView, Common.UIString('Raw response data'));
    }

    this.appendTab(
        Tabs.Initiator, ls`Initiator`, new Network.RequestInitiatorView(request), ls`Request initiator call stack`);

    this.appendTab(
        Tabs.Timing, Common.UIString('Timing'), new Network.RequestTimingView(request, calculator),
        Common.UIString('Request and response timeline'));

    /** @type {?Network.RequestCookiesView} */
    this._cookiesView = null;
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    this._request.addEventListener(
        SDK.NetworkRequest.Events.RequestHeadersChanged, this._maybeAppendCookiesPanel, this);
    this._request.addEventListener(
        SDK.NetworkRequest.Events.ResponseHeadersChanged, this._maybeAppendCookiesPanel, this);
    this._maybeAppendCookiesPanel();
    this._selectTab();
  }

  /**
   * @override
   */
  willHide() {
    this._request.removeEventListener(
        SDK.NetworkRequest.Events.RequestHeadersChanged, this._maybeAppendCookiesPanel, this);
    this._request.removeEventListener(
        SDK.NetworkRequest.Events.ResponseHeadersChanged, this._maybeAppendCookiesPanel, this);
  }

  _maybeAppendCookiesPanel() {
    const cookiesPresent = this._request.requestCookies.length || this._request.responseCookies.length;
    console.assert(cookiesPresent || !this._cookiesView, 'Cookies were introduced in headers and then removed!');
    if (cookiesPresent && !this._cookiesView) {
      this._cookiesView = new Network.RequestCookiesView(this._request);
      this.appendTab(
          Tabs.Cookies, Common.UIString('Cookies'), this._cookiesView, Common.UIString('Request and response cookies'));
    }
  }

  /**
   * @param {string=} tabId
   */
  _selectTab(tabId) {
    if (!tabId) {
      tabId = this._resourceViewTabSetting.get();
    }

    if (!this.selectTab(tabId)) {
      this.selectTab('headers');
    }
  }

  _tabSelected(event) {
    if (!event.data.isUserGesture) {
      return;
    }
    this._resourceViewTabSetting.set(event.data.tabId);
  }

  /**
   * @return {!SDK.NetworkRequest}
   */
  request() {
    return this._request;
  }

  /**
   * @param {number=} line
   * @return {!Promise}
   */
  async revealResponseBody(line) {
    this._selectTab(Tabs.Response);
    if (this._responseView && typeof line === 'number') {
      await this._responseView.revealLine(/** @type {number} */ (line));
    }
  }

  /**
   * @param {string} header
   */
  revealRequestHeader(header) {
    this._selectTab(Tabs.Headers);
    this._headersView.revealRequestHeader(header);
  }

  /**
   * @param {string} header
   */
  revealResponseHeader(header) {
    this._selectTab(Tabs.Headers);
    this._headersView.revealResponseHeader(header);
  }
}

/**
 * @enum {string}
 */
export const Tabs = {
  Cookies: 'cookies',
  EventSource: 'eventSource',
  Headers: 'headers',
  Initiator: 'initiator',
  Preview: 'preview',
  Response: 'response',
  Timing: 'timing',
  WsFrames: 'webSocketFrames'
};

/* Legacy exported object */
self.Network = self.Network || {};

/* Legacy exported object */
Network = Network || {};

/**
 * @constructor
 */
Network.NetworkItemView = NetworkItemView;

/**
 * @enum {string}
 */
Network.NetworkItemView.Tabs = Tabs;
