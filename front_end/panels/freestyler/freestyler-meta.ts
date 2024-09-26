// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Root from '../../core/root/root.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as Freestyler from './freestyler.js';

/*
  * TODO(nvitkov): b/346933425
  * Temporary string that should not be translated
  * as they may change often during development.
  */
const UIStrings = {
  /**
   * @description The title of the AI assistance panel.
   */
  aiAssistance: 'AI assistance',
  /**
   * @description The title of the command menu action for showing the AI assistance panel.
   */
  showAiAssistance: 'Show AI assistance',
  /**
   * @description The setting title to enable the AI assistance via
   * the settings tab.
   */
  enableAiAssistance: 'Enable AI assistance',
  /**
   *@description Text of a tooltip to redirect to the AI assistance panel with
   * the current element as context
   */
  askAiAssistance: 'Ask AI assistance',
  /**
   * @description Message shown to the user if the DevTools locale is not
   * supported.
   */
  wrongLocale: 'To use this feature, update your Language preference in DevTools Settings to English',
  /**
   * @description Message shown to the user if the age check is not successful.
   */
  ageRestricted: 'This feature is only available to users who are 18 years of age or older',
  /**
   * @description Message shown to the user if the user's region is not
   * supported.
   */
  geoRestricted: 'This feature is unavailable in your region',
  /**
   * @description Message shown to the user if the enterprise policy does
   * not allow this feature.
   */
  policyRestricted: 'Your organization turned off this feature. Contact your administrators for more information',
};

const str_ = i18n.i18n.registerUIStrings('panels/freestyler/freestyler-meta.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

const setting = 'freestyler-enabled';

function isLocaleRestricted(): boolean {
  const devtoolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance();
  return !devtoolsLocale.locale.startsWith('en-');
}

function isAgeRestricted(config?: Root.Runtime.HostConfig): boolean {
  return config?.aidaAvailability?.blockedByAge === true;
}

function isGeoRestricted(config?: Root.Runtime.HostConfig): boolean {
  return config?.aidaAvailability?.blockedByGeo === true;
}

function isPolicyRestricted(config?: Root.Runtime.HostConfig): boolean {
  return config?.aidaAvailability?.blockedByEnterprisePolicy === true;
}

let loadedFreestylerModule: (typeof Freestyler|undefined);
async function loadFreestylerModule(): Promise<typeof Freestyler> {
  if (!loadedFreestylerModule) {
    loadedFreestylerModule = await import('./freestyler.js');
  }
  return loadedFreestylerModule;
}

function isFeatureAvailable(config?: Root.Runtime.HostConfig): boolean {
  return (config?.aidaAvailability?.enabled && config?.devToolsFreestylerDogfood?.enabled) === true;
}

function isDrJonesFeatureAvailable(config?: Root.Runtime.HostConfig): boolean {
  return (config?.aidaAvailability?.enabled && config?.devToolsFreestylerDogfood?.enabled &&
          config?.devToolsExplainThisResourceDogfood?.enabled) === true;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'freestyler',
  commandPrompt: i18nLazyString(UIStrings.showAiAssistance),
  title: i18nLazyString(UIStrings.aiAssistance),
  order: 10,
  isPreviewFeature: true,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  hasToolbar: false,
  condition: config => isFeatureAvailable(config) && !isPolicyRestricted(config),
  async loadView() {
    const Freestyler = await loadFreestylerModule();
    return Freestyler.FreestylerPanel.instance();
  },
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.NONE,
  settingName: setting,
  settingType: Common.Settings.SettingType.BOOLEAN,
  title: i18nLazyString(UIStrings.enableAiAssistance),
  defaultValue: false,
  reloadRequired: false,
  condition: isFeatureAvailable,
  disabledCondition: config => {
    if (isLocaleRestricted()) {
      return {disabled: true, reason: i18nString(UIStrings.wrongLocale)};
    }
    if (isAgeRestricted(config)) {
      return {disabled: true, reason: i18nString(UIStrings.ageRestricted)};
    }
    if (isGeoRestricted(config)) {
      return {disabled: true, reason: i18nString(UIStrings.geoRestricted)};
    }
    if (isPolicyRestricted(config)) {
      return {disabled: true, reason: i18nString(UIStrings.policyRestricted)};
    }

    return {disabled: false};
  },
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'freestyler.element-panel-context',
  contextTypes(): [] {
    return [];
  },
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nLazyString(UIStrings.askAiAssistance),
  async loadActionDelegate() {
    const Freestyler = await loadFreestylerModule();
    return new Freestyler.ActionDelegate();
  },
  condition: config => isFeatureAvailable(config) && !isPolicyRestricted(config),
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'drjones.network-panel-context',
  contextTypes(): [] {
    return [];
  },
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nLazyString(UIStrings.askAiAssistance),
  async loadActionDelegate() {
    const Freestyler = await loadFreestylerModule();
    return new Freestyler.ActionDelegate();
  },
  condition: config => isDrJonesFeatureAvailable(config) && !isPolicyRestricted(config),
});
