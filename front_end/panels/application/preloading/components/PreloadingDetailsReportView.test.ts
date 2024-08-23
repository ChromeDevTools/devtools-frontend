// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Protocol from '../../../../generated/protocol.js';
import type * as Logs from '../../../../models/logs/logs.js';
import {
  getCleanTextContentFromElements,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import * as Coordinator from '../../../../ui/components/render_coordinator/render_coordinator.js';
import * as ReportView from '../../../../ui/components/report_view/report_view.js';

import * as PreloadingComponents from './components.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const zip2 = <T, S>(xs: T[], ys: S[]) => {
  assert.strictEqual(xs.length, ys.length);

  return Array.from(xs.map((_, i) => [xs[i], ys[i]]));
};

const renderPreloadingDetailsReportView =
    async (data: PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportViewData) => {
  const component = new PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportView();
  component.data = data;
  renderElementIntoDOM(component);
  assert.isNotNull(component.shadowRoot);
  await coordinator.done();

  return component;
};

// Note that testing Inspect/Activate buttons requires setup for targets.
// These are tested in test/unittests/front_end/panels/application/preloading/PreloadingView.test.ts.
describeWithEnvironment('PreloadingDetailsReportView', () => {
  it('renders place holder if not selected', async () => {
    const data = null;

    const component = await renderPreloadingDetailsReportView(data);
    assert.isNotNull(component.shadowRoot);
    const placeholder = component.shadowRoot.querySelector('.preloading-noselected');

    assert.include(placeholder?.textContent, 'Select an element for more details');
  });

  it('renders prerendering details', async () => {
    const url = 'https://example.com/prerendered.html' as Platform.DevToolsPath.UrlString;
    const data: PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportViewData = {
      preloadingAttempt: {
        action: Protocol.Preload.SpeculationAction.Prerender,
        key: {
          loaderId: 'loaderId' as Protocol.Network.LoaderId,
          action: Protocol.Preload.SpeculationAction.Prerender,
          url,
          targetHint: undefined,
        },
        status: SDK.PreloadingModel.PreloadingStatus.RUNNING,
        prerenderStatus: null,
        disallowedMojoInterface: null,
        mismatchedHeaders: null,
        ruleSetIds: ['ruleSetId'] as Protocol.Preload.RuleSetId[],
        nodeIds: [1] as Protocol.DOM.BackendNodeId[],
      },
      ruleSets: [
        {
          id: 'ruleSetId' as Protocol.Preload.RuleSetId,
          loaderId: 'loaderId' as Protocol.Network.LoaderId,
          sourceText: `
{
  "prefetch": [
    {
      "source": "list",
      "urls": ["/subresource.js"]
    }
  ]
}
`,
        },
      ],
      pageURL: 'https://example.com/' as Platform.DevToolsPath.UrlString,
    };

    const component = await renderPreloadingDetailsReportView(data);
    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);

    const keys = getCleanTextContentFromElements(report, 'devtools-report-key');
    const values = getCleanTextContentFromElements(report, 'devtools-report-value');
    assert.deepEqual(zip2(keys, values), [
      ['URL', url],
      ['Action', 'Prerender'],
      ['Status', 'Speculative load is running.'],
      ['Rule set', 'example.com/'],
    ]);
  });

  // TODO(https://crbug.com/1317959): Add cancelled reason once
  // finalStatus and disallowedApiMethod added to prerenderStatusUpdated.
  it('renders prerendering details with cancelled reason', async () => {
    const url = 'https://example.com/prerendered.html' as Platform.DevToolsPath.UrlString;
    const data: PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportViewData = {
      preloadingAttempt: {
        action: Protocol.Preload.SpeculationAction.Prerender,
        key: {
          loaderId: 'loaderId' as Protocol.Network.LoaderId,
          action: Protocol.Preload.SpeculationAction.Prerender,
          url,
          targetHint: undefined,
        },
        status: SDK.PreloadingModel.PreloadingStatus.FAILURE,
        prerenderStatus: Protocol.Preload.PrerenderFinalStatus.MojoBinderPolicy,
        disallowedMojoInterface: 'device.mojom.GamepadMonitor',
        mismatchedHeaders: null,
        ruleSetIds: ['ruleSetId'] as Protocol.Preload.RuleSetId[],
        nodeIds: [1] as Protocol.DOM.BackendNodeId[],
      },
      ruleSets: [
        {
          id: 'ruleSetId' as Protocol.Preload.RuleSetId,
          loaderId: 'loaderId' as Protocol.Network.LoaderId,
          sourceText: `
{
  "prefetch": [
    {
      "source": "list",
      "urls": ["/subresource.js"]
    }
  ]
}
`,
        },
      ],
      pageURL: 'https://example.com/' as Platform.DevToolsPath.UrlString,
    };

    const component = await renderPreloadingDetailsReportView(data);
    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);

    const keys = getCleanTextContentFromElements(report, 'devtools-report-key');
    const values = getCleanTextContentFromElements(report, 'devtools-report-value');
    assert.deepEqual(zip2(keys, values), [
      ['URL', url],
      ['Action', 'Prerender'],
      ['Status', 'Speculative load failed.'],
      [
        'Failure reason',
        'The prerendered page used a forbidden JavaScript API that is currently not supported. (Internal Mojo interface: device.mojom.GamepadMonitor)',
      ],
      ['Rule set', 'example.com/'],
    ]);
  });

  it('renders prefetch details with cancelled reason', async () => {
    const fakeRequestResolver = {
      waitFor: (_requestId: Protocol.Network.RequestId) => {
        return Promise.reject();
      },
    } as unknown as Logs.RequestResolver.RequestResolver;

    const url = 'https://example.com/prefetch.html' as Platform.DevToolsPath.UrlString;
    const data: PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportViewData = {
      preloadingAttempt: {
        action: Protocol.Preload.SpeculationAction.Prefetch,
        key: {
          loaderId: 'loaderId' as Protocol.Network.LoaderId,
          action: Protocol.Preload.SpeculationAction.Prefetch,
          url,
          targetHint: undefined,
        },
        status: SDK.PreloadingModel.PreloadingStatus.FAILURE,
        prefetchStatus: Protocol.Preload.PrefetchStatus.PrefetchFailedNon2XX,
        requestId: 'requestId:1' as Protocol.Network.RequestId,
        ruleSetIds: ['ruleSetId'] as Protocol.Preload.RuleSetId[],
        nodeIds: [1] as Protocol.DOM.BackendNodeId[],
      },
      ruleSets: [
        {
          id: 'ruleSetId' as Protocol.Preload.RuleSetId,
          loaderId: 'loaderId' as Protocol.Network.LoaderId,
          sourceText: `
{
  "prefetch": [
    {
      "source": "list",
      "urls": ["/subresource.js"]
    }
  ]
}
`,
        },
      ],
      pageURL: 'https://example.com/' as Platform.DevToolsPath.UrlString,
      requestResolver: fakeRequestResolver,
    };

    const component = await renderPreloadingDetailsReportView(data);
    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);

    const keys = getCleanTextContentFromElements(report, 'devtools-report-key');
    const values = getCleanTextContentFromElements(report, 'devtools-report-value');
    values[0] = report.querySelector('devtools-report-value:nth-of-type(1) devtools-request-link-icon')
                    ?.shadowRoot?.textContent?.trim() ||
        values[0];
    assert.deepEqual(zip2(keys, values), [
      ['URL', url],
      ['Action', 'Prefetch'],
      ['Status', 'Speculative load failed.'],
      ['Failure reason', 'The prefetch failed because of a non-2xx HTTP response status code.'],
      ['Rule set', 'example.com/'],
    ]);
  });

  it('renders prefetch details with out-of-document Speculation Rules', async () => {
    const fakeRequestResolver = {
      waitFor: (_requestId: Protocol.Network.RequestId) => {
        return Promise.reject();
      },
    } as unknown as Logs.RequestResolver.RequestResolver;

    const url = 'https://example.com/prefetch.html' as Platform.DevToolsPath.UrlString;
    const data: PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportViewData = {
      preloadingAttempt: {
        action: Protocol.Preload.SpeculationAction.Prefetch,
        key: {
          loaderId: 'loaderId' as Protocol.Network.LoaderId,
          action: Protocol.Preload.SpeculationAction.Prefetch,
          url,
          targetHint: undefined,
        },
        status: SDK.PreloadingModel.PreloadingStatus.READY,
        prefetchStatus: null,
        requestId: 'requestId:1' as Protocol.Network.RequestId,
        ruleSetIds: ['ruleSetId'] as Protocol.Preload.RuleSetId[],
        nodeIds: [1] as Protocol.DOM.BackendNodeId[],
      },
      ruleSets: [
        {
          id: 'ruleSetId' as Protocol.Preload.RuleSetId,
          loaderId: 'loaderId' as Protocol.Network.LoaderId,
          sourceText: `
{
  "prefetch": [
    {
      "source": "list",
      "urls": ["/subresource.js"]
    }
  ]
}
`,
          url: 'https://example.com/speculation-rules.json',
        },
      ],
      pageURL: 'https://example.com/' as Platform.DevToolsPath.UrlString,
      requestResolver: fakeRequestResolver,
    };

    const component = await renderPreloadingDetailsReportView(data);
    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);

    const keys = getCleanTextContentFromElements(report, 'devtools-report-key');
    const values = getCleanTextContentFromElements(report, 'devtools-report-value');
    values[0] = report.querySelector('devtools-report-value:nth-of-type(1) devtools-request-link-icon')
                    ?.shadowRoot?.textContent?.trim() ||
        values[0];
    assert.deepEqual(zip2(keys, values), [
      ['URL', url],
      ['Action', 'Prefetch'],
      ['Status', 'Speculative load finished and the result is ready for the next navigation.'],
      ['Rule set', 'example.com/speculation-rules.json'],
    ]);
  });
});
