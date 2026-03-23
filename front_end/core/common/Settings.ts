// Copyright 2009 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';

import {Console} from './Console.js';
import type {EventDescriptor, EventTargetEvent, GenericEvents} from './EventTarget.js';
import {ObjectWrapper} from './Object.js';
import {
  getLocalizedSettingsCategory,
  type LearnMore,
  maybeRemoveSettingExtension,
  type RegExpSettingItem,
  registerSettingExtension,
  registerSettingsForTest,
  resetSettings,
  SettingCategory,
  type SettingExtensionOption,
  type SettingRegistration,
  SettingType,
} from './SettingRegistration.js';
import {VersionController} from './VersionController.js';

export interface SettingsCreationOptions {
  syncedStorage: SettingsStorage;
  globalStorage: SettingsStorage;
  localStorage: SettingsStorage;
  settingRegistrations: SettingRegistration[];
  logSettingAccess?: (name: string, value: number|string|boolean) => Promise<void>;
  runSettingsMigration?: boolean;
}

export class Settings {
  readonly syncedStorage: SettingsStorage;
  readonly globalStorage: SettingsStorage;
  readonly localStorage: SettingsStorage;

  readonly #settingRegistrations: SettingRegistration[];
  readonly #sessionStorage = new SettingsStorage({});
  settingNameSet = new Set<string>();
  orderValuesBySettingCategory = new Map<SettingCategory, Set<number>>();
  #eventSupport = new ObjectWrapper<GenericEvents>();
  #registry = new Map<string, Setting<unknown>>();
  readonly moduleSettings = new Map<string, Setting<unknown>>();
  #logSettingAccess?: (name: string, value: number|string|boolean) => Promise<void>;

