// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

export const timelineShowAllEventsSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'timeline-show-all-events',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const timelineDebugModeSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'timeline-debug-mode',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const annotationsHiddenSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'annotations-hidden',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const timelineInvalidationTrackingSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'timeline-invalidation-tracking',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const timelineDisableJsSamplingSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'timeline-disable-js-sampling',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SESSION,
};

export const timelineCaptureLayersAndPicturesSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'timeline-capture-layers-and-pictures',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SESSION,
};

export const timelineCaptureSelectorStatsSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'timeline-capture-selector-stats',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SESSION,
};

export const timelineScreenshotCaptureModeSettingDescriptor: Common.Settings.SettingDescriptor<string> = {
  name: 'timeline-screenshot-capture-mode',
  type: Common.Settings.SettingType.ENUM,
  defaultValue: 'auto',
  storageType: Common.Settings.SettingStorageType.SESSION,
};

export const timelineShowScreenshotsSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'timeline-show-screenshots',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.GLOBAL,
};

export const timelineShowMemorySettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'timeline-show-memory',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SESSION,
};

export const timelineDimThirdPartiesSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'timeline-dim-third-parties',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SESSION,
};

export const timelineShowExtensionDataSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'timeline-show-extension-data',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.GLOBAL,
};

export const timelineCountersGraphJsHeapSizeUsedSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'timeline-counters-graph-js-heap-size-used',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.GLOBAL,
};

export const timelineCountersGraphDocumentsSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'timeline-counters-graph-documents',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.GLOBAL,
};

export const timelineCountersGraphNodesSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'timeline-counters-graph-nodes',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.GLOBAL,
};

export const timelineCountersGraphJsEventListenersSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'timeline-counters-graph-js-event-listeners',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.GLOBAL,
};

export const timelineCountersGraphGpuMemoryUsedKbSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'timeline-counters-graph-gpu-memory-used-kb',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.GLOBAL,
};

export const flamechartSelectedNavigationSettingDescriptor: Common.Settings.SettingDescriptor<string> = {
  name: 'flamechart-selected-navigation',
  type: Common.Settings.SettingType.ENUM,
  defaultValue: 'classic',
  storageType: Common.Settings.SettingStorageType.SYNCED,
};
