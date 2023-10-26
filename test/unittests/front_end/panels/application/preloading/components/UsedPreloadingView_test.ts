// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../../../../front_end/core/platform/platform.js';

import * as Protocol from '../../../../../../../front_end/generated/protocol.js';
import * as PreloadingComponents from '../../../../../../../front_end/panels/application/preloading/components/components.js';
import * as SDK from '../../../../../../../front_end/core/sdk/sdk.js';
import * as Coordinator from '../../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {assertNotNullOrUndefined} from '../../../../../../../front_end/core/platform/platform.js';
import * as ReportView from '../../../../../../../front_end/ui/components/report_view/report_view.js';
import {
  assertShadowRoot,
  getElementsWithinComponent,
  renderElementIntoDOM,
} from '../../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const renderUsedPreloadingView =
    async(data: PreloadingComponents.UsedPreloadingView.UsedPreloadingViewData): Promise<HTMLElement> => {
  const component = new PreloadingComponents.UsedPreloadingView.UsedPreloadingView();
  component.data = data;
  renderElementIntoDOM(component);
  assertShadowRoot(component.shadowRoot);
  await coordinator.done();

  return component;
};

describeWithEnvironment('UsedPreloadingView', async () => {
  it('renderes prefetch used', async () => {
    const data: PreloadingComponents.UsedPreloadingView.UsedPreloadingViewData = {
      pageURL: 'https://example.com/prefetched.html' as Platform.DevToolsPath.UrlString,
      attempts: [
        {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/prefetched.html' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.Success,
          prefetchStatus: null,
          requestId: 'requestId:1' as Protocol.Network.RequestId,
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
          status: SDK.PreloadingModel.PreloadingStatus.Failure,
          prerenderStatus: Protocol.Preload.PrerenderFinalStatus.TriggerDestroyed,
          disallowedMojoInterface: null,
          ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        },
      ],
    };

    const component = await renderUsedPreloadingView(data);
    assertShadowRoot(component.shadowRoot);
    const headers = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section-header', ReportView.ReportView.ReportSectionHeader);
    const sections = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section', ReportView.ReportView.ReportSection);

    assert.strictEqual(headers.length, 1);
    assert.strictEqual(sections.length, 2);

    assert.include(headers[0]?.textContent, 'Speculative loading status');
    assert.include(sections[0]?.textContent, 'This page was successfully prefetched.');
  });

  it('renderes prerender used', async () => {
    const data: PreloadingComponents.UsedPreloadingView.UsedPreloadingViewData = {
      pageURL: 'https://example.com/prerendered.html' as Platform.DevToolsPath.UrlString,
      attempts: [
        {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/prefetched.html' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.Ready,
          prefetchStatus: null,
          requestId: 'requestId:1' as Protocol.Network.RequestId,
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
      ],
    };

    const component = await renderUsedPreloadingView(data);
    assertShadowRoot(component.shadowRoot);
    const headers = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section-header', ReportView.ReportView.ReportSectionHeader);
    const sections = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section', ReportView.ReportView.ReportSection);

    assert.strictEqual(headers.length, 1);
    assert.strictEqual(sections.length, 2);

    assert.include(headers[0]?.textContent, 'Speculative loading status');
    assert.include(sections[0]?.textContent, 'This page was successfully prerendered.');
  });

  it('renderes prefetch failed', async () => {
    const data: PreloadingComponents.UsedPreloadingView.UsedPreloadingViewData = {
      pageURL: 'https://example.com/prefetched.html' as Platform.DevToolsPath.UrlString,
      attempts: [
        {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/prefetched.html' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.Failure,
          prefetchStatus: Protocol.Preload.PrefetchStatus.PrefetchFailedPerPageLimitExceeded,
          requestId: 'requestId:1' as Protocol.Network.RequestId,
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
          status: SDK.PreloadingModel.PreloadingStatus.Failure,
          prerenderStatus: Protocol.Preload.PrerenderFinalStatus.TriggerDestroyed,
          disallowedMojoInterface: null,
          ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        },
      ],
    };

    const component = await renderUsedPreloadingView(data);
    assertShadowRoot(component.shadowRoot);
    const headers = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section-header', ReportView.ReportView.ReportSectionHeader);
    const sections = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section', ReportView.ReportView.ReportSection);

    assert.strictEqual(headers.length, 2);
    assert.strictEqual(sections.length, 3);

    assert.include(headers[0]?.textContent, 'Speculative loading status');
    assert.include(
        sections[0]?.textContent,
        'The initiating page attempted to prefetch this page\'s URL, but the prefetch failed, so a full navigation was performed instead.');

    assert.include(headers[1]?.textContent, 'Failure reason');
    assert.include(
        sections[1]?.textContent,
        'The prefetch was not performed because the initiating page already has too many prefetches ongoing.');
  });

  it('renderes prerender failed', async () => {
    const data: PreloadingComponents.UsedPreloadingView.UsedPreloadingViewData = {
      pageURL: 'https://example.com/prerendered.html' as Platform.DevToolsPath.UrlString,
      attempts: [
        {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/prefetched.html' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.Ready,
          prefetchStatus: null,
          requestId: 'requestId:1' as Protocol.Network.RequestId,
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
          status: SDK.PreloadingModel.PreloadingStatus.Failure,
          prerenderStatus: Protocol.Preload.PrerenderFinalStatus.MojoBinderPolicy,
          disallowedMojoInterface: 'device.mojom.GamepadMonitor',
          ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        },
      ],
    };

    const component = await renderUsedPreloadingView(data);
    assertShadowRoot(component.shadowRoot);
    const headers = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section-header', ReportView.ReportView.ReportSectionHeader);
    const sections = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section', ReportView.ReportView.ReportSection);

    assert.strictEqual(headers.length, 2);
    assert.strictEqual(sections.length, 3);

    assert.include(headers[0]?.textContent, 'Speculative loading status');
    assert.include(
        sections[0]?.textContent,
        'The initiating page attempted to prerender this page\'s URL, but the prerender failed, so a full navigation was performed instead.');

    assert.include(headers[1]?.textContent, 'Failure reason');
    assert.include(
        sections[1]?.textContent,
        'The prerendered page used a forbidden JavaScript API that is currently not supported. (Internal Mojo interface: device.mojom.GamepadMonitor)');
  });

  it('renderes prerender -> prefetch downgraded and used', async () => {
    const data: PreloadingComponents.UsedPreloadingView.UsedPreloadingViewData = {
      pageURL: 'https://example.com/downgraded.html' as Platform.DevToolsPath.UrlString,
      attempts: [
        {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/downgraded.html' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.Success,
          prefetchStatus: null,
          requestId: 'requestId:1' as Protocol.Network.RequestId,
          ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        },
        {
          action: Protocol.Preload.SpeculationAction.Prerender,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prerender,
            url: 'https://example.com/downgraded.html' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.Failure,
          prerenderStatus: Protocol.Preload.PrerenderFinalStatus.MojoBinderPolicy,
          disallowedMojoInterface: 'device.mojom.GamepadMonitor',
          ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        },
      ],
    };

    const component = await renderUsedPreloadingView(data);
    assertShadowRoot(component.shadowRoot);
    const headers = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section-header', ReportView.ReportView.ReportSectionHeader);
    const sections = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section', ReportView.ReportView.ReportSection);

    assert.strictEqual(headers.length, 2);
    assert.strictEqual(sections.length, 3);

    assert.include(headers[0]?.textContent, 'Speculative loading status');
    assert.include(
        sections[0]?.textContent,
        'The initiating page attempted to prerender this page\'s URL. The prerender failed, but the resulting response body was still used as a prefetch.');

    assert.include(headers[1]?.textContent, 'Failure reason');
    assert.include(
        sections[1]?.textContent,
        'The prerendered page used a forbidden JavaScript API that is currently not supported. (Internal Mojo interface: device.mojom.GamepadMonitor)');
  });

  it('renders no preloading attempts used', async () => {
    const data: PreloadingComponents.UsedPreloadingView.UsedPreloadingViewData = {
      pageURL: 'https://example.com/no-preloads.html' as Platform.DevToolsPath.UrlString,
      attempts: [],
    };

    const component = await renderUsedPreloadingView(data);
    assertShadowRoot(component.shadowRoot);
    const headers = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section-header', ReportView.ReportView.ReportSectionHeader);
    const sections = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section', ReportView.ReportView.ReportSection);

    assert.strictEqual(headers.length, 1);
    assert.strictEqual(sections.length, 2);

    assert.include(headers[0]?.textContent, 'Speculative loading status');
    assert.include(
        sections[0]?.textContent, 'The initiating page did not attempt to speculatively load this page\'s URL.');
  });

  it('renders no preloading attempts used with mismatch', async () => {
    const data: PreloadingComponents.UsedPreloadingView.UsedPreloadingViewData = {
      pageURL: 'https://example.com/no-preloads.html' as Platform.DevToolsPath.UrlString,
      attempts: [
        {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/prefetched.html' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.Ready,
          prefetchStatus: null,
          requestId: 'requestId:1' as Protocol.Network.RequestId,
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
          status: SDK.PreloadingModel.PreloadingStatus.Failure,
          prerenderStatus: Protocol.Preload.PrerenderFinalStatus.TriggerDestroyed,
          disallowedMojoInterface: null,
          ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        },
      ],
    };

    const component = await renderUsedPreloadingView(data);
    assertShadowRoot(component.shadowRoot);
    const headers = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section-header', ReportView.ReportView.ReportSectionHeader);
    const sections = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section', ReportView.ReportView.ReportSection);

    assert.strictEqual(headers.length, 3);
    assert.strictEqual(sections.length, 4);

    assert.include(headers[0]?.textContent, 'Speculative loading status');
    assert.include(
        sections[0]?.textContent, 'The initiating page did not attempt to speculatively load this page\'s URL.');
    assert.include(headers[1]?.textContent, 'Current URL');
    assert.include(sections[1]?.textContent, 'https://example.com/no-preloads.html');
    assert.include(headers[2]?.textContent, 'URLs being speculatively loaded by the initiating page');
    assertNotNullOrUndefined(sections[2].querySelector('devtools-resources-mismatched-preloading-grid'));
  });
});
