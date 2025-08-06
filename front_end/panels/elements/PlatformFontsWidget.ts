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
import type * as Protocol from '../../generated/protocol.js';
import * as UI from '../../ui/legacy/legacy.js';
import {html, render} from '../../ui/lit/lit.js';

import {type ComputedStyleModel, Events as ComputedStyleModelEvents} from './ComputedStyleModel.js';
import platformFontsWidgetStyles from './platformFontsWidget.css.js';

const UIStrings = {
  /**
   * @description Section title text content in Platform Fonts Widget of the Elements panel
   */
  renderedFonts: 'Rendered Fonts',
  /**
   * @description Font property title text content in Platform Fonts Widget of the Elements panel
   */
  familyName: 'Family name',
  /**
   * @description Font property title text content in Platform Fonts Widget of the Elements panel
   */
  postScriptName: 'PostScript name',
  /**
   * @description Font property title text content in Platform Fonts Widget of the Elements panel
   */
  fontOrigin: 'Font origin',
  /**
   * @description Text in Platform Fonts Widget of the Elements panel
   */
  networkResource: 'Network resource',
  /**
   * @description Text in Platform Fonts Widget of the Elements panel
   */
  localFile: 'Local file',
  /**
   * @description Text in Platform Fonts Widget of the Elements panel. Indicates a number of glyphs (characters) .
   */
  dGlyphs: '{n, plural, =1 {(# glyph)} other {(# glyphs)}}',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/elements/PlatformFontsWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

interface PlatformFontsWidgetInput {
  platformFonts: Protocol.CSS.PlatformFontUsage[]|null;
}

type View = (input: PlatformFontsWidgetInput, output: object, target: HTMLElement) => void;

export const DEFAULT_VIEW: View = (input, _output, target) => {
  const isEmptySection = !input.platformFonts?.length;

  // clang-format off
  render(html`
    <style>${platformFontsWidgetStyles}</style>
    <div class="platform-fonts">
      ${isEmptySection ? '' : html`
        <div class="title">${i18nString(UIStrings.renderedFonts)}</div>
        <div class="stats-section">
          ${input.platformFonts?.map(platformFont => {
            const fontOrigin = platformFont.isCustomFont ? i18nString(UIStrings.networkResource) : i18nString(UIStrings.localFile);
            const usage = platformFont.glyphCount;
            return html`
              <div class="font-stats-item">
                <div><span class="font-property-name">${i18nString(UIStrings.familyName)}</span>: ${platformFont.familyName}</div>
                <div><span class="font-property-name">${i18nString(UIStrings.postScriptName)}</span>: ${platformFont.postScriptName}</div>
                <div><span class="font-property-name">${i18nString(UIStrings.fontOrigin)}</span>: ${fontOrigin}<span class="font-usage">${i18nString(UIStrings.dGlyphs, {n: usage})}</span></div>
              </div>
            `;
          })}
        </div>
      `}
    </div>`,
    target);
  // clang-format on
};

export class PlatformFontsWidget extends UI.ThrottledWidget.ThrottledWidget {
  private readonly sharedModel: ComputedStyleModel;
  readonly #view: View;

  constructor(sharedModel: ComputedStyleModel, view: View = DEFAULT_VIEW) {
    super(true);
    this.#view = view;
    this.registerRequiredCSS(platformFontsWidgetStyles);

    this.sharedModel = sharedModel;
    this.sharedModel.addEventListener(ComputedStyleModelEvents.CSS_MODEL_CHANGED, this.update, this);
    this.sharedModel.addEventListener(ComputedStyleModelEvents.COMPUTED_STYLE_CHANGED, this.update, this);
  }

  override async doUpdate(): Promise<void> {
    const cssModel = this.sharedModel.cssModel();
    const node = this.sharedModel.node();
    if (!node || !cssModel) {
      this.#view({platformFonts: null}, {}, this.contentElement);
      return;
    }

    const platformFonts = await cssModel.getPlatformFonts(node.id);
    const sortedPlatformFonts = platformFonts?.sort((a, b) => b.glyphCount - a.glyphCount) || null;
    this.#view({platformFonts: sortedPlatformFonts}, {}, this.contentElement);
  }
}
