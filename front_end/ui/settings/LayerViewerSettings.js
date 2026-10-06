// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
export const showPaintsSettingDescriptor = {
    name: 'frame-viewer-show-paints',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    storageType: "Global" /* Common.Settings.SettingStorageType.GLOBAL */,
};
export const showSlowScrollRectsSettingDescriptor = {
    name: 'frame-viewer-show-slow-scroll-rects',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Global" /* Common.Settings.SettingStorageType.GLOBAL */,
};
export const chromeWindowSettingDescriptor = {
    name: 'frame-viewer-chrome-window',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: true,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
//# sourceMappingURL=LayerViewerSettings.js.map