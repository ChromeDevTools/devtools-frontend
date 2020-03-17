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

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';  // eslint-disable-line no-unused-vars
import * as SourceFrame from '../source_frame/source_frame.js';
import * as TextUtils from '../text_utils/text_utils.js';
import * as UI from '../ui/ui.js';

import {RequestHTMLView} from './RequestHTMLView.js';
import {RequestResponseView} from './RequestResponseView.js';
import {SignedExchangeInfoView} from './SignedExchangeInfoView.js';

export class RequestPreviewView extends RequestResponseView {
  /**
   * @param {!SDK.NetworkRequest.NetworkRequest} request
   */
  constructor(request) {
    super(request);
  }

  /**
   * @override
   * @protected
   * @return {!Promise<!UI.Widget.Widget>}
   */
  async showPreview() {
    const view = await super.showPreview();
    if (!(view instanceof UI.View.SimpleView)) {
      return view;
    }
    const toolbar = new UI.Toolbar.Toolbar('network-item-preview-toolbar', this.element);
    view.toolbarItems().then(items => {
      items.map(item => toolbar.appendToolbarItem(item));
    });
    return view;
  }

  /**
   * @return {!Promise<?UI.Widget.Widget>}
   */
  async _htmlPreview() {
    const contentData = await this.request.contentData();
    if (contentData.error) {
      return new UI.EmptyWidget.EmptyWidget(Common.UIString.UIString('Failed to load response data'));
    }

    const whitelist = new Set(['text/html', 'text/plain', 'application/xhtml+xml']);
    if (!whitelist.has(this.request.mimeType)) {
      return null;
    }

    const content = contentData.encoded ? window.atob(/** @type {string} */ (contentData.content)) :
                                          /** @type {string} */ (contentData.content);

    // http://crbug.com/767393 - DevTools should recognize JSON regardless of the content type
    const jsonView = await SourceFrame.JSONView.JSONView.createView(content);
    if (jsonView) {
      return jsonView;
    }

    const dataURL = TextUtils.ContentProvider.contentAsDataURL(
        contentData.content, this.request.mimeType, contentData.encoded, this.request.charset());
    return dataURL ? new RequestHTMLView(dataURL) : null;
  }

  /**
   * @override
   * @protected
   * @return {!Promise<!UI.Widget.Widget>}
   */
  async createPreview() {
    if (this.request.signedExchangeInfo()) {
      return new SignedExchangeInfoView(this.request);
    }

    const htmlErrorPreview = await this._htmlPreview();
    if (htmlErrorPreview) {
      return htmlErrorPreview;
    }

    const provided = await SourceFrame.PreviewFactory.PreviewFactory.createPreview(this.request, this.request.mimeType);
    if (provided) {
      return provided;
    }

    return new UI.EmptyWidget.EmptyWidget(Common.UIString.UIString('Preview not available'));
  }
}
