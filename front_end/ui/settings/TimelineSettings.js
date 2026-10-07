// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
export const timelineShowAllEventsSettingDescriptor = {
    name: 'timeline-show-all-events',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const timelineDebugModeSettingDescriptor = {
    name: 'timeline-debug-mode',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const annotationsHiddenSettingDescriptor = {
    name: 'annotations-hidden',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const timelineInvalidationTrackingSettingDescriptor = {
    name: 'timeline-invalidation-tracking',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
export const timelineDisableJsSamplingSettingDescriptor = {
    name: 'timeline-disable-js-sampling',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    storageType: "Session" /* Common.Settings.SettingStorageType.SESSION */,
};
export const timelineCaptureLayersAndPicturesSettingDescriptor = {
    name: 'timeline-capture-layers-and-pictures',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    storageType: "Session" /* Common.Settings.SettingStorageType.SESSION */,
};
export const timelineCaptureSelectorStatsSettingDescriptor = {
    name: 'timeline-capture-selector-stats',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    storageType: "Session" /* Common.Settings.SettingStorageType.SESSION */,
};
export const timelineScreenshotCaptureModeSettingDescriptor = {
    name: 'timeline-screenshot-capture-mode',
    type: "enum" /* Common.Settings.SettingType.ENUM */,
    defaultValue: 'auto',
    storageType: "Session" /* Common.Settings.SettingStorageType.SESSION */,
};
export const timelineShowScreenshotsSettingDescriptor = {
    name: 'timeline-show-screenshots',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Global" /* Common.Settings.SettingStorageType.GLOBAL */,
};
export const timelineShowMemorySettingDescriptor = {
    name: 'timeline-show-memory',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    storageType: "Session" /* Common.Settings.SettingStorageType.SESSION */,
};
export const timelineDimThirdPartiesSettingDescriptor = {
    name: 'timeline-dim-third-parties',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    storageType: "Session" /* Common.Settings.SettingStorageType.SESSION */,
};
export const timelineShowExtensionDataSettingDescriptor = {
    name: 'timeline-show-extension-data',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Global" /* Common.Settings.SettingStorageType.GLOBAL */,
};
export const timelineCountersGraphJsHeapSizeUsedSettingDescriptor = {
    name: 'timeline-counters-graph-js-heap-size-used',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Global" /* Common.Settings.SettingStorageType.GLOBAL */,
};
export const timelineCountersGraphDocumentsSettingDescriptor = {
    name: 'timeline-counters-graph-documents',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Global" /* Common.Settings.SettingStorageType.GLOBAL */,
};
export const timelineCountersGraphNodesSettingDescriptor = {
    name: 'timeline-counters-graph-nodes',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Global" /* Common.Settings.SettingStorageType.GLOBAL */,
};
export const timelineCountersGraphJsEventListenersSettingDescriptor = {
    name: 'timeline-counters-graph-js-event-listeners',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Global" /* Common.Settings.SettingStorageType.GLOBAL */,
};
export const timelineCountersGraphGpuMemoryUsedKbSettingDescriptor = {
    name: 'timeline-counters-graph-gpu-memory-used-kb',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Global" /* Common.Settings.SettingStorageType.GLOBAL */,
};
export const flamechartSelectedNavigationSettingDescriptor = {
    name: 'flamechart-selected-navigation',
    type: "enum" /* Common.Settings.SettingType.ENUM */,
    defaultValue: 'classic',
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
//# sourceMappingURL=TimelineSettings.js.map