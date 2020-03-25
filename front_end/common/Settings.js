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

import * as Root from '../root/root.js';

import {Color, Format} from './Color.js';  // eslint-disable-line no-unused-vars
import {Console} from './Console.js';
import {EventDescriptor, EventTargetEvent} from './EventTarget.js';  // eslint-disable-line no-unused-vars
import {ObjectWrapper} from './Object.js';

/**
 * @type {!Settings}
 */
let settingsInstance;

/**
 * @unrestricted
 */
export class Settings {
  /**
   * @private
   * @param {!SettingsStorage} globalStorage
   * @param {!SettingsStorage} localStorage
   */
  constructor(globalStorage, localStorage) {
    this._globalStorage = globalStorage;
    this._localStorage = localStorage;
    this._sessionStorage = new SettingsStorage({});

    this._eventSupport = new ObjectWrapper();
    /** @type {!Map<string, !Setting<*>>} */
    this._registry = new Map();
    /** @type {!Map<string, !Setting<*>>} */
    this._moduleSettings = new Map();
    // @ts-ignore Needs runtime exported
    self.runtime.extensions('setting').forEach(this._registerModuleSetting.bind(this));
  }

  static hasInstance() {
    return typeof settingsInstance !== 'undefined';
  }

  /**
   * @param {{forceNew: ?boolean, globalStorage: ?SettingsStorage, localStorage: ?SettingsStorage}} opts
   */
  static instance(opts = {forceNew: null, globalStorage: null, localStorage: null}) {
    const {forceNew, globalStorage, localStorage} = opts;
    if (!settingsInstance || forceNew) {
      if (!globalStorage || !localStorage) {
        throw new Error(`Unable to create settings: global and local storage must be provided: ${new Error().stack}`);
      }

      settingsInstance = new Settings(globalStorage, localStorage);
    }

    return settingsInstance;
  }

  /**
   * @param {!Root.Runtime.Extension} extension
   */
  _registerModuleSetting(extension) {
    const descriptor = extension.descriptor();
    const settingName = descriptor['settingName'];
    const isRegex = descriptor['settingType'] === 'regex';
    const defaultValue = descriptor['defaultValue'];
    let storageType;
    switch (descriptor['storageType']) {
      case 'local':
        storageType = SettingStorageType.Local;
        break;
      case 'session':
        storageType = SettingStorageType.Session;
        break;
      case 'global':
        storageType = SettingStorageType.Global;
        break;
      default:
        storageType = SettingStorageType.Global;
    }
    const setting = isRegex ? this.createRegExpSetting(settingName, defaultValue, undefined, storageType) :
                              this.createSetting(settingName, defaultValue, storageType);
    if (extension.title()) {
      setting.setTitle(extension.title());
    }
    if (descriptor['userActionCondition']) {
      setting.setRequiresUserAction(!!Root.Runtime.Runtime.queryParam(descriptor['userActionCondition']));
    }
    setting._extension = extension;
    this._moduleSettings.set(settingName, setting);
  }

  /**
   * @param {string} settingName
   * @return {!Setting<*>}
   */
  moduleSetting(settingName) {
    const setting = this._moduleSettings.get(settingName);
    if (!setting) {
      throw new Error('No setting registered: ' + settingName);
    }
    return setting;
  }

  /**
   * @param {string} settingName
   * @return {!Setting<*>}
   */
  settingForTest(settingName) {
    const setting = this._registry.get(settingName);
    if (!setting) {
      throw new Error('No setting registered: ' + settingName);
    }
    return setting;
  }

  /**
   * @param {string} key
   * @param {*} defaultValue
   * @param {!SettingStorageType=} storageType
   * @return {!Setting<*>}
   */
  createSetting(key, defaultValue, storageType) {
    const storage = this._storageFromType(storageType);
    if (!this._registry.get(key)) {
      this._registry.set(key, new Setting(this, key, defaultValue, this._eventSupport, storage));
    }
    return /** @type {!Setting<*>} */ (this._registry.get(key));
  }

