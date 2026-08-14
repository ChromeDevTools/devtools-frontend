// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as SettingsUI from '../../ui/settings/settings.js';

import type * as InspectorMain from './inspector_main.js';

const UIStrings = {
  /**
   * @description Title of an option under the Rendering category that can be invoked through the Command Menu.
   */
  showPaintFlashingRectangles: 'Show paint flashing rectangles',
  /**
   * @description Title of an option under the Rendering category that can be invoked through the Command Menu.
   */
  hidePaintFlashingRectangles: 'Hide paint flashing rectangles',
  /**
   * @description Title of an option under the Rendering category that can be invoked through the Command Menu.
   */
  showLayoutShiftRegions: 'Show layout shift regions',
  /**
   * @description Title of an option under the Rendering category that can be invoked through the Command Menu.
   */
  hideLayoutShiftRegions: 'Hide layout shift regions',
  /**
   * @description Text to highlight the rendering frames for ads.
   */
  highlightAdFrames: 'Highlight ad frames',
  /**
   * @description Title of an option under the Rendering category that can be invoked through the Command Menu.
   */
  doNotHighlightAdFrames: 'Do not highlight ad frames',
  /**
   * @description Title of an option under the Rendering category that can be invoked through the Command Menu.
   */
  showLayerBorders: 'Show layer borders',
  /**
   * @description Title of an option under the Rendering category that can be invoked through the Command Menu.
   */
  hideLayerBorders: 'Hide layer borders',
  /**
   * @description Title of an option under the Rendering category that can be invoked through the Command Menu.
   */
  showFramesPerSecondFpsMeter: 'Show frames per second (FPS) meter',
  /**
   * @description Title of an option under the Rendering category that can be invoked through the Command Menu.
   */
  hideFramesPerSecondFpsMeter: 'Hide frames per second (FPS) meter',
  /**
   * @description Title of an option under the Rendering category that can be invoked through the Command Menu.
   */
  showScrollPerformanceBottlenecks: 'Show scroll performance bottlenecks',
  /**
   * @description Title of an option under the Rendering category that can be invoked through the Command Menu.
   */
  hideScrollPerformanceBottlenecks: 'Hide scroll performance bottlenecks',
  /**
   * @description Title of a Rendering setting that can be invoked through the Command Menu.
   */
  emulateAFocusedPage: 'Emulate a focused page',
  /**
   * @description Title of a Rendering setting that can be invoked through the Command Menu.
   */
  doNotEmulateAFocusedPage: 'Do not emulate a focused page',
  /**
   * @description Title of a setting under the Rendering category that can be invoked through the Command Menu.
   */
  doNotEmulateCssMediaType: 'Do not emulate CSS media type',
  /**
   * @description A drop-down menu option to do not emulate css media type.
   */
  noEmulation: 'No emulation',
  /**
   * @description Title of a setting under the Rendering category that can be invoked through the Command Menu.
   */
  emulateCssPrintMediaType: 'Emulate CSS print media type',
  /**
   * @description A drop-down menu option to emulate css print media type.
   */
  print: 'print',
  /**
   * @description Title of a setting under the Rendering category that can be invoked through the Command Menu.
   */
  emulateCssScreenMediaType: 'Emulate CSS screen media type',
  /**
   * @description A drop-down menu option to emulate css screen media type.
   */
  screen: 'screen',
  /**
   * @description A tag of Emulate CSS screen media type setting that can be searched in the command menu.
   */
  query: 'query',
  /**
   * @description Title of a setting under the Rendering drawer.
   */
  emulateCssMediaType: 'Emulate CSS media type',
  /**
   * @description Title of a setting under the Rendering drawer that can be invoked through the Command Menu.
   * @example {prefers-color-scheme} PH1
   */
  doNotEmulateCss: 'Do not emulate CSS {PH1}',
  /**
   * @description Title of a setting under the Rendering drawer that can be invoked through the Command Menu.
   * @example {prefers-color-scheme: light} PH1
   */
  emulateCss: 'Emulate CSS {PH1}',
  /**
   * @description Title of a setting under the Rendering drawer that can be invoked through the Command Menu.
   * @example {prefers-color-scheme} PH1
   */
  emulateCssMediaFeature: 'Emulate CSS media feature {PH1}',
  /**
   * @description Title of the Rendering panel. The Rendering panel is a collection of settings that
   * lets the user debug the rendering (i.e. how the website is drawn onto the screen) of the
   * website (https://developer.chrome.com/docs/devtools/evaluate-performance/reference#rendering).
   */
  rendering: 'Rendering',
  /**
   * @description Command for showing the Rendering panel.
   */
  showRendering: 'Show Rendering',
  /**
   * @description Command Menu search query that points to the Rendering panel. This refers to the
   * process of drawing pixels onto the screen (called painting).
   */
  paint: 'paint',
  /**
   * @description Command Menu search query that points to the Rendering panel. Layout is a phase of
   * rendering a website where the browser calculates where different elements in the website will go
   * on the screen.
   */
  layout: 'layout',
  /**
   * @description Command Menu search query that points to the Rendering panel. 'fps' is an acronym
   * for 'Frames per second'. It is in lowercase here because the search box the user will type this
   * into is case-insensitive. If there is an equivalent acronym/shortening in the target language
   * then a translation would be appropriate, otherwise it can be left in English.
   */
  fps: 'fps',
  /**
   * @description Command Menu search query that points to the Rendering panel
   * (https://developer.mozilla.org/en-US/docs/Web/CSS/@media#media_types). This is something the user
   * might type in to search for the setting to change the CSS media type.
   */
  cssMediaType: 'CSS media type',
  /**
   * @description Command Menu search query that points to the Rendering panel
   * (https://developer.mozilla.org/en-US/docs/Web/CSS/@media#media_features). This is something the
   * user might type in to search for the setting to change the value of various CSS media features.
   */
  cssMediaFeature: 'CSS media feature',
  /**
   * @description Command Menu search query that points to the Rendering panel. Possible search term
   * when the user wants to find settings related to visual impairment e.g. blurry vision, blindness.
   */
  visionDeficiency: 'vision deficiency',
  /**
   * @description Command Menu search query that points to the Rendering panel. Possible search term
   * when the user wants to find settings related to color vision deficiency/color blindness.
   */
  colorVisionDeficiency: 'color vision deficiency',
  /**
   * @description Title of a setting under the Rendering drawer that can be invoked through the Command Menu.
   */
  doNotEmulateAnyVisionDeficiency: 'Do not emulate any vision deficiency',
  /**
   * @description Title of a setting under the Rendering drawer that can be invoked through the Command Menu.
   */
  emulateBlurredVision: 'Emulate blurred vision',
  /**
   * @description Title of a setting under the Rendering drawer that can be invoked through the Command Menu.
   */
  emulateReducedContrast: 'Emulate reduced contrast',
  /**
   * @description Name of a vision deficiency that can be emulated via the Rendering drawer.
   */
  blurredVision: 'Blurred vision',
  /**
   * @description Name of a vision deficiency that can be emulated via the Rendering drawer.
   */
  reducedContrast: 'Reduced contrast',
  /**
   * @description Title of a setting under the Rendering drawer that can be invoked through the Command Menu.
   */
  emulateProtanopia: 'Emulate protanopia (no red)',
  /**
   * @description Name of a color vision deficiency that can be emulated via the Rendering drawer.
   */
  protanopia: 'Protanopia (no red)',
  /**
   * @description Title of a setting under the Rendering drawer that can be invoked through the Command Menu.
   */
  emulateDeuteranopia: 'Emulate deuteranopia (no green)',
  /**
   * @description Name of a color vision deficiency that can be emulated via the Rendering drawer.
   */
  deuteranopia: 'Deuteranopia (no green)',
  /**
   * @description Title of a setting under the Rendering drawer that can be invoked through the Command Menu.
   */
  emulateTritanopia: 'Emulate tritanopia (no blue)',
  /**
   * @description Name of a color vision deficiency that can be emulated via the Rendering drawer.
   */
  tritanopia: 'Tritanopia (no blue)',
  /**
   * @description Title of a setting under the Rendering drawer that can be invoked through the Command Menu.
   */
  emulateAchromatopsia: 'Emulate achromatopsia (no color)',
  /**
   * @description Name of a color vision deficiency that can be emulated via the Rendering drawer.
   */
  achromatopsia: 'Achromatopsia (no color)',
  /**
   * @description Title of a setting under the Rendering drawer.
   */
  emulateVisionDeficiencies: 'Emulate vision deficiencies',
  /**
   * @description Title of a setting under the Rendering drawer.
   */
  emulateOsTextScale: 'Emulate OS text scale',
  /**
   * @description Title of a setting under the Rendering category that can be invoked through the Command Menu.
   */
  doNotEmulateOsTextScale: 'Do not emulate OS text scale',
  /**
   * @description A drop-down menu option to not emulate OS text scale.
   */
  osTextScaleEmulationNone: 'No emulation',
  /**
   * @description A drop-down menu option to emulate an OS text scale 85%.
   */
  osTextScaleEmulation85: '85%',
  /**
   * @description A drop-down menu option to emulate an OS text scale of 100%.
   */
  osTextScaleEmulation100: '100% (default)',
  /**
   * @description A drop-down menu option to emulate an OS text scale of 115%.
   */
  osTextScaleEmulation115: '115%',
  /**
   * @description A drop-down menu option to emulate an OS text scale of 130%.
   */
  osTextScaleEmulation130: '130%',
  /**
   * @description A drop-down menu option to emulate an OS text scale of 150%.
   */
  osTextScaleEmulation150: '150%',
  /**
   * @description A drop-down menu option to emulate an OS text scale of 180%.
   */
  osTextScaleEmulation180: '180%',
  /**
   * @description A drop-down menu option to emulate an OS text scale of 200%.
   */
  osTextScaleEmulation200: '200%',
  /**
   * @description A drop-down menu option to emulate an OS text scale of 250%.
   */
  osTextScaleEmulation250: '250%',
  /**
   * @description A drop-down menu option to emulate an OS text scale of 300%.
   */
  osTextScaleEmulation300: '300%',
  /**
   * @description A drop-down menu option to emulate an OS text scale of 350%.
   */
  osTextScaleEmulation350: '350%',
  /**
   * @description Text that refers to disabling local fonts.
   */
  disableLocalFonts: 'Disable local fonts',
  /**
   * @description Text that refers to enabling local fonts.
   */
  enableLocalFonts: 'Enable local fonts',
  /**
   * @description Title of a setting that disables AVIF format.
   */
  disableAvifFormat: 'Disable `AVIF` format',
  /**
   * @description Title of a setting that enables AVIF format.
   */
  enableAvifFormat: 'Enable `AVIF` format',
  /**
   * @description Title of a setting that disables JPEG XL format.
   */
  disableJpegXlFormat: 'Disable `JPEG XL` format',
  /**
   * @description Title of a setting that enables JPEG XL format.
   */
  enableJpegXlFormat: 'Enable `JPEG XL` format',
  /**
   * @description Title of a setting that disables WebP format.
   */
  disableWebpFormat: 'Disable `WebP` format',
  /**
   * @description Title of a setting that enables WebP format.
   */
  enableWebpFormat: 'Enable `WebP` format',
  /**
   * @description Title of an action that reloads the inspected page.
   */
  reloadPage: 'Reload page',
  /**
   * @description Title of an action that hard reloads the inspected page. A hard reload also
   * clears the browser's cache, forcing it to reload the most recent version of the page.
   */
  hardReloadPage: 'Hard reload page',
  /**
   * @description Title of a setting under the Network category in Settings. All ads on the site will
   * be blocked (the setting is forced on).
   */
  forceAdBlocking: 'Force ad blocking on this site',
  /**
   * @description A command available in the command menu to block all ads on the current site.
   */
  blockAds: 'Block ads on this site',
  /**
   * @description A command available in the command menu to disable ad blocking on the current site.
   */
  showAds: 'Show ads on this site, if allowed',
  /**
   * @description A command available in the command menu to automatically open DevTools when
   * webpages create new popup windows.
   */
  autoOpenDevTools: 'Auto-open DevTools for popups',
  /**
   * @description A command available in the command menu to stop automatically opening DevTools when
   * webpages create new popup windows.
   */
  doNotAutoOpen: 'Do not auto-open DevTools for popups',
  /**
   * @description Title of an action that toggles the "forces CSS prefers-color-scheme" media feature.
   */
  toggleCssPrefersColorSchemeMedia: 'Toggle CSS media feature `prefers-color-scheme`',
} as const;
const str_ = i18n.i18n.registerUIStrings('entrypoints/inspector_main/inspector_main-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedInspectorMainModule: (typeof InspectorMain|undefined);

async function loadInspectorMainModule(): Promise<typeof InspectorMain> {
  if (!loadedInspectorMainModule) {
    loadedInspectorMainModule = await import('./inspector_main.js');
  }
  return loadedInspectorMainModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'rendering',
  title: i18nLazyString(UIStrings.rendering),
  commandPrompt: i18nLazyString(UIStrings.showRendering),
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  order: 50,
  async loadView() {
    const InspectorMain = await loadInspectorMainModule();
    return new InspectorMain.RenderingOptions.RenderingOptionsView();
  },
  tags: [
    i18nLazyString(UIStrings.paint),
    i18nLazyString(UIStrings.layout),
    i18nLazyString(UIStrings.fps),
    i18nLazyString(UIStrings.cssMediaType),
    i18nLazyString(UIStrings.cssMediaFeature),
    i18nLazyString(UIStrings.visionDeficiency),
    i18nLazyString(UIStrings.colorVisionDeficiency),
  ],
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.NAVIGATION,
  actionId: 'inspector-main.reload',
  async loadActionDelegate() {
    const InspectorMain = await loadInspectorMainModule();
    return new InspectorMain.InspectorMain.ReloadActionDelegate();
  },
  iconClass: UI.ActionRegistration.IconClass.REFRESH,
  title: i18nLazyString(UIStrings.reloadPage),
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+R',
    },
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'F5',
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'Meta+R',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.NAVIGATION,
  actionId: 'inspector-main.hard-reload',
  async loadActionDelegate() {
    const InspectorMain = await loadInspectorMainModule();
    return new InspectorMain.InspectorMain.ReloadActionDelegate();
  },
  title: i18nLazyString(UIStrings.hardReloadPage),
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Shift+Ctrl+R',
    },
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Shift+F5',
    },
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+F5',
    },
    {
      platform: UI.ActionRegistration.Platforms.WINDOWS_LINUX,
      shortcut: 'Ctrl+Shift+F5',
    },
    {
      platform: UI.ActionRegistration.Platforms.MAC,
      shortcut: 'Shift+Meta+R',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'rendering.toggle-prefers-color-scheme',
  category: UI.ActionRegistration.ActionCategory.RENDERING,
  title: i18nLazyString(UIStrings.toggleCssPrefersColorSchemeMedia),
  async loadActionDelegate() {
    const InspectorMain = await loadInspectorMainModule();
    return new InspectorMain.RenderingOptions.ReloadActionDelegate();
  },
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.NETWORK,
  title: i18nLazyString(UIStrings.forceAdBlocking),
  settingName: 'network.ad-blocking-enabled',
  settingType: Common.Settings.SettingType.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.SESSION,
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.blockAds),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.showAds),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.GLOBAL,
  storageType: Common.Settings.SettingStorageType.SYNCED,
  title: i18nLazyString(UIStrings.autoOpenDevTools),
  settingName: 'auto-attach-to-created-pages',
  settingType: Common.Settings.SettingType.BOOLEAN,
  order: 2,
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.autoOpenDevTools),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.doNotAutoOpen),
    },
  ],
});

