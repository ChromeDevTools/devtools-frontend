// Copyright 2021 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../../../core/common/common.js';
import * as i18n from '../../../../core/i18n/i18n.js';
import * as UI from '../../legacy.js';

import type * as PerfUI from './perf_ui.js';

const UIStrings = {
  /**
   * @description Title of a setting under the Performance category in Settings to select the navigation style for the Performance panel.
   */
  flamechartSelectedNavigation: 'Flamechart navigation:',
  /**
   * @description Setting option for modern flame chart navigation in the Performance panel.
   */
  modern: 'Modern',
  /**
   * @description Setting option for classic flame chart navigation in the Performance panel.
   */
  classic: 'Classic',
  /**
   * @description Action title to trigger garbage collection.
   */
  collectGarbage: 'Collect garbage',
} as const;

const str_ = i18n.i18n.registerUIStrings('ui/legacy/components/perf_ui/perf_ui-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedPerfUIModule: (typeof PerfUI|undefined);

async function loadPerfUIModule(): Promise<typeof PerfUI> {
  if (!loadedPerfUIModule) {
    loadedPerfUIModule = await import('./perf_ui.js');
  }
  return loadedPerfUIModule;
}

UI.ActionRegistration.registerActionExtension({
  actionId: 'components.collect-garbage',
  category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
  title: i18nLazyString(UIStrings.collectGarbage),
  iconClass: UI.ActionRegistration.IconClass.MOP,
  async loadActionDelegate() {
    const PerfUI = await loadPerfUIModule();
    return new PerfUI.GCActionDelegate.GCActionDelegate();
  },
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategory.PERFORMANCE,
  storageType: Common.Settings.SettingStorageType.SYNCED,
  title: i18nLazyString(UIStrings.flamechartSelectedNavigation),
  settingName: 'flamechart-selected-navigation',
  settingType: Common.Settings.SettingType.ENUM,
  defaultValue: 'classic',
  options: [
    {
      title: i18nLazyString(UIStrings.modern),
      text: i18nLazyString(UIStrings.modern),
      value: 'modern',
    },
    {
      title: i18nLazyString(UIStrings.classic),
      text: i18nLazyString(UIStrings.classic),
      value: 'classic',
    },
  ],
});
