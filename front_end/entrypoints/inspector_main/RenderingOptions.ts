// Copyright 2013 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as Host from '../../core/host/host.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as SettingsUI from '../../ui/legacy/components/settings_ui/settings_ui.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as Lit from '../../ui/lit/lit.js';
import * as VisualLogging from '../../ui/visual_logging/visual_logging.js';

import renderingOptionsStyles from './renderingOptions.css.js';

const {html, nothing, render} = Lit;
const {bindToSetting} = UI.UIUtils;
const {renderControlForSetting} = SettingsUI.SettingsUI;

const UIStrings = {
  /**
   * @description The name of a checkbox setting in the Rendering panel. This setting highlights areas
   * of the webpage that need to be repainted (re-drawn by the browser).
   */
  paintFlashing: 'Paint flashing',
  /**
   * @description Explanation text for the 'Paint flashing' setting in the Rendering panel.
   */
  highlightsAreasOfThePageGreen:
      'Highlights areas of the page (green) that need to be repainted. May not be suitable for people prone to photosensitive epilepsy.',
  /**
   * @description The name of a checkbox setting in the Rendering panel. This setting highlights areas
   * (regions) of the page that were shifted (where a 'layout shift' occurred). A layout shift is
   * where elements on the webpage move around and cause other nearby elements to move as well.
   */
  layoutShiftRegions: 'Layout shift regions',
  /**
   * @description Explanation text for the 'Layout shift regions' setting in the Rendering panel.
   */
  highlightsAreasOfThePageBlueThat:
      'Highlights areas of the page (blue) that were shifted. May not be suitable for people prone to photosensitive epilepsy.',
  /**
   * @description The name of a checkbox setting in the Rendering panel. This setting shows the
   * borders of layers on the page. Layer is a noun.
   */
  layerBorders: 'Layer borders',
  /**
   * @description Explanation text for the 'Layer borders' setting in the Rendering panel.
   */
  showsLayerBordersOrangeoliveAnd: 'Shows layer borders (orange/olive) and tiles (cyan)',
  /**
   * @description The name of a checkbox setting in the Rendering panel. This setting shows the
   * rendering statistics for frames e.g. frames per second. Frame is a noun.
   */
  frameRenderingStats: 'Frame rendering stats',
  /**
   * @description Explanation text for the 'Frame rendering stats' setting in the Rendering panel.
   * Plots is a verb. GPU = Graphics Processing Unit.
   */
  plotsFrameThroughputDropped: 'Plots frame throughput, dropped frames distribution, and GPU memory',
  /**
   * @description The name of a checkbox setting in the Rendering panel. This setting highlights
   * elements that can slow down scrolling on the page.
   */
  scrollingPerformanceIssues: 'Scrolling performance issues',
  /**
   * @description Explanation text for the 'Scrolling performance issues' setting in the Rendering panel.
   */
  highlightsElementsTealThatCan:
      'Highlights elements (teal) that can slow down scrolling, including touch & wheel event handlers and other main-thread scrolling situations',
  /**
   * @description The name of a checkbox setting in the Rendering panel. This setting highlights the
   * rendering elements for ads that are found on the page.
   */
  highlightAds: 'Highlight ads',
  /**
   * @description Explanation text for the 'Highlight ads' setting in the Rendering panel.
   */
  highlightsElementsRedDetectedToBe: 'Highlights elements (red) detected to be ads',
  /**
   * @description The name of a checkbox setting in the Rendering panel. This setting prevents the
   * webpage from loading 'local' fonts. Local fonts are fonts that are installed on the user's
   * computer, and not loaded over the network.
   */
  disableLocalFonts: 'Disable local fonts',
  /**
   * @description Explanation text for the 'Disable local fonts' setting in the Rendering panel.
   */
  disablesLocalSourcesInFontface: 'Disables `local()` sources in `@font-face` rules. Requires a page reload to apply.',
  /**
   * @description The name of a checkbox setting in the Rendering panel. This setting
   * emulates/pretends that the webpage is focused i.e. that the user interacted with it most
   * recently.
   */
  emulateAFocusedPage: 'Emulate a focused page',
  /**
   * @description Explanation text for the 'Emulate a focused page' setting in the Rendering panel.
   */
  emulatesAFocusedPage: 'Keep page focused. Commonly used for debugging disappearing elements.',
  /**
   * @description The name of a checkbox setting in the Rendering panel. This setting enables auto dark mode emulation.
   */
  emulateAutoDarkMode: 'Enable automatic dark mode',
  /**
   * @description Explanation text for the 'Emulate automatic dark mode' setting in the Rendering panel.
   */
  emulatesAutoDarkMode: 'Enables automatic dark mode and sets `prefers-color-scheme` to `dark`',
  /**
   * @description Explanation text for the 'Emulate CSS media type' setting in the Rendering panel.
   * This setting overrides the CSS media type on the page (https://developer.mozilla.org/en-US/docs/Web/CSS/@media#media_types).
   */
  forcesMediaTypeForTestingPrint: 'Forces media type for testing `print` and `screen` styles',
  /**
   * @description Explanation text for the 'Forces CSS prefers-color-scheme media' setting in the Rendering panel.
   */
  forcesCssPreferscolorschemeMedia: 'Forces CSS `prefers-color-scheme` media feature',
  /**
   * @description Explanation text for the 'Forces CSS prefers-reduced-motion media' setting in the Rendering panel.
   */
  forcesCssPrefersreducedmotion: 'Forces CSS `prefers-reduced-motion` media feature',
  /**
   * @description Explanation text for the 'Forces CSS prefers-contrast media' setting in the Rendering panel.
   */
  forcesCssPreferscontrastMedia: 'Forces CSS `prefers-contrast` media feature',
  /**
   * @description Explanation text for the 'Forces CSS prefers-reduced-data media' setting in the Rendering panel.
   */
  forcesCssPrefersreduceddataMedia: 'Forces CSS `prefers-reduced-data` media feature',
  /**
   * @description Explanation text for the 'Forces CSS prefers-reduced-transparency media' setting in the Rendering panel.
   */
  forcesCssPrefersreducedtransparencyMedia: 'Forces CSS `prefers-reduced-transparency` media feature',
  /**
   * @description Explanation text for the 'Forces CSS color-gamut media' setting in the Rendering panel.
   */
  forcesCssColorgamutMediaFeature: 'Forces CSS `color-gamut` media feature',
  /**
   * @description Explanation text for the 'Emulate vision deficiencies' setting in the Rendering panel.
   */
  forcesVisionDeficiencyEmulation: 'Forces vision deficiency emulation',
  /**
   * @description Explanation text for the 'Emulate OS text scale' setting in the Rendering panel.
   */
  forcesOsTextScaleEmulation: 'Forces OS text scale emulation',
  /**
   * @description The name of a checkbox setting in the Rendering panel. This setting disables the
   * page from loading images with the AVIF format.
   */
  disableAvifImageFormat: 'Disable `AVIF` image format',
  /**
   * @description Explanation text for the image format disabling settings in the Rendering panel.
   */
  requiresAPageReloadToApplyAnd: 'Requires a page reload to apply and disables caching for image requests',
  /**
   * @description The name of a checkbox setting in the Rendering panel. This setting disables the
   * page from loading images with the JPEG XL format.
   */
  disableJpegXlImageFormat: 'Disable `JPEG XL` image format',
  /**
   * @description The name of a checkbox setting in the Rendering panel. This setting disables the
   * page from loading images with the WebP format.
   */
  disableWebpImageFormat: 'Disable `WebP` image format',
  /**
   * @description Explanation text for the 'Forces CSS forced-colors' setting in the Rendering panel.
   */
  forcesCssForcedColors: 'Forces CSS `forced-colors` media feature',
} as const;
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

