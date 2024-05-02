/*
 * Copyright (C) 2013 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as i18n from '../../core/i18n/i18n.js';

import platformFontsWidgetStyles from './platformFontsWidget.css.js';

import type * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import type * as Protocol from '../../generated/protocol.js';

import {Events, type ComputedStyleModel} from './ComputedStyleModel.js';

const UIStrings = {
  /**
   *@description Section title text content in Platform Fonts Widget of the Elements panel
   */
  renderedFonts: 'Rendered Fonts',
  /**
   *@description Font property title text content in Platform Fonts Widget of the Elements panel
   */
  familyName: 'Family name',
  /**
   *@description Font property title text content in Platform Fonts Widget of the Elements panel
   */
  postScriptName: 'PostScript name',
  /**
   *@description Font property title text content in Platform Fonts Widget of the Elements panel
   */
  fontOrigin: 'Font origin',
  /**
   *@description Text in Platform Fonts Widget of the Elements panel
   */
  networkResource: 'Network resource',
  /**
   *@description Text in Platform Fonts Widget of the Elements panel
   */
  localFile: 'Local file',
  /**
   *@description Text in Platform Fonts Widget of the Elements panel. Indicates a number of glyphs (characters) .
   */
  dGlyphs: '{n, plural, =1 {(# glyph)} other {(# glyphs)}}',
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/PlatformFontsWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class PlatformFontsWidget extends UI.ThrottledWidget.ThrottledWidget {
  private readonly sharedModel: ComputedStyleModel;
  private readonly sectionTitle: HTMLDivElement;
  private readonly fontStatsSection: HTMLElement;

  constructor(sharedModel: ComputedStyleModel) {
    super(true);

    this.sharedModel = sharedModel;
    this.sharedModel.addEventListener(Events.ComputedStyleChanged, this.update, this);

    this.sectionTitle = document.createElement('div');
    this.sectionTitle.classList.add('title');
    this.contentElement.classList.add('platform-fonts');
    this.contentElement.appendChild(this.sectionTitle);
    this.sectionTitle.textContent = i18nString(UIStrings.renderedFonts);
    this.fontStatsSection = this.contentElement.createChild('div', 'stats-section');
  }

  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  override doUpdate(): Promise<any> {
    const cssModel = this.sharedModel.cssModel();
    const node = this.sharedModel.node();
    if (!node || !cssModel) {
      return Promise.resolve();
    }

    return cssModel.getPlatformFonts(node.id).then(this.refreshUI.bind(this, node));
  }

  private refreshUI(node: SDK.DOMModel.DOMNode, platformFonts: Protocol.CSS.PlatformFontUsage[]|null): void {
    if (this.sharedModel.node() !== node) {
      return;
    }

    this.fontStatsSection.removeChildren();

    const isEmptySection = !platformFonts || !platformFonts.length;
    this.sectionTitle.classList.toggle('hidden', isEmptySection);
    if (isEmptySection || !platformFonts) {
      return;
    }

    platformFonts.sort(function(a, b) {
      return b.glyphCount - a.glyphCount;
    });

    for (const platformFont of platformFonts) {
      const fontStatElement = this.fontStatsSection.createChild('div', 'font-stats-item');
      const familyNameElement = fontStatElement.createChild('div');
      familyNameElement.textContent = `${UIStrings.familyName}: ${platformFont.familyName}`;

      const postScriptNameElement = fontStatElement.createChild('div');
      postScriptNameElement.textContent = `${UIStrings.postScriptName}: ${platformFont.postScriptName}`;

      const fontOriginElement = fontStatElement.createChild('div');
      const fontOrigin =
          platformFont.isCustomFont ? i18nString(UIStrings.networkResource) : i18nString(UIStrings.localFile);
      fontOriginElement.textContent = `${UIStrings.fontOrigin}: ${fontOrigin}`;

      const fontUsageElement = fontOriginElement.createChild('span', 'font-usage');
      const usage = platformFont.glyphCount;
      fontUsageElement.textContent = i18nString(UIStrings.dGlyphs, {n: usage});
    }
  }
  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([platformFontsWidgetStyles]);
  }
}
