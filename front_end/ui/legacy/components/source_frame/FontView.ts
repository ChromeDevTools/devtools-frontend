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

import * as i18n from '../../../../core/i18n/i18n.js';
import * as Platform from '../../../../core/platform/platform.js';
import * as TextUtils from '../../../../models/text_utils/text_utils.js';
import * as VisualLogging from '../../../visual_logging/visual_logging.js';
import * as UI from '../../legacy.js';

import fontViewStyles from './fontView.css.js';

const UIStrings = {
  /**
   *@description Text that appears on a button for the font resource type filter.
   */
  font: 'Font',
  /**
   *@description Aria accessible name in Font View of the Sources panel
   *@example {https://example.com} PH1
   */
  previewOfFontFromS: 'Preview of font from {PH1}',
} as const;
const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/source_frame/FontView.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export class FontView extends UI.View.SimpleView {
  private readonly url: Platform.DevToolsPath.UrlString;
  private readonly contentProvider: TextUtils.ContentProvider.ContentProvider;
  private readonly mimeTypeLabel: UI.Toolbar.ToolbarText;
  fontPreviewElement!: HTMLElement|null;
  private dummyElement!: HTMLElement|null;
  fontStyleElement!: HTMLStyleElement|null;
  private inResize!: boolean|null;
  constructor(mimeType: string, contentProvider: TextUtils.ContentProvider.ContentProvider) {
    super(i18nString(UIStrings.font));
    this.registerRequiredCSS(fontViewStyles);
    this.element.classList.add('font-view');
    this.element.setAttribute('jslog', `${VisualLogging.pane('font-view')}`);
    this.url = contentProvider.contentURL();
    UI.ARIAUtils.setLabel(this.element, i18nString(UIStrings.previewOfFontFromS, {PH1: this.url}));
    this.contentProvider = contentProvider;
    this.mimeTypeLabel = new UI.Toolbar.ToolbarText(mimeType);
  }

  override async toolbarItems(): Promise<UI.Toolbar.ToolbarItem[]> {
    return [this.mimeTypeLabel];
  }

  private onFontContentLoaded(uniqueFontName: string, contentData: TextUtils.ContentData.ContentDataOrError): void {
    const url = TextUtils.ContentData.ContentData.isError(contentData) ? this.url : contentData.asDataUrl();
    if (!this.fontStyleElement) {
      return;
    }
    this.fontStyleElement.textContent =
        Platform.StringUtilities.sprintf('@font-face { font-family: "%s"; src: url(%s); }', uniqueFontName, url);
    this.updateFontPreviewSize();
  }

  private createContentIfNeeded(): void {
    if (this.fontPreviewElement) {
      return;
    }

    const uniqueFontName = `WebInspectorFontPreview${++fontId}`;
    this.fontStyleElement = document.createElement('style');
    void this.contentProvider.requestContentData().then(contentData => {
      this.onFontContentLoaded(uniqueFontName, contentData);
    });
    this.element.appendChild(this.fontStyleElement);

    const fontPreview = document.createElement('div');
    for (let i = 0; i < FONT_PREVIEW_LINES.length; ++i) {
      if (i > 0) {
        fontPreview.createChild('br');
      }
      UI.UIUtils.createTextChild(fontPreview, FONT_PREVIEW_LINES[i]);
    }
    this.fontPreviewElement = (fontPreview.cloneNode(true) as HTMLDivElement);
    if (!this.fontPreviewElement) {
      return;
    }
    UI.ARIAUtils.setHidden(this.fontPreviewElement, true);
    this.fontPreviewElement.style.overflow = 'hidden';
    this.fontPreviewElement.style.setProperty('font-family', uniqueFontName);
    this.fontPreviewElement.style.setProperty('visibility', 'hidden');

    this.dummyElement = fontPreview;
    this.dummyElement.style.visibility = 'hidden';
    this.dummyElement.style.zIndex = '-1';
    this.dummyElement.style.display = 'inline';
    this.dummyElement.style.position = 'absolute';
    this.dummyElement.style.setProperty('font-family', uniqueFontName);
    this.dummyElement.style.setProperty('font-size', MEASUURE_FONT_SIZE + 'px');

    this.element.appendChild(this.fontPreviewElement);
  }

  override wasShown(): void {
    this.createContentIfNeeded();

    this.updateFontPreviewSize();
  }

  override onResize(): void {
    if (this.inResize) {
      return;
    }

    this.inResize = true;
    try {
      this.updateFontPreviewSize();
    } finally {
      this.inResize = null;
    }
  }

  private measureElement(): {
    width: number,
    height: number,
  } {
    if (!this.dummyElement) {
      throw new Error('No font preview loaded');
    }
    this.element.appendChild(this.dummyElement);
    const result = {width: this.dummyElement.offsetWidth, height: this.dummyElement.offsetHeight};
    this.element.removeChild(this.dummyElement);

    return result;
  }

  updateFontPreviewSize(): void {
    if (!this.fontPreviewElement || !this.isShowing()) {
      return;
    }

    this.fontPreviewElement.style.removeProperty('visibility');
    const dimension = this.measureElement();

    const height = dimension.height;
    const width = dimension.width;

    // Subtract some padding. This should match the paddings in the CSS plus room for the scrollbar.
    const containerWidth = this.element.offsetWidth - 50;
    const containerHeight = this.element.offsetHeight - 30;

    if (!height || !width || !containerWidth || !containerHeight) {
      this.fontPreviewElement.style.removeProperty('font-size');
      return;
    }

    const widthRatio = containerWidth / width;
    const heightRatio = containerHeight / height;
    const finalFontSize = Math.floor(MEASUURE_FONT_SIZE * Math.min(widthRatio, heightRatio)) - 2;

    this.fontPreviewElement.style.setProperty('font-size', finalFontSize + 'px', undefined);
  }
}

let fontId = 0;
const FONT_PREVIEW_LINES = ['ABCDEFGHIJKLM', 'NOPQRSTUVWXYZ', 'abcdefghijklm', 'nopqrstuvwxyz', '1234567890'];
const MEASUURE_FONT_SIZE = 50;
