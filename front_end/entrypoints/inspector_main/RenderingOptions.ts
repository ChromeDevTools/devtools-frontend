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

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import renderingOptionsStyles from './renderingOptions.css.js';

const UIStrings = {
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting highlights areas
   * of the webpage that need to be repainted (re-drawn by the browser).
   */
  paintFlashing: 'Paint flashing',
  /**
   * @description Explanation text for the 'Paint flashing' setting in the Rendering tool.
   */
  highlightsAreasOfThePageGreen:
      'Highlights areas of the page (green) that need to be repainted. May not be suitable for people prone to photosensitive epilepsy.',
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting highlights areas
   * (regions) of the page that were shifted (where a 'layout shift' occurred). A layout shift is
   * where elements on the webpage move around and cause other nearby elements to move as well.
   */
  layoutShiftRegions: 'Layout shift regions',
  /**
   * @description Explanation text for the 'Layout Shift Regions' setting in the Rendering tool.
   */
  highlightsAreasOfThePageBlueThat:
      'Highlights areas of the page (blue) that were shifted. May not be suitable for people prone to photosensitive epilepsy.',
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting shows the
   * borders of layers on the page. Layer is a noun.
   */
  layerBorders: 'Layer borders',
  /**
   * @description Explanation text for the 'Layer borders' setting in the Rendering tool.
   */
  showsLayerBordersOrangeoliveAnd: 'Shows layer borders (orange/olive) and tiles (cyan).',
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting shows the
   * rendering statistics for frames e.g. frames per second. Frame is a noun.
   */
  frameRenderingStats: 'Frame Rendering Stats',
  /**
   * @description Explanation text for the 'Frame Rendering Stats' setting in the Rendering tool.
   * Plots is a verb. GPU = Graphics Processing Unit.
   */
  plotsFrameThroughputDropped: 'Plots frame throughput, dropped frames distribution, and GPU memory.',
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting highlights
   * elements that can slow down scrolling on the page.
   */
  scrollingPerformanceIssues: 'Scrolling performance issues',
  /**
   * @description Explanation text for the 'Scrolling performance issues' setting in the Rendering tool.
   */
  highlightsElementsTealThatCan:
      'Highlights elements (teal) that can slow down scrolling, including touch & wheel event handlers and other main-thread scrolling situations.',
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting highlights the
   * rendering frames for ads that are found on the page.
   */
  highlightAdFrames: 'Highlight ad frames',
  /**
   * @description Explanation text for the 'Highlight ad frames' setting in the Rendering tool.
   */
  highlightsFramesRedDetectedToBe: 'Highlights frames (red) detected to be ads.',
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting prevents the
   * webpage from loading 'local' fonts. Local fonts are fonts that are installed on the user's
   * computer, and not loaded over the network.
   */
  disableLocalFonts: 'Disable local fonts',
  /**
   * @description Explanation text for the 'Disable local fonts' setting in the Rendering tool.
   */
  disablesLocalSourcesInFontface: 'Disables `local()` sources in `@font-face` rules. Requires a page reload to apply.',
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting
   * emulates/pretends that the webpage is focused i.e. that the user interacted with it most
   * recently.
   */
  emulateAFocusedPage: 'Emulate a focused page',
  /**
   * @description Explanation text for the 'Emulate a focused page' setting in the Rendering tool.
   */
  emulatesAFocusedPage: 'Keep page focused. Commonly used for debugging disappearing elements.',
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting enables auto dark mode emulation.
   */
  emulateAutoDarkMode: 'Enable automatic dark mode',
  /**
   * @description Explanation text for the 'Emulate automatic dark mode' setting in the Rendering tool.
   */
  emulatesAutoDarkMode: 'Enables automatic dark mode and sets `prefers-color-scheme` to `dark`.',
  /**
   * @description Explanation text for the 'Emulate CSS media type' setting in the Rendering tool.
   * This setting overrides the CSS media type on the page:
   * https://developer.mozilla.org/en-US/docs/Web/CSS/@media#media_types
   */
  forcesMediaTypeForTestingPrint: 'Forces media type for testing print and screen styles',
  /**
   * @description Explanation text for the 'Forces CSS prefers-color-scheme media' setting in the Rendering tool.
   */
  forcesCssPreferscolorschemeMedia: 'Forces CSS `prefers-color-scheme` media feature',
  /**
   * @description Explanation text for the 'Forces CSS prefers-reduced-motion media' setting in the Rendering tool.
   */
  forcesCssPrefersreducedmotion: 'Forces CSS `prefers-reduced-motion` media feature',
  /**
   * @description Explanation text for the 'Forces CSS prefers-contrast media' setting in the Rendering tool.
   */
  forcesCssPreferscontrastMedia: 'Forces CSS `prefers-contrast` media feature',
  /**
   * @description Explanation text for the 'Forces CSS prefers-reduced-data media' setting in the Rendering tool.
   */
  forcesCssPrefersreduceddataMedia: 'Forces CSS `prefers-reduced-data` media feature',
  /**
   * @description Explanation text for the 'Forces CSS prefers-reduced-transparency media' setting in the Rendering tool.
   */
  forcesCssPrefersreducedtransparencyMedia: 'Forces CSS `prefers-reduced-transparency` media feature',
  /**
   * @description Explanation text for the 'Forces CSS color-gamut media' setting in the Rendering tool.
   */
  forcesCssColorgamutMediaFeature: 'Forces CSS `color-gamut` media feature',
  /**
   * @description Explanation text for the 'Emulate vision deficiencies' setting in the Rendering tool.
   */
  forcesVisionDeficiencyEmulation: 'Forces vision deficiency emulation',
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting disables the
   * page from loading images with the AVIF format.
   */
  disableAvifImageFormat: 'Disable `AVIF` image format',
  /**
   * @description Explanation text for both the 'Disable AVIF image format' and 'Disable WebP image
   * format' settings in the Rendering tool.
   */
  requiresAPageReloadToApplyAnd: 'Requires a page reload to apply and disables caching for image requests.',
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting disables the
   * page from loading images with the WebP format.
   */
  disableWebpImageFormat: 'Disable `WebP` image format',
  /**
   * @description Explanation text for the 'Forces CSS forced-colors' setting in the Rendering tool.
   */
  forcesCssForcedColors: 'Forces CSS forced-colors media feature',
};
const str_ = i18n.i18n.registerUIStrings('entrypoints/inspector_main/RenderingOptions.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// TODO(1096068): remove this feature detection and expose the UI
// unconditionally once prefers-reduced-data ships unflagged. At that
// point, we can also add `category` and `tags` to the entry in
// `front_end/sdk/module.json` to make this feature available in the
// Command Menu.
const supportsPrefersReducedData = (): boolean => {
  const query = 'not all and (prefers-reduced-data), (prefers-reduced-data)';
  return window.matchMedia(query).matches;
};

// TODO(1424879): remove this feature detection and expose the UI
// unconditionally once prefers-reduced-transparency ships unflagged.
const supportsPrefersReducedTransparency = (): boolean => {
  const query = 'not all and (prefers-reduced-transparency), (prefers-reduced-transparency)';
  return window.matchMedia(query).matches;
};

const supportsPrefersContrast = (): boolean => {
  const query = 'not all and (prefers-contrast), (prefers-contrast)';
  return window.matchMedia(query).matches;
};

export class RenderingOptionsView extends UI.Widget.VBox {
  constructor() {
    super(true);

    this.element.setAttribute('jslog', `${VisualLogging.panel('rendering').track({resize: true})}`);

    this.#appendCheckbox(
        i18nString(UIStrings.paintFlashing), i18nString(UIStrings.highlightsAreasOfThePageGreen),
        Common.Settings.Settings.instance().moduleSetting('show-paint-rects'));
    this.#appendCheckbox(
        i18nString(UIStrings.layoutShiftRegions), i18nString(UIStrings.highlightsAreasOfThePageBlueThat),
        Common.Settings.Settings.instance().moduleSetting('show-layout-shift-regions'));
    this.#appendCheckbox(
        i18nString(UIStrings.layerBorders), i18nString(UIStrings.showsLayerBordersOrangeoliveAnd),
        Common.Settings.Settings.instance().moduleSetting('show-debug-borders'));
    this.#appendCheckbox(
        i18nString(UIStrings.frameRenderingStats), i18nString(UIStrings.plotsFrameThroughputDropped),
        Common.Settings.Settings.instance().moduleSetting('show-fps-counter'));
    this.#appendCheckbox(
        i18nString(UIStrings.scrollingPerformanceIssues), i18nString(UIStrings.highlightsElementsTealThatCan),
        Common.Settings.Settings.instance().moduleSetting('show-scroll-bottleneck-rects'));
    this.#appendCheckbox(
        i18nString(UIStrings.highlightAdFrames), i18nString(UIStrings.highlightsFramesRedDetectedToBe),
        Common.Settings.Settings.instance().moduleSetting('show-ad-highlights'));
    this.#appendCheckbox(
        i18nString(UIStrings.disableLocalFonts), i18nString(UIStrings.disablesLocalSourcesInFontface),
        Common.Settings.Settings.instance().moduleSetting('local-fonts-disabled'));
    this.#appendCheckbox(
        i18nString(UIStrings.emulateAFocusedPage), i18nString(UIStrings.emulatesAFocusedPage),
        Common.Settings.Settings.instance().moduleSetting('emulate-page-focus'),
        {toggle: Host.UserMetrics.Action.ToggleEmulateFocusedPageFromRenderingTab});
    this.#appendCheckbox(
        i18nString(UIStrings.emulateAutoDarkMode), i18nString(UIStrings.emulatesAutoDarkMode),
        Common.Settings.Settings.instance().moduleSetting('emulate-auto-dark-mode'));

    this.contentElement.createChild('div').classList.add('panel-section-separator');

    this.#appendSelect(
        i18nString(UIStrings.forcesCssPreferscolorschemeMedia),
        Common.Settings.Settings.instance().moduleSetting('emulated-css-media-feature-prefers-color-scheme'));
    this.#appendSelect(
        i18nString(UIStrings.forcesMediaTypeForTestingPrint),
        Common.Settings.Settings.instance().moduleSetting('emulated-css-media'));
    this.#appendSelect(
        i18nString(UIStrings.forcesCssForcedColors),
        Common.Settings.Settings.instance().moduleSetting('emulated-css-media-feature-forced-colors'));
    if (supportsPrefersContrast()) {
      this.#appendSelect(
          i18nString(UIStrings.forcesCssPreferscontrastMedia),
          Common.Settings.Settings.instance().moduleSetting('emulated-css-media-feature-prefers-contrast'));
    }
    this.#appendSelect(
        i18nString(UIStrings.forcesCssPrefersreducedmotion),
        Common.Settings.Settings.instance().moduleSetting('emulated-css-media-feature-prefers-reduced-motion'));
    if (supportsPrefersReducedData()) {
      this.#appendSelect(
          i18nString(UIStrings.forcesCssPrefersreduceddataMedia),
          Common.Settings.Settings.instance().moduleSetting('emulated-css-media-feature-prefers-reduced-data'));
    }
    if (supportsPrefersReducedTransparency()) {
      this.#appendSelect(
          i18nString(UIStrings.forcesCssPrefersreducedtransparencyMedia),
          Common.Settings.Settings.instance().moduleSetting('emulated-css-media-feature-prefers-reduced-transparency'));
    }
    this.#appendSelect(
        i18nString(UIStrings.forcesCssColorgamutMediaFeature),
        Common.Settings.Settings.instance().moduleSetting('emulated-css-media-feature-color-gamut'));
    this.contentElement.createChild('div').classList.add('panel-section-separator');

    this.#appendSelect(
        i18nString(UIStrings.forcesVisionDeficiencyEmulation),
        Common.Settings.Settings.instance().moduleSetting('emulated-vision-deficiency'));

    this.contentElement.createChild('div').classList.add('panel-section-separator');

    this.#appendCheckbox(
        i18nString(UIStrings.disableAvifImageFormat), i18nString(UIStrings.requiresAPageReloadToApplyAnd),
        Common.Settings.Settings.instance().moduleSetting('avif-format-disabled'));

    this.#appendCheckbox(
        i18nString(UIStrings.disableWebpImageFormat), i18nString(UIStrings.requiresAPageReloadToApplyAnd),
        Common.Settings.Settings.instance().moduleSetting('webp-format-disabled'));

    this.contentElement.createChild('div').classList.add('panel-section-separator');
  }

  #appendCheckbox(
      label: string, subtitle: string, setting: Common.Settings.Setting<boolean>,
      metric?: UI.SettingsUI.UserMetricOptions): UI.UIUtils.CheckboxLabel {
    const checkbox = UI.UIUtils.CheckboxLabel.create(label, false, subtitle, setting.name);
    UI.SettingsUI.bindCheckbox(checkbox.checkboxElement, setting, metric);
    this.contentElement.appendChild(checkbox);
    return checkbox;
  }

  #appendSelect(label: string, setting: Common.Settings.Setting<unknown>): void {
    const control = UI.SettingsUI.createControlForSetting(setting, label);
    if (control) {
      this.contentElement.appendChild(control);
    }
  }
  override wasShown(): void {
    super.wasShown();
    this.registerCSSFiles([renderingOptionsStyles]);
  }
}

export class ReloadActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(_context: UI.Context.Context, actionId: string): boolean {
    const emulatedCSSMediaFeaturePrefersColorSchemeSetting =
        Common.Settings.Settings.instance().moduleSetting('emulated-css-media-feature-prefers-color-scheme');

    switch (actionId) {
      case 'rendering.toggle-prefers-color-scheme': {
        // Cycle between no emulation, light, dark
        const options = ['', 'light', 'dark'];
        const current = options.findIndex(x => x === emulatedCSSMediaFeaturePrefersColorSchemeSetting.get() || '');
        emulatedCSSMediaFeaturePrefersColorSchemeSetting.set(options[(current + 1) % 3]);

        return true;
      }
    }
    return false;
  }
}
