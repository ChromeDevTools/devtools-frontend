// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../common/common.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

export class NetworkPanelIndicator {
  constructor() {
    // TODO: we should not access network from other modules.
    if (!UI.InspectorView.InspectorView.instance().hasPanel('network')) {
      return;
    }
    const manager = SDK.NetworkManager.MultitargetNetworkManager.instance();
    manager.addEventListener(SDK.NetworkManager.MultitargetNetworkManager.Events.ConditionsChanged, updateVisibility);
    manager.addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.BlockedPatternsChanged, updateVisibility);
    manager.addEventListener(SDK.NetworkManager.MultitargetNetworkManager.Events.InterceptorsChanged, updateVisibility);
    updateVisibility();

    function updateVisibility() {
      let icon = null;
      if (manager.isThrottling()) {
        icon = UI.Icon.Icon.create('smallicon-warning');
        icon.title = Common.UIString.UIString('Network throttling is enabled');
      } else if (SDK.NetworkManager.MultitargetNetworkManager.instance().isIntercepting()) {
        icon = UI.Icon.Icon.create('smallicon-warning');
        icon.title = Common.UIString.UIString('Requests may be rewritten by local overrides');
      } else if (manager.isBlocking()) {
        icon = UI.Icon.Icon.create('smallicon-warning');
        icon.title = Common.UIString.UIString('Requests may be blocked');
      }
      UI.InspectorView.InspectorView.instance().setPanelIcon('network', icon);
    }
  }
}
