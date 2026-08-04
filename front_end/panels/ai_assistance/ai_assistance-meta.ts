// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as SettingUIRegistration from '../../ui/settings/settings.js';

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
   * @description Text of a context menu item to redirect to the AI assistance panel with
   * the current context.
   */
  debugWithAi: 'Debug with AI',
  /**
   * @description The title of the Gemini panel.
   */
  gemini: 'Gemini',
  /**
   * @description The title of the command menu action for showing the Gemini panel.
   */
  showGemini: 'Show Gemini',
  /**
   * @description The setting title to enable the Gemini via the settings tab.
   */
  enableGemini: 'Enable Gemini',
  /**
   * @description Text of a context menu item to redirect to the Gemini panel with the current context.
   */
  debugWithGemini: 'Debug with Gemini',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/ai_assistance/ai_assistance-meta.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

// Host config is initialized after this module executes, so need to lazily select the string.
function i18nAiBrandedString(gemini: string, assistance: string) {
  // eslint-disable-next-line @devtools/l10n-i18nString-call-only-with-uistrings
  return () => Root.Runtime.hostConfig.devToolsGeminiRebranding?.enabled ? i18nString(gemini) : i18nString(assistance);
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

function isStorageAgentFeatureAvailable(config?: Root.Runtime.HostConfig): boolean {
  return (config?.aidaAvailability?.enabled && (config?.devToolsAiAssistanceStorageAgent?.enabled)) === true;
}

function isAnyFeatureAvailable(config?: Root.Runtime.HostConfig): boolean {
  return isStylingAgentFeatureAvailable(config) || isNetworkAgentFeatureAvailable(config) ||
      isPerformanceAgentFeatureAvailable(config) || isFileAgentFeatureAvailable(config) ||
      isStorageAgentFeatureAvailable(config);
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'freestyler',
  commandPrompt: i18nAiBrandedString(UIStrings.showGemini, UIStrings.showAiAssistance),
  title: i18nAiBrandedString(UIStrings.gemini, UIStrings.aiAssistance),
  order: 10,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  hasToolbar: false,
  condition: config => isAnyFeatureAvailable(config) && !isPolicyRestricted(config),
  async loadView() {
    const AiAssistance = await loadAiAssistanceModule();
    return await AiAssistance.AiAssistancePanel.instance();
  },
});

SettingUIRegistration.SettingUIRegistration.register(AiAssistanceModel.AiUtils.aiAssistanceEnabledSettingDescriptor, {
  category: Common.Settings.SettingCategory.AI,
  title: i18nAiBrandedString(UIStrings.enableGemini, UIStrings.enableAiAssistance),
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'freestyler.main-menu',
  contextTypes(): [] {
    return [];
  },
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nAiBrandedString(UIStrings.debugWithGemini, UIStrings.debugWithAi),
  configurableBindings: false,
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: config => isAnyFeatureAvailable(config) && !isPolicyRestricted(config) && !isGeoRestricted(config),
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'freestyler.elements-floating-button',
  contextTypes(): [] {
    return [];
  },
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nAiBrandedString(UIStrings.debugWithGemini, UIStrings.debugWithAi),
  configurableBindings: false,
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: config =>
      isStylingAgentFeatureAvailable(config) && !isPolicyRestricted(config) && !isGeoRestricted(config),
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'freestyler.element-panel-context',
  contextTypes(): [] {
    return [];
  },
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nAiBrandedString(UIStrings.debugWithGemini, UIStrings.debugWithAi),
  configurableBindings: false,
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: config =>
      isStylingAgentFeatureAvailable(config) && !isPolicyRestricted(config) && !isGeoRestricted(config),
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'drjones.network-floating-button',
  contextTypes(): [] {
    return [];
  },
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nAiBrandedString(UIStrings.debugWithGemini, UIStrings.debugWithAi),
  configurableBindings: false,
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: config =>
      isNetworkAgentFeatureAvailable(config) && !isPolicyRestricted(config) && !isGeoRestricted(config),
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'drjones.network-panel-context',
  contextTypes(): [] {
    return [];
  },
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nAiBrandedString(UIStrings.debugWithGemini, UIStrings.debugWithAi),
  configurableBindings: false,
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: config =>
      isNetworkAgentFeatureAvailable(config) && !isPolicyRestricted(config) && !isGeoRestricted(config),
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'drjones.performance-panel-context',
  contextTypes(): [] {
    return [];
  },
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nAiBrandedString(UIStrings.debugWithGemini, UIStrings.debugWithAi),
  configurableBindings: false,
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: config =>
      isPerformanceAgentFeatureAvailable(config) && !isPolicyRestricted(config) && !isGeoRestricted(config),
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'drjones.sources-floating-button',
  contextTypes(): [] {
    return [];
  },
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nAiBrandedString(UIStrings.debugWithGemini, UIStrings.debugWithAi),
  configurableBindings: false,
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: config => isFileAgentFeatureAvailable(config) && !isPolicyRestricted(config) && !isGeoRestricted(config),
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'drjones.sources-panel-context',
  contextTypes() {
    return [];
  },
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nAiBrandedString(UIStrings.debugWithGemini, UIStrings.debugWithAi),
  configurableBindings: false,
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: config => isFileAgentFeatureAvailable(config) && !isPolicyRestricted(config) && !isGeoRestricted(config),
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'ai-assistance.storage-floating-button',
  contextTypes(): [] {
    return [];
  },
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nAiBrandedString(UIStrings.debugWithGemini, UIStrings.debugWithAi),
  configurableBindings: false,
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: config =>
      isStorageAgentFeatureAvailable(config) && !isPolicyRestricted(config) && !isGeoRestricted(config),
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'ai-assistance.application-panel-context',
  contextTypes(): [] {
    return [];
  },
  category: UI.ActionRegistration.ActionCategory.GLOBAL,
  title: i18nAiBrandedString(UIStrings.debugWithGemini, UIStrings.debugWithAi),
  configurableBindings: false,
  async loadActionDelegate() {
    const AiAssistance = await loadAiAssistanceModule();
    return new AiAssistance.ActionDelegate();
  },
  condition: config =>
      isStorageAgentFeatureAvailable(config) && !isPolicyRestricted(config) && !isGeoRestricted(config),
});
