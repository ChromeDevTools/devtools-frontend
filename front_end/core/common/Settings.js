// Copyright 2009 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';
import { Console } from './Console.js';
import { ObjectWrapper } from './Object.js';
import { getLocalizedSettingsCategory, getRegisteredSettings as getRegisteredSettingsInternal, maybeRemoveSettingExtension, registerSettingExtension, registerSettingsForTest, resetSettings, } from './SettingRegistration.js';
let settingsInstance;
export class Settings {
    syncedStorage;
    globalStorage;
    localStorage;
    #sessionStorage = new SettingsStorage({});
    settingNameSet = new Set();
    orderValuesBySettingCategory = new Map();
    #eventSupport = new ObjectWrapper();
    #registry = new Map();
    moduleSettings = new Map();
    #logSettingAccess;
    constructor(syncedStorage, globalStorage, localStorage, logSettingAccess, runSettingsMigration) {
        this.syncedStorage = syncedStorage;
        this.globalStorage = globalStorage;
        this.localStorage = localStorage;
        this.#logSettingAccess = logSettingAccess;
        for (const registration of this.getRegisteredSettings()) {
            const { settingName, defaultValue, storageType } = registration;
            const isRegex = registration.settingType === "regex" /* SettingType.REGEX */;
            const evaluatedDefaultValue = typeof defaultValue === 'function' ? defaultValue(Root.Runtime.hostConfig) : defaultValue;
            const setting = isRegex && typeof evaluatedDefaultValue === 'string' ?
                this.createRegExpSetting(settingName, evaluatedDefaultValue, undefined, storageType) :
                this.createSetting(settingName, evaluatedDefaultValue, storageType);
            setting.setTitleFunction(registration.title);
            if (registration.userActionCondition) {
                setting.setRequiresUserAction(Boolean(Root.Runtime.Runtime.queryParam(registration.userActionCondition)));
            }
            setting.setRegistration(registration);
            this.registerModuleSetting(setting);
        }
        if (runSettingsMigration) {
            new VersionController(this).updateVersion();
        }
    }
    getRegisteredSettings() {
        return getRegisteredSettingsInternal();
    }
    static hasInstance() {
        return typeof settingsInstance !== 'undefined';
    }
    static instance(opts = { forceNew: null, syncedStorage: null, globalStorage: null, localStorage: null }) {
        const { forceNew, syncedStorage, globalStorage, localStorage, logSettingAccess, runSettingsMigration } = opts;
        if (!settingsInstance || forceNew) {
            if (!syncedStorage || !globalStorage || !localStorage) {
                throw new Error(`Unable to create settings: global and local storage must be provided: ${new Error().stack}`);
            }
            settingsInstance =
                new Settings(syncedStorage, globalStorage, localStorage, logSettingAccess, runSettingsMigration);
        }
        return settingsInstance;
    }
    static removeInstance() {
        settingsInstance = undefined;
    }
    registerModuleSetting(setting) {
        const settingName = setting.name;
        const category = setting.category();
        const order = setting.order();
        if (this.settingNameSet.has(settingName)) {
            throw new Error(`Duplicate Setting name '${settingName}'`);
        }
        if (category && order) {
            const orderValues = this.orderValuesBySettingCategory.get(category) || new Set();
            if (orderValues.has(order)) {
                throw new Error(`Duplicate order value '${order}' for settings category '${category}'`);
            }
            orderValues.add(order);
            this.orderValuesBySettingCategory.set(category, orderValues);
        }
        this.settingNameSet.add(settingName);
        this.moduleSettings.set(setting.name, setting);
    }
    static normalizeSettingName(name) {
        if ([
            VersionController.GLOBAL_VERSION_SETTING_NAME,
            VersionController.SYNCED_VERSION_SETTING_NAME,
            VersionController.LOCAL_VERSION_SETTING_NAME,
            'currentDockState',
            'isUnderTest',
        ].includes(name)) {
            return name;
        }
        return Platform.StringUtilities.toKebabCase(name);
    }
    /**
     * Prefer a module setting if this setting is one that you might not want to
     * surface to the user to control themselves. Examples of these are settings
     * to store UI state such as how a user choses to position a split widget or
     * which panel they last opened.
     * If you are creating a setting that you expect the user to control, and
     * sync, prefer {@link Settings.createSetting}
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    moduleSetting(settingName) {
        const setting = this.moduleSettings.get(settingName);
        if (!setting) {
            throw new Error('No setting registered: ' + settingName);
        }
        return setting;
    }
    settingForTest(settingName) {
        const setting = this.#registry.get(settingName);
        if (!setting) {
            throw new Error('No setting registered: ' + settingName);
        }
        return setting;
    }
    /**
     * Get setting via key, and create a new setting if the requested setting does not exist.
     * @param key kebab-case string ID
     * @param defaultValue
     * @param storageType If not specified, SettingStorageType.GLOBAL is used.
     */
    createSetting(key, defaultValue, storageType) {
        const storage = this.storageFromType(storageType);
        let setting = this.#registry.get(key);
        if (!setting) {
            setting = new Setting(key, defaultValue, this.#eventSupport, storage, this.#logSettingAccess);
            this.#registry.set(key, setting);
        }
        return setting;
    }
    createLocalSetting(key, defaultValue) {
        return this.createSetting(key, defaultValue, "Local" /* SettingStorageType.LOCAL */);
    }
    createRegExpSetting(key, defaultValue, regexFlags, storageType) {
        if (!this.#registry.get(key)) {
            this.#registry.set(key, new RegExpSetting(key, defaultValue, this.#eventSupport, this.storageFromType(storageType), regexFlags, this.#logSettingAccess));
        }
        return this.#registry.get(key);
    }
    clearAll() {
        this.globalStorage.removeAll();
        this.syncedStorage.removeAll();
        this.localStorage.removeAll();
        new VersionController(this).resetToCurrent();
    }
    storageFromType(storageType) {
        switch (storageType) {
            case "Local" /* SettingStorageType.LOCAL */:
                return this.localStorage;
            case "Session" /* SettingStorageType.SESSION */:
                return this.#sessionStorage;
            case "Global" /* SettingStorageType.GLOBAL */:
                return this.globalStorage;
            case "Synced" /* SettingStorageType.SYNCED */:
                return this.syncedStorage;
        }
        return this.globalStorage;
    }
    getRegistry() {
        return this.#registry;
    }
}
export const NOOP_STORAGE = {
    register: () => { },
    set: () => { },
    get: () => Promise.resolve(''),
    remove: () => { },
    clear: () => { },
};
export class SettingsStorage {
    object;
    backingStore;
    storagePrefix;
    constructor(object, backingStore = NOOP_STORAGE, storagePrefix = '') {
        this.object = object;
        this.backingStore = backingStore;
        this.storagePrefix = storagePrefix;
    }
    register(name) {
        name = this.storagePrefix + name;
        this.backingStore.register(name);
    }
    set(name, value) {
        name = this.storagePrefix + name;
        this.object[name] = value;
        this.backingStore.set(name, value);
    }
    has(name) {
        name = this.storagePrefix + name;
        return name in this.object;
    }
    get(name) {
        name = this.storagePrefix + name;
        return this.object[name];
    }
    async forceGet(originalName) {
        const name = this.storagePrefix + originalName;
        const value = await this.backingStore.get(name);
        if (value && value !== this.object[name]) {
            this.set(originalName, value);
        }
        else if (!value) {
            this.remove(originalName);
        }
        return value;
    }
    remove(name) {
        name = this.storagePrefix + name;
        delete this.object[name];
        this.backingStore.remove(name);
    }
    removeAll() {
        this.object = {};
        this.backingStore.clear();
    }
    keys() {
        return Object.keys(this.object);
    }
    dumpSizes() {
        Console.instance().log('Ten largest settings: ');
        // @ts-expect-error __proto__ optimization
        const sizes = { __proto__: null };
        for (const key in this.object) {
            sizes[key] = this.object[key].length;
        }
        const keys = Object.keys(sizes);
        function comparator(key1, key2) {
            return sizes[key2] - sizes[key1];
        }
        keys.sort(comparator);
        for (let i = 0; i < 10 && i < keys.length; ++i) {
            Console.instance().log('Setting: \'' + keys[i] + '\', size: ' + sizes[keys[i]]);
        }
    }
}
export class Deprecation {
    disabled;
    warning;
    experiment;
    constructor({ deprecationNotice }) {
        if (!deprecationNotice) {
            throw new Error('Cannot create deprecation info for a non-deprecated setting');
        }
        this.disabled = deprecationNotice.disabled;
        this.warning = deprecationNotice.warning();
        this.experiment = deprecationNotice.experiment ?
            Root.Runtime.experiments.allConfigurableExperiments().find(e => e.name === deprecationNotice.experiment) :
            undefined;
    }
}
export class Setting {
    name;
    defaultValue;
    eventSupport;
    storage;
    #titleFunction;
    #title;
    #registration = null;
    #requiresUserAction;
    #value;
    // TODO(crbug.com/1172300) Type cannot be inferred without changes to consumers. See above.
    #serializer = JSON;
    #hadUserAction;
    #disabled;
    #deprecation = null;
    #loggedInitialAccess = false;
    #logSettingAccess;
    constructor(name, defaultValue, eventSupport, storage, logSettingAccess) {
        this.name = name;
        this.defaultValue = defaultValue;
        this.eventSupport = eventSupport;
        this.storage = storage;
        storage.register(this.name);
        this.#logSettingAccess = logSettingAccess;
    }
    setSerializer(serializer) {
        this.#serializer = serializer;
    }
    addChangeListener(listener, thisObject) {
        return this.eventSupport.addEventListener(this.name, listener, thisObject);
    }
    removeChangeListener(listener, thisObject) {
        this.eventSupport.removeEventListener(this.name, listener, thisObject);
    }
    title() {
        if (this.#title) {
            return this.#title;
        }
        if (this.#titleFunction) {
            return this.#titleFunction();
        }
        return '';
    }
    setTitleFunction(titleFunction) {
        if (titleFunction) {
            this.#titleFunction = titleFunction;
        }
    }
    setTitle(title) {
        this.#title = title;
    }
    setRequiresUserAction(requiresUserAction) {
        this.#requiresUserAction = requiresUserAction;
    }
    disabled() {
        if (this.#registration?.disabledCondition) {
            const { disabled } = this.#registration.disabledCondition(Root.Runtime.hostConfig);
            // If registration does not disable it, pass through to #disabled
            // attribute check.
            if (disabled) {
                return true;
            }
        }
        return this.#disabled || false;
    }
    disabledReasons() {
        if (this.#registration?.disabledCondition) {
            const result = this.#registration.disabledCondition(Root.Runtime.hostConfig);
            if (result.disabled) {
                return result.reasons;
            }
        }
        return [];
    }
    setDisabled(disabled) {
        this.#disabled = disabled;
        this.eventSupport.dispatchEventToListeners(this.name);
    }
    #maybeLogAccess(value) {
        try {
            const valueToLog = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ?
                value :
                this.#serializer?.stringify(value);
            if (valueToLog !== undefined && this.#logSettingAccess) {
                void this.#logSettingAccess(this.name, valueToLog);
            }
        }
        catch {
        }
    }
    #maybeLogInitialAccess(value) {
        if (!this.#loggedInitialAccess) {
            this.#maybeLogAccess(value);
            this.#loggedInitialAccess = true;
        }
    }
    get() {
        if (this.#requiresUserAction && !this.#hadUserAction) {
            this.#maybeLogInitialAccess(this.defaultValue);
            return this.defaultValue;
        }
        if (typeof this.#value !== 'undefined') {
            this.#maybeLogInitialAccess(this.#value);
            return this.#value;
        }
        this.#value = this.defaultValue;
        if (this.storage.has(this.name)) {
            try {
                this.#value = this.#serializer.parse(this.storage.get(this.name));
            }
            catch {
                this.storage.remove(this.name);
            }
        }
        this.#maybeLogInitialAccess(this.#value);
        return this.#value;
    }
    // Prefer this getter for settings which are "disableable". The plain getter returns `this.#value`,
    // even if the setting is disabled, which means the callsite has to explicitly call the `disabled()`
    // getter and add its own logic for the disabled state.
    getIfNotDisabled() {
        if (this.disabled()) {
            return;
        }
        return this.get();
    }
    async forceGet() {
        const name = this.name;
        const oldValue = this.storage.get(name);
        const value = await this.storage.forceGet(name);
        this.#value = this.defaultValue;
        if (value) {
            try {
                this.#value = this.#serializer.parse(value);
            }
            catch {
                this.storage.remove(this.name);
            }
        }
        if (oldValue !== value) {
            this.eventSupport.dispatchEventToListeners(this.name, this.#value);
        }
        this.#maybeLogInitialAccess(this.#value);
        return this.#value;
    }
    set(value) {
        this.#maybeLogAccess(value);
        this.#hadUserAction = true;
        this.#value = value;
        try {
            const settingString = this.#serializer.stringify(value);
            try {
                this.storage.set(this.name, settingString);
            }
            catch (e) {
                this.printSettingsSavingError(e.message, settingString);
            }
        }
        catch (e) {
            Console.instance().error('Cannot stringify setting with name: ' + this.name + ', error: ' + e.message);
        }
        this.eventSupport.dispatchEventToListeners(this.name, value);
    }
    setRegistration(registration) {
        this.#registration = registration;
        const { deprecationNotice } = registration;
        if (deprecationNotice?.disabled) {
            const experiment = deprecationNotice.experiment ?
                Root.Runtime.experiments.allConfigurableExperiments().find(e => e.name === deprecationNotice.experiment) :
                undefined;
            if ((!experiment || experiment.isEnabled())) {
                this.set(this.defaultValue);
                this.setDisabled(true);
            }
        }
    }
    type() {
        if (this.#registration) {
            return this.#registration.settingType;
        }
        return null;
    }
    options() {
        if (this.#registration && this.#registration.options) {
            return this.#registration.options.map(opt => {
                const { value, title, text, raw } = opt;
                return {
                    value,
                    title: title(),
                    text: typeof text === 'function' ? text() : text,
                    raw,
                };
            });
        }
        return [];
    }
    reloadRequired() {
        if (this.#registration) {
            return this.#registration.reloadRequired || null;
        }
        return null;
    }
    category() {
        if (this.#registration) {
            return this.#registration.category || null;
        }
        return null;
    }
    tags() {
        if (this.#registration && this.#registration.tags) {
            // Get localized keys and separate by null character to prevent fuzzy matching from matching across them.
            return this.#registration.tags.map(tag => tag()).join('\0');
        }
        return null;
    }
    order() {
        if (this.#registration) {
            return this.#registration.order || null;
        }
        return null;
    }
    /**
     * See {@link LearnMore} for more info
     */
    learnMore() {
        return this.#registration?.learnMore ?? null;
    }
    get deprecation() {
        if (!this.#registration || !this.#registration.deprecationNotice) {
            return null;
        }
        if (!this.#deprecation) {
            this.#deprecation = new Deprecation(this.#registration);
        }
        return this.#deprecation;
    }
    printSettingsSavingError(message, value) {
        const errorMessage = 'Error saving setting with name: ' + this.name + ', value length: ' + value.length + '. Error: ' + message;
        console.error(errorMessage);
        Console.instance().error(errorMessage);
        this.storage.dumpSizes();
    }
}
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class RegExpSetting extends Setting {
    #regexFlags;
    #regex;
    constructor(name, defaultValue, eventSupport, storage, regexFlags, logSettingAccess) {
        super(name, defaultValue ? [{ pattern: defaultValue }] : [], eventSupport, storage, logSettingAccess);
        this.#regexFlags = regexFlags;
    }
    get() {
        const result = [];
        const items = this.getAsArray();
        for (let i = 0; i < items.length; ++i) {
            const item = items[i];
            if (item.pattern && !item.disabled) {
                result.push(item.pattern);
            }
        }
        return result.join('|');
    }
    getAsArray() {
        return super.get();
    }
    set(value) {
        this.setAsArray([{ pattern: value, disabled: false }]);
    }
    setAsArray(value) {
        this.#regex = undefined;
        super.set(value);
    }
    asRegExp() {
        if (typeof this.#regex !== 'undefined') {
            return this.#regex;
        }
        this.#regex = null;
        try {
            const pattern = this.get();
            if (pattern) {
                this.#regex = new RegExp(pattern, this.#regexFlags || '');
            }
        }
        catch {
        }
        return this.#regex;
    }
}
// The VersionController does a lot of mapping and restructuring which often need
// typecasting to any, allow it in there
/* eslint-disable @typescript-eslint/no-explicit-any */
export class VersionController {
    static GLOBAL_VERSION_SETTING_NAME = 'inspectorVersion';
    static SYNCED_VERSION_SETTING_NAME = 'syncedInspectorVersion';
    static LOCAL_VERSION_SETTING_NAME = 'localInspectorVersion';
    static CURRENT_VERSION = 40;
    #settings;
    #globalVersionSetting;
    #syncedVersionSetting;
    #localVersionSetting;
    constructor(settings) {
        this.#settings = settings;
        // If no version setting is found, we initialize with the current version and don't do anything.
        this.#globalVersionSetting = this.#settings.createSetting(VersionController.GLOBAL_VERSION_SETTING_NAME, VersionController.CURRENT_VERSION, "Global" /* SettingStorageType.GLOBAL */);
        this.#syncedVersionSetting = this.#settings.createSetting(VersionController.SYNCED_VERSION_SETTING_NAME, VersionController.CURRENT_VERSION, "Synced" /* SettingStorageType.SYNCED */);
        this.#localVersionSetting = this.#settings.createSetting(VersionController.LOCAL_VERSION_SETTING_NAME, VersionController.CURRENT_VERSION, "Local" /* SettingStorageType.LOCAL */);
    }
    /**
     * Force re-sets all version number settings to the current version without
     * running any migrations.
     */
    resetToCurrent() {
        this.#globalVersionSetting.set(VersionController.CURRENT_VERSION);
        this.#syncedVersionSetting.set(VersionController.CURRENT_VERSION);
        this.#localVersionSetting.set(VersionController.CURRENT_VERSION);
    }
    #removeSetting(setting) {
        const name = setting.name;
        this.#settings.getRegistry().delete(name);
        this.#settings.moduleSettings.delete(name);
        setting.storage.remove(name);
    }
    /**
     * Runs the appropriate migrations and updates the version settings accordingly.
     *
     * To determine what migrations to run we take the minimum of all version number settings.
     *
     * IMPORTANT: All migrations must be idempotent since they might be applied multiple times.
     */
    updateVersion() {
        const currentVersion = VersionController.CURRENT_VERSION;
        const minimumVersion = Math.min(this.#globalVersionSetting.get(), this.#syncedVersionSetting.get(), this.#localVersionSetting.get());
        const methodsToRun = this.methodsToRunToUpdateVersion(minimumVersion, currentVersion);
        console.assert(
        // @ts-expect-error
        this[`updateVersionFrom${currentVersion}To${currentVersion + 1}`] === undefined, 'Unexpected migration method found. Increment CURRENT_VERSION or remove the method.');
        for (const method of methodsToRun) {
            // @ts-expect-error Special version method matching
            this[method].call(this);
        }
        this.resetToCurrent();
    }
    methodsToRunToUpdateVersion(oldVersion, currentVersion) {
        const result = [];
        for (let i = oldVersion; i < currentVersion; ++i) {
            result.push('updateVersionFrom' + i + 'To' + (i + 1));
        }
        return result;
    }
    updateVersionFrom0To1() {
        this.clearBreakpointsWhenTooMany(this.#settings.createLocalSetting('breakpoints', []), 500000);
    }
    updateVersionFrom1To2() {
        this.#settings.createSetting('previouslyViewedFiles', []).set([]);
    }
    updateVersionFrom2To3() {
        this.#settings.createSetting('fileSystemMapping', {}).set({});
        this.#removeSetting(this.#settings.createSetting('fileMappingEntries', []));
    }
    updateVersionFrom3To4() {
        const advancedMode = this.#settings.createSetting('showHeaSnapshotObjectsHiddenProperties', false);
        this.#settings.moduleSetting('showAdvancedHeapSnapshotProperties').set(advancedMode.get());
        this.#removeSetting(advancedMode);
    }
    updateVersionFrom4To5() {
        const settingNames = {
            FileSystemViewSidebarWidth: 'fileSystemViewSplitViewState',
            elementsSidebarWidth: 'elementsPanelSplitViewState',
            StylesPaneSplitRatio: 'stylesPaneSplitViewState',
            heapSnapshotRetainersViewSize: 'heapSnapshotSplitViewState',
            'InspectorView.splitView': 'InspectorView.splitViewState',
            'InspectorView.screencastSplitView': 'InspectorView.screencastSplitViewState',
            'Inspector.drawerSplitView': 'Inspector.drawerSplitViewState',
            layerDetailsSplitView: 'layerDetailsSplitViewState',
            networkSidebarWidth: 'networkPanelSplitViewState',
            sourcesSidebarWidth: 'sourcesPanelSplitViewState',
            scriptsPanelNavigatorSidebarWidth: 'sourcesPanelNavigatorSplitViewState',
            sourcesPanelSplitSidebarRatio: 'sourcesPanelDebuggerSidebarSplitViewState',
            'timeline-details': 'timelinePanelDetailsSplitViewState',
            'timeline-split': 'timelinePanelRecorsSplitViewState',
            'timeline-view': 'timelinePanelTimelineStackSplitViewState',
            auditsSidebarWidth: 'auditsPanelSplitViewState',
            layersSidebarWidth: 'layersPanelSplitViewState',
            profilesSidebarWidth: 'profilesPanelSplitViewState',
            resourcesSidebarWidth: 'resourcesPanelSplitViewState',
        };
        const empty = {};
        for (const oldName in settingNames) {
            const newName = settingNames[oldName];
            const oldNameH = oldName + 'H';
            let newValue = null;
            const oldSetting = this.#settings.createSetting(oldName, empty);
            if (oldSetting.get() !== empty) {
                newValue = newValue || {};
                // @ts-expect-error
                newValue.vertical = {};
                // @ts-expect-error
                newValue.vertical.size = oldSetting.get();
                this.#removeSetting(oldSetting);
            }
            const oldSettingH = this.#settings.createSetting(oldNameH, empty);
            if (oldSettingH.get() !== empty) {
                newValue = newValue || {};
                // @ts-expect-error
                newValue.horizontal = {};
                // @ts-expect-error
                newValue.horizontal.size = oldSettingH.get();
                this.#removeSetting(oldSettingH);
            }
            if (newValue) {
                this.#settings.createSetting(newName, {}).set(newValue);
            }
        }
    }
    updateVersionFrom5To6() {
        const settingNames = {
            debuggerSidebarHidden: 'sourcesPanelSplitViewState',
            navigatorHidden: 'sourcesPanelNavigatorSplitViewState',
            'WebInspector.Drawer.showOnLoad': 'Inspector.drawerSplitViewState',
        };
        for (const oldName in settingNames) {
            const oldSetting = this.#settings.createSetting(oldName, null);
            if (oldSetting.get() === null) {
                this.#removeSetting(oldSetting);
                continue;
            }
            const newName = settingNames[oldName];
            const invert = oldName === 'WebInspector.Drawer.showOnLoad';
            const hidden = oldSetting.get() !== invert;
            this.#removeSetting(oldSetting);
            const showMode = hidden ? 'OnlyMain' : 'Both';
            const newSetting = this.#settings.createSetting(newName, {});
            const newValue = newSetting.get() || {};
            // @ts-expect-error
            newValue.vertical = newValue.vertical || {};
            // @ts-expect-error
            newValue.vertical.showMode = showMode;
            // @ts-expect-error
            newValue.horizontal = newValue.horizontal || {};
            // @ts-expect-error
            newValue.horizontal.showMode = showMode;
            newSetting.set(newValue);
        }
    }
    updateVersionFrom6To7() {
        const settingNames = {
            sourcesPanelNavigatorSplitViewState: 'sourcesPanelNavigatorSplitViewState',
            elementsPanelSplitViewState: 'elementsPanelSplitViewState',
            stylesPaneSplitViewState: 'stylesPaneSplitViewState',
            sourcesPanelDebuggerSidebarSplitViewState: 'sourcesPanelDebuggerSidebarSplitViewState',
        };
        const empty = {};
        for (const name in settingNames) {
            const setting = this.#settings.createSetting(name, empty);
            const value = setting.get();
            if (value === empty) {
                continue;
            }
            // Zero out saved percentage sizes, and they will be restored to defaults.
            if (value.vertical?.size && value.vertical.size < 1) {
                value.vertical.size = 0;
            }
            if (value.horizontal?.size && value.horizontal.size < 1) {
                value.horizontal.size = 0;
            }
            setting.set(value);
        }
    }
    updateVersionFrom7To8() {
    }
    updateVersionFrom8To9() {
        const settingNames = ['skipStackFramesPattern', 'workspaceFolderExcludePattern'];
        for (let i = 0; i < settingNames.length; ++i) {
            const setting = this.#settings.createSetting(settingNames[i], '');
            let value = setting.get();
            if (!value) {
                return;
            }
            if (typeof value === 'string') {
                value = [value];
            }
            for (let j = 0; j < value.length; ++j) {
                if (typeof value[j] === 'string') {
                    value[j] = { pattern: value[j] };
                }
            }
            setting.set(value);
        }
    }
    updateVersionFrom9To10() {
        // This one is localStorage specific, which is fine.
        if (!window.localStorage) {
            return;
        }
        for (const key in window.localStorage) {
            if (key.startsWith('revision-history')) {
                window.localStorage.removeItem(key);
            }
        }
    }
    updateVersionFrom10To11() {
        const oldSettingName = 'customDevicePresets';
        const newSettingName = 'customEmulatedDeviceList';
        const oldSetting = this.#settings.createSetting(oldSettingName, undefined);
        const list = oldSetting.get();
        if (!Array.isArray(list)) {
            return;
        }
        const newList = [];
        for (let i = 0; i < list.length; ++i) {
            const value = list[i];
            const device = {};
            device['title'] = value['title'];
            device['type'] = 'unknown';
            device['user-agent'] = value['userAgent'];
            device['capabilities'] = [];
            if (value['touch']) {
                device['capabilities'].push('touch');
            }
            if (value['mobile']) {
                device['capabilities'].push('mobile');
            }
            device['screen'] = {};
            device['screen']['vertical'] = { width: value['width'], height: value['height'] };
            device['screen']['horizontal'] = { width: value['height'], height: value['width'] };
            device['screen']['device-pixel-ratio'] = value['deviceScaleFactor'];
            device['modes'] = [];
            device['show-by-default'] = true;
            device['show'] = 'Default';
            newList.push(device);
        }
        if (newList.length) {
            this.#settings.createSetting(newSettingName, []).set(newList);
        }
        this.#removeSetting(oldSetting);
    }
    updateVersionFrom11To12() {
        this.migrateSettingsFromLocalStorage();
    }
    updateVersionFrom12To13() {
        this.migrateSettingsFromLocalStorage();
        this.#removeSetting(this.#settings.createSetting('timelineOverviewMode', ''));
    }
    updateVersionFrom13To14() {
        const defaultValue = { throughput: -1, latency: 0 };
        this.#settings.createSetting('networkConditions', defaultValue).set(defaultValue);
    }
    updateVersionFrom14To15() {
        const setting = this.#settings.createLocalSetting('workspaceExcludedFolders', {});
        const oldValue = setting.get();
        const newValue = {};
        for (const fileSystemPath in oldValue) {
            newValue[fileSystemPath] = [];
            for (const entry of oldValue[fileSystemPath]) {
                newValue[fileSystemPath].push(entry.path);
            }
        }
        setting.set(newValue);
    }
    updateVersionFrom15To16() {
        const setting = this.#settings.createSetting('InspectorView.panelOrder', {});
        const tabOrders = setting.get();
        for (const key of Object.keys(tabOrders)) {
            tabOrders[key] = (tabOrders[key] + 1) * 10;
        }
        setting.set(tabOrders);
    }
    updateVersionFrom16To17() {
        const setting = this.#settings.createSetting('networkConditionsCustomProfiles', []);
        const oldValue = setting.get();
        const newValue = [];
        if (Array.isArray(oldValue)) {
            for (const preset of oldValue) {
                if (typeof preset.title === 'string' && typeof preset.value === 'object' &&
                    typeof preset.value.throughput === 'number' && typeof preset.value.latency === 'number') {
                    newValue.push({
                        title: preset.title,
                        value: { download: preset.value.throughput, upload: preset.value.throughput, latency: preset.value.latency },
                    });
                }
            }
        }
        setting.set(newValue);
    }
    updateVersionFrom17To18() {
        const setting = this.#settings.createLocalSetting('workspaceExcludedFolders', {});
        const oldValue = setting.get();
        const newValue = {};
        for (const oldKey in oldValue) {
            let newKey = oldKey.replace(/\\/g, '/');
            if (!newKey.startsWith('file://')) {
                if (newKey.startsWith('/')) {
                    newKey = 'file://' + newKey;
                }
                else {
                    newKey = 'file:///' + newKey;
                }
            }
            newValue[newKey] = oldValue[oldKey];
        }
        setting.set(newValue);
    }
    updateVersionFrom18To19() {
        const defaultColumns = { status: true, type: true, initiator: true, size: true, time: true };
        const visibleColumnSettings = this.#settings.createSetting('networkLogColumnsVisibility', defaultColumns);
        const visibleColumns = visibleColumnSettings.get();
        visibleColumns.name = true;
        visibleColumns.timeline = true;
        const configs = {};
        for (const columnId in visibleColumns) {
            if (!visibleColumns.hasOwnProperty(columnId)) {
                continue;
            }
            configs[columnId.toLowerCase()] = { visible: visibleColumns[columnId] };
        }
        const newSetting = this.#settings.createSetting('networkLogColumns', {});
        newSetting.set(configs);
        this.#removeSetting(visibleColumnSettings);
    }
    updateVersionFrom19To20() {
        const oldSetting = this.#settings.createSetting('InspectorView.panelOrder', {});
        const newSetting = this.#settings.createSetting('panel-tabOrder', {});
        newSetting.set(oldSetting.get());
        this.#removeSetting(oldSetting);
    }
    updateVersionFrom20To21() {
        const networkColumns = this.#settings.createSetting('networkLogColumns', {});
        const columns = networkColumns.get();
        delete columns['timeline'];
        delete columns['waterfall'];
        networkColumns.set(columns);
    }
    updateVersionFrom21To22() {
        const breakpointsSetting = this.#settings.createLocalSetting('breakpoints', []);
        const breakpoints = breakpointsSetting.get();
        for (const breakpoint of breakpoints) {
            breakpoint['url'] = breakpoint['sourceFileId'];
            delete breakpoint['sourceFileId'];
        }
        breakpointsSetting.set(breakpoints);
    }
    updateVersionFrom22To23() {
        // This update is no-op.
    }
    updateVersionFrom23To24() {
        const oldSetting = this.#settings.createSetting('searchInContentScripts', false);
        const newSetting = this.#settings.createSetting('searchInAnonymousAndContentScripts', false);
        newSetting.set(oldSetting.get());
        this.#removeSetting(oldSetting);
    }
    updateVersionFrom24To25() {
        const defaultColumns = { status: true, type: true, initiator: true, size: true, time: true };
        const networkLogColumnsSetting = this.#settings.createSetting('networkLogColumns', defaultColumns);
        const columns = networkLogColumnsSetting.get();
        delete columns.product;
        networkLogColumnsSetting.set(columns);
    }
    updateVersionFrom25To26() {
        const oldSetting = this.#settings.createSetting('messageURLFilters', {});
        const urls = Object.keys(oldSetting.get());
        const textFilter = urls.map(url => `-url:${url}`).join(' ');
        if (textFilter) {
            const textFilterSetting = this.#settings.createSetting('console.textFilter', '');
            const suffix = textFilterSetting.get() ? ` ${textFilterSetting.get()}` : '';
            textFilterSetting.set(`${textFilter}${suffix}`);
        }
        this.#removeSetting(oldSetting);
    }
    updateVersionFrom26To27() {
        const settings = this.#settings;
        function renameKeyInObjectSetting(settingName, from, to) {
            const setting = settings.createSetting(settingName, {});
            const value = setting.get();
            if (from in value) {
                value[to] = value[from];
                delete value[from];
                setting.set(value);
            }
        }
        function renameInStringSetting(settingName, from, to) {
            const setting = settings.createSetting(settingName, '');
            const value = setting.get();
            if (value === from) {
                setting.set(to);
            }
        }
        renameKeyInObjectSetting('panel-tabOrder', 'audits2', 'audits');
        renameKeyInObjectSetting('panel-closeableTabs', 'audits2', 'audits');
        renameInStringSetting('panel-selectedTab', 'audits2', 'audits');
    }
    updateVersionFrom27To28() {
        const setting = this.#settings.createSetting('uiTheme', 'systemPreferred');
        if (setting.get() === 'default') {
            setting.set('systemPreferred');
        }
    }
    updateVersionFrom28To29() {
        const settings = this.#settings;
        function renameKeyInObjectSetting(settingName, from, to) {
            const setting = settings.createSetting(settingName, {});
            const value = setting.get();
            if (from in value) {
                value[to] = value[from];
                delete value[from];
                setting.set(value);
            }
        }
        function renameInStringSetting(settingName, from, to) {
            const setting = settings.createSetting(settingName, '');
            const value = setting.get();
            if (value === from) {
                setting.set(to);
            }
        }
        renameKeyInObjectSetting('panel-tabOrder', 'audits', 'lighthouse');
        renameKeyInObjectSetting('panel-closeableTabs', 'audits', 'lighthouse');
        renameInStringSetting('panel-selectedTab', 'audits', 'lighthouse');
    }
    updateVersionFrom29To30() {
        // Create new location agnostic setting
        const closeableTabSetting = this.#settings.createSetting('closeableTabs', {});
        // Read current settings
        const panelCloseableTabSetting = this.#settings.createSetting('panel-closeableTabs', {});
        const drawerCloseableTabSetting = this.#settings.createSetting('drawer-view-closeableTabs', {});
        const openTabsInPanel = panelCloseableTabSetting.get();
        const openTabsInDrawer = panelCloseableTabSetting.get();
        // Set #value of new setting
        const newValue = Object.assign(openTabsInDrawer, openTabsInPanel);
        closeableTabSetting.set(newValue);
        // Remove old settings
        this.#removeSetting(panelCloseableTabSetting);
        this.#removeSetting(drawerCloseableTabSetting);
    }
    updateVersionFrom30To31() {
        // Remove recorder_recordings setting that was used for storing recordings
        // by an old recorder experiment.
        const recordingsSetting = this.#settings.createSetting('recorder_recordings', []);
        this.#removeSetting(recordingsSetting);
    }
    updateVersionFrom31To32() {
        // Introduce the new 'resourceTypeName' property on stored breakpoints. Prior to
        // this change we synchronized the breakpoint only by URL, but since we don't
        // know on which resource type the given breakpoint was set, we just assume
        // 'script' here to keep things simple.
        const breakpointsSetting = this.#settings.createLocalSetting('breakpoints', []);
        const breakpoints = breakpointsSetting.get();
        for (const breakpoint of breakpoints) {
            breakpoint['resourceTypeName'] = 'script';
        }
        breakpointsSetting.set(breakpoints);
    }
    updateVersionFrom32To33() {
        const previouslyViewedFilesSetting = this.#settings.createLocalSetting('previouslyViewedFiles', []);
        let previouslyViewedFiles = previouslyViewedFilesSetting.get();
        // Discard old 'previouslyViewedFiles' items that don't have a 'url' property.
        previouslyViewedFiles = previouslyViewedFiles.filter((previouslyViewedFile) => 'url' in previouslyViewedFile);
        // Introduce the new 'resourceTypeName' property on previously viewed files.
        // Prior to this change we only keyed them based on the URL, but since we
        // don't know which resource type the given file had, we just assume 'script'
        // here to keep things simple.
        for (const previouslyViewedFile of previouslyViewedFiles) {
            previouslyViewedFile['resourceTypeName'] = 'script';
        }
        previouslyViewedFilesSetting.set(previouslyViewedFiles);
    }
    updateVersionFrom33To34() {
        // Introduces the 'isLogpoint' property on stored breakpoints. This information was
        // previously encoded in the 'condition' itself. This migration leaves the condition
        // alone but ensures that 'isLogpoint' is accurate for already stored breakpoints.
        // This enables us to use the 'isLogpoint' property in code.
        // A separate migration will remove the special encoding from the condition itself
        // once all refactorings are done.
        // The prefix/suffix are hardcoded here, since these constants will be removed in
        // the future.
        const logpointPrefix = '/** DEVTOOLS_LOGPOINT */ console.log(';
        const logpointSuffix = ')';
        const breakpointsSetting = this.#settings.createLocalSetting('breakpoints', []);
        const breakpoints = breakpointsSetting.get();
        for (const breakpoint of breakpoints) {
            const isLogpoint = breakpoint.condition.startsWith(logpointPrefix) && breakpoint.condition.endsWith(logpointSuffix);
            breakpoint['isLogpoint'] = isLogpoint;
        }
        breakpointsSetting.set(breakpoints);
    }
    updateVersionFrom34To35() {
        // Uses the 'isLogpoint' property on stored breakpoints to remove the prefix/suffix
        // from logpoints. This way, we store the entered log point condition as the user
        // entered it.
        // The prefix/suffix are hardcoded here, since these constants will be removed in
        // the future.
        const logpointPrefix = '/** DEVTOOLS_LOGPOINT */ console.log(';
        const logpointSuffix = ')';
        const breakpointsSetting = this.#settings.createLocalSetting('breakpoints', []);
        const breakpoints = breakpointsSetting.get();
        for (const breakpoint of breakpoints) {
            const { condition, isLogpoint } = breakpoint;
            if (isLogpoint) {
                breakpoint.condition = condition.slice(logpointPrefix.length, condition.length - logpointSuffix.length);
            }
        }
        breakpointsSetting.set(breakpoints);
    }
    updateVersionFrom35To36() {
        // We have changed the default from 'false' to 'true' and this updates the existing setting just for once.
        this.#settings.createSetting('showThirdPartyIssues', true).set(true);
    }
    updateVersionFrom36To37() {
        const updateStorage = (storage) => {
            for (const key of storage.keys()) {
                const normalizedKey = Settings.normalizeSettingName(key);
                if (normalizedKey !== key) {
                    const value = storage.get(key);
                    this.#removeSetting({ name: key, storage });
                    storage.set(normalizedKey, value);
                }
            }
        };
        updateStorage(this.#settings.globalStorage);
        updateStorage(this.#settings.syncedStorage);
        updateStorage(this.#settings.localStorage);
        for (const key of this.#settings.globalStorage.keys()) {
            if ((key.startsWith('data-grid-') && key.endsWith('-column-weights')) || key.endsWith('-tab-order') ||
                key === 'views-location-override' || key === 'closeable-tabs') {
                const setting = this.#settings.createSetting(key, {});
                setting.set(Platform.StringUtilities.toKebabCaseKeys(setting.get()));
            }
            if (key.endsWith('-selected-tab')) {
                const setting = this.#settings.createSetting(key, '');
                setting.set(Platform.StringUtilities.toKebabCase(setting.get()));
            }
        }
    }
    updateVersionFrom37To38() {
        const getConsoleInsightsEnabledSetting = () => {
            try {
                return this.#settings.moduleSetting('console-insights-enabled');
            }
            catch {
                return;
            }
        };
        const consoleInsightsEnabled = getConsoleInsightsEnabledSetting();
        const onboardingFinished = this.#settings.createLocalSetting('console-insights-onboarding-finished', false);
        if (consoleInsightsEnabled && consoleInsightsEnabled.get() === true && onboardingFinished.get() === false) {
            consoleInsightsEnabled.set(false);
        }
        if (consoleInsightsEnabled && consoleInsightsEnabled.get() === false) {
            onboardingFinished.set(false);
        }
    }
    updateVersionFrom38To39() {
        const PREFERRED_NETWORK_COND = 'preferred-network-condition';
        // crrev.com/c/5582013 renamed "Slow 3G" to "3G" and "Fast 3G" => "Slow 4G".
        // Any users with the old values need to have them moved to avoid breaking DevTools.
        // Note: we load the raw value via the globalStorage here because
        // `createSetting` creates if it is not present, and we do not want that;
        // we only want to update existing, old values.
        const setting = this.#settings.globalStorage.get(PREFERRED_NETWORK_COND);
        if (!setting) {
            return;
        }
        try {
            const networkSetting = JSON.parse(setting);
            if (networkSetting.title === 'Slow 3G') {
                networkSetting.title = '3G';
                networkSetting.i18nTitleKey = '3G';
                this.#settings.globalStorage.set(PREFERRED_NETWORK_COND, JSON.stringify(networkSetting));
            }
            else if (networkSetting.title === 'Fast 3G') {
                networkSetting.title = 'Slow 4G';
                networkSetting.i18nTitleKey = 'Slow 4G';
                this.#settings.globalStorage.set(PREFERRED_NETWORK_COND, JSON.stringify(networkSetting));
            }
        }
        catch {
            // If parsing the setting threw, it's in some invalid state, so remove it.
            this.#settings.globalStorage.remove(PREFERRED_NETWORK_COND);
        }
    }
    /**
     * There are two related migrations here for handling network throttling persistence:
     * 1. Go through all user custom throttling conditions and add a `key` property.
     * 2. If the user has a 'preferred-network-condition' setting, take the value
     *    of that and set the right key for the new 'active-network-condition-key'
     *    setting. Then, remove the now-obsolete 'preferred-network-condition'
     *    setting.
     */
    updateVersionFrom39To40() {
        const hasCustomNetworkConditionsSetting = () => {
            try {
                // this will error if it does not exist
                this.#settings.moduleSetting('custom-network-conditions');
                return true;
            }
            catch {
                return false;
            }
        };
        if (hasCustomNetworkConditionsSetting()) {
            /**
             * We added keys to custom network throttling conditions in M140, so we
             * need to go through any existing profiles the user has and add the key to
             * them.
             * We can't use the SDK.NetworkManager.Condition here as it would be a
             * circular dependency. All that matters is that these conditions are
             * objects, and we need to set the right key on each one. The actual keys &
             * values in the object are not important.
             */
            const conditionsSetting = this.#settings.moduleSetting('custom-network-conditions');
            const customConditions = conditionsSetting.get();
            if (customConditions?.length > 0) {
                customConditions.forEach((condition, i) => {
                    // This could be run multiple times, make sure that we don't override any
                    // existing keys.
                    if (condition.key) {
                        return;
                    }
                    // The format of this key is important: see
                    // SDK.NetworkManager.UserDefinedThrottlingConditionKey
                    condition.key = `USER_CUSTOM_SETTING_${i + 1}`;
                });
                conditionsSetting.set(customConditions);
            }
        }
        // Additionally, we need to make sure we persist the right throttling for
        // users who have a preferred-network-condition set.
        const PREFERRED_NETWORK_COND_SETTING = 'preferred-network-condition';
        // We shipped a change to how we persist network throttling conditions and
        // added a `key` property rather than rely on any user visible string which
        // is more likely to change. This migration step tries to update the
        // setting for users, or removes it if we fail, so they start fresh next
        // time they load DevTools.
        const setting = this.#settings.globalStorage.get(PREFERRED_NETWORK_COND_SETTING);
        if (!setting) {
            return;
        }
        // The keys here are the UI Strings as of July 2025 (shipped in M139).
        // This migration shipped in M140. The values are the values of the
        // `PredefinedThrottlingConditionKey` in SDK.NetworkManager.
        const UI_STRING_TO_NEW_KEY = {
            'Fast 4G': 'SPEED_FAST_4G',
            'Slow 4G': 'SPEED_SLOW_4G',
            '3G': 'SPEED_3G',
            'No throttling': 'NO_THROTTLING',
            Offline: 'OFFLINE'
        };
        try {
            const networkSetting = JSON.parse(setting);
            if (networkSetting.i18nTitleKey && UI_STRING_TO_NEW_KEY.hasOwnProperty(networkSetting.i18nTitleKey)) {
                const key = UI_STRING_TO_NEW_KEY[networkSetting.i18nTitleKey];
                // The second argument is the default value, so it's important that we
                // set this to the default, and then update it to the new key.
                const newSetting = this.#settings.createSetting('active-network-condition-key', 'NO_THROTTLING');
                newSetting.set(key);
            }
        }
        finally {
            // This setting is now not used, so we can remove it.
            this.#settings.globalStorage.remove(PREFERRED_NETWORK_COND_SETTING);
        }
    }
    /*
     * Any new migration should be added before this comment.
     *
     * IMPORTANT: Migrations must be idempotent, since they may be applied
     * multiple times! E.g. when renaming a setting one has to check that the
     * a setting with the new name does not yet exist.
     * ----------------------------------------------------------------------- */
    migrateSettingsFromLocalStorage() {
        // This step migrates all the settings except for the ones below into the browser profile.
        const localSettings = new Set([
            'advancedSearchConfig',
            'breakpoints',
            'consoleHistory',
            'domBreakpoints',
            'eventListenerBreakpoints',
            'fileSystemMapping',
            'lastSelectedSourcesSidebarPaneTab',
            'previouslyViewedFiles',
            'savedURLs',
            'watchExpressions',
            'workspaceExcludedFolders',
            'xhrBreakpoints',
        ]);
        if (!window.localStorage) {
            return;
        }
        for (const key in window.localStorage) {
            if (localSettings.has(key)) {
                continue;
            }
            const value = window.localStorage[key];
            window.localStorage.removeItem(key);
            this.#settings.globalStorage.set(key, value);
        }
    }
    clearBreakpointsWhenTooMany(breakpointsSetting, maxBreakpointsCount) {
        // If there are too many breakpoints in a storage, it is likely due to a recent bug that caused
        // periodical breakpoints duplication leading to inspector slowness.
        if (breakpointsSetting.get().length > maxBreakpointsCount) {
            breakpointsSetting.set([]);
        }
    }
}
export function moduleSetting(settingName) {
    return Settings.instance().moduleSetting(settingName);
}
export function settingForTest(settingName) {
    return Settings.instance().settingForTest(settingName);
}
export { getLocalizedSettingsCategory, maybeRemoveSettingExtension, registerSettingExtension, registerSettingsForTest, resetSettings, };
//# sourceMappingURL=Settings.js.map