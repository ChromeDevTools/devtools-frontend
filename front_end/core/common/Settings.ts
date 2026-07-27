// Copyright 2009 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';

import type {Console} from './Console.js';
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

/**
 * Describes and configures a Setting.
 *
 * Use `Settings#resolve` to get the concrete `Setting` instance for a descriptor.
 */
export interface SettingDescriptor<ValueT> {
  /** The unique identifier of a setting */
  readonly name: string;

  /**
   * Determines how the possible values of the setting are expressed.
   *
   * - If the setting can only be enabled and disabled use BOOLEAN
   * - If the setting has a list of possible values use ENUM
   * - If each setting value is a set of objects use ARRAY
   * - If the setting value is a regular expression use REGEX
   */
  readonly type: SettingType;

  /**
   * The default value for this setting.
   *
   * Can be computed based on the `hostConfig` (but NOTHING ELSE).
   */
  readonly defaultValue: ValueT|((hostConfig: Root.Runtime.HostConfig) => ValueT);

  /**
   * Determines if the setting value is stored in the global, local or session storage.
   */
  readonly storageType?: SettingStorageType;
}

/**
 * Describes and configures a Setting that might be unavailable or disabled depending on the HostConfig.
 *
 * See {@link SettingAvailability} for details.
 *
 * Use `Settings#maybeResolve` to get the concrete `Setting` instance (or a reason why it's not available).
 */
export interface ConditionalSettingDescriptor<ValueT, ReasonT> extends SettingDescriptor<ValueT> {
  /** The function used as `isAvailable` must only read the host config, NOTHING ELSE. */
  isAvailable: (hostConfig: Root.Runtime.HostConfig) => SettingAvailabilityStatus<ReasonT>;
}

export type SettingAvailabilityStatus<ReasonT> = {
  status: SettingAvailability.AVAILABLE,
}|{
  status: SettingAvailability.UNAVAILABLE | SettingAvailability.DISABLED,
  reason: ReasonT,
};

export const enum SettingAvailability {
  /**
   * Setting is available and can be changed by the user or programmatically.
   */
  AVAILABLE = 1,

  /**
   * Setting is not available at all. Any `maybeResolve` or `resolve` call will fail.
   * The setting should be hidden from the user.
   */
  UNAVAILABLE = 2,

  /**
   * Setting is available, but its value can't be read or written.
   */
  DISABLED = 3,
}

export interface SettingsCreationOptions {
  syncedStorage: SettingsStorage;
  globalStorage: SettingsStorage;
  localStorage: SettingsStorage;
  settingRegistrations: SettingRegistration[];
  logSettingAccess?: (name: string, value: number|string|boolean) => Promise<void>;
  runSettingsMigration?: boolean;
  console: Console;
}