UI.Toolbar.registerToolbarItem({
  async loadItem() {
    const InspectorMain = await loadInspectorMainModule();
    return new InspectorMain.InspectorMain.NodeIndicatorProvider();
  },
  order: 2,
  location: UI.Toolbar.ToolbarItemLocation.MAIN_TOOLBAR_LEFT,
});

UI.Toolbar.registerToolbarItem({
  loadItem: Common.Lazy.lazy(async () => {
    const InspectorMain = await loadInspectorMainModule();
    return new InspectorMain.OutermostTargetSelector.OutermostTargetSelector();
  }) as () => Promise<UI.Toolbar.Provider>,
  order: 97,
  location: UI.Toolbar.ToolbarItemLocation.MAIN_TOOLBAR_RIGHT,
});

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.showPaintRectsSettingDescriptor, {
  category: Common.Settings.SettingCategory.RENDERING,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.showPaintFlashingRectangles),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.hidePaintFlashingRectangles),
    },
  ],
});

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.showLayoutShiftRegionsSettingDescriptor, {
  category: Common.Settings.SettingCategory.RENDERING,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.showLayoutShiftRegions),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.hideLayoutShiftRegions),
    },
  ],
});

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.showAdHighlightsSettingDescriptor, {
  category: Common.Settings.SettingCategory.RENDERING,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.highlightAdFrames),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.doNotHighlightAdFrames),
    },
  ],
});

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.showDebugBordersSettingDescriptor, {
  category: Common.Settings.SettingCategory.RENDERING,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.showLayerBorders),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.hideLayerBorders),
    },
  ],
});

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.showFPSCounterSettingDescriptor, {
  category: Common.Settings.SettingCategory.RENDERING,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.showFramesPerSecondFpsMeter),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.hideFramesPerSecondFpsMeter),
    },
  ],
});

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.showScrollBottleneckRectsSettingDescriptor, {
  category: Common.Settings.SettingCategory.RENDERING,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.showScrollPerformanceBottlenecks),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.hideScrollPerformanceBottlenecks),
    },
  ],
});

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.emulatePageFocusSettingDescriptor, {
  category: Common.Settings.SettingCategory.RENDERING,
  title: i18nLazyString(UIStrings.emulateAFocusedPage),
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.emulateAFocusedPage),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.doNotEmulateAFocusedPage),
    },
  ],
});

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.emulatedCSSMediaSettingDescriptor, {
  category: Common.Settings.SettingCategory.RENDERING,
  title: i18nLazyString(UIStrings.emulateCssMediaType),
  options: [
    {
      title: i18nLazyString(UIStrings.doNotEmulateCssMediaType),
      text: i18nLazyString(UIStrings.noEmulation),
      value: '',
    },
    {
      title: i18nLazyString(UIStrings.emulateCssPrintMediaType),
      text: i18nLazyString(UIStrings.print),
      value: 'print',
    },
    {
      title: i18nLazyString(UIStrings.emulateCssScreenMediaType),
      text: i18nLazyString(UIStrings.screen),
      value: 'screen',
    },
  ],
  tags: [
    i18nLazyString(UIStrings.query),
  ],
});

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.emulatedCSSMediaFeaturePrefersColorSchemeSettingDescriptor, {
  category: Common.Settings.SettingCategory.RENDERING,
  options: [
    {
      title: i18nLazyString(UIStrings.doNotEmulateCss, {PH1: 'prefers-color-scheme'}),
      text: i18nLazyString(UIStrings.noEmulation),
      value: '',
    },
    {
      title: i18nLazyString(UIStrings.emulateCss, {PH1: 'prefers-color-scheme: light'}),
      text: i18n.i18n.lockedLazyString('prefers-color-scheme: light'),
      value: 'light',
    },
    {
      title: i18nLazyString(UIStrings.emulateCss, {PH1: 'prefers-color-scheme: dark'}),
      text: i18n.i18n.lockedLazyString('prefers-color-scheme: dark'),
      value: 'dark',
    },
  ],
  tags: [
    i18nLazyString(UIStrings.query),
  ],
  title: i18nLazyString(UIStrings.emulateCssMediaFeature, {PH1: 'prefers-color-scheme'}),
});

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.emulatedCSSMediaFeatureForcedColorsSettingDescriptor, {
  category: Common.Settings.SettingCategory.RENDERING,
  options: [
    {
      title: i18nLazyString(UIStrings.doNotEmulateCss, {PH1: 'forced-colors'}),
      text: i18nLazyString(UIStrings.noEmulation),
      value: '',
    },
    {
      title: i18nLazyString(UIStrings.emulateCss, {PH1: 'forced-colors: active'}),
      text: i18n.i18n.lockedLazyString('forced-colors: active'),
      value: 'active',
    },
    {
      title: i18nLazyString(UIStrings.emulateCss, {PH1: 'forced-colors: none'}),
      text: i18n.i18n.lockedLazyString('forced-colors: none'),
      value: 'none',
    },
  ],
  tags: [
    i18nLazyString(UIStrings.query),
  ],
  title: i18nLazyString(UIStrings.emulateCssMediaFeature, {PH1: 'forced-colors'}),
});

