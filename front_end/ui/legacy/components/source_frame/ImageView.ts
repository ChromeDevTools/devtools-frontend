// Copyright 2021 The Chromium Authors. All rights reserved.
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

import * as Common from '../../../../core/common/common.js';
import * as Host from '../../../../core/host/host.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import * as Workspace from '../../../../models/workspace/workspace.js';
import * as UI from '../../legacy.js';

import imageViewStyles from './imageView.css.legacy.js';

const UIStrings = {
  /**
   *@description Text in Image View of the Sources panel
   */
  image: 'Image',
  /**
   *@description Text that appears when user drag and drop something (for example, a file) in Image View of the Sources panel
   */
  dropImageFileHere: 'Drop image file here',
  /**
   *@description Text to indicate the source of an image
   *@example {example.com} PH1
   */
  imageFromS: 'Image from {PH1}',
  /**
   *@description Text in Image View of the Sources panel
   *@example {2} PH1
   *@example {2} PH2
   */
  dD: '{PH1} × {PH2}',
  /**
   *@description A context menu item in the Image View of the Sources panel
   */
  copyImageUrl: 'Copy image URL',
  /**
   *@description A context menu item in the Image View of the Sources panel
   */
  copyImageAsDataUri: 'Copy image as data URI',
  /**
   *@description A context menu item in the Image View of the Sources panel
   */
  openImageInNewTab: 'Open image in new tab',
  /**
   *@description A context menu item in the Image Preview
   */
  saveImageAs: 'Save image as...',
  /**
   *@description The default file name when downloading a file
   */
  download: 'download',
};
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/source_frame/ImageView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class ImageView extends UI.View.SimpleView {
  private url: Platform.DevToolsPath.UrlString;
  private parsedURL: Common.ParsedURL.ParsedURL;
  private readonly mimeType: string;
  private readonly contentProvider: TextUtils.ContentProvider.ContentProvider;
  private uiSourceCode: Workspace.UISourceCode.UISourceCode|null;
  private readonly sizeLabel: UI.Toolbar.ToolbarText;
  private readonly dimensionsLabel: UI.Toolbar.ToolbarText;
  private readonly aspectRatioLabel: UI.Toolbar.ToolbarText;
  private readonly mimeTypeLabel: UI.Toolbar.ToolbarText;
  private readonly container: HTMLElement;
  private imagePreviewElement: HTMLImageElement;
  private cachedContent?: TextUtils.ContentProvider.DeferredContent;
  constructor(mimeType: string, contentProvider: TextUtils.ContentProvider.ContentProvider) {
    super(i18nString(UIStrings.image));
    this.registerRequiredCSS(imageViewStyles);
    this.element.tabIndex = -1;
    this.element.classList.add('image-view');
    this.url = contentProvider.contentURL();
    this.parsedURL = new Common.ParsedURL.ParsedURL(this.url);
    this.mimeType = mimeType;
    this.contentProvider = contentProvider;
    this.uiSourceCode = contentProvider instanceof Workspace.UISourceCode.UISourceCode ?
        contentProvider as Workspace.UISourceCode.UISourceCode :
        null;
    if (this.uiSourceCode) {
      this.uiSourceCode.addEventListener(
          Workspace.UISourceCode.Events.WorkingCopyCommitted, this.workingCopyCommitted, this);
      new UI.DropTarget.DropTarget(
          this.element, [UI.DropTarget.Type.ImageFile, UI.DropTarget.Type.URI], i18nString(UIStrings.dropImageFileHere),
          this.handleDrop.bind(this));
    }
    this.sizeLabel = new UI.Toolbar.ToolbarText();
    this.dimensionsLabel = new UI.Toolbar.ToolbarText();
    this.aspectRatioLabel = new UI.Toolbar.ToolbarText();
    this.mimeTypeLabel = new UI.Toolbar.ToolbarText(mimeType);
    this.container = this.element.createChild('div', 'image');
    this.imagePreviewElement = (this.container.createChild('img', 'resource-image-view') as HTMLImageElement);
    this.imagePreviewElement.addEventListener('contextmenu', this.contextMenu.bind(this), true);
  }

  async toolbarItems(): Promise<UI.Toolbar.ToolbarItem[]> {
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

  wasShown(): void {
    void this.updateContentIfNeeded();
  }

  disposeView(): void {
    if (this.uiSourceCode) {
      this.uiSourceCode.removeEventListener(
          Workspace.UISourceCode.Events.WorkingCopyCommitted, this.workingCopyCommitted, this);
    }
  }

  private workingCopyCommitted(): void {
    void this.updateContentIfNeeded();
  }

  private async updateContentIfNeeded(): Promise<void> {
    const content = await this.contentProvider.requestContent();
    if (this.cachedContent?.content === content.content) {
      return;
    }

    this.cachedContent = content;
    const imageSrc =
        TextUtils.ContentProvider.contentAsDataURL(content.content, this.mimeType, content.isEncoded) || this.url;
    const loadPromise = new Promise(x => {
      this.imagePreviewElement.onload = x;
    });
    this.imagePreviewElement.src = imageSrc;
    this.imagePreviewElement.alt = i18nString(UIStrings.imageFromS, {PH1: this.url});
    const size = content.content && !content.isEncoded ? content.content.length :
                                                         Platform.StringUtilities.base64ToSize(content.content);
    this.sizeLabel.setText(Platform.NumberUtilities.bytesToString(size));
    await loadPromise;
    this.dimensionsLabel.setText(i18nString(
        UIStrings.dD, {PH1: this.imagePreviewElement.naturalWidth, PH2: this.imagePreviewElement.naturalHeight}));
    this.aspectRatioLabel.setText(Platform.NumberUtilities.aspectRatio(
        this.imagePreviewElement.naturalWidth, this.imagePreviewElement.naturalHeight));
  }

  private contextMenu(event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const parsedSrc = new Common.ParsedURL.ParsedURL(this.imagePreviewElement.src);
    if (!this.parsedURL.isDataURL()) {
      contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyImageUrl), this.copyImageURL.bind(this));
    }
    if (parsedSrc.isDataURL()) {
      contextMenu.clipboardSection().appendItem(
          i18nString(UIStrings.copyImageAsDataUri), this.copyImageAsDataURL.bind(this));
    }

    contextMenu.clipboardSection().appendItem(i18nString(UIStrings.openImageInNewTab), this.openInNewTab.bind(this));
    contextMenu.clipboardSection().appendItem(i18nString(UIStrings.saveImageAs), async () => {
      await this.saveImage();
    });

    void contextMenu.show();
  }

  private copyImageAsDataURL(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.imagePreviewElement.src);
  }

  private copyImageURL(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.url);
  }

  private async saveImage(): Promise<void> {
    if (!this.cachedContent || !this.cachedContent.content) {
      return;
    }
    const imageDataURL = TextUtils.ContentProvider.contentAsDataURL(
        this.cachedContent.content, this.mimeType, this.cachedContent.isEncoded, '', false);

    if (!imageDataURL) {
      return;
    }

    const link = document.createElement('a');
    link.href = imageDataURL;

    // If it is a Base64 image, set a default file name.
    // When chrome saves a file, the file name characters that are not supported
    // by the OS will be replaced automatically. For example, in the Mac,
    // `:` it will be replaced with `_`.
    link.download =
        this.parsedURL.isDataURL() ? i18nString(UIStrings.download) : decodeURIComponent(this.parsedURL.displayName);
    link.click();
    link.remove();
  }

  private openInNewTab(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.openInNewTab(this.url);
  }

  private async handleDrop(dataTransfer: DataTransfer): Promise<void> {
    const items = dataTransfer.items;
    if (!items.length || items[0].kind !== 'file') {
      return;
    }

    const file = items[0].getAsFile();
    if (!file) {
      return;
    }
    const encoded = !file.name.endsWith('.svg');
    const fileCallback = (file: Blob): void => {
      const reader = new FileReader();
      reader.onloadend = (): void => {
        let result;
        try {
          result = (reader.result as string | null);
        } catch (e) {
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
      } else {
        reader.readAsText(file);
      }
    };
    fileCallback(file);
  }
}