  /**
   * @param {string} key
   * @param {*} defaultValue
   * @return {!Setting<*>}
   */
  createLocalSetting(key, defaultValue) {
    return this.createSetting(key, defaultValue, SettingStorageType.Local);
  }

  /**
   * @param {string} key
   * @param {string} defaultValue
   * @param {string=} regexFlags
   * @param {!SettingStorageType=} storageType
   * @return {!RegExpSetting}
   */
  createRegExpSetting(key, defaultValue, regexFlags, storageType) {
    if (!this._registry.get(key)) {
      this._registry.set(
          key,
          new RegExpSetting(
              this, key, defaultValue, this._eventSupport, this._storageFromType(storageType), regexFlags));
    }
    return /** @type {!RegExpSetting} */ (this._registry.get(key));
  }

  clearAll() {
    this._globalStorage.removeAll();
    this._localStorage.removeAll();
    const versionSetting = Settings.instance().createSetting(VersionController._currentVersionName, 0);
    versionSetting.set(VersionController.currentVersion);
  }

  /**
   * @param {!SettingStorageType=} storageType
   * @return {!SettingsStorage}
   */
  _storageFromType(storageType) {
    switch (storageType) {
      case (SettingStorageType.Local):
        return this._localStorage;
      case (SettingStorageType.Session):
        return this._sessionStorage;
      case (SettingStorageType.Global):
        return this._globalStorage;
    }
    return this._globalStorage;
  }
}

/**
 * @unrestricted
 */
export class SettingsStorage {
  /**
   * @param {!Object<string,string>} object
   * @param {function(string, string)=} setCallback
   * @param {function(string)=} removeCallback
   * @param {function(string=)=} removeAllCallback
   * @param {string=} storagePrefix
   */
  constructor(object, setCallback, removeCallback, removeAllCallback, storagePrefix) {
    this._object = object;
    this._setCallback = setCallback || function() {};
    this._removeCallback = removeCallback || function() {};
    this._removeAllCallback = removeAllCallback || function() {};
    this._storagePrefix = storagePrefix || '';
  }

  /**
   * @param {string} name
   * @param {string} value
   */
  set(name, value) {
    name = this._storagePrefix + name;
    this._object[name] = value;
    this._setCallback(name, value);
  }

  /**
   * @param {string} name
   * @return {boolean}
   */
  has(name) {
    name = this._storagePrefix + name;
    return name in this._object;
  }

  /**
   * @param {string} name
   * @return {string}
   */
  get(name) {
    name = this._storagePrefix + name;
    return this._object[name];
  }

  /**
   * @param {string} name
   */
  remove(name) {
    name = this._storagePrefix + name;
    delete this._object[name];
    this._removeCallback(name);
  }

  removeAll() {
    this._object = {};
    this._removeAllCallback();
  }

  _dumpSizes() {
    Console.instance().log('Ten largest settings: ');

    /** @type {!Object<string,number>} */
    // @ts-ignore __proto__ optimization
    const sizes = {__proto__: null};
    for (const key in this._object) {
      sizes[key] = this._object[key].length;
    }
    const keys = Object.keys(sizes);

    /**
     * @param {string} key1
     * @param {string} key2
     */
    function comparator(key1, key2) {
      return sizes[key2] - sizes[key1];
    }

    keys.sort(comparator);

    for (let i = 0; i < 10 && i < keys.length; ++i) {
      Console.instance().log('Setting: \'' + keys[i] + '\', size: ' + sizes[keys[i]]);
    }
  }
}

/**
 * @template V
 * @unrestricted
 */
export class Setting {
  /**
   * @param {!Settings} settings
   * @param {string} name
   * @param {V} defaultValue
   * @param {!ObjectWrapper} eventSupport
   * @param {!SettingsStorage} storage
   */
  constructor(settings, name, defaultValue, eventSupport, storage) {
    this._settings = settings;
    this._name = name;
    this._defaultValue = defaultValue;
    this._eventSupport = eventSupport;
    this._storage = storage;
    /** @type {string} */
    this._title = '';
    /** @type {?Root.Runtime.Extension} */
    this._extension = null;
  }

