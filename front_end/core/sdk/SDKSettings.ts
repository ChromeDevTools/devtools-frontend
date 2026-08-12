// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';

export const jsSourceMapsEnabledSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'js-source-maps-enabled',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const cssSourceMapsEnabledSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'css-source-maps-enabled',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const preserveConsoleLogSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'preserve-console-log',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const pauseOnExceptionEnabledSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'pause-on-exception-enabled',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
};

export const pauseOnCaughtExceptionSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'pause-on-caught-exception',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
};

export const pauseOnUncaughtExceptionSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'pause-on-uncaught-exception',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
};

export const javaScriptDisabledSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'java-script-disabled',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SESSION,
};

export const disableAsyncStackTracesSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'disable-async-stack-traces',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
};

export const breakpointsActiveSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'breakpoints-active',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SESSION,
};

export const showMetricsRulersSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'show-metrics-rulers',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const apcaSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'apca',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const showGridAreasSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'show-grid-areas',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const showGridTrackSizesSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'show-grid-track-sizes',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const extendGridLinesSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'extend-grid-lines',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};
