// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import '../../ui/legacy/legacy.js';

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as SDK from '../../core/sdk/sdk.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import {Directives, html, type LitTemplate, render} from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import {RequestHTMLView} from './RequestHTMLView.js';
import {SignedExchangeInfoView} from './SignedExchangeInfoView.js';

const {widget} = UI.Widget;
const {repeat} = Directives;

const UIStrings = {
  /**
   * @description Text in Request Preview View of the Network panel
   */
  failedToLoadResponseData: 'Failed to load response data',
  /**
   * @description Text in Request Preview View of the Network panel
   */
  previewNotAvailable: 'Preview not available',
  /**
   * @description Text shown in the empty widget when there is no content to
   * preview in the Request Preview View of the Network panel.
   */
  nothingToPreview: 'Nothing to preview',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/network/RequestPreviewView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  request: SDK.NetworkRequest.NetworkRequest;
  resourceType: Common.ResourceType.ResourceType;
  mimeType: string;
  highlighterType: string;
  hasSignedExchange: boolean;
  error: string|null;
  htmlDataURL: string|null;
  parsedJSON: SourceFrame.JSONView.ParsedJSON|null;
  parsedXML: Document|null;
  isTextContent: boolean;
  hasTextContent: boolean;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  let previewTemplate: LitTemplate;
  if (input.hasSignedExchange) {
    previewTemplate = html`${widget(element => new SignedExchangeInfoView(input.request, element))}`;
  } else if (input.error !== null) {
    previewTemplate = html`${widget(UI.EmptyWidget.EmptyWidget, {
      header: i18nString(UIStrings.failedToLoadResponseData),
      text: input.error,
    })}`;
  } else if (input.parsedJSON) {
    previewTemplate = html`${widget(SourceFrame.JSONView.SearchableJsonView, {parsedJSON: input.parsedJSON})}`;
  } else if (input.htmlDataURL) {
    previewTemplate = html`${widget(RequestHTMLView, {dataURL: input.htmlDataURL})}`;
  } else if (input.resourceType === Common.ResourceType.resourceTypes.Image) {
    previewTemplate = html`${widget(
        (element: HTMLElement) => new SourceFrame.ImageView.ImageView(input.mimeType, input.request, element),
        {showToolbar: true},
    )}`;
  } else if (input.resourceType === Common.ResourceType.resourceTypes.Font) {
    previewTemplate = html`${widget(
        (element: HTMLElement) => new SourceFrame.FontView.FontView(input.mimeType, input.request, element),
        {showToolbar: true},
    )}`;
  } else if (!input.isTextContent) {
    previewTemplate = html`${widget(UI.EmptyWidget.EmptyWidget, {
      header: i18nString(UIStrings.previewNotAvailable),
      text: '',
    })}`;
  } else if (!input.hasTextContent) {
    previewTemplate = html`${widget(UI.EmptyWidget.EmptyWidget, {
      header: i18nString(UIStrings.nothingToPreview),
      text: '',
    })}`;
  } else if (input.parsedXML) {
    const parsedXML = input.parsedXML;
    previewTemplate = html`${widget(element => SourceFrame.XMLView.XMLView.createSearchableView(parsedXML, element))}`;
  } else {
    previewTemplate = html`${widget(
        element => new SourceFrame.ResourceSourceFrame.SearchableContainer(
            input.request, input.highlighterType, element),
    )}`;
  }

  render(
      html`${repeat([input.request], request => request, () => previewTemplate)}`,
      target,
      {
        container: {
          attributes: {
            jslog: `${VisualLogging.pane('preview').track({resize: true})}`,
          },
        },
      },
  );
  // clang-format on
};

export class RequestPreviewView extends UI.Widget.VBox {
  #request!: SDK.NetworkRequest.NetworkRequest;
  readonly #view: View;
  #error: string|null = null;
  #htmlDataURL: string|null = null;
  #parsedJSON: SourceFrame.JSONView.ParsedJSON|null = null;
  #parsedXML: Document|null = null;
  #isTextContent = false;
  #hasTextContent = false;

