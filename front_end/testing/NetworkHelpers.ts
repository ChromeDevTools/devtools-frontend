// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../core/platform/platform.js';
import * as Network from '../panels/network/network.js';
import * as RenderCoordinator from '../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../ui/legacy/legacy.js';

import {renderElementIntoDOM} from './DOMHelpers.js';
import {
  registerActions,
} from './EnvironmentHelpers.js';

export async function createNetworkPanelForMockConnection(): Promise<Network.NetworkPanel.NetworkPanel> {
  registerActions([
    {
      actionId: 'network.clear',
      category: UI.ActionRegistration.ActionCategory.NETWORK,
      title: () => 'Clear network log' as Platform.UIString.LocalizedString,
      async loadActionDelegate() {
        return new Network.NetworkPanel.ActionDelegate();
      },
      contextTypes() {
        return [Network.NetworkPanel.NetworkPanel];
      },
    },
    {
      actionId: 'network.toggle-recording',
      category: UI.ActionRegistration.ActionCategory.NETWORK,
      title: () => 'Record network log' as Platform.UIString.LocalizedString,
    },
    {
      actionId: 'inspector-main.reload',
      category: UI.ActionRegistration.ActionCategory.NONE,
      title: () => 'Reload' as Platform.UIString.LocalizedString,
    },
    {
      actionId: 'network.search',
      category: UI.ActionRegistration.ActionCategory.NETWORK,
      title: () => 'Search' as Platform.UIString.LocalizedString,
    },
  ]);

  const networkPanel = Network.NetworkPanel.NetworkPanel.instance({forceNew: true, displayScreenshotDelay: 0});
  renderElementIntoDOM(networkPanel, {allowMultipleChildren: true});
  await RenderCoordinator.done();
  return networkPanel;
}
