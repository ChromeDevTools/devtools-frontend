// Copyright 2023 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

import type * as Platform from '../../../../../../../front_end/core/platform/platform.js';
import * as Protocol from '../../../../../../../front_end/generated/protocol.js';
import * as PreloadingComponents from '../../../../../../../front_end/panels/application/preloading/components/components.js';
import type * as DataGrid from '../../../../../../../front_end/ui/components/data_grid/data_grid.js';
import * as Coordinator from '../../../../../../../front_end/ui/components/render_coordinator/render_coordinator.js';
import {renderElementIntoDOM} from '../../../../helpers/DOMHelpers.js';
import {describeWithEnvironment} from '../../../../helpers/EnvironmentHelpers.js';
import {assertGridContents} from '../../../../ui/components/DataGridHelpers.js';

const coordinator = Coordinator.RenderCoordinator.RenderCoordinator.instance();

async function assertRenderResult(
    rowsInput: PreloadingComponents.RuleSetGrid.RuleSetGridData, headerExpected: string[],
    rowsExpected: string[][]): Promise<DataGrid.DataGrid.DataGrid> {
  const component = new PreloadingComponents.RuleSetGrid.RuleSetGrid();
  component.update(rowsInput);
  renderElementIntoDOM(component);
  await coordinator.done();

  return assertGridContents(
      component,
      headerExpected,
      rowsExpected,
  );
}

describeWithEnvironment('RuleSetGrid', async () => {
  it('renders grid', async () => {
    await assertRenderResult(
        {
          rows: [{
            ruleSet: {
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
            preloadsStatusSummary: '1 Not triggered, 2 Ready, 3 Failure',
          }],
          pageURL: 'https://example.com/' as Platform.DevToolsPath.UrlString,
        },
        ['Rule set', 'Status'],
        [
          ['example.com/', '1 Not triggered, 2 Ready, 3 Failure'],
        ],
    );
  });

  it('shows short url for out-of-document speculation rules', async () => {
    await assertRenderResult(
        {
          rows: [{
            ruleSet: {
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
            preloadsStatusSummary: '1 Not triggered, 2 Ready, 3 Failure',
          }],
          pageURL: 'https://example.com/' as Platform.DevToolsPath.UrlString,
        },
        ['Rule set', 'Status'],
        [
          ['example.com/assets/speculation-rules.json', '1 Not triggered, 2 Ready, 3 Failure'],
        ],
    );
  });

  it('shows error counts', async () => {
    await assertRenderResult(
        {
          rows: [
            {
              ruleSet: {
                id: 'ruleSetId:0.1' as Protocol.Preload.RuleSetId,
                loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
                sourceText: `
{
  "prefetch":[
    {
      "source": "list-typo",
      "urls": ["/prefetched.html"]
    }
  ]
}
`,
                errorType: Protocol.Preload.RuleSetErrorType.InvalidRulesSkipped,
                errorMessage: 'fake error message',
              },
              preloadsStatusSummary: '1 Not triggered, 2 Ready, 3 Failure',
            },
            {
              ruleSet: {
                id: 'ruleSetId:0.1' as Protocol.Preload.RuleSetId,
                loaderId: 'loaderId:1' as Protocol.Network.LoaderId,
                sourceText: `
{"invalidJson"
`,
                errorType: Protocol.Preload.RuleSetErrorType.SourceIsNotJsonObject,
                errorMessage: 'fake error message',
              },
              preloadsStatusSummary: '',
            },
          ],
          pageURL: 'https://example.com/' as Platform.DevToolsPath.UrlString,
        },
        ['Rule set', 'Status'],
        [
          ['example.com/', '1 error 1 Not triggered, 2 Ready, 3 Failure'],
          ['example.com/', '1 error'],
        ],
    );
  });
});
