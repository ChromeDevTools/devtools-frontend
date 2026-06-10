// Copyright 2026 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assert} from 'chai';

import * as SDK from '../../../core/sdk/sdk.js';
import {renderElementIntoDOM} from '../../../testing/DOMHelpers.js';
import {createTarget} from '../../../testing/EnvironmentHelpers.js';
import {MockCDPConnection} from '../../../testing/MockCDPConnection.js';
import {describeWithMockConnection} from '../../../testing/MockConnection.js';

import * as ApplicationComponents from './components.js';

describeWithMockConnection('AdsView', () => {
  let target: SDK.Target.Target;
  let connection: MockCDPConnection;

  beforeEach(() => {
    connection = new MockCDPConnection();
    connection.setSuccessHandler('Ads.getAdMetrics', () => ({
                                                       metrics: {
                                                         viewportAdDensityByArea: 10,
                                                         averageViewportAdDensityByArea: 5,
                                                         viewportAdCount: 5,
                                                         averageViewportAdCount: 2,
                                                         totalAdCpuTime: 150,
                                                         totalAdNetworkBytes: 2048,
                                                       }
                                                     }));

    const tabTarget = createTarget({type: SDK.Target.Type.TAB, connection});
    createTarget({parentTarget: tabTarget, subtype: 'prerender'});
    target = createTarget({parentTarget: tabTarget});
  });

  it('renders initial state correctly', async () => {
    const panel = new ApplicationComponents.AdsView.AdsView();
    await panel.updateComplete;
    assert.include(panel.contentElement.textContent, 'Viewport ad density');
    assert.include(panel.contentElement.textContent, '0%');
    assert.include(panel.contentElement.textContent, '0.00%');
    assert.include(panel.contentElement.textContent, '0');
    assert.include(panel.contentElement.textContent, '0.00');
    assert.include(panel.contentElement.textContent, '0\xa0B');
    assert.include(panel.contentElement.textContent, '0.0\xa0ms');
  });

  it('polls and renders ad metrics', async () => {
    const panel = new ApplicationComponents.AdsView.AdsView();
    renderElementIntoDOM(panel);

    // Wait for the initial poll to resolve
    await new Promise(resolve => setTimeout(resolve, 0));
    await panel.updateComplete;

    assert.include(panel.contentElement.textContent, '10%');
    assert.include(panel.contentElement.textContent, '5.00%');
    assert.include(panel.contentElement.textContent, '5');
    assert.include(panel.contentElement.textContent, '2.00');
    assert.include(panel.contentElement.textContent, '2.0\xa0kB');
    assert.include(panel.contentElement.textContent, '150.0\xa0ms');

    panel.detach();
  });

  it('clears metrics on primary page changed', async () => {
    const panel = new ApplicationComponents.AdsView.AdsView();
    renderElementIntoDOM(panel);

    const resourceTreeModel = target.model(SDK.ResourceTreeModel.ResourceTreeModel);
    assert.exists(resourceTreeModel);

    // Wait for the initial poll to resolve
    await new Promise(resolve => setTimeout(resolve, 0));
    await panel.updateComplete;
    assert.include(panel.contentElement.textContent, '10%');  // verify data was loaded

    // Simulate primary page changed, but first update the mock to return 0
    connection.setHandler('Ads.getAdMetrics', null);
    connection.setSuccessHandler('Ads.getAdMetrics', () => ({
                                                       metrics: {
                                                         viewportAdDensityByArea: 0,
                                                         averageViewportAdDensityByArea: 0,
                                                         viewportAdCount: 0,
                                                         averageViewportAdCount: 0,
                                                         totalAdCpuTime: 0,
                                                         totalAdNetworkBytes: 0,
                                                       }
                                                     }));

    resourceTreeModel.dispatchEventToListeners(SDK.ResourceTreeModel.Events.PrimaryPageChanged, {
      frame: {} as SDK.ResourceTreeModel.ResourceTreeFrame,
      type: SDK.ResourceTreeModel.PrimaryPageChangeType.NAVIGATION,
    });

    await panel.updateComplete;
    // Should be reset to 0s
    assert.include(panel.contentElement.textContent, 'Viewport ad density');
    assert.include(panel.contentElement.textContent, '0%');
    assert.include(panel.contentElement.textContent, '0.00%');
    assert.include(panel.contentElement.textContent, '0');
    assert.include(panel.contentElement.textContent, '0.00');
    assert.include(panel.contentElement.textContent, '0\xa0B');
    assert.include(panel.contentElement.textContent, '0.0\xa0ms');

    panel.detach();
  });
});
