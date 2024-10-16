// Copyright 2024 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../core/common/common.js';
import * as Network from '../panels/network/network.js';
import * as Coordinator from '../ui/components/render_coordinator/render_coordinator.js';

import {
  registerNoopActions,
} from './EnvironmentHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

export async function createNetworkPanelForMockConnection(): Promise<Network.NetworkPanel.NetworkPanel> {
  registerNoopActions(['network.toggle-recording', 'network.clear']);

  const dummyStorage = new Common.Settings.SettingsStorage({});
  for (const settingName
           of ['network-color-code-resource-types', 'network.group-by-frame', 'network-record-film-strip-setting']) {
    Common.Settings.registerSettingExtension({
      settingName,
      settingType: Common.Settings.SettingType.BOOLEAN,
      defaultValue: false,
    });
  }
  Common.Settings.Settings.instance({
    forceNew: true,
    syncedStorage: dummyStorage,
    globalStorage: dummyStorage,
    localStorage: dummyStorage,
  });
  const networkPanel = Network.NetworkPanel.NetworkPanel.instance({forceNew: true, displayScreenshotDelay: 0});
  networkPanel.markAsRoot();
  networkPanel.show(document.body);
  await coordinator.done();
  return networkPanel;
}
