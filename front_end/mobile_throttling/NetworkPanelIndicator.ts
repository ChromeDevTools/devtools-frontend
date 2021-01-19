// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

/* eslint-disable rulesdir/no_underscored_properties */

import * as i18n from '../i18n/i18n.js';
import * as SDK from '../sdk/sdk.js';
import * as UI from '../ui/ui.js';

export const UIStrings = {
  /**
  *@description Icon title in Network Panel Indicator of the Network panel
  */
  networkThrottlingIsEnabled: 'Network throttling is enabled',
  /**
  *@description Icon title in Network Panel Indicator of the Network panel
  */
  requestsMayBeRewrittenByLocal: 'Requests may be rewritten by local overrides',
  /**
  *@description Icon title in Network Panel Indicator of the Network panel
  */
  requestsMayBeBlocked: 'Requests may be blocked',
};
const str_ = i18n.i18n.registerUIStrings('mobile_throttling/NetworkPanelIndicator.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);
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

    function updateVisibility(): void {
      let icon: UI.Icon.Icon|null = null;
      if (manager.isThrottling()) {
        icon = UI.Icon.Icon.create('smallicon-warning');
        UI.Tooltip.Tooltip.install(icon, i18nString(UIStrings.networkThrottlingIsEnabled));
      } else if (SDK.NetworkManager.MultitargetNetworkManager.instance().isIntercepting()) {
        icon = UI.Icon.Icon.create('smallicon-warning');
        UI.Tooltip.Tooltip.install(icon, i18nString(UIStrings.requestsMayBeRewrittenByLocal));
      } else if (manager.isBlocking()) {
        icon = UI.Icon.Icon.create('smallicon-warning');
        UI.Tooltip.Tooltip.install(icon, i18nString(UIStrings.requestsMayBeBlocked));
      }
      UI.InspectorView.InspectorView.instance().setPanelIcon('network', icon);
    }
  }
}