  constructor(
      {syncedStorage, globalStorage, localStorage, settingRegistrations, logSettingAccess, runSettingsMigration}:
          SettingsCreationOptions) {
    this.syncedStorage = syncedStorage;
    this.globalStorage = globalStorage;
    this.localStorage = localStorage;
    this.#settingRegistrations = settingRegistrations;
    this.#logSettingAccess = logSettingAccess;

    for (const registration of this.#settingRegistrations) {
      const {settingName, defaultValue, storageType} = registration;
      const isRegex = registration.settingType === SettingType.REGEX;

      const evaluatedDefaultValue =
          typeof defaultValue === 'function' ? defaultValue(Root.Runtime.hostConfig) : defaultValue;
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

  getRegisteredSettings(): SettingRegistration[] {
    return this.#settingRegistrations;
  }

  static hasInstance(): boolean {
    return Root.DevToolsContext.globalInstance().has(Settings);
  }

  static instance(opts: {
    forceNew: boolean|null,
    syncedStorage: SettingsStorage|null,
    globalStorage: SettingsStorage|null,
    localStorage: SettingsStorage|null,
    settingRegistrations: SettingRegistration[]|null,
    logSettingAccess?: (name: string, value: number|string|boolean) => Promise<void>,
    runSettingsMigration?: boolean,
  } = {forceNew: null, syncedStorage: null, globalStorage: null, localStorage: null, settingRegistrations: null}):
      Settings {
    const {
      forceNew,
      syncedStorage,
      globalStorage,
      localStorage,
      settingRegistrations,
      logSettingAccess,
      runSettingsMigration
    } = opts;
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

  static removeInstance(): void {
    Root.DevToolsContext.globalInstance().delete(Settings);
  }

  private registerModuleSetting(setting: Setting<unknown>): void {
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

  static normalizeSettingName(name: string): string {
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
  moduleSetting<T = any>(settingName: string): Setting<T> {
    const setting = this.moduleSettings.get(settingName) as Setting<T>;
    if (!setting) {
      throw new Error('No setting registered: ' + settingName);
    }
    return setting;
  }

  settingForTest(settingName: string): Setting<unknown> {
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
  createSetting<T>(key: string, defaultValue: T, storageType?: SettingStorageType): Setting<T> {
    const storage = this.storageFromType(storageType);
    let setting = this.#registry.get(key) as Setting<T>;
    if (!setting) {
      setting = new Setting(key, defaultValue, this.#eventSupport, storage, this.#logSettingAccess);
      this.#registry.set(key, setting);
    }
    return setting;
  }

  createLocalSetting<T>(key: string, defaultValue: T): Setting<T> {
    return this.createSetting(key, defaultValue, SettingStorageType.LOCAL);
  }

  createRegExpSetting(key: string, defaultValue: string, regexFlags?: string, storageType?: SettingStorageType):
      RegExpSetting {
    if (!this.#registry.get(key)) {
      this.#registry.set(
          key,
          new RegExpSetting(
              key, defaultValue, this.#eventSupport, this.storageFromType(storageType), regexFlags,
              this.#logSettingAccess));
    }
    return this.#registry.get(key) as RegExpSetting;
  }

  clearAll(): void {
    this.globalStorage.removeAll();
    this.syncedStorage.removeAll();
    this.localStorage.removeAll();
    new VersionController(this).resetToCurrent();
  }

  private storageFromType(storageType?: SettingStorageType): SettingsStorage {
    switch (storageType) {
      case SettingStorageType.LOCAL:
        return this.localStorage;
      case SettingStorageType.SESSION:
        return this.#sessionStorage;
      case SettingStorageType.GLOBAL:
        return this.globalStorage;
      case SettingStorageType.SYNCED:
        return this.syncedStorage;
    }
    return this.globalStorage;
  }

  getRegistry(): Map<string, Setting<unknown>> {
    return this.#registry;
  }
}

export interface SettingsBackingStore {
  register(setting: string): void;
  get(setting: string): Promise<string>;
  set(setting: string, value: string): void;
  remove(setting: string): void;
  clear(): void;
}

export class InMemoryStorage implements SettingsBackingStore {
  #store = new Map();

  register(_setting: string): void {
  }
  set(key: string, value: string): void {
    this.#store.set(key, value);
  }
  get(key: string): Promise<string> {
    return this.#store.get(key);
  }
  remove(key: string): void {
    this.#store.delete(key);
  }
  clear(): void {
    this.#store.clear();
  }
}

export class SettingsStorage {
  constructor(
      private object: Record<string, string>,
      private readonly backingStore: SettingsBackingStore = new InMemoryStorage(),
      private readonly storagePrefix = '') {
  }

  register(name: string): void {
    name = this.storagePrefix + name;
    this.backingStore.register(name);
  }

  set(name: string, value: string): void {
    name = this.storagePrefix + name;
    this.object[name] = value;
    this.backingStore.set(name, value);
  }

  has(name: string): boolean {
    name = this.storagePrefix + name;
    return name in this.object;
  }

  get(name: string): string {
    name = this.storagePrefix + name;
    return this.object[name];
  }

  async forceGet(originalName: string): Promise<string> {
    const name = this.storagePrefix + originalName;
    const value = await this.backingStore.get(name);
    if (value && value !== this.object[name]) {
      this.set(originalName, value);
    } else if (!value) {
      this.remove(originalName);
    }
    return value;
  }

  remove(name: string): void {
    name = this.storagePrefix + name;
    delete this.object[name];
    this.backingStore.remove(name);
  }

  removeAll(): void {
    this.object = {};
    this.backingStore.clear();
  }

  keys(): string[] {
    return Object.keys(this.object);
  }

  dumpSizes(): void {
    Console.instance().log('Ten largest settings: ');
    // @ts-expect-error __proto__ optimization
    const sizes: Record<string, number> = {__proto__: null};
    for (const key in this.object) {
      sizes[key] = this.object[key].length;
    }
    const keys = Object.keys(sizes);

    function comparator(key1: string, key2: string): number {
      return sizes[key2] - sizes[key1];
    }

    keys.sort(comparator);

    for (let i = 0; i < 10 && i < keys.length; ++i) {
      Console.instance().log('Setting: \'' + keys[i] + '\', size: ' + sizes[keys[i]]);
    }
  }
}

export class Deprecation {
  readonly disabled: boolean;
  readonly warning: Platform.UIString.LocalizedString;
  readonly experiment?: Root.Runtime.Experiment|Root.Runtime.HostExperiment;

  constructor({deprecationNotice}: SettingRegistration) {
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

export class Setting<V> {
  #titleFunction?: () => Platform.UIString.LocalizedString;
  #title!: Platform.UIString.LocalizedString;
  #registration: SettingRegistration|null = null;
  #requiresUserAction?: boolean;
  #value?: V;
  // TODO(crbug.com/1172300) Type cannot be inferred without changes to consumers. See above.
  #serializer: Serializer<unknown, V> = JSON;
  #hadUserAction?: boolean;
  #disabled?: boolean;
  #deprecation: Deprecation|null = null;
  #loggedInitialAccess = false;
  #logSettingAccess?: (name: string, value: number|string|boolean) => Promise<void>;

  constructor(
      readonly name: string, readonly defaultValue: V, private readonly eventSupport: ObjectWrapper<GenericEvents>,
      readonly storage: SettingsStorage,
      logSettingAccess?: (name: string, value: number|string|boolean) => Promise<void>) {
    storage.register(this.name);
    this.#logSettingAccess = logSettingAccess;
  }

  setSerializer(serializer: Serializer<unknown, V>): void {
    this.#serializer = serializer;
  }

  addChangeListener(listener: (arg0: EventTargetEvent<V>) => void, thisObject?: Object): EventDescriptor {
    return this.eventSupport.addEventListener(this.name, listener, thisObject);
  }

  removeChangeListener(listener: (arg0: EventTargetEvent<V>) => void, thisObject?: Object): void {
    this.eventSupport.removeEventListener(this.name, listener, thisObject);
  }

  title(): Platform.UIString.LocalizedString {
    if (this.#title) {
      return this.#title;
    }
    if (this.#titleFunction) {
      return this.#titleFunction();
    }
    return '' as Platform.UIString.LocalizedString;
  }

  setTitleFunction(titleFunction?: (() => Platform.UIString.LocalizedString)): void {
    if (titleFunction) {
      this.#titleFunction = titleFunction;
    }
  }

  setTitle(title: Platform.UIString.LocalizedString): void {
    this.#title = title;
  }

  setRequiresUserAction(requiresUserAction: boolean): void {
    this.#requiresUserAction = requiresUserAction;
  }

  disabled(): boolean {
    if (this.#registration?.disabledCondition) {
      const {disabled} = this.#registration.disabledCondition(Root.Runtime.hostConfig);
      // If registration does not disable it, pass through to #disabled
      // attribute check.
      if (disabled) {
        return true;
      }
    }
    return this.#disabled || false;
  }

  disabledReasons(): Platform.UIString.LocalizedString[] {
    if (this.#registration?.disabledCondition) {
      const result = this.#registration.disabledCondition(Root.Runtime.hostConfig);
      if (result.disabled) {
        return result.reasons;
      }
    }
    return [];
  }

  setDisabled(disabled: boolean): void {
    this.#disabled = disabled;
    this.eventSupport.dispatchEventToListeners(this.name);
  }

  #maybeLogAccess(value: V): void {
    try {
      const valueToLog = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' ?
          value :
          this.#serializer?.stringify(value);
      if (valueToLog !== undefined && this.#logSettingAccess) {
        void this.#logSettingAccess(this.name, valueToLog);
      }
    } catch {
    }
  }

  #maybeLogInitialAccess(value: V): void {
    if (!this.#loggedInitialAccess) {
      this.#maybeLogAccess(value);
      this.#loggedInitialAccess = true;
    }
  }

  get(): V {
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
      } catch {
        this.storage.remove(this.name);
      }
    }
    this.#maybeLogInitialAccess(this.#value);
    return this.#value;
  }

  // Prefer this getter for settings which are "disableable". The plain getter returns `this.#value`,
  // even if the setting is disabled, which means the callsite has to explicitly call the `disabled()`
  // getter and add its own logic for the disabled state.
  getIfNotDisabled(): V|undefined {
    if (this.disabled()) {
      return;
    }
    return this.get();
  }

  async forceGet(): Promise<V> {
    const name = this.name;
    const oldValue = this.storage.get(name);
    const value = await this.storage.forceGet(name);
    this.#value = this.defaultValue;
    if (value) {
      try {
        this.#value = this.#serializer.parse(value);
      } catch {
        this.storage.remove(this.name);
      }
    }

    if (oldValue !== value) {
      this.eventSupport.dispatchEventToListeners(this.name, this.#value);
    }

    this.#maybeLogInitialAccess(this.#value);
    return this.#value;
  }

  set(value: V): void {
    this.#maybeLogAccess(value);
    this.#hadUserAction = true;
    this.#value = value;
    try {
      const settingString = this.#serializer.stringify(value);
      try {
        this.storage.set(this.name, settingString);
      } catch (e) {
        this.printSettingsSavingError(e.message, settingString);
      }
    } catch (e) {
      Console.instance().error('Cannot stringify setting with name: ' + this.name + ', error: ' + e.message);
    }
    this.eventSupport.dispatchEventToListeners(this.name, value);
  }

  setRegistration(registration: SettingRegistration): void {
    this.#registration = registration;
    const {deprecationNotice} = registration;
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

  type(): SettingType|null {
    if (this.#registration) {
      return this.#registration.settingType;
    }
    return null;
  }

  options(): SimpleSettingOption[] {
    if (this.#registration && this.#registration.options) {
      return this.#registration.options.map(opt => {
        const {value, title, text, raw} = opt;
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

  reloadRequired(): boolean|null {
    if (this.#registration) {
      return this.#registration.reloadRequired || null;
    }
    return null;
  }

  category(): SettingCategory|null {
    if (this.#registration) {
      return this.#registration.category || null;
    }
    return null;
  }

  tags(): string|null {
    if (this.#registration && this.#registration.tags) {
      // Get localized keys and separate by null character to prevent fuzzy matching from matching across them.
      return this.#registration.tags.map(tag => tag()).join('\0');
    }
    return null;
  }

  order(): number|null {
    if (this.#registration) {
      return this.#registration.order || null;
    }
    return null;
  }

  /**
   * See {@link LearnMore} for more info
   */
  learnMore(): LearnMore|null {
    return this.#registration?.learnMore ?? null;
  }

  get deprecation(): Deprecation|null {
    if (!this.#registration || !this.#registration.deprecationNotice) {
      return null;
    }
    if (!this.#deprecation) {
      this.#deprecation = new Deprecation(this.#registration);
    }
    return this.#deprecation;
  }

  private printSettingsSavingError(message: string, value: string): void {
    const errorMessage =
        'Error saving setting with name: ' + this.name + ', value length: ' + value.length + '. Error: ' + message;
    console.error(errorMessage);
    Console.instance().error(errorMessage);
    this.storage.dumpSizes();
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class RegExpSetting extends Setting<any> {
  #regexFlags?: string;
  #regex?: RegExp|null;

  constructor(
      name: string, defaultValue: string, eventSupport: ObjectWrapper<GenericEvents>, storage: SettingsStorage,
      regexFlags?: string, logSettingAccess?: (name: string, value: number|string|boolean) => Promise<void>) {
    super(name, defaultValue ? [{pattern: defaultValue}] : [], eventSupport, storage, logSettingAccess);
    this.#regexFlags = regexFlags;
  }

  override get(): string {
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

  getAsArray(): RegExpSettingItem[] {
    return super.get();
  }

  override set(value: string): void {
    this.setAsArray([{pattern: value, disabled: false}]);
  }

  setAsArray(value: RegExpSettingItem[]): void {
    this.#regex = undefined;
    super.set(value);
  }

  asRegExp(): RegExp|null {
    if (typeof this.#regex !== 'undefined') {
      return this.#regex;
    }
    this.#regex = null;
    try {
      const pattern = this.get();
      if (pattern) {
        this.#regex = new RegExp(pattern, this.#regexFlags || '');
      }
    } catch {
    }
    return this.#regex;
  }
}

export const enum SettingStorageType {
  /** Persists with the active Chrome profile but also syncs the settings across devices via Chrome Sync. */
  SYNCED = 'Synced',
  /**
   * Persists with the active Chrome profile, but not synchronized to other devices.
   * The default SettingStorageType of createSetting().
   */
  GLOBAL = 'Global',
  /** Uses Window.localStorage. Not recommended, legacy. */
  LOCAL = 'Local',
  /**
   * Session storage dies when DevTools window closes. Useful for atypical conditions that should be reverted when the
   * user is done with their task. (eg Emulation modes, Debug overlays). These are also not carried into/out of incognito
   */
  SESSION = 'Session',
}

export function moduleSetting(settingName: string): Setting<unknown> {
  return Settings.instance().moduleSetting(settingName);
}

export function settingForTest(settingName: string): Setting<unknown> {
  return Settings.instance().settingForTest(settingName);
}

export {
  getLocalizedSettingsCategory,
  maybeRemoveSettingExtension,
  RegExpSettingItem,
  registerSettingExtension,
  registerSettingsForTest,
  resetSettings,
  SettingCategory,
  SettingExtensionOption,
  SettingRegistration,
  SettingType,
};

export interface Serializer<I, O> {
  stringify: (value: I) => string;
  parse: (value: string) => O;
}

export interface SimpleSettingOption {
  value: string|boolean;
  title: string;
  text?: string;
  raw?: boolean;
}
