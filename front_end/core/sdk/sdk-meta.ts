// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';

const UIStrings = {
  /**
   *@description Title of a setting under the Console category that can be invoked through the Command Menu
   */
  preserveLogUponNavigation: 'Preserve log upon navigation',
  /**
   *@description Title of a setting under the Console category that can be invoked through the Command Menu
   */
  doNotPreserveLogUponNavigation: 'Do not preserve log upon navigation',
  /**
   *@description Text for pausing the debugger on exceptions
   */
  pauseOnExceptions: 'Pause on exceptions',
  /**
   *@description Title of a setting under the Debugger category that can be invoked through the Command Menu
   */
  doNotPauseOnExceptions: 'Do not pause on exceptions',
  /**
   *@description Title of a setting under the Debugger category that can be invoked through the Command Menu
   */
  disableJavascript: 'Disable JavaScript',
  /**
   *@description Title of a setting under the Debugger category that can be invoked through the Command Menu
   */
  enableJavascript: 'Enable JavaScript',
  /**
   *@description Title of a setting under the Debugger category in Settings
   */
  disableAsyncStackTraces: 'Disable async stack traces',
  /**
   *@description Title of a setting under the Debugger category that can be invoked through the Command Menu
   */
  doNotCaptureAsyncStackTraces: 'Do not capture async stack traces',
  /**
   *@description Title of a setting under the Debugger category that can be invoked through the Command Menu
   */
  captureAsyncStackTraces: 'Capture async stack traces',
  /**
   *@description Text of a setting that  turn on the measuring rulers when hover over a target
   */
  showRulersOnHover: 'Show rulers on hover',
  /**
   *@description Text of a setting that do turn off the measuring rulers when hover over a target
   */
  doNotShowRulersOnHover: 'Do not show rulers on hover',
  /**
   *@description Title of a setting that turns on grid area name labels
   */
  showAreaNames: 'Show area names',
  /**
   *@description Title of a setting under the Grid category that turns CSS Grid Area highlighting on
   */
  showGridNamedAreas: 'Show grid named areas',
  /**
   *@description Title of a setting under the Grid category that turns CSS Grid Area highlighting off
   */
  doNotShowGridNamedAreas: 'Do not show grid named areas',
  /**
   *@description Title of a setting that turns on grid track size labels
   */
  showTrackSizes: 'Show track sizes',
  /**
   *@description Title for CSS Grid tooling option
   */
  showGridTrackSizes: 'Show grid track sizes',
  /**
   *@description Title for CSS Grid tooling option
   */
  doNotShowGridTrackSizes: 'Do not show grid track sizes',
  /**
   *@description Title of a setting that turns on grid extension lines
   */
  extendGridLines: 'Extend grid lines',
  /**
   *@description Title of a setting that turns off the grid extension lines
   */
  doNotExtendGridLines: 'Do not extend grid lines',
  /**
   *@description Title of a setting that turns on grid line labels
   */
  showLineLabels: 'Show line labels',
  /**
   *@description Title of a setting that turns off the grid line labels
   */
  hideLineLabels: 'Hide line labels',
  /**
   *@description Title of a setting that turns on grid line number labels
   */
  showLineNumbers: 'Show line numbers',
  /**
   *@description Title of a setting that turns on grid line name labels
   */
  showLineNames: 'Show line names',
  /**
   *@description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  showPaintFlashingRectangles: 'Show paint flashing rectangles',
  /**
   *@description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  hidePaintFlashingRectangles: 'Hide paint flashing rectangles',
  /**
   *@description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  showLayoutShiftRegions: 'Show layout shift regions',
  /**
   *@description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  hideLayoutShiftRegions: 'Hide layout shift regions',
  /**
   *@description Text to highlight the rendering frames for ads
   */
  highlightAdFrames: 'Highlight ad frames',
  /**
   *@description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  doNotHighlightAdFrames: 'Do not highlight ad frames',
  /**
   *@description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  showLayerBorders: 'Show layer borders',
  /**
   *@description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  hideLayerBorders: 'Hide layer borders',
  /**
   *@description Title of a setting under the Rendering drawer that can be invoked through the Command Menu
   */
  showCoreWebVitalsOverlay: 'Show Core Web Vitals overlay',
  /**
   *@description Title of a setting under the Rendering drawer that can be invoked through the Command Menu
   */
  hideCoreWebVitalsOverlay: 'Hide Core Web Vitals overlay',
  /**
   *@description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  showFramesPerSecondFpsMeter: 'Show frames per second (FPS) meter',
  /**
   *@description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  hideFramesPerSecondFpsMeter: 'Hide frames per second (FPS) meter',
  /**
   *@description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  showScrollPerformanceBottlenecks: 'Show scroll performance bottlenecks',
  /**
   *@description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  hideScrollPerformanceBottlenecks: 'Hide scroll performance bottlenecks',
  /**
   *@description Title of a Rendering setting that can be invoked through the Command Menu
   */
  emulateAFocusedPage: 'Emulate a focused page',
  /**
   *@description Title of a Rendering setting that can be invoked through the Command Menu
   */
  doNotEmulateAFocusedPage: 'Do not emulate a focused page',
  /**
   *@description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  doNotEmulateCssMediaType: 'Do not emulate CSS media type',
  /**
   *@description A drop-down menu option to do not emulate css media type
   */
  noEmulation: 'No emulation',
  /**
   *@description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  emulateCssPrintMediaType: 'Emulate CSS print media type',
  /**
   *@description A drop-down menu option to emulate css print media type
   */
  print: 'print',
  /**
   *@description Title of a setting under the Rendering category that can be invoked through the Command Menu
   */
  emulateCssScreenMediaType: 'Emulate CSS screen media type',
  /**
   *@description A drop-down menu option to emulate css screen media type
   */
  screen: 'screen',
  /**
   *@description A tag of Emulate CSS screen media type setting that can be searched in the command menu
   */
  query: 'query',
  /**
   *@description Title of a setting under the Rendering drawer
   */
  emulateCssMediaType: 'Emulate CSS media type',
  /**
   *@description Title of a setting under the Rendering drawer that can be invoked through the Command Menu
   *@example {prefers-color-scheme} PH1
   */
  doNotEmulateCss: 'Do not emulate CSS {PH1}',
  /**
   *@description Title of a setting under the Rendering drawer that can be invoked through the Command Menu
   *@example {prefers-color-scheme: light} PH1
   */
  emulateCss: 'Emulate CSS {PH1}',
  /**
   *@description Title of a setting under the Rendering drawer that can be invoked through the Command Menu
   *@example {prefers-color-scheme} PH1
   */
  emulateCssMediaFeature: 'Emulate CSS media feature {PH1}',
  /**
   *@description Title of a setting under the Rendering drawer that can be invoked through the Command Menu
   */
  doNotEmulateAnyVisionDeficiency: 'Do not emulate any vision deficiency',
  /**
   *@description Title of a setting under the Rendering drawer that can be invoked through the Command Menu
   */
  emulateBlurredVision: 'Emulate blurred vision',
  /**
   *@description Title of a setting under the Rendering drawer that can be invoked through the Command Menu
   */
  emulateReducedContrast: 'Emulate reduced contrast',
  /**
   *@description Name of a vision deficiency that can be emulated via the Rendering drawer
   */
  blurredVision: 'Blurred vision',
  /**
   *@description Name of a vision deficiency that can be emulated via the Rendering drawer
   */
  reducedContrast: 'Reduced contrast',
  /**
   *@description Title of a setting under the Rendering drawer that can be invoked through the Command Menu
   */
  emulateProtanopia: 'Emulate protanopia (no red)',
  /**
   *@description Name of a color vision deficiency that can be emulated via the Rendering drawer
   */
  protanopia: 'Protanopia (no red)',
  /**
   *@description Title of a setting under the Rendering drawer that can be invoked through the Command Menu
   */
  emulateDeuteranopia: 'Emulate deuteranopia (no green)',
  /**
   *@description Name of a color vision deficiency that can be emulated via the Rendering drawer
   */
  deuteranopia: 'Deuteranopia (no green)',
  /**
   *@description Title of a setting under the Rendering drawer that can be invoked through the Command Menu
   */
  emulateTritanopia: 'Emulate tritanopia (no blue)',
  /**
   *@description Name of a color vision deficiency that can be emulated via the Rendering drawer
   */
  tritanopia: 'Tritanopia (no blue)',
  /**
   *@description Title of a setting under the Rendering drawer that can be invoked through the Command Menu
   */
  emulateAchromatopsia: 'Emulate achromatopsia (no color)',
  /**
   *@description Name of a color vision deficiency that can be emulated via the Rendering drawer
   */
  achromatopsia: 'Achromatopsia (no color)',
  /**
   *@description Title of a setting under the Rendering drawer
   */
  emulateVisionDeficiencies: 'Emulate vision deficiencies',
  /**
   *@description Text that refers to disabling local fonts
   */
  disableLocalFonts: 'Disable local fonts',
  /**
   *@description Text that refers to enabling local fonts
   */
  enableLocalFonts: 'Enable local fonts',
  /**
   *@description Title of a setting that disables AVIF format
   */
  disableAvifFormat: 'Disable `AVIF` format',
  /**
   *@description Title of a setting that enables AVIF format
   */
  enableAvifFormat: 'Enable `AVIF` format',
  /**
   *@description Title of a setting that disables WebP format
   */
  disableWebpFormat: 'Disable `WebP` format',
  /**
   *@description Title of a setting that enables WebP format
   */
  enableWebpFormat: 'Enable `WebP` format',
  /**
   *@description Title of a setting under the Console category in Settings
   */
  customFormatters: 'Custom formatters',
  /**
   *@description Title of a setting under the Network category
   */
  networkRequestBlocking: 'Network request blocking',
  /**
   *@description Title of a setting under the Network category that can be invoked through the Command Menu
   */
  enableNetworkRequestBlocking: 'Enable network request blocking',
  /**
   *@description Title of a setting under the Network category that can be invoked through the Command Menu
   */
  disableNetworkRequestBlocking: 'Disable network request blocking',
  /**
   *@description Title of a setting under the Network category that can be invoked through the Command Menu
   */
  enableCache: 'Enable cache',
  /**
   * @description Title of a setting under the Network category that can be invoked through the Command Menu
   */
  disableCache: 'Disable cache (while DevTools is open)',
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting
   * emulates that the webpage is in auto dark mode.
   */
  emulateAutoDarkMode: 'Emulate auto dark mode',
  /**
   * @description Label of a checkbox in the DevTools settings UI.
   */
  enableRemoteFileLoading:
      'Allow `DevTools` to load resources, such as source maps, from remote file paths. Disabled by default for security reasons.',
};
const str_ = i18n.i18n.registerUIStrings('core/sdk/sdk-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

Common.Settings.registerSettingExtension({
  storageType: Common.Settings.SettingStorageType.Synced,
  settingName: 'skip-stack-frames-pattern',
  settingType: Common.Settings.SettingType.REGEX,
  defaultValue: '/node_modules/|/bower_components/',
});

Common.Settings.registerSettingExtension({
  storageType: Common.Settings.SettingStorageType.Synced,
  settingName: 'skip-content-scripts',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
});

Common.Settings.registerSettingExtension({
  storageType: Common.Settings.SettingStorageType.Synced,
  settingName: 'automatically-ignore-list-known-third-party-scripts',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
});

Common.Settings.registerSettingExtension({
  storageType: Common.Settings.SettingStorageType.Synced,
  settingName: 'enable-ignore-listing',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.CONSOLE,
  storageType: Common.Settings.SettingStorageType.Synced,
  title: i18nLazyString(UIStrings.preserveLogUponNavigation),
  settingName: 'preserve-console-log',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.preserveLogUponNavigation),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.doNotPreserveLogUponNavigation),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.DEBUGGER,
  settingName: 'pause-on-exception-enabled',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.pauseOnExceptions),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.doNotPauseOnExceptions),
    },
  ],
});

