// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';
import * as SettingsUI from '../../ui/settings/settings.js';

import type * as Sensors from './sensors.js';

const UIStrings = {
  /**
   * @description Text for the CPU Pressure type to simulate on a device.
   */
  cpuPressure: 'CPU Pressure',
  /**
   * @description Title of an option in Sensors tab cpu pressure emulation drop-down. Turns off emulation of cpu pressure state.
   */
  noPressureEmulation: 'No override',
  /**
   * @description An option that appears in a drop-down that represents the nominal state.
   */
  nominal: 'Nominal',
  /**
   * @description An option that appears in a drop-down that represents the fair state.
   */
  fair: 'Fair',
  /**
   * @description An option that appears in a drop-down that represents the serious state.
   */
  serious: 'Serious',
  /**
   * @description An option that appears in a drop-down that represents the critical state.
   */
  critical: 'Critical',
  /**
   * @description Text for the touch type to simulate on a device. Refers to touch input as opposed to
   * mouse input.
   */
  touch: 'Touch',
  /**
   * @description Text in Sensors View of the Device Toolbar. Means that touch input will be forced
   *on, even if the device type e.g. desktop computer does not normally have touch input.
   */
  forceEnabled: 'Force enabled',
  /**
   * @description Text in Sensors View of the Device Toolbar. Refers to device-based touch input,
   *which means the input type will be 'touch' only if the device normally has touch input e.g. a
   *phone or tablet.
   */
  devicebased: 'Device-based',
  /**
   * @description Title of a section option in Sensors tab for idle emulation. This is a command, to
   *emulate the state of the 'Idle Detector'.
   */
  emulateIdleDetectorState: 'Emulate Idle Detector state',
  /**
   * @description Title of an option in Sensors tab idle emulation drop-down. Turns off emulation of idle state.
   */
  noIdleEmulation: 'No idle emulation',
  /**
   * @description Title of an option in Sensors tab idle emulation drop-down.
   */
  userActiveScreenUnlocked: 'User active, screen unlocked',
  /**
   * @description Title of an option in Sensors tab idle emulation drop-down.
   */
  userActiveScreenLocked: 'User active, screen locked',
  /**
   * @description Title of an option in Sensors tab idle emulation drop-down.
   */
  userIdleScreenUnlocked: 'User idle, screen unlocked',
  /**
   * @description Title of an option in Sensors tab idle emulation drop-down.
   */
  userIdleScreenLocked: 'User idle, screen locked',
  /**
   * @description Title of the Sensors view. The Sensors view contains GPS, orientation sensors, touch
   * settings, and more.
   */
  sensors: 'Sensors',
  /**
   * @description A tag of the Sensors view that can be searched in the command menu.
   */
  geolocation: 'geolocation',
  /**
   * @description A tag of the Sensors view that can be searched in the command menu.
   */
  timezones: 'timezones',
  /**
   * @description Text in the Sensors view of the Device toolbar.
   */
  locale: 'locale',
  /**
   * @description A tag of the Sensors view that can be searched in the command menu.
   */
  locales: 'locales',
  /**
   * @description A tag of the Sensors view that can be searched in the command menu.
   */
  accelerometer: 'accelerometer',
  /**
   * @description A tag of the Sensors view that can be searched in the command menu. Refers to the
   * orientation of a device (for example, a phone) in 3D space, tilted right or left.
   */
  deviceOrientation: 'device orientation',
  /**
   * @description Title of the Locations settings tab. Refers to geographic locations for GPS.
   */
  locations: 'Locations',
  /**
   * @description Command that opens the Sensors view. The Sensors view contains GPS,
   * orientation sensors, touch settings, and more.
   */
  showSensors: 'Show Sensors',
  /**
   * @description Command that shows the Locations settings tab.
   */
  showLocations: 'Show Locations',
} as const;
const str_ = i18n.i18n.registerUIStrings('panels/sensors/sensors-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedSensorsModule: (typeof Sensors|undefined);

async function loadEmulationModule(): Promise<typeof Sensors> {
  if (!loadedSensorsModule) {
    loadedSensorsModule = await import('./sensors.js');
  }
  return loadedSensorsModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  commandPrompt: i18nLazyString(UIStrings.showSensors),
  title: i18nLazyString(UIStrings.sensors),
  id: 'sensors',
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  order: 100,
  async loadView() {
    const Sensors = await loadEmulationModule();
    return new Sensors.SensorsView.SensorsView();
  },
  tags: [
    i18nLazyString(UIStrings.geolocation),
    i18nLazyString(UIStrings.timezones),
    i18nLazyString(UIStrings.locale),
    i18nLazyString(UIStrings.locales),
    i18nLazyString(UIStrings.accelerometer),
    i18nLazyString(UIStrings.deviceOrientation),
  ],
});

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.SETTINGS_VIEW,
  id: 'emulation-locations',
  commandPrompt: i18nLazyString(UIStrings.showLocations),
  title: i18nLazyString(UIStrings.locations),
  order: 40,
  async loadView() {
    const Sensors = await loadEmulationModule();
    return new Sensors.LocationsSettingsTab.LocationsSettingsTab();
  },
  settings: [
    'emulation.locations',
  ],
  iconName: 'location-on',
});

