// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Protocol from '../../../../generated/protocol.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub} from '../../../../testing/ViewFunctionHelpers.js';

import * as PreloadingComponents from './components.js';

const {urlString} = Platform.DevToolsPath;

describeWithEnvironment('PreloadingDetailsReportView', () => {
  it('renders place holder if not selected', async () => {
    const data = null;

    const view = createViewFunctionStub(PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportView);
    const detailsReportView = new PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportView(view);
    detailsReportView.data = data;
    const input = await view.nextInput;
    assert.deepEqual(input.data, data);
    assert.isFunction(input.onRevealRuleSet);
  });

  it('renders prerendering details', async () => {
    const url = urlString`https://example.com/prerendered.html`;
    const data: PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportViewData = {
      pipeline: SDK.PreloadingModel.PreloadPipeline.newFromAttemptsForTesting([
        {
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url,
            targetHint: undefined,
          },
          pipelineId: 'pipelineId:1' as Protocol.Preload.PreloadPipelineId,
          status: SDK.PreloadingModel.PreloadingStatus.SUCCESS,
          prefetchStatus: Protocol.Preload.PrefetchStatus.PrefetchResponseUsed,
          requestId: 'requestId:1' as Protocol.Network.RequestId,
          ruleSetIds: ['ruleSetId'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        },
        {
          action: Protocol.Preload.SpeculationAction.Prerender,
          key: {
            loaderId: 'loaderId' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prerender,
            url,
            targetHint: undefined,
          },
          pipelineId: 'pipelineId:1' as Protocol.Preload.PreloadPipelineId,
          status: SDK.PreloadingModel.PreloadingStatus.RUNNING,
          prerenderStatus: null,
          disallowedMojoInterface: null,
          mismatchedHeaders: null,
          ruleSetIds: ['ruleSetId'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        },
      ]),
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
      pageURL: urlString`https://example.com/`,
    };

    const view = createViewFunctionStub(PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportView);
    const detailsReportView = new PreloadingComponents.PreloadingDetailsReportView.PreloadingDetailsReportView(view);
    detailsReportView.data = data;
    const input = await view.nextInput;
    assert.deepEqual(input.data, data);
    assert.isFunction(input.onRevealRuleSet);
  });
});