Common.Settings.registerSettingExtension({
  settingName: 'pause-on-caught-exception',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  settingName: 'pause-on-uncaught-exception',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.DEBUGGER,
  title: i18nLazyString(UIStrings.disableJavascript),
  settingName: 'java-script-disabled',
  settingType: Common.Settings.SettingType.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
  order: 1,
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.disableJavascript),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.enableJavascript),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.DEBUGGER,
  title: i18nLazyString(UIStrings.disableAsyncStackTraces),
  settingName: 'disable-async-stack-traces',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  order: 2,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.doNotCaptureAsyncStackTraces),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.captureAsyncStackTraces),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.DEBUGGER,
  settingName: 'breakpoints-active',
  settingType: Common.Settings.SettingType.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
  defaultValue: true,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.ELEMENTS,
  storageType: Common.Settings.SettingStorageType.Synced,
  title: i18nLazyString(UIStrings.showRulersOnHover),
  settingName: 'show-metrics-rulers',
  settingType: Common.Settings.SettingType.BOOLEAN,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.showRulersOnHover),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.doNotShowRulersOnHover),
    },
  ],
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.GRID,
  storageType: Common.Settings.SettingStorageType.Synced,
  title: i18nLazyString(UIStrings.showAreaNames),
  settingName: 'show-grid-areas',
  settingType: Common.Settings.SettingType.BOOLEAN,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.showGridNamedAreas),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.doNotShowGridNamedAreas),
    },
  ],
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.GRID,
  storageType: Common.Settings.SettingStorageType.Synced,
  title: i18nLazyString(UIStrings.showTrackSizes),
  settingName: 'show-grid-track-sizes',
  settingType: Common.Settings.SettingType.BOOLEAN,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.showGridTrackSizes),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.doNotShowGridTrackSizes),
    },
  ],
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.GRID,
  storageType: Common.Settings.SettingStorageType.Synced,
  title: i18nLazyString(UIStrings.extendGridLines),
  settingName: 'extend-grid-lines',
  settingType: Common.Settings.SettingType.BOOLEAN,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.extendGridLines),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.doNotExtendGridLines),
    },
  ],
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.GRID,
  storageType: Common.Settings.SettingStorageType.Synced,
  title: i18nLazyString(UIStrings.showLineLabels),
  settingName: 'show-grid-line-labels',
  settingType: Common.Settings.SettingType.ENUM,
  options: [
    {
      title: i18nLazyString(UIStrings.hideLineLabels),
      text: i18nLazyString(UIStrings.hideLineLabels),
      value: 'none',
    },
    {
      title: i18nLazyString(UIStrings.showLineNumbers),
      text: i18nLazyString(UIStrings.showLineNumbers),
      value: 'lineNumbers',
    },
    {
      title: i18nLazyString(UIStrings.showLineNames),
      text: i18nLazyString(UIStrings.showLineNames),
      value: 'lineNames',
    },
  ],
  defaultValue: 'lineNumbers',
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.RENDERING,
  settingName: 'show-paint-rects',
  settingType: Common.Settings.SettingType.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
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
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.RENDERING,
  settingName: 'show-layout-shift-regions',
  settingType: Common.Settings.SettingType.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
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
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.RENDERING,
  settingName: 'show-ad-highlights',
  settingType: Common.Settings.SettingType.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
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
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.RENDERING,
  settingName: 'show-debug-borders',
  settingType: Common.Settings.SettingType.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
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
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.RENDERING,
  settingName: 'show-web-vitals',
  settingType: Common.Settings.SettingType.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.showCoreWebVitalsOverlay),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.hideCoreWebVitalsOverlay),
    },
  ],
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.RENDERING,
  settingName: 'show-fps-counter',
  settingType: Common.Settings.SettingType.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
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
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.RENDERING,
  settingName: 'show-scroll-bottleneck-rects',
  settingType: Common.Settings.SettingType.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
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
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.RENDERING,
  title: i18nLazyString(UIStrings.emulateAFocusedPage),
  settingName: 'emulate-page-focus',
  settingType: Common.Settings.SettingType.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Local,
  defaultValue: false,
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

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.RENDERING,
  settingName: 'emulated-css-media',
  settingType: Common.Settings.SettingType.ENUM,
  storageType: Common.Settings.SettingStorageType.Session,
  defaultValue: '',
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
  title: i18nLazyString(UIStrings.emulateCssMediaType),
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.RENDERING,
  settingName: 'emulated-css-media-feature-prefers-color-scheme',
  settingType: Common.Settings.SettingType.ENUM,
  storageType: Common.Settings.SettingStorageType.Session,
  defaultValue: '',
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

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.RENDERING,
  settingName: 'emulated-css-media-feature-forced-colors',
  settingType: Common.Settings.SettingType.ENUM,
  storageType: Common.Settings.SettingStorageType.Session,
  defaultValue: '',
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

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.RENDERING,
  settingName: 'emulated-css-media-feature-prefers-reduced-motion',
  settingType: Common.Settings.SettingType.ENUM,
  storageType: Common.Settings.SettingStorageType.Session,
  defaultValue: '',
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

