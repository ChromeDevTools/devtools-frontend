// Copyright 2022 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import {assertNotNullOrUndefined} from '../../../../../../../front_end/core/platform/platform.js';
import * as SDK from '../../../../../../../front_end/core/sdk/sdk.js';
import * as PreloadingComponents from '../../../../../../../front_end/panels/application/preloading/components/components.js';

import type * as Platform from '../../../../../../../front_end/core/platform/platform.js';
import * as Protocol from '../../../../../../../front_end/generated/protocol.js';
import * as DataGrid from '../../../../../../../front_end/ui/components/data_grid/data_grid.js';
import * as Coordinator from '../../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {assertShadowRoot, getElementWithinComponent, renderElementIntoDOM} from '../../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../helpers/EnvironmentHelpers.js';
import {getHeaderCells, getValuesOfAllBodyRows, getCellByIndexes} from '../../../../ui/components/DataGridHelpers.js';

const {assert} = chai;

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

function assertGridContents(
    gridComponent: HTMLElement, headerExpected: string[], rowsExpected: string[][]): DataGrid.DataGrid.DataGrid {
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

  return grid;
}

async function assertRenderResult(
    rowsInput: PreloadingComponents.PreloadingGrid.PreloadingGridData, headerExpected: string[],
    rowsExpected: string[][]): Promise<DataGrid.DataGrid.DataGrid> {
  const component = new PreloadingComponents.PreloadingGrid.PreloadingGrid();
  component.update(rowsInput);
  renderElementIntoDOM(component);
  await coordinator.done();

  return assertGridContents(
      component,
      headerExpected,
      rowsExpected,
  );
}

