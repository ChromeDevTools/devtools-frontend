// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Root from '../../core/root/root.js';
import * as Console from '../../panels/console/console.js';
import * as UI from '../../ui/legacy/legacy.js';

const UIStrings = {
  /**
   *@description Message to offer insights for a console error message
   */
  explainThisError: 'Explain this error',
  /**
   *@description Message to offer insights for a console warning message
   */
  explainThisWarning: 'Explain this warning',
  /**
   *@description Message to offer insights for a console message
   */
  explainThisMessage: 'Explain this message',
  /**
   * @description The setting title to enable the console insights feature via
   * the settings tab.
   */
  enableConsoleInsights: 'Enable Console Insights',
  /**
   * @description Message shown to the user if the DevTools locale is not
   * supported.
   */
  wrongLocale: 'Only English locales are currently supported.',
};
const str_ = i18n.i18n.registerUIStrings('panels/explain/explain-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

const setting = 'console-insights-enabled';

const actions = [
  {
    actionId: 'explain.console-message.hover',
    title: i18nLazyString(UIStrings.explainThisMessage),
    contextTypes(): [typeof Console.ConsoleViewMessage.ConsoleViewMessage] {
      return [Console.ConsoleViewMessage.ConsoleViewMessage];
    },
  },
  {
    actionId: 'explain.console-message.context.error',
    title: i18nLazyString(UIStrings.explainThisError),
    contextTypes(): [] {
      return [];
    },
  },
  {
    actionId: 'explain.console-message.context.warning',
    title: i18nLazyString(UIStrings.explainThisWarning),
    contextTypes(): [] {
      return [];
    },
  },
  {
    actionId: 'explain.console-message.context.other',
    title: i18nLazyString(UIStrings.explainThisMessage),
    contextTypes(): [] {
      return [];
    },
  },
];

function isActionAvailable(): boolean {
  return isLocaleAllowed() === true && isSettingAvailable();
}

function isSettingAvailable(): boolean {
  return isFeatureEnabled();
}

/**
 * Additional checks for the availability of the feature event if enabled via
 * the server. Returns true if locale is supported, or a string containing the
 * reason why not.
 */
function isLocaleAllowed(): true|string {
  const devtoolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance();
  if (!devtoolsLocale.locale.startsWith('en-')) {
    return i18nString(UIStrings.wrongLocale);
  }

  return true;
}

function isFeatureEnabled(): boolean {
  return Root.Runtime.Runtime.queryParam('enableAida') === 'true';
}

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.CONSOLE,
  settingName: setting,
  settingType: Common.Settings.SettingType.BOOLEAN,
  title: i18nLazyString(UIStrings.enableConsoleInsights),
  defaultValue: true,
  reloadRequired: true,
  condition: isSettingAvailable,
  disabledCondition: () => {
    const localeCheck = isLocaleAllowed();
    if (localeCheck !== true) {
      return {disabled: true, reason: localeCheck};
    }
    return {disabled: false};
  },
});

for (const action of actions) {
  UI.ActionRegistration.registerActionExtension({
    ...action,
    setting,
    category: UI.ActionRegistration.ActionCategory.CONSOLE,
    async loadActionDelegate() {
      const Explain = await import('./explain.js');
      return new Explain.ActionDelegate();
    },
    condition: isActionAvailable,
  });
}
