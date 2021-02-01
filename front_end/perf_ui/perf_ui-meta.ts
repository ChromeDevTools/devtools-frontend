// Copyright 2021 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as i18n from '../i18n/i18n.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as PerfUI from './perf_ui.js';

export const UIStrings = {
  /**
     *@description Title of a setting under the Performance category in Settings
    */
  flamechartMouseWheelAction: 'Flamechart mouse wheel action:',
  /**
     *@description The action to scroll
    */
  scroll: 'Scroll',
  /**
     *@description Text for zooming in
    */
  zoom: 'Zoom',
  /**
     *@description Title of a setting under the Memory category in Settings
    */
  liveMemoryAllocationAnnotations: 'Live memory allocation annotations',
  /**
     *@description Title of a setting under the Memory category that can be invoked through the Command Menu
    */
  showLiveMemoryAllocation: 'Show live memory allocation annotations',
  /**
     *@description Title of a setting under the Memory category that can be invoked through the Command Menu
    */
  hideLiveMemoryAllocation: 'Hide live memory allocation annotations',
  /**
     *@description Title of an action in the components tool to collect garbage
    */
  collectGarbage: 'Collect garbage',
};

const str_ = i18n.i18n.registerUIStrings('perf_ui/perf_ui-meta.ts', UIStrings);
const i18nString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedPerfUIModule: (typeof PerfUI|undefined);

async function loadPerfUIModule(): Promise<typeof PerfUI> {
  if (!loadedPerfUIModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('perf_ui');
    loadedPerfUIModule = await import('./perf_ui.js');
  }
  return loadedPerfUIModule;
}

UI.ActionRegistration.registerActionExtension({
  actionId: 'components.collect-garbage',
  category: UI.ActionRegistration.ActionCategory.PERFORMANCE,
  title: i18nString(UIStrings.collectGarbage),
  iconClass: UI.ActionRegistration.IconClass.LARGEICON_TRASH_BIN,
  async loadActionDelegate() {
    const PerfUI = await loadPerfUIModule();
    return PerfUI.GCActionDelegate.GCActionDelegate.instance();
  },
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.PERFORMANCE,
  title: i18nString(UIStrings.flamechartMouseWheelAction),
  settingName: 'flamechartMouseWheelAction',
  settingType: Common.Settings.SettingTypeObject.ENUM,
  defaultValue: 'zoom',
  options: [
    {
      title: i18nString(UIStrings.scroll),
      text: i18nString(UIStrings.scroll),
      value: 'scroll',
    },
    {
      title: i18nString(UIStrings.zoom),
      text: i18nString(UIStrings.zoom),
      value: 'zoom',
    },
  ],
});

Common.Settings.registerSettingExtension({
  category: Common.Settings.SettingCategoryObject.MEMORY,
  experiment: Root.Runtime.ExperimentName.LIVE_HEAP_PROFILE,
  title: i18nString(UIStrings.liveMemoryAllocationAnnotations),
  settingName: 'memoryLiveHeapProfile',
  settingType: Common.Settings.SettingTypeObject.BOOLEAN,
  defaultValue: false,
  options: [
    {
      value: true,
      title: i18nString(UIStrings.showLiveMemoryAllocation),
    },
    {
      value: false,
      title: i18nString(UIStrings.hideLiveMemoryAllocation),
    },
  ],
});
