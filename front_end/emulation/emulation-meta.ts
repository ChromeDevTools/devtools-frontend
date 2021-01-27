// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import type * as Platform from '../platform/platform.js';
import {ls} from '../platform/platform.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as Emulation from './emulation.js';

let loadedEmulationModule: (typeof Emulation|undefined);

async function loadEmulationModule(): Promise<typeof Emulation> {
  if (!loadedEmulationModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('emulation');
    loadedEmulationModule = await import('./emulation.js');
  }
  return loadedEmulationModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.SETTINGS_VIEW,
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Devices`,
  title: (): Platform.UIString.LocalizedString => ls`Devices`,
  order: 30,
  async loadView() {
    const Emulation = await loadEmulationModule();
    return Emulation.DevicesSettingsTab.DevicesSettingsTab.instance();
  },
  id: 'devices',
  settings: [
    'standardEmulatedDeviceList',
    'customEmulatedDeviceList',
  ],
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Sensors`,
  title: (): Platform.UIString.LocalizedString => ls`Sensors`,
  id: 'sensors',
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  order: 100,
  async loadView() {
    const Emulation = await loadEmulationModule();
    return Emulation.SensorsView.SensorsView.instance();
  },
  tags: [
    (): Platform.UIString.LocalizedString => ls`geolocation`,
    (): Platform.UIString.LocalizedString => ls`timezones`,
    (): Platform.UIString.LocalizedString => ls`locale`,
    (): Platform.UIString.LocalizedString => ls`locales`,
    (): Platform.UIString.LocalizedString => ls`accelerometer`,
    (): Platform.UIString.LocalizedString => ls`device orientation`,
  ],
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.SETTINGS_VIEW,
  id: 'emulation-locations',
  commandPrompt: (): Platform.UIString.LocalizedString => ls`Show Locations`,
  title: (): Platform.UIString.LocalizedString => ls`Locations`,
  order: 40,
  async loadView() {
    const Emulation = await loadEmulationModule();
    return Emulation.LocationsSettingsTab.LocationsSettingsTab.instance();
  },
  settings: [
    'emulation.locations',
  ],
});

UI.ActionRegistration.registerActionExtension({
  category: UI.ActionRegistration.ActionCategory.MOBILE,
  actionId: 'emulation.toggle-device-mode',
  toggleable: true,
  async loadActionDelegate() {
    const Emulation = await loadEmulationModule();
    return Emulation.DeviceModeWrapper.ActionDelegate.instance();
  },
  condition: Root.Runtime.ConditionName.CAN_DOCK,
  title: (): Platform.UIString.LocalizedString => ls`Toggle device toolbar`,
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_PHONE,
  bindings: [
    {
      platform: UI.ActionRegistration.Platforms.WindowsLinux,
      shortcut: 'Shift+Ctrl+M',
    },
    {
      platform: UI.ActionRegistration.Platforms.Mac,
      shortcut: 'Shift+Meta+M',
    },
  ],
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'emulation.capture-screenshot',
  category: UI.ActionRegistration.ActionCategory.SCREENSHOT,
  async loadActionDelegate() {
    const Emulation = await loadEmulationModule();
    return Emulation.DeviceModeWrapper.ActionDelegate.instance();
  },
  condition: Root.Runtime.ConditionName.CAN_DOCK,
  title: (): Platform.UIString.LocalizedString => ls`Capture screenshot`,
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'emulation.capture-full-height-screenshot',
  category: UI.ActionRegistration.ActionCategory.SCREENSHOT,
  async loadActionDelegate() {
    const Emulation = await loadEmulationModule();
    return Emulation.DeviceModeWrapper.ActionDelegate.instance();
  },
  condition: Root.Runtime.ConditionName.CAN_DOCK,
  title: (): Platform.UIString.LocalizedString => ls`Capture full size screenshot`,
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'emulation.capture-node-screenshot',
  category: UI.ActionRegistration.ActionCategory.SCREENSHOT,
  async loadActionDelegate() {
    const Emulation = await loadEmulationModule();
    return Emulation.DeviceModeWrapper.ActionDelegate.instance();
  },
  condition: Root.Runtime.ConditionName.CAN_DOCK,
  title: (): Platform.UIString.LocalizedString => ls`Capture node screenshot`,
});

