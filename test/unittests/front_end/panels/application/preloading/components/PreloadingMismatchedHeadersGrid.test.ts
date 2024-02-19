// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../../../front_end/core/sdk/sdk.js';
import * as Protocol from '../../../../../../../front_end/generated/protocol.js';
import * as PreloadingComponents from '../../../../../../../front_end/panels/application/preloading/components/components.js';
import * as Coordinator from '../../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {
  assertShadowRoot,
  renderElementIntoDOM,
} from '../../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../helpers/EnvironmentHelpers.js';
import {assertGridContents} from '../../../../ui/components/DataGridHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

async function renderPreloadingMismatchedHeadersGrid(data: SDK.PreloadingModel.PrerenderAttempt): Promise<HTMLElement> {
  const component = new PreloadingComponents.PreloadingMismatchedHeadersGrid.PreloadingMismatchedHeadersGrid();
  component.data = data;
  renderElementIntoDOM(component);
  assertShadowRoot(component.shadowRoot);
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
    status: SDK.PreloadingModel.PreloadingStatus.Failure,
    prerenderStatus: Protocol.Preload.PrerenderFinalStatus.ActivationNavigationParameterMismatch,
    disallowedMojoInterface: null,
    mismatchedHeaders: recievedMismatchedHeaders as Protocol.Preload.PrerenderMismatchedHeaders[],
    ruleSetIds: ['ruleSetId:1'] as Protocol.Preload.RuleSetId[],
    nodeIds: [1] as Protocol.DOM.BackendNodeId[],
  };

  const component = await renderPreloadingMismatchedHeadersGrid(data);
  assertShadowRoot(component.shadowRoot);

  assertGridContents(
      component,
      ['Header name', 'Value in initial navigation', 'Value in activation navigation'],
      rowExpected,
  );
}

describeWithEnvironment('PreloadingMismatchedHeadersGrid', async () => {
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