const supportsJpegXl = (): boolean => {
  return Boolean(Root.Runtime.hostConfig.devToolsJpegXlImageFormat?.enabled);
};

export interface ViewInput {
  showPaintRectsSetting: Common.Settings.Setting<boolean>;
  showLayoutShiftRegionsSetting: Common.Settings.Setting<boolean>;
  showDebugBordersSetting: Common.Settings.Setting<boolean>;
  showFPSCounterSetting: Common.Settings.Setting<boolean>;
  showScrollBottleneckRectsSetting: Common.Settings.Setting<boolean>;
  showAdHighlightsSetting: Common.Settings.Setting<boolean>|null;
  localFontsDisabledSetting: Common.Settings.Setting<boolean>;
  emulatePageFocusSetting: Common.Settings.Setting<boolean>;
  onEmulatePageFocusChange: () => void;
  emulateAutoDarkModeSetting: Common.Settings.Setting<boolean>;
  prefersColorSchemeSetting: Common.Settings.Setting<string>;
  prefersColorSchemeDisabled: boolean;
  emulatedCSSMediaSetting: Common.Settings.Setting<string>;
  forcedColorsSetting: Common.Settings.Setting<string>;
  prefersContrastSetting: Common.Settings.Setting<string>|null;
  prefersReducedMotionSetting: Common.Settings.Setting<string>;
  prefersReducedDataSetting: Common.Settings.Setting<string>|null;
  prefersReducedTransparencySetting: Common.Settings.Setting<string>|null;
  colorGamutSetting: Common.Settings.Setting<string>;
  visionDeficiencySetting: Common.Settings.Setting<unknown>;
  osTextScaleSetting: Common.Settings.Setting<string>;
  avifFormatDisabledSetting: Common.Settings.Setting<boolean>;
  jpegXlFormatDisabledSetting: Common.Settings.Setting<boolean>|null;
  webpFormatDisabledSetting: Common.Settings.Setting<boolean>;
}

