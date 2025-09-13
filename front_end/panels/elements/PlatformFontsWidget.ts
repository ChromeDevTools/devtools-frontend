// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

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
