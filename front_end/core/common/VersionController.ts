// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../platform/platform.js';
import * as Root from '../root/root.js';

/* eslint @devtools/enforce-version-controller-methods: "error" */

import {type Setting, Settings, type SettingsStorage, SettingStorageType} from './Settings.js';

// The VersionController does a lot of mapping and restructuring which often need
// typecasting to any, allow it in there
/* eslint-disable @typescript-eslint/no-explicit-any */
export class VersionController {
  static readonly GLOBAL_VERSION_SETTING_NAME = 'inspectorVersion';
  static readonly SYNCED_VERSION_SETTING_NAME = 'syncedInspectorVersion';
  static readonly LOCAL_VERSION_SETTING_NAME = 'localInspectorVersion';

  static readonly CURRENT_VERSION = 43;

  readonly #settings: Settings;
  readonly #globalVersionSetting: Setting<number>;
  readonly #syncedVersionSetting: Setting<number>;
  readonly #localVersionSetting: Setting<number>;

  constructor(settings: Settings) {
    this.#settings = settings;
    // If no version setting is found, we initialize with the current version and don't do anything.
    this.#globalVersionSetting = this.#settings.createSetting(
        VersionController.GLOBAL_VERSION_SETTING_NAME, VersionController.CURRENT_VERSION, SettingStorageType.GLOBAL);
    this.#syncedVersionSetting = this.#settings.createSetting(
        VersionController.SYNCED_VERSION_SETTING_NAME, VersionController.CURRENT_VERSION, SettingStorageType.SYNCED);
    this.#localVersionSetting = this.#settings.createSetting(
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

  #removeSetting(setting: {name: string, storage: SettingsStorage}): void {
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
  updateVersion(): void {
    const currentVersion = VersionController.CURRENT_VERSION;
    const minimumVersion =
        Math.min(this.#globalVersionSetting.get(), this.#syncedVersionSetting.get(), this.#localVersionSetting.get());
    const methodsToRun = this.methodsToRunToUpdateVersion(minimumVersion, currentVersion);
    console.assert(
        // @ts-expect-error
        this[`updateVersionFrom${currentVersion}To${currentVersion + 1}`] === undefined,
        'Unexpected migration method found. Increment CURRENT_VERSION or remove the method.');
    for (const method of methodsToRun) {
      // @ts-expect-error Special version method matching
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

  updateVersionFrom0To1(): void {
    this.clearBreakpointsWhenTooMany(this.#settings.createLocalSetting('breakpoints', []), 500000);
  }

  updateVersionFrom1To2(): void {
    this.#settings.createSetting('previouslyViewedFiles', []).set([]);
  }

  updateVersionFrom2To3(): void {
    this.#settings.createSetting('fileSystemMapping', {}).set({});
    this.#removeSetting(this.#settings.createSetting('fileMappingEntries', []));
  }

  updateVersionFrom3To4(): void {
    const advancedMode = this.#settings.createSetting('showHeaSnapshotObjectsHiddenProperties', false);
    this.#settings.moduleSetting('showAdvancedHeapSnapshotProperties').set(advancedMode.get());
    this.#removeSetting(advancedMode);
  }

  updateVersionFrom4To5(): void {
    const settingNames: Record<string, string> = {
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

      let newValue: object|null = null;
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

  updateVersionFrom5To6(): void {
    const settingNames: Record<string, string> = {
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

  updateVersionFrom6To7(): void {
    const settingNames = {
      sourcesPanelNavigatorSplitViewState: 'sourcesPanelNavigatorSplitViewState',
      elementsPanelSplitViewState: 'elementsPanelSplitViewState',
      stylesPaneSplitViewState: 'stylesPaneSplitViewState',
      sourcesPanelDebuggerSidebarSplitViewState: 'sourcesPanelDebuggerSidebarSplitViewState',
    };

    const empty = {};
    for (const name in settingNames) {
      const setting =
          this.#settings.createSetting<{vertical?: {size?: number}, horizontal?: {size?: number}}>(name, empty);
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

  updateVersionFrom7To8(): void {
  }

  updateVersionFrom8To9(): void {
    const settingNames = ['skipStackFramesPattern', 'workspaceFolderExcludePattern'];

    for (let i = 0; i < settingNames.length; ++i) {
      const setting = this.#settings.createSetting<string|unknown[]>(settingNames[i], '');
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

  updateVersionFrom9To10(): void {
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

  updateVersionFrom10To11(): void {
    const oldSettingName = 'customDevicePresets';
    const newSettingName = 'customEmulatedDeviceList';
    const oldSetting = this.#settings.createSetting<unknown>(oldSettingName, undefined);
    const list = oldSetting.get();
    if (!Array.isArray(list)) {
      return;
    }
    const newList = [];
    for (let i = 0; i < list.length; ++i) {
      const value = list[i];

      const device: Record<string, any> = {};
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
      this.#settings.createSetting<unknown[]>(newSettingName, []).set(newList);
    }
    this.#removeSetting(oldSetting);
  }

  updateVersionFrom11To12(): void {
    this.migrateSettingsFromLocalStorage();
  }

  updateVersionFrom12To13(): void {
    this.migrateSettingsFromLocalStorage();
    this.#removeSetting(this.#settings.createSetting('timelineOverviewMode', ''));
  }

  updateVersionFrom13To14(): void {
    const defaultValue = {throughput: -1, latency: 0};
    this.#settings.createSetting('networkConditions', defaultValue).set(defaultValue);
  }

  updateVersionFrom14To15(): void {
    const setting = this.#settings.createLocalSetting<any>('workspaceExcludedFolders', {});
    const oldValue = setting.get();
    const newValue: Record<string, string[]> = {};
    for (const fileSystemPath in oldValue) {
      newValue[fileSystemPath] = [];
      for (const entry of oldValue[fileSystemPath]) {
        newValue[fileSystemPath].push(entry.path);
      }
    }
    setting.set(newValue);
  }

  updateVersionFrom15To16(): void {
    const setting = this.#settings.createSetting<any>('InspectorView.panelOrder', {});
    const tabOrders = setting.get();
    for (const key of Object.keys(tabOrders)) {
      tabOrders[key] = (tabOrders[key] + 1) * 10;
    }
    setting.set(tabOrders);
  }

  updateVersionFrom16To17(): void {
    const setting = this.#settings.createSetting<any>('networkConditionsCustomProfiles', []);
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

  updateVersionFrom17To18(): void {
    const setting = this.#settings.createLocalSetting<any>('workspaceExcludedFolders', {});
    const oldValue = setting.get();
    const newValue: Record<string, string> = {};
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

  updateVersionFrom18To19(): void {
    const defaultColumns = {status: true, type: true, initiator: true, size: true, time: true};
    const visibleColumnSettings = this.#settings.createSetting<any>('networkLogColumnsVisibility', defaultColumns);
    const visibleColumns = visibleColumnSettings.get();
    visibleColumns.name = true;
    visibleColumns.timeline = true;

    const configs: Record<string, {
      visible: number,
    }> = {};
    for (const columnId in visibleColumns) {
      if (!visibleColumns.hasOwnProperty(columnId)) {
        continue;
      }
      configs[columnId.toLowerCase()] = {visible: visibleColumns[columnId]};
    }
    const newSetting = this.#settings.createSetting('networkLogColumns', {});
    newSetting.set(configs);
    this.#removeSetting(visibleColumnSettings);
  }

  updateVersionFrom19To20(): void {
    const oldSetting = this.#settings.createSetting('InspectorView.panelOrder', {});
    const newSetting = this.#settings.createSetting('panel-tabOrder', {});
    newSetting.set(oldSetting.get());
    this.#removeSetting(oldSetting);
  }

  updateVersionFrom20To21(): void {
    const networkColumns = this.#settings.createSetting('networkLogColumns', {});
    const columns = (networkColumns.get() as Record<string, string>);
    delete columns['timeline'];
    delete columns['waterfall'];
    networkColumns.set(columns);
  }

  updateVersionFrom21To22(): void {
    const breakpointsSetting = this.#settings.createLocalSetting<any>('breakpoints', []);
    const breakpoints = breakpointsSetting.get();
    for (const breakpoint of breakpoints) {
      breakpoint['url'] = breakpoint['sourceFileId'];
      delete breakpoint['sourceFileId'];
    }
    breakpointsSetting.set(breakpoints);
  }

  updateVersionFrom22To23(): void {
    // This update is no-op.
  }

  updateVersionFrom23To24(): void {
    const oldSetting = this.#settings.createSetting('searchInContentScripts', false);
    const newSetting = this.#settings.createSetting('searchInAnonymousAndContentScripts', false);
    newSetting.set(oldSetting.get());
    this.#removeSetting(oldSetting);
  }

  updateVersionFrom24To25(): void {
    const defaultColumns = {status: true, type: true, initiator: true, size: true, time: true};

    const networkLogColumnsSetting = this.#settings.createSetting<any>('networkLogColumns', defaultColumns);
    const columns = networkLogColumnsSetting.get();
    delete columns.product;
    networkLogColumnsSetting.set(columns);
  }

  updateVersionFrom25To26(): void {
    const oldSetting = this.#settings.createSetting('messageURLFilters', {});
    const urls = Object.keys(oldSetting.get());
    const textFilter = urls.map(url => `-url:${url}`).join(' ');
    if (textFilter) {
      const textFilterSetting = this.#settings.createSetting<any>('console.textFilter', '');
      const suffix = textFilterSetting.get() ? ` ${textFilterSetting.get()}` : '';
      textFilterSetting.set(`${textFilter}${suffix}`);
    }
    this.#removeSetting(oldSetting);
  }

  updateVersionFrom26To27(): void {
    const settings = this.#settings;
    function renameKeyInObjectSetting(settingName: string, from: string, to: string): void {
      const setting = settings.createSetting<any>(settingName, {});
      const value = setting.get();
      if (from in value) {
        value[to] = value[from];
        delete value[from];
        setting.set(value);
      }
    }

    function renameInStringSetting(settingName: string, from: string, to: string): void {
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

  updateVersionFrom27To28(): void {
    const setting = this.#settings.createSetting('uiTheme', 'systemPreferred');
    if (setting.get() === 'default') {
      setting.set('systemPreferred');
    }
  }

  updateVersionFrom28To29(): void {
    const settings = this.#settings;
    function renameKeyInObjectSetting(settingName: string, from: string, to: string): void {
      const setting = settings.createSetting<any>(settingName, {});
      const value = setting.get();
      if (from in value) {
        value[to] = value[from];
        delete value[from];
        setting.set(value);
      }
    }

    function renameInStringSetting(settingName: string, from: string, to: string): void {
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

  updateVersionFrom29To30(): void {
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

  updateVersionFrom30To31(): void {
    // Remove recorder_recordings setting that was used for storing recordings
    // by an old recorder experiment.
    const recordingsSetting = this.#settings.createSetting('recorder_recordings', []);
    this.#removeSetting(recordingsSetting);
  }

  updateVersionFrom31To32(): void {
    // Introduce the new 'resourceTypeName' property on stored breakpoints. Prior to
    // this change we synchronized the breakpoint only by URL, but since we don't
    // know on which resource type the given breakpoint was set, we just assume
    // 'script' here to keep things simple.

    const breakpointsSetting = this.#settings.createLocalSetting<any>('breakpoints', []);
    const breakpoints = breakpointsSetting.get();
    for (const breakpoint of breakpoints) {
      breakpoint['resourceTypeName'] = 'script';
    }
    breakpointsSetting.set(breakpoints);
  }

  updateVersionFrom32To33(): void {
    const previouslyViewedFilesSetting = this.#settings.createLocalSetting<any>('previouslyViewedFiles', []);
    let previouslyViewedFiles = previouslyViewedFilesSetting.get();

    // Discard old 'previouslyViewedFiles' items that don't have a 'url' property.

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

    const breakpointsSetting = this.#settings.createLocalSetting<any>('breakpoints', []);
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

    const breakpointsSetting = this.#settings.createLocalSetting<any>('breakpoints', []);
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
    this.#settings.createSetting('showThirdPartyIssues', true).set(true);
  }

  updateVersionFrom36To37(): void {
    const updateStorage = (storage: SettingsStorage): void => {
      for (const key of storage.keys()) {
        const normalizedKey = Settings.normalizeSettingName(key);
        if (normalizedKey !== key) {
          const value = storage.get(key);
          this.#removeSetting({name: key, storage});
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

  updateVersionFrom37To38(): void {
    const getConsoleInsightsEnabledSetting = (): Setting<boolean>|undefined => {
      try {
        return this.#settings.moduleSetting('console-insights-enabled') as Setting<boolean>;
      } catch {
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

  updateVersionFrom38To39(): void {
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
      const networkSetting = JSON.parse(setting) as unknown as {
        // Can't use SDK type here as it creates a common<>sdk circular
        // dep. This type is not exhaustive but contains the fields we
        // need.
        title: string,
        i18nTitleKey?: string,
      };
      if (networkSetting.title === 'Slow 3G') {
        networkSetting.title = '3G';
        networkSetting.i18nTitleKey = '3G';
        this.#settings.globalStorage.set(PREFERRED_NETWORK_COND, JSON.stringify(networkSetting));
      } else if (networkSetting.title === 'Fast 3G') {
        networkSetting.title = 'Slow 4G';
        networkSetting.i18nTitleKey = 'Slow 4G';
        this.#settings.globalStorage.set(PREFERRED_NETWORK_COND, JSON.stringify(networkSetting));
      }
    } catch {
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
  updateVersionFrom39To40(): void {
    const hasCustomNetworkConditionsSetting = (): boolean => {
      try {
        // this will error if it does not exist
        this.#settings.moduleSetting('custom-network-conditions');
        return true;
      } catch {
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
      const conditionsSetting =
          this.#settings.moduleSetting('custom-network-conditions') as Setting<Array<{key?: string}>>;
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
      const networkSetting = JSON.parse(setting) as unknown as {
        // Can't use SDK type here as it creates a common<>sdk circular
        // dep. We only rely on the i18nTitleKey.
        i18nTitleKey?: string,
      };
      if (networkSetting.i18nTitleKey && UI_STRING_TO_NEW_KEY.hasOwnProperty(networkSetting.i18nTitleKey)) {
        const key = UI_STRING_TO_NEW_KEY[networkSetting.i18nTitleKey as keyof typeof UI_STRING_TO_NEW_KEY];

        // The second argument is the default value, so it's important that we
        // set this to the default, and then update it to the new key.
        const newSetting = this.#settings.createSetting('active-network-condition-key', 'NO_THROTTLING');
        newSetting.set(key);
      }
    } finally {
      // This setting is now not used, so we can remove it.
      this.#settings.globalStorage.remove(PREFERRED_NETWORK_COND_SETTING);
    }
  }

  // This migration handles two setting renames that requires inverted logic
  // (from "Hide X" to "X") and flipped the default values to true.
  updateVersionFrom40To41(): void {
    // 1. Rename 'Hide network messages' to 'Network messages'
    if (this.#settings.syncedStorage.has('hide-network-messages')) {
      const oldNetworkSetting = this.#settings.createSetting('hide-network-messages', false, SettingStorageType.SYNCED);
      if (!this.#settings.syncedStorage.has('network-messages')) {
        const newNetworkSetting = this.#settings.createSetting('network-messages', true, SettingStorageType.SYNCED);
        // If the user had a saved preference for the old setting, migrate it by
        // inverting the value to match the new logic.
        newNetworkSetting.set(!oldNetworkSetting.get());
      }
      this.#removeSetting(oldNetworkSetting);
    }

    // 2. Rename 'Hide `chrome` frame in Layers view' to 'Chrome frame in Layers view'
    if (this.#settings.syncedStorage.has('frame-viewer-hide-chrome-window')) {
      const oldChromeFrameSetting =
          this.#settings.createSetting('frame-viewer-hide-chrome-window', false, SettingStorageType.SYNCED);
      if (!this.#settings.syncedStorage.has('frame-viewer-chrome-window')) {
        const newChromeFrameSetting =
            this.#settings.createSetting('frame-viewer-chrome-window', true, SettingStorageType.SYNCED);
        // Similar to above, move the preference and invert the boolean.
        newChromeFrameSetting.set(!oldChromeFrameSetting.get());
      }
      this.#removeSetting(oldChromeFrameSetting);
    }
  }

  /**
   * The recording in recorder panel may have unreasonably long titles
   * or a lot of steps which can cause renderer crashes.
   * Similar to https://crbug.com/40918380
   */
  updateVersionFrom41To42(): void {
    const recordingsSetting = this.#settings.createSetting<Array<{flow: {steps: unknown[], title: string}}>>(
        'recorder-recordings-ng',
        [],
    );
    const recordings = recordingsSetting.get();
    if (recordings.length === 0) {
      return;
    }

    for (const recording of recordings) {
      recording.flow.title = Platform.StringUtilities.trimEndWithMaxLength(recording.flow.title, 300);
      recording.flow.steps = recording.flow.steps.slice(0, 4096);
    }

    recordingsSetting.set(recordings);
  }

  updateVersionFrom42To43(): void {
    const timelineShowAllEventsExperimentEnabled =
        Root.Runtime.experiments.getValueFromStorage('timeline-show-all-events' as Root.ExperimentNames.ExperimentName);
    if (timelineShowAllEventsExperimentEnabled !== undefined) {
      if (this.#settings.syncedStorage.has('timeline-show-all-events')) {
        return;  // Already migrated
      }
      try {
        const timelineShowAllEventsSetting = this.#settings.moduleSetting('timeline-show-all-events');
        timelineShowAllEventsSetting.set(timelineShowAllEventsExperimentEnabled);
      } catch {
        // If the setting is not registered yet (e.g. in tests), skip.
      }
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
      this.#settings.globalStorage.set(key, value);
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
/* eslint-enable @typescript-eslint/no-explicit-any */
