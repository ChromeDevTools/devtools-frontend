// Copyright 2017 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Common from '../../core/common/common.js';
import * as i18n from '../../core/i18n/i18n.js';
import * as SDK from '../../core/sdk/sdk.js';
import * as UI from '../../ui/legacy/legacy.js';

const UIStrings = {
  /**
   *@description Icon title in Network Panel Indicator of the Network panel
   */
  networkThrottlingIsEnabled: 'Network throttling is enabled',
  /**
   *@description Icon title in Network Panel Indicator of the Network panel
   */
  requestsMayBeOverridden: 'Requests may be overridden locally, see the Sources panel',
  /**
   *@description Icon title in Network Panel Indicator of the Network panel
   */
  requestsMayBeBlocked: 'Requests may be blocked, see the Network request blocking panel',
  /**
   * @description Title of an icon in the Network panel that indicates that accepted content encodings have been overriden.
   */
  acceptedEncodingOverrideSet:
      'The set of accepted `Content-Encoding` headers has been modified by DevTools, see the Network conditions panel',
};
const str_ = i18n.i18n.registerUIStrings('panels/mobile_throttling/NetworkPanelIndicator.ts', UIStrings);
const i18nString = i18n.i18n.getLocalizedString.bind(undefined, str_);

export class NetworkPanelIndicator {
  constructor() {
    // TODO: we should not access network from other modules.
    if (!UI.InspectorView.InspectorView.instance().hasPanel('network')) {
      return;
    }
    const manager = SDK.NetworkManager.MultitargetNetworkManager.instance();
    manager.addEventListener(SDK.NetworkManager.MultitargetNetworkManager.Events.CONDITIONS_CHANGED, updateVisibility);
    manager.addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.BLOCKED_PATTERNS_CHANGED, updateVisibility);
    manager.addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.INTERCEPTORS_CHANGED, updateVisibility);
    manager.addEventListener(
        SDK.NetworkManager.MultitargetNetworkManager.Events.ACCEPTED_ENCODINGS_CHANGED, updateVisibility);
    Common.Settings.Settings.instance().moduleSetting('cache-disabled').addChangeListener(updateVisibility, this);

    updateVisibility();

    function updateVisibility(): void {
      const warnings = [];
      if (manager.isThrottling()) {
        warnings.push(i18nString(UIStrings.networkThrottlingIsEnabled));
      }
      if (SDK.NetworkManager.MultitargetNetworkManager.instance().isIntercepting()) {
        warnings.push(i18nString(UIStrings.requestsMayBeOverridden));
      }
      if (manager.isBlocking()) {
        warnings.push(i18nString(UIStrings.requestsMayBeBlocked));
      }
      if (manager.isAcceptedEncodingOverrideSet()) {
        warnings.push(i18nString(UIStrings.acceptedEncodingOverrideSet));
      }
      UI.InspectorView.InspectorView.instance().setPanelWarnings('network', warnings);
    }
  }
}