  /**
   * @param {function(!EventTargetEvent):void} listener
   * @param {!Object=} thisObject
   * @return {!EventDescriptor}
   */
  addChangeListener(listener, thisObject) {
    return this._eventSupport.addEventListener(this._name, listener, thisObject);
  }

  /**
   * @param {function(!EventTargetEvent):void} listener
   * @param {!Object=} thisObject
   */
  removeChangeListener(listener, thisObject) {
    this._eventSupport.removeEventListener(this._name, listener, thisObject);
  }

  get name() {
    return this._name;
  }

  /**
   * @return {string}
   */
  title() {
    return this._title;
  }

  /**
   * @param {string} title
   */
  setTitle(title) {
    this._title = title;
  }

  /**
   * @param {boolean} requiresUserAction
   */
  setRequiresUserAction(requiresUserAction) {
    this._requiresUserAction = requiresUserAction;
  }

  /**
   * @return {V}
   */
  get() {
    if (this._requiresUserAction && !this._hadUserAction) {
      return this._defaultValue;
    }

    if (typeof this._value !== 'undefined') {
      return this._value;
    }

    this._value = this._defaultValue;
    if (this._storage.has(this._name)) {
      try {
        this._value = JSON.parse(this._storage.get(this._name));
      } catch (e) {
        this._storage.remove(this._name);
      }
    }
    return this._value;
  }

  /**
   * @param {V} value
   */
  set(value) {
    this._hadUserAction = true;
    this._value = value;
    try {
      const settingString = JSON.stringify(value);
      try {
        this._storage.set(this._name, settingString);
      } catch (e) {
        this._printSettingsSavingError(e.message, this._name, settingString);
      }
    } catch (e) {
      Console.instance().error('Cannot stringify setting with name: ' + this._name + ', error: ' + e.message);
    }
    this._eventSupport.dispatchEventToListeners(this._name, value);
  }

  remove() {
    this._settings._registry.delete(this._name);
    this._settings._moduleSettings.delete(this._name);
    this._storage.remove(this._name);
  }

  /**
   * @return {?Root.Runtime.Extension}
   */
  extension() {
    return this._extension;
  }

  /**
   * @param {string} message
   * @param {string} name
   * @param {string} value
   */
  _printSettingsSavingError(message, name, value) {
    const errorMessage =
        'Error saving setting with name: ' + this._name + ', value length: ' + value.length + '. Error: ' + message;
    console.error(errorMessage);
    Console.instance().error(errorMessage);
    this._storage._dumpSizes();
  }
}

/**
 * @unrestricted
 * @extends Setting<*>
 */
export class RegExpSetting extends Setting {
  /**
   * @param {!Settings} settings
   * @param {string} name
   * @param {string} defaultValue
   * @param {!ObjectWrapper} eventSupport
   * @param {!SettingsStorage} storage
   * @param {string=} regexFlags
   */
  constructor(settings, name, defaultValue, eventSupport, storage, regexFlags) {
    super(settings, name, defaultValue ? [{pattern: defaultValue}] : [], eventSupport, storage);
    this._regexFlags = regexFlags;
  }

  /**
   * @override
   * @return {string}
   */
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

  /**
   * @return {!Array.<{pattern: string, disabled: (boolean|undefined)}>}
   */
  getAsArray() {
    return super.get();
  }

  /**
   * @override
   * @suppress {checkTypes}
   * @param {string} value
   */
  set(value) {
    this.setAsArray([{pattern: value, disabled: false}]);
  }

  /**
   * @param {!Array.<{pattern: string, disabled: (boolean|undefined)}>} value
   */
  setAsArray(value) {
    delete this._regex;
    super.set(value);
  }

  /**
   * @return {?RegExp}
   */
  asRegExp() {
    if (typeof this._regex !== 'undefined') {
      return this._regex;
    }
    this._regex = null;
    try {
      const pattern = this.get();
      if (pattern) {
        this._regex = new RegExp(pattern, this._regexFlags || '');
      }
    } catch (e) {
    }
    return this._regex;
  }
}

/**
 * @unrestricted
 */
export class VersionController {
  static get _currentVersionName() {
    return 'inspectorVersion';
  }

