// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Protocol from '../../../../generated/protocol.js';
import {assertGridContents} from '../../../../testing/DataGridHelpers.js';
import {
  getElementsWithinComponent,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import * as Coordinator from '../../../../ui/components/render_coordinator/render_coordinator.js';
import * as ReportView from '../../../../ui/components/report_view/report_view.js';

import * as PreloadingComponents from './components.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

async function renderUsedPreloadingView(data: PreloadingComponents.UsedPreloadingView.UsedPreloadingViewData):
    Promise<HTMLElement> {
  const component = new PreloadingComponents.UsedPreloadingView.UsedPreloadingView();
  component.data = data;
  renderElementIntoDOM(component);
  assert.isNotNull(component.shadowRoot);
  await coordinator.done();

  return component;
}

describeWithEnvironment('UsedPreloadingView', () => {
  it('renderes prefetch used', async () => {
    const data: PreloadingComponents.UsedPreloadingView.UsedPreloadingViewData = {
      pageURL: 'https://example.com/prefetched.html' as Platform.DevToolsPath.UrlString,
      previousAttempts: [
        {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/prefetched.html' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.SUCCESS,
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
          status: SDK.PreloadingModel.PreloadingStatus.FAILURE,
          prerenderStatus: Protocol.Preload.PrerenderFinalStatus.TriggerDestroyed,
          disallowedMojoInterface: null,
          mismatchedHeaders: null,
          ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        },
      ],
      currentAttempts: [],
    };

    const component = await renderUsedPreloadingView(data);
    assert.isNotNull(component.shadowRoot);
    const headers = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section-header', ReportView.ReportView.ReportSectionHeader);
    const sections = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section', ReportView.ReportView.ReportSection);

    assert.strictEqual(headers.length, 2);
    assert.strictEqual(sections.length, 3);

    assert.include(headers[0]?.textContent, 'Speculative loading status');
    assert.strictEqual(sections[0]?.querySelector('.status-badge span')?.textContent?.trim(), 'Success');
    assert.include(sections[0]?.textContent, 'This page was successfully prefetched.');

    assert.include(headers[1]?.textContent, 'Speculations initiated by this page');
    const badges = sections[1]?.querySelectorAll('.status-badge span') || [];
    assert.strictEqual(badges.length, 1);
    assert.strictEqual(badges[0]?.textContent?.trim(), 'No speculative loads');

    assert.include(sections[2]?.textContent, 'Learn more: Speculative loading on developer.chrome.com');
  });

  it('renderes prerender used', async () => {
    const data: PreloadingComponents.UsedPreloadingView.UsedPreloadingViewData = {
      pageURL: 'https://example.com/prerendered.html' as Platform.DevToolsPath.UrlString,
      previousAttempts: [
        {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/prefetched.html' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.READY,
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
          status: SDK.PreloadingModel.PreloadingStatus.SUCCESS,
          prerenderStatus: null,
          disallowedMojoInterface: null,
          mismatchedHeaders: null,
          ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        },
      ],
      currentAttempts: [],
    };

    const component = await renderUsedPreloadingView(data);
    assert.isNotNull(component.shadowRoot);
    const headers = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section-header', ReportView.ReportView.ReportSectionHeader);
    const sections = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section', ReportView.ReportView.ReportSection);

    assert.strictEqual(headers.length, 2);
    assert.strictEqual(sections.length, 3);

    assert.include(headers[0]?.textContent, 'Speculative loading status');
    assert.strictEqual(sections[0]?.querySelector('.status-badge span')?.textContent?.trim(), 'Success');
    assert.include(sections[0]?.textContent, 'This page was successfully prerendered.');

    assert.include(headers[1]?.textContent, 'Speculations initiated by this page');
    const badges = sections[1]?.querySelectorAll('.status-badge span') || [];
    assert.strictEqual(badges.length, 1);
    assert.strictEqual(badges[0]?.textContent?.trim(), 'No speculative loads');

    assert.include(sections[2]?.textContent, 'Learn more: Speculative loading on developer.chrome.com');
  });

  it('renderes prefetch failed', async () => {
    const data: PreloadingComponents.UsedPreloadingView.UsedPreloadingViewData = {
      pageURL: 'https://example.com/prefetched.html' as Platform.DevToolsPath.UrlString,
      previousAttempts: [
        {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/prefetched.html' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.FAILURE,
          prefetchStatus: Protocol.Preload.PrefetchStatus.PrefetchFailedIneligibleRedirect,
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
          status: SDK.PreloadingModel.PreloadingStatus.FAILURE,
          prerenderStatus: Protocol.Preload.PrerenderFinalStatus.TriggerDestroyed,
          disallowedMojoInterface: null,
          mismatchedHeaders: null,
          ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        },
      ],
      currentAttempts: [],
    };

    const component = await renderUsedPreloadingView(data);
    assert.isNotNull(component.shadowRoot);
    const headers = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section-header', ReportView.ReportView.ReportSectionHeader);
    const sections = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section', ReportView.ReportView.ReportSection);

    assert.strictEqual(headers.length, 3);
    assert.strictEqual(sections.length, 4);

    assert.include(headers[0]?.textContent, 'Speculative loading status');
    assert.strictEqual(sections[0]?.querySelector('.status-badge span')?.textContent?.trim(), 'Failure');
    assert.include(
        sections[0]?.textContent,
        'The initiating page attempted to prefetch this page\'s URL, but the prefetch failed, so a full navigation was performed instead.');
    assert.include(headers[1]?.textContent, 'Failure reason');
    assert.include(
        sections[1]?.textContent, 'The prefetch was redirected, but the redirect URL is not eligible for prefetch.');

    assert.include(headers[2]?.textContent, 'Speculations initiated by this page');
    const badges = sections[2]?.querySelectorAll('.status-badge span') || [];
    assert.strictEqual(badges.length, 1);
    assert.strictEqual(badges[0]?.textContent?.trim(), 'No speculative loads');

    assert.include(sections[3]?.textContent, 'Learn more: Speculative loading on developer.chrome.com');
  });

  it('renderes prerender failed', async () => {
    const data: PreloadingComponents.UsedPreloadingView.UsedPreloadingViewData = {
      pageURL: 'https://example.com/prerendered.html' as Platform.DevToolsPath.UrlString,
      previousAttempts: [
        {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/prefetched.html' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.READY,
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
          status: SDK.PreloadingModel.PreloadingStatus.FAILURE,
          prerenderStatus: Protocol.Preload.PrerenderFinalStatus.MojoBinderPolicy,
          disallowedMojoInterface: 'device.mojom.GamepadMonitor',
          mismatchedHeaders: null,
          ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        },
      ],
      currentAttempts: [],
    };

    const component = await renderUsedPreloadingView(data);
    assert.isNotNull(component.shadowRoot);
    const headers = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section-header', ReportView.ReportView.ReportSectionHeader);
    const sections = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section', ReportView.ReportView.ReportSection);

    assert.strictEqual(headers.length, 3);
    assert.strictEqual(sections.length, 4);

    assert.include(headers[0]?.textContent, 'Speculative loading status');
    assert.strictEqual(sections[0]?.querySelector('.status-badge span')?.textContent?.trim(), 'Failure');
    assert.include(
        sections[0]?.textContent,
        'The initiating page attempted to prerender this page\'s URL, but the prerender failed, so a full navigation was performed instead.');
    assert.include(headers[1]?.textContent, 'Failure reason');
    assert.include(
        sections[1]?.textContent,
        'The prerendered page used a forbidden JavaScript API that is currently not supported. (Internal Mojo interface: device.mojom.GamepadMonitor)');

    assert.include(headers[2]?.textContent, 'Speculations initiated by this page');
    const badges = sections[2]?.querySelectorAll('.status-badge span') || [];
    assert.strictEqual(badges.length, 1);
    assert.strictEqual(badges[0]?.textContent?.trim(), 'No speculative loads');

    assert.include(sections[3]?.textContent, 'Learn more: Speculative loading on developer.chrome.com');
  });

  it('renderes prerender failed due to header mismatch', async () => {
    const data: PreloadingComponents.UsedPreloadingView.UsedPreloadingViewData = {
      pageURL: 'https://example.com/prerendered.html' as Platform.DevToolsPath.UrlString,
      previousAttempts: [
        {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/prefetched.html' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.READY,
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
          status: SDK.PreloadingModel.PreloadingStatus.FAILURE,
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
      currentAttempts: [],
    };

    const component = await renderUsedPreloadingView(data);
    assert.isNotNull(component.shadowRoot);
    const headers = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section-header', ReportView.ReportView.ReportSectionHeader);
    const sections = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section', ReportView.ReportView.ReportSection);
    const grid = getElementWithinComponent(
        component, 'devtools-resources-preloading-mismatched-headers-grid',
        PreloadingComponents.PreloadingMismatchedHeadersGrid.PreloadingMismatchedHeadersGrid);

    assert.strictEqual(headers.length, 4);
    assert.strictEqual(sections.length, 5);

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

    assert.include(headers[3]?.textContent, 'Speculations initiated by this page');
    const badges = sections[3]?.querySelectorAll('.status-badge span') || [];
    assert.strictEqual(badges.length, 1);
    assert.strictEqual(badges[0]?.textContent?.trim(), 'No speculative loads');

    assert.include(sections[4]?.textContent, 'Learn more: Speculative loading on developer.chrome.com');
  });

  it('renderes prerender -> prefetch downgraded and used', async () => {
    const data: PreloadingComponents.UsedPreloadingView.UsedPreloadingViewData = {
      pageURL: 'https://example.com/downgraded.html' as Platform.DevToolsPath.UrlString,
      previousAttempts: [
        {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/downgraded.html' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.SUCCESS,
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
          status: SDK.PreloadingModel.PreloadingStatus.FAILURE,
          prerenderStatus: Protocol.Preload.PrerenderFinalStatus.MojoBinderPolicy,
          disallowedMojoInterface: 'device.mojom.GamepadMonitor',
          mismatchedHeaders: null,
          ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        },
      ],
      currentAttempts: [],
    };

    const component = await renderUsedPreloadingView(data);
    assert.isNotNull(component.shadowRoot);
    const headers = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section-header', ReportView.ReportView.ReportSectionHeader);
    const sections = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section', ReportView.ReportView.ReportSection);

    assert.strictEqual(headers.length, 3);
    assert.strictEqual(sections.length, 4);

    assert.include(headers[0]?.textContent, 'Speculative loading status');
    assert.strictEqual(sections[0]?.querySelector('.status-badge span')?.textContent?.trim(), 'Success');
    assert.include(
        sections[0]?.textContent,
        'The initiating page attempted to prerender this page\'s URL. The prerender failed, but the resulting response body was still used as a prefetch.');
    assert.include(headers[1]?.textContent, 'Failure reason');
    assert.include(
        sections[1]?.textContent,
        'The prerendered page used a forbidden JavaScript API that is currently not supported. (Internal Mojo interface: device.mojom.GamepadMonitor)');

    assert.include(headers[2]?.textContent, 'Speculations initiated by this page');
    const badges = sections[2]?.querySelectorAll('.status-badge span') || [];
    assert.strictEqual(badges.length, 1);
    assert.strictEqual(badges[0]?.textContent?.trim(), 'No speculative loads');

    assert.include(sections[3]?.textContent, 'Learn more: Speculative loading on developer.chrome.com');
  });

  it('renders no preloading attempts used', async () => {
    const data: PreloadingComponents.UsedPreloadingView.UsedPreloadingViewData = {
      pageURL: 'https://example.com/no-preloads.html' as Platform.DevToolsPath.UrlString,
      previousAttempts: [],
      currentAttempts: [],
    };

    const component = await renderUsedPreloadingView(data);
    assert.isNotNull(component.shadowRoot);
    const headers = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section-header', ReportView.ReportView.ReportSectionHeader);
    const sections = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section', ReportView.ReportView.ReportSection);

    assert.strictEqual(headers.length, 2);
    assert.strictEqual(sections.length, 3);

    assert.include(headers[0]?.textContent, 'Speculative loading status');
    assert.strictEqual(sections[0]?.querySelector('.status-badge span')?.textContent?.trim(), 'No speculative loads');
    assert.include(
        sections[0]?.textContent, 'The initiating page did not attempt to speculatively load this page\'s URL.');

    assert.include(headers[1]?.textContent, 'Speculations initiated by this page');
    const badges = sections[1]?.querySelectorAll('.status-badge span') || [];
    assert.strictEqual(badges.length, 1);
    assert.strictEqual(badges[0]?.textContent?.trim(), 'No speculative loads');

    assert.include(sections[2]?.textContent, 'Learn more: Speculative loading on developer.chrome.com');
  });

  it('ignores hash part of URL for prefetch', async () => {
    const data: PreloadingComponents.UsedPreloadingView.UsedPreloadingViewData = {
      pageURL: 'https://example.com/prefetched.html#alpha' as Platform.DevToolsPath.UrlString,
      previousAttempts: [
        {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/prefetched.html#beta' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.SUCCESS,
          prefetchStatus: null,
          requestId: 'requestId:1' as Protocol.Network.RequestId,
          ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        },
      ],
      currentAttempts: [],
    };

    const component = await renderUsedPreloadingView(data);
    assert.isNotNull(component.shadowRoot);
    const headers = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section-header', ReportView.ReportView.ReportSectionHeader);
    const sections = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section', ReportView.ReportView.ReportSection);

    assert.strictEqual(headers.length, 2);
    assert.strictEqual(sections.length, 3);

    assert.include(headers[0]?.textContent, 'Speculative loading status');
    assert.strictEqual(sections[0]?.querySelector('.status-badge span')?.textContent?.trim(), 'Success');
    assert.include(sections[0]?.textContent, 'This page was successfully prefetched.');

    assert.include(headers[1]?.textContent, 'Speculations initiated by this page');
    const badges = sections[1]?.querySelectorAll('.status-badge span') || [];
    assert.strictEqual(badges.length, 1);
    assert.strictEqual(badges[0]?.textContent?.trim(), 'No speculative loads');

    assert.include(sections[2]?.textContent, 'Learn more: Speculative loading on developer.chrome.com');
  });

  it('doesn\'t ignore hash part of URL for prerender', async () => {
    // Prerender uses more strict URL matcher and distinguish URLs by fragments.
    const data: PreloadingComponents.UsedPreloadingView.UsedPreloadingViewData = {
      pageURL: 'https://example.com/prerendered.html#alpha' as Platform.DevToolsPath.UrlString,
      previousAttempts: [
        {
          action: Protocol.Preload.SpeculationAction.Prerender,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prerender,
            url: 'https://example.com/prerendered.html#beta' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.READY,
          prerenderStatus: null,
          disallowedMojoInterface: null,
          mismatchedHeaders: null,
          ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        },
      ],
      currentAttempts: [],
    };

    const component = await renderUsedPreloadingView(data);
    assert.isNotNull(component.shadowRoot);
    const headers = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section-header', ReportView.ReportView.ReportSectionHeader);
    const sections = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section', ReportView.ReportView.ReportSection);

    assert.strictEqual(headers.length, 4);
    assert.strictEqual(sections.length, 5);

    assert.include(headers[0]?.textContent, 'Speculative loading status');
    assert.strictEqual(sections[0]?.querySelector('.status-badge span')?.textContent?.trim(), 'No speculative loads');
    assert.include(
        sections[0]?.textContent, 'The initiating page did not attempt to speculatively load this page\'s URL.');
    assert.include(headers[1]?.textContent, 'Current URL');
    assert.include(sections[1]?.textContent, 'https://example.com/prerendered.html#alpha');
    assert.include(headers[2]?.textContent, 'URLs being speculatively loaded by the initiating page');
    const grid = sections[2].querySelector('devtools-resources-mismatched-preloading-grid');
    assert.instanceOf(grid, PreloadingComponents.MismatchedPreloadingGrid.MismatchedPreloadingGrid);
    assertGridContents(
        grid,
        ['URL', 'Action', 'Status'],
        [
          ['https://example.com/prerendered.html#betalpha', 'Prerender', 'Ready'],
        ],
    );

    assert.include(headers[3]?.textContent, 'Speculations initiated by this page');
    const badges = sections[3]?.querySelectorAll('.status-badge span') || [];
    assert.strictEqual(badges.length, 1);
    assert.strictEqual(badges[0]?.textContent?.trim(), 'No speculative loads');

    assert.include(sections[4]?.textContent, 'Learn more: Speculative loading on developer.chrome.com');
  });

  it('renders no preloading attempts used with mismatch', async () => {
    const data: PreloadingComponents.UsedPreloadingView.UsedPreloadingViewData = {
      pageURL: 'https://example.com/no-preloads.html' as Platform.DevToolsPath.UrlString,
      previousAttempts: [
        {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/prefetched.html' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.READY,
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
          status: SDK.PreloadingModel.PreloadingStatus.FAILURE,
          prerenderStatus: Protocol.Preload.PrerenderFinalStatus.TriggerDestroyed,
          disallowedMojoInterface: null,
          mismatchedHeaders: null,
          ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        },
      ],
      currentAttempts: [],
    };

    const component = await renderUsedPreloadingView(data);
    assert.isNotNull(component.shadowRoot);
    const headers = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section-header', ReportView.ReportView.ReportSectionHeader);
    const sections = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section', ReportView.ReportView.ReportSection);

    assert.strictEqual(headers.length, 4);
    assert.strictEqual(sections.length, 5);

    assert.include(headers[0]?.textContent, 'Speculative loading status');
    assert.strictEqual(sections[0]?.querySelector('.status-badge span')?.textContent?.trim(), 'No speculative loads');
    assert.include(
        sections[0]?.textContent, 'The initiating page did not attempt to speculatively load this page\'s URL.');
    assert.include(headers[1]?.textContent, 'Current URL');
    assert.include(sections[1]?.textContent, 'https://example.com/no-preloads.html');
    assert.include(headers[2]?.textContent, 'URLs being speculatively loaded by the initiating page');
    assert.exists(sections[2].querySelector('devtools-resources-mismatched-preloading-grid'));

    assert.include(headers[3]?.textContent, 'Speculations initiated by this page');
    const badges = sections[3]?.querySelectorAll('.status-badge span') || [];
    assert.strictEqual(badges.length, 1);
    assert.strictEqual(badges[0]?.textContent?.trim(), 'No speculative loads');

    assert.include(sections[4]?.textContent, 'Learn more: Speculative loading on developer.chrome.com');
  });

  it('renders preloads initialized by this page', async () => {
    const data: PreloadingComponents.UsedPreloadingView.UsedPreloadingViewData = {
      pageURL: 'https://example.com/no-preloads.html' as Platform.DevToolsPath.UrlString,
      previousAttempts: [],
      currentAttempts: [
        {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/prefetch-not-triggered.html' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.NOT_TRIGGERED,
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
            url: 'https://example.com/prefetch-running.html' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.RUNNING,
          prefetchStatus: null,
          requestId: 'requestId:2' as Protocol.Network.RequestId,
          ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        },
        {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/prefetch-ready.html' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.READY,
          prefetchStatus: null,
          requestId: 'requestId:3' as Protocol.Network.RequestId,
          ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        },
        {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: 'https://example.com/prefetch-failure.html' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.FAILURE,
          prefetchStatus: null,
          requestId: 'requestId:4' as Protocol.Network.RequestId,
          ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        },
        {
          action: Protocol.Preload.SpeculationAction.Prerender,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prerender,
            url: 'https://example.com/prerender-pending.html' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.PENDING,
          prerenderStatus: null,
          disallowedMojoInterface: null,
          mismatchedHeaders: null,
          ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        },
        {
          action: Protocol.Preload.SpeculationAction.Prerender,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prerender,
            url: 'https://example.com/prerender-ready.html' as Platform.DevToolsPath.UrlString,
          },
          status: SDK.PreloadingModel.PreloadingStatus.READY,
          prerenderStatus: null,
          mismatchedHeaders: null,
          disallowedMojoInterface: null,
          ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        },
      ],
    };

    const component = await renderUsedPreloadingView(data);
    assert.isNotNull(component.shadowRoot);
    const headers = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section-header', ReportView.ReportView.ReportSectionHeader);
    const sections = getElementsWithinComponent(
        component, 'devtools-report devtools-report-section', ReportView.ReportView.ReportSection);

    assert.strictEqual(headers.length, 2);
    assert.strictEqual(sections.length, 3);

    assert.include(headers[0]?.textContent, 'Speculative loading status');
    assert.strictEqual(sections[0]?.querySelector('.status-badge span')?.textContent?.trim(), 'No speculative loads');
    assert.include(
        sections[0]?.textContent, 'The initiating page did not attempt to speculatively load this page\'s URL.');

    assert.include(headers[1]?.textContent, 'Speculations initiated by this page');
    const badges = sections[1]?.querySelectorAll('.status-badge span') || [];
    assert.strictEqual(badges.length, 4);
    assert.strictEqual(badges[0]?.textContent?.trim(), '1 not triggered');
    assert.strictEqual(badges[1]?.textContent?.trim(), '2 in progress');
    assert.strictEqual(badges[2]?.textContent?.trim(), '2 success');
    assert.strictEqual(badges[3]?.textContent?.trim(), '1 failure');

    assert.include(sections[2]?.textContent, 'Learn more: Speculative loading on developer.chrome.com');
  });
});
