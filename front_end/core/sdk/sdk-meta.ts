// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';

const UIStrings = {
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
