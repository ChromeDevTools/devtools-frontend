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

export const showGridLineLabelsSettingDescriptor: Common.Settings.SettingDescriptor<string> = {
  name: 'show-grid-line-labels',
  type: Common.Settings.SettingType.ENUM,
  defaultValue: 'lineNumbers',
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const showPaintRectsSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'show-paint-rects',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SESSION,
};

export const showLayoutShiftRegionsSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'show-layout-shift-regions',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SESSION,
};

export const showAdHighlightsSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'show-ad-highlights',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SESSION,
};

export const showDebugBordersSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'show-debug-borders',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SESSION,
};

export const showFPSCounterSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'show-fps-counter',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SESSION,
};

export const showScrollBottleneckRectsSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'show-scroll-bottleneck-rects',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SESSION,
};

export const emulatePageFocusSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'emulate-page-focus',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.LOCAL,
};

export const emulatedCSSMediaSettingDescriptor: Common.Settings.SettingDescriptor<string> = {
  name: 'emulated-css-media',
  type: Common.Settings.SettingType.ENUM,
  defaultValue: '',
  storageType: Common.Settings.SettingStorageType.SESSION,
};

export const cpuPressureSettingDescriptor: Common.Settings.SettingDescriptor<string> = {
  name: 'emulation.cpu-pressure',
  type: Common.Settings.SettingType.ENUM,
  defaultValue: 'none',
};

export const touchSettingDescriptor: Common.Settings.SettingDescriptor<string> = {
  name: 'emulation.touch',
  type: Common.Settings.SettingType.ENUM,
  defaultValue: 'none',
};

export const idleDetectionSettingDescriptor: Common.Settings.SettingDescriptor<string> = {
  name: 'emulation.idle-detection',
  type: Common.Settings.SettingType.ENUM,
  defaultValue: 'none',
};

export const emulatedCSSMediaFeaturePrefersColorSchemeSettingDescriptor: Common.Settings.SettingDescriptor<string> = {
  name: 'emulated-css-media-feature-prefers-color-scheme',
  type: Common.Settings.SettingType.ENUM,
  defaultValue: '',
  storageType: Common.Settings.SettingStorageType.SESSION,
};

export const emulatedCSSMediaFeatureForcedColorsSettingDescriptor: Common.Settings.SettingDescriptor<string> = {
  name: 'emulated-css-media-feature-forced-colors',
  type: Common.Settings.SettingType.ENUM,
  defaultValue: '',
  storageType: Common.Settings.SettingStorageType.SESSION,
};

export const emulatedCSSMediaFeaturePrefersReducedMotionSettingDescriptor: Common.Settings.SettingDescriptor<string> = {
  name: 'emulated-css-media-feature-prefers-reduced-motion',
  type: Common.Settings.SettingType.ENUM,
  defaultValue: '',
  storageType: Common.Settings.SettingStorageType.SESSION,
};

export const emulatedCSSMediaFeaturePrefersContrastSettingDescriptor: Common.Settings.SettingDescriptor<string> = {
  name: 'emulated-css-media-feature-prefers-contrast',
  type: Common.Settings.SettingType.ENUM,
  defaultValue: '',
  storageType: Common.Settings.SettingStorageType.SESSION,
};

export const emulatedCSSMediaFeaturePrefersReducedDataSettingDescriptor: Common.Settings.SettingDescriptor<string> = {
  name: 'emulated-css-media-feature-prefers-reduced-data',
  type: Common.Settings.SettingType.ENUM,
  defaultValue: '',
  storageType: Common.Settings.SettingStorageType.SESSION,
};

export const emulatedCSSMediaFeaturePrefersReducedTransparencySettingDescriptor:
    Common.Settings.SettingDescriptor<string> = {
  name: 'emulated-css-media-feature-prefers-reduced-transparency',
  type: Common.Settings.SettingType.ENUM,
  defaultValue: '',
  storageType: Common.Settings.SettingStorageType.SESSION,
};