  static get currentVersion() {
    return 29;
  }

  updateVersion() {
    const localStorageVersion = window.localStorage ? window.localStorage[VersionController._currentVersionName] : 0;
    const versionSetting = Settings.instance().createSetting(VersionController._currentVersionName, 0);
    const currentVersion = VersionController.currentVersion;
    const oldVersion = versionSetting.get() || parseInt(localStorageVersion || '0', 10);
    if (oldVersion === 0) {
      // First run, no need to do anything.
      versionSetting.set(currentVersion);
      return;
    }
    const methodsToRun = this._methodsToRunToUpdateVersion(oldVersion, currentVersion);
    for (const method of methodsToRun) {
      // @ts-ignore Special version method matching
      this[method].call(this);
    }
    versionSetting.set(currentVersion);
  }

  /**
   * @param {number} oldVersion
   * @param {number} currentVersion
   */
  _methodsToRunToUpdateVersion(oldVersion, currentVersion) {
    const result = [];
    for (let i = oldVersion; i < currentVersion; ++i) {
      result.push('_updateVersionFrom' + i + 'To' + (i + 1));
    }
    return result;
  }

  _updateVersionFrom0To1() {
    this._clearBreakpointsWhenTooMany(Settings.instance().createLocalSetting('breakpoints', []), 500000);
  }

  _updateVersionFrom1To2() {
    Settings.instance().createSetting('previouslyViewedFiles', []).set([]);
  }

  _updateVersionFrom2To3() {
    Settings.instance().createSetting('fileSystemMapping', {}).set({});
    Settings.instance().createSetting('fileMappingEntries', []).remove();
  }

  _updateVersionFrom3To4() {
    const advancedMode = Settings.instance().createSetting('showHeaSnapshotObjectsHiddenProperties', false);
    moduleSetting('showAdvancedHeapSnapshotProperties').set(advancedMode.get());
    advancedMode.remove();
  }

  _updateVersionFrom4To5() {
    /** @type {!Object<string,string>} */
    const settingNames = {
      'FileSystemViewSidebarWidth': 'fileSystemViewSplitViewState',
      'elementsSidebarWidth': 'elementsPanelSplitViewState',
      'StylesPaneSplitRatio': 'stylesPaneSplitViewState',
      'heapSnapshotRetainersViewSize': 'heapSnapshotSplitViewState',
      'InspectorView.splitView': 'InspectorView.splitViewState',
      'InspectorView.screencastSplitView': 'InspectorView.screencastSplitViewState',
      'Inspector.drawerSplitView': 'Inspector.drawerSplitViewState',
      'layerDetailsSplitView': 'layerDetailsSplitViewState',
      'networkSidebarWidth': 'networkPanelSplitViewState',
      'sourcesSidebarWidth': 'sourcesPanelSplitViewState',
      'scriptsPanelNavigatorSidebarWidth': 'sourcesPanelNavigatorSplitViewState',
      'sourcesPanelSplitSidebarRatio': 'sourcesPanelDebuggerSidebarSplitViewState',
      'timeline-details': 'timelinePanelDetailsSplitViewState',
      'timeline-split': 'timelinePanelRecorsSplitViewState',
      'timeline-view': 'timelinePanelTimelineStackSplitViewState',
      'auditsSidebarWidth': 'auditsPanelSplitViewState',
      'layersSidebarWidth': 'layersPanelSplitViewState',
      'profilesSidebarWidth': 'profilesPanelSplitViewState',
      'resourcesSidebarWidth': 'resourcesPanelSplitViewState'
    };
    const empty = {};
    for (const oldName in settingNames) {
      const newName = settingNames[oldName];
      const oldNameH = oldName + 'H';

      /** @type {?Object<string,*>} */
      let newValue = null;
      const oldSetting = Settings.instance().createSetting(oldName, empty);
      if (oldSetting.get() !== empty) {
        newValue = newValue || {};
        newValue.vertical = {};
        newValue.vertical.size = oldSetting.get();
        oldSetting.remove();
      }
      const oldSettingH = Settings.instance().createSetting(oldNameH, empty);
      if (oldSettingH.get() !== empty) {
        newValue = newValue || {};
        newValue.horizontal = {};
        newValue.horizontal.size = oldSettingH.get();
        oldSettingH.remove();
      }
      if (newValue) {
        Settings.instance().createSetting(newName, {}).set(newValue);
      }
    }
  }

