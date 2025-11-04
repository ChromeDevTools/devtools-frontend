// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import { html, render } from '../../ui/lit/lit.js';
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
};
const str_ = i18n.i18n.registerUIStrings('panels/elements/PlatformFontsWidget.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
export const DEFAULT_VIEW = (input, _output, target) => {
    const isEmptySection = !input.platformFonts?.length;
    // clang-format off
    render(html `
    <style>${platformFontsWidgetStyles}</style>
    <div class="platform-fonts">
      ${isEmptySection ? '' : html `
        <div class="title">${i18nString(UIStrings.renderedFonts)}</div>
        <div class="stats-section">
          ${input.platformFonts?.map(platformFont => {
        const fontOrigin = platformFont.isCustomFont ? i18nString(UIStrings.networkResource) : i18nString(UIStrings.localFile);
        const usage = platformFont.glyphCount;
        return html `
              <div class="font-stats-item">
                <div><span class="font-property-name">${i18nString(UIStrings.familyName)}</span>: ${platformFont.familyName}</div>
                <div><span class="font-property-name">${i18nString(UIStrings.postScriptName)}</span>: ${platformFont.postScriptName}</div>
                <div><span class="font-property-name">${i18nString(UIStrings.fontOrigin)}</span>: ${fontOrigin}<span class="font-usage">${i18nString(UIStrings.dGlyphs, { n: usage })}</span></div>
              </div>
            `;
    })}
        </div>
      `}
    </div>`, target);
    // clang-format on
};
export class PlatformFontsWidget extends UI.Widget.VBox {
    sharedModel;
    #view;
    constructor(sharedModel, view = DEFAULT_VIEW) {
        super({ useShadowDom: true });
        this.#view = view;
        this.registerRequiredCSS(platformFontsWidgetStyles);
        this.sharedModel = sharedModel;
        this.sharedModel.addEventListener("CSSModelChanged" /* ComputedStyleModelEvents.CSS_MODEL_CHANGED */, this.requestUpdate, this);
        this.sharedModel.addEventListener("ComputedStyleChanged" /* ComputedStyleModelEvents.COMPUTED_STYLE_CHANGED */, this.requestUpdate, this);
    }
    async performUpdate() {
        const cssModel = this.sharedModel.cssModel();
        const node = this.sharedModel.node();
        if (!node || !cssModel) {
            this.#view({ platformFonts: null }, {}, this.contentElement);
            return;
        }
        const platformFonts = await cssModel.getPlatformFonts(node.id);
        const sortedPlatformFonts = platformFonts?.sort((a, b) => b.glyphCount - a.glyphCount) || null;
        this.#view({ platformFonts: sortedPlatformFonts }, {}, this.contentElement);
    }
}
//# sourceMappingURL=PlatformFontsWidget.js.map