  constructor(request?: SDK.NetworkRequest.NetworkRequest|HTMLElement, view: View = DEFAULT_VIEW) {
    super(request instanceof HTMLElement ? request : undefined);
    this.#view = view;
    if (request && !(request instanceof HTMLElement)) {
      this.#request = request;
    }
  }

  get request(): SDK.NetworkRequest.NetworkRequest {
    return this.#request;
  }

  set request(request: SDK.NetworkRequest.NetworkRequest) {
    if (this.#request === request) {
      return;
    }
    this.#request = request;
    this.#resetState();
    this.requestUpdate();
  }

  // Used by layout test
  // http/tests/devtools/network/network-choose-preview-view.js
  get contentViewPromise(): Promise<UI.Widget.AnyWidget|null> {
    return this.updateComplete.then(() => this.children().at(-1) ?? null);
  }

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
  }

  override async performUpdate(): Promise<void> {
    if (!this.#request) {
      return;
    }
    const request = this.#request;
    await this.#loadPreviewData(request);
    if (this.#request !== request) {
      return;
    }
    let resourceType = Common.ResourceType.ResourceType.fromMimeType(request.mimeType);
    if (resourceType === Common.ResourceType.resourceTypes.Other) {
      resourceType = request.contentType();
    }
    const highlighterType = request.mimeType.replace(/;.*/, '') || request.contentType().canonicalMimeType();
    this.#view(
        {
          request,
          resourceType,
          mimeType: request.mimeType,
          highlighterType,
          hasSignedExchange: Boolean(request.signedExchangeInfo()),
          error: this.#error,
          htmlDataURL: this.#htmlDataURL,
          parsedJSON: this.#parsedJSON,
          parsedXML: this.#parsedXML,
          isTextContent: this.#isTextContent,
          hasTextContent: this.#hasTextContent,
        },
        undefined,
        this.contentElement,
    );
  }

  #resetState(): void {
    this.#error = null;
    this.#htmlDataURL = null;
    this.#parsedJSON = null;
    this.#parsedXML = null;
    this.#isTextContent = false;
    this.#hasTextContent = false;
  }

  async #loadPreviewData(request: SDK.NetworkRequest.NetworkRequest): Promise<void> {
    this.#resetState();

    if (request.signedExchangeInfo()) {
      return;
    }

    const contentData = await request.requestContentData();
    if (this.#request !== request) {
      return;
    }
    if (TextUtils.ContentData.ContentData.isError(contentData)) {
      this.#error = contentData.error;
      return;
    }

    const allowlist = new Set<string>(['text/html', 'text/plain', 'application/xhtml+xml']);
    if (allowlist.has(request.mimeType)) {
      // http://crbug.com/767393 - DevTools should recognize JSON regardless of
      // the content type
      const parsedJSON = await SourceFrame.JSONView.JSONView.parseJSON(contentData.text);
      if (this.#request !== request) {
        return;
      }
      if (parsedJSON && typeof parsedJSON.data === 'object') {
        this.#parsedJSON = parsedJSON;
        return;
      }
      const dataURL = contentData.asDataUrl();
      if (dataURL) {
        this.#htmlDataURL = dataURL;
        return;
      }
    }

    this.#isTextContent = contentData.isTextContent;
    this.#hasTextContent = Boolean(contentData.isTextContent && contentData.text);
    if (this.#hasTextContent) {
      this.#parsedXML = SourceFrame.XMLView.XMLView.parseXML(contentData.text, contentData.mimeType);
      if (!this.#parsedXML) {
        const parsedJSON = await SourceFrame.JSONView.JSONView.parseJSON(contentData.text);
        if (this.#request !== request) {
          return;
        }
        if (parsedJSON && typeof parsedJSON.data === 'object') {
          this.#parsedJSON = parsedJSON;
        }
      }
    }
  }
}