  _updateVersionFrom5To6() {
    /** @type {!Object<string,string>} */
    const settingNames = {
      'debuggerSidebarHidden': 'sourcesPanelSplitViewState',
      'navigatorHidden': 'sourcesPanelNavigatorSplitViewState',
      'WebInspector.Drawer.showOnLoad': 'Inspector.drawerSplitViewState'
    };

    for (const oldName in settingNames) {
      const oldSetting = Settings.instance().createSetting(oldName, null);
      if (oldSetting.get() === null) {
        oldSetting.remove();
        continue;
      }

      const newName = settingNames[oldName];
      const invert = oldName === 'WebInspector.Drawer.showOnLoad';
      const hidden = oldSetting.get() !== invert;
      oldSetting.remove();
      const showMode = hidden ? 'OnlyMain' : 'Both';

      const newSetting = Settings.instance().createSetting(newName, {});
      const newValue = newSetting.get() || {};
      newValue.vertical = newValue.vertical || {};
      newValue.vertical.showMode = showMode;
      newValue.horizontal = newValue.horizontal || {};
      newValue.horizontal.showMode = showMode;
      newSetting.set(newValue);
    }
  }

  _updateVersionFrom6To7() {
    const settingNames = {
      'sourcesPanelNavigatorSplitViewState': 'sourcesPanelNavigatorSplitViewState',
      'elementsPanelSplitViewState': 'elementsPanelSplitViewState',
      'stylesPaneSplitViewState': 'stylesPaneSplitViewState',
      'sourcesPanelDebuggerSidebarSplitViewState': 'sourcesPanelDebuggerSidebarSplitViewState'
    };

    const empty = {};
    for (const name in settingNames) {
      const setting = Settings.instance().createSetting(name, empty);
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

  _updateVersionFrom7To8() {
  }

  _updateVersionFrom8To9() {
    const settingNames = ['skipStackFramesPattern', 'workspaceFolderExcludePattern'];

    for (let i = 0; i < settingNames.length; ++i) {
      const setting = Settings.instance().createSetting(settingNames[i], '');
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

  _updateVersionFrom9To10() {
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

  _updateVersionFrom10To11() {
    const oldSettingName = 'customDevicePresets';
    const newSettingName = 'customEmulatedDeviceList';
    const oldSetting = Settings.instance().createSetting(oldSettingName, undefined);
    const list = oldSetting.get();
    if (!Array.isArray(list)) {
      return;
    }
    const newList = [];
    for (let i = 0; i < list.length; ++i) {
      const value = list[i];
      /** @type {!Object<string,*>} */
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
      device['screen']['vertical'] = {width: value['width'], height: value['height']};
      device['screen']['horizontal'] = {width: value['height'], height: value['width']};
      device['screen']['device-pixel-ratio'] = value['deviceScaleFactor'];
      device['modes'] = [];
      device['show-by-default'] = true;
      device['show'] = 'Default';
      newList.push(device);
    }
    if (newList.length) {
      Settings.instance().createSetting(newSettingName, []).set(newList);
    }
    oldSetting.remove();
  }

  _updateVersionFrom11To12() {
    this._migrateSettingsFromLocalStorage();
  }

  _updateVersionFrom12To13() {
    this._migrateSettingsFromLocalStorage();
    Settings.instance().createSetting('timelineOverviewMode', '').remove();
  }

  _updateVersionFrom13To14() {
    const defaultValue = {'throughput': -1, 'latency': 0};
    Settings.instance().createSetting('networkConditions', defaultValue).set(defaultValue);
  }

  _updateVersionFrom14To15() {
    const setting = Settings.instance().createLocalSetting('workspaceExcludedFolders', {});
    const oldValue = setting.get();
    /** @type {!Object<string,!Array<string>>} */
    const newValue = {};
    for (const fileSystemPath in oldValue) {
      newValue[fileSystemPath] = [];
      for (const entry of oldValue[fileSystemPath]) {
        newValue[fileSystemPath].push(entry.path);
      }
    }
    setting.set(newValue);
  }

  _updateVersionFrom15To16() {
    const setting = Settings.instance().createSetting('InspectorView.panelOrder', {});
    const tabOrders = setting.get();
    for (const key of Object.keys(tabOrders)) {
      tabOrders[key] = (tabOrders[key] + 1) * 10;
    }
    setting.set(tabOrders);
  }

  _updateVersionFrom16To17() {
    const setting = Settings.instance().createSetting('networkConditionsCustomProfiles', []);
    const oldValue = setting.get();
    const newValue = [];
    if (Array.isArray(oldValue)) {
      for (const preset of oldValue) {
        if (typeof preset.title === 'string' && typeof preset.value === 'object' &&
            typeof preset.value.throughput === 'number' && typeof preset.value.latency === 'number') {
          newValue.push({
            title: preset.title,
            value:
                {download: preset.value.throughput, upload: preset.value.throughput, latency: preset.value.latency}
          });
        }
      }
    }
    setting.set(newValue);
  }

  _updateVersionFrom17To18() {
    const setting = Settings.instance().createLocalSetting('workspaceExcludedFolders', {});
    const oldValue = setting.get();
    /** @type {!Object<string,string>} */
    const newValue = {};
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

  _updateVersionFrom18To19() {
    const defaultColumns = {status: true, type: true, initiator: true, size: true, time: true};
    const visibleColumnSettings = Settings.instance().createSetting('networkLogColumnsVisibility', defaultColumns);
    const visibleColumns = visibleColumnSettings.get();
    visibleColumns.name = true;
    visibleColumns.timeline = true;

    /** @type {!Object<string,{visible: number}>} */
    const configs = {};
    for (const columnId in visibleColumns) {
      if (!visibleColumns.hasOwnProperty(columnId)) {
        continue;
      }
      configs[columnId.toLowerCase()] = {visible: visibleColumns[columnId]};
    }
    const newSetting = Settings.instance().createSetting('networkLogColumns', {});
    newSetting.set(configs);
    visibleColumnSettings.remove();
  }

  _updateVersionFrom19To20() {
    const oldSetting = Settings.instance().createSetting('InspectorView.panelOrder', {});
    const newSetting = Settings.instance().createSetting('panel-tabOrder', {});
    newSetting.set(oldSetting.get());
    oldSetting.remove();
  }

  _updateVersionFrom20To21() {
    const networkColumns = Settings.instance().createSetting('networkLogColumns', {});
    const columns = /** @type {!Object<string,string>} */ (networkColumns.get());
    delete columns['timeline'];
    delete columns['waterfall'];
    networkColumns.set(columns);
  }

  _updateVersionFrom21To22() {
    const breakpointsSetting = Settings.instance().createLocalSetting('breakpoints', []);
    const breakpoints = breakpointsSetting.get();
    for (const breakpoint of breakpoints) {
      breakpoint['url'] = breakpoint['sourceFileId'];
      delete breakpoint['sourceFileId'];
    }
    breakpointsSetting.set(breakpoints);
  }

  _updateVersionFrom22To23() {
    // This update is no-op.
  }

  _updateVersionFrom23To24() {
    const oldSetting = Settings.instance().createSetting('searchInContentScripts', false);
    const newSetting = Settings.instance().createSetting('searchInAnonymousAndContentScripts', false);
    newSetting.set(oldSetting.get());
    oldSetting.remove();
  }

  _updateVersionFrom24To25() {
    const defaultColumns = {status: true, type: true, initiator: true, size: true, time: true};
    const networkLogColumnsSetting = Settings.instance().createSetting('networkLogColumns', defaultColumns);
    const columns = networkLogColumnsSetting.get();
    delete columns.product;
    networkLogColumnsSetting.set(columns);
  }

  _updateVersionFrom25To26() {
    const oldSetting = Settings.instance().createSetting('messageURLFilters', {});
    const urls = Object.keys(oldSetting.get());
    const textFilter = urls.map(url => `-url:${url}`).join(' ');
    if (textFilter) {
      const textFilterSetting = Settings.instance().createSetting('console.textFilter', '');
      const suffix = textFilterSetting.get() ? ` ${textFilterSetting.get()}` : '';
      textFilterSetting.set(`${textFilter}${suffix}`);
    }
    oldSetting.remove();
  }

  _updateVersionFrom26To27() {
    /**
     * @param {string} settingName
     * @param {string} from
     * @param {string} to
     */
    function renameKeyInObjectSetting(settingName, from, to) {
      const setting = Settings.instance().createSetting(settingName, {});
      const value = setting.get();
      if (from in value) {
        value[to] = value[from];
        delete value[from];
        setting.set(value);
      }
    }

    /**
     * @param {string} settingName
     * @param {string} from
     * @param {string} to
     */
    function renameInStringSetting(settingName, from, to) {
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

  _updateVersionFrom27To28() {
    const setting = Settings.instance().createSetting('uiTheme', 'systemPreferred');
    if (setting.get() === 'default') {
      setting.set('systemPreferred');
    }
  }

  _updateVersionFrom28To29() {
    /**
     * @param {string} settingName
     * @param {string} from
     * @param {string} to
     */
    function renameKeyInObjectSetting(settingName, from, to) {
      const setting = Settings.instance().createSetting(settingName, {});
      const value = setting.get();
      if (from in value) {
        value[to] = value[from];
        delete value[from];
        setting.set(value);
      }
    }

    /**
     * @param {string} settingName
     * @param {string} from
     * @param {string} to
     */
    function renameInStringSetting(settingName, from, to) {
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

  _migrateSettingsFromLocalStorage() {
    // This step migrates all the settings except for the ones below into the browser profile.
    const localSettings = new Set([
      'advancedSearchConfig', 'breakpoints', 'consoleHistory', 'domBreakpoints', 'eventListenerBreakpoints',
      'fileSystemMapping', 'lastSelectedSourcesSidebarPaneTab', 'previouslyViewedFiles', 'savedURLs',
      'watchExpressions', 'workspaceExcludedFolders', 'xhrBreakpoints'
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
      Settings.instance()._globalStorage.set(key, value);
    }
  }

  /**
   * @param {!Setting<*>} breakpointsSetting
   * @param {number} maxBreakpointsCount
   */
  _clearBreakpointsWhenTooMany(breakpointsSetting, maxBreakpointsCount) {
    // If there are too many breakpoints in a storage, it is likely due to a recent bug that caused
    // periodical breakpoints duplication leading to inspector slowness.
    if (breakpointsSetting.get().length > maxBreakpointsCount) {
      breakpointsSetting.set([]);
    }
  }
}

/**
 * @enum {symbol}
 */
export const SettingStorageType = {
  Global: Symbol('Global'),
  Local: Symbol('Local'),
  Session: Symbol('Session')
};

/**
 * @param {string} settingName
 * @return {!Setting<*>}
 */
export function moduleSetting(settingName) {
  return Settings.instance().moduleSetting(settingName);
}

/**
 * @param {string} settingName
 * @return {!Setting<*>}
 */
export function settingForTest(settingName) {
  return Settings.instance().settingForTest(settingName);
}

/**
 * @param {!Color} color
 * @return {!Format}
 */
export function detectColorFormat(color) {
  const cf = Format;
  let format;
  const formatSetting = Settings.instance().moduleSetting('colorFormat').get();
  if (formatSetting === cf.Original) {
    format = cf.Original;
  } else if (formatSetting === cf.RGB) {
    format = (color.hasAlpha() ? cf.RGBA : cf.RGB);
  } else if (formatSetting === cf.HSL) {
    format = (color.hasAlpha() ? cf.HSLA : cf.HSL);
  } else if (formatSetting === cf.HEX) {
    format = color.detectHEXFormat();
  } else {
    format = cf.RGBA;
  }

  return format;
}