SettingsUI.SettingUIRegistration.register(
    SDK.SDKSettings.emulatedCSSMediaFeaturePrefersReducedMotionSettingDescriptor, {
      category: Common.Settings.SettingCategory.RENDERING,
      options: [
        {
          title: i18nLazyString(UIStrings.doNotEmulateCss, {PH1: 'prefers-reduced-motion'}),
          text: i18nLazyString(UIStrings.noEmulation),
          value: '',
        },
        {
          title: i18nLazyString(UIStrings.emulateCss, {PH1: 'prefers-reduced-motion: reduce'}),
          text: i18n.i18n.lockedLazyString('prefers-reduced-motion: reduce'),
          value: 'reduce',
        },
      ],
      tags: [
        i18nLazyString(UIStrings.query),
      ],
      title: i18nLazyString(UIStrings.emulateCssMediaFeature, {PH1: 'prefers-reduced-motion'}),
    });

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.emulatedCSSMediaFeaturePrefersContrastSettingDescriptor, {
  category: Common.Settings.SettingCategory.RENDERING,
  options: [
    {
      title: i18nLazyString(UIStrings.doNotEmulateCss, {PH1: 'prefers-contrast'}),
      text: i18nLazyString(UIStrings.noEmulation),
      value: '',
    },
    {
      title: i18nLazyString(UIStrings.emulateCss, {PH1: 'prefers-contrast: more'}),
      text: i18n.i18n.lockedLazyString('prefers-contrast: more'),
      value: 'more',
    },
    {
      title: i18nLazyString(UIStrings.emulateCss, {PH1: 'prefers-contrast: less'}),
      text: i18n.i18n.lockedLazyString('prefers-contrast: less'),
      value: 'less',
    },
    {
      title: i18nLazyString(UIStrings.emulateCss, {PH1: 'prefers-contrast: custom'}),
      text: i18n.i18n.lockedLazyString('prefers-contrast: custom'),
      value: 'custom',
    },
  ],
  tags: [
    i18nLazyString(UIStrings.query),
  ],
  title: i18nLazyString(UIStrings.emulateCssMediaFeature, {PH1: 'prefers-contrast'}),
});

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.emulatedCSSMediaFeaturePrefersReducedDataSettingDescriptor, {
  category: Common.Settings.SettingCategory.RENDERING,
  options: [
    {
      title: i18nLazyString(UIStrings.doNotEmulateCss, {PH1: 'prefers-reduced-data'}),
      text: i18nLazyString(UIStrings.noEmulation),
      value: '',
    },
    {
      title: i18nLazyString(UIStrings.emulateCss, {PH1: 'prefers-reduced-data: reduce'}),
      text: i18n.i18n.lockedLazyString('prefers-reduced-data: reduce'),
      value: 'reduce',
    },
  ],
  tags: [
    i18nLazyString(UIStrings.query),
  ],
  title: i18nLazyString(UIStrings.emulateCssMediaFeature, {PH1: 'prefers-reduced-data'}),
});

