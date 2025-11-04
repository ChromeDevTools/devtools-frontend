// Copyright 2023 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as Console from '../../panels/console/console.js';
import * as UI from '../../ui/legacy/legacy.js';
const UIStrings = {
    /**
     * @description Message to offer insights for a console error message
     */
    explainThisError: 'Understand this error',
    /**
     * @description Message to offer insights for a console warning message
     */
    explainThisWarning: 'Understand this warning',
    /**
     * @description Message to offer insights for a console message
     */
    explainThisMessage: 'Understand this message',
    /**
     * @description The setting title to enable the console insights feature via
     * the settings tab.
     */
    enableConsoleInsights: 'Understand console messages with AI',
    /**
     * @description Message shown to the user if the DevTools locale is not
     * supported.
     */
    wrongLocale: 'To use this feature, set your language preference to English in DevTools settings.',
    /**
     * @description Message shown to the user if the user's region is not
     * supported.
     */
    geoRestricted: 'This feature is unavailable in your region.',
    /**
     * @description Message shown to the user if the enterprise policy does
     * not allow this feature.
     */
    policyRestricted: 'This setting is managed by your administrator.',
};
const str_ = i18n.i18n.registerUIStrings('panels/explain/explain-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
const setting = 'console-insights-enabled';
const actions = [
    {
        actionId: 'explain.console-message.hover',
        title: i18nLazyString(UIStrings.explainThisMessage),
        contextTypes() {
            return [Console.ConsoleViewMessage.ConsoleViewMessage];
        },
    },
    {
        actionId: 'explain.console-message.teaser',
        title: i18nLazyString(UIStrings.explainThisMessage),
        contextTypes() {
            return [];
        },
    },
    {
        actionId: 'explain.console-message.context.error',
        title: i18nLazyString(UIStrings.explainThisError),
        contextTypes() {
            return [];
        },
    },
    {
        actionId: 'explain.console-message.context.warning',
        title: i18nLazyString(UIStrings.explainThisWarning),
        contextTypes() {
            return [];
        },
    },
    {
        actionId: 'explain.console-message.context.other',
        title: i18nLazyString(UIStrings.explainThisMessage),
        contextTypes() {
            return [];
        },
    },
];
function isLocaleRestricted() {
    const devtoolsLocale = i18n.DevToolsLocale.DevToolsLocale.instance();
    return !devtoolsLocale.locale.startsWith('en-');
}
function isGeoRestricted(config) {
    return config?.aidaAvailability?.blockedByGeo === true;
}
function isPolicyRestricted(config) {
    return config?.aidaAvailability?.blockedByEnterprisePolicy === true;
}
function isFeatureEnabled(config) {
    return (config?.aidaAvailability?.enabled && config?.devToolsConsoleInsights?.enabled) === true;
}
Common.Settings.registerSettingExtension({
    category: "AI" /* Common.Settings.SettingCategory.AI */,
    settingName: setting,
    settingType: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    title: i18nLazyString(UIStrings.enableConsoleInsights),
    defaultValue: false,
    reloadRequired: false,
    condition: config => isFeatureEnabled(config),
    disabledCondition: config => {
        const reasons = [];
        if (isGeoRestricted(config)) {
            reasons.push(i18nString(UIStrings.geoRestricted));
        }
        if (isPolicyRestricted(config)) {
            reasons.push(i18nString(UIStrings.policyRestricted));
        }
        if (isLocaleRestricted()) {
            reasons.push(i18nString(UIStrings.wrongLocale));
        }
        if (reasons.length > 0) {
            return { disabled: true, reasons };
        }
        return { disabled: false };
    },
});
for (const action of actions) {
    UI.ActionRegistration.registerActionExtension({
        ...action,
        category: "CONSOLE" /* UI.ActionRegistration.ActionCategory.CONSOLE */,
        async loadActionDelegate() {
            const Explain = await import('./explain.js');
            return new Explain.ActionDelegate();
        },
        condition: config => {
            return isFeatureEnabled(config) && !isPolicyRestricted(config) && !isGeoRestricted(config);
        },
    });
}
//# sourceMappingURL=explain-meta.prebundle.js.map