export type ViewOutput = undefined;

export type View = (input: ViewInput, output: ViewOutput, target: HTMLElement) => void;

function renderCheckbox(label: Common.UIString.LocalizedString, subtitle: Common.UIString.LocalizedString,
                        setting: Common.Settings.Setting<boolean>, onChange?: () => void): Lit.TemplateResult {
  // clang-format off
  return html`
    <devtools-checkbox
      title=${label}
      ${bindToSetting(setting)}
      @change=${onChange ?? nothing}>
      ${label}
      <div class="devtools-checkbox-subtitle">${subtitle}</div>
    </devtools-checkbox>
  `;
  // clang-format on
}

export const DEFAULT_VIEW: View = (input, _output, target) => {
  // clang-format off
  render(
      html`
        <style>${renderingOptionsStyles}</style>
        ${renderCheckbox(
            i18nString(UIStrings.paintFlashing),
            i18nString(UIStrings.highlightsAreasOfThePageGreen),
            input.showPaintRectsSetting)}
        ${renderCheckbox(
            i18nString(UIStrings.layoutShiftRegions),
            i18nString(UIStrings.highlightsAreasOfThePageBlueThat),
            input.showLayoutShiftRegionsSetting)}
        ${renderCheckbox(
            i18nString(UIStrings.layerBorders),
            i18nString(UIStrings.showsLayerBordersOrangeoliveAnd),
            input.showDebugBordersSetting)}
        ${renderCheckbox(
            i18nString(UIStrings.frameRenderingStats),
            i18nString(UIStrings.plotsFrameThroughputDropped),
            input.showFPSCounterSetting)}
        ${renderCheckbox(
            i18nString(UIStrings.scrollingPerformanceIssues),
            i18nString(UIStrings.highlightsElementsTealThatCan),
            input.showScrollBottleneckRectsSetting)}
        ${input.showAdHighlightsSetting ? renderCheckbox(
            i18nString(UIStrings.highlightAds),
            i18nString(UIStrings.highlightsElementsRedDetectedToBe),
            input.showAdHighlightsSetting) : nothing}
        ${renderCheckbox(
            i18nString(UIStrings.disableLocalFonts),
            i18nString(UIStrings.disablesLocalSourcesInFontface),
            input.localFontsDisabledSetting)}
        ${renderCheckbox(
            i18nString(UIStrings.emulateAFocusedPage),
            i18nString(UIStrings.emulatesAFocusedPage),
            input.emulatePageFocusSetting,
            input.onEmulatePageFocusChange)}
        ${renderCheckbox(
            i18nString(UIStrings.emulateAutoDarkMode),
            i18nString(UIStrings.emulatesAutoDarkMode),
            input.emulateAutoDarkModeSetting)}
        <div class="panel-section-separator"></div>
        ${renderControlForSetting(
            input.prefersColorSchemeSetting,
            i18nString(UIStrings.forcesCssPreferscolorschemeMedia),
            input.prefersColorSchemeDisabled)}
        ${renderControlForSetting(
            input.emulatedCSSMediaSetting,
            i18nString(UIStrings.forcesMediaTypeForTestingPrint))}
        ${renderControlForSetting(
            input.forcedColorsSetting,
            i18nString(UIStrings.forcesCssForcedColors))}
        ${input.prefersContrastSetting ? renderControlForSetting(
            input.prefersContrastSetting,
            i18nString(UIStrings.forcesCssPreferscontrastMedia)) : nothing}
        ${renderControlForSetting(
            input.prefersReducedMotionSetting,
            i18nString(UIStrings.forcesCssPrefersreducedmotion))}
        ${input.prefersReducedDataSetting ? renderControlForSetting(
            input.prefersReducedDataSetting,
            i18nString(UIStrings.forcesCssPrefersreduceddataMedia)) : nothing}
        ${input.prefersReducedTransparencySetting ? renderControlForSetting(
            input.prefersReducedTransparencySetting,
            i18nString(UIStrings.forcesCssPrefersreducedtransparencyMedia)) : nothing}
        ${renderControlForSetting(
            input.colorGamutSetting,
            i18nString(UIStrings.forcesCssColorgamutMediaFeature))}
        <div class="panel-section-separator"></div>
        ${renderControlForSetting(
            input.visionDeficiencySetting,
            i18nString(UIStrings.forcesVisionDeficiencyEmulation))}
        <div class="panel-section-separator"></div>
        ${renderControlForSetting(
            input.osTextScaleSetting,
            i18nString(UIStrings.forcesOsTextScaleEmulation))}
        <div class="panel-section-separator"></div>
        ${renderCheckbox(
            i18nString(UIStrings.disableAvifImageFormat),
            i18nString(UIStrings.requiresAPageReloadToApplyAnd),
            input.avifFormatDisabledSetting)}
        ${input.jpegXlFormatDisabledSetting ? renderCheckbox(
            i18nString(UIStrings.disableJpegXlImageFormat),
            i18nString(UIStrings.requiresAPageReloadToApplyAnd),
            input.jpegXlFormatDisabledSetting) : nothing}
        ${renderCheckbox(
            i18nString(UIStrings.disableWebpImageFormat),
            i18nString(UIStrings.requiresAPageReloadToApplyAnd),
            input.webpFormatDisabledSetting)}
        <div class="panel-section-separator"></div>
      `,
      target, {container: {attributes: {jslog: `${VisualLogging.panel('rendering').track({resize: true})}`}}});
  // clang-format on
};