SettingsUI.SettingUIRegistration.register(
    SDK.SDKSettings.emulatedCSSMediaFeaturePrefersReducedTransparencySettingDescriptor, {
      category: Common.Settings.SettingCategory.RENDERING,
      options: [
        {
          title: i18nLazyString(UIStrings.doNotEmulateCss, {PH1: 'prefers-reduced-transparency'}),
          text: i18nLazyString(UIStrings.noEmulation),
          value: '',
        },
        {
          title: i18nLazyString(UIStrings.emulateCss, {PH1: 'prefers-reduced-transparency: reduce'}),
          text: i18n.i18n.lockedLazyString('prefers-reduced-transparency: reduce'),
          value: 'reduce',
        },
      ],
      tags: [
        i18nLazyString(UIStrings.query),
      ],
      title: i18nLazyString(UIStrings.emulateCssMediaFeature, {PH1: 'prefers-reduced-transparency'}),
    });

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.emulatedCSSMediaFeatureColorGamutSettingDescriptor, {
  category: Common.Settings.SettingCategory.RENDERING,
  options: [
    {
      title: i18nLazyString(UIStrings.doNotEmulateCss, {PH1: 'color-gamut'}),
      text: i18nLazyString(UIStrings.noEmulation),
      value: '',
    },
    {
      title: i18nLazyString(UIStrings.emulateCss, {PH1: 'color-gamut: srgb'}),
      text: i18n.i18n.lockedLazyString('color-gamut: srgb'),
      value: 'srgb',
    },
    {
      title: i18nLazyString(UIStrings.emulateCss, {PH1: 'color-gamut: p3'}),
      text: i18n.i18n.lockedLazyString('color-gamut: p3'),
      value: 'p3',
    },
    {
      title: i18nLazyString(UIStrings.emulateCss, {PH1: 'color-gamut: rec2020'}),
      text: i18n.i18n.lockedLazyString('color-gamut: rec2020'),
      value: 'rec2020',
    },
  ],
  tags: [
    i18nLazyString(UIStrings.query),
  ],
  title: i18nLazyString(UIStrings.emulateCssMediaFeature, {PH1: 'color-gamut'}),
});

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.emulatedVisionDeficiencySettingDescriptor, {
  category: Common.Settings.SettingCategory.RENDERING,
  options: [
    {
      title: i18nLazyString(UIStrings.doNotEmulateAnyVisionDeficiency),
      text: i18nLazyString(UIStrings.noEmulation),
      value: 'none',
    },
    {
      title: i18nLazyString(UIStrings.emulateBlurredVision),
      text: i18nLazyString(UIStrings.blurredVision),
      value: 'blurredVision',
    },
    {
      title: i18nLazyString(UIStrings.emulateReducedContrast),
      text: i18nLazyString(UIStrings.reducedContrast),
      value: 'reducedContrast',
    },
    {
      title: i18nLazyString(UIStrings.emulateProtanopia),
      text: i18nLazyString(UIStrings.protanopia),
      value: 'protanopia',
    },
    {
      title: i18nLazyString(UIStrings.emulateDeuteranopia),
      text: i18nLazyString(UIStrings.deuteranopia),
      value: 'deuteranopia',
    },
    {
      title: i18nLazyString(UIStrings.emulateTritanopia),
      text: i18nLazyString(UIStrings.tritanopia),
      value: 'tritanopia',
    },
    {
      title: i18nLazyString(UIStrings.emulateAchromatopsia),
      text: i18nLazyString(UIStrings.achromatopsia),
      value: 'achromatopsia',
    },
  ],
  tags: [
    i18nLazyString(UIStrings.query),
  ],
  title: i18nLazyString(UIStrings.emulateVisionDeficiencies),
});

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.emulatedOSTextScaleSettingDescriptor, {
  category: Common.Settings.SettingCategory.RENDERING,
  options: [
    {
      title: i18nLazyString(UIStrings.doNotEmulateOsTextScale),
      text: i18nLazyString(UIStrings.osTextScaleEmulationNone),
      value: '',
    },
    {
      title: i18nLazyString(UIStrings.osTextScaleEmulation85),
      text: i18nLazyString(UIStrings.osTextScaleEmulation85),
      value: '0.85',
    },
    {
      title: i18nLazyString(UIStrings.osTextScaleEmulation100),
      text: i18nLazyString(UIStrings.osTextScaleEmulation100),
      value: '1',
    },
    {
      title: i18nLazyString(UIStrings.osTextScaleEmulation115),
      text: i18nLazyString(UIStrings.osTextScaleEmulation115),
      value: '1.15',
    },
    {
      title: i18nLazyString(UIStrings.osTextScaleEmulation130),
      text: i18nLazyString(UIStrings.osTextScaleEmulation130),
      value: '1.3',
    },
    {
      title: i18nLazyString(UIStrings.osTextScaleEmulation150),
      text: i18nLazyString(UIStrings.osTextScaleEmulation150),
      value: '1.5',
    },
    {
      title: i18nLazyString(UIStrings.osTextScaleEmulation180),
      text: i18nLazyString(UIStrings.osTextScaleEmulation180),
      value: '1.8',
    },
    {
      title: i18nLazyString(UIStrings.osTextScaleEmulation200),
      text: i18nLazyString(UIStrings.osTextScaleEmulation200),
      value: '2',
    },
    {
      title: i18nLazyString(UIStrings.osTextScaleEmulation250),
      text: i18nLazyString(UIStrings.osTextScaleEmulation250),
      value: '2.5',
    },
    {
      title: i18nLazyString(UIStrings.osTextScaleEmulation300),
      text: i18nLazyString(UIStrings.osTextScaleEmulation300),
      value: '3',
    },
    {
      title: i18nLazyString(UIStrings.osTextScaleEmulation350),
      text: i18nLazyString(UIStrings.osTextScaleEmulation350),
      value: '3.5',
    },
  ],
  tags: [
    i18nLazyString(UIStrings.query),
  ],
  title: i18nLazyString(UIStrings.emulateOsTextScale),
});

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.localFontsDisabledSettingDescriptor, {
  category: Common.Settings.SettingCategory.RENDERING,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.disableLocalFonts),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.enableLocalFonts),
    },
  ],
});

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.avifFormatDisabledSettingDescriptor, {
  category: Common.Settings.SettingCategory.RENDERING,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.disableAvifFormat),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.enableAvifFormat),
    },
  ],
});

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.jpegXlFormatDisabledSettingDescriptor, {
  category: Common.Settings.SettingCategory.RENDERING,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.disableJpegXlFormat),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.enableJpegXlFormat),
    },
  ],
});

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.webpFormatDisabledSettingDescriptor, {
  category: Common.Settings.SettingCategory.RENDERING,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.disableWebpFormat),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.enableWebpFormat),
    },
  ],
});
