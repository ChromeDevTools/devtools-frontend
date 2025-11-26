// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';
const UIStrings = {
    /**
     * @description Title of the Console tool
     */
    console: 'Console',
    /**
     * @description Title of an action that shows the console.
     */
    showConsole: 'Show Console',
    /**
     * @description Title of an action that toggles the console.
     */
    toggleConsole: 'Toggle Console',
    /**
     * @description Text to clear the console
     */
    clearConsole: 'Clear console',
    /**
     * @description Title of an action in the console tool to clear
     */
    clearConsoleHistory: 'Clear console history',
    /**
     * @description Title of an action in the console tool to create pin. A live expression is code that the user can enter into the console and it will be pinned in the UI. Live expressions are constantly evaluated as the user interacts with the console (hence 'live').
     */
    createLiveExpression: 'Create live expression',
    /**
     * @description Title of a setting under the Console category that can be invoked through the Command Menu
     */
    hideNetworkMessages: 'Hide network messages',
    /**
     * @description Title of a setting under the Console category that can be invoked through the Command Menu
     */
    showNetworkMessages: 'Show network messages',
    /**
     * @description Alternative title text of a setting in Console View of the Console panel
     */
    selectedContextOnly: 'Selected context only',
    /**
     * @description Tooltip text that appears on the setting when hovering over it in Console View of the Console panel
     */
    onlyShowMessagesFromTheCurrent: 'Only show messages from the current context (`top`, `iframe`, `worker`, extension)',
    /**
     * @description Title of a setting under the Console category that can be invoked through the Command Menu
     */
    showMessagesFromAllContexts: 'Show messages from all contexts',
    /**
     * @description Title of a setting under the Console category
     */
    timestamps: 'Timestamps',
    /**
     * @description Title of a setting under the Console category that can be invoked through the Command Menu
     */
    showTimestamps: 'Show timestamps',
    /**
     * @description Title of a setting under the Console category that can be invoked through the Command Menu
     */
    hideTimestamps: 'Hide timestamps',
    /**
     * @description Title of a setting under the Console category that can be invoked through the Command Menu
     */
    autocompleteFromHistory: 'Autocomplete from history',
    /**
     * @description Title of a setting under the Console category that can be invoked through the Command Menu
     */
    doNotAutocompleteFromHistory: 'Do not autocomplete from history',
    /**
     * @description Title of a setting under the Console category that controls whether to accept autocompletion with Enter.
     */
    autocompleteOnEnter: 'Accept autocomplete suggestion on Enter',
    /**
     * @description Title of a setting under the Console category that controls whether to accept autocompletion with Enter.
     */
    doNotAutocompleteOnEnter: 'Do not accept autocomplete suggestion on Enter',
    /**
     * @description Title of a setting under the Console category that can be invoked through the Command Menu
     */
    groupSimilarMessagesInConsole: 'Group similar messages in console',
    /**
     * @description Title of a setting under the Console category that can be invoked through the Command Menu
     */
    doNotGroupSimilarMessagesIn: 'Do not group similar messages in console',
    /**
     * @description Title of a setting under the Console category that can be invoked through the Command Menu
     */
    showCorsErrorsInConsole: 'Show `CORS` errors in console',
    /**
     * @description Title of a setting under the Console category that can be invoked through the Command Menu
     */
    doNotShowCorsErrorsIn: 'Do not show `CORS` errors in console',
    /**
     * @description Title of a setting under the Console category in Settings
     */
    eagerEvaluation: 'Eager evaluation',
    /**
     * @description Title of a setting under the Console category that can be invoked through the Command Menu
     */
    eagerlyEvaluateConsolePromptText: 'Eagerly evaluate console prompt text',
    /**
     * @description Title of a setting under the Console category that can be invoked through the Command Menu
     */
    doNotEagerlyEvaluateConsole: 'Do not eagerly evaluate console prompt text',
    /**
     * @description Allows code that is executed in the console to do things that usually are only allowed if triggered by a user action
     */
    evaluateTriggersUserActivation: 'Treat code evaluation as user action',
    /**
     * @description Title of a setting under the Console category that can be invoked through the Command Menu
     */
    treatEvaluationAsUserActivation: 'Treat evaluation as user activation',
    /**
     * @description Title of a setting under the Console category that can be invoked through the Command Menu
     */
    doNotTreatEvaluationAsUser: 'Do not treat evaluation as user activation',
    /**
     * @description Title of a setting under the Console category in Settings that controls whether `console.trace()` messages appear expanded by default.
     */
    expandConsoleTraceMessagesByDefault: 'Automatically expand `console.trace()` messages',
    /**
     * @description Title of a setting under the Console category in Settings that controls whether `console.trace()` messages appear collapsed by default.
     */
    collapseConsoleTraceMessagesByDefault: 'Do not automatically expand `console.trace()` messages',
    /**
     * @description Title of a setting under the Console category in Settings that controls whether AI summaries should
     * be shown for console warnings/errors.
     */
    showConsoleInsightTeasers: 'Show AI summaries for console messages',
};
const str_ = i18n.i18n.registerUIStrings('panels/console/console-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);
let loadedConsoleModule;
async function loadConsoleModule() {
    if (!loadedConsoleModule) {
        loadedConsoleModule = await import('./console.js');
    }
    return loadedConsoleModule;
}
function maybeRetrieveContextTypes(getClassCallBack) {
    if (loadedConsoleModule === undefined) {
        return [];
    }
    return getClassCallBack(loadedConsoleModule);
}
UI.ViewManager.registerViewExtension({
    location: "panel" /* UI.ViewManager.ViewLocationValues.PANEL */,
    id: 'console',
    title: i18nLazyString(UIStrings.console),
    commandPrompt: i18nLazyString(UIStrings.showConsole),
    order: 20,
    async loadView() {
        const Console = await loadConsoleModule();
        return Console.ConsolePanel.ConsolePanel.instance();
    },
});
UI.ViewManager.registerViewExtension({
    location: "drawer-view" /* UI.ViewManager.ViewLocationValues.DRAWER_VIEW */,
    id: 'console-view',
    title: i18nLazyString(UIStrings.console),
    commandPrompt: i18nLazyString(UIStrings.showConsole),
    persistence: "permanent" /* UI.ViewManager.ViewPersistence.PERMANENT */,
    order: 0,
    async loadView() {
        const Console = await loadConsoleModule();
        return Console.ConsolePanel.WrapperView.instance();
    },
});
UI.ActionRegistration.registerActionExtension({
    actionId: 'console.toggle',
    category: "CONSOLE" /* UI.ActionRegistration.ActionCategory.CONSOLE */,
    title: i18nLazyString(UIStrings.toggleConsole),
    async loadActionDelegate() {
        const Console = await loadConsoleModule();
        return new Console.ConsoleView.ActionDelegate();
    },
    bindings: [
        {
            shortcut: 'Ctrl+`',
            keybindSets: [
                "devToolsDefault" /* UI.ActionRegistration.KeybindSet.DEVTOOLS_DEFAULT */,
                "vsCode" /* UI.ActionRegistration.KeybindSet.VS_CODE */,
            ],
        },
    ],
});
UI.ActionRegistration.registerActionExtension({
    actionId: 'console.clear',
    category: "CONSOLE" /* UI.ActionRegistration.ActionCategory.CONSOLE */,
    title: i18nLazyString(UIStrings.clearConsole),
    iconClass: "clear" /* UI.ActionRegistration.IconClass.CLEAR */,
    async loadActionDelegate() {
        const Console = await loadConsoleModule();
        return new Console.ConsoleView.ActionDelegate();
    },
    contextTypes() {
        return maybeRetrieveContextTypes(Console => [Console.ConsoleView.ConsoleView]);
    },
    bindings: [
        {
            shortcut: 'Ctrl+L',
        },
        {
            shortcut: 'Meta+K',
            platform: "mac" /* UI.ActionRegistration.Platforms.MAC */,
        },
    ],
});
UI.ActionRegistration.registerActionExtension({
    actionId: 'console.clear.history',
    category: "CONSOLE" /* UI.ActionRegistration.ActionCategory.CONSOLE */,
    title: i18nLazyString(UIStrings.clearConsoleHistory),
    async loadActionDelegate() {
        const Console = await loadConsoleModule();
        return new Console.ConsoleView.ActionDelegate();
    },
});
UI.ActionRegistration.registerActionExtension({
    actionId: 'console.create-pin',
    category: "CONSOLE" /* UI.ActionRegistration.ActionCategory.CONSOLE */,
    title: i18nLazyString(UIStrings.createLiveExpression),
    iconClass: "eye" /* UI.ActionRegistration.IconClass.EYE */,
    async loadActionDelegate() {
        const Console = await loadConsoleModule();
        return new Console.ConsoleView.ActionDelegate();
    },
});
Common.Settings.registerSettingExtension({
    category: "CONSOLE" /* Common.Settings.SettingCategory.CONSOLE */,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
    title: i18nLazyString(UIStrings.hideNetworkMessages),
    settingName: 'hide-network-messages',
    settingType: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    options: [
        {
            value: true,
            title: i18nLazyString(UIStrings.hideNetworkMessages),
        },
        {
            value: false,
            title: i18nLazyString(UIStrings.showNetworkMessages),
        },
    ],
});
Common.Settings.registerSettingExtension({
    category: "CONSOLE" /* Common.Settings.SettingCategory.CONSOLE */,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
    title: i18nLazyString(UIStrings.selectedContextOnly),
    settingName: 'selected-context-filter-enabled',
    settingType: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    options: [
        {
            value: true,
            title: i18nLazyString(UIStrings.onlyShowMessagesFromTheCurrent),
        },
        {
            value: false,
            title: i18nLazyString(UIStrings.showMessagesFromAllContexts),
        },
    ],
});
Common.Settings.registerSettingExtension({
    category: "CONSOLE" /* Common.Settings.SettingCategory.CONSOLE */,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
    title: i18nLazyString(UIStrings.timestamps),
    settingName: 'console-timestamps-enabled',
    settingType: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    options: [
        {
            value: true,
            title: i18nLazyString(UIStrings.showTimestamps),
        },
        {
            value: false,
            title: i18nLazyString(UIStrings.hideTimestamps),
        },
    ],
});
Common.Settings.registerSettingExtension({
    category: "CONSOLE" /* Common.Settings.SettingCategory.CONSOLE */,
    title: i18nLazyString(UIStrings.autocompleteFromHistory),
    settingName: 'console-history-autocomplete',
    settingType: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    options: [
        {
            value: true,
            title: i18nLazyString(UIStrings.autocompleteFromHistory),
        },
        {
            value: false,
            title: i18nLazyString(UIStrings.doNotAutocompleteFromHistory),
        },
    ],
});
Common.Settings.registerSettingExtension({
    category: "CONSOLE" /* Common.Settings.SettingCategory.CONSOLE */,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
    title: i18nLazyString(UIStrings.autocompleteOnEnter),
    settingName: 'console-autocomplete-on-enter',
    settingType: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    options: [
        {
            value: true,
            title: i18nLazyString(UIStrings.autocompleteOnEnter),
        },
        {
            value: false,
            title: i18nLazyString(UIStrings.doNotAutocompleteOnEnter),
        },
    ],
});
Common.Settings.registerSettingExtension({
    category: "CONSOLE" /* Common.Settings.SettingCategory.CONSOLE */,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
    title: i18nLazyString(UIStrings.groupSimilarMessagesInConsole),
    settingName: 'console-group-similar',
    settingType: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    options: [
        {
            value: true,
            title: i18nLazyString(UIStrings.groupSimilarMessagesInConsole),
        },
        {
            value: false,
            title: i18nLazyString(UIStrings.doNotGroupSimilarMessagesIn),
        },
    ],
});
Common.Settings.registerSettingExtension({
    category: "CONSOLE" /* Common.Settings.SettingCategory.CONSOLE */,
    title: i18nLazyString(UIStrings.showCorsErrorsInConsole),
    settingName: 'console-shows-cors-errors',
    settingType: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    options: [
        {
            value: true,
            title: i18nLazyString(UIStrings.showCorsErrorsInConsole),
        },
        {
            value: false,
            title: i18nLazyString(UIStrings.doNotShowCorsErrorsIn),
        },
    ],
});
Common.Settings.registerSettingExtension({
    category: "CONSOLE" /* Common.Settings.SettingCategory.CONSOLE */,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
    title: i18nLazyString(UIStrings.eagerEvaluation),
    settingName: 'console-eager-eval',
    settingType: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    options: [
        {
            value: true,
            title: i18nLazyString(UIStrings.eagerlyEvaluateConsolePromptText),
        },
        {
            value: false,
            title: i18nLazyString(UIStrings.doNotEagerlyEvaluateConsole),
        },
    ],
});
Common.Settings.registerSettingExtension({
    category: "CONSOLE" /* Common.Settings.SettingCategory.CONSOLE */,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
    title: i18nLazyString(UIStrings.evaluateTriggersUserActivation),
    settingName: 'console-user-activation-eval',
    settingType: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    options: [
        {
            value: true,
            title: i18nLazyString(UIStrings.treatEvaluationAsUserActivation),
        },
        {
            value: false,
            title: i18nLazyString(UIStrings.doNotTreatEvaluationAsUser),
        },
    ],
});
Common.Settings.registerSettingExtension({
    category: "CONSOLE" /* Common.Settings.SettingCategory.CONSOLE */,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
    title: i18nLazyString(UIStrings.expandConsoleTraceMessagesByDefault),
    settingName: 'console-trace-expand',
    settingType: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    options: [
        {
            value: true,
            title: i18nLazyString(UIStrings.expandConsoleTraceMessagesByDefault),
        },
        {
            value: false,
            title: i18nLazyString(UIStrings.collapseConsoleTraceMessagesByDefault),
        },
    ],
});
Common.Settings.registerSettingExtension({
    category: "CONSOLE" /* Common.Settings.SettingCategory.CONSOLE */,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
    title: i18nLazyString(UIStrings.showConsoleInsightTeasers),
    settingName: 'console-insight-teasers-enabled',
    settingType: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
});
Common.Revealer.registerRevealer({
    contextTypes() {
        return [
            Common.Console.Console,
        ];
    },
    destination: undefined,
    async loadRevealer() {
        const Console = await loadConsoleModule();
        return new Console.ConsolePanel.ConsoleRevealer();
    },
});
//# sourceMappingURL=console-meta.prebundle.js.map