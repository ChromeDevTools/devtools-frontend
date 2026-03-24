// Copyright 2009 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';
import { Console } from './Console.js';
import { ObjectWrapper } from './Object.js';
import { getLocalizedSettingsCategory, maybeRemoveSettingExtension, registerSettingExtension, registerSettingsForTest, resetSettings, } from './SettingRegistration.js';
import { VersionController } from './VersionController.js';
export class Settings {
    syncedStorage;
    globalStorage;
    localStorage;
    #settingRegistrations;
    #sessionStorage = new SettingsStorage({});
    settingNameSet = new Set();
    orderValuesBySettingCategory = new Map();
    #eventSupport = new ObjectWrapper();
    #registry = new Map();
    moduleSettings = new Map();
    #logSettingAccess;
    constructor({ syncedStorage, globalStorage, localStorage, settingRegistrations, logSettingAccess, runSettingsMigration }) {
        this.syncedStorage = syncedStorage;
        this.globalStorage = globalStorage;
        this.localStorage = localStorage;
        this.#settingRegistrations = settingRegistrations;
        this.#logSettingAccess = logSettingAccess;
        for (const registration of this.#settingRegistrations) {
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
        return this.#settingRegistrations;
    }
    static hasInstance() {
        return Root.DevToolsContext.globalInstance().has(Settings);
    }
    static instance(opts = { forceNew: null, syncedStorage: null, globalStorage: null, localStorage: null, settingRegistrations: null }) {
        const { forceNew, syncedStorage, globalStorage, localStorage, settingRegistrations, logSettingAccess, runSettingsMigration } = opts;
        if (!Root.DevToolsContext.globalInstance().has(Settings) || forceNew) {
            if (!syncedStorage || !globalStorage || !localStorage || !settingRegistrations) {
                throw new Error(`Unable to create settings: global and local storage must be provided: ${new Error().stack}`);
            }
            Root.DevToolsContext.globalInstance().set(Settings, new Settings({
                syncedStorage,
                globalStorage,
                localStorage,
                settingRegistrations,
                logSettingAccess,
                runSettingsMigration
            }));
        }
        return Root.DevToolsContext.globalInstance().get(Settings);
    }
    static removeInstance() {
        Root.DevToolsContext.globalInstance().delete(Settings);
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
export class InMemoryStorage {
    #store = new Map();
    register(_setting) {
    }
    set(key, value) {
        this.#store.set(key, value);
    }
    get(key) {
        return this.#store.get(key);
    }
    remove(key) {
        this.#store.delete(key);
    }
    clear() {
        this.#store.clear();
    }
}
export class SettingsStorage {
    object;
    backingStore;
    storagePrefix;
    constructor(object, backingStore = new InMemoryStorage(), storagePrefix = '') {
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
export function moduleSetting(settingName) {
    return Settings.instance().moduleSetting(settingName);
}
export function settingForTest(settingName) {
    return Settings.instance().settingForTest(settingName);
}
export { getLocalizedSettingsCategory, maybeRemoveSettingExtension, registerSettingExtension, registerSettingsForTest, resetSettings, };
//# sourceMappingURL=Settings.js.map