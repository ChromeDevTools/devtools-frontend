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

/**
 * @unrestricted
 */
Network.NetworkItemView = class extends UI.TabbedPane {
  /**
   * @param {!SDK.NetworkRequest} request
   * @param {!Network.NetworkTimeCalculator} calculator
   */
  constructor(request, calculator) {
    super();
    this.renderWithNoHeaderBackground();
    this.element.classList.add('network-item-view');

    this._resourceViewTabSetting = Common.settings.createSetting('resourceViewTab', 'preview');

    var headersView = new Network.RequestHeadersView(request);
    this.appendTab('headers', Common.UIString('Headers'), headersView);

    this.addEventListener(UI.TabbedPane.Events.TabSelected, this._tabSelected, this);

    if (request.resourceType() === Common.resourceTypes.WebSocket) {
      var frameView = new Network.ResourceWebSocketFrameView(request);
      this.appendTab('webSocketFrames', Common.UIString('Frames'), frameView);
    } else if (request.mimeType === 'text/event-stream') {
      this.appendTab('eventSource', Common.UIString('EventStream'), new Network.EventSourceMessagesView(request));
    } else {
      var responseView = new Network.RequestResponseView(request);
      var previewView = new Network.RequestPreviewView(request, responseView);
      this.appendTab('preview', Common.UIString('Preview'), previewView);
      this.appendTab('response', Common.UIString('Response'), responseView);
    }

    if (request.requestCookies || request.responseCookies) {
      this._cookiesView = new Network.RequestCookiesView(request);
      this.appendTab('cookies', Common.UIString('Cookies'), this._cookiesView);
    }

    this.appendTab('timing', Common.UIString('Timing'), new Network.RequestTimingView(request, calculator));

    this._request = request;
  }

  /**
   * @override
   */
  wasShown() {
    super.wasShown();
    this._selectTab();
  }

  /**
   * @param {string=} tabId
   */
  _selectTab(tabId) {
    if (!tabId)
      tabId = this._resourceViewTabSetting.get();

    if (!this.selectTab(tabId))
      this.selectTab('headers');
  }

  _tabSelected(event) {
    if (!event.data.isUserGesture)
      return;

    this._resourceViewTabSetting.set(event.data.tabId);
  }

  /**
   * @return {!SDK.NetworkRequest}
   */
  request() {
    return this._request;
  }
};

/**
 * @unrestricted
 */
Network.RequestContentView = class extends Network.RequestView {
  /**
   * @param {!SDK.NetworkRequest} request
   */
  constructor(request) {
    super(request);
  }

  /**
   * @override
   */
  wasShown() {
    this._ensureInnerViewShown();
  }

  _ensureInnerViewShown() {
    if (this._innerViewShowRequested)
      return;
    this._innerViewShowRequested = true;

    /**
     * @param {?string} content
     * @this {Network.RequestContentView}
     */
    function callback(content) {
      this._innerViewShowRequested = false;
      this.contentLoaded();
    }

    this.request.requestContent().then(callback.bind(this));
  }

  contentLoaded() {
    // Should be implemented by subclasses.
  }
};
