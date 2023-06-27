// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../../../../front_end/core/platform/platform.js';

import * as Protocol from '../../../../../../../front_end/generated/protocol.js';
import * as PreloadingComponents from '../../../../../../../front_end/panels/application/preloading/components/components.js';
import * as SDK from '../../../../../../../front_end/core/sdk/sdk.js';
import * as Coordinator from '../../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {
  assertShadowRoot,
  renderElementIntoDOM,
} from '../../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const renderUsedPreloadingView = async(data: SDK.PreloadingModel.PreloadingAttempt[]): Promise<HTMLElement> => {
  const component = new PreloadingComponents.UsedPreloadingView.UsedPreloadingView();
  component.data = data;
  renderElementIntoDOM(component);
  assertShadowRoot(component.shadowRoot);
  await coordinator.done();

  return component;
};

describeWithEnvironment('UsedPreloadingView', async () => {
  it('renderes no preloading attempts used', async () => {
    const data: SDK.PreloadingModel.PreloadingAttempt[] = [
      {
        action: Protocol.Preload.SpeculationAction.Prefetch,
        key: {
          loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
          action: Protocol.Preload.SpeculationAction.Prefetch,
          url: 'https://example.com/subresource1.js' as Platform.DevToolsPath.UrlString,
        },
        status: SDK.PreloadingModel.PreloadingStatus.Ready,
        prefetchStatus: null,
        requestId: 'requestId:1' as Protocol.Network.RequestId,
        ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
        nodeIds: [1] as Protocol.DOM.BackendNodeId[],
      },
      {
        action: Protocol.Preload.SpeculationAction.Prefetch,
        key: {
          loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
          action: Protocol.Preload.SpeculationAction.Prefetch,
          url: 'https://example.com/subresource2.js' as Platform.DevToolsPath.UrlString,
        },
        status: SDK.PreloadingModel.PreloadingStatus.Failure,
        prefetchStatus: null,
        requestId: 'requestId:2' as Protocol.Network.RequestId,
        ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
        nodeIds: [1] as Protocol.DOM.BackendNodeId[],
      },
      {
        action: Protocol.Preload.SpeculationAction.Prerender,
        key: {
          loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
          action: Protocol.Preload.SpeculationAction.Prerender,
          url: 'https://example.com/prerendered.html' as Platform.DevToolsPath.UrlString,
        },
        status: SDK.PreloadingModel.PreloadingStatus.Ready,
        prerenderStatus: null,
        disallowedMojoInterface: null,
        ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
        nodeIds: [1] as Protocol.DOM.BackendNodeId[],
      },
    ];

    const component = await renderUsedPreloadingView(data);
    assertShadowRoot(component.shadowRoot);

    assert.include(component.shadowRoot.textContent, 'No preloading was used for this page.');
  });

  it('renderes prefetch used', async () => {
    const data: SDK.PreloadingModel.PreloadingAttempt[] = [
      {
        action: Protocol.Preload.SpeculationAction.Prefetch,
        key: {
          loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
          action: Protocol.Preload.SpeculationAction.Prefetch,
          url: 'https://example.com/subresource1.js' as Platform.DevToolsPath.UrlString,
        },
        status: SDK.PreloadingModel.PreloadingStatus.Success,
        prefetchStatus: null,
        requestId: 'requestId:1' as Protocol.Network.RequestId,
        ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
        nodeIds: [1] as Protocol.DOM.BackendNodeId[],
      },
      {
        action: Protocol.Preload.SpeculationAction.Prefetch,
        key: {
          loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
          action: Protocol.Preload.SpeculationAction.Prefetch,
          url: 'https://example.com/subresource2.js' as Platform.DevToolsPath.UrlString,
        },
        status: SDK.PreloadingModel.PreloadingStatus.Success,
        prefetchStatus: null,
        requestId: 'requestId:2' as Protocol.Network.RequestId,
        ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
        nodeIds: [1] as Protocol.DOM.BackendNodeId[],
      },
      {
        action: Protocol.Preload.SpeculationAction.Prerender,
        key: {
          loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
          action: Protocol.Preload.SpeculationAction.Prerender,
          url: 'https://example.com/prerendered.html' as Platform.DevToolsPath.UrlString,
        },
        status: SDK.PreloadingModel.PreloadingStatus.Ready,
        prerenderStatus: null,
        disallowedMojoInterface: null,
        ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
        nodeIds: [1] as Protocol.DOM.BackendNodeId[],
      },
    ];

    const component = await renderUsedPreloadingView(data);
    assertShadowRoot(component.shadowRoot);

    assert.include(component.shadowRoot.textContent, '2 prefetched resources are used for this page');
  });

  it('renderes prerender used', async () => {
    const data: SDK.PreloadingModel.PreloadingAttempt[] = [
      {
        action: Protocol.Preload.SpeculationAction.Prefetch,
        key: {
          loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
          action: Protocol.Preload.SpeculationAction.Prefetch,
          url: 'https://example.com/subresource1.js' as Platform.DevToolsPath.UrlString,
        },
        status: SDK.PreloadingModel.PreloadingStatus.Ready,
        prefetchStatus: null,
        requestId: 'requestId:1' as Protocol.Network.RequestId,
        ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
        nodeIds: [1] as Protocol.DOM.BackendNodeId[],
      },
      {
        action: Protocol.Preload.SpeculationAction.Prefetch,
        key: {
          loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
          action: Protocol.Preload.SpeculationAction.Prefetch,
          url: 'https://example.com/subresource2.js' as Platform.DevToolsPath.UrlString,
        },
        status: SDK.PreloadingModel.PreloadingStatus.Failure,
        prefetchStatus: Protocol.Preload.PrefetchStatus.PrefetchFailedNon2XX,
        requestId: 'requestId:2' as Protocol.Network.RequestId,
        ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
        nodeIds: [1] as Protocol.DOM.BackendNodeId[],
      },
      {
        action: Protocol.Preload.SpeculationAction.Prerender,
        key: {
          loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
          action: Protocol.Preload.SpeculationAction.Prerender,
          url: 'https://example.com/prerendered.html' as Platform.DevToolsPath.UrlString,
        },
        status: SDK.PreloadingModel.PreloadingStatus.Success,
        prerenderStatus: null,
        disallowedMojoInterface: null,
        ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
        nodeIds: [1] as Protocol.DOM.BackendNodeId[],
      },
    ];

    const component = await renderUsedPreloadingView(data);
    assertShadowRoot(component.shadowRoot);

    assert.include(component.shadowRoot.textContent, 'This page was prerendered');
  });
});
