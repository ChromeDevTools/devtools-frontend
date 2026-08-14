// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';

const UIStrings = {
  /**
   * @description A drop-down menu option to do not emulate css media type.
   */
  noEmulation: 'No emulation',
  /**
   * @description A tag of Emulate CSS screen media type setting that can be searched in the command menu.
   */
  query: 'query',
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
   * @description Title of a setting under the Console category in Settings.
   */
  customFormatters: 'Custom formatters',
  /**
   * @description Title of a setting under the Network category.
   */
  networkRequestBlocking: 'Network request blocking',
  /**
   * @description Title of a setting under the Network category that can be invoked through the Command Menu.
   */
  enableNetworkRequestBlocking: 'Enable network request blocking',
  /**
   * @description Title of a setting under the Network category that can be invoked through the Command Menu.
   */
  disableNetworkRequestBlocking: 'Disable network request blocking',
  /**
   * @description Title of a setting under the Network category that can be invoked through the Command Menu.
   */
  enableCache: 'Enable cache',
  /**
   * @description Title of a setting under the Network category that can be invoked through the Command Menu.
   */
  disableCache: 'Disable cache while DevTools is open',
  /**
   * @description The name of a checkbox setting in the Rendering tool. This setting
   * emulates that the webpage is in auto dark mode.
   */
  emulateAutoDarkMode: 'Emulate auto dark mode',
  /**
   * @description Label of a checkbox in the DevTools settings UI.
   */
  enableRemoteFileLoading: 'Allow loading remote file path resources in DevTools',
  /**
   * @description Tooltip text for a setting that controls whether external resource can be loaded in DevTools.
   */
  remoteFileLoadingInfo: 'Example resources are source maps. Disabled by default for security reasons.',
  /**
   * @description Tooltip text for a setting that controls the network cache. Disabling the network cache can simulate the network connections of users that are visiting a page for the first time.
   */
  networkCacheExplanation:
      'Disabling the network cache will simulate a network experience similar to a first time visitor.',
  /**
   * @description Title of a setting under the Console category in Settings.
   */
  logXmlhttprequests: 'Log XMLHttpRequests',
  /**
   * @description Title of a setting under the Appearance category in Settings. When the webpage is
   * paused by devtools, an overlay is shown on top of the page to indicate that it is paused. The
   * overlay is a pause/unpause button and some text, which appears on top of the paused page. This
   * setting turns off this overlay.
   */
  disablePaused: 'Disable paused state overlay',
} as const;
const str_ = i18n.i18n.registerUIStrings('core/sdk/sdk-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

Common.Settings.registerSettingExtension({
  settingName: 'emulated-css-media-feature-prefers-contrast',
  settingType: Common.Settings.SettingType.ENUM,
  storageType: Common.Settings.SettingStorageType.SESSION,
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
  storageType: Common.Settings.SettingStorageType.SESSION,
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
  storageType: Common.Settings.SettingStorageType.SESSION,
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
  storageType: Common.Settings.SettingStorageType.SESSION,
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
  storageType: Common.Settings.SettingStorageType.SESSION,
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
  settingName: 'emulated-os-text-scale',
  settingType: Common.Settings.SettingType.ENUM,
  storageType: Common.Settings.SettingStorageType.SESSION,
  defaultValue: '',
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

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.RENDERING,
  settingName: 'local-fonts-disabled',
  settingType: Common.Settings.SettingType.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.SESSION,
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
  storageType: Common.Settings.SettingStorageType.SESSION,
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
  settingName: 'jpeg-xl-format-disabled',
  settingType: Common.Settings.SettingType.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.SESSION,
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
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.RENDERING,
  settingName: 'webp-format-disabled',
  settingType: Common.Settings.SettingType.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.SESSION,
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
  storageType: Common.Settings.SettingStorageType.LOCAL,
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
  learnMore: {
    tooltip: i18nLazyString(UIStrings.networkCacheExplanation),
  },
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.RENDERING,
  title: i18nLazyString(UIStrings.emulateAutoDarkMode),
  settingName: 'emulate-auto-dark-mode',
  settingType: Common.Settings.SettingType.BOOLEAN,
  storageType: Common.Settings.SettingStorageType.SESSION,
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.SOURCES,
  storageType: Common.Settings.SettingStorageType.SYNCED,
  title: i18nLazyString(UIStrings.enableRemoteFileLoading),
  settingName: 'network.enable-remote-file-loading',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  learnMore: {
    tooltip: i18nLazyString(UIStrings.remoteFileLoadingInfo),
  },
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.CONSOLE,
  storageType: Common.Settings.SettingStorageType.SYNCED,
  title: i18nLazyString(UIStrings.logXmlhttprequests),
  settingName: 'monitoring-xhr-enabled',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.APPEARANCE,
  storageType: Common.Settings.SettingStorageType.SYNCED,
  title: i18nLazyString(UIStrings.disablePaused),
  settingName: 'disable-paused-state-overlay',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
});