UI.ActionRegistration.registerActionExtension({
  actionId: 'emulation.show-sensors',
  category: UI.ActionRegistration.ActionCategory.SENSORS,
  async loadActionDelegate() {
    const Emulation = await loadEmulationModule();
    return Emulation.SensorsView.ShowActionDelegate.instance();
  },
  title: (): Platform.UIString.LocalizedString => ls`Sensors`,
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.MOBILE,
  settingName: 'showMediaQueryInspector',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Show media queries`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Hide media queries`,
    },
  ],
  tags: [(): Platform.UIString.LocalizedString => ls`device`],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.MOBILE,
  settingName: 'emulation.showRulers',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Show rulers`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Hide rulers`,
    },
  ],
  tags: [(): Platform.UIString.LocalizedString => ls`device`],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.MOBILE,
  settingName: 'emulation.showDeviceOutline',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
  options: [
    {
      value: true,
      title: (): Platform.UIString.LocalizedString => ls`Show device frame`,
    },
    {
      value: false,
      title: (): Platform.UIString.LocalizedString => ls`Hide device frame`,
    },
  ],
  tags: [(): Platform.UIString.LocalizedString => ls`device`],
});

Common.Settings.registerSettingExtension({
  settingName: 'emulation.locations',
  settingType: Common.Settings.SettingTypeObject.ARRAY,
  defaultValue: [
    {
      title: (): Platform.UIString.LocalizedString => ls`Berlin`,
      lat: 52.520007,
      long: 13.404954,
      timezoneId: 'Europe/Berlin',
      locale: 'de_DE',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`London`,
      lat: 51.507351,
      long: -0.127758,
      timezoneId: 'Europe/London',
      locale: 'en_GB',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Moscow`,
      lat: 55.755826,
      long: 37.6173,
      timezoneId: 'Europe/Moscow',
      locale: 'ru_RU',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Mountain View`,
      lat: 37.386052,
      long: -122.083851,
      timezoneId: 'US/Pacific',
      locale: 'en_US',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Mumbai`,
      lat: 19.075984,
      long: 72.877656,
      timezoneId: 'Asia/Kolkata',
      locale: 'mr_IN',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`San Francisco`,
      lat: 37.774929,
      long: -122.419416,
      timezoneId: 'US/Pacific',
      locale: 'en_US',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Shanghai`,
      lat: 31.230416,
      long: 121.473701,
      timezoneId: 'Asia/Shanghai',
      locale: 'zh_Hans_CN',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`São Paulo`,
      lat: -23.55052,
      long: -46.633309,
      timezoneId: 'America/Sao_Paulo',
      locale: 'pt_BR',
    },
    {
      title: (): Platform.UIString.LocalizedString => ls`Tokyo`,
      lat: 35.689487,
      long: 139.691706,
      timezoneId: 'Asia/Tokyo',
      locale: 'ja_JP',
    },
  ],
});

Common.Settings.registerSettingExtension({
  title: (): Platform.UIString.LocalizedString => ls`Touch`,
  reloadRequired: true,
  settingName: 'emulation.touch',
  settingType: Common.Settings.SettingTypeObject.ENUM,
  defaultValue: 'none',
  options: [
    {
      value: 'none',
      title: (): Platform.UIString.LocalizedString => ls`Device-based`,
      text: (): Platform.UIString.LocalizedString => ls`Device-based`,
    },
    {
      value: 'force',
      title: (): Platform.UIString.LocalizedString => ls`Force enabled`,
      text: (): Platform.UIString.LocalizedString => ls`Force enabled`,
    },
  ],
});

Common.Settings.registerSettingExtension({
  title: (): Platform.UIString.LocalizedString => ls`Emulate Idle Detector state`,
  settingName: 'emulation.idleDetection',
  settingType: Common.Settings.SettingTypeObject.ENUM,
  defaultValue: 'none',
  options: [
    {
      value: 'none',
      title: (): Platform.UIString.LocalizedString => ls`No idle emulation`,
      text: (): Platform.UIString.LocalizedString => ls`No idle emulation`,
    },
    {
      value: '{\"isUserActive\":true,\"isScreenUnlocked\":true}',
      title: (): Platform.UIString.LocalizedString => ls`User active, screen unlocked`,
      text: (): Platform.UIString.LocalizedString => ls`User active, screen unlocked`,
    },
    {
      value: '{\"isUserActive\":true,\"isScreenUnlocked\":false}',
      title: (): Platform.UIString.LocalizedString => ls`User active, screen locked`,
      text: (): Platform.UIString.LocalizedString => ls`User active, screen locked`,
    },
    {
      value: '{\"isUserActive\":false,\"isScreenUnlocked\":true}',
      title: (): Platform.UIString.LocalizedString => ls`User idle, screen unlocked`,
      text: (): Platform.UIString.LocalizedString => ls`User idle, screen unlocked`,
    },
    {
      value: '{\"isUserActive\":false,\"isScreenUnlocked\":false}',
      title: (): Platform.UIString.LocalizedString => ls`User idle, screen locked`,
      text: (): Platform.UIString.LocalizedString => ls`User idle, screen locked`,
    },
  ],
});