Common.Settings.registerSettingExtension({
  settingName: 'emulated-css-media-feature-prefers-contrast',
  settingType: Common.Settings.SettingType.ENUM,
  storageType: Common.Settings.SettingStorageType.Session,
  defaultValue: '',
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

Common.Settings.registerSettingExtension({
  settingName: 'emulated-css-media-feature-prefers-reduced-data',
  settingType: Common.Settings.SettingType.ENUM,
  storageType: Common.Settings.SettingStorageType.Session,
  defaultValue: '',
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
  title: i18nLazyString(UIStrings.emulateCssMediaFeature, {PH1: 'prefers-reduced-data'}),
});

Common.Settings.registerSettingExtension({
  settingName: 'emulated-css-media-feature-prefers-reduced-transparency',
  settingType: Common.Settings.SettingType.ENUM,
  storageType: Common.Settings.SettingStorageType.Session,
  defaultValue: '',
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
  title: i18nLazyString(UIStrings.emulateCssMediaFeature, {PH1: 'prefers-reduced-transparency'}),
});

Common.Settings.registerSettingExtension({
  settingName: 'emulated-css-media-feature-color-gamut',
  settingType: Common.Settings.SettingType.ENUM,
  storageType: Common.Settings.SettingStorageType.Session,
  defaultValue: '',
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
  title: i18nLazyString(UIStrings.emulateCssMediaFeature, {PH1: 'color-gamut'}),
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.RENDERING,
  settingName: 'emulated-vision-deficiency',
  settingType: Common.Settings.SettingType.ENUM,
  storageType: Common.Settings.SettingStorageType.Session,
  defaultValue: 'none',
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

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.RENDERING,
  settingName: 'local-fonts-disabled',
  settingType: Common.Settings.SettingType.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
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
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.RENDERING,
  settingName: 'avif-format-disabled',
  settingType: Common.Settings.SettingType.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
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
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.RENDERING,
  settingName: 'webp-format-disabled',
  settingType: Common.Settings.SettingType.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
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
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.CONSOLE,
  title: i18nLazyString(UIStrings.customFormatters),
  settingName: 'custom-formatters',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.NETWORK,
  title: i18nLazyString(UIStrings.networkRequestBlocking),
  settingName: 'request-blocking-enabled',
  settingType: Common.Settings.SettingType.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.enableNetworkRequestBlocking),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.disableNetworkRequestBlocking),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.NETWORK,
  title: i18nLazyString(UIStrings.disableCache),
  settingName: 'cache-disabled',
  settingType: Common.Settings.SettingType.BOOLEAN,
  order: 0,
  defaultValue: false,
  userActionCondition: 'hasOtherClients',
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.disableCache),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.enableCache),
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.RENDERING,
  title: i18nLazyString(UIStrings.emulateAutoDarkMode),
  settingName: 'emulate-auto-dark-mode',
  settingType: Common.Settings.SettingType.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.Session,
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.SOURCES,
  storageType: Common.Settings.SettingStorageType.Synced,
  title: i18nLazyString(UIStrings.enableRemoteFileLoading),
  settingName: 'network.enable-remote-file-loading',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
});
