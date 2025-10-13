// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as Lit from '../../third_party/lit/lit.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';

import {BinaryResourceView} from './BinaryResourceView.js';

const {html, render} = Lit;

const UIStrings = {
  /**
   * @description Text in Request Response View of the Network panel if no preview can be shown
   */
  noPreview: 'Nothing to preview',
  /**
   * @description Text in Request Response View of the Network panel
   */
  thisRequestHasNoResponseData: 'This request has no response data available',
  /**
   * @description Text in Request Preview View of the Network panel
   */
  failedToLoadResponseData: 'Failed to load response data',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/network/RequestResponseView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface ViewInput {
  request: SDK.NetworkRequest.NetworkRequest;
  contentData: TextUtils.StreamingContentData.StreamingContentDataOrError;
  mimeType: string;
  renderAsText: boolean;
}

export interface ViewOutput {
  revealPosition: (position: SourceFrame.SourceFrame.RevealPosition) => Promise<void>;
}

const widgetConfig = UI.Widget.widgetConfig;
const widgetRef = UI.Widget.widgetRef;
type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input: ViewInput, output: ViewOutput, target: HTMLElement): void => {
  let widget;
  if (TextUtils.StreamingContentData.isError(input.contentData)) {
    // clang-format off
    widget = html`<devtools-widget
                    .widgetConfig=${widgetConfig(element => new UI.EmptyWidget.EmptyWidget(
                      i18nString(UIStrings.failedToLoadResponseData), (input.contentData as {error: string}).error,
                      element))}></devtools-widget>`;
    // clang-format on
  } else if (input.request.statusCode === 204 || input.request.failed) {
    // clang-format off
    widget = html`<devtools-widget
                     .widgetConfig=${widgetConfig(element => new UI.EmptyWidget.EmptyWidget(
                        i18nString(UIStrings.noPreview), i18nString(UIStrings.thisRequestHasNoResponseData),
                        element))}></devtools-widget>`;
    // clang-format on
  } else if (input.renderAsText) {
    // clang-format off
    widget = html`<devtools-widget
                    .widgetConfig=${widgetConfig(element => new SourceFrame.ResourceSourceFrame.SearchableContainer(
                        input.request, input.mimeType, element))}
                    ${widgetRef(SourceFrame.ResourceSourceFrame.SearchableContainer, widget => {output.revealPosition = widget.revealPosition.bind(widget);})}></devtools-widget>`;
    // clang-format on
  } else {
    // clang-format off
    widget = html`<devtools-widget
                    .widgetConfig=${widgetConfig(element => new BinaryResourceView(
                      input.contentData as TextUtils.StreamingContentData.StreamingContentData, input.request.url(),
                      input.request.resourceType(), element))}></devtools-widget>`;
    // clang-format on
  }

  render(widget, target);
};

export class RequestResponseView extends UI.Widget.VBox {
  request: SDK.NetworkRequest.NetworkRequest;
  #view: View;
  #revealPosition?: (position: SourceFrame.SourceFrame.RevealPosition) => Promise<void>;

  constructor(request: SDK.NetworkRequest.NetworkRequest, view = DEFAULT_VIEW) {
    super();
    this.request = request;
    this.#view = view;
  }

  override wasShown(): void {
    this.requestUpdate();
  }

  override async performUpdate(): Promise<void> {
    const contentData = await this.request.requestStreamingContent();
    let renderAsText = false;

    const mimeType = this.getMimeTypeForDisplay();
    if (!TextUtils.StreamingContentData.isError(contentData)) {
      const isWasm = contentData.mimeType === 'application/wasm';
      renderAsText = contentData.isTextContent || isWasm;

      const isMinified =
          isWasm || !contentData.isTextContent ? false : TextUtils.TextUtils.isMinified(contentData.content().text);
      const mediaType = Common.ResourceType.ResourceType.mediaTypeForMetrics(
          mimeType, this.request.resourceType().isFromSourceMap(), isMinified, false, false);
      Host.userMetrics.networkPanelResponsePreviewOpened(mediaType);
    }

    const viewInput = {request: this.request, contentData, mimeType, renderAsText};
    const that = this;
    const viewOutput = {
      set revealPosition(reveal: (position: SourceFrame.SourceFrame.RevealPosition) => Promise<void>) {
        that.#revealPosition = reveal;
      },
    };

    this.#view(viewInput, viewOutput, this.contentElement);
  }

  getMimeTypeForDisplay(): string {
    // If the main document is of type JSON (or any JSON subtype), do not use the more generic canonical MIME type,
    // which would prevent the JSON from being pretty-printed. See https://crbug.com/406900
    if (Common.ResourceType.ResourceType.simplifyContentType(this.request.mimeType) === 'application/json') {
      return this.request.mimeType;
    }
    return this.request.resourceType().canonicalMimeType() || this.request.mimeType;
  }

  async revealPosition(position: SourceFrame.SourceFrame.RevealPosition): Promise<void> {
    this.requestUpdate();
    await this.updateComplete;
    await this.#revealPosition?.(position);
  }
}
