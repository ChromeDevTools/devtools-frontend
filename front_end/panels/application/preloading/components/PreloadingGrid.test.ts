// Copyright 2022 The Chromium Authors
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Protocol from '../../../../generated/protocol.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import {createViewFunctionStub, type ViewFunctionStub} from '../../../../testing/ViewFunctionHelpers.js';

import * as PreloadingComponents from './components.js';

const {urlString} = Platform.DevToolsPath;

async function setupWidget(): Promise<{
  widget: PreloadingComponents.PreloadingGrid.PreloadingGrid,
  view: ViewFunctionStub<typeof PreloadingComponents.PreloadingGrid.PreloadingGrid>,
}> {
  const view = createViewFunctionStub(PreloadingComponents.PreloadingGrid.PreloadingGrid);
  const widget = new PreloadingComponents.PreloadingGrid.PreloadingGrid(view);
  await view.nextInput;
  return {widget, view};
}

async function assertRenderResult(rowsInput: {
  rows: PreloadingComponents.PreloadingGrid.PreloadingGridRow[],
  pageURL: Platform.DevToolsPath.UrlString,
}): Promise<void> {
  const {widget, view} = await setupWidget();
  widget.rows = rowsInput.rows;
  widget.pageURL = rowsInput.pageURL;
  await view.nextInput;

  assert.strictEqual(rowsInput.rows, view.input.rows);
  assert.strictEqual(rowsInput.pageURL, view.input.pageURL);
}

