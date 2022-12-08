// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as SDK from '../../../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../../../front_end/generated/protocol.js';
import * as PreloadingComponents from '../../../../../../../front_end/panels/application/preloading/components/components.js';
import * as Coordinator from '../../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import * as ReportView from '../../../../../../../front_end/ui/components/report_view/report_view.js';
import type * as Platform from '../../../../../../../front_end/core/platform/platform.js';
import {
  assertShadowRoot,
  getCleanTextContentFromElements,
  getElementWithinComponent,
  renderElementIntoDOM,
} from '../../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../helpers/EnvironmentHelpers.js';

const {assert} = chai;

type PrerenderingAttempt = SDK.PrerenderingModel.PrerenderingAttempt;

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

describeWithEnvironment('PreloadingDetailsReportView', async () => {
  it('renders place holder if not selected', async () => {
    const data = null;

    const component = await renderPreloadingDetailsReportView(data);
    assertShadowRoot(component.shadowRoot);
    const placeholder = component.shadowRoot.querySelector('.preloading-noselected');

    assert.include(placeholder?.textContent, 'Select an element for more details');
  });

  it('renders prerendering details', async () => {
    const startedAt = new Date('2006-01-02T15:04:05Z');
    const url = 'https://example.com/prerendered.html' as Platform.DevToolsPath.UrlString;
    const data: PrerenderingAttempt = {
      prerenderingAttemptId: 'id',
      startedAt: startedAt.getTime(),
      trigger: {
        kind: 'PrerenderingTriggerSpecRules',
        rule: {
          'prerender': [{'source': 'list', 'urls': [url]}],
        },
      },
      url,
      status: SDK.PrerenderingModel.PrerenderingStatus.Prerendering,
    };

    const component = await renderPreloadingDetailsReportView(data);
    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);

    const keys = getCleanTextContentFromElements(report, 'devtools-report-key');
    const values = getCleanTextContentFromElements(report, 'devtools-report-value');
    assert.deepEqual(zip2(keys, values), [
      ['URL', url],
      ['Started at', startedAt.toLocaleString()],
      ['Trigger', 'Speculation Rules'],
      ['Status', 'Prerendering'],
    ]);
  });

  it('renders prerendering details with cancelled reason', async () => {
    const startedAt = new Date('2006-01-02T15:04:05Z');
    const url = 'https://example.com/prerendered.html' as Platform.DevToolsPath.UrlString;
    const data: PrerenderingAttempt = {
      prerenderingAttemptId: 'id',
      startedAt: startedAt.getTime(),
      trigger: {
        kind: 'PrerenderingTriggerSpecRules',
        rule: {
          'prerender': [{'source': 'list', 'urls': [url]}],
        },
      },
      url,
      status: SDK.PrerenderingModel.PrerenderingStatus.Discarded,
      discardedReason: Protocol.Page.PrerenderFinalStatus.MojoBinderPolicy,
    };

    const component = await renderPreloadingDetailsReportView(data);
    const report = getElementWithinComponent(component, 'devtools-report', ReportView.ReportView.Report);

    const keys = getCleanTextContentFromElements(report, 'devtools-report-key');
    const values = getCleanTextContentFromElements(report, 'devtools-report-value');
    assert.deepEqual(zip2(keys, values), [
      ['URL', url],
      ['Started at', startedAt.toLocaleString()],
      ['Trigger', 'Speculation Rules'],
      ['Status', 'Discarded'],
      ['Discarded reason', Protocol.Page.PrerenderFinalStatus.MojoBinderPolicy],
    ]);
  });
});