describeWithEnvironment('PreloadingGrid', async () => {
  it('renders grid', async () => {
    await assertRenderResult(
        {
          rows: [{
            id: 'id',
            attempt: {
              action: Protocol.Preload.SpeculationAction.Prefetch,
              key: {
                loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
                action: Protocol.Preload.SpeculationAction.Prefetch,
                url: 'https://example.com/prefetched.html' as Platform.DevToolsPath.UrlString,
              },
              status: SDK.PreloadingModel.PreloadingStatus.Running,
              prefetchStatus: null,
              requestId: 'requestId:1' as Protocol.Network.RequestId,
              ruleSetIds: ['ruleSetId:0.1'] as Protocol.Preload.RuleSetId[],
              nodeIds: [1] as Protocol.DOM.BackendNodeId[],
            } as SDK.PreloadingModel.PreloadingAttempt,
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
          pageURL: 'https://example.com/' as Platform.DevToolsPath.UrlString,
        },
        ['URL', 'Action', 'Rule set', 'Status'],
        [
          ['/prefetched.html', 'Prefetch', 'example.com/', 'Running'],
        ],
    );
  });

  it('shows full URL for cross-origin preloading', async () => {
    await assertRenderResult(
        {
          rows: [{
            id: 'id',
            attempt: {
              action: Protocol.Preload.SpeculationAction.Prefetch,
              key: {
                loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
                action: Protocol.Preload.SpeculationAction.Prefetch,
                url: 'https://cross-origin.example.com/prefetched.html' as Platform.DevToolsPath.UrlString,
              },
              status: SDK.PreloadingModel.PreloadingStatus.Running,
              prefetchStatus: null,
              requestId: 'requestId:1' as Protocol.Network.RequestId,
              ruleSetIds: ['ruleSetId:0.1'] as Protocol.Preload.RuleSetId[],
              nodeIds: [1] as Protocol.DOM.BackendNodeId[],
            } as SDK.PreloadingModel.PreloadingAttempt,
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
          pageURL: 'https://example.com/' as Platform.DevToolsPath.UrlString,
        },
        ['URL', 'Action', 'Rule set', 'Status'],
        [
          ['https://cross-origin.example.com/prefetched.html', 'Prefetch', 'example.com/', 'Running'],
        ],
    );
  });

  it('shows filename for out-of-document speculation rules', async () => {
    await assertRenderResult(
        {
          rows: [{
            id: 'id',
            attempt: {
              action: Protocol.Preload.SpeculationAction.Prefetch,
              key: {
                loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
                action: Protocol.Preload.SpeculationAction.Prefetch,
                url: 'https://example.com/prefetched.html' as Platform.DevToolsPath.UrlString,
              },
              status: SDK.PreloadingModel.PreloadingStatus.Running,
              prefetchStatus: null,
              requestId: 'requestId:1' as Protocol.Network.RequestId,
              ruleSetIds: ['ruleSetId:0.1'] as Protocol.Preload.RuleSetId[],
              nodeIds: [] as Protocol.DOM.BackendNodeId[],
            } as SDK.PreloadingModel.PreloadingAttempt,
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
          pageURL: 'https://example.com/' as Platform.DevToolsPath.UrlString,
        },
        ['URL', 'Action', 'Rule set', 'Status'],
        [
          ['/prefetched.html', 'Prefetch', 'example.com/assets/speculation-rules.json', 'Running'],
        ],
    );
  });

  it('shows the only first speculation rules', async () => {
    await assertRenderResult(
        {
          rows: [
            {
              id: 'id',
              attempt: {
                action: Protocol.Preload.SpeculationAction.Prefetch,
                key: {
                  loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
                  action: Protocol.Preload.SpeculationAction.Prefetch,
                  url: 'https://example.com/rule-set-missing.html' as Platform.DevToolsPath.UrlString,
                },
                status: SDK.PreloadingModel.PreloadingStatus.Running,
                prefetchStatus: null,
                requestId: 'requestId:1' as Protocol.Network.RequestId,
                ruleSetIds: ['ruleSetId:0.1'] as Protocol.Preload.RuleSetId[],
                nodeIds: [1] as Protocol.DOM.BackendNodeId[],
              } as SDK.PreloadingModel.PreloadingAttempt,
              ruleSets: [],
            },
            {
              id: 'id',
              attempt: {
                action: Protocol.Preload.SpeculationAction.Prefetch,
                key: {
                  loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
                  action: Protocol.Preload.SpeculationAction.Prefetch,
                  url: 'https://example.com/multiple-rule-sets.html' as Platform.DevToolsPath.UrlString,
                },
                status: SDK.PreloadingModel.PreloadingStatus.Running,
                prefetchStatus: null,
                requestId: 'requestId:2' as Protocol.Network.RequestId,
                ruleSetIds: ['ruleSetId:0.2', 'ruleSetId:0.3'] as Protocol.Preload.RuleSetId[],
                nodeIds: [1] as Protocol.DOM.BackendNodeId[],
              } as SDK.PreloadingModel.PreloadingAttempt,
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
          pageURL: 'https://example.com/' as Platform.DevToolsPath.UrlString,
        },
        ['URL', 'Action', 'Rule set', 'Status'],
        [
          ['/rule-set-missing.html', 'Prefetch', '', 'Running'],
          ['/multiple-rule-sets.html', 'Prefetch', 'example.com/', 'Running'],
        ],
    );
  });

  it('shows composed status for failure', async () => {
    const grid = await assertRenderResult(
        {
          rows: [{
            id: 'id',
            attempt: {
              action: Protocol.Preload.SpeculationAction.Prerender,
              key: {
                loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
                action: Protocol.Preload.SpeculationAction.Prerender,
                url: 'https://example.com/prerendered.html' as Platform.DevToolsPath.UrlString,
              },
              status: SDK.PreloadingModel.PreloadingStatus.Failure,
              prerenderStatus: Protocol.Preload.PrerenderFinalStatus.MojoBinderPolicy,
              disallowedMojoInterface: 'device.mojom.GamepadMonitor',
              requestId: 'requestId:1' as Protocol.Network.RequestId,
              ruleSetIds: ['ruleSetId:0.1'] as Protocol.Preload.RuleSetId[],
              nodeIds: [1] as Protocol.DOM.BackendNodeId[],
            } as SDK.PreloadingModel.PreloadingAttempt,
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
          pageURL: 'https://example.com/' as Platform.DevToolsPath.UrlString,
        },
        ['URL', 'Action', 'Rule set', 'Status'],
        [
          [
            '/prerendered.html',
            'Prerender',
            'example.com/',
            ' Failure - The prerendered page used a forbidden JavaScript API that is currently not supported. (Internal Mojo interface: device.mojom.GamepadMonitor)',
          ],
        ],
    );

    assertShadowRoot(grid.shadowRoot);
    const cell = getCellByIndexes(grid.shadowRoot, {row: 1, column: 3});
    const div = cell.querySelector('div');
    assertNotNullOrUndefined(div);
    assert.strictEqual(div.getAttribute('style'), 'color: var(--sys-color-error);');
    const icon = div.children[0];
    assertNotNullOrUndefined(icon);
    assertShadowRoot(icon.shadowRoot);
    assert.include(String(icon.shadowRoot?.innerHTML), 'cross-circle-filled');
  });
});
