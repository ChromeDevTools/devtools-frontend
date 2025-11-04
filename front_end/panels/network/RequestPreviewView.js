// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
import '../../ui/legacy/legacy.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as SourceFrame from '../../ui/legacy/components/source_frame/source_frame.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';
import { RequestHTMLView } from './RequestHTMLView.js';
import { SignedExchangeInfoView } from './SignedExchangeInfoView.js';
const UIStrings = {
    /**
     * @description Text in Request Preview View of the Network panel
     */
    failedToLoadResponseData: 'Failed to load response data',
    /**
     * @description Text in Request Preview View of the Network panel
     */
    previewNotAvailable: 'Preview not available',
};
const str_ = i18n.i18n.registerUIStrings('panels/network/RequestPreviewView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class RequestPreviewView extends UI.Widget.VBox {
    request;
    contentViewPromise;
    constructor(request) {
        super({ jslog: `${VisualLogging.pane('preview').track({ resize: true })}` });
        this.element.classList.add('request-view');
        this.request = request;
        this.contentViewPromise = null;
    }
    async showPreview() {
        const view = await this.createPreview();
        view.show(this.element);
        await view.updateComplete;
        if (!(view instanceof UI.View.SimpleView)) {
            return view;
        }
        const toolbar = this.element.createChild('devtools-toolbar', 'network-item-preview-toolbar');
        void view.toolbarItems().then(items => {
            items.map(item => toolbar.appendToolbarItem(item));
        });
        return view;
    }
    wasShown() {
        super.wasShown();
        void this.doShowPreview();
    }
    doShowPreview() {
        if (!this.contentViewPromise) {
            this.contentViewPromise = this.showPreview();
        }
        return this.contentViewPromise;
    }
    async htmlPreview() {
        const contentData = await this.request.requestContentData();
        if (TextUtils.ContentData.ContentData.isError(contentData)) {
            return new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.failedToLoadResponseData), contentData.error);
        }
        const allowlist = new Set(['text/html', 'text/plain', 'application/xhtml+xml']);
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
    async createPreview() {
        if (this.request.signedExchangeInfo()) {
            return new SignedExchangeInfoView(this.request);
        }
        const htmlErrorPreview = await this.htmlPreview();
        if (htmlErrorPreview) {
            return htmlErrorPreview;
        }
        const provided = await SourceFrame.PreviewFactory.PreviewFactory.createPreview(this.request, this.request.mimeType);
        if (provided) {
            return provided;
        }
        return new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.previewNotAvailable), '');
    }
}
//# sourceMappingURL=RequestPreviewView.js.map