describeWithEnvironment('PreloadingGrid', () => {
  it('renders grid', async () => {
    await assertRenderResult({
      rows: [{
        id: 'id',
        pipeline: SDK.PreloadingModel.PreloadPipeline.newFromAttemptsForTesting([{
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: urlString`https://example.com/prefetched.html`,
          },
          pipelineId: 'pipelineId:1' as Protocol.Preload.PreloadPipelineId,
          status: SDK.PreloadingModel.PreloadingStatus.RUNNING,
          prefetchStatus: null,
          requestId: 'requestId:1' as Protocol.Network.RequestId,
          ruleSetIds: ['ruleSetId:0.1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        }]),
        ruleSets: [
          {
            id: 'ruleSetId:0.1' as Protocol.Preload.RuleSetId,
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            sourceText: `
{
  "prefetch":[
    {
      "source": "list",
      "urls": ["/prefetched.html"]
    }
  ]
}
`,
          },
        ],
      }],
      pageURL: urlString`https://example.com/`,
    });
  });

  it('renders tag instead of url correctly', async () => {
    await assertRenderResult({
      rows: [{
        id: 'id',
        pipeline: SDK.PreloadingModel.PreloadPipeline.newFromAttemptsForTesting([{
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: urlString`https://example.com/prefetched.html`,
          },
          pipelineId: 'pipelineId:1' as Protocol.Preload.PreloadPipelineId,
          status: SDK.PreloadingModel.PreloadingStatus.RUNNING,
          prefetchStatus: null,
          requestId: 'requestId:1' as Protocol.Network.RequestId,
          ruleSetIds: ['ruleSetId:0.1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        }]),
        ruleSets: [{
          id: 'ruleSetId:0.1' as Protocol.Preload.RuleSetId,
          loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
          tag: 'tag1',
          sourceText: `
{
  "tag": "tag1",
  "prefetch":[
    {
      "source": "list",
      "urls": ["/prefetched.html"]
    }
  ]
}
`,
        }],
      }],
      pageURL: urlString`https://example.com/`,
    });
  });

  it('shows full URL for cross-origin preloading', async () => {
    await assertRenderResult({
      rows: [{
        id: 'id',
        pipeline: SDK.PreloadingModel.PreloadPipeline.newFromAttemptsForTesting([{
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: urlString`https://cross-origin.example.com/prefetched.html`,
          },
          pipelineId: 'pipelineId:1' as Protocol.Preload.PreloadPipelineId,
          status: SDK.PreloadingModel.PreloadingStatus.RUNNING,
          prefetchStatus: null,
          requestId: 'requestId:1' as Protocol.Network.RequestId,
          ruleSetIds: ['ruleSetId:0.1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        }]),
        ruleSets: [
          {
            id: 'ruleSetId:0.1' as Protocol.Preload.RuleSetId,
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            sourceText: `
{
  "prefetch":[
    {
      "source": "list",
      "urls": ["https://cross-origin.example.com/prefetched.html"]
    }
  ]
}
`,
          },
        ],
      }],
      pageURL: urlString`https://example.com/`,
    });
  });

  it('shows filename for out-of-document speculation rules', async () => {
    await assertRenderResult({
      rows: [{
        id: 'id',
        pipeline: SDK.PreloadingModel.PreloadPipeline.newFromAttemptsForTesting([{
          action: Protocol.Preload.SpeculationAction.Prefetch,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prefetch,
            url: urlString`https://example.com/prefetched.html`,
          },
          pipelineId: 'pipelineId:1' as Protocol.Preload.PreloadPipelineId,
          status: SDK.PreloadingModel.PreloadingStatus.RUNNING,
          prefetchStatus: null,
          requestId: 'requestId:1' as Protocol.Network.RequestId,
          ruleSetIds: ['ruleSetId:0.1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [] as Protocol.DOM.BackendNodeId[],
        }]),
        ruleSets: [
          {
            id: 'ruleSetId:0.1' as Protocol.Preload.RuleSetId,
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            sourceText: `
{
  "prefetch":[
    {
      "source": "list",
      "urls": ["/prefetched.html"]
    }
  ]
}
`,
            url: 'https://example.com/assets/speculation-rules.json',
          },
        ],
      }],
      pageURL: urlString`https://example.com/`,
    });
  });

  it('shows the only first speculation rules', async () => {
    await assertRenderResult({
      rows: [
        {
          id: 'id',
          pipeline: SDK.PreloadingModel.PreloadPipeline.newFromAttemptsForTesting([{
            action: Protocol.Preload.SpeculationAction.Prefetch,
            key: {
              loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
              action: Protocol.Preload.SpeculationAction.Prefetch,
              url: urlString`https://example.com/rule-set-missing.html`,
            },
            pipelineId: 'pipelineId:1' as Protocol.Preload.PreloadPipelineId,
            status: SDK.PreloadingModel.PreloadingStatus.RUNNING,
            prefetchStatus: null,
            requestId: 'requestId:1' as Protocol.Network.RequestId,
            ruleSetIds: ['ruleSetId:0.1'] as Protocol.Preload.RuleSetId[],
            nodeIds: [1] as Protocol.DOM.BackendNodeId[],
          }]),
          ruleSets: [],
        },
        {
          id: 'id',
          pipeline: SDK.PreloadingModel.PreloadPipeline.newFromAttemptsForTesting([{
            action: Protocol.Preload.SpeculationAction.Prefetch,
            key: {
              loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
              action: Protocol.Preload.SpeculationAction.Prefetch,
              url: urlString`https://example.com/multiple-rule-sets.html`,
            },
            pipelineId: 'pipelineId:2' as Protocol.Preload.PreloadPipelineId,
            status: SDK.PreloadingModel.PreloadingStatus.RUNNING,
            prefetchStatus: null,
            requestId: 'requestId:2' as Protocol.Network.RequestId,
            ruleSetIds: ['ruleSetId:0.2', 'ruleSetId:0.3'] as Protocol.Preload.RuleSetId[],
            nodeIds: [1] as Protocol.DOM.BackendNodeId[],
          }]),
          ruleSets: [
            {
              id: 'ruleSetId:0.2' as Protocol.Preload.RuleSetId,
              loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
              sourceText: `
{
  "prefetch":[
    {
      "source": "list",
      "urls": ["/multiple-rule-sets.html"]
    }
  ]
}
`,
            },
            {
              id: 'ruleSetId:0.3' as Protocol.Preload.RuleSetId,
              loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
              sourceText: `
{
  "prefetch":[
    {
      "source": "list",
      "urls": ["/multiple-rule-sets.html"]
    }
  ]
}
`,
              url: 'https://example.com/assets/speculation-rules.json',
            },
          ],
        },
      ],
      pageURL: urlString`https://example.com/`,
    });
  });

  it('shows composed status for failure', async () => {
    await assertRenderResult({
      rows: [{
        id: 'id',
        pipeline: SDK.PreloadingModel.PreloadPipeline.newFromAttemptsForTesting([{
          action: Protocol.Preload.SpeculationAction.Prerender,
          key: {
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            action: Protocol.Preload.SpeculationAction.Prerender,
            url: urlString`https://example.com/prerendered.html`,
          },
          pipelineId: 'pipelineId:1' as Protocol.Preload.PreloadPipelineId,
          status: SDK.PreloadingModel.PreloadingStatus.FAILURE,
          prerenderStatus: Protocol.Preload.PrerenderFinalStatus.MojoBinderPolicy,
          disallowedMojoInterface: 'device.mojom.GamepadMonitor',
          mismatchedHeaders: null,
          ruleSetIds: ['ruleSetId:0.1'] as Protocol.Preload.RuleSetId[],
          nodeIds: [1] as Protocol.DOM.BackendNodeId[],
        }]),
        ruleSets: [
          {
            id: 'ruleSetId:0.1' as Protocol.Preload.RuleSetId,
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            sourceText: `
{
  "prerender":[
    {
      "source": "list",
      "urls": ["/prerendered.html"]
    }
  ]
}
`,
          },
        ],
      }],
      pageURL: urlString`https://example.com/`,
    });
  });

  it('shows a warning if a prerender fallbacks to prefetch', async () => {
    await assertRenderResult({
      rows: [{
        id: 'id',
        pipeline: SDK.PreloadingModel.PreloadPipeline.newFromAttemptsForTesting([
          {
            action: Protocol.Preload.SpeculationAction.Prefetch,
            key: {
              loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
              action: Protocol.Preload.SpeculationAction.Prefetch,
              url: urlString`https://example.com/prerendered.html`,
            },
            pipelineId: 'pipelineId:1' as Protocol.Preload.PreloadPipelineId,
            status: SDK.PreloadingModel.PreloadingStatus.SUCCESS,
            prefetchStatus: Protocol.Preload.PrefetchStatus.PrefetchResponseUsed,
            requestId: 'requestId:1' as Protocol.Network.RequestId,
            ruleSetIds: ['ruleSetId:0.1'] as Protocol.Preload.RuleSetId[],
            nodeIds: [1] as Protocol.DOM.BackendNodeId[],
          },
          {
            action: Protocol.Preload.SpeculationAction.Prerender,
            key: {
              loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
              action: Protocol.Preload.SpeculationAction.Prerender,
              url: urlString`https://example.com/prerendered.html`,
            },
            pipelineId: 'pipelineId:1' as Protocol.Preload.PreloadPipelineId,
            status: SDK.PreloadingModel.PreloadingStatus.FAILURE,
            prerenderStatus: Protocol.Preload.PrerenderFinalStatus.MojoBinderPolicy,
            disallowedMojoInterface: 'device.mojom.GamepadMonitor',
            mismatchedHeaders: null,
            ruleSetIds: ['ruleSetId:0.1'] as Protocol.Preload.RuleSetId[],
            nodeIds: [1] as Protocol.DOM.BackendNodeId[],
          },
        ] as SDK.PreloadingModel.PreloadingAttempt[]),
        ruleSets: [
          {
            id: 'ruleSetId:0.1' as Protocol.Preload.RuleSetId,
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            sourceText: `
{
  "prerender":[
    {
      "source": "list",
      "urls": ["/prerendered.html"]
    }
  ]
}
`,
          },
        ],
      }],
      pageURL: urlString`https://example.com/`,
    });
  });

  it('shows failure if both prefetch and prerender failed', async () => {
    await assertRenderResult({
      rows: [{
        id: 'id',
        pipeline: SDK.PreloadingModel.PreloadPipeline.newFromAttemptsForTesting([
          {
            action: Protocol.Preload.SpeculationAction.Prefetch,
            key: {
              loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
              action: Protocol.Preload.SpeculationAction.Prefetch,
              url: urlString`https://example.com/prerendered.html`,
            },
            pipelineId: 'pipelineId:1' as Protocol.Preload.PreloadPipelineId,
            status: SDK.PreloadingModel.PreloadingStatus.FAILURE,
            prefetchStatus: Protocol.Preload.PrefetchStatus.PrefetchFailedNon2XX,
            requestId: 'requestId:1' as Protocol.Network.RequestId,
            ruleSetIds: ['ruleSetId:0.1'] as Protocol.Preload.RuleSetId[],
            nodeIds: [1] as Protocol.DOM.BackendNodeId[],
          },
          {
            action: Protocol.Preload.SpeculationAction.Prerender,
            key: {
              loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
              action: Protocol.Preload.SpeculationAction.Prerender,
              url: urlString`https://example.com/prerendered.html`,
            },
            pipelineId: 'pipelineId:1' as Protocol.Preload.PreloadPipelineId,
            status: SDK.PreloadingModel.PreloadingStatus.FAILURE,
            prerenderStatus: Protocol.Preload.PrerenderFinalStatus.PrerenderFailedDuringPrefetch,
            disallowedMojoInterface: null,
            mismatchedHeaders: null,
            ruleSetIds: ['ruleSetId:0.1'] as Protocol.Preload.RuleSetId[],
            nodeIds: [1] as Protocol.DOM.BackendNodeId[],
          },
        ] as SDK.PreloadingModel.PreloadingAttempt[]),
        ruleSets: [
          {
            id: 'ruleSetId:0.1' as Protocol.Preload.RuleSetId,
            loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
            sourceText: `
{
  "prerender":[
    {
      "source": "list",
      "urls": ["/prerendered.html"]
    }
  ]
}
`,
          },
        ],
      }],
      pageURL: urlString`https://example.com/`,
    });
  });
});
