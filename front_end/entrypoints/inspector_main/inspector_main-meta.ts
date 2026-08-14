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