type NoFunction<T> = T extends(...args: never[]) => unknown ? never : T;

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
  readonly #console: Console;

  constructor({
    syncedStorage,
    globalStorage,
    localStorage,
    settingRegistrations,
    logSettingAccess,
    runSettingsMigration,
    console,
  }: SettingsCreationOptions) {
    this.#console = console;
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
    console: Console|null,
    logSettingAccess?: (name: string, value: number|string|boolean) => Promise<void>,
    runSettingsMigration?: boolean,
  } = {
    forceNew: null,
    syncedStorage: null,
    globalStorage: null,
    localStorage: null,
    settingRegistrations: null,
    console: null,
  }): Settings {
    const {
      forceNew,
      syncedStorage,
      globalStorage,
      localStorage,
      settingRegistrations,
      logSettingAccess,
      runSettingsMigration,
      console,
    } = opts;
    if (!Root.DevToolsContext.globalInstance().has(Settings) || forceNew) {
      if (!syncedStorage || !globalStorage || !localStorage || !settingRegistrations || !console) {
        throw new Error(`Unable to create settings: global and local storage must be provided: ${new Error().stack}`);
      }

      Root.DevToolsContext.globalInstance().set(Settings, new Settings({
                                                  syncedStorage,
                                                  globalStorage,
                                                  localStorage,
                                                  settingRegistrations,
                                                  logSettingAccess,
                                                  runSettingsMigration,
                                                  console,
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
      setting = new Setting(key, defaultValue, this.#eventSupport, storage, this.#console, this.#logSettingAccess);
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
      this.#registry.set(key,
                         new RegExpSetting(key, defaultValue, this.#eventSupport, this.storageFromType(storageType),
                                           this.#console, regexFlags, this.#logSettingAccess));
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

  /**
   * Resolves a setting descriptor to a concrete {@link Setting} instance.
   *
   * If a setting with the same name already exists (either pre-registered or
   * previously resolved), that instance is returned. Otherwise, a new setting
   * is created and registered.
   *
   * @param descriptor The descriptor defining the setting. Must not be conditional.
   * @throws If the descriptor is conditional (contains `isAvailable`). Use `maybeResolve` instead.
   */
  resolve<T>(descriptor: SettingDescriptor<NoFunction<T>>&{isAvailable?: never}): Setting<T> {
    if ('isAvailable' in descriptor) {
      // TS can only do so much if developers downcast explicitly.
      throw new Error('Use Settings#maybeResolve for conditional descriptors.');
    }

    return this.#resolve(descriptor);
  }

  #resolve<T>(descriptor: SettingDescriptor<T>): Setting<T> {
    let setting = this.moduleSettings.get(descriptor.name);
    if (setting) {
      return setting as Setting<T>;
    }

    const {name, type, defaultValue, storageType} = descriptor;
    const isRegex = type === SettingType.REGEX;

    const isGetter =
        (value: T|((config: Root.Runtime.HostConfig) => T)): value is((config: Root.Runtime.HostConfig) => T) =>
            typeof value === 'function';

    const evaluatedDefaultValue = isGetter(defaultValue) ? defaultValue(Root.Runtime.hostConfig) : defaultValue;
    setting = isRegex && typeof evaluatedDefaultValue === 'string' ?
        this.createRegExpSetting(name, evaluatedDefaultValue, undefined, storageType) :
        this.createSetting(name, evaluatedDefaultValue, storageType);

    setting.setSettingType(type);

    this.registerModuleSetting(setting);
    return setting as Setting<T>;
  }

  /**
   * Resolves a conditional setting descriptor to a concrete {@link Setting} instance if it is available.
   *
   * This method checks the availability of the setting using the descriptor's `isAvailable` function
   * and the current `hostConfig`. If available, it resolves and returns the setting (caching it if
   * necessary). If not available (either unavailable or disabled), it returns the availability status
   * and the reason.
   *
   * @param descriptor The conditional descriptor defining the setting.
   * @returns An object with either the resolved `setting` or the availability `status` and `reason`.
   */
  maybeResolve<T, R>(descriptor: ConditionalSettingDescriptor<NoFunction<T>, R>): {setting: Setting<T>}|{
    status: SettingAvailability.UNAVAILABLE|SettingAvailability.DISABLED, reason: R,
  }
  {
    const available = descriptor.isAvailable(Root.Runtime.hostConfig);
    if (available.status === SettingAvailability.AVAILABLE) {
      return {setting: this.#resolve(descriptor)};
    }

    return available;
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

  dumpSizes(commonConsole: Console): void {
    commonConsole.log('Ten largest settings: ');
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
      commonConsole.log('Setting: \'' + keys[i] + '\', size: ' + sizes[keys[i]]);
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
  #registration: SettingRegistration|null = null;
  #type: SettingType|null = null;
  #requiresUserAction?: boolean;
  #value?: V;
  // TODO(crbug.com/1172300) Type cannot be inferred without changes to consumers. See above.
  #serializer: Serializer<unknown, V> = JSON;
  #hadUserAction?: boolean;
  #disabled?: boolean;
  #deprecation: Deprecation|null = null;
  #loggedInitialAccess = false;
  #logSettingAccess?: (name: string, value: number|string|boolean) => Promise<void>;
  readonly #console: Console;

  constructor(readonly name: string, readonly defaultValue: V,
              private readonly eventSupport: ObjectWrapper<GenericEvents>, readonly storage: SettingsStorage,
              console: Console, logSettingAccess?: (name: string, value: number|string|boolean) => Promise<void>) {
    storage.register(this.name);
    this.#console = console;
    this.#logSettingAccess = logSettingAccess;
  }

  setSerializer(serializer: Serializer<unknown, V>): void {
    this.#serializer = serializer;
  }

  descriptor(): SettingDescriptor<V> {
    return {
      name: this.name,
      type: this.type() ?? SettingType.BOOLEAN,
      defaultValue: this.defaultValue,
      storageType: this.#registration?.storageType,
    };
  }

  addChangeListener(listener: (arg0: EventTargetEvent<V>) => void, thisObject?: Object): EventDescriptor {
    return this.eventSupport.addEventListener(this.name, listener, thisObject);
  }

  removeChangeListener(listener: (arg0: EventTargetEvent<V>) => void, thisObject?: Object): void {
    this.eventSupport.removeEventListener(this.name, listener, thisObject);
  }

  title(): Platform.UIString.LocalizedString {
    if (this.#registration?.title) {
      return this.#registration.title();
    }
    return '' as Platform.UIString.LocalizedString;
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
      this.#console.error('Cannot stringify setting with name: ' + this.name + ', error: ' + e.message);
    }
    this.eventSupport.dispatchEventToListeners(this.name, value);
  }

  setSettingType(type: SettingType): void {
    this.#type = type;
  }

  setRegistration(registration: SettingRegistration): void {
    this.#registration = registration;
    if (registration.settingType) {
      this.#type = registration.settingType;
    }
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
    return this.#type ?? this.#registration?.settingType ?? null;
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
    this.#console.error(errorMessage);
    this.storage.dumpSizes(this.#console);
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class RegExpSetting extends Setting<any> {
  #regexFlags?: string;
  #regex?: RegExp|null;

  constructor(name: string, defaultValue: string, eventSupport: ObjectWrapper<GenericEvents>, storage: SettingsStorage,
              console: Console, regexFlags?: string,
              logSettingAccess?: (name: string, value: number|string|boolean) => Promise<void>) {
    super(name, defaultValue ? [{pattern: defaultValue}] : [], eventSupport, storage, console, logSettingAccess);
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
