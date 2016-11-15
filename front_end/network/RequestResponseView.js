/*
 * Copyright (C) 2011 Google Inc. All rights reserved.
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
Network.RequestResponseView = class extends Network.RequestContentView {
  /**
   * @param {!SDK.NetworkRequest} request
   */
  constructor(request) {
    super(request);
  }

  get sourceView() {
    if (this._sourceView || !Network.RequestView.hasTextContent(this.request))
      return this._sourceView;

    var contentProvider = new Network.RequestResponseView.ContentProvider(this.request);
    var highlighterType = this.request.resourceType().canonicalMimeType() || this.request.mimeType;
    this._sourceView = SourceFrame.ResourceSourceFrame.createSearchableView(contentProvider, highlighterType);
    return this._sourceView;
  }

  /**
   * @param {string} message
   * @return {!UI.EmptyWidget}
   */
  _createMessageView(message) {
    return new UI.EmptyWidget(message);
  }

  /**
   * @override
   */
  contentLoaded() {
    if ((!this.request.content || !this.sourceView) && !this.request.contentError()) {
      if (!this._emptyWidget) {
        this._emptyWidget = this._createMessageView(Common.UIString('This request has no response data available.'));
        this._emptyWidget.show(this.element);
      }
    } else {
      if (this._emptyWidget) {
        this._emptyWidget.detach();
        delete this._emptyWidget;
      }

      if (this.request.content && this.sourceView) {
        this.sourceView.show(this.element);
      } else {
        if (!this._errorView)
          this._errorView = this._createMessageView(Common.UIString('Failed to load response data'));
        this._errorView.show(this.element);
      }
    }
  }
};

/**
 * @implements {Common.ContentProvider}
 * @unrestricted
 */
Network.RequestResponseView.ContentProvider = class {
  /**
   * @param {!SDK.NetworkRequest} request
   */
  constructor(request) {
    this._request = request;
  }

  /**
   * @override
   * @return {string}
   */
  contentURL() {
    return this._request.contentURL();
  }

  /**
   * @override
   * @return {!Common.ResourceType}
   */
  contentType() {
    return this._request.resourceType();
  }

  /**
   * @override
   * @return {!Promise<?string>}
   */
  requestContent() {
    /**
     * @param {?string} content
     * @this {Network.RequestResponseView.ContentProvider}
     */
    function decodeContent(content) {
      return this._request.contentEncoded ? window.atob(content || '') : content;
    }

    return this._request.requestContent().then(decodeContent.bind(this));
  }

  /**
   * @override
   * @param {string} query
   * @param {boolean} caseSensitive
   * @param {boolean} isRegex
   * @param {function(!Array.<!Common.ContentProvider.SearchMatch>)} callback
   */
  searchInContent(query, caseSensitive, isRegex, callback) {
    this._request.searchInContent(query, caseSensitive, isRegex, callback);
  }
};
