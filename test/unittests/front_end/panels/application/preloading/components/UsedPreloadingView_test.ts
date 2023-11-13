// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../../../../front_end/core/platform/platform.js';
import {assertNotNullOrUndefined} from '../../../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../../../front_end/generated/protocol.js';
import * as PreloadingComponents from '../../../../../../../front_end/panels/application/preloading/components/components.js';
import * as DataGrid from '../../../../../../../front_end/ui/components/data_grid/data_grid.js';
import * as Coordinator from '../../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import * as ReportView from '../../../../../../../front_end/ui/components/report_view/report_view.js';
import {
  assertShadowRoot,
  getElementsWithinComponent,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../helpers/EnvironmentHelpers.js';
import {
  getHeaderCells,
  getValuesOfAllBodyRows,
} from '../../../../ui/components/DataGridHelpers.js';

const {assert} = chai;

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

async function renderUsedPreloadingView(data: PreloadingComponents.UsedPreloadingView.UsedPreloadingViewData):
    Promise<HTMLElement> {
  const component = new PreloadingComponents.UsedPreloadingView.UsedPreloadingView();
  component.data = data;
  renderElementIntoDOM(component);
  assertShadowRoot(component.shadowRoot);
  await coordinator.done();

  return component;
}

function assertGridContents(gridComponent: HTMLElement, headerExpected: string[], rowsExpected: string[][]) {
  const controller = getElementWithinComponent(
      gridComponent, 'devtools-data-grid-controller', DataGrid.DataGridController.DataGridController);
  const grid = getElementWithinComponent(controller, 'devtools-data-grid', DataGrid.DataGrid.DataGrid);
  assertShadowRoot(grid.shadowRoot);

  const headerGot = Array.from(getHeaderCells(grid.shadowRoot), cell => {
    assertNotNullOrUndefined(cell.textContent);
    return cell.textContent.trim();
  });
  const rowsGot = getValuesOfAllBodyRows(grid.shadowRoot);

  assert.deepEqual([headerGot, rowsGot], [headerExpected, rowsExpected]);
}

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
          mismatchedHeaders: null,
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
          mismatchedHeaders: null,
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
          mismatchedHeaders: null,
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
          mismatchedHeaders: null,
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

  it('renderes prerender failed due to header mismatch', async () => {
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
          prerenderStatus: Protocol.Preload.PrerenderFinalStatus.ActivationNavigationParameterMismatch,
          disallowedMojoInterface: null,
          mismatchedHeaders: [
            {
              headerName: 'sec-ch-ua-platform' as string,
              initialValue: 'Linux' as string,
              activationValue: 'Android' as string,
            },
            {
              headerName: 'sec-ch-ua-mobile' as string,
              initialValue: '?0' as string,
              activationValue: '?1' as string,
            },
          ] as Protocol.Preload.PrerenderMismatchedHeaders[],
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
    const grid = getElementWithinComponent(
        component, 'devtools-resources-preloading-mismatched-headers-grid',
        PreloadingComponents.PreloadingMismatchedHeadersGrid.PreloadingMismatchedHeadersGrid);

    assert.strictEqual(headers.length, 3);
    assert.strictEqual(sections.length, 4);

    assert.include(headers[0]?.textContent, 'Speculative loading status');
    assert.include(
        sections[0]?.textContent,
        'The initiating page attempted to prerender this page\'s URL, but the prerender failed, so a full navigation was performed instead.');

    assert.include(headers[1]?.textContent, 'Failure reason');
    assert.include(
        sections[1]?.textContent,
        'The prerender was not used because during activation time, different navigation parameters (e.g., HTTP headers) were calculated than during the original prerendering navigation request.');

    assert.include(headers[2]?.textContent, 'Mismatched HTTP request headers');
    assertGridContents(
        grid,
        ['Header name', 'Value in initial navigation', 'Value in activation navigation'],
        [
          ['sec-ch-ua-platform', 'Linux', 'Android'],
          ['sec-ch-ua-mobile', '?0', '?1'],
        ],
    );
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
          mismatchedHeaders: null,
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
          mismatchedHeaders: null,
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
