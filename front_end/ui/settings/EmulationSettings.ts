// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

export const showMediaQueryInspectorSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'show-media-query-inspector',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
};

export const showRulersSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'emulation.show-rulers',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
};

export interface LocationDescription {
  title: string;
  lat: number;
  long: number;
  timezoneId: string;
  locale: string;
  accuracy?: number;
}

export const emulationLocationsSettingDescriptor: Common.Settings.SettingDescriptor<LocationDescription[]> = {
  name: 'emulation.locations',
  type: Common.Settings.SettingType.ARRAY,
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
  storageType: Common.Settings.SettingStorageType.SYNCED,
};
