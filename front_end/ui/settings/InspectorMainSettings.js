// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Common from '../../core/common/common.js';
export const adBlockingEnabledSettingDescriptor = {
    name: 'network.ad-blocking-enabled',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    storageType: "Session" /* Common.Settings.SettingStorageType.SESSION */,
};
export const autoAttachToCreatedPagesSettingDescriptor = {
    name: 'auto-attach-to-created-pages',
    type: "boolean" /* Common.Settings.SettingType.BOOLEAN */,
    defaultValue: false,
    storageType: "Synced" /* Common.Settings.SettingStorageType.SYNCED */,
};
//# sourceMappingURL=InspectorMainSettings.js.map