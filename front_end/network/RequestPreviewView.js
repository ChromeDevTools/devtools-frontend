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

Network.RequestPreviewView = class extends Network.RequestView {
  /**
   * @param {!SDK.NetworkRequest} request
   */
  constructor(request) {
    super(request);
    /** @type {?Promise<!UI.Widget>} */
    this._previewViewPromise = null;
  }

  /**
   * @return {!UI.EmptyWidget}
   */
  _createEmptyWidget() {
    return this._createMessageView(Common.UIString('This request has no preview available.'));
  }

  /**
   * @param {string} message
   * @return {!UI.EmptyWidget}
   */
  _createMessageView(message) {
    return new UI.EmptyWidget(message);
  }

  /**
   * @param {string} content
   * @param {string} mimeType
   * @return {?UI.SearchableView}
   */
  _xmlView(content, mimeType) {
    var parsedXML = SourceFrame.XMLView.parseXML(content, mimeType);
    return parsedXML ? SourceFrame.XMLView.createSearchableView(parsedXML) : null;
  }

  /**
   * @param {string} content
   * @return {!Promise<?UI.SearchableView>}
   */
  async _jsonView(content) {
    // We support non-strict JSON parsing by parsing an AST tree which is why we offload it to a worker.
    var parsedJSON = await SourceFrame.JSONView.parseJSON(content);
    if (!parsedJSON || typeof parsedJSON.data !== 'object')
      return null;
    return SourceFrame.JSONView.createSearchableView(/** @type {!SourceFrame.ParsedJSON} */ (parsedJSON));
  }

  /**
   * @override
   */
  wasShown() {
    this._showPreviewView();
  }

  async _showPreviewView() {
    if (!this._previewViewPromise)
      this._previewViewPromise = this._createPreviewView();
    var previewView = await this._previewViewPromise;
    if (this.element.contains(previewView.element))
      return;

    previewView.show(this.element);

    if (previewView instanceof UI.SimpleView) {
      var toolbar = new UI.Toolbar('network-item-preview-toolbar', this.element);
      for (var item of previewView.syncToolbarItems())
        toolbar.appendToolbarItem(item);
    }
  }

  /**
   * @param {!SDK.NetworkRequest.ContentData} contentData
   * @return {?Network.RequestHTMLView}
   */
  _htmlErrorPreview(contentData) {
    // We can assume the status code has been set already because fetching contentData should wait for request to be
    // finished.
    if (!this.request.hasErrorStatusCode() && this.request.resourceType() !== Common.resourceTypes.XHR)
      return null;

    var whitelist = new Set(['text/html', 'text/plain', 'application/xhtml+xml']);
    if (!whitelist.has(this.request.mimeType))
      return null;

    var dataURL = Common.ContentProvider.contentAsDataURL(
        contentData.content, this.request.mimeType, contentData.encoded, contentData.encoded ? 'utf-8' : null);
    if (dataURL === null)
      return null;

    return new Network.RequestHTMLView(this.request, dataURL);
  }

  /**
   * @return {!Promise<!UI.Widget>}
   */
  async _createPreviewView() {
    var contentData = await this.request.contentData();
    if (contentData.error)
      return this._createMessageView(Common.UIString('Failed to load response data'));

    var content = contentData.content || '';
    if (contentData.encoded)
      content = window.atob(content);
    if (!content)
      return this._createEmptyWidget();

    var xmlView = this._xmlView(content, this.request.mimeType);
    if (xmlView)
      return xmlView;

    var jsonView = await this._jsonView(content);
    if (jsonView)
      return jsonView;

    var htmlErrorPreview = this._htmlErrorPreview(contentData);
    if (htmlErrorPreview)
      return htmlErrorPreview;

    var sourceView = await Network.RequestResponseView.sourceViewForRequest(this.request);
    if (sourceView)
      return sourceView;

    if (this.request.resourceType() === Common.resourceTypes.Other)
      return this._createEmptyWidget();

    return Network.RequestView.nonSourceViewForRequest(this.request);
  }
};
