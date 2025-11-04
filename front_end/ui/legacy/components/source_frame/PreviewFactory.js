// Copyright 2017 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import * as UI from '../../legacy.js';
import { FontView } from './FontView.js';
import { ImageView } from './ImageView.js';
import { JSONView } from './JSONView.js';
import { ResourceSourceFrame } from './ResourceSourceFrame.js';
import { XMLView } from './XMLView.js';
const UIStrings = {
    /**
     * @description Text in Preview Factory of the Sources panel if the data to preview can't be shown due to an error
     */
    failedToLoadData: 'Failed to load data',
    /**
     * @description Text in Preview Factory of the Sources panel if there's no data to preview
     */
    nothingToPreview: 'Nothing to preview',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/source_frame/PreviewFactory.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class PreviewFactory {
    static async createPreview(provider, mimeType) {
        let resourceType = Common.ResourceType.ResourceType.fromMimeType(mimeType);
        if (resourceType === Common.ResourceType.resourceTypes.Other) {
            resourceType = provider.contentType();
        }
        switch (resourceType) {
            case Common.ResourceType.resourceTypes.Image:
                return new ImageView(mimeType, provider);
            case Common.ResourceType.resourceTypes.Font:
                return new FontView(mimeType, provider);
        }
        const contentData = await provider.requestContentData();
        if (TextUtils.ContentData.ContentData.isError(contentData)) {
            return new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.failedToLoadData), contentData.error);
        }
        if (!contentData.isTextContent) {
            return null;
        }
        if (!contentData.text) {
            return new UI.EmptyWidget.EmptyWidget(i18nString(UIStrings.nothingToPreview), '');
        }
        const parsedXML = XMLView.parseXML(contentData.text, contentData.mimeType);
        if (parsedXML) {
            return XMLView.createSearchableView(parsedXML);
        }
        const jsonView = await JSONView.createView(contentData.text);
        if (jsonView) {
            return jsonView;
        }
        const highlighterType = mimeType.replace(/;.*/, '') /* remove charset */ || provider.contentType().canonicalMimeType();
        return ResourceSourceFrame.createSearchableView(provider, highlighterType);
    }
}
//# sourceMappingURL=PreviewFactory.js.map