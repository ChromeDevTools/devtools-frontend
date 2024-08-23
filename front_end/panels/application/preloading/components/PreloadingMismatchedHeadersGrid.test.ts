// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../core/platform/platform.js';
import * as SDK from '../../../../core/sdk/sdk.js';
import * as Protocol from '../../../../generated/protocol.js';
import {assertGridContents} from '../../../../testing/DataGridHelpers.js';
import {
  renderElementIntoDOM,
} from '../../../../testing/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../testing/EnvironmentHelpers.js';
import * as Coordinator from '../../../../ui/components/render_coordinator/render_coordinator.js';

import * as PreloadingComponents from './components.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

async function renderPreloadingMismatchedHeadersGrid(data: SDK.PreloadingModel.PrerenderAttempt): Promise<HTMLElement> {
  const component = new PreloadingComponents.PreloadingMismatchedHeadersGrid.PreloadingMismatchedHeadersGrid();
  component.data = data;
  renderElementIntoDOM(component);
  assert.isNotNull(component.shadowRoot);
  await coordinator.done();

  return component;
}

async function testPreloadingMismatchedHeadersGrid(
    recievedMismatchedHeaders: Protocol.Preload.PrerenderMismatchedHeaders[], rowExpected: string[][]): Promise<void> {
  const data: SDK.PreloadingModel.PrerenderAttempt = {
    action: Protocol.Preload.SpeculationAction.Prerender,
    key: {
      loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
      action: Protocol.Preload.SpeculationAction.Prerender,
      url: 'https://example.com/prerendered.html' as Platform.DevToolsPath.UrlString,
    },
    status: SDK.PreloadingModel.PreloadingStatus.FAILURE,
    prerenderStatus: Protocol.Preload.PrerenderFinalStatus.ActivationNavigationParameterMismatch,
    disallowedMojoInterface: null,
    mismatchedHeaders: recievedMismatchedHeaders as Protocol.Preload.PrerenderMismatchedHeaders[],
    ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
    nodeIds: [1] as Protocol.DOM.BackendNodeId[],
  };

  const component = await renderPreloadingMismatchedHeadersGrid(data);
  assert.isNotNull(component.shadowRoot);

  assertGridContents(
      component,
      ['Header name', 'Value in initial navigation', 'Value in activation navigation'],
      rowExpected,
  );
}

describeWithEnvironment('PreloadingMismatchedHeadersGrid', () => {
  it('one mismatched header without missing', async () => {
    await testPreloadingMismatchedHeadersGrid(
        [
          {
            headerName: 'sec-ch-ua-platform' as string,
            initialValue: 'Linux' as string,
            activationValue: 'Android' as string,
          },
        ],
        [
          ['sec-ch-ua-platform', 'Linux', 'Android'],
        ],
    );
  });

  it('one mismatched header with an initial value missing', async () => {
    await testPreloadingMismatchedHeadersGrid(
        [
          {
            headerName: 'sec-ch-ua-platform' as string,
            initialValue: undefined,
            activationValue: 'Android' as string,
          },
        ],
        [
          ['sec-ch-ua-platform', '(missing)', 'Android'],
        ],
    );
  });

  it('one mismatched header with an activation missing', async () => {
    await testPreloadingMismatchedHeadersGrid(
        [
          {
            headerName: 'sec-ch-ua-platform' as string,
            initialValue: 'Linux' as string,
            activationValue: undefined,
          },
        ],
        [
          ['sec-ch-ua-platform', 'Linux', '(missing)'],
        ],
    );
  });

  it('multiple mismatched header with one of the value missing', async () => {
    await testPreloadingMismatchedHeadersGrid(
        [
          {
            headerName: 'sec-ch-ua' as string,
            initialValue: '"Not_A Brand";v="8", "Chromium";v="120"' as string,
            activationValue: undefined,
          },
          {
            headerName: 'sec-ch-ua-mobile' as string,
            initialValue: '?0' as string,
            activationValue: '?1' as string,
          },
        ],
        [
          ['sec-ch-ua', '"Not_A Brand";v="8", "Chromium";v="120"', '(missing)'],
          ['sec-ch-ua-mobile', '?0', '?1'],
        ],
    );
  });

  it('multiple mismatched header with one of each value missing', async () => {
    await testPreloadingMismatchedHeadersGrid(
        [
          {
            headerName: 'sec-ch-ua' as string,
            initialValue: '"Not_A Brand";v="8", "Chromium";v="120"' as string,
            activationValue: undefined,
          },
          {
            headerName: 'sec-ch-ua-mobile' as string,
            initialValue: undefined,
            activationValue: '?1' as string,
          },
          {
            headerName: 'sec-ch-ua-platform' as string,
            initialValue: 'Linux' as string,
            activationValue: undefined,
          },
        ],
        [
          ['sec-ch-ua', '"Not_A Brand";v="8", "Chromium";v="120"', '(missing)'],
          ['sec-ch-ua-mobile', '(missing)', '?1'],
          ['sec-ch-ua-platform', 'Linux', '(missing)'],
        ],
    );
  });
});
