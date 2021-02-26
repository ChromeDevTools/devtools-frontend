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

import * as Common from '../common/common.js';  // eslint-disable-line no-unused-vars
import * as i18n from '../i18n/i18n.js';
import * as UI from '../ui/ui.js';

export const UIStrings = {
  /**
  *@description Text in Rendering Options
  */
  paintFlashing: 'Paint flashing',
  /**
  *@description Checkbox subtitle for 'Paint flashing' in the Rendering tool
  */
  highlightsAreasOfThePageGreen:
      'Highlights areas of the page (green) that need to be repainted. May not be suitable for people prone to photosensitive epilepsy.',
  /**
  *@description Text in Rendering Options
  */
  layoutShiftRegions: 'Layout Shift Regions',
  /**
  *@description Checkbox subtitle for 'Layout Shift Regions' in the Rendering tool
  */
  highlightsAreasOfThePageBlueThat:
      'Highlights areas of the page (blue) that were shifted. May not be suitable for people prone to photosensitive epilepsy.',
  /**
  *@description Text in Rendering Options
  */
  layerBorders: 'Layer borders',
  /**
  *@description Checkbox subtitle for 'Layer boarders' in the Rendering tool
  */
  showsLayerBordersOrangeoliveAnd: 'Shows layer borders (orange/olive) and tiles (cyan).',
  /**
  *@description Text in Rendering Options
  */
  frameRenderingStats: 'Frame Rendering Stats',
  /**
  *@description Checkbox subtitle for 'Frame Rendering Stats' in the Rendering tool
  */
  plotsFrameThroughputDropped: 'Plots frame throughput, dropped frames distribution, and GPU memory.',
  /**
  *@description Checkbox title in Rendering tool
  */
  scrollingPerformanceIssues: 'Scrolling performance issues',
  /**
  *@description Text in Rendering Options
  */
  highlightsElementsTealThatCan:
      'Highlights elements (teal) that can slow down scrolling, including touch & wheel event handlers and other main-thread scrolling situations.',
  /**
  *@description Text to highlight the rendering frames for ads
  */
  highlightAdFrames: 'Highlight ad frames',
  /**
  *@description Text in Rendering Options
  */
  highlightsFramesRedDetectedToBe: 'Highlights frames (red) detected to be ads.',
  /**
  *@description Text in Rendering Options
  */
  hittestBorders: 'Hit-test borders',
  /**
  *@description Checkbox subtitle for 'Hit-test borders' in the Rendering tool
  */
  showsBordersAroundHittestRegions: 'Shows borders around hit-test regions.',
  /**
  *@description Title of checkbox in Rendering Options
  */
  coreWebVitals: 'Core Web Vitals',
  /**
  *@description Text in Rendering Options
  */
  showsAnOverlayWithCoreWebVitals: 'Shows an overlay with Core Web Vitals.',
  /**
  *@description Text that refers to disabling local fonts
  */
  disableLocalFonts: 'Disable local fonts',
  /**
  *@description Subtitle of the checkbox to disable local fonts in Rendering panel
  */
  disablesLocalSourcesInFontface: 'Disables local() sources in @font-face rules. Requires a page reload to apply.',
  /**
  *@description Title of a Rendering setting that can be invoked through the Command Menu
  */
  emulateAFocusedPage: 'Emulate a focused page',
  /**
  *@description Accessibility subtitle for checkbox in Rendering tool
  */
  emulatesAFocusedPage: 'Emulates a focused page.',
  /**
  *@description Accessibility subtitle for media select element in Rendering tool
  */
  forcesMediaTypeForTestingPrint: 'Forces media type for testing print and screen styles',
  /**
  *@description Subtitle for a select box under the Rendering drawer
  */
  forcesCssPreferscolorschemeMedia: 'Forces CSS prefers-color-scheme media feature',
  /**
  *@description Subtitle for a select box under the Rendering drawer
  */
  forcesCssPrefersreducedmotion: 'Forces CSS prefers-reduced-motion media feature',
  /**
  *@description Subtitle for a select box under the Rendering drawer
  */
  forcesCssPrefersreduceddataMedia: 'Forces CSS prefers-reduced-data media feature',
  /**
  *@description Accessibility subtitle for color-gamut select element in Rendering tool
  */
  forcesCssColorgamutMediaFeature: 'Forces CSS color-gamut media feature',
  /**
  *@description Accessibility subtitle for vision deficiency select element in Rendering tool
  */
  forcesVisionDeficiencyEmulation: 'Forces vision deficiency emulation',
  /**
  *@description Title for a checkbox in the Rendering panel
  */
  disableAvifImageFormat: 'Disable AVIF image format',
  /**
  *@description Subtitle for checkboxes that disable WebP and AVIF formats in the Rendering panel
  */
  requiresAPageReloadToApplyAnd: 'Requires a page reload to apply and disables caching for image requests.',
  /**
  *@description Title for a checkbox in the Rendering panel
  */
  disableWebpImageFormat: 'Disable WebP image format',
};
const str_ = i18n.i18n.registerUIStrings('inspector_main/RenderingOptions.js', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// TODO(1096068): remove this feature detection and expose the UI
// unconditionally once prefers-reduced-data ships unflagged. At that
// point, we can also add `category` and `tags` to the entry in
// `front_end/sdk/module.json` to make this feature available in the
// Command Menu.
/**
 * @return {boolean}
 */
const supportsPrefersReducedData = () => {
  const query = '(prefers-reduced-data: reduce)';
  // Note: `media` serializes to `'not all'` for unsupported queries.
  return window.matchMedia(query).media === query;
};

/** @type {!RenderingOptionsView} */
let renderingOptionsViewInstance;

export class RenderingOptionsView extends UI.Widget.VBox {
  /**
     * @private
     */
  constructor() {
    super(true);
    this.registerRequiredCSS('inspector_main/renderingOptions.css', {enableLegacyPatching: false});

    this._appendCheckbox(
        i18nString(UIStrings.paintFlashing), i18nString(UIStrings.highlightsAreasOfThePageGreen),
        Common.Settings.Settings.instance().moduleSetting('showPaintRects'));
    this._appendCheckbox(
        i18nString(UIStrings.layoutShiftRegions), i18nString(UIStrings.highlightsAreasOfThePageBlueThat),
        Common.Settings.Settings.instance().moduleSetting('showLayoutShiftRegions'));
    this._appendCheckbox(
        i18nString(UIStrings.layerBorders), i18nString(UIStrings.showsLayerBordersOrangeoliveAnd),
        Common.Settings.Settings.instance().moduleSetting('showDebugBorders'));
    this._appendCheckbox(
        i18nString(UIStrings.frameRenderingStats), i18nString(UIStrings.plotsFrameThroughputDropped),
        Common.Settings.Settings.instance().moduleSetting('showFPSCounter'));
    this._appendCheckbox(
        i18nString(UIStrings.scrollingPerformanceIssues), i18nString(UIStrings.highlightsElementsTealThatCan),
        Common.Settings.Settings.instance().moduleSetting('showScrollBottleneckRects'));
    this._appendCheckbox(
        i18nString(UIStrings.highlightAdFrames), i18nString(UIStrings.highlightsFramesRedDetectedToBe),
        Common.Settings.Settings.instance().moduleSetting('showAdHighlights'));
    this._appendCheckbox(
        i18nString(UIStrings.hittestBorders), i18nString(UIStrings.showsBordersAroundHittestRegions),
        Common.Settings.Settings.instance().moduleSetting('showHitTestBorders'));
    this._appendCheckbox(
        i18nString(UIStrings.coreWebVitals), i18nString(UIStrings.showsAnOverlayWithCoreWebVitals),
        Common.Settings.Settings.instance().moduleSetting('showWebVitals'));
    this._appendCheckbox(
        i18nString(UIStrings.disableLocalFonts), i18nString(UIStrings.disablesLocalSourcesInFontface),
        Common.Settings.Settings.instance().moduleSetting('localFontsDisabled'));
    this._appendCheckbox(
        i18nString(UIStrings.emulateAFocusedPage), i18nString(UIStrings.emulatesAFocusedPage),
        Common.Settings.Settings.instance().moduleSetting('emulatePageFocus'));
    this.contentElement.createChild('div').classList.add('panel-section-separator');

    this._appendSelect(
        i18nString(UIStrings.forcesMediaTypeForTestingPrint),
        Common.Settings.Settings.instance().moduleSetting('emulatedCSSMedia'));
    this._appendSelect(
        i18nString(UIStrings.forcesCssPreferscolorschemeMedia),
        Common.Settings.Settings.instance().moduleSetting('emulatedCSSMediaFeaturePrefersColorScheme'));
    this._appendSelect(
        i18nString(UIStrings.forcesCssPrefersreducedmotion),
        Common.Settings.Settings.instance().moduleSetting('emulatedCSSMediaFeaturePrefersReducedMotion'));
    if (supportsPrefersReducedData()) {
      this._appendSelect(
          i18nString(UIStrings.forcesCssPrefersreduceddataMedia),
          Common.Settings.Settings.instance().moduleSetting('emulatedCSSMediaFeaturePrefersReducedData'));
    }
    this._appendSelect(
        i18nString(UIStrings.forcesCssColorgamutMediaFeature),
        Common.Settings.Settings.instance().moduleSetting('emulatedCSSMediaFeatureColorGamut'));
    this.contentElement.createChild('div').classList.add('panel-section-separator');

    this._appendSelect(
        i18nString(UIStrings.forcesVisionDeficiencyEmulation),
        Common.Settings.Settings.instance().moduleSetting('emulatedVisionDeficiency'));

    this.contentElement.createChild('div').classList.add('panel-section-separator');

    this._appendCheckbox(
        i18nString(UIStrings.disableAvifImageFormat), i18nString(UIStrings.requiresAPageReloadToApplyAnd),
        Common.Settings.Settings.instance().moduleSetting('avifFormatDisabled'));

    this._appendCheckbox(
        i18nString(UIStrings.disableWebpImageFormat), i18nString(UIStrings.requiresAPageReloadToApplyAnd),
        Common.Settings.Settings.instance().moduleSetting('webpFormatDisabled'));

    this.contentElement.createChild('div').classList.add('panel-section-separator');
  }

  /**
   * @param {{forceNew: ?boolean}} opts
   */
  static instance(opts = {forceNew: null}) {
    const {forceNew} = opts;
    if (!renderingOptionsViewInstance || forceNew) {
      renderingOptionsViewInstance = new RenderingOptionsView();
    }

    return renderingOptionsViewInstance;
  }

  /**
   * @param {string} label
   * @param {string} subtitle
   * @param {!Common.Settings.Setting<boolean>} setting
   */
  _appendCheckbox(label, subtitle, setting) {
    const checkboxLabel = UI.UIUtils.CheckboxLabel.create(label, false, subtitle);
    UI.SettingsUI.bindCheckbox(checkboxLabel.checkboxElement, setting);
    this.contentElement.appendChild(checkboxLabel);
  }

  /**
   * @param {string} label
   * @param {!Common.Settings.Setting<*>} setting
   */
  _appendSelect(label, setting) {
    const control = UI.SettingsUI.createControlForSetting(setting, label);
    if (control) {
      this.contentElement.appendChild(control);
    }
  }
}
