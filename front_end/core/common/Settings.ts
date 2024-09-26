/*
 * Copyright (C) 2009 Google Inc. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are
 * met:
 *
 *     * Redistributions of source code must retain the above copyright
 * notice, this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above
 * copyright notice, this list of conditions and the following disclaimer
 * in the documentation and/or other materials provided with the
 * distribution.
 *     * Neither the name of Google Inc. nor the names of its
 * contributors may be used to endorse or promote products derived from
 * this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT
 * OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
 * SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT
 * LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
 * DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
 * THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
 * OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';

import {Console} from './Console.js';
import {type EventDescriptor, type EventTargetEvent, type GenericEvents} from './EventTarget.js';
import {ObjectWrapper} from './Object.js';
import {
  getLocalizedSettingsCategory,
  getRegisteredSettings as getRegisteredSettingsInternal,
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

let settingsInstance: Settings|undefined;

export class Settings {
  readonly #sessionStorage: SettingsStorage;
  settingNameSet: Set<string>;
  orderValuesBySettingCategory: Map<SettingCategory, Set<number>>;
  #eventSupport: ObjectWrapper<GenericEvents>;
  #registry: Map<string, Setting<unknown>>;
  readonly moduleSettings: Map<string, Setting<unknown>>;
  readonly #config: Root.Runtime.HostConfig;

  private constructor(
      readonly syncedStorage: SettingsStorage, readonly globalStorage: SettingsStorage,
      readonly localStorage: SettingsStorage, config?: Root.Runtime.HostConfig) {
    this.#sessionStorage = new SettingsStorage({});

    this.settingNameSet = new Set();

    this.orderValuesBySettingCategory = new Map();

    this.#eventSupport = new ObjectWrapper<GenericEvents>();
    this.#registry = new Map();
    this.moduleSettings = new Map();

    this.#config = config || {};
    for (const registration of this.getRegisteredSettings()) {
      const {settingName, defaultValue, storageType} = registration;
      const isRegex = registration.settingType === SettingType.REGEX;

      const evaluatedDefaultValue = typeof defaultValue === 'function' ? defaultValue(this.#config) : defaultValue;
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
  }

  getRegisteredSettings(): SettingRegistration[] {
    return getRegisteredSettingsInternal(this.#config);
  }

  static hasInstance(): boolean {
    return typeof settingsInstance !== 'undefined';
  }

  static instance(opts: {
    forceNew: boolean|null,
    syncedStorage: SettingsStorage|null,
    globalStorage: SettingsStorage|null,
    localStorage: SettingsStorage|null,
    config?: Root.Runtime.HostConfig,
  } = {forceNew: null, syncedStorage: null, globalStorage: null, localStorage: null}): Settings {
    const {forceNew, syncedStorage, globalStorage, localStorage, config} = opts;
    if (!settingsInstance || forceNew) {
      if (!syncedStorage || !globalStorage || !localStorage) {
        throw new Error(`Unable to create settings: global and local storage must be provided: ${new Error().stack}`);
      }

      settingsInstance = new Settings(syncedStorage, globalStorage, localStorage, config);
    }

    return settingsInstance;
  }

  static removeInstance(): void {
    settingsInstance = undefined;
  }

  getHostConfig(): Root.Runtime.HostConfig {
    return this.#config;
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
   * sync, prefer {@see createSetting}
   */
  // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
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
   * @param {string} key kebab-case string ID
   * @param {T} defaultValue
   * @param {SettingStorageType=} storageType If not specified, SettingStorageType.GLOBAL is used.
   */
  createSetting<T>(key: string, defaultValue: T, storageType?: SettingStorageType): Setting<T> {
    const storage = this.storageFromType(storageType);
    let setting = (this.#registry.get(key) as Setting<T>);
    if (!setting) {
      setting = new Setting(key, defaultValue, this.#eventSupport, storage);
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
          key, new RegExpSetting(key, defaultValue, this.#eventSupport, this.storageFromType(storageType), regexFlags));
    }
    return this.#registry.get(key) as RegExpSetting;
  }

  clearAll(): void {
    this.globalStorage.removeAll();
    this.syncedStorage.removeAll();
    this.localStorage.removeAll();
    new VersionController().resetToCurrent();
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

export const NOOP_STORAGE: SettingsBackingStore = {
  register: () => {},
  set: () => {},
  get: () => Promise.resolve(''),
  remove: () => {},
  clear: () => {},
};

export class SettingsStorage {
  constructor(
      private object: Record<string, string>, private readonly backingStore: SettingsBackingStore = NOOP_STORAGE,
      private readonly storagePrefix: string = '') {
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

    const sizes: {
      [x: string]: number,
      // @ts-expect-error __proto__ optimization
    } = {__proto__: null};
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

function removeSetting(setting: {name: string, storage: SettingsStorage}): void {
  const name = setting.name;
  const settings = Settings.instance();

  settings.getRegistry().delete(name);
  settings.moduleSettings.delete(name);

  setting.storage.remove(name);
}

export class Deprecation {
  readonly disabled: boolean;
  readonly warning: Platform.UIString.LocalizedString;
  readonly experiment?: Root.Runtime.Experiment;

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
  #titleInternal!: string;
  #registration: SettingRegistration|null = null;
  #requiresUserAction?: boolean;
  #value?: V;
  // TODO(crbug.com/1172300) Type cannot be inferred without changes to consumers. See above.
  #serializer: Serializer<unknown, V> = JSON;
  #hadUserAction?: boolean;
  #disabled?: boolean;
  #deprecation: Deprecation|null = null;

  constructor(
      readonly name: string, readonly defaultValue: V, private readonly eventSupport: ObjectWrapper<GenericEvents>,
      readonly storage: SettingsStorage) {
    storage.register(this.name);
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

  title(): string {
    if (this.#titleInternal) {
      return this.#titleInternal;
    }
    if (this.#titleFunction) {
      return this.#titleFunction();
    }
    return '';
  }

  setTitleFunction(titleFunction: (() => Platform.UIString.LocalizedString)|undefined): void {
    if (titleFunction) {
      this.#titleFunction = titleFunction;
    }
  }

  setTitle(title: string): void {
    this.#titleInternal = title;
  }

  setRequiresUserAction(requiresUserAction: boolean): void {
    this.#requiresUserAction = requiresUserAction;
  }

  disabled(): boolean {
    if (this.#registration?.disabledCondition) {
      const {disabled} = this.#registration.disabledCondition(Settings.instance().getHostConfig());
      // If registration does not disable it, pass through to #disabled
      // attribute check.
      if (disabled) {
        return true;
      }
    }
    return this.#disabled || false;
  }

  disabledReason(): string|undefined {
    if (this.#registration?.disabledCondition) {
      const result = this.#registration.disabledCondition(Settings.instance().getHostConfig());
      if (result.disabled) {
        return result.reason;
      }
    }
    return undefined;
  }

  setDisabled(disabled: boolean): void {
    this.#disabled = disabled;
    this.eventSupport.dispatchEventToListeners(this.name);
  }

  get(): V {
    if (this.#requiresUserAction && !this.#hadUserAction) {
      return this.defaultValue;
    }

    if (typeof this.#value !== 'undefined') {
      return this.#value;
    }

    this.#value = this.defaultValue;
    if (this.storage.has(this.name)) {
      try {
        this.#value = this.#serializer.parse(this.storage.get(this.name));
      } catch (e) {
        this.storage.remove(this.name);
      }
    }
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
      } catch (e) {
        this.storage.remove(this.name);
      }
    }

    if (oldValue !== value) {
      this.eventSupport.dispatchEventToListeners(this.name, this.#value);
    }

    return this.#value;
  }

  set(value: V): void {
    this.#hadUserAction = true;
    this.#value = value;
    try {
      const settingString = this.#serializer.stringify(value);
      try {
        this.storage.set(this.name, settingString);
      } catch (e) {
        this.printSettingsSavingError(e.message, this.name, settingString);
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

  private printSettingsSavingError(message: string, name: string, value: string): void {
    const errorMessage =
        'Error saving setting with name: ' + this.name + ', value length: ' + value.length + '. Error: ' + message;
    console.error(errorMessage);
    Console.instance().error(errorMessage);
    this.storage.dumpSizes();
  }
}

// TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export class RegExpSetting extends Setting<any> {
  #regexFlags: string|undefined;
  #regex?: RegExp|null;

  constructor(
      name: string, defaultValue: string, eventSupport: ObjectWrapper<GenericEvents>, storage: SettingsStorage,
      regexFlags?: string) {
    super(name, defaultValue ? [{pattern: defaultValue}] : [], eventSupport, storage);
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
    } catch (e) {
    }
    return this.#regex;
  }
}

export class VersionController {
  static readonly GLOBAL_VERSION_SETTING_NAME = 'inspectorVersion';
  static readonly SYNCED_VERSION_SETTING_NAME = 'syncedInspectorVersion';
  static readonly LOCAL_VERSION_SETTING_NAME = 'localInspectorVersion';

  static readonly CURRENT_VERSION = 38;

  readonly #globalVersionSetting: Setting<number>;
  readonly #syncedVersionSetting: Setting<number>;
  readonly #localVersionSetting: Setting<number>;

  constructor() {
    // If no version setting is found, we initialize with the current version and don't do anything.
    this.#globalVersionSetting = Settings.instance().createSetting(
        VersionController.GLOBAL_VERSION_SETTING_NAME, VersionController.CURRENT_VERSION, SettingStorageType.GLOBAL);
    this.#syncedVersionSetting = Settings.instance().createSetting(
        VersionController.SYNCED_VERSION_SETTING_NAME, VersionController.CURRENT_VERSION, SettingStorageType.SYNCED);
    this.#localVersionSetting = Settings.instance().createSetting(
        VersionController.LOCAL_VERSION_SETTING_NAME, VersionController.CURRENT_VERSION, SettingStorageType.LOCAL);
  }

  /**
   * Force re-sets all version number settings to the current version without
   * running any migrations.
   */
  resetToCurrent(): void {
    this.#globalVersionSetting.set(VersionController.CURRENT_VERSION);
    this.#syncedVersionSetting.set(VersionController.CURRENT_VERSION);
    this.#localVersionSetting.set(VersionController.CURRENT_VERSION);
  }

  /**
   * Runs the appropriate migrations and updates the version settings accordingly.
   *
   * To determine what migrations to run we take the minimum of all version number settings.
   *
   * IMPORTANT: All migrations must be idempotent since they might be applied multiple times.
   */
  updateVersion(): void {
    const currentVersion = VersionController.CURRENT_VERSION;
    const minimumVersion =
        Math.min(this.#globalVersionSetting.get(), this.#syncedVersionSetting.get(), this.#localVersionSetting.get());
    const methodsToRun = this.methodsToRunToUpdateVersion(minimumVersion, currentVersion);
    console.assert(
        // @ts-ignore
        this[`updateVersionFrom${currentVersion}To${currentVersion + 1}`] === undefined,
        'Unexpected migration method found. Increment CURRENT_VERSION or remove the method.');
    for (const method of methodsToRun) {
      // @ts-ignore Special version method matching
      this[method].call(this);
    }
    this.resetToCurrent();
  }

  private methodsToRunToUpdateVersion(oldVersion: number, currentVersion: number): string[] {
    const result = [];
    for (let i = oldVersion; i < currentVersion; ++i) {
      result.push('updateVersionFrom' + i + 'To' + (i + 1));
    }
    return result;
  }

  private updateVersionFrom0To1(): void {
    this.clearBreakpointsWhenTooMany(Settings.instance().createLocalSetting('breakpoints', []), 500000);
  }

  private updateVersionFrom1To2(): void {
    Settings.instance().createSetting('previouslyViewedFiles', []).set([]);
  }

  private updateVersionFrom2To3(): void {
    Settings.instance().createSetting('fileSystemMapping', {}).set({});
    removeSetting(Settings.instance().createSetting('fileMappingEntries', []));
  }

  private updateVersionFrom3To4(): void {
    const advancedMode = Settings.instance().createSetting('showHeaSnapshotObjectsHiddenProperties', false);
    moduleSetting('showAdvancedHeapSnapshotProperties').set(advancedMode.get());
    removeSetting(advancedMode);
  }

  private updateVersionFrom4To5(): void {
    const settingNames: {
      [x: string]: string,
    } = {
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

      let newValue: {}|null = null;
      const oldSetting = Settings.instance().createSetting(oldName, empty);
      if (oldSetting.get() !== empty) {
        newValue = newValue || {};
        // @ts-expect-error
        newValue.vertical = {};
        // @ts-expect-error
        newValue.vertical.size = oldSetting.get();
        removeSetting(oldSetting);
      }
      const oldSettingH = Settings.instance().createSetting(oldNameH, empty);
      if (oldSettingH.get() !== empty) {
        newValue = newValue || {};
        // @ts-expect-error
        newValue.horizontal = {};
        // @ts-expect-error
        newValue.horizontal.size = oldSettingH.get();
        removeSetting(oldSettingH);
      }
      if (newValue) {
        Settings.instance().createSetting(newName, {}).set(newValue);
      }
    }
  }

  private updateVersionFrom5To6(): void {
    const settingNames: {
      [x: string]: string,
    } = {
      debuggerSidebarHidden: 'sourcesPanelSplitViewState',
      navigatorHidden: 'sourcesPanelNavigatorSplitViewState',
      'WebInspector.Drawer.showOnLoad': 'Inspector.drawerSplitViewState',
    };

    for (const oldName in settingNames) {
      const oldSetting = Settings.instance().createSetting(oldName, null);
      if (oldSetting.get() === null) {
        removeSetting(oldSetting);
        continue;
      }

      const newName = settingNames[oldName];
      const invert = oldName === 'WebInspector.Drawer.showOnLoad';
      const hidden = oldSetting.get() !== invert;
      removeSetting(oldSetting);
      const showMode = hidden ? 'OnlyMain' : 'Both';

      const newSetting = Settings.instance().createSetting(newName, {});
      const newValue = newSetting.get() || {};
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // @ts-expect-error
      newValue.vertical = newValue.vertical || {};
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // @ts-expect-error
      newValue.vertical.showMode = showMode;
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // @ts-expect-error
      newValue.horizontal = newValue.horizontal || {};
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // @ts-expect-error
      newValue.horizontal.showMode = showMode;
      newSetting.set(newValue);
    }
  }

  private updateVersionFrom6To7(): void {
    const settingNames = {
      sourcesPanelNavigatorSplitViewState: 'sourcesPanelNavigatorSplitViewState',
      elementsPanelSplitViewState: 'elementsPanelSplitViewState',
      stylesPaneSplitViewState: 'stylesPaneSplitViewState',
      sourcesPanelDebuggerSidebarSplitViewState: 'sourcesPanelDebuggerSidebarSplitViewState',
    };

    const empty = {};
    for (const name in settingNames) {
      const setting =
          Settings.instance().createSetting<{vertical?: {size?: number}, horizontal?: {size?: number}}>(name, empty);
      const value = setting.get();
      if (value === empty) {
        continue;
      }
      // Zero out saved percentage sizes, and they will be restored to defaults.
      if (value.vertical && value.vertical.size && value.vertical.size < 1) {
        value.vertical.size = 0;
      }
      if (value.horizontal && value.horizontal.size && value.horizontal.size < 1) {
        value.horizontal.size = 0;
      }
      setting.set(value);
    }
  }

  private updateVersionFrom7To8(): void {
  }

  private updateVersionFrom8To9(): void {
    const settingNames = ['skipStackFramesPattern', 'workspaceFolderExcludePattern'];

    for (let i = 0; i < settingNames.length; ++i) {
      const setting = Settings.instance().createSetting<string|unknown[]>(settingNames[i], '');
      let value = setting.get();
      if (!value) {
        return;
      }
      if (typeof value === 'string') {
        value = [value];
      }
      for (let j = 0; j < value.length; ++j) {
        if (typeof value[j] === 'string') {
          value[j] = {pattern: value[j]};
        }
      }
      setting.set(value);
    }
  }

  private updateVersionFrom9To10(): void {
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

  private updateVersionFrom10To11(): void {
    const oldSettingName = 'customDevicePresets';
    const newSettingName = 'customEmulatedDeviceList';
    const oldSetting = Settings.instance().createSetting<unknown>(oldSettingName, undefined);
    const list = oldSetting.get();
    if (!Array.isArray(list)) {
      return;
    }
    const newList = [];
    for (let i = 0; i < list.length; ++i) {
      const value = list[i];
      const device: {
        // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        [x: string]: any,
      } = {};
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
      device['screen']['vertical'] = {width: value['width'], height: value['height']};
      device['screen']['horizontal'] = {width: value['height'], height: value['width']};
      device['screen']['device-pixel-ratio'] = value['deviceScaleFactor'];
      device['modes'] = [];
      device['show-by-default'] = true;
      device['show'] = 'Default';
      newList.push(device);
    }
    if (newList.length) {
      Settings.instance().createSetting<unknown[]>(newSettingName, []).set(newList);
    }
    removeSetting(oldSetting);
  }

  private updateVersionFrom11To12(): void {
    this.migrateSettingsFromLocalStorage();
  }

  private updateVersionFrom12To13(): void {
    this.migrateSettingsFromLocalStorage();
    removeSetting(Settings.instance().createSetting('timelineOverviewMode', ''));
  }

  private updateVersionFrom13To14(): void {
    const defaultValue = {throughput: -1, latency: 0};
    Settings.instance().createSetting('networkConditions', defaultValue).set(defaultValue);
  }

  private updateVersionFrom14To15(): void {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setting = Settings.instance().createLocalSetting<any>('workspaceExcludedFolders', {});
    const oldValue = setting.get();
    const newValue: {
      [x: string]: string[],
    } = {};
    for (const fileSystemPath in oldValue) {
      newValue[fileSystemPath] = [];
      for (const entry of oldValue[fileSystemPath]) {
        newValue[fileSystemPath].push(entry.path);
      }
    }
    setting.set(newValue);
  }

  private updateVersionFrom15To16(): void {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setting = Settings.instance().createSetting<any>('InspectorView.panelOrder', {});
    const tabOrders = setting.get();
    for (const key of Object.keys(tabOrders)) {
      tabOrders[key] = (tabOrders[key] + 1) * 10;
    }
    setting.set(tabOrders);
  }

  private updateVersionFrom16To17(): void {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setting = Settings.instance().createSetting<any>('networkConditionsCustomProfiles', []);
    const oldValue = setting.get();
    const newValue = [];
    if (Array.isArray(oldValue)) {
      for (const preset of oldValue) {
        if (typeof preset.title === 'string' && typeof preset.value === 'object' &&
            typeof preset.value.throughput === 'number' && typeof preset.value.latency === 'number') {
          newValue.push({
            title: preset.title,
            value: {download: preset.value.throughput, upload: preset.value.throughput, latency: preset.value.latency},
          });
        }
      }
    }
    setting.set(newValue);
  }

  private updateVersionFrom17To18(): void {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const setting = Settings.instance().createLocalSetting<any>('workspaceExcludedFolders', {});
    const oldValue = setting.get();
    const newValue: {
      [x: string]: string,
    } = {};
    for (const oldKey in oldValue) {
      let newKey = oldKey.replace(/\\/g, '/');
      if (!newKey.startsWith('file://')) {
        if (newKey.startsWith('/')) {
          newKey = 'file://' + newKey;
        } else {
          newKey = 'file:///' + newKey;
        }
      }
      newValue[newKey] = oldValue[oldKey];
    }
    setting.set(newValue);
  }

  private updateVersionFrom18To19(): void {
    const defaultColumns = {status: true, type: true, initiator: true, size: true, time: true};
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const visibleColumnSettings = Settings.instance().createSetting<any>('networkLogColumnsVisibility', defaultColumns);
    const visibleColumns = visibleColumnSettings.get();
    visibleColumns.name = true;
    visibleColumns.timeline = true;

    const configs: {
      [x: string]: {
        visible: number,
      },
    } = {};
    for (const columnId in visibleColumns) {
      if (!visibleColumns.hasOwnProperty(columnId)) {
        continue;
      }
      configs[columnId.toLowerCase()] = {visible: visibleColumns[columnId]};
    }
    const newSetting = Settings.instance().createSetting('networkLogColumns', {});
    newSetting.set(configs);
    removeSetting(visibleColumnSettings);
  }

  private updateVersionFrom19To20(): void {
    const oldSetting = Settings.instance().createSetting('InspectorView.panelOrder', {});
    const newSetting = Settings.instance().createSetting('panel-tabOrder', {});
    newSetting.set(oldSetting.get());
    removeSetting(oldSetting);
  }

  private updateVersionFrom20To21(): void {
    const networkColumns = Settings.instance().createSetting('networkLogColumns', {});
    const columns = (networkColumns.get() as {
      [x: string]: string,
    });
    delete columns['timeline'];
    delete columns['waterfall'];
    networkColumns.set(columns);
  }

  private updateVersionFrom21To22(): void {
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const breakpointsSetting = Settings.instance().createLocalSetting<any>('breakpoints', []);
    const breakpoints = breakpointsSetting.get();
    for (const breakpoint of breakpoints) {
      breakpoint['url'] = breakpoint['sourceFileId'];
      delete breakpoint['sourceFileId'];
    }
    breakpointsSetting.set(breakpoints);
  }

  private updateVersionFrom22To23(): void {
    // This update is no-op.
  }

  private updateVersionFrom23To24(): void {
    const oldSetting = Settings.instance().createSetting('searchInContentScripts', false);
    const newSetting = Settings.instance().createSetting('searchInAnonymousAndContentScripts', false);
    newSetting.set(oldSetting.get());
    removeSetting(oldSetting);
  }

  private updateVersionFrom24To25(): void {
    const defaultColumns = {status: true, type: true, initiator: true, size: true, time: true};
    // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const networkLogColumnsSetting = Settings.instance().createSetting<any>('networkLogColumns', defaultColumns);
    const columns = networkLogColumnsSetting.get();
    delete columns.product;
    networkLogColumnsSetting.set(columns);
  }

  private updateVersionFrom25To26(): void {
    const oldSetting = Settings.instance().createSetting('messageURLFilters', {});
    const urls = Object.keys(oldSetting.get());
    const textFilter = urls.map(url => `-url:${url}`).join(' ');
    if (textFilter) {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const textFilterSetting = Settings.instance().createSetting<any>('console.textFilter', '');
      const suffix = textFilterSetting.get() ? ` ${textFilterSetting.get()}` : '';
      textFilterSetting.set(`${textFilter}${suffix}`);
    }
    removeSetting(oldSetting);
  }

  private updateVersionFrom26To27(): void {
    function renameKeyInObjectSetting(settingName: string, from: string, to: string): void {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const setting = Settings.instance().createSetting<any>(settingName, {});
      const value = setting.get();
      if (from in value) {
        value[to] = value[from];
        delete value[from];
        setting.set(value);
      }
    }

    function renameInStringSetting(settingName: string, from: string, to: string): void {
      const setting = Settings.instance().createSetting(settingName, '');
      const value = setting.get();
      if (value === from) {
        setting.set(to);
      }
    }

    renameKeyInObjectSetting('panel-tabOrder', 'audits2', 'audits');
    renameKeyInObjectSetting('panel-closeableTabs', 'audits2', 'audits');
    renameInStringSetting('panel-selectedTab', 'audits2', 'audits');
  }

  private updateVersionFrom27To28(): void {
    const setting = Settings.instance().createSetting('uiTheme', 'systemPreferred');
    if (setting.get() === 'default') {
      setting.set('systemPreferred');
    }
  }

  private updateVersionFrom28To29(): void {
    function renameKeyInObjectSetting(settingName: string, from: string, to: string): void {
      // TODO(crbug.com/1172300) Ignored during the jsdoc to ts migration
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const setting = Settings.instance().createSetting<any>(settingName, {});
      const value = setting.get();
      if (from in value) {
        value[to] = value[from];
        delete value[from];
        setting.set(value);
      }
    }

    function renameInStringSetting(settingName: string, from: string, to: string): void {
      const setting = Settings.instance().createSetting(settingName, '');
      const value = setting.get();
      if (value === from) {
        setting.set(to);
      }
    }

    renameKeyInObjectSetting('panel-tabOrder', 'audits', 'lighthouse');
    renameKeyInObjectSetting('panel-closeableTabs', 'audits', 'lighthouse');
    renameInStringSetting('panel-selectedTab', 'audits', 'lighthouse');
  }

  private updateVersionFrom29To30(): void {
    // Create new location agnostic setting
    const closeableTabSetting = Settings.instance().createSetting('closeableTabs', {});

    // Read current settings
    const panelCloseableTabSetting = Settings.instance().createSetting('panel-closeableTabs', {});
    const drawerCloseableTabSetting = Settings.instance().createSetting('drawer-view-closeableTabs', {});
    const openTabsInPanel = panelCloseableTabSetting.get();
    const openTabsInDrawer = panelCloseableTabSetting.get();

    // Set #value of new setting
    const newValue = Object.assign(openTabsInDrawer, openTabsInPanel);
    closeableTabSetting.set(newValue);

    // Remove old settings
    removeSetting(panelCloseableTabSetting);
    removeSetting(drawerCloseableTabSetting);
  }

  private updateVersionFrom30To31(): void {
    // Remove recorder_recordings setting that was used for storing recordings
    // by an old recorder experiment.
    const recordingsSetting = Settings.instance().createSetting('recorder_recordings', []);
    removeSetting(recordingsSetting);
  }

  updateVersionFrom31To32(): void {
    // Introduce the new 'resourceTypeName' property on stored breakpoints. Prior to
    // this change we synchronized the breakpoint only by URL, but since we don't
    // know on which resource type the given breakpoint was set, we just assume
    // 'script' here to keep things simple.

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const breakpointsSetting = Settings.instance().createLocalSetting<any>('breakpoints', []);
    const breakpoints = breakpointsSetting.get();
    for (const breakpoint of breakpoints) {
      breakpoint['resourceTypeName'] = 'script';
    }
    breakpointsSetting.set(breakpoints);
  }

  updateVersionFrom32To33(): void {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const previouslyViewedFilesSetting = Settings.instance().createLocalSetting<any>('previouslyViewedFiles', []);
    let previouslyViewedFiles = previouslyViewedFilesSetting.get();

    // Discard old 'previouslyViewedFiles' items that don't have a 'url' property.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    previouslyViewedFiles = previouslyViewedFiles.filter((previouslyViewedFile: any) => 'url' in previouslyViewedFile);

    // Introduce the new 'resourceTypeName' property on previously viewed files.
    // Prior to this change we only keyed them based on the URL, but since we
    // don't know which resource type the given file had, we just assume 'script'
    // here to keep things simple.
    for (const previouslyViewedFile of previouslyViewedFiles) {
      previouslyViewedFile['resourceTypeName'] = 'script';
    }

    previouslyViewedFilesSetting.set(previouslyViewedFiles);
  }

  updateVersionFrom33To34(): void {
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

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const breakpointsSetting = Settings.instance().createLocalSetting<any>('breakpoints', []);
    const breakpoints = breakpointsSetting.get();
    for (const breakpoint of breakpoints) {
      const isLogpoint =
          breakpoint.condition.startsWith(logpointPrefix) && breakpoint.condition.endsWith(logpointSuffix);
      breakpoint['isLogpoint'] = isLogpoint;
    }
    breakpointsSetting.set(breakpoints);
  }

  updateVersionFrom34To35(): void {
    // Uses the 'isLogpoint' property on stored breakpoints to remove the prefix/suffix
    // from logpoints. This way, we store the entered log point condition as the user
    // entered it.

    // The prefix/suffix are hardcoded here, since these constants will be removed in
    // the future.
    const logpointPrefix = '/** DEVTOOLS_LOGPOINT */ console.log(';
    const logpointSuffix = ')';

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const breakpointsSetting = Settings.instance().createLocalSetting<any>('breakpoints', []);
    const breakpoints = breakpointsSetting.get();
    for (const breakpoint of breakpoints) {
      const {condition, isLogpoint} = breakpoint;
      if (isLogpoint) {
        breakpoint.condition = condition.slice(logpointPrefix.length, condition.length - logpointSuffix.length);
      }
    }
    breakpointsSetting.set(breakpoints);
  }

  updateVersionFrom35To36(): void {
    // We have changed the default from 'false' to 'true' and this updates the existing setting just for once.
    Settings.instance().createSetting('showThirdPartyIssues', true).set(true);
  }

  updateVersionFrom36To37(): void {
    const updateStorage = (storage: SettingsStorage): void => {
      for (const key of storage.keys()) {
        const normalizedKey = Settings.normalizeSettingName(key);
        if (normalizedKey !== key) {
          const value = storage.get(key);
          removeSetting({name: key, storage});
          storage.set(normalizedKey, value);
        }
      }
    };
    updateStorage(Settings.instance().globalStorage);
    updateStorage(Settings.instance().syncedStorage);
    updateStorage(Settings.instance().localStorage);

    for (const key of Settings.instance().globalStorage.keys()) {
      if ((key.startsWith('data-grid-') && key.endsWith('-column-weights')) || key.endsWith('-tab-order') ||
          key === 'views-location-override' || key === 'closeable-tabs') {
        const setting = Settings.instance().createSetting(key, {});
        setting.set(Platform.StringUtilities.toKebabCaseKeys(setting.get()));
      }
      if (key.endsWith('-selected-tab')) {
        const setting = Settings.instance().createSetting(key, '');
        setting.set(Platform.StringUtilities.toKebabCase(setting.get()));
      }
    }
  }

  updateVersionFrom37To38(): void {
    const getConsoleInsightsEnabledSetting = (): Setting<boolean>|undefined => {
      try {
        return moduleSetting('console-insights-enabled') as Setting<boolean>;
      } catch {
        return;
      }
    };

    const consoleInsightsEnabled = getConsoleInsightsEnabledSetting();
    const onboardingFinished = Settings.instance().createLocalSetting('console-insights-onboarding-finished', false);

    if (consoleInsightsEnabled && consoleInsightsEnabled.get() === true && onboardingFinished.get() === false) {
      consoleInsightsEnabled.set(false);
    }
    if (consoleInsightsEnabled && consoleInsightsEnabled.get() === false) {
      onboardingFinished.set(false);
    }
  }

  /*
   * Any new migration should be added before this comment.
   *
   * IMPORTANT: Migrations must be idempotent, since they may be applied
   * multiple times! E.g. when renaming a setting one has to check that the
   * a setting with the new name does not yet exist.
   * ----------------------------------------------------------------------- */

  private migrateSettingsFromLocalStorage(): void {
    // This step migrates all the settings except for the ones below into the browser profile.
    const localSettings = new Set<string>([
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
      Settings.instance().globalStorage.set(key, value);
    }
  }

  private clearBreakpointsWhenTooMany(breakpointsSetting: Setting<unknown[]>, maxBreakpointsCount: number): void {
    // If there are too many breakpoints in a storage, it is likely due to a recent bug that caused
    // periodical breakpoints duplication leading to inspector slowness.
    if (breakpointsSetting.get().length > maxBreakpointsCount) {
      breakpointsSetting.set([]);
    }
  }
}

export const enum SettingStorageType {
  /** Persists with the active Chrome profile but also syncs the settings across devices via Chrome Sync. */
  SYNCED = 'Synced',
  /** Persists with the active Chrome profile, but not synchronized to other devices.
   * The default SettingStorageType of createSetting(). */
  GLOBAL = 'Global',
  /** Uses Window.localStorage. Not recommended, legacy. */
  LOCAL = 'Local',
  /** Session storage dies when DevTools window closes. Useful for atypical conditions that should be reverted when the
   * user is done with their task. (eg Emulation modes, Debug overlays). These are also not carried into/out of incognito */
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
  registerSettingExtension,
  RegExpSettingItem,
  SettingCategory,
  SettingExtensionOption,
  SettingRegistration,
  SettingType,
  registerSettingsForTest,
  resetSettings,
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
