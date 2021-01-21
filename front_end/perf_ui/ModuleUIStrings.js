// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
export const UIStrings = {
  /**
  *@description Text for the performance of something
  */
  performance: 'Performance',
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
  *@description Text for the memory of the page
  */
  memory: 'Memory',
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
i18n.i18n.registerUIStrings('perf_ui/ModuleUIStrings.js', UIStrings);
