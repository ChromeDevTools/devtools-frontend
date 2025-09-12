// Copyright 2020 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as i18n from '../../../core/i18n/i18n.js';
import * as UI from '../../../ui/legacy/legacy.js';

import type * as Emulation from './emulation.js';

const UIStrings = {
  /**
   * @description Title of the Devices tab/tool. Devices refers to e.g. phones/tablets.
   */
  devices: 'Devices',
  /**
   * @description Command that opens the device emulation view.
   */
  showDevices: 'Show Devices',
} as const;

const str_ = i18n.i18n.registerUIStrings('panels/settings/emulation/emulation-meta.ts', UIStrings);
const i18nLazyString = i18n.i18n.getLazilyComputedLocalizedString.bind(undefined, str_);

let loadedEmulationModule: (typeof Emulation|undefined);

async function loadEmulationModule(): Promise<typeof Emulation> {
  if (!loadedEmulationModule) {
    loadedEmulationModule = await import('./emulation.js');
  }
  return loadedEmulationModule;
}

UI.ViewManager.registerViewExtension({
  location: UI.ViewManager.ViewLocationValues.SETTINGS_VIEW,
  commandPrompt: i18nLazyString(UIStrings.showDevices),
  title: i18nLazyString(UIStrings.devices),
  order: 30,
  async loadView() {
    const Emulation = await loadEmulationModule();
    return new Emulation.DevicesSettingsTab.DevicesSettingsTab();
  },
  id: 'devices',
  settings: [
    'standard-emulated-device-list',
    'custom-emulated-device-list',
  ],
  iconName: 'devices',
});
