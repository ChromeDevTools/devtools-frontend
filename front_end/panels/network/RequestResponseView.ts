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

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

const UIStrings = {
  /**
   *@description Text in Request Response View of the Network panel
   */
  thisRequestHasNoResponseData: 'This request has no response data available.',
  /**
   *@description Text in Request Preview View of the Network panel
   */
  failedToLoadResponseData: 'Failed to load response data',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/RequestResponseView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class RequestResponseView extends UI.Widget.VBox {
  request: SDK.NetworkRequest.NetworkRequest;
  private contentViewPromise: Promise<UI.Widget.Widget>|null;

  constructor(request: SDK.NetworkRequest.NetworkRequest) {
    super();
    this.element.classList.add('request-view');
    this.element.setAttribute('jslog', `${VisualLogging.pane('response').track({resize: true})}`);
    this.request = request;
    this.contentViewPromise = null;
  }

  static async sourceViewForRequest(request: SDK.NetworkRequest.NetworkRequest): Promise<UI.Widget.Widget|null> {
    let sourceView = requestToSourceView.get(request);
    if (sourceView !== undefined) {
      return sourceView;
    }

    const contentData = await request.requestStreamingContent();
    // Note: Even though WASM is binary data, the source view will disassemble it and show a text representation.
    if (TextUtils.StreamingContentData.isError(contentData) ||
        !(contentData.isTextContent || contentData.mimeType === 'application/wasm')) {
      requestToSourceView.delete(request);
      return null;
    }

    let mimeType;
    // If the main document is of type JSON (or any JSON subtype), do not use the more generic canonical MIME type,
    // which would prevent the JSON from being pretty-printed. See https://crbug.com/406900
    if (Common.ResourceType.ResourceType.simplifyContentType(request.mimeType) === 'application/json') {
      mimeType = request.mimeType;
    } else {
      mimeType = request.resourceType().canonicalMimeType() || request.mimeType;
    }

    const isMinified = contentData.mimeType === 'application/wasm' ?
        false :
        TextUtils.TextUtils.isMinified(contentData.content().text);
    const mediaType = Common.ResourceType.ResourceType.mediaTypeForMetrics(
        mimeType, request.resourceType().isFromSourceMap(), isMinified, false, false);

    Host.userMetrics.networkPanelResponsePreviewOpened(mediaType);
    sourceView = SourceFrame.ResourceSourceFrame.ResourceSourceFrame.createSearchableView(request, mimeType);
    requestToSourceView.set(request, sourceView);
    return sourceView;
  }

  override wasShown(): void {
    void this.doShowPreview();
  }

  private doShowPreview(): Promise<UI.Widget.Widget> {
    if (!this.contentViewPromise) {
      this.contentViewPromise = this.showPreview();
    }
    return this.contentViewPromise;
  }

  async showPreview(): Promise<UI.Widget.Widget> {
    const responseView = await this.createPreview();
    responseView.show(this.element);
    return responseView;
  }

  async createPreview(): Promise<UI.Widget.Widget> {
    const contentData = await this.request.requestStreamingContent();
    if (TextUtils.StreamingContentData.isError(contentData)) {
      return new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.failedToLoadResponseData) + ': ' + contentData.error);
    }

    const sourceView = await RequestResponseView.sourceViewForRequest(this.request);
    if (!sourceView || this.request.statusCode === 204) {
      return new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.thisRequestHasNoResponseData));
    }

    return sourceView;
  }

  async revealPosition(position: SourceFrame.SourceFrame.RevealPosition): Promise<void> {
    const view = await this.doShowPreview();
    if (view instanceof SourceFrame.ResourceSourceFrame.SearchableContainer) {
      void view.revealPosition(position);
    }
  }
}

const requestToSourceView = new WeakMap<SDK.NetworkRequest.NetworkRequest, UI.Widget.Widget>();
