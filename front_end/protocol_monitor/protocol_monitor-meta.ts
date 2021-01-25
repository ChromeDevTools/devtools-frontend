// Copyright 2020 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../i18n/i18n.js';
import * as Root from '../root/root.js';
import * as UI from '../ui/ui.js';

// eslint-disable-next-line rulesdir/es_modules_import
import type * as ProtocolMonitor from './protocol_monitor.js';

export const UIStrings = {
  /**
  *@description Title of the 'Protocol monitor' tool in the bottom drawer
  */
  protocolMonitor: 'Protocol monitor',
  /**
  *@description Command for showing the 'Protocol monitor' tool in the bottom drawer
  */
  showProtocolMonitor: 'Show Protocol monitor',
};
const str_ = i18n.i18n.registerUIStrings('protocol_monitor/protocol_monitor-meta.ts', UIStrings);
const i18nString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedProtocolMonitorModule: (typeof ProtocolMonitor|undefined);

async function loadProtocolMonitorModule(): Promise<typeof ProtocolMonitor> {
  if (!loadedProtocolMonitorModule) {
    // Side-effect import resources in module.json
    await Root.Runtime.Runtime.instance().loadModulePromise('protocol_monitor');
    loadedProtocolMonitorModule = await import('./protocol_monitor.js');
  }
  return loadedProtocolMonitorModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.DRAWER_VIEW,
  id: 'protocol-monitor',
  title: i18nString(UIStrings.protocolMonitor),
  commandPrompt: i18nString(UIStrings.showProtocolMonitor),
  order: 100,
  persistence: UI.ViewManager.ViewPersistence.CLOSEABLE,
  async loadView() {
    const ProtocolMonitor = await loadProtocolMonitorModule();
    return ProtocolMonitor.ProtocolMonitor.ProtocolMonitorImpl.instance();
  },
  experiment: Root.Runtime.ExperimentName.PROTOCOL_MONITOR,
});
