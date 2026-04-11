// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/*
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
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
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import { Directives, html, render } from '../../../lit/lit.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';
import fontViewStyles from './fontView.css.js';
const UIStrings = {
    /**
     * @description Text that appears on a button for the font resource type filter.
     */
    font: 'Font',
    /**
     * @description Aria accessible name in Font View of the Sources panel
     * @example {https://example.com} PH1
     */
    previewOfFontFromS: 'Preview of font from {PH1}',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/source_frame/FontView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const FONT_PREVIEW_LINES = ['ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ', 'abcdefghijklm', 'nopqrstuvwxyz', '1234567890'];
const MEASURE_FONT_SIZE = 50;
// clang-format off
export const DEFAULT_VIEW = (input, output, target) => {
    let dummyEl;
    render(html `
    <style>${fontViewStyles}</style>
    <style>${input.fontFaceRule}</style>
    <div class="font-view"
      aria-label=${i18nString(UIStrings.previewOfFontFromS, { PH1: input.url })}
      style="font-family: ${input.fontFamily}; font-size: ${input.previewFontSize}"
      aria-hidden="true"
      ?hidden=${!input.previewVisible}
    >${FONT_PREVIEW_LINES.map((line, i) => html `${i > 0 ? html `<br>` : ''}${line}`)}</div>
    <div ${Directives.ref(el => { dummyEl = el; })}
      style="visibility: hidden; z-index: -1; display: inline; position: absolute; font-family: ${input.fontFamily}; font-size: ${MEASURE_FONT_SIZE}px"
    >${FONT_PREVIEW_LINES.map((line, i) => html `${i > 0 ? html `<br>` : ''}${line}`)}</div>
  `, target);
    output.measureDimensions = () => {
        if (!dummyEl) {
            return { width: 0, height: 0 };
        }
        return { width: dummyEl.offsetWidth, height: dummyEl.offsetHeight };
    };
};
// clang-format on
export class FontView extends UI.View.SimpleView {
    url;
    contentProvider;
    mimeTypeLabel;
    #view;
    #fontFaceRule = '';
    #fontFamily = '';
    #previewFontSize = '';
    #previewVisible = false;
    #contentLoaded = false;
    constructor(mimeType, contentProvider, view = DEFAULT_VIEW) {
        super({
            title: i18nString(UIStrings.font),
            viewId: 'font',
            jslog: `${VisualLogging.pane('font-view')}`,
        });
        this.#view = view;
        this.url = contentProvider.contentURL();
        this.contentProvider = contentProvider;
        this.mimeTypeLabel = new UI.Toolbar.ToolbarText(mimeType);
    }
    async toolbarItems() {
        return [this.mimeTypeLabel];
    }
    #loadContentIfNeeded() {
        if (this.#contentLoaded) {
            return;
        }
        this.#contentLoaded = true;
        this.#fontFamily = `WebInspectorFontPreview${++fontId}`;
        void this.contentProvider.requestContentData().then(contentData => {
            const url = TextUtils.ContentData.ContentData.isError(contentData) ? this.url : contentData.asDataUrl();
            this.#fontFaceRule =
                Platform.StringUtilities.sprintf('@font-face { font-family: "%s"; src: url(%s); }', this.#fontFamily, url);
            this.#previewVisible = true;
            this.requestUpdate();
        });
    }
    wasShown() {
        super.wasShown();
        this.#loadContentIfNeeded();
        this.requestUpdate();
    }
    onResize() {
        this.requestUpdate();
    }
    #calculateFontPreviewSize(dimension) {
        if (!this.#previewVisible || !this.isShowing()) {
            return '';
        }
        const height = dimension.height;
        const width = dimension.width;
        // Subtract some padding. This should match the paddings in the CSS plus room for the scrollbar.
        const containerWidth = this.element.offsetWidth - 50;
        const containerHeight = this.element.offsetHeight - 30;
        if (!height || !width || !containerWidth || !containerHeight) {
            return '';
        }
        const widthRatio = containerWidth / width;
        const heightRatio = containerHeight / height;
        const finalFontSize = Math.floor(MEASURE_FONT_SIZE * Math.min(widthRatio, heightRatio)) - 2;
        return `${finalFontSize}px`;
    }
    performUpdate() {
        const output = {};
        this.#view({
            url: this.url,
            fontFaceRule: this.#fontFaceRule,
            fontFamily: this.#fontFamily,
            previewFontSize: this.#previewFontSize,
            previewVisible: this.#previewVisible,
        }, output, this.contentElement);
        if (!output.measureDimensions) {
            return;
        }
        const requestedFontSize = this.#calculateFontPreviewSize(output.measureDimensions());
        if (requestedFontSize === this.#previewFontSize) {
            return;
        }
        this.#previewFontSize = requestedFontSize;
        this.requestUpdate();
    }
}
let fontId = 0;
//# sourceMappingURL=FontView.js.map