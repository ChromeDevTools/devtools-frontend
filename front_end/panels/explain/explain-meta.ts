// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import type * as Root from '../../core/root/root.js';
import * as AiAssistanceModel from '../../models/ai_assistance/ai_assistance.js';
import * as Console from '../../panels/console/console.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as SettingUIRegistration from '../../ui/settings/settings.js';

const UIStrings = {
  /**
   * @description Message to offer insights for a console error message.
   */
  explainThisError: 'Understand this error',
  /**
   * @description Message to offer insights for a console warning message.
   */
  explainThisWarning: 'Understand this warning',
  /**
   * @description Message to offer insights for a console message.
   */
  explainThisMessage: 'Understand this message',
  /**
   * @description The setting title to enable the console insights feature via
   * the settings tab.
   */
  enableConsoleInsights: 'Understand console messages with AI',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/explain/explain-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

const actions = [
  {
    actionId: 'explain.console-message.hover',
    title: i18nLazyString(UIStrings.explainThisMessage),
    configurableBindings: false,
    contextTypes(): [typeof Console.ConsoleViewMessage.ConsoleViewMessage] {
      return [Console.ConsoleViewMessage.ConsoleViewMessage];
    },
  },
  {
    actionId: 'explain.console-message.teaser',
    title: i18nLazyString(UIStrings.explainThisMessage),
    configurableBindings: false,
    contextTypes(): [] {
      return [];
    },
  },
  {
    actionId: 'explain.console-message.context.error',
    title: i18nLazyString(UIStrings.explainThisError),
    configurableBindings: false,
    contextTypes(): [] {
      return [];
    },
  },
  {
    actionId: 'explain.console-message.context.warning',
    title: i18nLazyString(UIStrings.explainThisWarning),
    configurableBindings: false,
    contextTypes(): [] {
      return [];
    },
  },
  {
    actionId: 'explain.console-message.context.other',
    title: i18nLazyString(UIStrings.explainThisMessage),
    configurableBindings: false,
    contextTypes(): [] {
      return [];
    },
  },
];

function isGeoRestricted(config?: Root.Runtime.HostConfig): boolean {
  return config?.aidaAvailability?.blockedByGeo === true;
}

function isPolicyRestricted(config?: Root.Runtime.HostConfig): boolean {
  return config?.aidaAvailability?.blockedByEnterprisePolicy === true;
}

function isFeatureEnabled(config?: Root.Runtime.HostConfig): boolean {
  return (config?.aidaAvailability?.enabled && config?.devToolsConsoleInsights?.enabled) === true;
}

SettingUIRegistration.SettingUIRegistration.register(AiAssistanceModel.AiUtils.consoleInsightsEnabledSettingDescriptor,
                                                     {
                                                       category: Common.Settings.SettingCategory.AI,
                                                       title: i18nLazyString(UIStrings.enableConsoleInsights),
                                                     });

for (const action of actions) {
  UI.ActionRegistration.registerActionExtension({
    ...action,
    category: UI.ActionRegistration.ActionCategory.CONSOLE,
    async loadActionDelegate() {
      const Explain = await import('./explain.js');
      return new Explain.ActionDelegate();
    },
    condition: config => {
      return isFeatureEnabled(config) && !isPolicyRestricted(config) && !isGeoRestricted(config);
    },
  });
}
