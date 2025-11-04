// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
/* eslint-disable @devtools/no-imperative-dom-api */
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
import * as Common from '../../../../core/common/common.js';
import * as Host from '../../../../core/host/host.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import * as Workspace from '../../../../models/workspace/workspace.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';
import imageViewStyles from './imageView.css.js';
const UIStrings = {
    /**
     * @description Text in Image View of the Sources panel
     */
    image: 'Image',
    /**
     * @description Text that appears when user drag and drop something (for example, a file) in Image View of the Sources panel
     */
    dropImageFileHere: 'Drop image file here',
    /**
     * @description Text to indicate the source of an image
     * @example {example.com} PH1
     */
    imageFromS: 'Image from {PH1}',
    /**
     * @description Text in Image View of the Sources panel
     * @example {2} PH1
     * @example {2} PH2
     */
    dD: '{PH1} × {PH2}',
    /**
     * @description A context menu item in the Image View of the Sources panel
     */
    copyImageUrl: 'Copy image URL',
    /**
     * @description A context menu item in the Image View of the Sources panel
     */
    copyImageAsDataUri: 'Copy image as data URI',
    /**
     * @description A context menu item in the Image View of the Sources panel
     */
    openImageInNewTab: 'Open image in new tab',
    /**
     * @description A context menu item in the Image Preview
     */
    saveImageAs: 'Save image as…',
    /**
     * @description The default file name when downloading a file
     */
    download: 'download',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/source_frame/ImageView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ImageView extends UI.View.SimpleView {
    url;
    parsedURL;
    contentProvider;
    uiSourceCode;
    sizeLabel;
    dimensionsLabel;
    aspectRatioLabel;
    mimeTypeLabel;
    container;
    imagePreviewElement;
    cachedContent;
    constructor(mimeType, contentProvider) {
        super({
            title: i18nString(UIStrings.image),
            viewId: 'image',
            jslog: `${VisualLogging.pane('image-view')}}`,
        });
        this.registerRequiredCSS(imageViewStyles);
        this.element.tabIndex = -1;
        this.element.classList.add('image-view');
        this.url = contentProvider.contentURL();
        this.parsedURL = new Common.ParsedURL.ParsedURL(this.url);
        this.contentProvider = contentProvider;
        this.uiSourceCode = contentProvider instanceof Workspace.UISourceCode.UISourceCode ? contentProvider : null;
        if (this.uiSourceCode) {
            this.uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, this.workingCopyCommitted, this);
            new UI.DropTarget.DropTarget(this.element, [UI.DropTarget.Type.ImageFile, UI.DropTarget.Type.URI], i18nString(UIStrings.dropImageFileHere), this.handleDrop.bind(this));
        }
        this.sizeLabel = new UI.Toolbar.ToolbarText();
        this.dimensionsLabel = new UI.Toolbar.ToolbarText();
        this.aspectRatioLabel = new UI.Toolbar.ToolbarText();
        this.mimeTypeLabel = new UI.Toolbar.ToolbarText(mimeType);
        this.container = this.element.createChild('div', 'image');
        this.imagePreviewElement = this.container.createChild('img', 'resource-image-view');
        this.imagePreviewElement.addEventListener('contextmenu', this.contextMenu.bind(this), true);
    }
    async toolbarItems() {
        await this.updateContentIfNeeded();
        return [
            this.sizeLabel,
            new UI.Toolbar.ToolbarSeparator(),
            this.dimensionsLabel,
            new UI.Toolbar.ToolbarSeparator(),
            this.aspectRatioLabel,
            new UI.Toolbar.ToolbarSeparator(),
            this.mimeTypeLabel,
        ];
    }
    wasShown() {
        super.wasShown();
        void this.updateContentIfNeeded();
    }
    disposeView() {
        if (this.uiSourceCode) {
            this.uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, this.workingCopyCommitted, this);
        }
    }
    workingCopyCommitted() {
        void this.updateContentIfNeeded();
    }
    async updateContentIfNeeded() {
        const content = await this.contentProvider.requestContentData();
        if (TextUtils.ContentData.ContentData.isError(content) || this.cachedContent?.contentEqualTo(content)) {
            return;
        }
        this.cachedContent = content;
        const imageSrc = content.asDataUrl() ?? this.url;
        const loadPromise = new Promise(x => {
            this.imagePreviewElement.onload = x;
        });
        this.imagePreviewElement.src = imageSrc;
        this.imagePreviewElement.alt = i18nString(UIStrings.imageFromS, { PH1: this.url });
        const size = content.isTextContent ? content.text.length : Platform.StringUtilities.base64ToSize(content.base64);
        this.sizeLabel.setText(i18n.ByteUtilities.bytesToString(size));
        await loadPromise;
        this.dimensionsLabel.setText(i18nString(UIStrings.dD, { PH1: this.imagePreviewElement.naturalWidth, PH2: this.imagePreviewElement.naturalHeight }));
        this.aspectRatioLabel.setText(Platform.NumberUtilities.aspectRatio(this.imagePreviewElement.naturalWidth, this.imagePreviewElement.naturalHeight));
    }
    contextMenu(event) {
        const contextMenu = new UI.ContextMenu.ContextMenu(event);
        const parsedSrc = new Common.ParsedURL.ParsedURL(this.imagePreviewElement.src);
        if (!this.parsedURL.isDataURL()) {
            contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyImageUrl), this.copyImageURL.bind(this), {
                jslogContext: 'image-view.copy-image-url',
            });
        }
        if (parsedSrc.isDataURL()) {
            contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyImageAsDataUri), this.copyImageAsDataURL.bind(this), {
                jslogContext: 'image-view.copy-image-as-data-url',
            });
        }
        contextMenu.clipboardSection().appendItem(i18nString(UIStrings.openImageInNewTab), this.openInNewTab.bind(this), {
            jslogContext: 'image-view.open-in-new-tab',
        });
        contextMenu.clipboardSection().appendItem(i18nString(UIStrings.saveImageAs), this.saveImage.bind(this), {
            jslogContext: 'image-view.save-image',
        });
        void contextMenu.show();
    }
    copyImageAsDataURL() {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.imagePreviewElement.src);
    }
    copyImageURL() {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.url);
    }
    async saveImage() {
        const imageDataURL = this.cachedContent?.asDataUrl();
        if (!imageDataURL) {
            return;
        }
        let suggestedName = '';
        if (this.parsedURL.isDataURL()) {
            suggestedName = i18nString(UIStrings.download);
            const { type, subtype } = this.parsedURL.extractDataUrlMimeType();
            if (type === 'image' && subtype) {
                suggestedName += '.' + subtype;
            }
        }
        else {
            suggestedName = decodeURIComponent(this.parsedURL.displayName);
        }
        const blob = await fetch(imageDataURL).then(r => r.blob());
        try {
            const handle = await window.showSaveFilePicker({ suggestedName });
            const writable = await handle.createWritable();
            await writable.write(blob);
            await writable.close();
        }
        catch (error) {
            // If the user aborts the action no need to report it, otherwise do.
            if (error.name === 'AbortError') {
                return;
            }
            throw error;
        }
    }
    openInNewTab() {
        Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(this.url);
    }
    async handleDrop(dataTransfer) {
        const items = dataTransfer.items;
        if (!items.length || items[0].kind !== 'file') {
            return;
        }
        const file = items[0].getAsFile();
        if (!file) {
            return;
        }
        const encoded = !file.name.endsWith('.svg');
        const fileCallback = (file) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                let result;
                try {
                    result = reader.result;
                }
                catch (e) {
                    result = null;
                    console.error('Can\'t read file: ' + e);
                }
                if (typeof result !== 'string' || !this.uiSourceCode) {
                    return;
                }
                this.uiSourceCode.setContent(encoded ? btoa(result) : result, encoded);
            };
            if (encoded) {
                reader.readAsBinaryString(file);
            }
            else {
                reader.readAsText(file);
            }
        };
        fileCallback(file);
    }
}
//# sourceMappingURL=ImageView.js.map