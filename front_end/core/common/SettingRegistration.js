// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as i18n from '../i18n/i18n.js';
import * as Root from '../root/root.js';
const UIStrings = {
    /**
     * @description Title of the Elements Panel
     */
    elements: 'Elements',
    /**
     * @description Text for DevTools AI
     */
    ai: 'AI',
    /**
     * @description Text for DevTools appearance
     */
    appearance: 'Appearance',
    /**
     * @description Name of the Sources panel
     */
    sources: 'Sources',
    /**
     * @description Title of the Network tool
     */
    network: 'Network',
    /**
     * @description Text for the performance of something
     */
    performance: 'Performance',
    /**
     * @description Title of the Console tool
     */
    console: 'Console',
    /**
     * @description A title of the 'Persistence' setting category
     */
    persistence: 'Persistence',
    /**
     * @description Text that refers to the debugger
     */
    debugger: 'Debugger',
    /**
     * @description Text describing global shortcuts and settings that are available throughout the DevTools
     */
    global: 'Global',
    /**
     * @description Title of the Rendering tool
     */
    rendering: 'Rendering',
    /**
     * @description Title of a section on CSS Grid tooling
     */
    grid: 'Grid',
    /**
     * @description Text for the mobile platform, as opposed to desktop
     */
    mobile: 'Mobile',
    /**
     * @description Text for the memory of the page
     */
    memory: 'Memory',
    /**
     * @description Text for the extension of the page
     */
    extension: 'Extension',
    /**
     * @description Text for the adorner of the page
     */
    adorner: 'Adorner',
    /**
     * @description Header for the "Account" section in the settings UI. The "Account"
     * section allows users see their signed in account and configure which DevTools data is synced via Chrome Sync.
     */
    account: 'Account',
    /**
     * @description Text for the privacy section of the page.
     */
    privacy: 'Privacy',
};
const str_ = i18n.i18n.registerUIStrings('core/common/SettingRegistration.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
let registeredSettings = [];
const settingNameSet = new Set();
export function registerSettingExtension(registration) {
    const settingName = registration.settingName;
    if (settingNameSet.has(settingName)) {
        throw new Error(`Duplicate setting name '${settingName}'`);
    }
    settingNameSet.add(settingName);
    registeredSettings.push(registration);
}
export function getRegisteredSettings() {
    return registeredSettings.filter(setting => Root.Runtime.Runtime.isDescriptorEnabled(setting));
}
export function registerSettingsForTest(settings, forceReset = false) {
    if (registeredSettings.length === 0 || forceReset) {
        registeredSettings = settings;
        settingNameSet.clear();
        for (const setting of settings) {
            const settingName = setting.settingName;
            if (settingNameSet.has(settingName)) {
                throw new Error(`Duplicate setting name '${settingName}'`);
            }
            settingNameSet.add(settingName);
        }
    }
}
export function resetSettings() {
    registeredSettings = [];
    settingNameSet.clear();
}
export function maybeRemoveSettingExtension(settingName) {
    const settingIndex = registeredSettings.findIndex(setting => setting.settingName === settingName);
    if (settingIndex < 0 || !settingNameSet.delete(settingName)) {
        return false;
    }
    registeredSettings.splice(settingIndex, 1);
    return true;
}
export function getLocalizedSettingsCategory(category) {
    switch (category) {
        case "ELEMENTS" /* SettingCategory.ELEMENTS */:
            return i18nString(UIStrings.elements);
        case "AI" /* SettingCategory.AI */:
            return i18nString(UIStrings.ai);
        case "APPEARANCE" /* SettingCategory.APPEARANCE */:
            return i18nString(UIStrings.appearance);
        case "SOURCES" /* SettingCategory.SOURCES */:
            return i18nString(UIStrings.sources);
        case "NETWORK" /* SettingCategory.NETWORK */:
            return i18nString(UIStrings.network);
        case "PERFORMANCE" /* SettingCategory.PERFORMANCE */:
            return i18nString(UIStrings.performance);
        case "CONSOLE" /* SettingCategory.CONSOLE */:
            return i18nString(UIStrings.console);
        case "PERSISTENCE" /* SettingCategory.PERSISTENCE */:
            return i18nString(UIStrings.persistence);
        case "DEBUGGER" /* SettingCategory.DEBUGGER */:
            return i18nString(UIStrings.debugger);
        case "GLOBAL" /* SettingCategory.GLOBAL */:
            return i18nString(UIStrings.global);
        case "RENDERING" /* SettingCategory.RENDERING */:
            return i18nString(UIStrings.rendering);
        case "GRID" /* SettingCategory.GRID */:
            return i18nString(UIStrings.grid);
        case "MOBILE" /* SettingCategory.MOBILE */:
            return i18nString(UIStrings.mobile);
        case "EMULATION" /* SettingCategory.EMULATION */:
            return i18nString(UIStrings.console);
        case "MEMORY" /* SettingCategory.MEMORY */:
            return i18nString(UIStrings.memory);
        case "EXTENSIONS" /* SettingCategory.EXTENSIONS */:
            return i18nString(UIStrings.extension);
        case "ADORNER" /* SettingCategory.ADORNER */:
            return i18nString(UIStrings.adorner);
        case "" /* SettingCategory.NONE */:
            return i18n.i18n.lockedString('');
        case "ACCOUNT" /* SettingCategory.ACCOUNT */:
            return i18nString(UIStrings.account);
        case "PRIVACY" /* SettingCategory.PRIVACY */:
            return i18nString(UIStrings.privacy);
    }
}
//# sourceMappingURL=SettingRegistration.js.map