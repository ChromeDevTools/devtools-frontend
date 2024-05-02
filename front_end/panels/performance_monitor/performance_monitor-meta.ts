// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../core/i18n/i18n.js';
import * as UI from '../../ui/legacy/legacy.js';

import type * as PerformanceMonitor from './performance_monitor.js';

const UIStrings = {
  /**
   *@description Title of the 'Performance monitor' tool in the bottom drawer
   */
  performanceMonitor: 'Performance monitor',
  /**
   *@description A tag of Performance Monitor that can be searched in the command menu
   */
  performance: 'performance',
  /**
   *@description A tag of Performance Monitor that can be searched in the command menu
   */
  systemMonitor: 'system monitor',
  /**
   *@description A tag of Performance Monitor that can be searched in the command menu
   */
  monitor: 'monitor',
  /**
   *@description A tag of Performance Monitor that can be searched in the command menu
   */
  activity: 'activity',
  /**
   *@description A tag of Performance Monitor that can be searched in the command menu
   */
  metrics: 'metrics',
  /**
   *@description Command for showing the 'Performance monitor' tool in the bottom drawer
   */
  showPerformanceMonitor: 'Show Performance monitor',
};

const str_ = i18n.i18n.registerUIStrings('panels/performance_monitor/performance_monitor-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedPerformanceMonitorModule: (typeof PerformanceMonitor|undefined);

async function loadPerformanceMonitorModule(): Promise<typeof PerformanceMonitor> {
  if (!loadedPerformanceMonitorModule) {
    loadedPerformanceMonitorModule = await import('./performance_monitor.js');
  }
  return loadedPerformanceMonitorModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'performance.monitor',
  title: i18nLazyString(UIStrings.performanceMonitor),
  commandPrompt: i18nLazyString(UIStrings.showPerformanceMonitor),
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  order: 100,
  async loadView() {
    const PerformanceMonitor = await loadPerformanceMonitorModule();
    return new PerformanceMonitor.PerformanceMonitor.PerformanceMonitorImpl();
  },
  tags: [
    i18nLazyString(UIStrings.performance),
    i18nLazyString(UIStrings.systemMonitor),
    i18nLazyString(UIStrings.monitor),
    i18nLazyString(UIStrings.activity),
    i18nLazyString(UIStrings.metrics),
  ],
});
