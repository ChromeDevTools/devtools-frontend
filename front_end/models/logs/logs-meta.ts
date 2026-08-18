// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';

const UIStrings = {
  /**
   * @description Title of an action in the network tool to toggle recording.
   */
  recordNetworkLog: 'Record network log',
} as const;
const str_ = i18n.i18n.registerUIStrings('models/logs/logs-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.NETWORK,
  title: i18nLazyString(UIStrings.recordNetworkLog),
  settingName: 'network-log.record-log',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: true,
  storageType: Common.Settings.SettingStorageType.SESSION,
});