Common.Settings.registerSettingExtension({
  storageType: Common.Settings.SettingStorageType.SYNCED,
  settingName: 'emulation.locations',
  settingType: Common.Settings.SettingType.ARRAY,
  // TODO(crbug.com/1136655): http://crrev.com/c/2666426 regressed localization of city titles.
  // These titles should be localized since they are displayed to users.
  defaultValue: [
    {
      title: 'Berlin',
      lat: 52.520007,
      long: 13.404954,
      timezoneId: 'Europe/Berlin',
      locale: 'de-DE',
      accuracy: 150,
    },
    {
      title: 'London',
      lat: 51.507351,
      long: -0.127758,
      timezoneId: 'Europe/London',
      locale: 'en-GB',
      accuracy: 150,
    },
    {
      title: 'Moscow',
      lat: 55.755826,
      long: 37.6173,
      timezoneId: 'Europe/Moscow',
      locale: 'ru-RU',
      accuracy: 150,
    },
    {
      title: 'Mountain View',
      lat: 37.386052,
      long: -122.083851,
      timezoneId: 'America/Los_Angeles',
      locale: 'en-US',
      accuracy: 150,
    },
    {
      title: 'Mumbai',
      lat: 19.075984,
      long: 72.877656,
      timezoneId: 'Asia/Kolkata',
      locale: 'mr-IN',
      accuracy: 150,
    },
    {
      title: 'San Francisco',
      lat: 37.774929,
      long: -122.419416,
      timezoneId: 'America/Los_Angeles',
      locale: 'en-US',
      accuracy: 150,
    },
    {
      title: 'Shanghai',
      lat: 31.230416,
      long: 121.473701,
      timezoneId: 'Asia/Shanghai',
      locale: 'zh-Hans-CN',
      accuracy: 150,
    },
    {
      title: 'São Paulo',
      lat: -23.55052,
      long: -46.633309,
      timezoneId: 'America/Sao_Paulo',
      locale: 'pt-BR',
      accuracy: 150,
    },
    {
      title: 'Tokyo',
      lat: 35.689487,
      long: 139.691706,
      timezoneId: 'Asia/Tokyo',
      locale: 'ja-JP',
      accuracy: 150,
    },
  ],
});

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.cpuPressureSettingDescriptor, {
  title: i18nLazyString(UIStrings.cpuPressure),
  reloadRequired: true,
  options: [
    {
      value: 'none',
      title: i18nLazyString(UIStrings.noPressureEmulation),
      text: i18nLazyString(UIStrings.noPressureEmulation),
    },
    {
      value: 'nominal',
      title: i18nLazyString(UIStrings.nominal),
      text: i18nLazyString(UIStrings.nominal),
    },
    {
      value: 'fair',
      title: i18nLazyString(UIStrings.fair),
      text: i18nLazyString(UIStrings.fair),
    },
    {
      value: 'serious',
      title: i18nLazyString(UIStrings.serious),
      text: i18nLazyString(UIStrings.serious),
    },
    {
      value: 'critical',
      title: i18nLazyString(UIStrings.critical),
      text: i18nLazyString(UIStrings.critical),
    },
  ],
});

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.touchSettingDescriptor, {
  title: i18nLazyString(UIStrings.touch),
  reloadRequired: true,
  options: [
    {
      value: 'none',
      title: i18nLazyString(UIStrings.devicebased),
      text: i18nLazyString(UIStrings.devicebased),
    },
    {
      value: 'force',
      title: i18nLazyString(UIStrings.forceEnabled),
      text: i18nLazyString(UIStrings.forceEnabled),
    },
  ],
});

SettingsUI.SettingUIRegistration.register(SDK.SDKSettings.idleDetectionSettingDescriptor, {
  title: i18nLazyString(UIStrings.emulateIdleDetectorState),
  options: [
    {
      value: 'none',
      title: i18nLazyString(UIStrings.noIdleEmulation),
      text: i18nLazyString(UIStrings.noIdleEmulation),
    },
    {
      value: '{"isUserActive":true,"isScreenUnlocked":true}',
      title: i18nLazyString(UIStrings.userActiveScreenUnlocked),
      text: i18nLazyString(UIStrings.userActiveScreenUnlocked),
    },
    {
      value: '{"isUserActive":true,"isScreenUnlocked":false}',
      title: i18nLazyString(UIStrings.userActiveScreenLocked),
      text: i18nLazyString(UIStrings.userActiveScreenLocked),
    },
    {
      value: '{"isUserActive":false,"isScreenUnlocked":true}',
      title: i18nLazyString(UIStrings.userIdleScreenUnlocked),
      text: i18nLazyString(UIStrings.userIdleScreenUnlocked),
    },
    {
      value: '{"isUserActive":false,"isScreenUnlocked":false}',
      title: i18nLazyString(UIStrings.userIdleScreenLocked),
      text: i18nLazyString(UIStrings.userIdleScreenLocked),
    },
  ],
});
