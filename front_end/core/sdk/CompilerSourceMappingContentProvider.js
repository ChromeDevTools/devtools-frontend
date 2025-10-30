// Copyright 2011 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as TextUtils from '../../models/text_utils/text_utils.js';
import * as i18n from '../i18n/i18n.js';
import { PageResourceLoader } from './PageResourceLoader.js';
const UIStrings = {
    /**
     * @description Error message when failing to fetch a resource referenced in a source map
     * @example {https://example.com/sourcemap.map} PH1
     * @example {An error occurred} PH2
     */
    couldNotLoadContentForSS: 'Could not load content for {PH1} ({PH2})',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/CompilerSourceMappingContentProvider.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class CompilerSourceMappingContentProvider {
    #sourceURL;
    #contentType;
    #initiator;
    constructor(sourceURL, contentType, initiator) {
        this.#sourceURL = sourceURL;
        this.#contentType = contentType;
        this.#initiator = initiator;
    }
    contentURL() {
        return this.#sourceURL;
    }
    contentType() {
        return this.#contentType;
    }
    async requestContentData() {
        try {
            const { content } = await PageResourceLoader.instance().loadResource(this.#sourceURL, this.#initiator);
            return new TextUtils.ContentData.ContentData(content, /* isBase64=*/ false, this.#contentType.canonicalMimeType());
        }
        catch (e) {
            const error = i18nString(UIStrings.couldNotLoadContentForSS, { PH1: this.#sourceURL, PH2: e.message });
            console.error(error);
            return { error };
        }
    }
    async searchInContent(query, caseSensitive, isRegex) {
        const contentData = await this.requestContentData();
        return TextUtils.TextUtils.performSearchInContentData(contentData, query, caseSensitive, isRegex);
    }
}
//# sourceMappingURL=CompilerSourceMappingContentProvider.js.map