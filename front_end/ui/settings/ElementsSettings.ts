// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';

export const showUAShadowDOMSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'show-ua-shadow-dom',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const domWordWrapSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'dom-word-wrap',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const showHTMLCommentsSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'show-html-comments',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const highlightNodeOnHoverInOverlaySettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'highlight-node-on-hover-in-overlay',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};
