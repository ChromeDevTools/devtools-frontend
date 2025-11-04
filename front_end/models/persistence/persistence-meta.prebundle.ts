// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';

const UIStrings = {
  /**
   * @description Title of a setting under the Persistence category in Settings
   */
  enableLocalOverrides: 'Enable Local Overrides',
  /**
   * @description A tag of Enable Local Overrides setting that can be searched in the command menu
   */
  interception: 'interception',
  /**
   * @description A tag of Enable Local Overrides setting that can be searched in the command menu
   */
  override: 'override',
  /**
   * @description A tag of Group Network by frame setting that can be searched in the command menu
   */
  network: 'network',
  /**
   * @description A tag of Enable Local Overrides setting that can be searched in the command menu
   */
  rewrite: 'rewrite',
  /**
   * @description A tag of Enable Local Overrides setting that can be searched in the command menu.
   *Noun for network request.
   */
  request: 'request',
  /**
   * @description Title of a setting under the Persistence category that can be invoked through the Command Menu
   */
  enableOverrideNetworkRequests: 'Enable override network requests',
  /**
   * @description Title of a setting under the Persistence category that can be invoked through the Command Menu
   */
  disableOverrideNetworkRequests: 'Disable override network requests',
} as const;
const str_ = i18n.i18n.registerUIStrings('models/persistence/persistence-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.PERSISTENCE,
  title: i18nLazyString(UIStrings.enableLocalOverrides),
  settingName: 'persistence-network-overrides-enabled',
  settingType: Common.Settings.SettingType.BOOLEAN,
  defaultValue: false,
  tags: [
    i18nLazyString(UIStrings.interception),
    i18nLazyString(UIStrings.override),
    i18nLazyString(UIStrings.network),
    i18nLazyString(UIStrings.rewrite),
    i18nLazyString(UIStrings.request),
  ],
  options: [
    {
      value: true,
      title: i18nLazyString(UIStrings.enableOverrideNetworkRequests),
    },
    {
      value: false,
      title: i18nLazyString(UIStrings.disableOverrideNetworkRequests),
    },
  ],
});
