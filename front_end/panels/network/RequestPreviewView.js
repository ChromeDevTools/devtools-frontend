// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import '../../ui/legacy/legacy.js';
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as TextUtils from '../../core/text_utils/text_utils.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import { Directives, html, render } from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { RequestHTMLView } from './RequestHTMLView.js';
import { SignedExchangeInfoView } from './SignedExchangeInfoView.js';
const { widget } = UI.Widget;
const { repeat } = Directives;
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
};
const str_ = i18n.i18n.registerUIStrings('panels/network/RequestPreviewView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, _output, target) => {
    // clang-format off
    let previewTemplate;
    if (input.hasSignedExchange) {
        previewTemplate = html `${widget(SignedExchangeInfoView, { request: input.request })}`;
    }
    else if (input.error !== null) {
        previewTemplate = html `${widget(UI.EmptyWidget.EmptyWidget, {
            header: i18nString(UIStrings.failedToLoadResponseData),
            text: input.error,
        })}`;
    }
    else if (input.parsedJSON) {
        previewTemplate = html `${widget(SourceFrame.JSONView.SearchableJsonView, { parsedJSON: input.parsedJSON })}`;
    }
    else if (input.htmlDataURL) {
        previewTemplate = html `${widget(RequestHTMLView, { dataURL: input.htmlDataURL })}`;
    }
    else if (input.resourceType === Common.ResourceType.resourceTypes.Image) {
        previewTemplate = html `${widget((element) => new SourceFrame.ImageView.ImageView(input.mimeType, input.request, element), { showToolbar: true })}`;
    }
    else if (input.resourceType === Common.ResourceType.resourceTypes.Font) {
        previewTemplate = html `${widget((element) => new SourceFrame.FontView.FontView(input.mimeType, input.request, element), { showToolbar: true })}`;
    }
    else if (!input.isTextContent) {
        previewTemplate = html `${widget(UI.EmptyWidget.EmptyWidget, {
            header: i18nString(UIStrings.previewNotAvailable),
            text: '',
        })}`;
    }
    else if (!input.hasTextContent) {
        previewTemplate = html `${widget(UI.EmptyWidget.EmptyWidget, {
            header: i18nString(UIStrings.nothingToPreview),
            text: '',
        })}`;
    }
    else if (input.parsedXML) {
        const parsedXML = input.parsedXML;
        previewTemplate = html `${widget(element => SourceFrame.XMLView.XMLView.createSearchableView(parsedXML, element))}`;
    }
    else {
        previewTemplate = html `${widget(element => new SourceFrame.ResourceSourceFrame.SearchableContainer(input.request, input.highlighterType, element))}`;
    }
    render(html `${repeat([input.request], request => request, () => previewTemplate)}`, target, {
        container: {
            attributes: {
                jslog: `${VisualLogging.pane('preview').track({ resize: true })}`,
            },
        },
    });
    // clang-format on
};
export class RequestPreviewView extends UI.Widget.VBox {
    #request;
    #view;
    #error = null;
    #htmlDataURL = null;
    #parsedJSON = null;
    #parsedXML = null;
    #isTextContent = false;
    #hasTextContent = false;
    constructor(request, view = DEFAULT_VIEW) {
        super(request instanceof HTMLElement ? request : undefined);
        this.#view = view;
        if (request && !(request instanceof HTMLElement)) {
            this.#request = request;
        }
    }
    get request() {
        return this.#request;
    }
    set request(request) {
        if (this.#request === request) {
            return;
        }
        this.#request = request;
        this.#resetState();
        this.requestUpdate();
    }
    // Used by layout test
    // http/tests/devtools/network/network-choose-preview-view.js
    get contentViewPromise() {
        return this.updateComplete.then(() => this.children().at(-1) ?? null);
    }
    wasShown() {
        super.wasShown();
        this.requestUpdate();
    }
    async performUpdate() {
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
        this.#view({
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
        }, undefined, this.contentElement);
    }
    #resetState() {
        this.#error = null;
        this.#htmlDataURL = null;
        this.#parsedJSON = null;
        this.#parsedXML = null;
        this.#isTextContent = false;
        this.#hasTextContent = false;
    }
    async #loadPreviewData(request) {
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
        const allowlist = new Set(['text/html', 'text/plain', 'application/xhtml+xml']);
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
//# sourceMappingURL=RequestPreviewView.js.map