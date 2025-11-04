// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) IBM Corp. 2009  All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import '../../legacy.js';
import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as FormatterActions from '../../../../entrypoints/formatter_worker/FormatterActions.js'; // eslint-disable-line @devtools/es-modules-import
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import * as UI from '../../legacy.js';
import resourceSourceFrameStyles from './resourceSourceFrame.css.js';
import { SourceFrameImpl } from './SourceFrame.js';
const UIStrings = {
    /**
     * @description Text to find an item
     */
    find: 'Find',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/source_frame/ResourceSourceFrame.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ResourceSourceFrame extends SourceFrameImpl {
    #resource;
    #givenContentType;
    constructor(resource, givenContentType, options) {
        const isStreamingProvider = TextUtils.ContentProvider.isStreamingContentProvider(resource);
        const lazyContent = isStreamingProvider ?
            () => resource.requestStreamingContent().then(TextUtils.StreamingContentData.asContentDataOrError) :
            () => resource.requestContentData();
        super(lazyContent, options);
        this.#givenContentType = givenContentType;
        this.#resource = resource;
        if (isStreamingProvider) {
            void resource.requestStreamingContent().then(streamingContent => {
                if (!TextUtils.StreamingContentData.isError(streamingContent)) {
                    streamingContent.addEventListener("ChunkAdded" /* TextUtils.StreamingContentData.Events.CHUNK_ADDED */, () => {
                        void this.setContentDataOrError(Promise.resolve(streamingContent.content()));
                    });
                }
            });
        }
    }
    static createSearchableView(resource, contentType) {
        return new SearchableContainer(resource, contentType);
    }
    getContentType() {
        return this.#givenContentType;
    }
    get resource() {
        return this.#resource;
    }
    populateTextAreaContextMenu(contextMenu, lineNumber, columnNumber) {
        super.populateTextAreaContextMenu(contextMenu, lineNumber, columnNumber);
        contextMenu.appendApplicableItems(this.#resource);
    }
}
export class SearchableContainer extends UI.Widget.VBox {
    sourceFrame;
    constructor(resource, contentType, element) {
        super(element, { useShadowDom: true });
        this.registerRequiredCSS(resourceSourceFrameStyles);
        const simpleContentType = Common.ResourceType.ResourceType.simplifyContentType(contentType);
        const sourceFrame = new ResourceSourceFrame(resource, simpleContentType);
        this.sourceFrame = sourceFrame;
        const canPrettyPrint = FormatterActions.FORMATTABLE_MEDIA_TYPES.includes(simpleContentType);
        sourceFrame.setCanPrettyPrint(canPrettyPrint, true /* autoPrettyPrint */);
        const searchableView = new UI.SearchableView.SearchableView(sourceFrame, sourceFrame);
        searchableView.element.classList.add('searchable-view');
        searchableView.setPlaceholder(i18nString(UIStrings.find));
        sourceFrame.show(searchableView.element);
        sourceFrame.setSearchableView(searchableView);
        searchableView.show(this.contentElement);
        const toolbar = this.contentElement.createChild('devtools-toolbar', 'toolbar');
        void sourceFrame.toolbarItems().then(items => {
            items.map(item => toolbar.appendToolbarItem(item));
        });
    }
    async revealPosition(position) {
        this.sourceFrame.revealPosition(position, true);
    }
}
//# sourceMappingURL=ResourceSourceFrame.js.map