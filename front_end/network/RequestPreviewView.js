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

Network.RequestPreviewView = class extends Network.RequestResponseView {
  /**
   * @param {!SDK.NetworkRequest} request
   */
  constructor(request) {
    super(request);
  }

  /**
   * @override
   * @protected
   * @return {!Promise<?UI.Widget>}
   */
  async showPreview() {
    var view = await super.showPreview();
    if (!(view instanceof UI.SimpleView))
      return view;
    var toolbar = new UI.Toolbar('network-item-preview-toolbar', this.element);
    for (var item of view.syncToolbarItems())
      toolbar.appendToolbarItem(item);
    return view;
  }

  /**
   * @return {!Promise<?UI.Widget>}
   */
  async _htmlErrorPreview() {
    var contentData = await this.request.contentData();
    if (contentData.error)
      return new UI.EmptyWidget(Common.UIString('Failed to load response data'));

    // We can assume the status code has been set already because fetching contentData should wait for request to be
    // finished.
    if (!this.request.hasErrorStatusCode() && this.request.resourceType() !== Common.resourceTypes.XHR)
      return null;

    var whitelist = new Set(['text/html', 'text/plain', 'application/xhtml+xml']);
    if (!whitelist.has(this.request.mimeType))
      return null;

    var dataURL = Common.ContentProvider.contentAsDataURL(
        contentData.content, this.request.mimeType, contentData.encoded, contentData.encoded ? 'utf-8' : null);
    return dataURL ? new Network.RequestHTMLView(dataURL) : null;
  }

  /**
   * @override
   * @return {!Promise<!UI.Widget>}
   */
  async createPreview() {
    var htmlErrorPreview = await this._htmlErrorPreview();
    if (htmlErrorPreview)
      return htmlErrorPreview;

    // Try provider before the source view - so JSON and XML are not shown in generic editor
    var provided = await SourceFrame.PreviewFactory.createPreview(this.request, this.request.mimeType);
    if (provided)
      return provided;

    var sourceView = await Network.RequestResponseView.sourceViewForRequest(this.request);
    if (sourceView)
      return sourceView;
    return new UI.EmptyWidget(Common.UIString('Preview not available'));
  }
};
