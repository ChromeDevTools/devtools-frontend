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

import '../../../kit/kit.js';

import * as Common from '../../../../core/common/common.js';
import * as Host from '../../../../core/host/host.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as TextUtils from '../../../../core/text_utils/text_utils.js';
import * as Workspace from '../../../../models/workspace/workspace.js';
import {html, render} from '../../../lit/lit.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';

import imageViewStyles from './imageView.css.js';

const UIStrings = {
  /**
   * @description Title of the image view tab in the Sources panel.
   */
  image: 'Image',
  /**
   * @description Drop target message shown when dragging a file into the image view of the Sources panel.
   */
  dropImageFileHere: 'Drop image file here',
  /**
   * @description Alt text for the image preview in the image view of the Sources panel.
   * @example {https://example.com} PH1
   */
  imageFromS: 'Image from {PH1}',
  /**
   * @description Dimensions label in the toolbar of the image view showing width and height in pixels.
   * @example {200} PH1
   * @example {100} PH2
   */
  dD: '{PH1} × {PH2}',
  /**
   * @description Context menu item in the image view of the Sources panel to copy the image URL.
   */
  copyImageUrl: 'Copy image URL',
  /**
   * @description Context menu item in the image view of the Sources panel to copy the image as a data URI.
   */
  copyImageAsDataUri: 'Copy image as data URI',
  /**
   * @description Context menu item in the image view of the Sources panel to open the image in a new tab.
   */
  openImageInNewTab: 'Open image in new tab',
  /**
   * @description Context menu item in the image view of the Sources panel to save the image.
   */
  saveImageAs: 'Save image as…',
  /**
   * @description Default file name used when saving an image with a data URI.
   */
  download: 'download',
  /**
   * @description Link text shown in the image view of the Sources panel when an image is too large to display.
   */
  thisImageIsTooBig: 'This image is too big to display in DevTools. Click here to open it in a new tab.',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/source_frame/ImageView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export interface ViewInput {
  url: Platform.DevToolsPath.UrlString;
  imageSrc: string|null;
  isUnavailable: boolean;
  onImageLoad: (event: Event) => void;
  onContextMenu: (event: Event) => void;
}

export type View = (input: ViewInput, output: undefined, target: HTMLElement) => void;

// clang-format off
export const DEFAULT_VIEW: View = (input, _output, target) => {
  render(html`
    <style>${imageViewStyles}</style>
    <div class="image">
      ${input.imageSrc ? html`
        <img
          class="resource-image-view"
          src=${input.imageSrc}
          alt=${i18nString(UIStrings.imageFromS, {PH1: input.url})}
          @load=${input.onImageLoad}
          @contextmenu=${{handleEvent: input.onContextMenu, capture: true}}
        >` : html`
        <img
          class="resource-image-view"
          alt=${i18nString(UIStrings.imageFromS, {PH1: input.url})}
          hidden
        >`}
      <devtools-link
        class="resource-image-unavailable ${input.isUnavailable ? '' : 'hidden'}"
        href=${input.url}
      >
        <devtools-icon name="open-externally"></devtools-icon>
        ${i18nString(UIStrings.thisImageIsTooBig)}
      </devtools-link>
    </div>
  `, target, {
    container: {
      classes: ['image-view'],
      attributes: {
        tabindex: '-1',
      },
    },
  });
};
// clang-format on

export class ImageView extends UI.View.SimpleView {
  private url: Platform.DevToolsPath.UrlString;
  private parsedURL: Common.ParsedURL.ParsedURL;

  private readonly contentProvider: TextUtils.ContentProvider.ContentProvider;
  private uiSourceCode: Workspace.UISourceCode.UISourceCode|null;
  private readonly sizeLabel: UI.Toolbar.ToolbarText;
  private readonly dimensionsLabel: UI.Toolbar.ToolbarText;
  private readonly aspectRatioLabel: UI.Toolbar.ToolbarText;
  private readonly mimeTypeLabel: UI.Toolbar.ToolbarText;
  private cachedContent?: TextUtils.ContentData.ContentData;
  readonly #view: View;
  #imageSrc: string|null = null;
  #isUnavailable = false;
  #loadResolve?: () => void;

  constructor(mimeType: string, contentProvider: TextUtils.ContentProvider.ContentProvider, view: View = DEFAULT_VIEW) {
    super({
      title: i18nString(UIStrings.image),
      viewId: 'image',
      jslog: `${VisualLogging.pane('image-view')}`,
    });
    this.#view = view;
    this.url = contentProvider.contentURL();
    this.parsedURL = new Common.ParsedURL.ParsedURL(this.url);
    this.contentProvider = contentProvider;
    this.uiSourceCode = contentProvider instanceof Workspace.UISourceCode.UISourceCode ? contentProvider : null;
    if (this.uiSourceCode) {
      this.uiSourceCode.addEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted, this.workingCopyCommitted,
                                         this);
      new UI.DropTarget.DropTarget(this.element, [UI.DropTarget.Type.ImageFile, UI.DropTarget.Type.URI],
                                   i18nString(UIStrings.dropImageFileHere), this.handleDrop.bind(this));
    }
    this.sizeLabel = new UI.Toolbar.ToolbarText();
    this.dimensionsLabel = new UI.Toolbar.ToolbarText();
    this.aspectRatioLabel = new UI.Toolbar.ToolbarText();
    this.mimeTypeLabel = new UI.Toolbar.ToolbarText(mimeType);
    this.performUpdate();
  }

  override performUpdate(): void {
    this.#view(
        {
          url: this.url,
          imageSrc: this.#imageSrc,
          isUnavailable: this.#isUnavailable,
          onImageLoad: this.#onImageLoad,
          onContextMenu: this.contextMenu.bind(this),
        },
        undefined,
        this.contentElement,
    );
  }

  #onImageLoad = (event: Event): void => {
    const img = event.target as HTMLImageElement;
    this.dimensionsLabel.setText(i18nString(UIStrings.dD, {PH1: img.naturalWidth, PH2: img.naturalHeight}));
    this.aspectRatioLabel.setText(Platform.NumberUtilities.aspectRatio(img.naturalWidth, img.naturalHeight));
    this.#loadResolve?.();
    this.#loadResolve = undefined;
  };

  override async toolbarItems(): Promise<UI.Toolbar.ToolbarItem[]> {
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

  override wasShown(): void {
    super.wasShown();
    this.requestUpdate();
    void this.updateContentIfNeeded();
  }

  override disposeView(): void {
    if (this.uiSourceCode) {
      this.uiSourceCode.removeEventListener(Workspace.UISourceCode.Events.WorkingCopyCommitted,
                                            this.workingCopyCommitted, this);
    }
  }

  private workingCopyCommitted(): void {
    void this.updateContentIfNeeded();
  }

  private async updateContentIfNeeded(): Promise<void> {
    const content = await this.contentProvider.requestContentData();
    if (TextUtils.ContentData.ContentData.isError(content) || this.cachedContent?.contentEqualTo(content)) {
      return;
    }

    this.cachedContent = content;
    const imageSrc = content.asImagePreviewUrl();
    if (imageSrc === null) {
      this.#isUnavailable = true;
      this.#imageSrc = null;
      this.performUpdate();
      return;
    }
    this.#isUnavailable = false;
    const loadPromise = new Promise<void>(resolve => {
      this.#loadResolve = resolve;
    });
    this.#imageSrc = imageSrc;
    const size = content.isTextContent ? content.text.length : Platform.StringUtilities.base64ToSize(content.base64);
    this.sizeLabel.setText(i18n.ByteUtilities.bytesToString(size));
    this.performUpdate();
    await loadPromise;
  }

  private contextMenu(event: Event): void {
    const contextMenu = new UI.ContextMenu.ContextMenu(event);
    const parsedSrc = new Common.ParsedURL.ParsedURL(this.#imageSrc ?? '');
    if (!this.parsedURL.isDataURL()) {
      contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyImageUrl), this.copyImageURL.bind(this), {
        jslogContext: 'image-view.copy-image-url',
      });
    }
    if (parsedSrc.isDataURL()) {
      contextMenu.clipboardSection().appendItem(i18nString(UIStrings.copyImageAsDataUri),
                                                this.copyImageAsDataURL.bind(this), {
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

  private copyImageAsDataURL(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.#imageSrc ?? '');
  }

  private copyImageURL(): void {
    Host.InspectorFrontendHost.InspectorFrontendHostInstance.copyText(this.url);
  }

  private async saveImage(): Promise<void> {
    if (!this.cachedContent) {
      return;
    }

    let suggestedName = '';
    if (this.parsedURL.isDataURL()) {
      suggestedName = i18nString(UIStrings.download);
      const {type, subtype} = this.parsedURL.extractDataUrlMimeType();
      if (type === 'image' && subtype) {
        suggestedName += '.' + subtype;
      }
    } else {
      suggestedName = decodeURIComponent(this.parsedURL.displayName);
    }

    const blob = this.cachedContent.asBlob();
    if (!blob) {
      return;
    }
    try {
      const handle = await window.showSaveFilePicker({suggestedName});
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
    } catch (error) {
      // If the user aborts the action no need to report it, otherwise do.
      if (error.name === 'AbortError') {
        return;
      }
      throw error;
    }
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
      reader.onloadend = () => {
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
