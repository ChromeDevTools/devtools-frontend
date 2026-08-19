// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';

const UIStrings = {
  /**
   * @description Title of a setting under the Appearance category in Settings. When the webpage is
   * paused by devtools, an overlay is shown on top of the page to indicate that it is paused. The
   * overlay is a pause/unpause button and some text, which appears on top of the paused page. This
   * setting turns off this overlay.
   */
  disablePaused: 'Disable paused state overlay',
} as const;
const str_ = i18n.i18n.registerUIStrings('core/sdk/sdk-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.APPEARANCE,
  storageType: Common.Settings.SettingStorageType.SYNCED,
  title: i18nLazyString(UIStrings.disablePaused),
  settingName: 'disable-paused-state-overlay',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
});
