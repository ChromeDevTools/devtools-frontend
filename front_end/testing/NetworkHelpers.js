// Copyright 2024 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.
import * as Network from '../panels/network/network.js';
import * as RenderCoordinator from '../ui/components/render_coordinator/render_coordinator.js';
import * as UI from '../ui/legacy/legacy.js';
import { renderElementIntoDOM } from './DOMHelpers.js';
import { registerActions, } from './EnvironmentHelpers.js';
export async function createNetworkPanelForMockConnection() {
    registerActions([
        {
            actionId: 'network.clear',
            category: "NETWORK" /* UI.ActionRegistration.ActionCategory.NETWORK */,
            title: () => 'Clear network log',
            async loadActionDelegate() {
                return new Network.NetworkPanel.ActionDelegate();
            },
            contextTypes() {
                return [Network.NetworkPanel.NetworkPanel];
            },
        },
        {
            actionId: 'network.toggle-recording',
            category: "NETWORK" /* UI.ActionRegistration.ActionCategory.NETWORK */,
            title: () => 'Record network log',
        },
        {
            actionId: 'inspector-main.reload',
            category: "" /* UI.ActionRegistration.ActionCategory.NONE */,
            title: () => 'Reload',
        },
        {
            actionId: 'network.search',
            category: "NETWORK" /* UI.ActionRegistration.ActionCategory.NETWORK */,
            title: () => 'Search',
        },
    ]);
    const networkPanel = Network.NetworkPanel.NetworkPanel.instance({ forceNew: true, displayScreenshotDelay: 0 });
    renderElementIntoDOM(networkPanel, { allowMultipleChildren: true });
    await RenderCoordinator.done();
    return networkPanel;
}
//# sourceMappingURL=NetworkHelpers.js.map