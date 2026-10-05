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

export const showDetailedInspectTooltipSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'show-detailed-inspect-tooltip',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const cssAnimationsOnlyWhenAnimationsTabOpenSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'css-animations-only-when-animations-tab-open',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const collapseNonContributingCSSRulesSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'collapse-non-contributing-css-rules',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const showInactiveCSSRulesSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'show-inactive-css-rules',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const showEventListenersForAncestorsSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'show-event-listeners-for-ancestors',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
};

export interface AdornerSetting {
  adorner: string;
  isEnabled: boolean;
}

export const adornerSettingsSettingDescriptor: Common.Settings.SettingDescriptor<AdornerSetting[]> = {
  name: 'adorner-settings',
  type: Common.Settings.SettingType.ARRAY,
  defaultValue: [],
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const showCSSPropertyDocumentationOnHoverSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'show-css-property-documentation-on-hover',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SYNCED,
};

export const showFrameworkListenersSettingDescriptor: Common.Settings.SettingDescriptor<boolean> = {
  name: 'show-frameowkr-listeners',
  type: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.GLOBAL,
};
