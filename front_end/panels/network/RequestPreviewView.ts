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

import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as LegacyWrapper from '../../ui/components/legacy_wrapper/legacy_wrapper.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {WebBundleInfoView} from './components/WebBundleInfoView.js';
import {RequestHTMLView} from './RequestHTMLView.js';
import {RequestResponseView} from './RequestResponseView.js';
import {SignedExchangeInfoView} from './SignedExchangeInfoView.js';

const UIStrings = {
  /**
   *@description Text in Request Preview View of the Network panel
   */
  failedToLoadResponseData: 'Failed to load response data',
  /**
   *@description Text in Request Preview View of the Network panel
   */
  previewNotAvailable: 'Preview not available',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/RequestPreviewView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class RequestPreviewView extends RequestResponseView {
  constructor(request: SDK.NetworkRequest.NetworkRequest) {
    super(request);
    this.element.setAttribute('jslog', `${VisualLogging.pane('preview')}`);
  }

  override async showPreview(): Promise<UI.Widget.Widget> {
    const view = await super.showPreview();
    if (!(view instanceof UI.View.SimpleView)) {
      return view;
    }
    const toolbar = new UI.Toolbar.Toolbar('network-item-preview-toolbar', this.element);
    void view.toolbarItems().then(items => {
      items.map(item => toolbar.appendToolbarItem(item));
    });
    return view;
  }

  private async htmlPreview(): Promise<UI.Widget.Widget|null> {
    const contentData = await this.request.contentData();
    if (TextUtils.ContentData.ContentData.isError(contentData)) {
      return new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.failedToLoadResponseData) + ': ' + contentData.error);
    }

    const allowlist = new Set<string>(['text/html', 'text/plain', 'application/xhtml+xml']);
    if (!allowlist.has(this.request.mimeType)) {
      return null;
    }

    // http://crbug.com/767393 - DevTools should recognize JSON regardless of the content type
    const jsonView = await SourceFrame.JSONView.JSONView.createView(contentData.text);
    if (jsonView) {
      return jsonView;
    }

    return RequestHTMLView.create(contentData);
  }

  override async createPreview(): Promise<UI.Widget.Widget> {
    if (this.request.signedExchangeInfo()) {
      return new SignedExchangeInfoView(this.request);
    }

    if (this.request.webBundleInfo()) {
      return LegacyWrapper.LegacyWrapper.legacyWrapper(UI.Widget.VBox, new WebBundleInfoView(this.request));
    }

    const htmlErrorPreview = await this.htmlPreview();
    if (htmlErrorPreview) {
      return htmlErrorPreview;
    }

    const provided = await SourceFrame.PreviewFactory.PreviewFactory.createPreview(this.request, this.request.mimeType);
    if (provided) {
      return provided;
    }

    return new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.previewNotAvailable));
  }
}