export class RenderingOptionsView extends UI.Widget.VBox {
  readonly #view: View;
  readonly #autoDarkModeSetting =
      Common.Settings.Settings.instance().resolve(SDK.SDKSettings.emulateAutoDarkModeSettingDescriptor);

  constructor(element?: HTMLElement, view: View = DEFAULT_VIEW) {
    super(element, {useShadowDom: true});
    this.#view = view;
    this.requestUpdate();
  }

  override wasShown(): void {
    super.wasShown();
    this.#autoDarkModeSetting.addChangeListener(this.requestUpdate, this);
    this.requestUpdate();
  }

  override willHide(): void {
    super.willHide();
    this.#autoDarkModeSetting.removeChangeListener(this.requestUpdate, this);
  }

  override performUpdate(): void {
    const settings = Common.Settings.Settings.instance();
    const viewInput: ViewInput = {
      showPaintRectsSetting: settings.resolve(SDK.SDKSettings.showPaintRectsSettingDescriptor),
      showLayoutShiftRegionsSetting: settings.resolve(SDK.SDKSettings.showLayoutShiftRegionsSettingDescriptor),
      showDebugBordersSetting: settings.resolve(SDK.SDKSettings.showDebugBordersSettingDescriptor),
      showFPSCounterSetting: settings.resolve(SDK.SDKSettings.showFPSCounterSettingDescriptor),
      showScrollBottleneckRectsSetting: settings.resolve(SDK.SDKSettings.showScrollBottleneckRectsSettingDescriptor),
      // The 'Highlight ads' setting now lives in the Ads panel under Application.
      // We display this legacy setting only when the Ads panel isn't enabled.
      showAdHighlightsSetting: Root.Runtime.hostConfig.devToolsAdsPanel?.enabled ?
          null :
          settings.resolve(SDK.SDKSettings.showAdHighlightsSettingDescriptor),
      localFontsDisabledSetting: settings.resolve(SDK.SDKSettings.localFontsDisabledSettingDescriptor),
      emulatePageFocusSetting: settings.resolve(SDK.SDKSettings.emulatePageFocusSettingDescriptor),
      onEmulatePageFocusChange: () => {
        Host.userMetrics.actionTaken(Host.UserMetrics.Action.ToggleEmulateFocusedPageFromRenderingTab);
      },
      emulateAutoDarkModeSetting: this.#autoDarkModeSetting,
      prefersColorSchemeSetting:
          settings.resolve(SDK.SDKSettings.emulatedCSSMediaFeaturePrefersColorSchemeSettingDescriptor),
      prefersColorSchemeDisabled: Boolean(this.#autoDarkModeSetting.get()),
      emulatedCSSMediaSetting: settings.resolve(SDK.SDKSettings.emulatedCSSMediaSettingDescriptor),
      forcedColorsSetting: settings.resolve(SDK.SDKSettings.emulatedCSSMediaFeatureForcedColorsSettingDescriptor),
      prefersContrastSetting: supportsPrefersContrast() ?
          settings.resolve(SDK.SDKSettings.emulatedCSSMediaFeaturePrefersContrastSettingDescriptor) :
          null,
      prefersReducedMotionSetting:
          settings.resolve(SDK.SDKSettings.emulatedCSSMediaFeaturePrefersReducedMotionSettingDescriptor),
      prefersReducedDataSetting: supportsPrefersReducedData() ?
          settings.resolve(SDK.SDKSettings.emulatedCSSMediaFeaturePrefersReducedDataSettingDescriptor) :
          null,
      prefersReducedTransparencySetting: supportsPrefersReducedTransparency() ?
          settings.resolve(SDK.SDKSettings.emulatedCSSMediaFeaturePrefersReducedTransparencySettingDescriptor) :
          null,
      colorGamutSetting: settings.resolve(SDK.SDKSettings.emulatedCSSMediaFeatureColorGamutSettingDescriptor),
      visionDeficiencySetting: settings.resolve(SDK.SDKSettings.emulatedVisionDeficiencySettingDescriptor),
      osTextScaleSetting: settings.resolve(SDK.SDKSettings.emulatedOSTextScaleSettingDescriptor),
      avifFormatDisabledSetting: settings.resolve(SDK.SDKSettings.avifFormatDisabledSettingDescriptor),
      jpegXlFormatDisabledSetting:
          supportsJpegXl() ? settings.resolve(SDK.SDKSettings.jpegXlFormatDisabledSettingDescriptor) : null,
      webpFormatDisabledSetting: settings.resolve(SDK.SDKSettings.webpFormatDisabledSettingDescriptor),
    };
    this.#view(viewInput, undefined, this.contentElement);
  }
}

export class ReloadActionDelegate implements UI.ActionRegistration.ActionDelegate {
  handleAction(_context: UI.Context.Context, actionId: string): boolean {
    const emulatedCSSMediaFeaturePrefersColorSchemeSetting = Common.Settings.Settings.instance().resolve(
        SDK.SDKSettings.emulatedCSSMediaFeaturePrefersColorSchemeSettingDescriptor);

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
