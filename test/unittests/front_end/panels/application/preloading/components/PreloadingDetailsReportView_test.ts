// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../../../../front_end/core/platform/platform.js';
import type * as Logs from '../../../../../../../front_end/models/logs/logs.js';

import * as Protocol from '../../../../../../../front_end/generated/protocol.js';
import * as PreloadingComponents from '../../../../../../../front_end/panels/application/preloading/components/components.js';
import * as SDK from '../../../../../../../front_end/core/sdk/sdk.js';
import * as Coordinator from '../../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import * as ReportView from '../../../../../../../front_end/ui/components/report_view/report_view.js';
import {
  assertShadowRoot,
  getCleanTextContentFromElements,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

const zip2 = <T, S>(xs: T[], ys: S[]): [T, S][] => {
  assert.strictEqual(xs.length, ys.length);

  return Array.from(xs.map((_, i) => [xs[i], ys[i]]));
};

const renderPreloadingDetailsReportView = async(
    data: PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportViewData): Promise<HTMLElement> => {
  const component = new PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportView();
  component.data = data;
  renderElementIntoDOM(component);
  assertShadowRoot(component.shadowRoot);
  await coordinator.done();

  return component;
};

// Note that testing Inspect/Activate buttons requires setup for targets.
// These are tested in test/unittests/front_end/panels/application/preloading/PreloadingView_test.ts.
describeWithEnvironment('PreloadingDetailsReportView', async () => {
  it('renders place holder if not selected', async () => {
    const data = null;

    const component = await renderPreloadingDetailsReportView(data);
    assertShadowRoot(component.shadowRoot);
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
        status: SDK.PreloadingModel.PreloadingStatus.Running,
        prerenderStatus: null,
        disallowedMojoInterface: null,
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
        status: SDK.PreloadingModel.PreloadingStatus.Failure,
        prerenderStatus: Protocol.Preload.PrerenderFinalStatus.MojoBinderPolicy,
        disallowedMojoInterface: 'device.mojom.GamepadMonitor',
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
      waitFor: (_requestId: Protocol.Network.RequestId): Promise<void> => {
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
        status: SDK.PreloadingModel.PreloadingStatus.Failure,
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
      waitFor: (_requestId: Protocol.Network.RequestId): Promise<void> => {
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
        status: SDK.PreloadingModel.PreloadingStatus.Ready,
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
