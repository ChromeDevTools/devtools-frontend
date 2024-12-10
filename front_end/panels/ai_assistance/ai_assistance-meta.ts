// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as AiAssistance from './ai_assistance.js';

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
  askAi: 'Ask AI',
  /**
   * @description Message shown to the user if the DevTools locale is not
   * supported.
   */
  wrongLocale: 'To use this feature, set your language preference to English in DevTools settings',
  /**
   * @description Message shown to the user if the user's region is not
   * supported.
   */
  geoRestricted: 'This feature is unavailable in your region',
  /**
   * @description Message shown to the user if the enterprise policy does
   * not allow this feature.
   */
  policyRestricted: 'This setting is managed by your administrator',
};

const str_ = i18n.i18n.registerUIStrings('panels/ai_assistance/ai_assistance-meta.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

const setting = 'ai-assistance-enabled';

function isLocaleRestricted(): boolean {
  const devtoolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance();
  return !devtoolsLocale.locale.startsWith('en-');
}

function isGeoRestricted(config?: Root.Runtime.HostConfig): boolean {
  return config?.aidaAvailability?.blockedByGeo === true;
}

function isPolicyRestricted(config?: Root.Runtime.HostConfig): boolean {
  return config?.aidaAvailability?.blockedByEnterprisePolicy === true;
}

let loadedAiAssistanceModule: (typeof AiAssistance|undefined);
async function loadAiAssistanceModule(): Promise<typeof AiAssistance> {
  if (!loadedAiAssistanceModule) {
    loadedAiAssistanceModule = await import('./ai_assistance.js');
  }
  return loadedAiAssistanceModule;
}

function isStylingAgentFeatureAvailable(config?: Root.Runtime.HostConfig): boolean {
  return (config?.aidaAvailability?.enabled && config?.devToolsFreestyler?.enabled) === true;
}

function isNetworkAgentFeatureAvailable(config?: Root.Runtime.HostConfig): boolean {
  return (config?.aidaAvailability?.enabled && (config?.devToolsAiAssistanceNetworkAgent?.enabled)) === true;
}

function isPerformanceAgentFeatureAvailable(config?: Root.Runtime.HostConfig): boolean {
  return (config?.aidaAvailability?.enabled && (config?.devToolsAiAssistancePerformanceAgent?.enabled)) === true;
}

function isFileAgentFeatureAvailable(config?: Root.Runtime.HostConfig): boolean {
  return (config?.aidaAvailability?.enabled && (config?.devToolsAiAssistanceFileAgent?.enabled)) === true;
}

function isAnyFeatureAvailable(config?: Root.Runtime.HostConfig): boolean {
  return isStylingAgentFeatureAvailable(config) || isNetworkAgentFeatureAvailable(config) ||
      isPerformanceAgentFeatureAvailable(config) || isFileAgentFeatureAvailable(config);
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
  condition: config => isAnyFeatureAvailable(config) && !isPolicyRestricted(config),
  async loadView() {
    const AiAssistance = await loadAiAssistanceModule();
    return AiAssistance.AiAssistancePanel.instance();
  },
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.NONE,
  settingName: setting,
  settingType: Common.Settings.SettingType.BOOLEAN,
  title: i18nLazyString(UIStrings.enableAiAssistance),
  defaultValue: false,
  reloadRequired: false,
  condition: isAnyFeatureAvailable,
  disabledCondition: config => {
    if (isGeoRestricted(config)) {
      return {disabled: true, reason: i18nString(UIStrings.geoRestricted)};
    }
    if (isPolicyRestricted(config)) {
      return {disabled: true, reason: i18nString(UIStrings.policyRestricted)};
    }
    if (isLocaleRestricted()) {
      return {disabled: true, reason: i18nString(UIStrings.wrongLocale)};
    }
    return {disabled: false};
  },
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.NONE,
  settingName: 'ai-assistance-history-entries',
  settingType: Common.Settings.SettingType.ARRAY,
  title: i18nLazyString(UIStrings.enableAiAssistance),
  defaultValue: [],
  condition: isAnyFeatureAvailable,
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'freestyler.elements-floating-button',
  contextTypes(): [] {
    return [];
  },
  experiment: Root.Runtime.ExperimentName.FLOATING_ENTRY_POINTS_FOR_AI_ASSISTANCE,
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nLazyString(UIStrings.askAi),
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: config => isStylingAgentFeatureAvailable(config) && !isPolicyRestricted(config),
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'freestyler.element-panel-context',
  contextTypes(): [] {
    return [];
  },
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nLazyString(UIStrings.askAi),
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: config => isStylingAgentFeatureAvailable(config) && !isPolicyRestricted(config),
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'drjones.network-floating-button',
  contextTypes(): [] {
    return [];
  },
  experiment: Root.Runtime.ExperimentName.FLOATING_ENTRY_POINTS_FOR_AI_ASSISTANCE,
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nLazyString(UIStrings.askAi),
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: config => isNetworkAgentFeatureAvailable(config) && !isPolicyRestricted(config),
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'drjones.network-panel-context',
  contextTypes(): [] {
    return [];
  },
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nLazyString(UIStrings.askAi),
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: config => isNetworkAgentFeatureAvailable(config) && !isPolicyRestricted(config),
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'drjones.performance-panel-context',
  contextTypes(): [] {
    return [];
  },
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nLazyString(UIStrings.askAi),
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: config => isPerformanceAgentFeatureAvailable(config) && !isPolicyRestricted(config),
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'drjones.sources-floating-button',
  contextTypes(): [] {
    return [];
  },
  experiment: Root.Runtime.ExperimentName.FLOATING_ENTRY_POINTS_FOR_AI_ASSISTANCE,
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nLazyString(UIStrings.askAi),
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: config => isFileAgentFeatureAvailable(config) && !isPolicyRestricted(config),
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'drjones.sources-panel-context',
  contextTypes() {
    return [];
  },
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nLazyString(UIStrings.askAi),
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: config => isFileAgentFeatureAvailable(config) && !isPolicyRestricted(config),
});
